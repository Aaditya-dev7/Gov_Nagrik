import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Users, CheckCircle, XCircle, Clock, Search, UserPlus } from 'lucide-react';

interface NSSRegistration {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  nss_unit: string;
  department_preference: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export function NSSRegistrationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<NSSRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; registration: NSSRegistration | null; reason: string }>({
    open: false,
    registration: null,
    reason: '',
  });

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    const sb = getSupabase();
    if (!sb) return;

    const { data, error } = await sb
      .from('nss_registrations')
      .select('*')
      .order('applied_at', { ascending: false });

    if (data) {
      setRegistrations(data as NSSRegistration[]);
    }
    setIsLoading(false);
  };

  const handleApprove = async (registration: NSSRegistration) => {
    const sb = getSupabase();
    if (!sb || !user) return;

    // Update registration status
    const { error: regError } = await sb
      .from('nss_registrations')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', registration.id);

    if (regError) {
      toast({ title: 'Error', description: regError.message, variant: 'destructive' });
      return;
    }

    // Update user profile to mark as NSS volunteer
    await sb
      .from('profiles')
      .update({
        is_nss_volunteer: true,
        nss_registration_status: 'approved',
        role: 'staff',
        department: registration.department_preference,
      })
      .eq('id', registration.user_id);

    // Award NSS badge
    const { data: badgeData } = await sb
      .from('badges')
      .select('id')
      .eq('name', 'NSS Volunteer')
      .single();

    if (badgeData) {
      await sb.from('user_badges').insert({
        user_id: registration.user_id,
        badge_id: badgeData.id,
      });
    }

    toast({ title: 'Success', description: 'NSS volunteer approved and added as staff' });
    fetchRegistrations();
  };

  const handleReject = async () => {
    const sb = getSupabase();
    if (!sb || !user || !rejectDialog.registration) return;

    const { error } = await sb
      .from('nss_registrations')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason: rejectDialog.reason,
      })
      .eq('id', rejectDialog.registration.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Update user profile
    await sb
      .from('profiles')
      .update({
        nss_registration_status: 'rejected',
      })
      .eq('id', rejectDialog.registration.user_id);

    toast({ title: 'Success', description: 'NSS registration rejected' });
    setRejectDialog({ open: false, registration: null, reason: '' });
    fetchRegistrations();
  };

  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch =
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.college.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive text-destructive-foreground"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <h2 className="text-xl font-semibold">NSS Volunteer Registrations</h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" /> Registrations ({filteredRegistrations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading registrations...</div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No registrations found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm">Name</th>
                    <th className="text-left p-3 font-medium text-sm">Email</th>
                    <th className="text-left p-3 font-medium text-sm">College</th>
                    <th className="text-left p-3 font-medium text-sm">Department</th>
                    <th className="text-left p-3 font-medium text-sm">Status</th>
                    <th className="text-left p-3 font-medium text-sm">Applied</th>
                    <th className="text-left p-3 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="font-medium">{reg.full_name}</div>
                        <div className="text-xs text-muted-foreground">{reg.phone}</div>
                      </td>
                      <td className="p-3 text-sm">{reg.email}</td>
                      <td className="p-3">
                        <div className="text-sm">{reg.college}</div>
                        <div className="text-xs text-muted-foreground">Unit: {reg.nss_unit}</div>
                      </td>
                      <td className="p-3 text-sm">{reg.department_preference}</td>
                      <td className="p-3">{getStatusBadge(reg.status)}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(reg.applied_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {reg.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(reg)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectDialog({ open: true, registration: reg, reason: '' })}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject NSS Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rejecting registration for <strong>{rejectDialog.registration?.full_name}</strong>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason</label>
              <Input
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                placeholder="Enter reason for rejection"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, registration: null, reason: '' })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NSSRegistrationsPage;
