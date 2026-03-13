import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { isValidGovEmail } from '@/lib/data';
import { getSupabase } from '@/lib/supabase';

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

  const mapProfileToUser = (authUser: any, profile: any): User => {
    const email = String(authUser?.email || '');
    const roleRaw = String(profile?.role || '').toLowerCase();
    const role: User['role'] = roleRaw === 'admin'
      ? 'Super Admin'
      : roleRaw === 'officer'
        ? 'Field Officer'
        : roleRaw === 'staff'
          ? 'Staff'
          : 'Viewer';

    const dept = (roleRaw === 'admin')
      ? (profile?.department || 'All Departments')
      : (profile?.department || 'General');

    return {
      id: String(authUser?.id || ''),
      name: String(profile?.full_name || email.split('@')[0] || 'User'),
      email,
      role,
      department: String(dept),
      status: 'Active',
      reports_to_officer_id: profile?.reports_to_officer_id || null,
      reports_to_officer_name: profile?.reports_to_officer_name || null,
    } as User;
  };

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setIsLoading(false);
      setUser(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await sb.auth.getSession();
        const au = data?.session?.user;
        if (!au) {
          if (!cancelled) setUser(null);
          return;
        }

        const { data: prof, error: profErr } = await sb
          .from('profiles')
          .select('id, full_name, role, department')
          .eq('id', au.id)
          .maybeSingle();

        if (profErr) throw profErr;
        if (!cancelled) setUser(mapProfileToUser(au, prof));
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
      try {
        const au = session?.user;
        if (!au) {
          setUser(null);
          return;
        }
        const { data: prof } = await sb
          .from('profiles')
          .select('id, full_name, role, department')
          .eq('id', au.id)
          .maybeSingle();
        setUser(mapProfileToUser(au, prof));
      } catch {
        setUser(null);
      }
    });

    return () => {
      cancelled = true;
      try { sub?.subscription?.unsubscribe() } catch {}
    };
  }, []);

  const login = async (
    email: string,
    password: string,
    remember: boolean,
    rolePref?: 'admin' | 'officer'
  ): Promise<{ success: boolean; message: string }> => {
    // Validate government email
    if (!isValidGovEmail(email)) {
      return { success: false, message: 'Please use an official government email address' };
    }

    const sb = getSupabase();
    if (!sb) {
      return { success: false, message: 'Supabase is not configured' };
    }

    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, message: error.message || 'Invalid credentials' };
      }

      const au = data?.user;
      if (!au) {
        return { success: false, message: 'Login failed' };
      }

      const { data: prof, error: profErr } = await sb
        .from('profiles')
        .select('id, full_name, role, department')
        .eq('id', au.id)
        .maybeSingle();

      if (profErr) {
        return { success: false, message: profErr.message || 'Failed to load profile' };
      }

      const mapped = mapProfileToUser(au, prof);
      if (rolePref && ((rolePref === 'admin' && mapped.role !== 'Super Admin') || (rolePref === 'officer' && mapped.role !== 'Field Officer'))) {
        await sb.auth.signOut();
        setUser(null);
        return { success: false, message: 'Your account does not have access for the selected role.' };
      }

      setUser(mapped);
      try { localStorage.setItem((mapped.role === 'Department Admin' || mapped.role === 'Super Admin') ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}

      // Note: Supabase controls persistence. `remember` is kept for UI compatibility.
      return { success: true, message: `Welcome back, ${mapped.name}!` };
    } catch {
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const logout = () => {
    const sb = getSupabase();
    try { sb?.auth.signOut(); } catch {}
    setUser(null);
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
