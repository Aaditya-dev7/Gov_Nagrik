import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useReports } from '@/contexts/ReportsContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Bell, X, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t, useLang, setLang as setLangGlobal } from '@/lib/i18n';

interface TopHeaderProps {
  currentPage: string;
  onSearch: (query: string) => void;
  onNavigateToReport: (reportId: string) => void;
}

export function TopHeader({ currentPage, onSearch, onNavigateToReport }: TopHeaderProps) {
  const { notifications, markNotificationRead, unreadCount, reports, requestAssignment } = useReports() as any;
  const { user, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const _langGlobal = useLang();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lang, setLang] = useState<'en' | 'hi' | 'mr'>(() => {
    try {
      const saved = localStorage.getItem('nagrikGPT_lang');
      if (saved === 'hi' || saved === 'mr' || saved === 'en') return saved;
    } catch {}
    return 'en';
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
  const roleLabel = isAdmin ? 'Admin' : (user?.role === 'Field Officer' ? 'Officer' : (user?.role || 'User'));
  const roleBadgeClass = isAdmin
    ? 'bg-primary text-primary-foreground'
    : (user?.role === 'Field Officer' ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground');

  const filteredNotifications = useMemo(() => {
    const isGlobalAdmin = user?.role === 'Super Admin' || (user?.role === 'Department Admin' && user?.department === 'All Departments');
    if (isGlobalAdmin) return notifications;
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

  const handleLangChange = (v: string) => {
    const next = (v === 'hi' || v === 'mr' || v === 'en') ? v : 'en';
    setLang(next);
    setLangGlobal(next);
  };

  const resolvedTheme = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  return (
    <header className="sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8 pt-3">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-2xl border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm transition-colors duration-300">
            <div className="px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between gap-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
          <Badge className={roleBadgeClass}>{roleLabel}</Badge>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language */}
          <div className="hidden sm:block">
            <Select value={lang} onValueChange={handleLangChange}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder={t('common.language', 'Language')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('lang.english', 'English')}</SelectItem>
                <SelectItem value="hi">{t('lang.hindi', 'Hindi')}</SelectItem>
                <SelectItem value="mr">{t('lang.marathi', 'Marathi')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Theme */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 transition-colors duration-300"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search_reports', 'Search reports...')}
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
                  <h3 className="font-semibold">{t('common.notifications', 'Notifications')}</h3>
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
                      {t('common.no_notifications', 'No notifications')}
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
                                  {t('common.dept', 'Dept')}: <span className="font-medium">{rep.assigned_department}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => handleNotificationClick(notif.id, notif.report_id)}>{t('common.open', 'Open')}</Button>
                              {!isAdmin && (
                                <Button size="sm" variant="secondary" onClick={() => requestAssignment(notif.report_id, user?.name || 'Officer')}>
                                  {t('common.request', 'Request')}
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
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
