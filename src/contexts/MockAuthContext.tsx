import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MOCK_USERS, MOCK_NOTIFICATIONS, isMockMode } from '@/lib/mockData';

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string | null;
  status?: 'Active' | 'Inactive';
  reports_to_officer_id?: string | null;
  reports_to_officer_name?: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  unreadCount: number;
  notifications: any[];
  markNotificationRead: (id: string) => void;
};

const MockAuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo credentials
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@test.com': { password: 'admin123', user: MOCK_USERS.admin },
  'officer@test.com': { password: 'officer123', user: MOCK_USERS.officer },
  'staff@test.com': { password: 'staff123', user: MOCK_USERS.staff },
  'citizen@test.com': { password: 'citizen123', user: MOCK_USERS.citizen },
};

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  useEffect(() => {
    // Auto-login based on URL param or localStorage
    const params = new URLSearchParams(window.location.search);
    const mockRole = params.get('role') || localStorage.getItem('mockRole') || 'admin';
    
    const roleToEmail: Record<string, string> = {
      admin: 'admin@test.com',
      officer: 'officer@test.com',
      staff: 'staff@test.com',
      citizen: 'citizen@test.com',
    };
    
    const email = roleToEmail[mockRole] || 'admin@test.com';
    const userData = DEMO_USERS[email];
    
    if (userData) {
      setUser(userData.user);
      localStorage.setItem('mockRole', mockRole);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const userData = DEMO_USERS[email];
    
    if (!userData || userData.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    setUser(userData.user);
    localStorage.setItem('mockRole', userData.user.role === 'admin' ? 'admin' : 
                                    userData.user.role === 'Field Officer' ? 'officer' :
                                    userData.user.role === 'Staff' ? 'staff' : 'citizen');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mockRole');
    window.location.href = '/';
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <MockAuthContext.Provider value={{
      user,
      isLoading,
      isAdmin: user?.role === 'admin',
      login,
      logout,
      unreadCount,
      notifications,
      markNotificationRead,
    }}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error('useAuth must be used within MockAuthProvider');
  return ctx;
}

// Quick role switcher component
export function MockRoleSwitcher() {
  const { user } = useAuth();
  
  if (!isMockMode()) return null;
  
  const switchRole = (role: string) => {
    localStorage.setItem('mockRole', role);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-card border rounded-lg p-2 shadow-lg">
      <div className="text-xs font-medium mb-2">Mock Mode - Switch Role:</div>
      <div className="flex gap-1">
        {['admin', 'officer', 'staff', 'citizen'].map(role => (
          <button
            key={role}
            onClick={() => switchRole(role)}
            className={`px-2 py-1 text-xs rounded ${
              user?.role === role || (role === 'officer' && user?.role === 'Field Officer')
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {role}
          </button>
        ))}
      </div>
    </div>
  );
}
