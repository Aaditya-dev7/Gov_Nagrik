import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, BadgeCheck, Building2, Shield, LogOut, Award, Users, Star, Trophy, FilePlus, CheckCircle, Clock, XCircle, ExternalLink, Lock, RefreshCw, FileText, AlertTriangle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface UserBadge {
  id: string;
  name: string;
  nameMr?: string;
  nameHi?: string;
  description: string;
  icon: string;
  points: number;
  earned_at: string;
  earned?: boolean;
  progress?: number;
}

// Officer/Staff badges based on resolving issues
const officerBadgeDefinitions = [
  {
    id: 'first_resolve',
    name: 'First Resolve',
    nameMr: 'पहिले निराकरण',
    nameHi: 'पहला समाधान',
    description: 'Resolved your first report',
    icon: '🏅',
    condition: (stats: { resolved: number; pending: number; tasksCompleted: number }) => stats.resolved >= 1,
    progress: (stats: { resolved: number; pending: number; tasksCompleted: number }) => Math.min(stats.resolved / 1, 1),
  },
  {
    id: 'quick_responder',
    name: 'Quick Responder',
    nameMr: 'जलद प्रतिसाद',
    nameHi: 'त्वरित उत्तरदाता',
    description: 'Resolved 5 reports',
    icon: '⚡',
    condition: (stats: { resolved: number; pending: number; tasksCompleted: number }) => stats.resolved >= 5,
    progress: (stats: { resolved: number; pending: number; tasksCompleted: number }) => Math.min(stats.resolved / 5, 1),
  },
  {
    id: 'dept_champion',
    name: 'Department Champion',
    nameMr: 'विभाग चॅम्पियन',
    nameHi: 'विभाग चैंपियन',
    description: 'Resolved 10 reports in your department',
    icon: '🏆',
    condition: (stats: { resolved: number; pending: number; tasksCompleted: number }) => stats.resolved >= 10,
    progress: (stats: { resolved: number; pending: number; tasksCompleted: number }) => Math.min(stats.resolved / 10, 1),
  },
  {
    id: 'zero_pending',
    name: 'Clear Desk',
    nameMr: 'स्वच्छ डेस्क',
    nameHi: 'साफ मेज़',
    description: 'No pending reports in your department',
    icon: '✨',
    condition: (stats: { resolved: number; pending: number; tasksCompleted: number }) => stats.pending === 0 && stats.resolved > 0,
    progress: (stats: { resolved: number; pending: number; tasksCompleted: number }) => stats.pending === 0 ? 1 : 0,
  },
  {
    id: 'team_player',
    name: 'Team Player',
    nameMr: 'संघ खेळाडू',
    nameHi: 'टीम प्लेयर',
    description: 'Completed 5 assigned tasks',
    icon: '🤝',
    condition: (stats: { resolved: number; pending: number; tasksCompleted: number }) => stats.tasksCompleted >= 5,
    progress: (stats: { resolved: number; pending: number; tasksCompleted: number }) => Math.min(stats.tasksCompleted / 5, 1),
  },
];

// Component for Officer/Staff badges
function OfficerStaffBadges({ resolved, pending, tasksCompleted, isStaff }: { resolved: number; pending: number; tasksCompleted: number; isStaff: boolean }) {
  const stats = { resolved, pending, tasksCompleted };
  
  // For staff, use tasksCompleted for progress; for officers, use resolved
  const relevantBadges = isStaff 
    ? officerBadgeDefinitions.filter(b => b.id === 'team_player' || b.id === 'first_resolve' || b.id === 'quick_responder')
    : officerBadgeDefinitions.filter(b => b.id !== 'team_player');
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {relevantBadges.map((badge) => {
        const earned = badge.condition(stats);
        const progress = badge.progress(stats);
        
        return (
          <div 
            key={badge.id} 
            className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
              earned 
                ? 'bg-yellow-100/50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700' 
                : 'bg-muted/30 border-muted opacity-60'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 text-xl ${
              earned ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted'
            }`}>
              {earned ? badge.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="text-sm font-medium">{badge.name}</div>
            <div className="text-xs text-muted-foreground">{badge.nameHi}</div>
            <div className="text-xs text-muted-foreground mt-1">{badge.description}</div>
            {!earned && progress > 0 && (
              <div className="w-full mt-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all" 
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{Math.round(progress * 100)}%</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showNSSDialog, setShowNSSDialog] = useState(false);
  const [nssStatus, setNssStatus] = useState<string | null>(null);
  const [nssFormData, setNssFormData] = useState<any>(null); // Store full NSS registration data
  const [nssForm, setNssForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    college: '',
    nss_unit: '',
    department_preference: '',
  });
  const [workStats, setWorkStats] = useState({ resolved: 0, inProgress: 0, pending: 0, tasksCompleted: 0 });

  // Determine if user is gov employee (officer or staff)
  const isGovEmployee = user?.role === 'Field Officer' || user?.role === 'Staff';
  const isStaff = user?.role === 'Staff';

  useEffect(() => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    // Fetch user badges
    sb.from('user_badges')
      .select('earned_at, badges(id, name, description, icon, points)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((ub: any) => ({
            id: ub.badges?.id || '',
            name: ub.badges?.name || 'Badge',
            description: ub.badges?.description || '',
            icon: ub.badges?.icon || 'award',
            points: ub.badges?.points || 0,
            earned_at: ub.earned_at,
          }));
          setBadges(mapped);
          setTotalPoints(mapped.reduce((sum: number, b: UserBadge) => sum + b.points, 0));
        }
      });

    // Fetch NSS status (only for non-gov employees)
    if (!isGovEmployee) {
      sb.from('nss_registrations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setNssStatus(data.status);
            setNssFormData(data);
          }
        });
    }

    // Fetch work stats for gov employees
    if (isGovEmployee && user.department) {
      if (isStaff) {
        // Staff: count completed tasks
        sb.from('staff_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('staff_user_id', user.id)
          .eq('status', 'completed')
          .then(({ count }) => {
            setWorkStats(prev => ({ ...prev, tasksCompleted: count || 0 }));
          });
        sb.from('staff_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('staff_user_id', user.id)
          .in('status', ['assigned', 'in_progress'])
          .then(({ count }) => {
            setWorkStats(prev => ({ ...prev, inProgress: count || 0 }));
          });
      } else {
        // Officer: count resolved reports in department
        Promise.all([
          sb.from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_department', user.department)
            .eq('status', 'Resolved'),
          sb.from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_department', user.department)
            .eq('status', 'In Progress'),
          sb.from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_department', user.department)
            .eq('status', 'Pending'),
        ]).then(([resolved, inProgress, pending]) => {
          setWorkStats({
            resolved: resolved.count || 0,
            inProgress: inProgress.count || 0,
            pending: pending.count || 0,
            tasksCompleted: 0,
          });
        });
      }
    }
  }, [user, isGovEmployee, isStaff]);

  const handleNSSSubmit = async () => {
    const sb = getSupabase();
    if (!sb || !user) return;

    const { error } = await sb.from('nss_registrations').insert({
      user_id: user.id,
      full_name: nssForm.full_name || user.name,
      email: nssForm.email || user.email,
      phone: nssForm.phone,
      college: nssForm.college,
      nss_unit: nssForm.nss_unit,
      department_preference: nssForm.department_preference,
      status: 'pending',
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'NSS registration submitted for approval' });
      setNssStatus('pending');
      setShowNSSDialog(false);
    }
  };

  const getBadgeIcon = (icon: string) => {
    switch (icon) {
      case 'trophy': return <Trophy className="w-5 h-5" />;
      case 'star': return <Star className="w-5 h-5" />;
      case 'award': return <Award className="w-5 h-5" />;
      case 'file-plus': return <FilePlus className="w-5 h-5" />;
      case 'users': return <Users className="w-5 h-5" />;
      default: return <Award className="w-5 h-5" />;
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Not signed in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isGovEmployee ? 'Government Employee Profile' : 'Citizen Profile'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {user.name?.charAt(0) || 'G'}
            </div>
            <div>
              <div className="text-base font-semibold">{user.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" /> {user.role}
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-primary" /> {user.department}
              </div>
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="flex items-center gap-2 text-sm">
                <BadgeCheck className="w-4 h-4 text-success" /> {user.status}
              </div>
            </div>
            {!isGovEmployee && (
              <div className="space-y-0.5">
                <Label className="text-xs text-muted-foreground">Points</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-yellow-500" /> {totalPoints} pts
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work Stats Card - Only for Gov Employees */}
      {isGovEmployee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" /> Work Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {isStaff ? (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{workStats.inProgress}</div>
                    <div className="text-xs text-muted-foreground">Active Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{workStats.tasksCompleted}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{workStats.inProgress + workStats.tasksCompleted}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{workStats.resolved}</div>
                    <div className="text-xs text-muted-foreground">Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{workStats.inProgress}</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">{workStats.pending}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5" /> Badges & Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isGovEmployee ? (
            <OfficerStaffBadges 
              resolved={workStats.resolved} 
              pending={workStats.pending} 
              tasksCompleted={workStats.tasksCompleted}
              isStaff={isStaff}
            />
          ) : (
            <>
              {badges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No badges earned yet. Submit reports and help resolve issues to earn badges!</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {badges.map((badge) => (
                    <div key={badge.id} className="flex flex-col items-center p-3 rounded-lg border bg-muted/30 text-center">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mb-2">
                        {getBadgeIcon(badge.icon)}
                      </div>
                      <div className="text-sm font-medium">{badge.name}</div>
                      <div className="text-xs text-muted-foreground">{badge.points} pts</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* NSS Volunteer Registration - Only for Citizens */}
      {!isGovEmployee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" /> NSS Volunteer
            </CardTitle>
          </CardHeader>
          <CardContent>
          {nssStatus === 'approved' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">You are an approved NSS Volunteer!</span>
              </div>
              
              <div className="p-4 rounded-lg bg-success-light border border-success/30 space-y-3">
                <h4 className="font-semibold text-sm">Government Portal Access</h4>
                <p className="text-xs text-muted-foreground">Use the credentials below to access the Government Portal for your NSS duties.</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Portal Link:</span>
                    <a 
                      href="https://nagrik-portal.gov.in" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      nagrik-portal.gov.in
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Email:</span>
                    <span className="text-sm font-mono">{nssFormData?.email || user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Password:</span>
                    <span className="text-sm font-mono">{nssFormData?.phone || 'Use your registered phone'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Department:</span>
                    <span className="text-sm">{nssFormData?.department_preference || user?.department}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-2" 
                  onClick={() => window.open('https://nagrik-portal.gov.in', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Government Portal
                </Button>
              </div>
            </div>
          ) : nssStatus === 'pending' ? (
            <div className="flex items-center gap-2 text-yellow-600">
              <Clock className="w-5 h-5" />
              <span>Your NSS registration is pending approval</span>
            </div>
          ) : nssStatus === 'rejected' ? (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span>Your NSS registration was rejected</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Register as an NSS (National Service Scheme) volunteer to contribute to community service and earn special badges.
              </p>
              <Button onClick={() => setShowNSSDialog(true)}>
                Register as NSS Volunteer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* NSS Registration Dialog */}
      <Dialog open={showNSSDialog} onOpenChange={setShowNSSDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>NSS Volunteer Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={nssForm.full_name || user?.name || ''} 
                onChange={(e) => setNssForm({ ...nssForm, full_name: e.target.value })} 
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={nssForm.email || user?.email || ''} 
                onChange={(e) => setNssForm({ ...nssForm, email: e.target.value })} 
                placeholder="Your email"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={nssForm.phone} 
                onChange={(e) => setNssForm({ ...nssForm, phone: e.target.value })} 
                placeholder="Your phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>College/Institution</Label>
              <Input 
                value={nssForm.college} 
                onChange={(e) => setNssForm({ ...nssForm, college: e.target.value })} 
                placeholder="Your college name"
              />
            </div>
            <div className="space-y-2">
              <Label>NSS Unit</Label>
              <Input 
                value={nssForm.nss_unit} 
                onChange={(e) => setNssForm({ ...nssForm, nss_unit: e.target.value })} 
                placeholder="NSS unit number"
              />
            </div>
            <div className="space-y-2">
              <Label>Department Preference</Label>
              <Select value={nssForm.department_preference} onValueChange={(v) => setNssForm({ ...nssForm, department_preference: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Roads">Roads</SelectItem>
                  <SelectItem value="Sanitation">Sanitation</SelectItem>
                  <SelectItem value="Water Supply">Water Supply</SelectItem>
                  <SelectItem value="Street Lighting">Street Lighting</SelectItem>
                  <SelectItem value="Drainage">Drainage</SelectItem>
                  <SelectItem value="Parks">Parks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNSSDialog(false)}>Cancel</Button>
            <Button onClick={handleNSSSubmit}>Submit Registration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProfilePage;
