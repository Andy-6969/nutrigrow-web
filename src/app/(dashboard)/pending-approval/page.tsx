'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Clock as ClockIcon, ShieldAlert as ShieldIcon, LogOut as LogOutIcon, RefreshCw as RefreshIcon } from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import { useT } from '@/shared/context/LanguageContext';

export default function PendingApprovalPage() {
  const { logout, profile, role, session } = useAuth();
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (role && role !== 'guest') {
      router.replace('/overview');
    }
  }, [role, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const lsEmail = typeof window !== 'undefined' ? localStorage.getItem('ng-registered-email') : null;
  const lsName = typeof window !== 'undefined' ? localStorage.getItem('ng-registered-name') : null;

  const displayEmail = profile?.email || session?.user?.email || lsEmail || '';
  const displayName = profile?.full_name || session?.user?.user_metadata?.full_name || lsName || '';
  const displayAvatar = profile?.avatar_url || session?.user?.user_metadata?.avatar_url || '';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--surface-bg)' }}
    >
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange-300/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl animate-bounce-subtle">
            <img src="/logo-bitanic.jpg" alt="Bitanic" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="glass-heavy p-8 text-center space-y-6 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-100/80 border-4 border-amber-300/50 flex items-center justify-center shadow-lg shadow-amber-200/30">
              <ShieldIcon className="w-10 h-10 text-amber-600" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--surface-text)' }}>
              {t('pending_title')}
            </h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--surface-text-muted)' }}>
              {t('pending_desc')}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/50 text-left">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <ClockIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--surface-text)' }}>{t('pending_status_label')}</p>
                <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                  🔒 {t('pending_status_value')}
                </p>
              </div>
            </div>

            {(displayEmail || displayName) && (
              <div className="flex items-center gap-3 p-3 rounded-xl glass-sm text-left">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName || 'User'}
                    className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-primary-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0 font-bold text-primary-600 text-sm uppercase">
                    {displayName?.[0] ?? displayEmail?.[0] ?? 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--surface-text)' }}>
                    {displayName || 'Pengguna'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--surface-text-muted)' }}>
                    {displayEmail}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-primary-50/50 border border-primary-200/40 text-left space-y-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--surface-text)' }}>
              💬 {t('pending_what_to_do')}
            </p>
            <ul className="text-xs space-y-1.5" style={{ color: 'var(--surface-text-muted)' }}>
              <li className="flex items-start gap-1.5">
                <span className="text-primary-500 shrink-0 mt-0.5">1.</span>
                {t('pending_step_1')}
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary-500 shrink-0 mt-0.5">2.</span>
                {t('pending_step_2')} <strong>{displayEmail || '—'}</strong>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary-500 shrink-0 mt-0.5">3.</span>
                <span>
                  {t('pending_step_3')}
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-all duration-200 hover:bg-white/40 active:scale-[0.98]"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--surface-text-muted)' }}
            >
              <RefreshIcon className="w-4 h-4" />
              {t('pending_recheck')}
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-danger-500 text-white font-semibold text-sm hover:bg-danger-600 transition-all duration-200 shadow-lg active:scale-[0.98]"
            >
              <LogOutIcon className="w-4 h-4" />
              {t('pending_logout')}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] mt-6" style={{ color: 'var(--surface-text-subtle)' }}>
          NutriGrow — Bitanic Pro V4 © 2026
        </p>
      </div>
    </div>
  );
}
