import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { mockUsers, isValidGovEmail } from '@/lib/data';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    remember: boolean,
    rolePref?: 'admin' | 'officer'
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const addActiveSession = (u: User) => {
    try {
      const key = 'nagrikGPT_active_sessions';
      const raw = localStorage.getItem(key);
      const list: (User & { since: string })[] = raw ? JSON.parse(raw) : [];
      const since = new Date().toISOString();
      const without = list.filter(s => s.id !== u.id);
      without.push({ ...u, since });
      localStorage.setItem(key, JSON.stringify(without));
    } catch {}
  };

  const removeActiveSession = (userId: string) => {
    try {
      const key = 'nagrikGPT_active_sessions';
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list: (User & { since: string })[] = JSON.parse(raw);
      const without = list.filter(s => s.id !== userId);
      localStorage.setItem(key, JSON.stringify(without));
    } catch {}
  };

  useEffect(() => {
    // Check for saved session
    const savedUser = localStorage.getItem('nagrikGPT_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const foundUser = mockUsers.find(u => u.id === parsed.id);
        if (foundUser) {
          setUser(foundUser);
        } else {
          const dynRaw = localStorage.getItem('nagrikGPT_dynusers');
          if (dynRaw) {
            try {
              const dynUsers: User[] = JSON.parse(dynRaw);
              const dynFound = dynUsers.find(u => u.id === parsed.id);
              if (dynFound) setUser(dynFound);
            } catch {}
          }
        }
      } catch (e) {
        localStorage.removeItem('nagrikGPT_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
    remember: boolean,
    rolePref?: 'admin' | 'officer'
  ): Promise<{ success: boolean; message: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Demo account
    if (email.toLowerCase() === 'sneha.kulkarni@nagarpalika.gov.in' && password === 'sneha12345') {
      const demoUser = mockUsers.find(u => u.id === 'user-4')!;
      setUser(demoUser);
      addActiveSession(demoUser);
      if (remember) {
        localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: demoUser.id }));
      }
      try { localStorage.setItem((demoUser.role === 'Department Admin' || demoUser.role === 'Super Admin') ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}
      return { success: true, message: `Welcome back, ${demoUser.name}!` };
    }

    // Validate government email
    if (!isValidGovEmail(email)) {
      return { success: false, message: 'Please use an official government email address' };
    }

    // If a password was set via SetPasswordModal, enforce it
    const savedPw = localStorage.getItem(`nagrikGPT_pw_${email.toLowerCase()}`);
    if (savedPw) {
      if (password !== savedPw) {
        return { success: false, message: 'Incorrect password. Please use the password you set via the email link.' };
      }

      // Try existing mock user first
      const existing = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        // Check access request mapping to allow promotion to Admin
        let mappedRole: User['role'] | null = null;
        let mappedDept: string | null = null;
        const reqListRaw = localStorage.getItem('nagrikGPT_access_requests');
        if (reqListRaw) {
          try {
            const reqs = JSON.parse(reqListRaw) as Array<{ officialEmail?: string; email?: string; role?: 'admin' | 'officer'; department?: string }>;
            const req = reqs.slice().reverse().find(r => (r.officialEmail || r.email || '').toLowerCase() === email.toLowerCase());
            if (req) {
              mappedRole = req.role === 'admin' ? 'Department Admin' : req.role === 'officer' ? 'Field Officer' : null;
              mappedDept = req.department || null;
            }
          } catch {}
        }

        const shouldPromoteToAdmin = mappedRole === 'Department Admin' && existing.role !== 'Department Admin' && existing.role !== 'Super Admin';
        if (shouldPromoteToAdmin) {
          // Create or update a dynamic user entry for this email and sign in with the promoted role
          let dynUsers: User[] = [];
          const dynRaw = localStorage.getItem('nagrikGPT_dynusers');
          if (dynRaw) {
            try { dynUsers = JSON.parse(dynRaw); } catch { dynUsers = []; }
          }
          let dynUser = dynUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
          const targetDept = mappedDept || existing.department || 'General';
          if (!dynUser) {
            dynUser = {
              id: `dyn-${Date.now()}`,
              name: existing.name,
              email: existing.email,
              role: 'Department Admin',
              department: targetDept,
              status: 'Active',
            };
            dynUsers.push(dynUser);
            localStorage.setItem('nagrikGPT_dynusers', JSON.stringify(dynUsers));
          } else {
            dynUser = { ...dynUser, role: 'Department Admin', department: targetDept };
            const without = dynUsers.filter(u => u.id !== dynUser!.id);
            without.push(dynUser);
            localStorage.setItem('nagrikGPT_dynusers', JSON.stringify(without));
          }
          setUser(dynUser);
          addActiveSession(dynUser);
          if (remember) {
            localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: dynUser.id }));
          }
          try { localStorage.setItem((dynUser.role === 'Department Admin' || dynUser.role === 'Super Admin') ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}
          return { success: true, message: `Welcome, ${dynUser.name}!` };
        }

        // No promotion needed; continue with mock user
        setUser(existing);
        addActiveSession(existing);
        if (remember) {
          localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: existing.id }));
        }
        try { localStorage.setItem((existing.role === 'Department Admin' || existing.role === 'Super Admin') ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}
        return { success: true, message: `Welcome back, ${existing.name}!` };
      }

      // Load or create dynamic user
      let dynUsers: User[] = [];
      const dynRaw = localStorage.getItem('nagrikGPT_dynusers');
      if (dynRaw) {
        try { dynUsers = JSON.parse(dynRaw); } catch { dynUsers = []; }
      }
      let dynUser = dynUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      // Map role/department from access request, if any
      const reqListRaw = localStorage.getItem('nagrikGPT_access_requests');
      let mappedRole: User['role'] = (rolePref === 'admin') ? 'Department Admin' : (rolePref === 'officer') ? 'Field Officer' : 'Viewer';
      let mappedDept = 'General';
      if (reqListRaw) {
        try {
          const reqs = JSON.parse(reqListRaw) as Array<{ officialEmail?: string; email?: string; role?: 'admin' | 'officer'; department?: string }>;
          const req = reqs.slice().reverse().find(r => (r.officialEmail || r.email || '').toLowerCase() === email.toLowerCase());
          if (req) {
            if (req.role === 'admin') mappedRole = 'Department Admin';
            else if (req.role === 'officer') mappedRole = 'Field Officer';
            if (req.department) mappedDept = req.department;
          }
        } catch {}
      }
      if (!dynUser) {
        dynUser = {
          id: `dyn-${Date.now()}`,
          name: email.split('@')[0],
          email,
          role: mappedRole,
          department: mappedDept,
          status: 'Active',
        };
        dynUsers.push(dynUser);
        localStorage.setItem('nagrikGPT_dynusers', JSON.stringify(dynUsers));
      } else {
        // Upgrade existing dynamic user based on latest access request mapping
        let nextRole = dynUser.role;
        if (mappedRole === 'Department Admin' && dynUser.role !== 'Department Admin') {
          // Always promote to admin if access request grants it
          nextRole = 'Department Admin';
        } else if (mappedRole === 'Field Officer' && dynUser.role === 'Viewer') {
          // Promote viewer to officer if applicable
          nextRole = 'Field Officer';
        }

        const nextDepartment = ((): string => {
          // Prefer mapped department if current is General or if role is newly promoted to Admin
          if (!mappedDept) return dynUser.department;
          if (dynUser.department === 'General') return mappedDept;
          if (nextRole === 'Department Admin' && dynUser.department !== mappedDept) return mappedDept;
          return dynUser.department;
        })();

        const upgraded: User = { ...dynUser, role: nextRole, department: nextDepartment };
        dynUser = upgraded;
        const without = dynUsers.filter(u => u.id !== dynUser.id);
        without.push(dynUser);
        localStorage.setItem('nagrikGPT_dynusers', JSON.stringify(without));
      }
      setUser(dynUser);
      addActiveSession(dynUser);
      if (remember) {
        localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: dynUser.id }));
      }
      try { localStorage.setItem((dynUser.role === 'Department Admin' || dynUser.role === 'Super Admin') ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}
      return { success: true, message: `Welcome, ${dynUser.name}!` };
    }

    // No saved password – allow login if an access request exists for this email
    try {
      const reqListRaw = localStorage.getItem('nagrikGPT_access_requests');
      if (reqListRaw) {
        const reqs = JSON.parse(reqListRaw) as Array<{ officialEmail?: string; email?: string; role?: 'admin' | 'officer'; department?: string }>;
        const req = reqs.slice().reverse().find(r => (r.officialEmail || r.email || '').toLowerCase() === email.toLowerCase());
        if (req) {
          let dynUsers: User[] = [];
          const dynRaw = localStorage.getItem('nagrikGPT_dynusers');
          if (dynRaw) {
            try { dynUsers = JSON.parse(dynRaw); } catch { dynUsers = []; }
          }
          let dynUser = dynUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
          const mappedRole: User['role'] = req.role === 'admin' ? 'Department Admin' : req.role === 'officer' ? 'Field Officer' : 'Viewer';
          const mappedDept = req.department || 'General';
          if (!dynUser) {
            dynUser = {
              id: `dyn-${Date.now()}`,
              name: email.split('@')[0],
              email,
              role: mappedRole,
              department: mappedDept,
              status: 'Active',
            };
            dynUsers.push(dynUser);
            localStorage.setItem('nagrikGPT_dynusers', JSON.stringify(dynUsers));
          } else {
            // Upgrade existing dynamic user if needed
            const nextRole = mappedRole === 'Department Admin' ? 'Department Admin' : (dynUser.role === 'Viewer' ? mappedRole : dynUser.role);
            const nextDepartment = dynUser.department === 'General' || nextRole === 'Department Admin' ? mappedDept : dynUser.department;
            dynUser = { ...dynUser, role: nextRole, department: nextDepartment };
            const without = dynUsers.filter(u => u.id !== dynUser.id);
            without.push(dynUser);
            localStorage.setItem('nagrikGPT_dynusers', JSON.stringify(without));
          }
          setUser(dynUser);
          addActiveSession(dynUser);
          if (remember) {
            localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: dynUser.id }));
          }
          try { localStorage.setItem((dynUser.role === 'Department Admin' || dynUser.role === 'Super Admin') ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}
          return { success: true, message: `Welcome, ${dynUser.name}!` };
        }
      }
    } catch {}

    // Check mock users
    const foundUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      // Check access request mapping to allow promotion to Admin
      let mappedRole: User['role'] | null = null;
      let mappedDept: string | null = null;
      const reqListRaw = localStorage.getItem('nagrikGPT_access_requests');
      if (reqListRaw) {
        try {
          const reqs = JSON.parse(reqListRaw) as Array<{ officialEmail?: string; email?: string; role?: 'admin' | 'officer'; department?: string }>;
          const req = reqs.slice().reverse().find(r => (r.officialEmail || r.email || '').toLowerCase() === email.toLowerCase());
          if (req) {
            mappedRole = req.role === 'admin' ? 'Department Admin' : req.role === 'officer' ? 'Field Officer' : null;
            mappedDept = req.department || null;
          }
        } catch {}
      }

      const shouldPromoteToAdmin = mappedRole === 'Department Admin' && foundUser.role !== 'Department Admin' && foundUser.role !== 'Super Admin';
      if (shouldPromoteToAdmin) {
        // Create or update a dynamic user entry for this email and sign in with the promoted role
        let dynUsers: User[] = [];
        const dynRaw = localStorage.getItem('nagrikGPT_dynusers');
        if (dynRaw) {
          try { dynUsers = JSON.parse(dynRaw); } catch { dynUsers = []; }
        }
        let dynUser = dynUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        const targetDept = mappedDept || foundUser.department || 'General';
        if (!dynUser) {
          dynUser = {
            id: `dyn-${Date.now()}`,
            name: foundUser.name,
            email: foundUser.email,
            role: 'Department Admin',
            department: targetDept,
            status: 'Active',
          };
          dynUsers.push(dynUser);
          localStorage.setItem('nagrikGPT_dynusers', JSON.stringify(dynUsers));
        } else {
          dynUser = { ...dynUser, role: 'Department Admin', department: targetDept };
          const without = dynUsers.filter(u => u.id !== dynUser!.id);
          without.push(dynUser);
          localStorage.setItem('nagrikGPT_dynusers', JSON.stringify(without));
        }
        setUser(dynUser);
        addActiveSession(dynUser);
        if (remember) {
          localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: dynUser.id }));
        }
        try { localStorage.setItem((dynUser.role === 'Department Admin' || dynUser.role === 'Super Admin') ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}
        return { success: true, message: `Welcome, ${dynUser.name}!` };
      }

      setUser(foundUser);
      addActiveSession(foundUser);
      if (remember) {
        localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: foundUser.id }));
      }
      try { localStorage.setItem((foundUser.role === 'Department Admin' || foundUser.role === 'Super Admin') ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}
      return { success: true, message: `Welcome back, ${foundUser.name}!` };
    }

    return { success: false, message: 'Invalid credentials. Please try again.' };
  };

  const logout = () => {
    if (user?.id) removeActiveSession(user.id);
    setUser(null);
    localStorage.removeItem('nagrikGPT_user');
  };

  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Department Admin';

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
