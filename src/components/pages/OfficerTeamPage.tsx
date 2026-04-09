import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/contexts/ReportsContext';
import { getSupabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, ClipboardList, CheckCircle2, Clock, AlertTriangle, 
  User, Calendar, FileCheck, ExternalLink, TrendingUp, Image as ImageIcon
} from 'lucide-react';
import { timeAgo } from '@/lib/data';
import { useToast } from '@/components/ui/use-toast';

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
}

interface StaffTask {
  id: string;
  report_id: string;
  staff_user_id: string;
  status: 'requested' | 'assigned' | 'in_progress' | 'completed';
  assigned_at: string;
  completed_at?: string;
  notes?: string;
  documents?: { name: string; url: string; type: string }[];
  staff_name?: string;
  report?: {
    category: string;
    priority: string;
    status: string;
    submitted_at: string;
  };
}

// Get deadline days based on priority
const getDeadlineDays = (priority: string): number => {
  switch (priority) {
    case 'Low': return 15;
    case 'Medium': return 10;
    case 'High': return 7;
    case 'Urgent': return 3;
    default: return 10;
  }
};

export function OfficerTeamPage() {
  const { user } = useAuth();
  const { reports } = useReports();
  const { toast } = useToast();
  
  const [myStaff, setMyStaff] = useState<StaffMember[]>([]);
  const [staffTasks, setStaffTasks] = useState<StaffTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskForVerify, setSelectedTaskForVerify] = useState<StaffTask | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  
  const loadData = async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    
    setIsLoading(true);
    try {
      // DEBUG: Log current user info for context
      console.log('Officer details:', { id: user.id, department: user.department });

      // Load staff in this officer's department
      // Fetch all staff members (temporarily without dept filter to debug)
      const { data: staffData, error: staffError } = await sb
        .from('profiles')
        .select('id, full_name, email, department, created_at')
        .ilike('role', '%staff%');
        
      console.log('DEBUG: Fetched all staff:', staffData, 'Error:', staffError);
        
      if (staffError) {
        console.error('Error fetching staff members:', staffError);
        // We'll proceed with empty array if there's an error
      }
      
      const safeStaffData = staffData || [];
      setMyStaff(safeStaffData as StaffMember[]);
      
      // Load tasks for all staff members
      const staffIds = safeStaffData.map(s => s.id);
      if (staffIds.length > 0) {
          const { data: tasksData } = await sb
            .from('staff_tasks')
            .select(`
              id,
              report_id,
              staff_user_id,
              status,
              assigned_at,
              completed_at,
              notes,
              documents,
              report:report_id(category, priority, status, submitted_at)
            `)
            .in('staff_user_id', staffIds)
            .order('created_at', { ascending: false });
          
          if (tasksData) {
            // Add staff names to tasks
            const staffMap = new Map(staffData.map(s => [s.id, s.full_name]));
            const tasksWithNames = tasksData.map(t => ({
              ...t,
              staff_name: staffMap.get(t.staff_user_id) || 'Unknown',
            }));
            setStaffTasks(tasksWithNames as unknown as StaffTask[]);
          }
        }
    } catch (err) {
      console.error('Error loading officer team data:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate team stats
  const teamStats = {
    totalStaff: myStaff.length,
    totalTasks: staffTasks.length,
    completed: staffTasks.filter(t => t.status === 'completed').length,
    inProgress: staffTasks.filter(t => t.status === 'in_progress').length,
    pending: staffTasks.filter(t => t.status === 'assigned').length,
  };
  
  const completionRate = teamStats.totalTasks > 0 
    ? Math.round((teamStats.completed / teamStats.totalTasks) * 100) 
    : 0;

  const handleRequest = async (taskId: string, action: 'assigned' | 'declined') => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      if (action === 'declined') {
        // Just delete the request if declined
        await sb.from('staff_tasks').delete().eq('id', taskId);
        toast({ title: 'Request Declined', description: 'Task request was declined' });
      } else {
        await sb.from('staff_tasks').update({ status: 'assigned' }).eq('id', taskId);
        toast({ title: 'Task Assigned', description: 'Request accepted, task assigned to staff' });
      }
      loadData(); // refresh data
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message || 'An error occurred', variant: 'destructive' });
    }
  };

  const handleVerifyResolve = async () => {
    if (!selectedTaskForVerify) return;
    const task = selectedTaskForVerify;
    const sb = getSupabase();
    if (!sb || !user) return;
    
    try {
      // 1. Mark report as Resolved
      const { error: updateError } = await sb.from('reports').update({
        status: 'Resolved',
        resolved_at: task.completed_at || new Date().toISOString(),
        resolved_by: user.id,
        resolution_note: verifyNotes ? `Verified by Officer (${verifyNotes}). Staff notes: ${task.notes || ''}` : `Verified by Officer. Staff notes: ${task.notes || ''}`,
        resolution_documents: task.documents || [],
      }).eq('report_id', task.report_id);

      if (updateError) throw updateError;

      // 2. Add Timeline Entry
      const { error: timelineError } = await sb.from('report_timeline').insert({
        report_id: task.report_id,
        actor: `Officer: ${user.name}`,
        action: `Verified & Resolved - ${verifyNotes || 'No verification notes added'}`,
        at: new Date().toISOString()
      });

      if (timelineError) throw timelineError;

      toast({
        title: 'Report Resolved',
        description: `Successfully verified and resolved report ${task.report_id}`,
      });
      
      setSelectedTaskForVerify(null);
      setVerifyNotes('');
      loadData();
    } catch (err: unknown) {
      toast({ title: 'Error Resolving', description: (err as Error).message || 'An error occurred', variant: 'destructive' });
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
        return <Badge variant="outline">{priority}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Team</h1>
        <div className="text-sm text-muted-foreground">
          {myStaff.length} staff member{myStaff.length !== 1 ? 's' : ''} reporting to you
        </div>
      </div>
      
      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{teamStats.totalStaff}</div>
                <div className="text-xs text-muted-foreground">Staff</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-info" />
              <div>
                <div className="text-2xl font-bold">{teamStats.totalTasks}</div>
                <div className="text-xs text-muted-foreground">Total Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              <div>
                <div className="text-2xl font-bold">{teamStats.pending}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{teamStats.inProgress}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <div>
                <div className="text-2xl font-bold">{teamStats.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Completion Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Team Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={completionRate} className="flex-1" />
            <span className="text-lg font-bold">{completionRate}%</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Staff Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No staff members assigned to you yet
              </p>
            ) : (
              <div className="space-y-3">
                {myStaff.map((staff) => {
                  const staffTasksCount = staffTasks.filter(t => t.staff_user_id === staff.id).length;
                  const completedCount = staffTasks.filter(t => t.staff_user_id === staff.id && t.status === 'completed').length;
                  
                  return (
                    <div key={staff.id} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{staff.full_name}</div>
                            <div className="text-xs text-muted-foreground">{staff.email}</div>
                          </div>
                        </div>
                        <Badge variant="secondary">{staff.department}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Tasks: <span className="font-medium text-foreground">{staffTasksCount}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Completed: <span className="font-medium text-success">{completedCount}</span>
                        </span>
                      </div>
                      
                      {/* Task Requests */}
                      {staffTasks.filter(t => t.staff_user_id === staff.id && t.status === 'requested').length > 0 && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <p className="text-xs font-semibold text-warning flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending Requests
                          </p>
                          {staffTasks.filter(t => t.staff_user_id === staff.id && t.status === 'requested').map(reqTask => (
                            <div key={reqTask.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-muted/30 p-2 rounded gap-2 border border-warning/20">
                              <div className="text-xs">
                                <span className="font-mono font-bold">{reqTask.report_id}</span>
                                {reqTask.report?.category && <span className="ml-2 text-muted-foreground">{reqTask.report.category}</span>}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="default" className="text-xs h-7" onClick={() => handleRequest(reqTask.id, 'assigned')}>
                                  Accept & Assign
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleRequest(reqTask.id, 'declined')}>
                                  Decline
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Task Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Recent Task Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No task activity yet
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {staffTasks.slice(0, 10).map((task) => {
                  const report = task.report as Record<string, unknown> | undefined;
                  const hasDocs = task.documents && task.documents.length > 0;
                  
                  // Calculate deadline status
                  let deadlineStatus = null;
                  if (report?.submitted_at && report?.priority) {
                    const submittedMs = new Date(report.submitted_at as string).getTime();
                    const priorityStr = report.priority as string;
                    const deadlineDays = getDeadlineDays(priorityStr);
                    const deadlineMs = submittedMs + deadlineDays * 24 * 60 * 60 * 1000;
                    const now = Date.now();
                    
                    if (task.status === 'completed' && task.completed_at) {
                      const resolvedMs = new Date(task.completed_at).getTime();
                      deadlineStatus = resolvedMs <= deadlineMs ? 'on-time' : 'late';
                    } else if (now > deadlineMs) {
                      deadlineStatus = 'overdue';
                    }
                  }
                  
                  return (
                    <div key={task.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-mono text-sm text-primary">{task.report_id}</span>
                          <div className="text-xs text-muted-foreground mt-1">
                            by {task.staff_name}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground border px-1.5 py-0.5 rounded capitalize">
                            {task.status.replace('_', ' ')}
                          </span>
                          {report?.priority && getPriorityBadge(report.priority as string)}
                        </div>
                      </div>
                      
                      {/* Deadline & Proof indicators */}
                      <div className="flex items-center gap-4 text-xs mt-2">
                        {deadlineStatus && (
                          <div className={`flex items-center gap-1 ${
                            deadlineStatus === 'on-time' ? 'text-success' : 
                            deadlineStatus === 'late' ? 'text-warning' : 'text-destructive'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {deadlineStatus === 'on-time' ? 'On time' : 
                             deadlineStatus === 'late' ? 'Late' : 'Overdue'}
                          </div>
                        )}
                        
                        {hasDocs && (
                          <div className="flex items-center gap-1 text-success">
                            <FileCheck className="w-3 h-3" />
                            {task.documents!.length} doc(s)
                          </div>
                        )}
                      </div>
                      
                      {/* Resolution note for completed tasks */}
                      {task.status === 'completed' && task.notes && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          {task.notes}
                        </div>
                      )}
                      
                      {/* Proof documents */}
                      {hasDocs && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.documents!.slice(0, 2).map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs hover:bg-primary/20"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {doc.name}
                            </a>
                          ))}
                          {task.documents!.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{task.documents!.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-end mt-2">
                        <div className="text-xs text-muted-foreground">
                          {task.status === 'completed' 
                            ? `Completed ${timeAgo(task.completed_at)}`
                            : `Assigned ${timeAgo(task.assigned_at)}`
                          }
                        </div>
                        
                        {/* Final Resolution Button */}
                        {task.status === 'completed' && report?.status !== 'Resolved' && (
                          <Button size="sm" className="h-7 text-xs bg-blue-500 hover:bg-blue-600" onClick={() => setSelectedTaskForVerify(task)}>
                            <ClipboardList className="w-3 h-3 mr-1" />
                            Review & Verify
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verify Modal */}
      <Dialog open={!!selectedTaskForVerify} onOpenChange={(open) => !open && setSelectedTaskForVerify(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verify Task Details</DialogTitle>
            <DialogDescription>
              Review the work submitted by {selectedTaskForVerify?.staff_name}.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTaskForVerify && (
            <div className="space-y-4 my-2">
              <div className="bg-muted p-3 rounded-md">
                <div className="font-mono text-sm font-bold text-primary mb-1">
                  Report: {selectedTaskForVerify.report_id}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Category:</span> {selectedTaskForVerify.report?.category}
                </div>
                <div className="text-sm mt-1">
                  <span className="font-medium">Completed:</span> {selectedTaskForVerify.completed_at ? new Date(selectedTaskForVerify.completed_at).toLocaleString() : 'Unknown'}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Staff Notes</Label>
                <div className="p-3 bg-secondary/50 rounded-md mt-1 text-sm whitespace-pre-wrap">
                  {selectedTaskForVerify.notes || 'No notes provided by staff.'}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Documentation / Proof</Label>
                <div className="mt-2 space-y-2">
                  {!selectedTaskForVerify.documents || selectedTaskForVerify.documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedTaskForVerify.documents.map((doc, i) => (
                        doc.type === 'image' ? (
                          <a 
                            key={i} 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block border rounded-md overflow-hidden hover:opacity-90 transition-opacity"
                          >
                            <img src={doc.url} alt={doc.name} className="w-full h-32 object-cover" />
                            <div className="text-xs truncate p-1 text-center bg-muted/30">{doc.name}</div>
                          </a>
                        ) : (
                          <a 
                            key={i} 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center p-4 border rounded-md hover:bg-muted/50 transition-colors h-32"
                          >
                            <FileCheck className="w-8 h-8 text-orange-500 mb-2" />
                            <span className="text-xs truncate max-w-full text-center px-2">{doc.name}</span>
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t mt-4">
                <Label className="font-semibold text-sm">Add Verification Notes (Optional)</Label>
                <Textarea 
                  placeholder="E.g., Looks good, resolution confirmed."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="resize-none h-20"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedTaskForVerify(null)}>
              Cancel
            </Button>
            <Button className="bg-success hover:bg-success/90" onClick={handleVerifyResolve}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Verify & Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
