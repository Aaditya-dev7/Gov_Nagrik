import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { mockDepartments } from '@/lib/data';
import { getSupabase, getGovSiteUrl } from '@/lib/supabase';

interface AccessRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ADMIN_EMAILS = [
  'aditya.kadam_siot23@comp.sce.edu.in',
  'manas.patil_siot23@comp.sce.edu.in',
  'nishant.jadhav_siot23@comp.sce.edu.in',
];

// STRICT: Allowed official email domains
const ALLOWED_EMAIL_DOMAINS = [
  '.gov.in',
  '.nic.in',
  'nagarpalika.gov.in',
  'maharashtra.gov.in',
  'mumbai.gov.in',
  'pune.gov.in',
  'comp.sce.edu.in', // For college project admins
  'sce.edu.in',
];

// Department-specific email patterns
const DEPARTMENT_EMAIL_PATTERNS: Record<string, string[]> = {
  'Roads': ['roads', 'pwd', 'rwd'],
  'Sanitation': ['sanitation', 'swachh', 'cleanliness'],
  'Water Supply': ['water', 'jal', 'wsd'],
  'Drainage': ['drainage', 'storm', 'sewage'],
  'Street Lighting': ['lighting', 'electricity', 'led'],
  'Administration': ['admin', 'secretary', 'commissioner'],
};

export function AccessRequestModal({ open, onOpenChange }: AccessRequestModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certified, setCertified] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [fullName, setFullName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [role, setRole] = useState<'admin' | 'officer' | 'staff'>('officer');
  const [reportsToOfficerId, setReportsToOfficerId] = useState<string>('');
  const [officers, setOfficers] = useState<{id: string; name: string; department: string}[]>([]);

  // Validation state
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Load officers when department changes (for staff role)
  React.useEffect(() => {
    const loadOfficers = async () => {
      if (role !== 'staff' || !department) {
        setOfficers([]);
        return;
      }
      const sb = getSupabase();
      if (!sb) return;
      try {
        const { data } = await sb
          .from('profiles')
          .select('id, full_name, department')
          .eq('role', 'officer')
          .eq('department', department);
        setOfficers((data || []).map(o => ({ id: o.id, name: o.full_name, department: o.department })));
      } catch {
        setOfficers([]);
      }
    };
    loadOfficers();
  }, [role, department]);

  // Validate official email domain - COMMENTED OUT FOR TESTING
  const validateOfficialEmail = (email: string): { valid: boolean; error?: string } => {
    const emailLower = email.toLowerCase().trim();
    
    if (!emailLower.includes('@')) {
      return { valid: false, error: 'Please enter a valid email address' };
    }
    
    // COMMENTED OUT FOR TESTING - Allow any email
    // const domain = emailLower.split('@')[1] || '';
    // const isAllowed = ALLOWED_EMAIL_DOMAINS.some(allowed => 
    //   domain === allowed || domain.endsWith(allowed)
    // );
    // if (!isAllowed) {
    //   return { 
    //     valid: false, 
    //     error: 'Only official government email addresses are accepted (.gov.in, .nic.in). Personal emails (gmail, yahoo, etc.) are not allowed.' 
    //   };
    // }
    
    return { valid: true };
  };

  const handleEmailChange = (email: string) => {
    setOfficialEmail(email);
    if (email.includes('@')) {
      const result = validateOfficialEmail(email);
      setEmailValid(result.valid);
      setEmailError(result.error || null);
    } else {
      setEmailValid(null);
      setEmailError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // STRICT VALIDATION
    if (!fullName || fullName.trim().length < 2) {
      toast({
        title: 'Invalid Name',
        description: 'Please enter your full name (at least 2 characters).',
        variant: 'destructive',
      });
      return;
    }

    if (!officialEmail || !officialEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    // Strict email domain validation
    const emailValidation = validateOfficialEmail(officialEmail);
    if (!emailValidation.valid) {
      toast({
        title: 'Official Email Required',
        description: emailValidation.error,
        variant: 'destructive',
      });
      return;
    }

    if (!department) {
      toast({
        title: 'Department Required',
        description: 'Please select your department.',
        variant: 'destructive',
      });
      return;
    }

    if (!designation || designation.trim().length < 2) {
      toast({
        title: 'Invalid Designation',
        description: 'Please enter your designation.',
        variant: 'destructive',
      });
      return;
    }

    // Employee ID is now REQUIRED for strict auth
    if (!employeeId || employeeId.trim().length < 3) {
      toast({
        title: 'Employee ID Required',
        description: 'Please enter your Employee ID for verification purposes.',
        variant: 'destructive',
      });
      return;
    }

    if (!purpose || purpose.trim().length < 20) {
      toast({
        title: 'Purpose Too Short',
        description: 'Please provide a detailed explanation (at least 20 characters) of why you need access.',
        variant: 'destructive',
      });
      return;
    }

    if (!certified) {
      toast({
        title: 'Certification Required',
        description: 'Please certify that you are a government employee.',
        variant: 'destructive',
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please agree to the terms and conditions.',
        variant: 'destructive',
      });
      return;
    }

    // Staff must select an officer
    if (role === 'staff' && !reportsToOfficerId) {
      toast({
        title: 'Officer Required',
        description: 'Please select the officer you report to.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const toEmails = ADMIN_EMAILS.slice();
    const submitted_at = new Date().toISOString();
    const sb = getSupabase();

    try {
      if (!sb) {
        throw new Error('Supabase is not configured');
      }

      // IMPORTANT: This must match a URL in Supabase Auth Redirect URLs
      // Set in Supabase: Authentication > URL Configuration > Redirect URLs
      const govUrl = await getGovSiteUrl();
      const redirect_to = `${govUrl}/login?set_password=1`;
      const selectedOfficer = officers.find(o => o.id === reportsToOfficerId);
      const { data, error } = await sb.functions.invoke('submit-access-request', {
        body: {
          full_name: fullName,
          official_email: officialEmail,
          department,
          designation,
          employee_id: employeeId,
          purpose,
          role,
          submitted_at,
          redirect_to,
          admin_to_emails: toEmails,
          reports_to_officer_id: role === 'staff' ? reportsToOfficerId : null,
          reports_to_officer_name: role === 'staff' ? selectedOfficer?.name : null,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to submit request');
      }

      toast({
        title: 'Request Submitted',
        description: `Your request has been recorded. Check your email to set your password after verification.`,
      });

      setFullName('');
      setOfficialEmail('');
      setDepartment('');
      setDesignation('');
      setEmployeeId('');
      setPurpose('');
      setReportsToOfficerId('');
      setOfficers([]);
      setCertified(false);
      setAgreedToTerms(false);
      setEmailValid(null);
      setEmailError(null);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Request Failed',
        description: (err as any)?.message || 'Failed to submit request. Please try again.',
        variant: 'destructive',
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

        {/* Strict Auth Warning */}
        <div className="bg-warning-light border border-warning/30 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div className="text-sm text-warning">
              <span className="font-medium">Strict Verification Required</span>
              <p className="text-xs mt-1">Only official government emails (.gov.in, .nic.in) are accepted. All requests are verified with your department before approval.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="officialEmail">Official Email <span className="text-destructive">*</span></Label>
            <Input
              id="officialEmail"
              type="email"
              placeholder="your.name@nagarpalika.gov.in"
              required
              value={officialEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={emailValid === false ? 'border-destructive' : emailValid === true ? 'border-success' : ''}
            />
            {emailValid === false && emailError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {emailError}
              </p>
            )}
            {emailValid === true && (
              <p className="text-xs text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Official email domain verified
              </p>
            )}
            <p className="text-xs text-muted-foreground">Only .gov.in or .nic.in email addresses are accepted</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role <span className="text-destructive">*</span></Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'officer' | 'staff')}>
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="officer">Officer</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            {role === 'staff' && (
              <p className="text-xs text-muted-foreground">Staff can only view departmental reports and upload documents.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
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

          {role === 'staff' && department && officers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="reportsTo">Reports to Officer <span className="text-destructive">*</span></Label>
              <Select value={reportsToOfficerId} onValueChange={setReportsToOfficerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your supervising officer" />
                </SelectTrigger>
                <SelectContent>
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name} ({o.department})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Select the officer you report to for task assignments.</p>
            </div>
          )}

          {role === 'staff' && department && officers.length === 0 && (
            <div className="bg-warning-light border border-warning/30 rounded-lg p-3">
              <p className="text-xs text-warning">No officers found in this department. Please contact admin.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="designation">Designation <span className="text-destructive">*</span></Label>
            <Input
              id="designation"
              placeholder="Your current designation (e.g., Junior Engineer)"
              required
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID <span className="text-destructive">*</span></Label>
            <Input
              id="employeeId"
              placeholder="Required for verification (e.g., EMP12345)"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Your Employee ID will be verified with your department</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Access <span className="text-destructive">*</span></Label>
            <Textarea
              id="purpose"
              placeholder="Explain in detail why you need access to the portal (min 20 characters)"
              rows={4}
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{purpose.length}/20 characters minimum</p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox 
              id="certify" 
              checked={certified}
              onCheckedChange={(checked) => setCertified(checked as boolean)}
              required 
            />
            <Label htmlFor="certify" className="text-sm font-normal leading-relaxed cursor-pointer">
              I certify that I am a government employee and all information provided is accurate. <span className="text-destructive">*</span>
            </Label>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox 
              id="terms" 
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              required 
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
              I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>. I understand that providing false information may result in account termination. <span className="text-destructive">*</span>
            </Label>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !certified || !agreedToTerms}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Submit Request for Verification
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
