'use client';

import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Sprout, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--surface-bg)' }}
    >
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)' }} />

      <div className="relative z-10 text-center max-w-md mx-auto space-y-8">
        {/* Animated 404 */}
        <div className="relative">
          <p className="text-[120px] font-black leading-none tracking-tighter select-none"
            style={{
              background: 'linear-gradient(135deg, #10b981, #06b6d4, #10b981)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 40px rgba(16,185,129,0.3))',
            }}>
            404
          </p>
          {/* Floating plant icon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-primary-500/10 backdrop-blur-sm border border-primary-500/20 flex items-center justify-center"
            style={{ animation: 'float 3s ease-in-out infinite' }}>
            <Sprout className="w-10 h-10 text-primary-500" />
          </div>
        </div>

        {/* Glass card */}
        <div className="glass p-8 rounded-3xl space-y-4 text-center"
          style={{ animationDelay: '200ms' }}>
          <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--surface-text)' }}>
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--surface-text-muted)' }}>
            Sepertinya lahan yang kamu cari tidak ada, atau mungkin sudah dipindahkan.
            Kembali ke dashboard untuk melanjutkan.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => router.back()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl glass-sm font-medium text-sm hover:scale-105 transition-all"
              style={{ color: 'var(--surface-text-muted)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
            <button
              onClick={() => router.push('/overview')}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-[0.98]"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-xs" style={{ color: 'var(--surface-text-subtle)' }}>
          NutriGrow · Smart Fertigation System
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50%       { transform: translate(-50%, -50%) translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
