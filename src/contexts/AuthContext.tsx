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

  const tryLoadForcedUser = (): User | null => {
    try {
      const raw = localStorage.getItem('nagrikGPT_force_user');
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      const role = String((obj as any).role || 'Field Officer') as User['role'];
      const department = String((obj as any).department || 'Water Supply');
      const email = String((obj as any).email || 'sneha.kulkarni@nagarpalika.gov.in');
      const name = String((obj as any).name || 'Sneha Kulkarni');
      return {
        id: String((obj as any).id || 'forced-sneha'),
        name,
        email,
        role,
        department,
        status: 'Active',
      } as User;
    } catch {
      return null;
    }
  };

  const mapProfileToUser = (authUser: any, profile: any): User => {
    const email = String(authUser?.email || '');
    const roleRaw = String(profile?.role || '').toLowerCase();
    const role: User['role'] = roleRaw === 'admin'
      ? 'Super Admin'
      : roleRaw === 'officer'
        ? 'Field Officer'
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
          const forced = tryLoadForcedUser();
          if (forced) {
            if (!cancelled) setUser(forced);
            return;
          }

          let autoLoginDisabled = false;
          try {
            autoLoginDisabled = localStorage.getItem('nagrikGPT_autologin_disabled') === '1';
          } catch {}

          const autoEmail = String((import.meta as any)?.env?.VITE_AUTOLOGIN_EMAIL || '').trim().toLowerCase();
          const autoPassword = String((import.meta as any)?.env?.VITE_AUTOLOGIN_PASSWORD || '').trim();
          if (!autoLoginDisabled && autoEmail && autoPassword) {
            const { data: sdata, error: serr } = await sb.auth.signInWithPassword({
              email: autoEmail,
              password: autoPassword,
            });
            if (serr) {
              if (!cancelled) setUser(null);
              return;
            }
            const au2 = sdata?.user;
            if (!au2) {
              if (!cancelled) setUser(null);
              return;
            }
            const { data: prof2, error: profErr2 } = await sb
              .from('profiles')
              .select('id, full_name, role, department')
              .eq('id', au2.id)
              .maybeSingle();
            if (profErr2) throw profErr2;
            if (!cancelled) setUser(mapProfileToUser(au2, prof2));
            return;
          }

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
    if (rolePref === 'officer') {
      const emailTrim = email.trim().toLowerCase();
      let savedPw = '';
      try { savedPw = localStorage.getItem(`nagrikGPT_local_pw:${emailTrim}`) || ''; } catch {}

      if (!savedPw) {
        return { success: false, message: 'Officer password not set on this device. Please use “Forgot Password / Set Password” first.' };
      }
      if (String(password || '') !== savedPw) {
        return { success: false, message: 'Invalid credentials' };
      }

      const deptByEmail: Record<string, string> = {
        'sneha.kulkarni@nagarpalika.gov.in': 'Water Supply',
        'roads.officer@nagarpalika.gov.in': 'Roads',
        'sanitation.officer@nagarpalika.gov.in': 'Sanitation',
        'lighting.officer@nagarpalika.gov.in': 'Street Lighting',
        'drainage.officer@nagarpalika.gov.in': 'Drainage',
        'roads2.officer@nagarpalika.gov.in': 'Roads',
        'sanitation2.officer@nagarpalika.gov.in': 'Sanitation',
      };

      const officerUser: User = {
        id: `local-officer:${emailTrim}`,
        name: emailTrim.split('@')[0] || 'Officer',
        email: emailTrim,
        role: 'Field Officer',
        department: deptByEmail[emailTrim] || 'General',
        status: 'Active',
      } as User;

      setUser(officerUser);
      try { localStorage.setItem('nagrikGPT_login_role', 'officer'); } catch {}
      return { success: true, message: `Welcome back, ${officerUser.name}!` };
    }

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
    try { localStorage.setItem('nagrikGPT_autologin_disabled', '1'); } catch {}
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
