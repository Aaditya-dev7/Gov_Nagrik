import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/contexts/ReportsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/data';
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
}

const statCards = [
  { id: 'total', label: 'Total Reports', icon: FileText, color: 'text-primary' },
  { id: 'pending', label: 'Pending', icon: Clock, color: 'text-warning' },
  { id: 'inProgress', label: 'In Progress', icon: RefreshCw, color: 'text-info' },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle2, color: 'text-success' },
  { id: 'urgent', label: 'Urgent', icon: AlertTriangle, color: 'text-destructive', highlight: true },
];

const filterChips = ['all', 'Pending', 'In Progress', 'Resolved', 'Urgent'];

export function DashboardPage({ filter, onFilterChange, onOpenReport, onViewAllAssigned }: DashboardPageProps) {
  const { user, isAdmin } = useAuth();
  const { reports, notifications } = useReports();

  // Calculate stats
  const base = isAdmin ? reports : reports.filter(r => r.assigned_officer_id === user?.id);
  const stats = {
    total: base.length,
    pending: base.filter(r => r.status === 'Pending').length,
    inProgress: base.filter(r => r.status === 'In Progress').length,
    resolved: base.filter(r => r.status === 'Resolved').length,
    urgent: base.filter(r => r.priority === 'Urgent').length,
  };

  // Get assigned reports for current user and apply dashboard filter
  const assignedReportsAll = reports.filter(r => r.assigned_officer_id === user?.id);
  const assignedReports = assignedReportsAll
    .filter(r => {
      if (filter === 'all') return true;
      if (filter === 'Urgent') return r.priority === 'Urgent';
      return r.status === filter;
    })
    .slice(0, 5);

  // Get recent alerts (unread notifications)
  const recentAlerts = notifications.filter(n => !n.read).slice(0, 5);

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const value = stats[stat.id as keyof typeof stats];
          
          return (
            <Card 
              key={stat.id}
              className={cn(
                "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                stat.highlight && "border-destructive/50 bg-destructive-light"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <Icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <p className="text-3xl font-bold mt-2">{value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
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
            {chip === 'all' ? 'All' : chip}
          </Button>
        ))}
      </div>

      {/* Dashboard Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Assigned to Me */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Assigned to Me</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary" onClick={onViewAllAssigned}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignedReports.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No reports assigned to you
              </p>
            ) : (
              assignedReports.map((report) => (
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
            <CardTitle className="text-lg">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No new alerts
              </p>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-warning-light border border-warning/20"
                >
                  <p className="text-sm mb-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(alert.timestamp)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
