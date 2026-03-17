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
    const deptFromProfile = String(profile?.department || '');

    const role: User['role'] = roleRaw === 'admin'
      ? (deptFromProfile && deptFromProfile !== 'All Departments' ? 'Department Admin' : 'Super Admin')
      : roleRaw === 'officer'
        ? 'Field Officer'
        : roleRaw === 'staff'
          ? 'Staff'
          : 'Viewer';

    const dept = (roleRaw === 'admin')
      ? (deptFromProfile || 'All Departments')
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
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let initialSessionHandled = false; // Prevent race between getSession and onAuthStateChange

    const fetchProfile = async (authUser: any) => {
      try {
        if (!authUser?.id) {
          if (!cancelled) setUser(null);
          return;
        }

        const { data: prof, error: profErr } = await sb
          .from('profiles')
          .select('id, full_name, role, department, reports_to_officer_id, reports_to_officer_name')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profErr || !prof) {
          try { await sb.auth.signOut(); } catch {}
          if (!cancelled) setUser(null);
          return;
        }

        if (!cancelled) setUser(mapProfileToUser(authUser, prof));
      } catch {
        try { await sb.auth.signOut(); } catch {}
        if (!cancelled) setUser(null);
      } finally {
        // ALWAYS set loading to false - this must run in every code path
        if (!cancelled) setIsLoading(false);
      }
    };

    // Restore session first; only then fetch profile.
    setIsLoading(true);
    sb.auth.getSession()
      .then(({ data }) => {
        initialSessionHandled = true; // Mark that getSession has handled the initial session
        const au = data?.session?.user;
        if (!au) {
          if (!cancelled) setUser(null);
          return;
        }
        return fetchProfile(au);
      })
      .catch(() => {
        initialSessionHandled = true;
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        // ALWAYS set loading to false when session check completes.
        // This handles the case where there's no session (fetchProfile won't run).
        if (!cancelled) setIsLoading(false);
      });

    const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      // Skip the initial SIGNED_IN event if getSession already handled it
      // This prevents the race condition that causes infinite loading
      if (event === 'SIGNED_IN' && !initialSessionHandled) {
        return; // getSession will handle this
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Handles SIGNED_IN and token refreshes consistently.
      const au = session?.user;
      if (!au) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await fetchProfile(au);
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
        .select('id, full_name, role, department, reports_to_officer_id, reports_to_officer_name')
        .eq('id', au.id)
        .maybeSingle();

      if (profErr) {
        return { success: false, message: profErr.message || 'Failed to load profile' };
      }

      const mapped = mapProfileToUser(au, prof);
      const adminAllowed = mapped.role === 'Super Admin' || mapped.role === 'Department Admin';
      const officerAllowed = mapped.role === 'Field Officer' || mapped.role === 'Staff';

      if (rolePref && ((rolePref === 'admin' && !adminAllowed) || (rolePref === 'officer' && !officerAllowed))) {
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
