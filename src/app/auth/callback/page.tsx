'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/shared/lib/supabase';
import { Loader2 } from 'lucide-react';

/**
 * OAuth Callback Handler
 * ──────────────────────
 * Supabase redirects here after Google OAuth completes.
 * We exchange the PKCE code for a session, then let AuthContext
 * (via onAuthStateChange) fetch the user_profiles role and set state.
 * Once the role is known we redirect appropriately.
 *
 * Guest users: redirect to /overview — DashboardLayout will show
 * the quarantine wall automatically based on their role.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');

        // Supabase OAuth error (e.g. user denied consent)
        if (errorParam) {
          throw new Error(urlParams.get('error_description') ?? errorParam);
        }

        if (code) {
          // PKCE flow (Supabase v2 default)
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Implicit / already-authenticated fallback
          const { data, error } = await supabase.auth.getSession();
          if (error || !data.session) throw new Error('Sesi tidak ditemukan.');
        }

        // AuthContext onAuthStateChange will fire automatically and:
        //   1. Fetch user_profiles to get role
        //   2. Set cookie via setAuthCookie()
        //
        // Redirect to 'next' if specified, otherwise /overview.
        const next = urlParams.get('next');
        router.replace(next || '/overview');
      } catch (err: any) {
        console.error('[auth/callback] Error:', err);
        setErrorMsg(err.message ?? 'Autentikasi gagal.');
        setStatus('error');
        setTimeout(() => router.replace('/login?error=auth_failed'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--surface-bg)' }}
    >
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-300/20 blur-3xl animate-float" />

      <div className="relative z-10 text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-xl mb-6 animate-bounce-subtle overflow-hidden">
          <img src="/logo-bitanic.jpg" alt="Bitanic Logo" className="w-full h-full object-cover" />
        </div>

        {status === 'loading' ? (
          <>
            <div className="flex items-center justify-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              <p className="text-base font-semibold" style={{ color: 'var(--surface-text)' }}>
                Memproses autentikasi...
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
              Mohon tunggu, sedang memverifikasi sesi Anda
            </p>
          </>
        ) : (
          <>
            <p className="text-base font-semibold text-danger-600 mb-2">
              ❌ Autentikasi gagal
            </p>
            {errorMsg && (
              <p className="text-xs text-danger-500 mb-2">{errorMsg}</p>
            )}
            <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
              Mengalihkan ke halaman login...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
