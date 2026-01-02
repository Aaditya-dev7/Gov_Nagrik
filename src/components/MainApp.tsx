import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/contexts/ReportsContext';
import { Report } from '@/lib/types';
import { Sidebar } from './layout/Sidebar';
import { TopHeader } from './layout/TopHeader';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { MapPage } from './pages/MapPage';
import { HeatmapPage } from './pages/HeatmapPage';
import { UsersPage } from './pages/UsersPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportDetailModal } from './reports/ReportDetailModal';
import { ProfilePage } from './pages/ProfilePage';
import { cn } from '@/lib/utils';
import { MobileBottomNav } from './layout/MobileBottomNav';
import { OfficersPage } from './pages/OfficersPage';

export function MainApp() {
  const { isAdmin, user } = useAuth();
  const { reports } = useReports();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [dashboardFilter, setDashboardFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [assignedOnlyUserId, setAssignedOnlyUserId] = useState<string | null>(null);

  const handleNavigate = (page: string) => {
    // Prevent non-admins from accessing admin pages
    if ((page === 'users' || page === 'departments') && !isAdmin) {
      return;
    }
    if (page === 'reports') {
      setAssignedOnlyUserId(isAdmin ? null : (user?.id ?? null));
    }
    setCurrentPage(page);
  };

  // Load last page for role and ensure correct landing page after login/role change
  useEffect(() => {
    try {
      const key = isAdmin ? 'admin:lastPage' : 'officer:lastPage';
      const saved = localStorage.getItem(key);
      if (saved) setCurrentPage(saved);
    } catch {}

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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage 
            filter={dashboardFilter}
            onFilterChange={setDashboardFilter}
            onOpenReport={handleOpenReport}
            onViewAllAssigned={handleViewAllAssigned}
          />
        );
      case 'reports':
        return (
          <ReportsPage 
            searchQuery={searchQuery}
            onOpenReport={handleOpenReport}
            assignedOnlyUserId={assignedOnlyUserId}
          />
        );
      case 'map':
        return <MapPage onOpenReport={handleOpenReport} />;
      case 'heatmap':
        return <HeatmapPage />;
      case 'users':
        return isAdmin ? <UsersPage /> : null;
      case 'departments':
        return isAdmin ? <DepartmentsPage /> : null;
      case 'officers':
        return isAdmin ? <OfficersPage /> : null;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return (
          <DashboardPage 
            filter={dashboardFilter}
            onFilterChange={setDashboardFilter}
            onOpenReport={handleOpenReport}
            onViewAllAssigned={handleViewAllAssigned}
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
              Admin Portal
            </div>
          ) : (
            <div className="rounded-md border border-success/30 bg-success/10 text-success px-3 py-2 text-sm">
              Officer Portal
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
