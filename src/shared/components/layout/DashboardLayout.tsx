'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Map, Activity, Leaf, Calendar, Wrench, Cpu,
  Bell, Settings, ChevronLeft, ChevronRight, Menu, X,
  Sun, Moon, LogOut, Loader2, Users
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { APP_NAME } from '@/shared/lib/constants';
import { mockNotifications } from '@/shared/lib/mockData';
import { useAuth } from '@/shared/context/AuthContext';
import { useRBAC } from '@/shared/hooks/useRBAC';
import PendingApprovalPage from '@/app/(dashboard)/pending-approval/page';

const navItems = [
  { id: 'overview',      label: 'Dashboard',      icon: LayoutDashboard, href: '/overview' },
  { id: 'agri-twin',     label: 'Agri-Twin',      icon: Map,             href: '/agri-twin' },
  { id: 'monitoring',    label: 'Monitoring',      icon: Activity,        href: '/monitoring' },
  { id: 'eco-savings',   label: 'Eco-Savings',     icon: Leaf,            href: '/eco-savings' },
  { id: 'schedules',     label: 'Jadwal',          icon: Calendar,        href: '/schedules' },
  { id: 'devices',       label: 'Perangkat',       icon: Cpu,             href: '/devices' },
  { id: 'notifications',    label: 'Notifikasi',      icon: Bell,            href: '/notifications' },
  { id: 'user_management',  label: 'Kelola User',     icon: Users,           href: '/user-management' },
  { id: 'settings',         label: 'Pengaturan',      icon: Settings,        href: '/settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { profile, role, isLoading, logout } = useAuth();
  const { canAccess } = useRBAC();

  const unreadCount = mockNotifications.filter(n => !n.is_read).length;

  // ─── Guest quarantine guard ─────────────────────────────────────
  // Show spinner while resolving session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-bg)' }}>
        <div className="absolute inset-0 gradient-mesh" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg animate-bounce-subtle">
            <img src="/logo-bitanic.jpg" alt="Bitanic" className="w-full h-full object-cover" />
          </div>
          <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>Memuat sesi...</p>
        </div>
      </div>
    );
  }

  // Guest users or missing profile → quarantine wall
  if (!role || role === 'guest') {
    return <PendingApprovalPage />;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push('/login');
    }
  };

  // ─── Nav visibility per role ───────────────────────────────────────────
  const visibleNavItems = navItems.filter(item => {
    if (item.id === 'settings')        return canAccess('settings');
    if (item.id === 'devices')         return canAccess('devices');
    if (item.id === 'user_management') return canAccess('user_management');
    return true;
  });

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? '' : 'light');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static z-50 h-full flex flex-col transition-all duration-300 ease-in-out',
          'border-r border-emerald-900/40',
          collapsed ? 'w-[72px]' : 'w-[260px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'linear-gradient(180deg, #0A1F18 0%, #060F0C 60%, #040A08 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-emerald-900/40 shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            <img src="/logo-bitanic.jpg" alt="Bitanic" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-base tracking-tight font-[var(--font-display)] text-emerald-50">{APP_NAME}</h1>
              <p className="text-[10px] text-emerald-500 -mt-0.5">Smart Fertigation</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 shadow-lg shadow-black/30 border border-emerald-500/20'
                    : 'text-emerald-700 hover:bg-emerald-900/40 hover:text-emerald-200'
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-emerald-400' : 'text-emerald-700 group-hover:text-emerald-300')} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className={cn(
                    'absolute bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center',
                    collapsed ? 'top-0 right-0 w-4 h-4' : 'right-3 w-5 h-5'
                  )}>
                    {unreadCount}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_8px_#10b981]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse button (desktop) */}
        <div className="hidden lg:block border-t border-emerald-900/40 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-emerald-700 hover:bg-emerald-900/40 hover:text-emerald-200 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="text-xs">Minimkan</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="h-16 shrink-0 flex items-center justify-between px-4 lg:px-6"
          style={{
            background: 'var(--topbar-bg)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--topbar-border)',
          }}
        >
          {/* Left: mobile menu + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-primary-50 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--topbar-text)' }}>
                {navItems.find(n => n.href === pathname)?.label || 'Dashboard'}
              </h2>
              <p className="text-xs hidden sm:block" style={{ color: 'var(--topbar-text-muted)' }}>
                Bitanic Pro V4 — Smart Fertigation Monitoring
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--topbar-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="Toggle tema"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notification bell */}
            <Link
              href="/notifications"
              className="p-2 rounded-lg transition-colors relative"
              style={{ color: 'var(--topbar-text-muted)' }}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* User + Logout */}
            <div
              className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l"
              style={{ borderColor: 'var(--topbar-border)' }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-700 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 flex items-center justify-center text-white text-sm font-bold uppercase shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                  {profile?.full_name ? profile.full_name[0] : 'U'}
                </div>
              )}
              <div className="hidden md:block">
                <p className="text-sm font-medium" style={{ color: 'var(--topbar-text)' }}>{profile?.full_name || 'Pengguna'}</p>
                <p className="text-[11px]" style={{ color: 'var(--topbar-text-muted)' }}>
                  {role === 'super_admin' ? '⭐ Super Admin' : role === 'pemilik_kebun' ? '🌱 Pemilik Kebun' : 'Tamu'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="ml-1 p-2 rounded-lg transition-colors hover:bg-red-900/30 hover:text-red-400 text-emerald-700 disabled:opacity-50"
                title="Keluar"
              >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 gradient-mesh">
          {children}
        </main>
      </div>
    </div>
  );
}
