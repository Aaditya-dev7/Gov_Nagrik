import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface SetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export function SetPasswordModal({ open, onOpenChange, defaultEmail }: SetPasswordModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(defaultEmail || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEmail(defaultEmail || '');
  }, [defaultEmail, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      toast({ title: 'Email required', description: 'Please enter your email', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Weak password', description: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', description: 'Please re-enter your password', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      localStorage.setItem(`nagrikGPT_pw_${emailTrimmed}`, password);
      toast({ title: 'Password set', description: 'You can now sign in with your email and new password.' });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Your Password</DialogTitle>
          <DialogDescription>Enter your email and choose a new password to sign in.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="resetEmail">Email</Label>
            <Input id="resetEmail" type="email" placeholder="name@nagarpalika.gov.in" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" placeholder="Enter new password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" placeholder="Re-enter new password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Set Password'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
