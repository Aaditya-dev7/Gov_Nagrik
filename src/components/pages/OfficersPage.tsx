import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { mockUsers } from '@/lib/data';
import { useReports } from '@/contexts/ReportsContext';
import { User } from '@/lib/types';

export function OfficersPage() {
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

  return (
    <div className="space-y-6 animate-fade-in">
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
