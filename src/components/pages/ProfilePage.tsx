import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Mail, BadgeCheck, Building2, Shield, LogOut } from 'lucide-react';

export function ProfilePage() {
  const { user, logout } = useAuth();

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
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Government Officer Profile</CardTitle>
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
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export default ProfilePage;
