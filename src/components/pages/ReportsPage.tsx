import React, { useState, useMemo } from 'react';
import { useReports } from '@/contexts/ReportsContext';
import { Report } from '@/lib/types';
import { categories, formatDate, timeAgo } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  LayoutGrid, 
  List, 
  Search, 
  Filter, 
  MapPin, 
  Calendar,
  MoreVertical,
  X
} from 'lucide-react';

interface ReportsPageProps {
  searchQuery: string;
  onOpenReport: (reportId: string) => void;
  assignedOnlyUserId?: string | null;
}

export function ReportsPage({ searchQuery, onOpenReport, assignedOnlyUserId }: ReportsPageProps) {
  const { reports } = useReports();
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  const [sortBy, setSortBy] = useState('newest');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const filteredReports = useMemo(() => {
    let result = assignedOnlyUserId ? reports.filter(r => r.assigned_officer_id === assignedOnlyUserId) : [...reports];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.report_id.toLowerCase().includes(query) ||
        r.location_text.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilters.length > 0) {
      result = result.filter(r => statusFilters.includes(r.status));
    }

    // Priority filter
    if (priorityFilters.length > 0) {
      result = result.filter(r => priorityFilters.includes(r.priority));
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter(r => r.category === categoryFilter);
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    } else if (sortBy === 'priority') {
      const priorityOrder = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      result.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    }

    return result;
  }, [reports, searchQuery, statusFilters, priorityFilters, categoryFilter, sortBy, assignedOnlyUserId]);

  const clearFilters = () => {
    setStatusFilters([]);
    setPriorityFilters([]);
    setCategoryFilter('');
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilters(prev =>
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-warning-light text-warning border-warning/30';
      case 'In Progress': return 'bg-info-light text-info border-info/30';
      case 'Resolved': return 'bg-success-light text-success border-success/30';
      case 'Rejected': return 'bg-destructive-light text-destructive border-destructive/30';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-priority-high text-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const hasActiveFilters = statusFilters.length > 0 || priorityFilters.length > 0 || categoryFilter;

  return (
    <div className="flex gap-6 animate-fade-in w-full max-w-full overflow-x-hidden pb-24 sm:pb-8">
      {/* Filters Panel */}
      <aside className="hidden lg:block w-64 shrink-0">
        <Card className="sticky top-24">
          <CardContent className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Status */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Status</Label>
              {['Pending', 'In Progress', 'Resolved', 'Rejected'].map(status => (
                <div key={status} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={statusFilters.includes(status)}
                    onCheckedChange={() => toggleStatusFilter(status)}
                  />
                  <Label htmlFor={`status-${status}`} className="text-sm font-normal cursor-pointer">
                    {status}
                  </Label>
                </div>
              ))}
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Priority</Label>
              {['Low', 'Medium', 'High', 'Urgent'].map(priority => (
                <div key={priority} className="flex items-center gap-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={priorityFilters.includes(priority)}
                    onCheckedChange={() => togglePriorityFilter(priority)}
                  />
                  <Label htmlFor={`priority-${priority}`} className="text-sm font-normal cursor-pointer">
                    {priority}
                  </Label>
                </div>
              ))}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={categoryFilter || "all"} onValueChange={(val) => setCategoryFilter(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="grid grid-cols-2 sm:inline-flex gap-2 w-full sm:w-auto">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="w-4 h-4 mr-1" />
              Table
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Cards
            </Button>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="priority">High Priority First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground">
          Showing {filteredReports.length} of {reports.length} reports
        </p>

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="font-semibold mb-2">No reports found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters or search criteria
              </p>
            </CardContent>
          </Card>
        )}

        {/* Table View */}
        {viewMode === 'table' && filteredReports.length > 0 && (
          <Card>
            <div className="overflow-x-auto w-full">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm">Report ID</th>
                    <th className="text-left p-3 font-medium text-sm">Date</th>
                    <th className="text-left p-3 font-medium text-sm">Location</th>
                    <th className="text-left p-3 font-medium text-sm">Category</th>
                    <th className="text-left p-3 font-medium text-sm">Priority</th>
                    <th className="text-left p-3 font-medium text-sm">Status</th>
                    <th className="text-left p-3 font-medium text-sm">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr
                      key={report.report_id}
                      onClick={() => onOpenReport(report.report_id)}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono text-sm font-medium text-primary break-all">
                        {report.report_id}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(report.submitted_at).split(',')[0]}
                      </td>
                      <td className="p-3 text-sm break-words">{report.location_text}</td>
                      <td className="p-3">
                        <Badge variant="secondary">{report.category}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={getPriorityColor(report.priority)}>
                          {report.priority}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">{report.assigned_officer_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Card View */}
        {viewMode === 'card' && filteredReports.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <Card
                key={report.report_id}
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                onClick={() => onOpenReport(report.report_id)}
              >
                {report.media.length > 0 ? (
                  <img
                    src={report.media[0]}
                    alt="Report"
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-muted flex items-center justify-center text-4xl">
                    📷
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-sm font-medium text-primary">
                      {report.report_id}
                    </span>
                    <Badge variant="outline" className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{report.category}</Badge>
                    <Badge className={getPriorityColor(report.priority)}>
                      {report.priority}
                    </Badge>
                  </div>
                  <p className="text-sm flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {report.location_text}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(report.submitted_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
