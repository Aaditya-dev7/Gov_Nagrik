import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/contexts/ReportsContext';
import { Report } from '@/lib/types';
import { Sidebar } from './layout/Sidebar';
import { TopHeader } from './layout/TopHeader';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportDetailModal } from './reports/ReportDetailModal';
import { ProfilePage } from './pages/ProfilePage';
import { cn } from '@/lib/utils';
import { MobileBottomNav } from './layout/MobileBottomNav';
import { OfficersPage } from './pages/OfficersPage';
import { StaffDashboardPage } from './pages/StaffDashboardPage';
import { OfficerTeamPage } from './pages/OfficerTeamPage';
import { NSSRegistrationsPage } from './pages/NSSRegistrationsPage';
import { MapPage } from './pages/MapPage';
import { t, useLang } from '@/lib/i18n';

export function MainApp() {
  const { isAdmin, user } = useAuth();
  const isStaff = user?.role === 'Staff';
  const { reports, isLoading } = useReports();
  const _lang = useLang();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [dashboardFilter, setDashboardFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [assignedOnlyUserId, setAssignedOnlyUserId] = useState<string | null>(null);
  const [reportsPresetFilters, setReportsPresetFilters] = useState<{ status?: string[]; priority?: string[] } | null>(null);

  // Load last page for role and ensure correct landing page after login/role change
  useEffect(() => {
    // Staff always lands on staff dashboard
    if (isStaff) {
      setCurrentPage('staff-dashboard');
      return;
    }

    try {
      const key = isAdmin ? 'admin:lastPage' : 'officer:lastPage';
      const saved = localStorage.getItem(key);
      if (saved) setCurrentPage(saved);
    } catch {}

    // If officer has no saved page yet, land on Reports by default so they immediately see assignments.
    if (user && !isAdmin) {
      try {
        const key = 'officer:lastPage';
        const saved = localStorage.getItem(key);
        if (!saved) {
          setCurrentPage('reports');
        }
      } catch {}
    }

    const adminOnly = ['users', 'departments', 'officers'];
    if (!isAdmin && adminOnly.includes(currentPage)) {
      setCurrentPage('dashboard');
      try { localStorage.setItem(isAdmin ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}
    }
    if (user && !currentPage) {
      setCurrentPage('dashboard');
      try { localStorage.setItem(isAdmin ? 'admin:lastPage' : 'officer:lastPage', 'dashboard'); } catch {}
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    try { localStorage.setItem(isAdmin ? 'admin:lastPage' : 'officer:lastPage', currentPage); } catch {}
  }, [currentPage, isAdmin]);

  // Show loading state while reports are being fetched - MUST be after all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">{t('common.loading', 'Loading reports...')}</p>
        </div>
      </div>
    );
  }

  const handleNavigate = (page: string) => {
    // Prevent non-admins from accessing admin pages
    if ((page === 'users' || page === 'departments') && !isAdmin) {
      return;
    }
    if (page === 'reports') {
      // Show All Reports by default; officers can switch to assigned-only via dashboard action
      setAssignedOnlyUserId(null);
    }
    if (page !== 'reports') {
      // Clear any preset filters when leaving Reports
      setReportsPresetFilters(null);
    }
    setCurrentPage(page);
  };

  const handleOpenReport = (reportId: string) => {
    const report = reports.find(r => r.report_id === reportId);
    if (report) {
      setSelectedReport(report);
      setIsReportModalOpen(true);
    }
  };

  const handleNavigateToReport = (reportId: string) => {
    setAssignedOnlyUserId(null);
    setCurrentPage('reports');
    handleOpenReport(reportId);
  };

  const handleViewAllAssigned = () => {
    setAssignedOnlyUserId(user?.id ?? null);
    setCurrentPage('reports');
  };

  const handleDashboardFilterChange = (next: string) => {
    setDashboardFilter(next);
    setAssignedOnlyUserId(null);
    setSearchQuery('');
    if (next === 'all') {
      setReportsPresetFilters({ status: [], priority: [] });
    } else if (next === 'Urgent') {
      setReportsPresetFilters({ priority: ['Urgent'], status: [] });
    } else {
      setReportsPresetFilters({ status: [next], priority: [] });
    }
    setCurrentPage('reports');
  };

  const handleNavigateToReportsFiltered = (filter: 'all' | 'Pending' | 'In Progress' | 'Resolved' | 'Urgent') => {
    setAssignedOnlyUserId(null);
    setSearchQuery('');
    if (filter === 'all') {
      setReportsPresetFilters({ status: [], priority: [] });
    } else if (filter === 'Urgent') {
      setReportsPresetFilters({ priority: ['Urgent'], status: [] });
    } else {
      setReportsPresetFilters({ status: [filter], priority: [] });
    }
    setCurrentPage('reports');
  };

  const renderPage = () => {
    // Staff has their own dashboard as landing page
    if (isStaff && currentPage === 'dashboard') {
      return <StaffDashboardPage />;
    }
    
    // Staff can also access staff-dashboard explicitly
    if (currentPage === 'staff-dashboard') {
      return <StaffDashboardPage />;
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage 
            filter={dashboardFilter}
            onFilterChange={handleDashboardFilterChange}
            onOpenReport={handleOpenReport}
            onViewAllAssigned={handleViewAllAssigned}
            onNavigateToReportsFiltered={handleNavigateToReportsFiltered}
          />
        );
      case 'reports':
        return (
          <ReportsPage 
            searchQuery={searchQuery}
            onOpenReport={handleOpenReport}
            assignedOnlyUserId={assignedOnlyUserId}
            presetFilters={reportsPresetFilters}
            staffDepartment={isStaff ? user?.department : undefined}
            officerDepartment={!isAdmin && !isStaff ? user?.department : undefined}
          />
        );
      case 'map':
        return <MapPage onOpenReport={handleOpenReport} />;
      case 'users':
        return isAdmin ? <UsersPage /> : null;
      case 'departments':
        return isAdmin ? <DepartmentsPage /> : null;
      case 'officers':
        return isAdmin ? <OfficersPage /> : null;
      case 'nss-registrations':
        return (isAdmin || user?.role === 'Field Officer') ? <NSSRegistrationsPage /> : null;
      case 'my-team':
        return <OfficerTeamPage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return (
          <DashboardPage 
            filter={dashboardFilter}
            onFilterChange={handleDashboardFilterChange}
            onOpenReport={handleOpenReport}
            onViewAllAssigned={handleViewAllAssigned}
            onNavigateToReportsFiltered={handleNavigateToReportsFiltered}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
      
      <div className="lg:ml-64 transition-all duration-300">
        <TopHeader 
          currentPage={currentPage}
          onSearch={setSearchQuery}
          onNavigateToReport={handleNavigateToReport}
        />

        {/* Role Banner for visual differentiation */}
        <div className="px-4 sm:px-6 lg:px-8 mt-2">
          {isAdmin ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 text-primary px-3 py-2 text-sm">
              {t('dashboard.admin_portal', 'Admin Portal')}
            </div>
          ) : isStaff ? (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/10 text-blue-500 px-3 py-2 text-sm">
              {t('dashboard.staff_portal', 'Staff Portal')}
            </div>
          ) : (
            <div className="rounded-md border border-success/30 bg-success/10 text-success px-3 py-2 text-sm">
              {t('dashboard.officer_portal', 'Officer Portal')}
            </div>
          )}
        </div>

        <main className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-28 sm:pb-12" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}>
          {renderPage()}
        </main>
      </div>

      <ReportDetailModal 
        report={selectedReport}
        open={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
      />

      <MobileBottomNav currentPage={currentPage} onNavigate={handleNavigate} />
    </div>
  );
}
