import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Report, Notification } from '@/lib/types';
import { mockReports as initialReports, mockNotifications as initialNotifications } from '@/lib/data';
import emailjs from '@emailjs/browser';
import { loadEmailAlertSettings } from '@/lib/userSettings';
import { getSupabase } from '@/lib/supabase';

interface NewReportData {
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  description: string;
  location_text: string;
  lat: number;
  lng: number;
  reporter: {
    name: string;
    phone: string | null;
    anonymous: boolean;
  };

}

function reportToDbRow(r: Report): Record<string, any> {
  return {
    id: r.report_id,
    category: r.category,
    description: r.description,
    summary: r.summary,
    priority: r.priority,
    status: r.status,
    submitted_at: r.submitted_at,
    location_text: r.location_text,
    lat: r.lat,
    lng: r.lng,
    reporter_name: r.reporter.name,
    reporter_phone: r.reporter.phone,
    anonymous: r.reporter.anonymous,
    assigned_department: r.assigned_department,
    assigned_officer_id: r.assigned_officer_id,
    assigned_officer_name: r.assigned_officer_name,
  } as Record<string, any>;
}

interface ReportsContextType {
  reports: Report[];
  notifications: Notification[];
  updateReportStatus: (reportId: string, status: Report['status'], actor: string, reason?: string) => void;
  addProgressNote: (reportId: string, note: string, actor: string) => void;
  addReport: (data: NewReportData) => void;
  markNotificationRead: (notificationId: string) => void;
  unreadCount: number;
  updateAssignment: (reportId: string, params: { department?: string; officerId?: string | null; officerName?: string | null; actor?: string }) => void;
  deleteReport: (reportId: string) => void;
  requestAssignment: (reportId: string, actor: string) => void;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

const REPORTS_STORAGE_KEY = 'gov_reports_v1';
const NOTIFS_STORAGE_KEY = 'gov_notifications_v1';

function generateReportId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RG-${id}`;
}

function generateSummary(description: string, category: string): string {
  // Simple AI-like summary generation
  const words = description.split(' ').slice(0, 15).join(' ');
  return `${category} issue: ${words}${description.split(' ').length > 15 ? '...' : ''}`;
}

function mapDbToReport(row: any): Report {
  return {
    report_id: row.id,
    category: row.category,
    description: row.description,
    summary: row.summary ?? generateSummary(row.description || '', row.category || 'Issue'),
    priority: row.priority,
    status: row.status,
    submitted_at: row.submitted_at,
    location_text: row.location_text,
    lat: row.lat,
    lng: row.lng,
    reporter: { name: row.reporter_name || 'Citizen', phone: row.reporter_phone || null, anonymous: !!row.anonymous },
    media: [],
    assigned_department: row.assigned_department || 'Administration',
    assigned_officer_id: row.assigned_officer_id || null,
    assigned_officer_name: row.assigned_officer_name || 'Unassigned',
    timeline: [],
  } as Report;
}

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
        if (raw) return JSON.parse(raw) as Report[];
      }
    } catch {}
    return initialReports;
  });
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(NOTIFS_STORAGE_KEY);
        if (raw) return JSON.parse(raw) as Notification[];
      }
    } catch {}
    return initialNotifications;
  });

  // Load from Supabase if configured and subscribe to realtime changes
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let mounted = true;

    // If we already have cached reports, skip initial DB fetch to avoid a UI "snap"
    // but still subscribe to realtime updates.
    let skipInitial = false;
    try {
      if (typeof window !== 'undefined') {
        skipInitial = Boolean(localStorage.getItem(REPORTS_STORAGE_KEY));
      }
    } catch {}

    async function loadInitial() {
      const { data: repData } = await sb.from('reports').select('*').order('submitted_at', { ascending: false });
      const mapped = (repData || []).map(mapDbToReport);
      // Hide resolved reports older than 30 days in the UI
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filtered = mapped.filter(r => !(r.status === 'Resolved' && new Date(r.submitted_at).getTime() < cutoff));
      // Merge DB data with existing state, preferring existing (local) state for overlapping IDs
      if (mounted && filtered.length > 0) {
        setReports(prev => {
          const byId = new Map(prev.map(r => [r.report_id, r] as const));
          const merged: Report[] = [];
          for (const r of filtered) {
            if (byId.has(r.report_id)) {
              merged.push(byId.get(r.report_id)!);
              byId.delete(r.report_id);
            } else {
              merged.push(r);
            }
          }
          for (const leftover of byId.values()) merged.push(leftover);
          return merged;
        });
      }
      // Load media from Supabase Storage bucket 'reports' for each report id
      try {
        const mediaMap: Record<string, string[]> = {};
        for (const r of filtered) {
          const { data: files } = await sb.storage.from('reports').list(r.report_id);
          if (files && files.length) {
            const urls: string[] = [];
            for (const f of files) {
              const { data } = sb.storage.from('reports').getPublicUrl(`${r.report_id}/${f.name}`);
              if (data?.publicUrl) urls.push(data.publicUrl);
            }
            mediaMap[r.report_id] = urls;
          }
        }
        if (mounted) setReports(prev => prev.map(r => ({ ...r, media: mediaMap[r.report_id] || r.media || [] })));
      } catch {}
      const ids = mapped.map(r => r.report_id);
      if (ids.length) {
        const { data: tData } = await sb.from('report_timeline').select('*').in('report_id', ids).order('at', { ascending: true });
        if (mounted && tData) {
          setReports(prev => prev.map(r => ({
            ...r,
            timeline: tData.filter(t => t.report_id === r.report_id).map(t => ({ actor: t.actor, action: t.action, at: t.at }))
          })));
        }
      }
    }

    if (!skipInitial) {
      loadInitial();
    }

    const chan = sb.channel('reports_and_timeline');
    chan.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, async payload => {
      const base = mapDbToReport(payload.new);
      try {
        const { data: files } = await sb.storage.from('reports').list(base.report_id);
        if (files && files.length) {
          const urls: string[] = [];
          for (const f of files) {
            const { data } = sb.storage.from('reports').getPublicUrl(`${base.report_id}/${f.name}`);
            if (data?.publicUrl) urls.push(data.publicUrl);
          }
          base.media = urls;
        }
      } catch {}
      setReports(prev => [{ ...base }, ...prev.filter(r => r.report_id !== payload.new.id)]);
      // Create a local notification so admins see new citizen submissions
      const message = `New ${String(base.priority || '').toLowerCase()} report ${base.report_id} submitted`;
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        report_id: base.report_id,
      };
      setNotifications(prev => [notif, ...prev]);
    });
    chan.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, payload => {
      setReports(prev => prev.map(r => r.report_id === payload.new.id ? {
        ...r,
        status: payload.new.status,
        assigned_department: payload.new.assigned_department || r.assigned_department,
        assigned_officer_id: payload.new.assigned_officer_id ?? r.assigned_officer_id,
        assigned_officer_name: payload.new.assigned_officer_name || r.assigned_officer_name,
      } : r));
    });
    chan.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reports' }, payload => {
      setReports(prev => prev.filter(r => r.report_id !== payload.old.id));
    });
    chan.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'report_timeline' }, payload => {
      setReports(prev => prev.map(r => r.report_id === payload.new.report_id ? {
        ...r,
        timeline: [...r.timeline, { actor: payload.new.actor, action: payload.new.action, at: payload.new.at }]
      } : r));
    });
    chan.subscribe();

    return () => { mounted = false; sb.removeChannel(chan); };
  }, []);

  // Persist to localStorage as a cache so state survives dev server restarts and reloads
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
      }
    } catch {}
  }, [reports]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(notifications));
      }
    } catch {}
  }, [notifications]);

  // Prune notifications older than 30 days, and hide resolved reports older than 30 days periodically
  useEffect(() => {
    const prune = () => {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      setNotifications(prev => prev.filter(n => new Date(n.timestamp).getTime() >= cutoff));
      setReports(prev => prev.filter(r => !(r.status === 'Resolved' && new Date(r.submitted_at).getTime() < cutoff)));
    };
    prune();
    const id = setInterval(prune, 24 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const updateReportStatus = (reportId: string, status: Report['status'], actor: string, reason?: string) => {
    const at = new Date().toISOString();
    setReports(prev => prev.map(report => {
      if (report.report_id === reportId) {
        const action = reason ? `Marked as ${status} - "${reason}"` : `Marked as ${status}`;
        return { ...report, status, timeline: [...report.timeline, { actor, action, at }] };
      }
      return report;
    }));
    const sb = getSupabase();
    if (sb) {
      const current = reports.find(r => r.report_id === reportId) || null;
      (async () => {
        const { data, error } = await sb.from('reports').update({ status }).eq('id', reportId).select('id');
        if (error) { try { console.error('Supabase update status failed', error); } catch {} }
        if (!data || data.length === 0) {
          // Row missing, upsert the full record
          const base = current ? { ...current, status } as Report : ({
            report_id: reportId, category: 'Issue', description: '', summary: '', priority: 'Low', status,
            submitted_at: at, location_text: '', lat: 0, lng: 0,
            reporter: { name: 'Citizen', phone: null, anonymous: true }, media: [],
            assigned_department: 'Administration', assigned_officer_id: null, assigned_officer_name: 'Unassigned', timeline: []
          } as Report);
          await sb.from('reports').upsert(reportToDbRow(base));
        }
        const actionText = reason ? `Marked as ${status} - "${reason}"` : `Marked as ${status}`;
        await sb.from('report_timeline').insert({ report_id: reportId, actor, action: actionText, at });
      })();
    }
  };

  const addProgressNote = (reportId: string, note: string, actor: string) => {
    const at = new Date().toISOString();
    const action = `Added progress note - "${note}"`;
    setReports(prev => prev.map(report => report.report_id === reportId ? {
      ...report,
      timeline: [...report.timeline, { actor, action, at }]
    } : report));
    const sb = getSupabase();
    if (sb) {
      sb.from('report_timeline').insert({ report_id: reportId, actor, action, at })
        .then(({ error }) => { if (error) { try { console.error('Supabase insert timeline failed', error); } catch {} } });
    }
  };

  const addReport = (data: NewReportData) => {
    const newReport: Report = {
      report_id: generateReportId(),
      category: data.category,
      description: data.description,
      summary: generateSummary(data.description, data.category),
      priority: data.priority,
      status: 'Pending',
      submitted_at: new Date().toISOString(),
      location_text: data.location_text,
      lat: data.lat,
      lng: data.lng,
      reporter: data.reporter,
      media: [],
      assigned_department: getCategoryDepartment(data.category),
      assigned_officer_id: null,
      assigned_officer_name: 'Unassigned',
      timeline: [
        { actor: 'System', action: 'Report created', at: new Date().toISOString() },
        { actor: 'Auto-Assignment', action: `Assigned to ${getCategoryDepartment(data.category)} department`, at: new Date().toISOString() }
      ]
    };

    setReports(prev => [newReport, ...prev]);

    // Supabase insert if available
    const sb = getSupabase();
    if (sb) {
      const row = {
        id: newReport.report_id,
        category: newReport.category,
        description: newReport.description,
        summary: newReport.summary,
        priority: newReport.priority,
        status: newReport.status,
        submitted_at: newReport.submitted_at,
        location_text: newReport.location_text,
        lat: newReport.lat,
        lng: newReport.lng,
        reporter_name: newReport.reporter.name,
        reporter_phone: newReport.reporter.phone,
        anonymous: newReport.reporter.anonymous,
        assigned_department: newReport.assigned_department,
        assigned_officer_id: newReport.assigned_officer_id,
        assigned_officer_name: newReport.assigned_officer_name,
      } as Record<string, any>;
      sb.from('reports').insert(row);
      sb.from('report_timeline').insert({ report_id: newReport.report_id, actor: 'System', action: 'Report created', at: newReport.submitted_at });
      sb.from('report_timeline').insert({ report_id: newReport.report_id, actor: 'Auto-Assignment', action: `Assigned to ${newReport.assigned_department} department`, at: newReport.submitted_at });
    }

    // Add notification
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      message: `New ${data.priority.toLowerCase()} priority report ${newReport.report_id} submitted`,
      timestamp: new Date().toISOString(),
      read: false,
      report_id: newReport.report_id
    };
    setNotifications(prev => [newNotification, ...prev]);

    const settings = loadEmailAlertSettings();
    const shouldAlert = settings.enabled && settings.toEmail && (
      (newReport.priority === 'Urgent' && settings.urgent) ||
      (newReport.priority === 'High' && settings.high)
    );
    if (shouldAlert) {
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string;
      const templateId = (import.meta.env.VITE_EMAILJS_ALERT_TEMPLATE_ID as string) || (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string);
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string;
      const templateParams = {
        to_email: settings.toEmail,
        report_id: newReport.report_id,
        priority: newReport.priority,
        category: newReport.category,
        location_text: newReport.location_text,
        description: newReport.description,
        submitted_at: newReport.submitted_at,
      } as Record<string, any>;
      try {
        emailjs.send(serviceId, templateId, templateParams, publicKey);
      } catch {}
    }
  };

  const updateAssignment = (reportId: string, params: { department?: string; officerId?: string | null; officerName?: string | null; actor?: string }) => {
    const at = new Date().toISOString();
    const { department, officerId, officerName, actor } = params;
    setReports(prev => prev.map(r => {
      if (r.report_id !== reportId) return r;
      const next = { ...r } as Report;
      if (typeof department !== 'undefined') next.assigned_department = department;
      if (typeof officerId !== 'undefined') next.assigned_officer_id = officerId;
      if (typeof officerName !== 'undefined') next.assigned_officer_name = officerName || 'Unassigned';
      const actions: string[] = [];
      if (typeof department !== 'undefined') actions.push(`Assigned to ${department} department`);
      if (typeof officerName !== 'undefined') actions.push(`Officer set to ${officerName || 'Unassigned'}`);
      if (actions.length) {
        next.timeline = [...next.timeline, { actor: actor || 'System', action: actions.join(' • '), at }];
      }
      return next;
    }));
    const sb = getSupabase();
    if (sb) {
      const update: Record<string, any> = {};
      if (typeof department !== 'undefined') update.assigned_department = department;
      if (typeof officerId !== 'undefined') update.assigned_officer_id = officerId;
      if (typeof officerName !== 'undefined') update.assigned_officer_name = officerName;
      (async () => {
        if (Object.keys(update).length) {
          const { data, error } = await sb.from('reports').update(update).eq('id', reportId).select('id');
          if (error) { try { console.error('Supabase update reports failed', error); } catch {} }
          if (!data || data.length === 0) {
            const current = reports.find(r => r.report_id === reportId) || null;
            const base = current ? { ...current } as Report : ({
              report_id: reportId, category: 'Issue', description: '', summary: '', priority: 'Low', status: 'Pending',
              submitted_at: at, location_text: '', lat: 0, lng: 0,
              reporter: { name: 'Citizen', phone: null, anonymous: true }, media: [],
              assigned_department: department ?? 'Administration', assigned_officer_id: officerId ?? null, assigned_officer_name: officerName ?? 'Unassigned', timeline: []
            } as Report);
            // apply updates to base before upsert
            const finalBase: Report = {
              ...base,
              assigned_department: typeof department !== 'undefined' ? department : base.assigned_department,
              assigned_officer_id: typeof officerId !== 'undefined' ? officerId : base.assigned_officer_id,
              assigned_officer_name: typeof officerName !== 'undefined' ? (officerName || 'Unassigned') : base.assigned_officer_name,
            };
            await sb.from('reports').upsert(reportToDbRow(finalBase));
          }
        }
        const actions: string[] = [];
        if (typeof department !== 'undefined') actions.push(`Assigned to ${department} department`);
        if (typeof officerName !== 'undefined') actions.push(`Officer set to ${officerName || 'Unassigned'}`);
        if (actions.length) {
          await sb.from('report_timeline').insert({ report_id: reportId, actor: actor || 'System', action: actions.join(' • '), at });
        }
      })();
    } else {
      try { console.warn('Supabase disabled (missing VITE_SUPABASE_URL/ANON_KEY). Assignment not persisted to DB.'); } catch {}
    }
  };

  const markNotificationRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
  };

  const deleteReport = (reportId: string) => {
    setReports(prev => prev.filter(r => r.report_id !== reportId));
    const sb = getSupabase();
    if (sb) {
      (async () => {
        try { await sb.from('report_timeline').delete().eq('report_id', reportId); } catch {}
        try { await sb.from('reports').delete().eq('id', reportId); } catch {}
        try {
          const { data: files } = await sb.storage.from('reports').list(reportId);
          if (files && files.length) {
            await sb.storage.from('reports').remove(files.map(f => `${reportId}/${f.name}`));
          }
        } catch {}
      })();
    }
  };

  const requestAssignment = (reportId: string, actor: string) => {
    const at = new Date().toISOString();
    const action = `Assignment requested by ${actor}`;
    setReports(prev => prev.map(r => r.report_id === reportId ? {
      ...r,
      timeline: [...r.timeline, { actor, action, at }]
    } : r));
    const notif: Notification = {
      id: `notif-${Date.now()}`,
      message: `${actor} requested assignment for ${reportId}`,
      timestamp: at,
      read: false,
      report_id: reportId,
    };
    setNotifications(prev => [notif, ...prev]);
    const sb = getSupabase();
    if (sb) {
      sb.from('report_timeline').insert({ report_id: reportId, actor, action, at })
        .then(({ error }) => { if (error) { try { console.error('Supabase insert assignment request failed', error); } catch {} } });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ReportsContext.Provider value={{
      reports,
      notifications,
      updateReportStatus,
      addProgressNote,
      addReport,
      markNotificationRead,
      unreadCount,
      updateAssignment,
      deleteReport,
      requestAssignment
    }}>
      {children}
    </ReportsContext.Provider>
  );
}

function getCategoryDepartment(category: string): string {
  const mapping: Record<string, string> = {
    'Pothole': 'Roads',
    'Road Damage': 'Roads',
    'Garbage Collection': 'Sanitation',
    'Illegal Dumping': 'Sanitation',
    'Street Light': 'Street Lighting',
    'Water Leakage': 'Water Supply',
    'Drainage Block': 'Drainage',
    'Tree Falling Risk': 'Roads',
    'Sewage Overflow': 'Drainage',
    'Park Maintenance': 'Sanitation'
  };
  return mapping[category] || 'Administration';
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
}
