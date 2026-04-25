'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Loader2, User } from 'lucide-react';
import { authService } from '@/shared/services/authService';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    try {
      await authService.loginWithGoogle();
    } catch (err: any) {
      setError('Gagal daftar dengan Google: ' + err.message);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.registerWithEmail(email, password, fullName);

      // Save registered info for quarantine page fallback (session may not exist if email confirm is on)
      if (typeof window !== 'undefined') {
        localStorage.setItem('ng-registered-email', email);
        localStorage.setItem('ng-registered-name', fullName);
      }

      setSuccess(
        'Akun berhasil dibuat! Cek email kamu untuk verifikasi, lalu login.'
      );
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError('Gagal mendaftar: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(8px)',
    border: 'var(--glass-border)',
    color: 'var(--surface-text)',
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--surface-bg)' }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-300/20 blur-3xl animate-float" />
      <div
        className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary-300/15 blur-3xl animate-float"
        style={{ animationDelay: '3s' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + Header */}
        <div
          className="text-center mb-8 opacity-0 animate-fade-in-up"
          style={{ animationFillMode: 'forwards' }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full shadow-xl mb-4 animate-bounce-subtle overflow-hidden">
            <img src="/logo-bitanic.jpg" alt="Bitanic Logo" className="w-full h-full object-cover" />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--surface-text)', fontFamily: 'var(--font-display)' }}
          >
            NutriGrow
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--surface-text-muted)' }}>
            Smart Fertigation Monitoring System
          </p>
        </div>

        {/* Register Card */}
        <div
          className="glass-heavy p-8 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--surface-text)' }}>
            Buat Akun Baru
          </h2>
          <p className="text-xs mb-6" style={{ color: 'var(--surface-text-muted)' }}>
            Daftar untuk mengakses dashboard NutriGrow
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger-50 border border-danger-500/20 text-danger-600 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-success-50 border border-success-500/20 text-success-600 text-xs">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--surface-text)' }}
              >
                Nama Lengkap
              </label>
              <div className="relative">
                <input
                  id="reg-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama lengkap kamu"
                  required
                  className="w-full px-4 py-3 pl-10 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:shadow-lg"
                  style={inputStyle}
                />
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--surface-text-muted)' }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--surface-text)' }}
              >
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@nutrigrow.id"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:shadow-lg"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--surface-text)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:shadow-lg"
                  style={inputStyle}
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

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="reg-confirm-password"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--surface-text)' }}
              >
                Konfirmasi Password
              </label>
              <div className="relative">
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:shadow-lg"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/20 transition-colors"
                  style={{ color: 'var(--surface-text-muted)' }}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !!success}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-xl text-sm hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl glow-sm hover:glow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Buat Akun <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--surface-text-muted)' }}>
              Atau daftar dengan
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
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

          <p className="text-center text-xs mt-6" style={{ color: 'var(--surface-text-muted)' }}>
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              Masuk di sini
            </Link>
          </p>
        </div>

        <p
          className="text-center text-[10px] mt-6 opacity-0 animate-fade-in"
          style={{
            color: 'var(--surface-text-subtle)',
            animationDelay: '500ms',
            animationFillMode: 'forwards',
          }}
        >
          NutriGrow — Bitanic Pro V4 © 2026
        </p>
      </div>
    </div>
  );
}
