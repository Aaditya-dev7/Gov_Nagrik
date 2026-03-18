import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MOCK_REPORTS, MOCK_STAFF_TASKS, MOCK_NSS_REGISTRATIONS, MOCK_USER_BADGES, MOCK_BADGES } from '@/lib/mockData';
import { Report } from '@/lib/types';

type ReportsContextType = {
  reports: Report[];
  isLoading: boolean;
  addReport: (data: any) => Promise<{ success: boolean; syncFailed?: boolean; reportId?: string }>;
  updateReportStatus: (id: string, status: string, note?: string) => void;
  updateAssignment: (id: string, params: { department?: string; officerId?: string | null; officerName?: string | null; actor?: string }) => void;
  deleteReport: (id: string) => void;
  markNotificationRead: (id: string) => void;
  unreadCount: number;
};

const MockReportsContext = createContext<ReportsContextType | undefined>(undefined);

export function MockReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS as unknown as Report[]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const addReport = async (data: any): Promise<{ success: boolean; syncFailed?: boolean; reportId?: string }> => {
    const reportId = `RPT-${Date.now()}`;
    const newReport: any = {
      report_id: reportId,
      ...data,
      submitted_at: new Date().toISOString(),
      status: 'Pending',
      timeline: [{ actor: 'System', action: 'Report created', at: new Date().toISOString() }],
    };
    setReports(prev => [newReport, ...prev]);
    return { success: true, syncFailed: false, reportId };
  };

  const updateReportStatus = (id: string, status: string, note?: string) => {
    setReports(prev => prev.map(r => {
      if (r.report_id !== id) return r;
      return {
        ...r,
        status: status as any,
        timeline: [
          ...(r.timeline || []),
          { actor: 'User', action: `Status changed to ${status}${note ? `: ${note}` : ''}`, at: new Date().toISOString() },
        ],
      };
    }));
  };

  const updateAssignment = (id: string, params: { department?: string; officerId?: string | null; officerName?: string | null; actor?: string }) => {
    setReports(prev => prev.map(r => {
      if (r.report_id !== id) return r;
      return {
        ...r,
        assigned_department: params.department || r.assigned_department,
        assigned_officer_id: params.officerId || null,
        assigned_officer_name: params.officerName || null,
        timeline: [
          ...(r.timeline || []),
          { actor: params.actor || 'System', action: `Assigned to ${params.officerName || params.department}`, at: new Date().toISOString() },
        ],
      };
    }));
  };

  const deleteReport = (id: string) => {
    setReports(prev => prev.filter(r => r.report_id !== id));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <MockReportsContext.Provider value={{
      reports,
      isLoading: false,
      addReport,
      updateReportStatus,
      updateAssignment,
      deleteReport,
      markNotificationRead,
      unreadCount,
    }}>
      {children}
    </MockReportsContext.Provider>
  );
}

export function useReports() {
  const ctx = useContext(MockReportsContext);
  if (!ctx) throw new Error('useReports must be used within MockReportsProvider');
  return ctx;
}

// Mock Supabase client
export const mockSupabase = {
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (col: string, val: any) => ({
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        then: (cb: any) => {
          let data: any[] = [];
          if (table === 'badges') data = MOCK_BADGES;
          if (table === 'user_badges') data = MOCK_USER_BADGES;
          if (table === 'nss_registrations') data = MOCK_NSS_REGISTRATIONS;
          if (table === 'staff_tasks') data = MOCK_STAFF_TASKS;
          if (table === 'profiles') data = [];
          return Promise.resolve(cb({ data, error: null }));
        },
      }),
      in: (col: string, vals: any[]) => ({
        then: (cb: any) => Promise.resolve(cb({ data: [], error: null })),
      }),
      then: (cb: any) => {
        let data: any[] = [];
        if (table === 'badges') data = MOCK_BADGES;
        if (table === 'user_badges') data = MOCK_USER_BADGES;
        if (table === 'nss_registrations') data = MOCK_NSS_REGISTRATIONS;
        if (table === 'staff_tasks') data = MOCK_STAFF_TASKS;
        return Promise.resolve(cb({ data, error: null }));
      },
    }),
    insert: (data: any) => ({
      then: (cb: any) => Promise.resolve(cb({ data, error: null })),
    }),
    update: (data: any) => ({
      eq: (col: string, val: any) => ({
        then: (cb: any) => Promise.resolve(cb({ data, error: null })),
      }),
    }),
    upsert: (data: any) => ({
      then: (cb: any) => Promise.resolve(cb({ data, error: null })),
    }),
  }),
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async ({ email, password }: any) => {
      const users: Record<string, string> = {
        'admin@test.com': 'admin123',
        'officer@test.com': 'officer123',
        'staff@test.com': 'staff123',
        'citizen@test.com': 'citizen123',
      };
      if (users[email] === password) {
        return { data: { user: { email } }, error: null };
      }
      return { data: null, error: { message: 'Invalid credentials' } };
    },
    signOut: async () => ({ error: null }),
  },
};

export function getMockSupabase() {
  return mockSupabase;
}
