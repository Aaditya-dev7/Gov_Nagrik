import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, Shield, Clock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { loadEmailAlertSettings, saveEmailAlertSettings } from '@/lib/userSettings';

export function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const [emailEnabled, setEmailEnabled] = React.useState(() => loadEmailAlertSettings().enabled);
  const [toEmail, setToEmail] = React.useState(() => loadEmailAlertSettings().toEmail);
  const [alertHigh, setAlertHigh] = React.useState(() => loadEmailAlertSettings().high);
  const [alertUrgent, setAlertUrgent] = React.useState(() => loadEmailAlertSettings().urgent);

  const handleSave = () => {
    saveEmailAlertSettings({ enabled: emailEnabled, toEmail, high: alertHigh, urgent: alertUrgent });
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Notification Channels</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>In-app Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications within the portal</p>
              </div>
              <Switch defaultChecked disabled />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Email Alerts</Label>
                <p className="text-sm text-muted-foreground">Send emails to the address below</p>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={(v) => setEmailEnabled(!!v)} />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" placeholder="name@example.com" value={toEmail} onChange={(e) => setToEmail(e.target.value)} disabled={!emailEnabled} />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium text-sm">Notification Triggers</h4>
            
            <div className="flex items-center justify-between">
              <Label>New Assignment</Label>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label>Status Change</Label>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label>Priority Escalation</Label>
              <Switch defaultChecked />
            </div>

            <Separator />

            <h4 className="font-medium text-sm">Email Alert Triggers</h4>
            <div className="flex items-center justify-between">
              <Label>High priority reports</Label>
              <Switch checked={alertHigh} onCheckedChange={(v) => setAlertHigh(!!v)} disabled={!emailEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Urgent priority reports</Label>
              <Switch checked={alertUrgent} onCheckedChange={(v) => setAlertUrgent(!!v)} disabled={!emailEnabled} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Priority Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Auto-escalation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically escalate priority for unresolved reports
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="space-y-2">
            <Label>Days before escalation</Label>
            <Input type="number" defaultValue={3} min={1} max={30} className="w-32" />
            <p className="text-xs text-muted-foreground">
              Reports will be escalated if not addressed within this period
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Default Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Default Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Default Department Filter</Label>
            <Select defaultValue="all">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="roads">Roads</SelectItem>
                <SelectItem value="sanitation">Sanitation</SelectItem>
                <SelectItem value="water">Water Supply</SelectItem>
                <SelectItem value="lighting">Street Lighting</SelectItem>
                <SelectItem value="drainage">Drainage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select defaultValue="en">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                <SelectItem value="mr">मराठी (Marathi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Theme</Label>
            {mounted && (
              <Select value={theme || 'system'} onValueChange={(val) => setTheme(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
