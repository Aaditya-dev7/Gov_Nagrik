import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { mockUsers } from '@/lib/data';
import { useReports } from '@/contexts/ReportsContext';
import { User } from '@/lib/types';

interface OfficersPageProps {
  onNavigateToReportsFiltered?: (filter: 'all' | 'Pending' | 'In Progress' | 'Resolved' | 'Urgent') => void;
}

export function OfficersPage({ onNavigateToReportsFiltered }: OfficersPageProps) {
  const { reports } = useReports();
  const [query, setQuery] = React.useState('');

  // Load active sessions (users who are currently logged in on this device/cluster)
  const activeSessions: (User & { since: string })[] = useMemo(() => {
    try {
      const raw = localStorage.getItem('nagrikGPT_active_sessions');
      if (!raw) return [];
      return JSON.parse(raw) as (User & { since: string })[];
    } catch {
      return [];
    }
  }, []);

  // Merge sessions with canonical/mock user records (to show full info if available)
  const loggedInOfficers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const merged = activeSessions.map(s => {
      const canonical = mockUsers.find(m => m.id === s.id) || s; // fallback to session user
      const assignedCount = reports.filter(r => r.assigned_officer_id === s.id).length;
      return { ...canonical, since: s.since, assignedCount } as User & { since: string; assignedCount: number };
    });
    return merged
      .filter(u => (u.role === 'Field Officer' || u.role === 'Department Admin'))
      .filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department.toLowerCase().includes(q));
  }, [activeSessions, reports, query]);

  const roleBadge = (role: string) => {
    switch (role) {
      case 'Department Admin': return 'bg-info text-foreground';
      case 'Field Officer': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const totals = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'Pending').length,
    inProgress: reports.filter(r => r.status === 'In Progress').length,
    resolved: reports.filter(r => r.status === 'Resolved').length,
    urgent: reports.filter(r => r.priority === 'Urgent').length,
  };

  const handleTileClick = (key: keyof typeof totals) => {
    if (!onNavigateToReportsFiltered) return;
    const map: Record<keyof typeof totals, 'all' | 'Pending' | 'In Progress' | 'Resolved' | 'Urgent'> = {
      total: 'all',
      pending: 'Pending',
      inProgress: 'In Progress',
      resolved: 'Resolved',
      urgent: 'Urgent',
    };
    onNavigateToReportsFiltered(map[key]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              className="text-left p-3 rounded-lg border hover:bg-accent transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => handleTileClick('total')}
            >
              <div className="text-xs text-muted-foreground">Total Reports</div>
              <div className="text-2xl font-bold">{totals.total}</div>
            </button>
            <button
              className="text-left p-3 rounded-lg border hover:bg-accent transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => handleTileClick('pending')}
            >
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="text-2xl font-bold">{totals.pending}</div>
            </button>
            <button
              className="text-left p-3 rounded-lg border hover:bg-accent transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => handleTileClick('inProgress')}
            >
              <div className="text-xs text-muted-foreground">In Progress</div>
              <div className="text-2xl font-bold">{totals.inProgress}</div>
            </button>
            <button
              className="text-left p-3 rounded-lg border hover:bg-accent transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => handleTileClick('resolved')}
            >
              <div className="text-xs text-muted-foreground">Resolved</div>
              <div className="text-2xl font-bold">{totals.resolved}</div>
            </button>
            <button
              className="text-left p-3 rounded-lg border hover:bg-accent transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => handleTileClick('urgent')}
            >
              <div className="text-xs text-muted-foreground">Urgent</div>
              <div className="text-2xl font-bold">{totals.urgent}</div>
            </button>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <h2 className="text-xl font-semibold">Officers</h2>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search officers..." className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Logged-in Officers and Admins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loggedInOfficers.map((u) => (
              <div key={u.id} className="p-4 border rounded-lg bg-card text-card-foreground">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-semibold">{u.name}</div>
                    <div className="text-xs text-muted-foreground break-all">{u.email}</div>
                  </div>
                  <Badge className={roleBadge(u.role)}>{u.role}</Badge>
                </div>
                <div className="mt-3 text-sm">
                  <div className="text-muted-foreground">Department</div>
                  <div className="font-medium">{u.department}</div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">Online since {new Date((u as any).since).toLocaleString()}</div>
                <div className="mt-3 text-sm">
                  <div className="text-muted-foreground">Assigned Reports</div>
                  <div className="font-medium">{u.assignedCount}</div>
                </div>
              </div>
            ))}
          </div>
          {loggedInOfficers.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">No logged-in officers currently</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
