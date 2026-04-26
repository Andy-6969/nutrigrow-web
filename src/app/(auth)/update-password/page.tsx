'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Key, CheckCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      
      if (updateError) throw updateError;
      
      setSuccess(true);
      // Redirect to dashboard after a few seconds
      setTimeout(() => {
        router.replace('/overview');
      }, 3000);
    } catch (err: any) {
      setError('Gagal memperbarui password: ' + err.message);
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
        </div>

        {/* Card */}
        <div
          className="glass-heavy p-8 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          {!success ? (
            <>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: 'var(--surface-text)' }}
              >
                Buat Password Baru
              </h2>
              <p className="text-xs mb-6" style={{ color: 'var(--surface-text-muted)' }}>
                Silakan masukkan password baru untuk akun Anda.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-danger-50 border border-danger-500/20 text-danger-600 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: 'var(--surface-text)' }}
                  >
                    Password Baru
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pl-10 pr-10 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:shadow-lg"
                      style={{
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(8px)',
                        border: 'var(--glass-border)',
                        color: 'var(--surface-text)',
                      }}
                    />
                    <Key
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--surface-text-muted)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 transition-colors"
                      style={{ color: 'var(--surface-text-muted)' }}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || password.length < 6}
                  className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold rounded-xl text-sm hover:from-primary-600 hover:to-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl glow-sm hover:glow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Simpan Password
                      <ArrowRight className="w-4 h-4" />
                    </>
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
                Password Diperbarui!
              </h2>
              <p className="text-xs mb-6 leading-relaxed" style={{ color: 'var(--surface-text-muted)' }}>
                Password Anda telah berhasil diubah. Mengalihkan ke dashboard...
              </p>
              <div className="flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              </div>
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
