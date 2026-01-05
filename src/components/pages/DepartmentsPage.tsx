import React from 'react';
import { mockDepartments, mockUsers } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, FileText, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReports } from '@/contexts/ReportsContext';

export function DepartmentsPage() {
  const { toast } = useToast();
  const { reports } = useReports();

  const handleAddDepartment = () => {
    toast({
      title: "Coming Soon",
      description: "Department management functionality will be available soon.",
    });
  };

  // Build list of departments from DB (reports) + seed list
  const deptNames = Array.from(new Set<string>([
    ...mockDepartments.map(d => d.name),
    ...reports.map(r => r.assigned_department).filter(Boolean) as string[],
  ]));

  const getAllUsers = () => {
    let dyn: typeof mockUsers = [] as any;
    try {
      const raw = localStorage.getItem('nagrikGPT_dynusers');
      if (raw) dyn = JSON.parse(raw);
    } catch {}
    return [...mockUsers, ...dyn];
  };

  const computed = deptNames.map((name) => {
    const ward = mockDepartments.find(d => d.name === name)?.ward || 'All Wards';
    const users = getAllUsers();
    const officerCount = users.filter(u => (u.role === 'Field Officer' || u.role === 'Department Admin') && u.department === name).length;
    const activeReports = reports.filter(r => r.assigned_department === name && (r.status === 'Pending' || r.status === 'In Progress')).length;
    return { id: `dept-${name}`, name, ward, officerCount, activeReports };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-end">
        <Button onClick={handleAddDepartment}>
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      {/* Departments Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {computed.map((dept) => (
          <Card key={dept.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    {dept.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{dept.ward}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{dept.officerCount}</p>
                    <p className="text-xs text-muted-foreground">Officers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{dept.activeReports}</p>
                    <p className="text-xs text-muted-foreground">Active Reports</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
