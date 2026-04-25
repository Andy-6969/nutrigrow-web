'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { useAuth } from '@/shared/context/AuthContext';

// ─── Role-based redirect helper ──────────────────────────────
function getRedirectPath(role: string | null): string {
  // Both active roles go to overview; guest goes to quarantine wall
  // (DashboardLayout will intercept guest before they see any content)
  return '/overview';
}

export default function LoginPage() {
  const router = useRouter();
  const { role, isInitialized, session } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect immediately
  useEffect(() => {
    if (isInitialized && session) {
      router.replace(getRedirectPath(role));
    }
  }, [isInitialized, session, role, router]);

  // ─── Google OAuth ──────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const origin = window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
      // Browser redirects to Google — no further action needed here
    } catch (err: any) {
      setError('Gagal login dengan Google: ' + err.message);
      setIsLoading(false);
    }
  };

  // ─── Email / Password ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // onAuthStateChange in AuthContext will fire, fetch profile, and set role.
      // We rely on the useEffect above to redirect once session + role are ready.
    } catch (err: any) {
      setError('Gagal login: ' + (err.message ?? 'Periksa email dan password Anda.'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--surface-bg)' }}>
      {/* Background decorations */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-300/20 blur-3xl animate-float" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary-300/15 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary-200/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + Header */}
        <div className="text-center mb-8 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full shadow-xl mb-4 animate-bounce-subtle overflow-hidden">
            <img src="/logo-bitanic.jpg" alt="Bitanic Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--surface-text)', fontFamily: 'var(--font-display)' }}>
            NutriGrow
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--surface-text-muted)' }}>
            Smart Fertigation Monitoring System
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-heavy p-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--surface-text)' }}>Masuk ke Akun</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--surface-text-muted)' }}>
            Masukkan kredensial untuk mengakses dashboard
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger-50 border border-danger-500/20 text-danger-600 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text)' }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@nutrigrow.id"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:shadow-lg"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(8px)',
                  border: 'var(--glass-border)',
                  color: 'var(--surface-text)',
                }}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:shadow-lg"
                  style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(8px)',
                    border: 'var(--glass-border)',
                    color: 'var(--surface-text)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/20 transition-colors"
                  style={{ color: 'var(--surface-text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--surface-text-muted)' }}>
                <input type="checkbox" className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-primary-500" />
                Ingat saya
              </label>
              <Link href="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium">
                Lupa password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-xl text-sm hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl glow-sm hover:glow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Masuk <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--surface-text-muted)' }}>Atau masuk dengan</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 bg-[var(--surface-bg)]/20 border border-[var(--glass-border)] text-[var(--surface-text)] font-semibold rounded-xl text-sm hover:bg-[var(--surface-bg)]/40 transition-all duration-300 shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 backdrop-blur-md"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Lanjutkan dengan Google
          </button>
        </div>

        {/* Register link */}
        <p className="text-center text-xs mt-5" style={{ color: 'var(--surface-text-muted)' }}>
          Belum punya akun?{' '}
          <Link href="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
            Daftar sekarang
          </Link>
        </p>

        {/* Footer */}
        <p className="text-center text-[10px] mt-4 opacity-0 animate-fade-in" style={{ color: 'var(--surface-text-subtle)', animationDelay: '500ms', animationFillMode: 'forwards' }}>
          NutriGrow — Bitanic Pro V4 © 2026
        </p>
      </div>
    </div>
  );
}
