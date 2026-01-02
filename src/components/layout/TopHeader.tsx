import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useReports } from '@/contexts/ReportsContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext';

interface TopHeaderProps {
  currentPage: string;
  onSearch: (query: string) => void;
  onNavigateToReport: (reportId: string) => void;
}

export function TopHeader({ currentPage, onSearch, onNavigateToReport }: TopHeaderProps) {
  const { notifications, markNotificationRead, unreadCount, reports, requestAssignment } = useReports() as any;
  const { user, isAdmin } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
  const roleLabel = isAdmin ? 'Admin' : (user?.role === 'Field Officer' ? 'Officer' : (user?.role || 'User'));
  const roleBadgeClass = isAdmin
    ? 'bg-primary text-primary-foreground'
    : (user?.role === 'Field Officer' ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground');

  const filteredNotifications = useMemo(() => {
    if (user?.role === 'Super Admin') return notifications;
    return notifications.filter((n) => {
      const rep = (reports || []).find((r: any) => r.report_id === n.report_id);
      return rep && rep.assigned_department === user?.department;
    });
  }, [notifications, reports, user?.role, user?.department]);

  const filteredUnreadCount = useMemo(() => filteredNotifications.filter(n => !n.read).length, [filteredNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  const handleNotificationClick = (notificationId: string, reportId: string) => {
    markNotificationRead(notificationId);
    onNavigateToReport(reportId);
    setIsNotificationsOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b px-6 py-4 pl-16 lg:pl-6">
      <div className="flex items-center justify-between gap-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
          <Badge className={roleBadgeClass}>{roleLabel}</Badge>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9 w-64"
            />
          </div>



          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              aria-label="Notifications"
              aria-haspopup="true"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="w-5 h-5" />
              {filteredUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-medium rounded-full flex items-center justify-center animate-pulse-soft">
                  {filteredUnreadCount}
                </span>
              )}
            </Button>

            {/* Notification Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-popover border rounded-lg shadow-lg animate-fade-in" role="menu">
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold">Notifications</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setIsNotificationsOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {filteredNotifications.length === 0 ? (
                    <p className="p-4 text-center text-muted-foreground text-sm">
                      No notifications
                    </p>
                  ) : (
                    filteredNotifications.map((notif) => {
                      const rep = (reports || []).find((r: any) => r.report_id === notif.report_id);
                      return (
                        <div
                          key={notif.id}
                          className={cn(
                            "w-full p-3 transition-colors border-b last:border-0",
                            !notif.read && "bg-primary-light"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm mb-1">{notif.message}</p>
                              <p className="text-xs text-muted-foreground">{timeAgo(notif.timestamp)}</p>
                              {rep && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Dept: <span className="font-medium">{rep.assigned_department}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => handleNotificationClick(notif.id, notif.report_id)}>Open</Button>
                              {!isAdmin && (
                                <Button size="sm" variant="secondary" onClick={() => requestAssignment(notif.report_id, user?.name || 'Officer')}>
                                  Request
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
