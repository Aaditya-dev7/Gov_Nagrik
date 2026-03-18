import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { categories } from '@/lib/data';
import { classify, buildLocationLine, guidanceSteps, complaintSubject, complaintBody, rtiBody, followUpEmail, escalationEmail, IssueDetails } from '@/lib/civic_client';
import { geocodeAddress } from '@/lib/geocoding';
import { useReports } from '@/contexts/ReportsContext';
import { getSupabase, isSupabaseEnabled } from '@/lib/supabase';
import { checkProfanity, getProfanityErrorMessage } from '@/lib/profanity';

export function CitizenApp() {
  const { addReport } = useReports();
  const { toast } = useToast();
  const [issueType, setIssueType] = React.useState('');
  const [sinceWhen, setSinceWhen] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [city, setCity] = React.useState('');
  const [area, setArea] = React.useState('');
  const [landmark, setLandmark] = React.useState('');
  const [ward, setWard] = React.useState('');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [anonymous, setAnonymous] = React.useState(false);
  const [priority, setPriority] = React.useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [prevPlatform, setPrevPlatform] = React.useState('');
  const [prevId, setPrevId] = React.useState('');
  const [prevDate, setPrevDate] = React.useState('');

  const details: IssueDetails = React.useMemo(() => ({
    city: city || undefined,
    area: area || undefined,
    landmark: landmark || undefined,
    ward: ward || undefined,
    issueType: issueType || 'Civic Issue',
    sinceWhen: sinceWhen || undefined,
    description: description || '',
    previousComplaint: prevPlatform || prevId || prevDate ? { platform: prevPlatform || undefined, id: prevId || undefined, date: prevDate || undefined } : null,
    evidence: undefined,
    name: anonymous ? undefined : (name || undefined),
    email: anonymous ? undefined : (email || undefined),
    phone: anonymous ? undefined : (phone || undefined),
    anonymous,
  }), [city, area, landmark, ward, issueType, sinceWhen, description, prevPlatform, prevId, prevDate, name, email, phone, anonymous]);

  const cls = React.useMemo(() => classify(details), [details]);
  const locLine = React.useMemo(() => buildLocationLine(details), [details]);
  const steps = React.useMemo(() => guidanceSteps(details, cls), [details, cls]);
  const subject = React.useMemo(() => complaintSubject(details), [details]);
  const body = React.useMemo(() => complaintBody(details, cls), [details, cls]);
  const rti = React.useMemo(() => rtiBody(details, cls, details.previousComplaint?.id || undefined), [details, cls]);
  const followUp = React.useMemo(() => followUpEmail(details, details.previousComplaint?.id || '[Complaint ID]'), [details]);
  const escalate = React.useMemo(() => escalationEmail(details, details.previousComplaint?.id || '[Complaint ID]'), [details]);

  const catOptions = React.useMemo(() => categories, []);
  const chosenCategory = React.useMemo(() => {
    const match = catOptions.find(c => c.toLowerCase() === issueType.toLowerCase());
    return match || issueType || 'Other';
  }, [catOptions, issueType]);

  const [submitting, setSubmitting] = React.useState(false);
  const [aiValidating, setAiValidating] = React.useState(false);
  const [aiOk, setAiOk] = React.useState(true);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const imageUrl = React.useMemo(() => {
    // citizen-side currently doesn't support upload; future: pass Supabase public URL
    return '';
  }, []);

  const validateTextWithAi = React.useCallback(async (inputText: string) => {
    const text = String(inputText || '').trim();
    if (!text) {
      setAiOk(false);
      setAiError('Description required');
      return { ok: false, error: 'Description required' } as const;
    }
    if (!isSupabaseEnabled()) {
      setAiOk(true);
      setAiError(null);
      return { ok: true } as const;
    }
    const sb = getSupabase();
    if (!sb) {
      setAiOk(true);
      setAiError(null);
      return { ok: true } as const;
    }
    setAiValidating(true);
    try {
      const res = await sb.functions.invoke('summarize', { body: { text, image_url: imageUrl } });
      const data = (res as any)?.data as any;
      const ok = Boolean(data?.ok);
      const error = typeof data?.error === 'string' ? data.error : null;
      const status = typeof data?.status === 'string' ? data.status : null;
      const score = typeof data?.report_score === 'number' ? data.report_score : null;
      const scoreOk = typeof score === 'number' ? score >= 90 : true;
      const accepted = ok && (!status || status === 'accepted') && scoreOk;
      if (!accepted) {
        const msg = error || (!scoreOk ? 'Report score must be 90+ to submit.' : (status === 'flagged' ? 'Report flagged as suspicious. Please add more details.' : 'Invalid complaint text.'));
        setAiOk(false);
        setAiError(msg);
        return { ok: false, error: msg } as const;
      }
      setAiOk(true);
      setAiError(null);
      return { ok: true } as const;
    } catch {
      setAiOk(true);
      setAiError(null);
      return { ok: true } as const;
    } finally {
      setAiValidating(false);
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      if (!alive) return;
      validateTextWithAi(description);
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [description, validateTextWithAi]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Text copied to clipboard.' });
    } catch {}
  };

  const handleSubmitReport = async () => {
    if (!locLine) {
      toast({ title: 'Location required', description: 'Please enter city/area/landmark.', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Description required', description: 'Please describe the issue.', variant: 'destructive' });
      return;
    }
    
    // Check for profanity in description
    const profanityResult = checkProfanity(description);
    if (profanityResult.hasProfanity) {
      const errorMsg = getProfanityErrorMessage(profanityResult);
      toast({ title: 'Inappropriate Language Detected', description: errorMsg || 'Please remove inappropriate words.', variant: 'destructive' });
      return;
    }
    
    const v = await validateTextWithAi(description);
    if (!v.ok) {
      toast({ title: 'Cannot submit', description: v.error || 'Invalid complaint text.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const coords = await geocodeAddress(locLine);
      const lat = coords?.lat ?? 18.9489;
      const lng = coords?.lng ?? 73.2245;
      addReport({
        category: chosenCategory,
        priority,
        description,
        location_text: locLine,
        lat,
        lng,
        reporter: {
          name: anonymous ? 'Anonymous' : (name || 'Citizen'),
          phone: anonymous ? null : (phone || null),
          anonymous,
        },
      });
      toast({ title: 'Submitted', description: 'Your report has been created. Save a copy of the generated complaint text.' });
    } catch {
      toast({ title: 'Failed', description: 'Could not submit report. Try again later.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report a Civic Issue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label>Area/Locality</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area / Locality" />
            </div>
            <div className="space-y-2">
              <Label>Landmark</Label>
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Nearby landmark" />
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Ward (optional)</Label>
              <Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g., 12" />
            </div>
            <div className="space-y-2">
              <Label>Issue Type</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue" />
                </SelectTrigger>
                <SelectContent>
                  {catOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Since when</Label>
              <Input value={sinceWhen} onChange={(e) => setSinceWhen(e.target.value)} placeholder="e.g., 2 weeks" />
            </div>
            <div className="space-y-2">
              <Label>Previous Complaint (Platform)</Label>
              <Input value={prevPlatform} onChange={(e) => setPrevPlatform(e.target.value)} placeholder="Portal/App/Office" />
            </div>
            <div className="space-y-2">
              <Label>Previous Complaint ID</Label>
              <Input value={prevId} onChange={(e) => setPrevId(e.target.value)} placeholder="ID (if any)" />
            </div>
            <div className="space-y-2">
              <Label>Previous Complaint Date</Label>
              <Input value={prevDate} onChange={(e) => setPrevDate(e.target.value)} placeholder="dd/mm/yyyy" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the issue, impact, and exact spot." />
          </div>
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch id="anon" checked={anonymous} onCheckedChange={(v) => setAnonymous(!!v)} />
              <Label htmlFor="anon" className="text-sm font-normal">Submit anonymously</Label>
            </div>
            {!anonymous && (
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Your Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSubmitReport} disabled={submitting || aiValidating || !aiOk}>
              {submitting ? 'Submitting...' : (aiValidating ? 'Checking...' : 'Submit report to portal')}
            </Button>
            <Button variant="outline" onClick={() => handleCopy(body)}>Copy complaint text</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Guidance and Drafts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Authority</div>
              <div className="font-medium">{cls.authority}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Department</div>
              <div className="font-medium">{cls.department}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Location</div>
              <div className="font-medium">{locLine || '—'}</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Steps</div>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {steps.map((s, i) => (<li key={i}>{s}</li>))}
            </ul>
          </div>
          <Tabs defaultValue="complaint">
            <TabsList>
              <TabsTrigger value="complaint">Complaint</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="rti">RTI</TabsTrigger>
              <TabsTrigger value="followup">Follow-up</TabsTrigger>
              <TabsTrigger value="escalation">Escalation</TabsTrigger>
            </TabsList>
            <TabsContent value="complaint" className="space-y-2">
              <div className="text-sm text-muted-foreground">Subject</div>
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{subject}</div>
              <div className="text-sm text-muted-foreground">Body</div>
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{body}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(subject + '\n\n' + body)}>Copy</Button></div>
            </TabsContent>
            <TabsContent value="email" className="space-y-2">
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{subject + '\n\n' + body}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(subject + '\n\n' + body)}>Copy</Button></div>
            </TabsContent>
            <TabsContent value="rti" className="space-y-2">
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{rti}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(rti)}>Copy</Button></div>
            </TabsContent>
            <TabsContent value="followup" className="space-y-2">
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{followUp}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(followUp)}>Copy</Button></div>
            </TabsContent>
            <TabsContent value="escalation" className="space-y-2">
              <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{escalate}</div>
              <div className="flex gap-2"><Button size="sm" onClick={() => handleCopy(escalate)}>Copy</Button></div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
