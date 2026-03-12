import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/contexts/ReportsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/data';
import { t, useLang } from '@/lib/i18n';
import { getSupabase } from '@/lib/supabase';
import { 
  FileText, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  MapPin,
  ExternalLink
} from 'lucide-react';

interface DashboardPageProps {
  filter: string;
  onFilterChange: (filter: string) => void;
  onOpenReport: (reportId: string) => void;
  onViewAllAssigned: () => void;
  onNavigateToReportsFiltered: (filter: 'all' | 'Pending' | 'In Progress' | 'Resolved' | 'Urgent') => void;
}

const statCards = [
  { id: 'total', label: 'dashboard.total_reports', icon: FileText, color: 'text-primary' },
  { id: 'pending', label: 'dashboard.pending', icon: Clock, color: 'text-warning' },
  { id: 'inProgress', label: 'dashboard.in_progress', icon: RefreshCw, color: 'text-info' },
  { id: 'resolved', label: 'dashboard.resolved', icon: CheckCircle2, color: 'text-success' },
  { id: 'urgent', label: 'dashboard.urgent', icon: AlertTriangle, color: 'text-destructive', highlight: true },
];

const filterChips = ['all', 'Pending', 'In Progress', 'Resolved', 'Urgent'];

export function DashboardPage({ filter, onFilterChange, onOpenReport, onViewAllAssigned, onNavigateToReportsFiltered }: DashboardPageProps) {
  const { user, isAdmin } = useAuth();
  const { reports, notifications, requestAssignment } = useReports();
  const _lang = useLang();
  
  // Database stats state
  const [dbStats, setDbStats] = useState<{ total: number; pending: number; inProgress: number; resolved: number; urgent: number } | null>(null);

  // Fetch stats from database
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    
    async function fetchStats() {
      try {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        // Get counts from database
        const [
          totalRes,
          pendingRes,
          inProgressRes,
          resolvedRecentRes,
          resolvedOldRes,
          urgentRes
        ] = await Promise.all([
          sb.from('reports').select('*', { count: 'exact', head: true }),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'In Progress'),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Resolved').gte('submitted_at', cutoff),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Resolved').lt('submitted_at', cutoff),
          sb.from('reports').select('*', { count: 'exact', head: true }).eq('priority', 'Urgent'),
        ]);
        
        const totalAll = totalRes.count || 0;
        const oldResolved = resolvedOldRes.count || 0;
        
        setDbStats({
          total: Math.max(0, totalAll - oldResolved), // Hide old resolved from total
          pending: pendingRes.count || 0,
          inProgress: inProgressRes.count || 0,
          resolved: resolvedRecentRes.count || 0,
          urgent: urgentRes.count || 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    
    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Use database stats if available, otherwise fall back to local
  const stats = dbStats || {
    total: reports.length,
    pending: reports.filter(r => r.status === 'Pending').length,
    inProgress: reports.filter(r => r.status === 'In Progress').length,
    resolved: reports.filter(r => r.status === 'Resolved').length,
    urgent: reports.filter(r => r.priority === 'Urgent').length,
  };

  const recentReports = reports
    .filter(r => {
      if (filter === 'all') return true;
      if (filter === 'Urgent') return r.priority === 'Urgent';
      return r.status === filter;
    })
    .slice(0, 5);

  // Get recent alerts (unread notifications)
  const recentAlerts = ((): typeof notifications => {
    const unread = notifications.filter(n => !n.read);
    const isGlobalAdmin = user?.role === 'Super Admin' || (user?.role === 'Department Admin' && user?.department === 'All Departments');
    if (isGlobalAdmin) return unread.slice(0, 5);
    return unread
      .filter(n => {
        const rep = reports.find(r => r.report_id === n.report_id);
        return rep && rep.assigned_department === user?.department;
      })
      .slice(0, 5);
  })();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-priority-high text-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const value = stats[stat.id as keyof typeof stats];
          
          return (
            <Card 
              key={stat.id}
              className={cn(
                "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary w-full",
                stat.highlight && "border-destructive/50 bg-destructive-light"
              )}
              onClick={() => {
                const map: Record<string, 'all' | 'Pending' | 'In Progress' | 'Resolved' | 'Urgent'> = {
                  total: 'all',
                  pending: 'Pending',
                  inProgress: 'In Progress',
                  resolved: 'Resolved',
                  urgent: 'Urgent',
                };
                onNavigateToReportsFiltered(map[stat.id as keyof typeof map]);
              }}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <Icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold mt-2 break-words">{value}</p>
                <p className="text-sm text-muted-foreground break-words">{t(stat.label, stat.label)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <Button
            key={chip}
            variant={filter === chip ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(chip)}
            className="transition-all duration-200"
          >
            {chip === 'all'
              ? t('dashboard.filter.all', 'All')
              : chip === 'Pending'
                ? t('dashboard.filter.pending', 'Pending')
                : chip === 'In Progress'
                  ? t('dashboard.filter.in_progress', 'In Progress')
                  : chip === 'Resolved'
                    ? t('dashboard.filter.resolved', 'Resolved')
                    : chip === 'Urgent'
                      ? t('dashboard.filter.urgent', 'Urgent')
                      : chip}
          </Button>
        ))}
      </div>

      {/* Dashboard Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Reports snapshot (Admin: Recent reports, Officer: Assigned to me) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{isAdmin ? t('dashboard.recent_reports', 'Recent Reports') : t('dashboard.assigned_to_me', 'Assigned to Me')}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={isAdmin ? () => onNavigateToReportsFiltered('all') : onViewAllAssigned}
              >
                {t('dashboard.view_all', 'View All')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {isAdmin ? t('dashboard.no_reports_yet', 'No reports yet') : t('dashboard.no_assigned_reports', 'No reports assigned to you')}
              </p>
            ) : (
              recentReports.map((report) => (
                <button
                  key={report.report_id}
                  onClick={() => onOpenReport(report.report_id)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-sm font-medium text-primary">
                      {report.report_id}
                    </span>
                    <Badge className={getPriorityColor(report.priority)}>
                      {report.priority}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">{report.category}</Badge>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {report.location_text}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {timeAgo(report.submitted_at)}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('dashboard.recent_alerts', 'Recent Alerts')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('dashboard.no_new_alerts', 'No new alerts')}
              </p>
            ) : (
              recentAlerts.map((alert) => {
                const rep = reports.find(r => r.report_id === alert.report_id);
                return (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg bg-warning-light border border-warning/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm mb-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(alert.timestamp)}</p>
                        {rep && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Dept: <span className="font-medium">{rep.assigned_department}</span>
                          </div>
                        )}
                      </div>
                      {user?.role !== 'Super Admin' && user?.role !== 'Department Admin' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => requestAssignment(alert.report_id, user?.name || 'Officer')}
                        >
                          Request assignment
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
