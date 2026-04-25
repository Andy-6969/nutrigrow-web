'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import { authService } from '@/shared/services/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.sendPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      setError('Gagal mengirim email: ' + err.message);
    } finally {
      setIsLoading(false);
    }
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

        {/* Card */}
        <div
          className="glass-heavy p-8 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          {!sent ? (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs mb-5 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--surface-text-muted)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Login
              </Link>

              <h2
                className="text-lg font-bold mb-1"
                style={{ color: 'var(--surface-text)' }}
              >
                Lupa Password?
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--surface-text-muted)' }}>
                Masukkan email kamu, kami akan kirimkan link untuk reset password.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-danger-50 border border-danger-500/20 text-danger-600 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--surface-text)' }}
                  >
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@nutrigrow.id"
                      required
                      className="w-full px-4 py-3 pl-10 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:shadow-lg"
                      style={{
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(8px)',
                        border: 'var(--glass-border)',
                        color: 'var(--surface-text)',
                      }}
                    />
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--surface-text-muted)' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-xl text-sm hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl glow-sm hover:glow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Kirim Link Reset Password'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-100 mb-5">
                <CheckCircle className="w-8 h-8 text-success-600" />
              </div>
              <h2
                className="text-lg font-bold mb-2"
                style={{ color: 'var(--surface-text)' }}
              >
                Email Terkirim!
              </h2>
              <p className="text-xs mb-6 leading-relaxed" style={{ color: 'var(--surface-text-muted)' }}>
                Kami sudah mengirimkan link reset password ke{' '}
                <span className="font-semibold" style={{ color: 'var(--surface-text)' }}>
                  {email}
                </span>
                . Cek inbox atau folder spam kamu.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 py-2.5 px-5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl text-sm hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Login
              </Link>
            </div>
          )}
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
