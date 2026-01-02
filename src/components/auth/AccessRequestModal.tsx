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
import emailjs from '@emailjs/browser';

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

    setIsSubmitting(true);
    const svc = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
    const pub = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
    const tmpl = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
    const canEmail = Boolean(svc && pub && tmpl);
    const toEmail = ADMIN_EMAILS[Math.floor(Math.random() * ADMIN_EMAILS.length)];
    const submitted_at = new Date().toISOString();

    const saveLocal = () => {
      try {
        const key = 'nagrikGPT_access_requests';
        const list = JSON.parse(localStorage.getItem(key) || '[]') as any[];
        list.push({ fullName, officialEmail, department, designation, employeeId: employeeId || 'N/A', purpose, role, submitted_at });
        localStorage.setItem(key, JSON.stringify(list));
      } catch {}
    };

    try {
      if (canEmail) {
        const templateParams = {
          to_email: toEmail,
          full_name: fullName,
          official_email: officialEmail,
          department,
          designation,
          employee_id: employeeId || 'N/A',
          purpose,
          role,
          submitted_at,
        } as Record<string, any>;

        await emailjs.send(svc as string, tmpl as string, templateParams, pub as string);

        const userTemplateId = (import.meta.env.VITE_EMAILJS_USER_TEMPLATE_ID as string) || (tmpl as string);
        const setPasswordLink = `${window.location.origin}/?set_password=1&email=${encodeURIComponent(officialEmail)}`;
        const userTemplateParams = {
          to_email: officialEmail,
          username: officialEmail,
          set_password_link: setPasswordLink,
          full_name: fullName,
          role,
        } as Record<string, any>;

        await emailjs.send(svc as string, userTemplateId, userTemplateParams, pub as string);

        saveLocal();

        toast({
          title: 'Request Submitted',
          description: `Your request has been sent to ${toEmail}. We've emailed your username and set-password link to ${officialEmail}.`,
        });
      } else {
        // Fallback when EmailJS is not configured in the environment (e.g., GitHub Pages build)
        saveLocal();
        toast({
          title: 'Request Submitted',
          description: 'Your access request has been recorded. Our team will contact you shortly.',
        });
      }

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
      toast({
        title: 'Request Saved',
        description: 'Email delivery failed, but your request has been recorded. We will review it shortly.',
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
                <SelectItem value="urban">Urban Development</SelectItem>
                <SelectItem value="public-works">Public Works</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
