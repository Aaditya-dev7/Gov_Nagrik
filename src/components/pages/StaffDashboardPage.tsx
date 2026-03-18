import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { checkProfanity, getProfanityErrorMessage } from '@/lib/profanity';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  ClipboardList, Upload, CheckCircle, Clock, MapPin, Calendar, 
  User, FileText, Image, Loader2
} from 'lucide-react';

interface StaffTask {
  id: string;
  report_id: string;
  staff_user_id: string;
  assigned_by_officer_id: string | null;
  status: 'assigned' | 'in_progress' | 'completed';
  assigned_at: string;
  completed_at?: string;
  notes?: string;
  documents?: { name: string; url: string; type: string }[];
  report?: {
    report_id: string;
    category: string;
    location_text: string;
    priority: string;
    status: string;
    description?: string;
  };
}

export function StaffDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [myTasks, setMyTasks] = useState<StaffTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadNotes, setUploadNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const department = user?.department || '';
  const officerName = user?.reports_to_officer_name || 'Not assigned';

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    const sb = getSupabase();
    if (!sb || !user) return;

    setIsLoading(true);
    try {
      // Staff can ONLY see tasks assigned to them personally
      const { data: tasksData } = await sb
        .from('staff_tasks')
        .select('*, report:report_id(*)')
        .eq('staff_user_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksData) {
        setMyTasks(tasksData as StaffTask[]);
      }
    } catch (err) {
      console.error('Error loading staff data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const completeTask = async (task: StaffTask) => {
    setSelectedTask(task);
    setIsUploadModalOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedTask) return;
    
    // Check for profanity in upload notes
    if (uploadNotes.trim()) {
      const profanityResult = checkProfanity(uploadNotes);
      if (profanityResult.hasProfanity) {
        const errorMsg = getProfanityErrorMessage(profanityResult);
        toast({ title: 'Inappropriate Language Detected', description: errorMsg || 'Please remove inappropriate words.', variant: 'destructive' });
        return;
      }
    }
    
    const sb = getSupabase();
    if (!sb || !user) return;

    setIsUploading(true);
    try {
      const uploadedDocs: { name: string; url: string; type: string }[] = [];

      // Upload files to storage
      for (const file of uploadFiles) {
        const fileName = `${user.id}/${selectedTask.report_id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadErr } = await sb
          .storage
          .from('task-documents')
          .upload(fileName, file);

        if (!uploadErr && uploadData) {
          const { data: urlData } = sb
            .storage
            .from('task-documents')
            .getPublicUrl(fileName);

          uploadedDocs.push({
            name: file.name,
            url: urlData?.publicUrl || '',
            type: file.type.startsWith('image') ? 'image' : 'document',
          });
        }
      }

      // Update task status with resolution details
      const completedAt = new Date().toISOString();
      const { error: updateErr } = await sb
        .from('staff_tasks')
        .update({
          status: 'completed',
          completed_at: completedAt,
          notes: uploadNotes,
          documents: uploadedDocs,
        })
        .eq('id', selectedTask.id);

      if (updateErr) throw updateErr;

      // Update report status to resolved with resolution details
      const reportUpdate: any = {
        status: 'Resolved',
        resolved_at: completedAt,
        resolved_by: user.id,
        resolution_note: uploadNotes,
        resolution_documents: uploadedDocs,
      };
      
      await sb
        .from('reports')
        .update(reportUpdate)
        .eq('report_id', selectedTask.report_id);

      // Add timeline entry for resolution
      await sb.from('report_timeline').insert({
        report_id: selectedTask.report_id,
        actor: `Staff: ${user.name}`,
        action: `Marked as Resolved - ${uploadNotes}`,
        at: completedAt,
      });

      // Create notification for supervising officer
      if (user.reports_to_officer_id) {
        await sb.from('notifications').insert({
          id: `notif-${Date.now()}-officer`,
          message: `Staff ${user.name} resolved report ${selectedTask.report_id}`,
          timestamp: completedAt,
          read: false,
          report_id: selectedTask.report_id,
          recipient_role: 'officer',
          recipient_user_id: user.reports_to_officer_id,
          type: 'resolution',
          actor: user.name,
        });
      }

      // Create notification for admin
      await sb.from('notifications').insert({
        id: `notif-${Date.now()}-admin`,
        message: `Report ${selectedTask.report_id} resolved by ${user.name} (Staff)`,
        timestamp: completedAt,
        read: false,
        report_id: selectedTask.report_id,
        recipient_role: 'admin',
        recipient_user_id: null,
        type: 'resolution',
        actor: user.name,
        meta: JSON.stringify({
          staff_id: user.id,
          staff_name: user.name,
          department: department,
          has_proof: uploadedDocs.length > 0,
          notes: uploadNotes,
        }),
      });

      toast({
        title: 'Task Completed',
        description: 'Documents uploaded and report marked as resolved.',
      });

      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setUploadNotes('');
      setSelectedTask(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Upload Failed',
        description: err.message || 'Failed to upload documents',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Badge variant="secondary">Assigned</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'High':
        return <Badge variant="default" className="bg-orange-500">High</Badge>;
      case 'Medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'Low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">Reports to: {officerName}</span>
        </div>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Department: {department}</span>
        </div>
      </div>

      {/* Stats - Match officer dashboard style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-2 text-blue-500">
              {myTasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length}
            </p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-2 text-green-500">
              {myTasks.filter(t => t.status === 'completed').length}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold mt-2">{myTasks.length}</p>
            <p className="text-sm text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* My Active Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          My Active Tasks
        </h2>
        {myTasks.filter(t => t.status !== 'completed').length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tasks assigned yet</p>
              <p className="text-xs text-muted-foreground mt-1">Your supervising officer will assign tasks to you.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myTasks.filter(t => t.status !== 'completed').map(task => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{task.report_id}</span>
                        {task.report?.category && (
                          <Badge variant="outline">{task.report.category}</Badge>
                        )}
                        {getPriorityBadge(task.report?.priority || '')}
                        {getStatusBadge(task.status)}
                      </div>
                      {task.report && (
                        <>
                          <p className="text-sm text-muted-foreground line-clamp-2">{task.report.description?.slice(0, 150)}...</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {task.report.location_text}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Assigned: {new Date(task.assigned_at).toLocaleDateString()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => completeTask(task)}>
                        View Details
                      </Button>
                      <Button size="sm" onClick={() => completeTask(task)}>
                        <Upload className="w-4 h-4 mr-1" />
                        Mark Complete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Completed Tasks
        </h2>
        {myTasks.filter(t => t.status === 'completed').length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No completed tasks yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myTasks.filter(t => t.status === 'completed').map(task => (
              <Card key={task.id} className="opacity-75">
                <CardContent className="py-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{task.report_id}</span>
                        {getStatusBadge(task.status)}
                      </div>
                      {task.notes && (
                        <p className="text-sm text-muted-foreground">{task.notes}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Completed: {new Date(task.completed_at || '').toLocaleDateString()}
                      </div>
                      {task.documents && task.documents.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {task.documents.map((doc, i) => (
                            <a 
                              key={i} 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              {doc.type === 'image' ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                              {doc.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Upload proof of work (images/documents) and add notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Files</Label>
              <Input 
                type="file" 
                multiple 
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setUploadFiles(files);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Accepted: Images, PDF, Word documents
              </p>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Describe the work completed..."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
