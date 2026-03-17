import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useReports } from '@/contexts/ReportsContext';
import { User } from '@/lib/types';
import { getSupabase } from '@/lib/supabase';

interface OfficersPageProps {
  onNavigateToReportsFiltered?: (filter: 'all' | 'Pending' | 'In Progress' | 'Resolved' | 'Urgent') => void;
}

export function OfficersPage({ onNavigateToReportsFiltered }: OfficersPageProps) {
  const { reports } = useReports();
  const [query, setQuery] = React.useState('');
  const [officers, setOfficers] = useState<(User & { assignedCount: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch officers from database
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    
    async function fetchOfficers() {
      try {
        const { data, error } = await sb
          .from('profiles')
          .select('id, full_name, email, role, department')
          .in('role', ['Field Officer', 'Department Admin', 'officer', 'admin']);
        
        if (error) throw error;
        
        if (data) {
          const mapped = data.map((p: any) => ({
            id: p.id,
            name: p.full_name || 'Unknown',
            email: p.email || '',
            role: p.role === 'admin' ? 'Department Admin' : p.role === 'officer' ? 'Field Officer' : p.role,
            department: p.department || 'General',
            status: 'Active' as const,
            assignedCount: reports.filter(r => r.assigned_officer_id === p.id).length,
          }));
          setOfficers(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch officers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchOfficers();
  }, [reports]);

  const filteredOfficers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return officers.filter(u => 
      !q || 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) || 
      u.department.toLowerCase().includes(q)
    );
  }, [officers, query]);

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
          <CardTitle className="text-lg">Officers and Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading officers...</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOfficers.map((u) => (
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
                  <div className="mt-3 text-sm">
                    <div className="text-muted-foreground">Assigned Reports</div>
                    <div className="font-medium">{u.assignedCount}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && filteredOfficers.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">No officers found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
