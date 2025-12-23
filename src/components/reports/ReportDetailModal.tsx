import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/contexts/ReportsContext';
import { Report } from '@/lib/types';
import { mockDepartments, mockUsers, formatDate, timeAgo } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Tag, 
  Sparkles, 
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  FileText,
  X,
  Trash2
} from 'lucide-react';

interface ReportDetailModalProps {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDetailModal({ report, open, onOpenChange }: ReportDetailModalProps) {
  const { user } = useAuth();
  const { updateReportStatus, addProgressNote, updateAssignment, deleteReport } = useReports();
  const { toast } = useToast();
  
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [notifyCitizen, setNotifyCitizen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!report) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-warning-light text-warning border-warning/30';
      case 'In Progress': return 'bg-info-light text-info border-info/30';
      case 'Resolved': return 'bg-success-light text-success border-success/30';
      case 'Rejected': return 'bg-destructive-light text-destructive border-destructive/30';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleDelete = () => {
    if (!report) return;
    deleteReport(report.report_id);
    toast({ title: 'Report Deleted', description: `${report.report_id} has been removed` });
    setShowDeleteDialog(false);
    onOpenChange(false);
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

  const handleMarkInProgress = () => {
    updateReportStatus(report.report_id, 'In Progress', user?.name || 'Unknown');
    toast({ title: "Status Updated", description: "Report marked as In Progress" });
    onOpenChange(false);
  };

  const handleMarkResolved = () => {
    updateReportStatus(report.report_id, 'Resolved', user?.name || 'Unknown');
    toast({ title: "Status Updated", description: "Report marked as Resolved" });
    onOpenChange(false);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    updateReportStatus(report.report_id, 'Rejected', user?.name || 'Unknown', rejectionReason);
    toast({ title: "Status Updated", description: "Report marked as Rejected" });
    setShowRejectionDialog(false);
    setRejectionReason('');
    onOpenChange(false);
  };

  const handleAddProgress = () => {
    if (!progressNote.trim()) {
      toast({ title: "Error", description: "Please enter a progress note", variant: "destructive" });
      return;
    }
    addProgressNote(report.report_id, progressNote, user?.name || 'Unknown');
    toast({ title: "Note Added", description: "Progress note added successfully" });
    setShowProgressDialog(false);
    setProgressNote('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="report-detail-description">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <DialogTitle className="font-mono text-xl">{report.report_id}</DialogTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className={getStatusColor(report.status)}>
                {report.status}
              </Badge>
              <Badge className={getPriorityColor(report.priority)}>
                {report.priority}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <p id="report-detail-description" className="sr-only">
          Detailed view of report {report.report_id}
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-4">
          {/* Left Column - Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Submitted:</span>
                <span>{formatDate(report.submitted_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{report.location_text}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Reporter:</span>
                <span>{report.reporter.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{report.reporter.phone || 'Anonymous'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary">{report.category}</Badge>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{report.description}</p>
            </div>

            {/* AI Summary */}
            <div className="bg-primary-light rounded-lg p-4 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">AI Summary</span>
              </div>
              <p className="text-sm">{report.summary}</p>
            </div>

            {/* Media */}
            <div>
              <h4 className="font-semibold mb-2">Media</h4>
              {report.media.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {report.media.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Report media ${idx + 1}`}
                      className="w-32 h-24 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No media uploaded</p>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h4 className="font-semibold mb-3">Timeline</h4>
              <div className="space-y-3">
                {report.timeline.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.actor}</p>
                      <p className="text-sm text-muted-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(item.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Assignment */}
            <div className="space-y-3">
              <h4 className="font-semibold">Assignment</h4>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select defaultValue={report.assigned_department || 'unassigned'} onValueChange={(val) => {
                  const dep = val === 'unassigned' ? 'Administration' : val;
                  updateAssignment(report.report_id, { department: dep, actor: user?.name || 'System' });
                  toast({ title: 'Assignment Updated', description: `Department set to ${dep}` });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {mockDepartments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Officer</Label>
                <Select defaultValue={report.assigned_officer_id || 'unassigned'} onValueChange={(val) => {
                  if (val === 'unassigned') {
                    updateAssignment(report.report_id, { officerId: null, officerName: null, actor: user?.name || 'System' });
                    toast({ title: 'Assignment Updated', description: 'Officer set to Unassigned' });
                  } else {
                    const officer = mockUsers.find(o => o.id === val);
                    updateAssignment(report.report_id, { officerId: val, officerName: officer?.name || 'Unassigned', actor: user?.name || 'System' });
                    toast({ title: 'Assignment Updated', description: `Officer set to ${officer?.name || val}` });
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {mockUsers.filter(u => u.role === 'Field Officer' || u.role === 'Department Admin').map(officer => (
                      <SelectItem key={officer.id} value={officer.id}>{officer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="font-semibold">Actions</h4>
              <Button 
                className="w-full justify-start" 
                onClick={handleMarkInProgress}
                disabled={report.status === 'In Progress'}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Mark In Progress
              </Button>
              <Button 
                className="w-full justify-start bg-success hover:bg-success/90" 
                onClick={handleMarkResolved}
                disabled={report.status === 'Resolved'}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Resolved
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowRejectionDialog(true)}
                disabled={report.status === 'Rejected'}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Mark Rejected
              </Button>
              <Button 
                variant="secondary" 
                className="w-full justify-start"
                onClick={() => setShowProgressDialog(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Add Progress Note
              </Button>
              {report.status === 'Resolved' && (
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Report
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox 
                id="notify" 
                checked={notifyCitizen}
                onCheckedChange={(checked) => setNotifyCitizen(checked as boolean)}
              />
              <Label htmlFor="notify" className="text-sm font-normal cursor-pointer">
                Send notification to citizen
              </Label>
            </div>
          </div>
        </div>

        {/* Rejection Dialog */}
        {showRejectionDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg p-6 max-w-md w-full animate-scale-in">
              <h3 className="font-semibold text-lg mb-4">Reject Report</h3>
              <p className="text-sm text-warning mb-4">⚠️ Are you sure you want to reject this report?</p>
              <div className="space-y-2 mb-4">
                <Label>Reason for Rejection (Required)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
              </div>
            </div>
          </div>
        )}

        {/* Progress Note Dialog */}
        {showProgressDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg p-6 max-w-md w-full animate-scale-in">
              <h3 className="font-semibold text-lg mb-4">Add Progress Note</h3>
              <div className="space-y-2 mb-4">
                <Label>Progress Note</Label>
                <Textarea
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="Describe the progress made..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowProgressDialog(false)}>Cancel</Button>
                <Button onClick={handleAddProgress}>Save Note</Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg p-6 max-w-md w-full animate-scale-in">
              <h3 className="font-semibold text-lg mb-4">Delete Report</h3>
              <p className="text-sm text-destructive mb-4">This action cannot be undone. Are you sure you want to delete this report?</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
