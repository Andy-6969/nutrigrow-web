'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';

/**
 * Quarantine / Pending Approval page.
 * Shown to users whose role is 'guest' in user_profiles.
 * They cannot access any dashboard route — the DashboardLayout renders this
 * instead of the requested page content.
 */
export default function PendingApprovalPage() {
  const { logout, profile, role, session } = useAuth();
  const router = useRouter();

  // Safety redirect — if somehow a non-guest lands here, send them to overview
  useEffect(() => {
    if (role && role !== 'guest') {
      router.replace('/overview');
    }
  }, [role, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Use session email as fallback, then localStorage (saved during register)
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
      {/* Background decorations */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange-300/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl animate-bounce-subtle">
            <img src="/logo-bitanic.jpg" alt="Bitanic" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Card */}
        <div className="glass-heavy p-8 text-center space-y-6 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>

          {/* Icon badge */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-100/80 border-4 border-amber-300/50 flex items-center justify-center shadow-lg shadow-amber-200/30">
              <ShieldAlert className="w-10 h-10 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--surface-text)' }}>
              Menunggu Persetujuan
            </h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--surface-text-muted)' }}>
              Akun Anda sedang dalam status <span className="font-semibold text-amber-600">Menunggu Aktivasi</span>.
              Super Admin perlu mengaktifkan akses Anda sebelum dapat menggunakan dashboard.
            </p>
          </div>

          {/* Status pills */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/50 text-left">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--surface-text)' }}>Status Akun</p>
                <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                  🔒 Guest (Menunggu Aktivasi) akses ditangguhkan
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

          {/* Instructions */}
          <div className="p-4 rounded-xl bg-primary-50/50 border border-primary-200/40 text-left space-y-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--surface-text)' }}>
              💬 Apa yang harus dilakukan?
            </p>
            <ul className="text-xs space-y-1.5" style={{ color: 'var(--surface-text-muted)' }}>
              <li className="flex items-start gap-1.5">
                <span className="text-primary-500 shrink-0 mt-0.5">1.</span>
                Hubungi Super Admin kebun Anda melalui WhatsApp atau email.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary-500 shrink-0 mt-0.5">2.</span>
                Sampaikan email terdaftar Anda: <strong>{displayEmail || '—'}</strong>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary-500 shrink-0 mt-0.5">3.</span>
                Admin akan mengubah role Anda menjadi <strong>Pemilik Kebun</strong> di panel manajemen.
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-all duration-200 hover:bg-white/40 active:scale-[0.98]"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--surface-text-muted)' }}
            >
              <RefreshCw className="w-4 h-4" />
              Periksa Ulang Status
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-danger-500 text-white font-semibold text-sm hover:bg-danger-600 transition-all duration-200 shadow-lg active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              Keluar
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
