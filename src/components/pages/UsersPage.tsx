import React from 'react';
import { mockUsers, mockDepartments } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserPlus, Search, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSupabase } from '@/lib/supabase';
import { User } from '@/lib/types';

export function UsersPage() {
  const { toast } = useToast();
  const [query, setQuery] = React.useState('');
  const [overrides, setOverrides] = React.useState<Record<string, Partial<User>>>({});
  const [editOpen, setEditOpen] = React.useState(false);
  const [editUserEmail, setEditUserEmail] = React.useState('');
  const [editRole, setEditRole] = React.useState<User['role']>('Viewer');
  const [editDept, setEditDept] = React.useState('General');
  const [editStatus, setEditStatus] = React.useState<'Active' | 'Inactive'>('Active');

  const handleAddUser = () => {
    toast({
      title: "Coming Soon",
      description: "User management functionality will be available soon.",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Super Admin': return 'bg-primary text-primary-foreground';
      case 'Department Admin': return 'bg-info text-foreground';
      case 'Field Officer': return 'bg-success text-success-foreground';
      case 'Viewer': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('nagrikGPT_user_overrides');
      if (raw) setOverrides(JSON.parse(raw));
    } catch {}
  }, []);

  const displayUsers = React.useMemo(() => {
    const list = mockUsers.map(u => {
      const ov = overrides[u.email] || {};
      return { ...u, ...ov } as User;
    });
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  }, [overrides, query]);

  const openEdit = (user: User) => {
    setEditUserEmail(user.email);
    setEditRole(user.role as User['role']);
    setEditDept(user.department || 'General');
    setEditStatus((user.status as any) || 'Active');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    const next = { ...overrides, [editUserEmail]: { role: editRole, department: editDept, status: editStatus } };
    setOverrides(next);
    try { localStorage.setItem('nagrikGPT_user_overrides', JSON.stringify(next)); } catch {}
    const sb = getSupabase();
    if (sb) {
      try {
        const base = mockUsers.find(u => u.email === editUserEmail) as User | undefined;
        await sb.from('users').upsert({
          id: base?.id || undefined,
          name: base?.name || editUserEmail.split('@')[0],
          email: editUserEmail,
          role: editRole,
          department: editDept,
          status: editStatus,
        }, { onConflict: 'email' } as any);
      } catch {}
    }
    toast({ title: 'User updated', description: 'Changes saved.' });
    setEditOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button onClick={handleAddUser}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium text-sm">Name</th>
                <th className="text-left p-4 font-medium text-sm">Email</th>
                <th className="text-left p-4 font-medium text-sm">Role</th>
                <th className="text-left p-4 font-medium text-sm">Department</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-left p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                  <td className="p-4">
                    <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                  </td>
                  <td className="p-4 text-sm">{user.department}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="bg-success-light text-success border-success/30">
                      {user.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(user as User)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-sm font-medium break-all">{editUserEmail}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Role</div>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as User['role'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super Admin">Super Admin</SelectItem>
                  <SelectItem value="Department Admin">Department Admin</SelectItem>
                  <SelectItem value="Field Officer">Field Officer</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Department</div>
              <Select value={editDept} onValueChange={setEditDept}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Departments">All Departments</SelectItem>
                  {mockDepartments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Status</div>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as 'Active' | 'Inactive')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
