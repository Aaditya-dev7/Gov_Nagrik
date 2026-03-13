import React, { useEffect, useState } from 'react';
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
import { getSupabase } from '@/lib/supabase';
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
  Trash2,
  ExternalLink,
  Upload,
  File,
  AlertTriangle,
  Timer
} from 'lucide-react';
import { correctDescription, analyzeImageDescription } from '@/lib/ai';
import { reverseGeocode, isCoordinateInIndia } from '@/lib/geocoding';
import { findMatchingCategory, getPriorityFromDescription } from '@/lib/summarizer';

interface ReportDetailModalProps {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDetailModal({ report, open, onOpenChange }: ReportDetailModalProps) {
  const { user, isAdmin } = useAuth();
  const { updateReportStatus, addProgressNote, updateAssignment, deleteReport } = useReports();
  const { toast } = useToast();
  
  // Error state for catching render errors
  const [renderError, setRenderError] = useState<Error | null>(null);
  
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [notifyCitizen, setNotifyCitizen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Document upload for resolution
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionDocument, setResolutionDocument] = useState<File | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [resolutionDocUrl, setResolutionDocUrl] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [corrected, setCorrected] = useState<string | null>(null);
  const [imgCheck, setImgCheck] = useState<{ ok: boolean; score?: number; reason?: string } | null>(null);
  const [revAddr, setRevAddr] = useState<string | null>(null);
  const [inIndia, setInIndia] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open || !report) return;
    let cancelled = false;
    setAiLoading(true);
    setRenderError(null); // Clear any previous errors
    (async () => {
      try {
        const [corr, img, rev] = await Promise.all([
          correctDescription(report.description).catch(() => ({ corrected: report.description, applied: false })),
          analyzeImageDescription(report.media || [], report.description).catch(() => ({ ok: true })),
          reverseGeocode(report.lat, report.lng).catch(() => null),
        ]);
        if (cancelled) return;
        setCorrected(corr.corrected || report.description);
        setImgCheck(img);
        setRevAddr(rev);
        setInIndia(isCoordinateInIndia(report.lat, report.lng));
      } catch (err) {
        console.error('AI analysis error:', err);
        // Don't set error, just use defaults
        setCorrected(report.description);
        setImgCheck({ ok: true });
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, report]);

  const copyCorrected = async () => {
    try { if (corrected) await navigator.clipboard.writeText(corrected); } catch {}
  };

  const tokenOverlap = (a?: string | null, b?: string | null) => {
    const tok = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 4);
    const A = new Set(tok(a));
    const B = new Set(tok(b));
    let overlap = 0; for (const t of A) if (B.has(t)) overlap++;
    return { overlap, aSize: A.size, bSize: B.size };
  };

  if (!report) return null;

  // STRICT LOGIC: Only assigned officer can act on the report
  // Admin can also act on any report (full access)
  const officerCanAct = Boolean(
    isAdmin || (user?.id && report.assigned_officer_id && report.assigned_officer_id === user.id)
  );
  
  // Admin can only assign, not act directly
  const adminCanAssign = isAdmin;
  
  // Check if report is assigned to current user (officer)
  const isAssignedToCurrentUser = report.assigned_officer_id === user?.id;

  const getDeadlineDays = (priority: string) => {
    switch (priority) {
      case 'Low': return 15;
      case 'Medium': return 10;
      case 'High': return 6;
      case 'Urgent': return 3;
      default: return 15;
    }
  };

  const submittedMs = new Date(report.submitted_at).getTime();
  const deadlineDays = getDeadlineDays(report.priority);
  const deadlineMs = submittedMs + deadlineDays * 24 * 60 * 60 * 1000;
  const isOverdueNow = !Number.isNaN(submittedMs) && Date.now() > deadlineMs && report.status !== 'Resolved' && report.status !== 'Rejected';
  const officerLockedByOverdue = false;

  const deadlineAt = (() => {
    if (report.deadline) {
      const ms = new Date(report.deadline).getTime();
      if (!Number.isNaN(ms)) return new Date(ms).toISOString();
    }
    if (!Number.isNaN(deadlineMs)) return new Date(deadlineMs).toISOString();
    return null;
  })();

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

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (PDF, Word, Image)
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({ title: 'Invalid File', description: 'Please upload PDF, Word document, or image file', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File Too Large', description: 'Maximum file size is 10MB', variant: 'destructive' });
        return;
      }
      setResolutionDocument(file);
    }
  };

  const uploadResolutionDocument = async (): Promise<string | null> => {
    if (!resolutionDocument) return null;
    const sb = getSupabase();
    if (!sb) return null;

    const withTimeout = async <T,>(p: Promise<T>, ms: number, label: string): Promise<T> => {
      let t: any;
      const timeout = new Promise<T>((_resolve, reject) => {
        t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
      });
      try {
        return await Promise.race([p, timeout]);
      } finally {
        try { clearTimeout(t); } catch {}
      }
    };
    
    const ext = resolutionDocument.name.split('.').pop() || 'bin';
    const path = `resolution-docs/${report.report_id}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    
    try {
      const { error } = await withTimeout(
        sb.storage.from('reports').upload(path, resolutionDocument, { cacheControl: '3600', upsert: true }),
        60_000,
        'Upload',
      );
      if (error) {
        console.error('Upload error:', error);
        return null;
      }
      const { data } = sb.storage.from('reports').getPublicUrl(path);
      return data?.publicUrl || null;
    } catch (err) {
      console.error('Upload exception:', err);
      return null;
    }
  };

  const handleMarkResolved = async () => {
    if (!resolutionDocument && !resolutionDocUrl) {
      toast({ title: 'Document Required', description: 'Please upload a resolution document (PDF, Word, or Image)', variant: 'destructive' });
      return;
    }
    if (!resolutionNote.trim()) {
      toast({ title: 'Note Required', description: 'Please provide a resolution note describing the work done', variant: 'destructive' });
      return;
    }
    
    setUploadingDoc(true);
    try {
      let docUrl = resolutionDocUrl;
      if (!docUrl && resolutionDocument) {
        docUrl = await uploadResolutionDocument();
        if (!docUrl) {
          toast({ title: 'Upload Failed', description: 'Failed to upload document. Please try again.', variant: 'destructive' });
          setUploadingDoc(false);
          return;
        }
        setResolutionDocUrl(docUrl);
      }
      
      // Determine document type
      const getDocType = (url: string): 'pdf' | 'image' | 'document' => {
        const lower = url.toLowerCase();
        if (lower.includes('.pdf')) return 'pdf';
        if (/\.(jpg|jpeg|png|gif|webp)$/.test(lower)) return 'image';
        return 'document';
      };
      
      // Create resolution document record
      const newDoc = {
        id: `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: resolutionDocument?.name || 'Resolution Document',
        url: docUrl,
        type: getDocType(docUrl),
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.name || 'Unknown',
      };
      
      // Get existing resolution documents or empty array
      const existingDocs = report.resolution_documents || [];
      const updatedDocs = [...existingDocs, newDoc];
      
      // Update Supabase with resolution documents and note
      const sb = getSupabase();
      if (sb) {
        // Update reports table with resolution_documents and resolution_note
        const updatePromise = sb
          .from('reports')
          .update({
            status: 'Resolved',
            resolution_documents: updatedDocs,
            resolution_note: resolutionNote,
          })
          .eq('id', report.report_id);

        const { error: updateError } = await Promise.race([
          updatePromise,
          new Promise<{ error: any }>((_resolve, reject) => setTimeout(() => reject(new Error('Save timed out')), 60_000)),
        ]);
        
        if (updateError) {
          console.error('Failed to update report with resolution documents:', updateError);
          toast({ title: 'Error', description: 'Failed to save resolution data', variant: 'destructive' });
          setUploadingDoc(false);
          return;
        }
        
        // Also insert into resolution_documents table if it exists
        try {
          await sb.from('resolution_documents').insert({
            report_id: report.report_id,
            name: newDoc.name,
            url: newDoc.url,
            type: newDoc.type,
            uploaded_at: newDoc.uploaded_at,
            uploaded_by: newDoc.uploaded_by,
          });
        } catch (e) {
          console.warn('Could not insert into resolution_documents table:', e);
        }
      }
      
      // Add progress note with document reference
      addProgressNote(report.report_id, `Resolution: ${resolutionNote}`, user?.name || 'Unknown');
      
      // Update local state
      updateReportStatus(report.report_id, 'Resolved', user?.name || 'Unknown');
      
      toast({ title: 'Report Resolved', description: 'Report has been marked as resolved with documentation' });
      setShowResolveDialog(false);
      setResolutionDocument(null);
      setResolutionNote('');
      setResolutionDocUrl(null);
      onOpenChange(false);
    } finally {
      setUploadingDoc(false);
    }
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
          {/* DEADLINE PROMINENT DISPLAY */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 mb-3 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">Deadline</span>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${isOverdueNow ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                  {deadlineAt ? formatDate(deadlineAt) : '—'}
                </div>
                {isOverdueNow && (
                  <Badge variant="outline" className="bg-destructive text-destructive-foreground animate-pulse">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    OVERDUE
                  </Badge>
                )}
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Priority: <span className="font-medium">{report.priority}</span> • SLA: <span className="font-medium">{deadlineDays} days</span>
            </div>
          </div>
          
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
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Deadline:</span>
                <span>{deadlineAt ? formatDate(deadlineAt) : '—'}</span>
                {isOverdueNow && (
                  <Badge variant="outline" className="bg-destructive-light text-destructive border-destructive/30">Overdue</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{report.location_text}</span>
                {report.lat && report.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${report.lat},${report.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Map
                  </a>
                )}
              </div>
              {/* HIDE REPORTER NAME - Only show anonymous status */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Reporter:</span>
                <span className="text-muted-foreground italic">Anonymous Citizen</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground italic">Contact details hidden</span>
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
              <p className="text-sm">{report.summary || 'No summary available'}</p>
              
              {/* Show detected category from summarizer.json */}
              {(() => {
                try {
                  const categoryMatch = findMatchingCategory(report.description);
                  if (categoryMatch && categoryMatch.score > 0) {
                    return (
                      <div className="mt-3 pt-3 border-t border-primary/20">
                        <div className="flex items-center gap-2 text-xs">
                          <Tag className="w-3 h-3" />
                          <span className="text-muted-foreground">Detected:</span>
                          <Badge variant="secondary" className="text-xs">{categoryMatch.category}</Badge>
                          <Badge variant="outline" className="text-xs">Priority: {getPriorityFromDescription(report.description)}</Badge>
                        </div>
                        {categoryMatch.keywords && categoryMatch.keywords.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Keywords: {categoryMatch.keywords.join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  }
                } catch (err) {
                  console.error('Category detection error:', err);
                }
                return null;
              })()}
            </div>

            <div className="rounded-lg p-4 border bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">AI Analysis</span>
              </div>
              {aiLoading ? (
                <p className="text-sm text-muted-foreground">Analyzing…</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="font-medium">Corrected Description</div>
                    <div className="mt-1 text-muted-foreground whitespace-pre-wrap">{corrected || report.description}</div>
                    {corrected && corrected !== report.description && (
                      <div className="mt-2">
                        <Button size="sm" onClick={copyCorrected}>Copy correction</Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">Image ↔ Description</div>
                    {imgCheck?.ok ? (
                      <Badge variant="secondary">Looks consistent{typeof imgCheck?.score === 'number' ? ` • score ${Math.round((imgCheck.score || 0) * 100)}%` : ''}</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive-light text-destructive border-destructive/30">Mismatch{imgCheck?.reason ? ` • ${imgCheck.reason}` : ''}</Badge>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">Location Verification</div>
                    <div className="mt-1 text-muted-foreground">
                      <div>India: {inIndia ? 'Yes' : 'No'}</div>
                      {revAddr && (
                        <div>Reverse geocoded: {revAddr}</div>
                      )}
                      {revAddr && report.location_text && (() => {
                        const o = tokenOverlap(report.location_text, revAddr);
                        const similar = o.aSize >= 3 ? o.overlap > 0 : true;
                        return <div>Matches entered location: {similar ? 'Likely' : 'Low similarity'}</div>;
                      })()}
                    </div>
                  </div>
                </div>
              )}
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
              {isAdmin ? (
                <>
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
                </>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label>Department</Label>
                    <div className="mt-1 text-sm p-2 rounded border bg-muted/30">{report.assigned_department || 'Administration'}</div>
                  </div>
                  <div>
                    <Label>Officer</Label>
                    <div className="mt-1 text-sm p-2 rounded border bg-muted/30">{report.assigned_officer_name || 'Unassigned'}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Assignment is locked for Officers.</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="font-semibold">Actions</h4>
              
              {/* STRICT LOGIC: Show warning if not assigned */}
              {!isAssignedToCurrentUser && !isAdmin && (
                <div className="rounded-lg border border-warning/30 bg-warning-light p-3 text-sm text-warning">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  You are not assigned to this report. Contact admin for assignment.
                </div>
              )}
              
              {isOverdueNow && (
                <div className="rounded-lg border border-destructive/30 bg-destructive-light p-3 text-sm text-destructive">
                  This report is overdue (SLA {deadlineDays} days). Please resolve immediately.
                </div>
              )}
              
              {/* Mark In Progress Button */}
              <Button 
                variant="outline" 
                className="w-full justify-start border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
                onClick={() => {
                  updateReportStatus(report.report_id, 'In Progress', user?.name || 'Unknown');
                  toast({ title: 'Status Updated', description: 'Report marked as In Progress' });
                }}
                disabled={!officerCanAct || report.status !== 'Pending'}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Mark In Progress
              </Button>
              
              {/* RESOLVE: Requires document upload */}
              <Button 
                className="w-full justify-start bg-success hover:bg-success/90" 
                onClick={() => setShowResolveDialog(true)}
                disabled={!officerCanAct || report.status === 'Resolved'}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Resolved
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowRejectionDialog(true)}
                disabled={!officerCanAct || report.status === 'Rejected'}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Mark Rejected
              </Button>
              
              <Button 
                variant="secondary" 
                className="w-full justify-start"
                onClick={() => setShowProgressDialog(true)}
                disabled={!officerCanAct}
              >
                <FileText className="w-4 h-4 mr-2" />
                Add Progress Note
              </Button>
              
              {isAdmin && report.status === 'Resolved' && (
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

        {/* Resolve Dialog with Document Upload */}
        {showResolveDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg p-6 max-w-lg w-full animate-scale-in">
              <h3 className="font-semibold text-lg mb-2">Mark Report as Resolved</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You must upload a document proving the work has been completed.
              </p>
              
              <div className="space-y-4">
                {/* Document Upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Resolution Document (Required)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: PDF, Word (.doc/.docx), Images (jpg, png, gif, webp). Max 10MB.
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleDocumentChange}
                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                  {resolutionDocument && (
                    <div className="flex items-center gap-2 p-2 bg-success-light rounded-lg text-sm text-success">
                      <File className="w-4 h-4" />
                      <span>{resolutionDocument.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(resolutionDocument.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Resolution Note */}
                <div className="space-y-2">
                  <Label>Resolution Note (Required)</Label>
                  <Textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Describe the work completed and how the issue was resolved..."
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 justify-end mt-6">
                <Button variant="outline" onClick={() => setShowResolveDialog(false)}>Cancel</Button>
                <Button 
                  className="bg-success hover:bg-success/90"
                  onClick={handleMarkResolved}
                  disabled={!resolutionDocument || !resolutionNote.trim() || uploadingDoc}
                >
                  {uploadingDoc ? 'Uploading...' : 'Confirm Resolution'}
                </Button>
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
