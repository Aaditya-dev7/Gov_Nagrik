import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Report, Notification } from '@/lib/types';
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

function notifToDbRow(n: any): Record<string, any> {
  return {
    id: n.id,
    message: n.message,
    timestamp: n.timestamp,
    read: n.read,
    report_id: n.report_id,
    type: n?.meta?.type ?? null,
    actor: n?.meta?.actor ?? null,
    recipient_user_id: n?.recipient_user_id ?? null,
    recipient_role: n?.recipient_role ?? null,
  };
}

function mapDbToNotif(row: any): any {
  return {
    id: row.id,
    message: row.message,
    timestamp: row.timestamp,
    read: !!row.read,
    report_id: row.report_id,
    recipient_user_id: row.recipient_user_id ?? null,
    recipient_role: row.recipient_role ?? null,
    ...(row.type || row.actor ? { meta: { type: row.type ?? undefined, actor: row.actor ?? undefined } } : {}),
  };
}

function reportToDbRow(r: Report): Record<string, any> {
  return {
    id: r.report_id,
    category: r.category,
    other_category: r.other_category ?? null,
    description: r.description,
    summary: r.summary,
    report_score: typeof r.report_score === 'number' ? r.report_score : null,
    priority: r.priority,
    status: r.status,
    submitted_at: r.submitted_at,
    deadline: r.deadline ?? null,
    location_text: r.location_text,
    lat: r.lat,
    lng: r.lng,
    reporter_name: r.reporter.name,
    reporter_phone: r.reporter.phone,
    anonymous: r.reporter.anonymous,
    assigned_department: r.assigned_department,
    assigned_officer_id: r.assigned_officer_id,
    assigned_officer_name: r.assigned_officer_name,
    resolution_documents: r.resolution_documents ?? null,
    resolution_note: r.resolution_note ?? null,
  } as Record<string, any>;
}

interface ReportsContextType {
  reports: Report[];
  notifications: Notification[];
  isLoading: boolean;
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

function normalizeLocationText(s?: string | null): string {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function mergeLocationIntoSummary(params: { summary: string; description: string; locationText: string }): string {
  const summary = String(params.summary || '').trim();
  const description = String(params.description || '');
  const locationText = normalizeLocationText(params.locationText);

  if (!summary) return locationText ? `Location: ${locationText}.` : '';
  if (!locationText) return summary;

  const lower = (s: string) => s.toLowerCase();
  const hasLocInDesc = lower(description).includes(lower(locationText));
  const hasLocInSummary = lower(summary).includes(lower(locationText));
  if (hasLocInDesc || hasLocInSummary) return summary;

  const parts = locationText.split(',').map(p => p.trim()).filter(Boolean);
  if (!parts.length) return summary;

  const sumLower = lower(summary);
  const uniqParts = parts.filter(p => !sumLower.includes(lower(p)));
  if (!uniqParts.length) return summary;

  return `${summary}${summary.endsWith('.') ? '' : '.'} Location: ${uniqParts.join(', ')}.`;
}

async function generateAiSummary(params: { description: string; category: string; locationText: string }): Promise<string> {
  const description = String(params.description || '');
  const category = String(params.category || 'Issue');
  const locationText = normalizeLocationText(params.locationText);

  const sb = getSupabase();
  if (!sb) {
    const base = `${category} issue: ${description.split(' ').slice(0, 15).join(' ')}${description.split(' ').length > 15 ? '...' : ''}`;
    return mergeLocationIntoSummary({ summary: base, description, locationText });
  }

  try {
    const res = await sb.functions.invoke('summarize', { body: { text: description } });
    const raw = (res as any)?.data?.summary;
    const upstreamSummary = typeof raw === 'string' ? raw.trim() : '';
    const base = upstreamSummary || `${category} issue: ${description.split(' ').slice(0, 15).join(' ')}${description.split(' ').length > 15 ? '...' : ''}`;
    return mergeLocationIntoSummary({ summary: base, description, locationText });
  } catch {
    const base = `${category} issue: ${description.split(' ').slice(0, 15).join(' ')}${description.split(' ').length > 15 ? '...' : ''}`;
    return mergeLocationIntoSummary({ summary: base, description, locationText });
  }
}

function mapDbToReport(row: any): Report {
  const desc = String(row.description || '');
  const fallbackSummary = `${String(row.category || 'Issue')} issue: ${desc.split(' ').slice(0, 15).join(' ')}${desc.split(' ').length > 15 ? '...' : ''}`;
  return {
    report_id: row.id,
    category: row.category,
    other_category: row.other_category ?? undefined,
    description: row.description,
    summary: (typeof row.summary === 'string' && row.summary.trim().length > 0) ? row.summary : fallbackSummary,
    report_score: typeof row.report_score === 'number' ? row.report_score : (row.report_score != null ? Number(row.report_score) : undefined),
    priority: row.priority,
    status: row.status,
    submitted_at: row.submitted_at,
    deadline: row.deadline ?? undefined,
    overdue_at: row.overdue_at ?? undefined,
    location_text: row.location_text,
    lat: row.lat,
    lng: row.lng,
    reporter: { name: row.reporter_name || 'Citizen', phone: row.reporter_phone || null, anonymous: !!row.anonymous },
    media: [],
    assigned_department: row.assigned_department || 'Administration',
    assigned_officer_id: row.assigned_officer_id || null,
    assigned_officer_name: row.assigned_officer_name || 'Unassigned',
    assigned_officer_phone: row.assigned_officer_phone || null,
    assigned_officer_email: row.assigned_officer_email || null,
    timeline: [],
    resolution_documents: row.resolution_documents ?? undefined,
    resolution_note: row.resolution_note ?? undefined,
  } as Report;
}

function getDeadlineDays(priority: Report['priority']): number {
  switch (priority) {
    case 'Low': return 15;
    case 'Medium': return 10;
    case 'High': return 6;
    case 'Urgent': return 3;
    default: return 15;
  }
}

function computeDeadlineIso(submittedAtIso: string, priority: Report['priority']): string | null {
  const submitted = new Date(submittedAtIso).getTime();
  if (!submitted || Number.isNaN(submitted)) return null;
  const days = getDeadlineDays(priority);
  const deadlineMs = submitted + days * 24 * 60 * 60 * 1000;
  if (Number.isNaN(deadlineMs)) return null;
  return new Date(deadlineMs).toISOString();
}

function isOverdue(r: Report, now = Date.now()): boolean {
  const days = getDeadlineDays(r.priority);
  const submitted = new Date(r.submitted_at).getTime();
  if (!submitted || Number.isNaN(submitted)) return false;
  const deadlineMs = submitted + days * 24 * 60 * 60 * 1000;
  return now > deadlineMs;
}

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(() => {
    // Don't load mock reports - will be loaded from database
    return [];
  });
  
  const [isLoading, setIsLoading] = useState(true);

  const maybeEscalateOverdue = (r: Report) => {
    if (!r) return;
    if (r.status === 'Resolved' || r.status === 'Rejected') return;
    if (r.overdue_at) return;
    if (!isOverdue(r)) return;

    const at = new Date().toISOString();
    const days = getDeadlineDays(r.priority);
    const msg = `Overdue: ${r.report_id} (${r.priority}) exceeded ${days} days`;

    setReports(prev => prev.map(x => x.report_id === r.report_id ? {
      ...x,
      overdue_at: at,
      timeline: [...x.timeline, { actor: 'System', action: `Auto-escalated as overdue after ${days} days`, at }]
    } : x));

    const notif: any = {
      id: `notif-${Date.now()}`,
      message: msg,
      timestamp: at,
      read: false,
      report_id: r.report_id,
      meta: { type: 'overdue', actor: 'System' },
    };
    setNotifications(prev => [notif, ...prev]);

    const officerNotif: any = {
      id: `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message: msg,
      timestamp: at,
      read: false,
      report_id: r.report_id,
      meta: { type: 'overdue', actor: 'System' },
      recipient_role: 'officer',
      recipient_user_id: r.assigned_officer_id || null,
    };

    const adminNotif: any = {
      id: `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message: msg,
      timestamp: at,
      read: false,
      report_id: r.report_id,
      meta: { type: 'overdue', actor: 'System' },
      recipient_role: 'admin',
      recipient_user_id: null,
    };

    const sb = getSupabase();
    if (sb) {
      sb.from('reports').update({ overdue_at: at }).eq('id', r.report_id)
        .then(({ error }) => { if (error) { try { console.error('Supabase update overdue_at failed', error); } catch {} } });
      sb.from('report_timeline').insert({ report_id: r.report_id, actor: 'System', action: `Auto-escalated as overdue after ${days} days`, at })
        .then(({ error }) => { if (error) { try { console.error('Supabase insert overdue timeline failed', error); } catch {} } });
      sb.from('notifications').upsert(notifToDbRow(notif))
        .then(({ error }) => { if (error) { try { console.error('Supabase upsert overdue notification failed', error); } catch {} } });

      sb.from('notifications').upsert(notifToDbRow(officerNotif))
        .then(({ error }) => { if (error) { try { console.error('Supabase upsert officer overdue notification failed', error); } catch {} } });
      sb.from('notifications').upsert(notifToDbRow(adminNotif))
        .then(({ error }) => { if (error) { try { console.error('Supabase upsert admin overdue notification failed', error); } catch {} } });
    }
  };
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Don't load mock notifications - will be loaded from database
    return [];
  });

  // Load from Supabase if configured and subscribe to realtime changes
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      // No Supabase - use mock data and finish loading
      setIsLoading(false);
      return;
    }
    let mounted = true;

    async function loadInitial() {
      try {
        const { data: repData } = await sb.from('reports').select('*').order('submitted_at', { ascending: false });
        const mapped = (repData || []).map(mapDbToReport);
        // Hide resolved reports older than 30 days in the UI
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const filtered = mapped.filter(r => !(r.status === 'Resolved' && new Date(r.submitted_at).getTime() < cutoff));
        // Merge DB data with existing state, adding new DB reports to existing local state
        if (mounted) {
          if (filtered.length > 0) {
            setReports(prev => {
              const byId = new Map(prev.map(r => [r.report_id, r] as const));
              const merged: Report[] = [];
              // Add all DB reports first (they take precedence for status/assignment updates)
              for (const r of filtered) {
                merged.push(r);
                byId.delete(r.report_id);
              }
              // Add any local-only reports not in DB
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

          // Load notifications from DB if table exists
          try {
            const { data: nData } = await sb.from('notifications').select('*').order('timestamp', { ascending: false });
            if (mounted && nData && nData.length) {
              setNotifications(nData.map(mapDbToNotif));
            }
          } catch {}
        }
      } catch (err) {
        console.error('Failed to load reports from database:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    // Always load initial data from DB to sync citizen-submitted reports
    loadInitial();

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
      const updated = mapDbToReport(payload.new);
      setReports(prev => prev.map(r => {
        if (r.report_id !== payload.new.id) return r;
        return {
          ...r,
          ...updated,
          // Preserve locally-loaded/derived fields
          media: r.media || updated.media || [],
          timeline: r.timeline || updated.timeline || [],
        };
      }));
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

    // Notifications channel (optional table)
    try {
      chan.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, payload => {
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => [mapDbToNotif(payload.new), ...prev.filter(n => n.id !== payload.new.id)]);
        }
        if (payload.eventType === 'UPDATE') {
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? mapDbToNotif(payload.new) : n));
        }
        if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      });
    } catch {}
    chan.subscribe();

    return () => { mounted = false; sb.removeChannel(chan); };
  }, []);

  // NOTE: DB is the source of truth; we intentionally do not persist report lists to localStorage.

  // Periodically check for overdue reports and escalate once
  useEffect(() => {
    const run = () => {
      try {
        const now = Date.now();
        for (const r of reports) {
          if (r.status === 'Resolved' || r.status === 'Rejected') continue;
          if (r.overdue_at) continue;
          if (isOverdue(r, now)) maybeEscalateOverdue(r);
        }
      } catch {}
    };
    run();
    const id = setInterval(run, 60 * 1000);
    return () => clearInterval(id);
  }, [reports]);

  // NOTE: DB is the source of truth; we intentionally do not persist notifications to localStorage.

  // Prune notifications older than 24 hours, and hide resolved reports older than 30 days periodically
  useEffect(() => {
    const prune = () => {
      const notifCutoff = Date.now() - 24 * 60 * 60 * 1000;
      const resolvedCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      setNotifications(prev => prev.filter(n => new Date(n.timestamp).getTime() >= notifCutoff));
      setReports(prev => prev.filter(r => !(r.status === 'Resolved' && new Date(r.submitted_at).getTime() < resolvedCutoff)));
    };
    prune();
    const id = setInterval(prune, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const updateReportStatus = (reportId: string, status: Report['status'], actor: string, reason?: string) => {
    const at = new Date().toISOString();
    const action = reason ? `Marked as ${status} - "${reason}"` : `Marked as ${status}`;
    
    // Update local state immediately
    setReports(prev => prev.map(report => {
      if (report.report_id === reportId) {
        return { ...report, status, timeline: [...report.timeline, { actor, action, at }] };
      }
      return report;
    }));
    
    // Add notification to local state
    const notif: any = {
      id: `notif-${Date.now()}`,
      message: `Report ${reportId} marked as ${status}`,
      timestamp: at,
      read: false,
      report_id: reportId,
      meta: { type: 'status', actor },
    };
    setNotifications(prev => [notif, ...prev]);
    
    // Sync with database
    const sb = getSupabase();
    if (sb) {
      // Update status in database
      sb.from('reports').update({ status }).eq('id', reportId)
        .then(({ error, data }) => {
          if (error) {
            console.error('Supabase update status failed', error);
          } else {
            console.log('Status updated in database:', reportId, status);
          }
        });
      
      // Add timeline entry
      sb.from('report_timeline').insert({ report_id: reportId, actor, action, at })
        .then(({ error }) => {
          if (error) console.error('Supabase insert timeline failed', error);
        });
      
      // Create notification for citizen
      const citizenNotif = {
        id: `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: `Your report ${reportId} is now ${status}${reason ? ` - ${reason}` : ''}`,
        timestamp: at,
        read: false,
        report_id: reportId,
        recipient_role: 'citizen',
        type: 'status',
        actor,
      };
      
      sb.from('notifications').upsert(notifToDbRow(citizenNotif))
        .then(({ error }) => {
          if (error) console.error('Supabase insert citizen notification failed', error);
        });
      
      // Create notification for admin
      const adminNotif = {
        id: `notif-${Date.now()}-${Math.random().toString(16).slice(2)}-admin`,
        message: `Report ${reportId} marked as ${status} by ${actor}`,
        timestamp: at,
        read: false,
        report_id: reportId,
        recipient_role: 'admin',
        type: 'status',
        actor,
      };
      
      sb.from('notifications').upsert(notifToDbRow(adminNotif))
        .then(({ error }) => {
          if (error) console.error('Supabase insert admin notification failed', error);
        });
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
    const reportId = generateReportId();
    const submittedAt = new Date().toISOString();
    const computedDeadline = computeDeadlineIso(submittedAt, data.priority);
    const assignedDepartment = getCategoryDepartment(data.category);
    const timelineAt = submittedAt;

    (async () => {
      const summary = await generateAiSummary({
        description: data.description,
        category: data.category,
        locationText: data.location_text,
      });

      const newReport: Report = {
        report_id: reportId,
        category: data.category,
        description: data.description,
        summary,
        priority: data.priority,
        status: 'Pending',
        submitted_at: submittedAt,
        deadline: computedDeadline ?? undefined,
        location_text: data.location_text,
        lat: data.lat,
        lng: data.lng,
        reporter: data.reporter,
        media: [],
        assigned_department: assignedDepartment,
        assigned_officer_id: null,
        assigned_officer_name: 'Unassigned',
        timeline: [
          { actor: 'System', action: 'Report created', at: timelineAt },
          { actor: 'Auto-Assignment', action: `Assigned to ${assignedDepartment} department`, at: timelineAt }
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
          deadline: newReport.deadline ?? null,
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
    })();

    const settings = loadEmailAlertSettings();
    const shouldAlert = settings.enabled && settings.toEmail && (
      (data.priority === 'Urgent' && settings.urgent) ||
      (data.priority === 'High' && settings.high)
    );
    if (shouldAlert) {
      const sb2 = getSupabase();
      if (sb2) {
        sb2.functions.invoke('send-alert', {
          body: {
            to_email: settings.toEmail,
            report_id: reportId,
            priority: data.priority,
            category: data.category,
            location_text: data.location_text,
            description: data.description,
            submitted_at: submittedAt,
          }
        }).catch(() => {});
      }
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
    const sb = getSupabase();
    if (sb) {
      sb.from('notifications').update({ read: true }).eq('id', notificationId)
        .then(({ error }) => { if (error) { try { console.error('Supabase update notification failed', error); } catch {} } });
    }
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
    const notif: any = {
      id: `notif-${Date.now()}`,
      message: `${actor} requested assignment for ${reportId}`,
      timestamp: at,
      read: false,
      report_id: reportId,
      meta: { type: 'assignment_request', actor },
    };
    setNotifications(prev => [notif, ...prev]);
    const sb = getSupabase();
    if (sb) {
      sb.from('report_timeline').insert({ report_id: reportId, actor, action, at })
        .then(({ error }) => { if (error) { try { console.error('Supabase insert assignment request failed', error); } catch {} } });
      sb.from('notifications').upsert(notifToDbRow(notif))
        .then(({ error }) => { if (error) { try { console.error('Supabase upsert notification failed', error); } catch {} } });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ReportsContext.Provider value={{
      reports,
      notifications,
      isLoading,
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
