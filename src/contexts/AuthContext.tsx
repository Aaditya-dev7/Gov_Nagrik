import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { mockUsers, isValidGovEmail } from '@/lib/data';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const login = async (email: string, password: string, remember: boolean): Promise<{ success: boolean; message: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Demo account
    if (email.toLowerCase() === 'sneha.kulkarni@nagarpalika.gov.in' && password === 'sneha12345') {
      const demoUser = mockUsers.find(u => u.id === 'user-4')!;
      setUser(demoUser);
      if (remember) {
        localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: demoUser.id }));
      }
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
        setUser(existing);
        if (remember) {
          localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: existing.id }));
        }
        return { success: true, message: `Welcome back, ${existing.name}!` };
      }

      // Load or create dynamic user
      let dynUsers: User[] = [];
      const dynRaw = localStorage.getItem('nagrikGPT_dynusers');
      if (dynRaw) {
        try { dynUsers = JSON.parse(dynRaw); } catch { dynUsers = []; }
      }
      let dynUser = dynUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!dynUser) {
        dynUser = {
          id: `dyn-${Date.now()}`,
          name: email.split('@')[0],
          email,
          role: 'Viewer',
          department: 'General',
          status: 'Active',
        };
        dynUsers.push(dynUser);
        localStorage.setItem('nagrikGPT_dynusers', JSON.stringify(dynUsers));
      }
      setUser(dynUser);
      if (remember) {
        localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: dynUser.id }));
      }
      return { success: true, message: `Welcome, ${dynUser.name}!` };
    }

    // Check mock users
    const foundUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      setUser(foundUser);
      if (remember) {
        localStorage.setItem('nagrikGPT_user', JSON.stringify({ id: foundUser.id }));
      }
      return { success: true, message: `Welcome back, ${foundUser.name}!` };
    }

    return { success: false, message: 'Invalid credentials. Please try again.' };
  };

  const logout = () => {
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
