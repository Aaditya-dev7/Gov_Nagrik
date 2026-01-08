import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { mockDepartments } from '@/lib/data';
import { getSupabase } from '@/lib/supabase';

interface AccessRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ADMIN_EMAILS = [
  'aditya.kadam_siot23@comp.sce.edu.in',
  'manas.patil_siot23@comp.sce.edu.in',
  'nishant.jadhav_siot23@comp.sce.edu.in',
];

export function AccessRequestModal({ open, onOpenChange }: AccessRequestModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certified, setCertified] = useState(false);

  const [fullName, setFullName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [role, setRole] = useState<'admin' | 'officer'>('officer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !officialEmail || !department || !designation || !purpose || !certified) {
      toast({
        title: 'Missing information',
        description: 'Please complete all required fields and certify the information.',
        variant: 'destructive',
      });
      return;
    }

    const allowedDomains = ['nagarpalika.gov.in', 'gov.in'];
    const emailDomain = officialEmail.split('@')[1]?.toLowerCase() || '';
    if (!allowedDomains.some(d => emailDomain.endsWith(d))) {
      toast({
        title: 'Invalid official email',
        description: `Please use your official government email (e.g., name@${allowedDomains[0]})`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const toEmail = ADMIN_EMAILS[Math.floor(Math.random() * ADMIN_EMAILS.length)];
    const submitted_at = new Date().toISOString();
    const sb = getSupabase();

    const saveLocal = () => {
      try {
        const key = 'nagrikGPT_access_requests';
        const list = JSON.parse(localStorage.getItem(key) || '[]') as any[];
        list.push({ fullName, officialEmail, department, designation, employeeId: employeeId || 'N/A', purpose, role, submitted_at });
        localStorage.setItem(key, JSON.stringify(list));
      } catch {}
    };

    try {
      // Always persist locally
      saveLocal();
      // Insert into Supabase if configured
      if (sb) {
        try {
          await sb.from('access_requests').insert({
            full_name: fullName,
            official_email: officialEmail,
            department,
            designation,
            employee_id: employeeId || null,
            purpose,
            role,
            submitted_at,
          });
        } catch {}
        // Attempt to send emails via edge function (optional)
        try {
          const baseUrl = (import.meta as any).env?.BASE_URL || '/';
          const setPasswordLink = `${window.location.origin}${baseUrl}?set_password=1&email=${encodeURIComponent(officialEmail)}`;
          await sb.functions.invoke('send-access-request', {
            body: {
              admin_to_email: toEmail,
              user_to_email: officialEmail,
              full_name: fullName,
              official_email: officialEmail,
              department,
              designation,
              employee_id: employeeId || 'N/A',
              purpose,
              role,
              submitted_at,
              set_password_link: setPasswordLink,
            }
          });
        } catch {}
      }

      toast({
        title: 'Request Submitted',
        description: `Your request has been recorded${sb ? ' and sent for processing' : ''}.`,
      });

      setFullName('');
      setOfficialEmail('');
      setDepartment('');
      setDesignation('');
      setEmployeeId('');
      setPurpose('');
      setCertified(false);
      setRole('officer');
      onOpenChange(false);
    } catch (err) {
      // Email delivery failed – record locally to avoid data loss
      saveLocal();
      if (sb) {
        try {
          await sb.from('access_requests').insert({
            full_name: fullName,
            official_email: officialEmail,
            department,
            designation,
            employee_id: employeeId || null,
            purpose,
            role,
            submitted_at,
          });
        } catch {}
      }
      toast({
        title: 'Request Saved',
        description: 'Your request has been recorded. We will review it shortly.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Government Access</DialogTitle>
          <DialogDescription>
            Provide your details below. Your request will be verified with your department.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="officialEmail">Official Email</Label>
            <Input
              id="officialEmail"
              type="email"
              placeholder="your.name@nagarpalika.gov.in"
              required
              value={officialEmail}
              onChange={(e) => setOfficialEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'officer')}>
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="officer">Officer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Departments">All Departments</SelectItem>
                {mockDepartments.map((d) => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              placeholder="Your current designation"
              required
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID (if any)</Label>
            <Input
              id="employeeId"
              placeholder="Optional"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Access</Label>
            <Textarea
              id="purpose"
              placeholder="Explain why you need access to the portal"
              rows={3}
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox 
              id="certify" 
              checked={certified}
              onCheckedChange={(checked) => setCertified(checked as boolean)}
              required 
            />
            <Label htmlFor="certify" className="text-sm font-normal leading-relaxed cursor-pointer">
              I certify that I am a government employee and all information provided is accurate.
            </Label>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !certified}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
