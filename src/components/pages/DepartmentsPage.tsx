import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, FileText, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReports } from '@/contexts/ReportsContext';
import { getSupabase } from '@/lib/supabase';

interface Department {
  id: string;
  name: string;
  officerCount: number;
  staffCount: number;
  activeReports: number;
  totalReports: number;
}

export function DepartmentsPage() {
  const { toast } = useToast();
  const { reports } = useReports();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleAddDepartment = () => {
    toast({
      title: "Coming Soon",
      description: "Department management functionality will be available soon.",
    });
  };

  // Fetch departments and compute stats from database
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    
    async function fetchData() {
      try {
        // Get unique departments from reports
        const deptNames = [...new Set(reports.map(r => r.assigned_department).filter(Boolean))];
        
        // Get user counts per department
        const { data: profiles } = await sb
          .from('profiles')
          .select('id, department, role');
        
        const deptUsers = new Map<string, { officers: number; staff: number }>();
        
        if (profiles) {
          profiles.forEach((p: Record<string, unknown>) => {
            const dept = p.department || 'General';
            if (!deptUsers.has(dept)) {
              deptUsers.set(dept, { officers: 0, staff: 0 });
            }
            const counts = deptUsers.get(dept)!;
            if (p.role === 'Field Officer' || p.role === 'Department Admin' || p.role === 'officer' || p.role === 'admin') {
              counts.officers++;
            } else if (p.role === 'Staff' || p.role === 'staff') {
              counts.staff++;
            }
          });
        }
        
        // Build department list
        const allDepts = Array.from(new Set([...deptNames, ...Array.from(deptUsers.keys())]));
        
        const computed: Department[] = allDepts.map(name => {
          const counts = deptUsers.get(name) || { officers: 0, staff: 0 };
          const activeReports = reports.filter(r => 
            r.assigned_department === name && 
            (r.status === 'Pending' || r.status === 'In Progress')
          ).length;
          const totalReports = reports.filter(r => r.assigned_department === name).length;
          
          return {
            id: `dept-${name}`,
            name,
            officerCount: counts.officers,
            staffCount: counts.staff,
            activeReports,
            totalReports,
          };
        });
        
        setDepartments(computed.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [reports]);

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
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading departments...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card key={dept.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {dept.name}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{dept.officerCount + dept.staffCount}</p>
                      <p className="text-xs text-muted-foreground">Staff</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{dept.activeReports}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {!isLoading && departments.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">No departments found</div>
      )}
    </div>
  );
}
