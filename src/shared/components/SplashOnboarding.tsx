'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Leaf, Wifi, BarChart3, ChevronRight, ChevronLeft,
  Droplets, CloudRain, Radio, ToggleRight, ArrowRight,
  Cpu, Zap, Activity,
} from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import CollageSplashScreen from './CollageSplashScreen';

/* ─────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────── */
const STORAGE_KEY = 'nutrigrow_onboarding_done';

const ONBOARDING_SLIDES = [
  {
    id: 1,
    icon: <CloudRain size={36} className="text-emerald-400" />,
    accentIcon: <Droplets size={16} className="text-cyan-400" />,
    badge: 'SMART DELAY',
    title: 'Irigasi Cerdas\nTanpa Pemborosan',
    subtitle:
      'Terintegrasi dengan API cuaca untuk fitur Smart Delay. Sistem akan menunda penyiraman otomatis secara cerdas saat hujan diprediksi turun, menjaga akurasi dosis pupuk dan efisiensi air.',
    image: '/onboarding-1.png',
    gradient: 'from-cyan-500/20 to-emerald-500/10',
    dotColor: 'bg-cyan-400',
  },
  {
    id: 2,
    icon: <Radio size={36} className="text-emerald-400" />,
    accentIcon: <Wifi size={16} className="text-emerald-400" />,
    badge: 'LoRa P2P',
    title: 'Pemantauan Stabil\ndi Area Blank Spot',
    subtitle:
      'Memanfaatkan arsitektur Edge Computing dan komunikasi nirkabel LoRa Point-to-Point. Sensor di lapangan akan terus mengakuisisi dan mengirimkan data secara mandiri tanpa terputus masalah sinyal internet.',
    image: '/onboarding-2.png',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    dotColor: 'bg-emerald-400',
  },
  {
    id: 3,
    icon: <BarChart3 size={36} className="text-emerald-400" />,
    accentIcon: <ToggleRight size={16} className="text-emerald-300" />,
    badge: 'ECO-SAVINGS',
    title: 'Pantau Metrik dan\nEfisiensi Bisnis',
    subtitle:
      'Akses dasbor Eco-Savings untuk memvisualisasikan efisiensi sumber daya secara intuitif. Ambil alih sistem kapan saja melalui fitur Manual Override dari mana saja.',
    image: '/onboarding-3.png',
    gradient: 'from-emerald-500/20 to-lime-500/10',
    dotColor: 'bg-lime-400',
    isFinal: true,
  },
];

/* ─────────────────────────────────────────────────────
   COMPONENT: ANIMATED CIRCUIT LEAF ICON (SVG)
───────────────────────────────────────────────────── */
function CircuitLeafIcon() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24" fill="none">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="leafG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="70%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id="circuitG" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
          <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Leaf body */}
      <path
        d="M60 15 C80 30, 95 55, 80 80 C65 100, 40 100, 25 80 C10 55, 25 30, 60 15 Z"
        fill="url(#leafG)"
        filter="url(#glow)"
        opacity={0.9}
      />

      {/* Central vein */}
      <path d="M60 18 Q60 55 60 90" stroke="#A7F3D0" strokeWidth="1.5" strokeLinecap="round" />

      {/* Circuit branches */}
      <path d="M60 40 L80 40 L80 30 L90 30" stroke="url(#circuitG)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="90" cy="30" r="3" fill="#10B981" filter="url(#glow)" />

      <path d="M60 55 L75 55 L75 65 L85 65" stroke="url(#circuitG)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="85" cy="65" r="3" fill="#06B6D4" filter="url(#glow)" />

      <path d="M60 45 L42 45 L42 35 L32 35" stroke="url(#circuitG)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="32" cy="35" r="3" fill="#34D399" filter="url(#glow)" />

      <path d="M60 65 L40 65 L40 72 L30 72" stroke="url(#circuitG)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="30" cy="72" r="3" fill="#10B981" filter="url(#glow)" />

      {/* Small squares (circuit pads) */}
      <rect x="55" y="35" width="10" height="6" rx="1" fill="none" stroke="#6EE7B7" strokeWidth="1" opacity="0.6" />
      <rect x="55" y="60" width="10" height="6" rx="1" fill="none" stroke="#6EE7B7" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────
   COMPONENT: SPLASH SCREEN
───────────────────────────────────────────────────── */
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'circuit' | 'text' | 'ready'>('circuit');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 1200);
    const t2 = setTimeout(() => setPhase('ready'), 2400);
    const t3 = setTimeout(onDone, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#060F0C]">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial glow in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full transition-all duration-1000"
            style={{
              width: phase === 'circuit' ? '200px' : '600px',
              height: phase === 'circuit' ? '200px' : '600px',
              background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
              filter: 'blur(60px)',
              opacity: phase === 'circuit' ? 0.3 : 1,
            }}
          />
        </div>

        {/* Animated grid */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'gridDrift 14s linear infinite',
          }}
        />

        {/* Scan sweep */}
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0) 10%, rgba(16,185,129,0.5) 40%, rgba(6,182,212,0.4) 50%, rgba(16,185,129,0.5) 60%, rgba(16,185,129,0) 90%, transparent 100%)',
            boxShadow: '0 0 12px rgba(16,185,129,0.35)',
            animation: 'scanSweep 8s linear infinite',
          }}
        />

        {/* Pulse rings */}
        {[0, 2.5, 5].map((delay, i) => (
          <div
            key={i}
            className="absolute rounded-full border pointer-events-none"
            style={{
              width: '500px', height: '500px',
              top: '50%', left: '50%',
              borderColor:
                i === 0 ? 'rgba(16,185,129,0.08)' : i === 1 ? 'rgba(6,182,212,0.05)' : 'rgba(52,211,153,0.04)',
              animation: 'pulseRing 7s ease-out infinite',
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>

      {/* Circuit leaf icon — entrance */}
      <div
        className="relative z-10 mb-8 transition-all duration-700"
        style={{
          opacity: phase === 'circuit' ? 0 : 1,
          transform: phase === 'circuit' ? 'scale(0.4) rotate(-15deg)' : 'scale(1) rotate(0deg)',
          filter: `drop-shadow(0 0 ${phase === 'ready' ? '24px' : '8px'} rgba(16,185,129,0.6))`,
        }}
      >
        <CircuitLeafIcon />
      </div>

      {/* Animated circuit lines shooting outward */}
      {phase !== 'circuit' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute h-px"
              style={{
                width: phase === 'ready' ? '160px' : '60px',
                background: 'linear-gradient(90deg, rgba(16,185,129,0.6), transparent)',
                transform: `rotate(${i * 45}deg) translateX(60px)`,
                transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      )}

      {/* Texts */}
      <div
        className="relative z-10 text-center flex flex-col items-center gap-3 px-8 transition-all duration-700"
        style={{
          opacity: phase === 'text' || phase === 'ready' ? 1 : 0,
          transform: phase === 'text' || phase === 'ready' ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-px bg-emerald-500/40" />
          <span className="text-[10px] font-bold text-emerald-400/60 tracking-[0.3em] uppercase">
            Bitanic Pro V4
          </span>
          <div className="w-8 h-px bg-emerald-500/40" />
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-[-0.02em] text-[#ECFDF5]">
          NutriGrow <span className="text-emerald-400">Web</span>
        </h1>

        <p className="text-sm text-emerald-300/60 tracking-wider font-medium">
          Smart Fertigation Monitoring
        </p>

        {/* Loading bar */}
        <div
          className="mt-4 w-48 h-0.5 rounded-full bg-emerald-950 overflow-hidden transition-all duration-500"
          style={{ opacity: phase === 'ready' ? 1 : 0 }}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
            style={{
              animation: 'loadBar 1.2s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
          />
        </div>

        <style>{`
          @keyframes loadBar { from { width: 0% } to { width: 100% } }
        `}</style>
      </div>

      {/* Bottom text */}
      <div
        className="absolute bottom-8 text-[10px] text-emerald-500/30 tracking-widest uppercase font-medium transition-opacity duration-700"
        style={{ opacity: phase === 'ready' ? 1 : 0 }}
      >
        Memuat sistem...
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   COMPONENT: ONBOARDING SLIDE
───────────────────────────────────────────────────── */
function OnboardingSlide({
  slide,
  index,
  total,
  onNext,
  onPrev,
  onSkip,
  onEnter,
  isActive,
  direction,
}: {
  slide: (typeof ONBOARDING_SLIDES)[0];
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onEnter: () => void;
  isActive: boolean;
  direction: 'forward' | 'backward';
}) {
  const router = useRouter();

  const handleCTA = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onEnter();
    router.push('/overview');
  };

  return (
    <div
      className={`absolute inset-0 flex flex-col transition-all duration-500 ease-out ${
        isActive
          ? 'opacity-100 translate-x-0 z-10 pointer-events-auto'
          : direction === 'forward'
          ? 'opacity-0 translate-x-8 pointer-events-none'
          : 'opacity-0 -translate-x-8 pointer-events-none'
      }`}
    >
      {/* Top area: image */}
      <div className="relative flex-1 overflow-hidden">
        {/* Gradient overlay on image */}
        <div className={`absolute inset-0 bg-gradient-to-b ${slide.gradient} to-[#060F0C] z-10`} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060F0C] z-10" />



        {/* Skip button — top right */}
        {!slide.isFinal && (
          <button
            onClick={onSkip}
            className="absolute top-6 right-6 z-20 text-xs text-emerald-400/60 hover:text-emerald-300 transition-colors font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full border border-emerald-500/20 hover:border-emerald-500/40 backdrop-blur-sm"
          >
            Lewati
          </button>
        )}

        {/* Badge pill */}
        <div className="absolute top-6 left-6 z-20 flex items-center gap-1.5 bg-[#0D1F1A]/80 border border-emerald-500/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
          {slide.accentIcon}
          <span className="text-[10px] font-bold text-emerald-300 tracking-widest uppercase">
            {slide.badge}
          </span>
        </div>

        {/* Feature icon floating */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0D1F1A]/90 border border-emerald-500/30 flex items-center justify-center backdrop-blur-md shadow-xl shadow-emerald-900/50">
            {slide.icon}
          </div>
        </div>
      </div>

      {/* Bottom area: text + nav */}
      <div className="relative z-10 bg-[#060F0C] px-8 pt-10 pb-8 flex flex-col gap-5">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? `w-6 h-2 ${slide.dotColor}`
                  : 'w-2 h-2 bg-emerald-900/60'
              }`}
            />
          ))}
        </div>

        {/* Text content */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-black text-[#ECFDF5] leading-tight whitespace-pre-line mb-3">
            {slide.title}
          </h2>
          <p className="text-sm text-emerald-300/60 leading-relaxed max-w-md mx-auto">
            {slide.subtitle}
          </p>
        </div>

        {/* Navigation */}
        {slide.isFinal ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCTA}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base tracking-wide transition-all duration-200 hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 group"
            >
              Masuk ke Beranda
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handleCTA}
              className="w-full py-3 rounded-2xl border border-emerald-500/30 text-emerald-300 font-semibold text-sm tracking-wide hover:bg-emerald-950/50 transition-all duration-200"
            >
              Akses Dasbor
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {index > 0 && (
              <button
                onClick={onPrev}
                className="w-12 h-12 rounded-2xl border border-emerald-500/20 bg-emerald-950/40 flex items-center justify-center text-emerald-400 hover:bg-emerald-900/60 transition-all duration-200"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <button
              onClick={onNext}
              className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base tracking-wide transition-all duration-200 hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 group"
            >
              Selanjutnya
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   COMPONENT: ONBOARDING FLOW
───────────────────────────────────────────────────── */
function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const goNext = () => {
    if (currentSlide < ONBOARDING_SLIDES.length - 1) {
      setDirection('forward');
      setCurrentSlide((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (currentSlide > 0) {
      setDirection('backward');
      setCurrentSlide((s) => s - 1);
    }
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[9998] overflow-hidden bg-[#060F0C]">
      {/* Background grid & effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(16,185,129,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.025) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'gridDrift 14s linear infinite',
          }}
        />
        {/* Aurora blobs */}
        <div
          className="absolute top-0 left-0 w-[500px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'aurora1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'aurora2 18s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Slides container */}
      <div className="relative h-full">
        {ONBOARDING_SLIDES.map((slide, i) => (
          <OnboardingSlide
            key={slide.id}
            slide={slide}
            index={i}
            total={ONBOARDING_SLIDES.length}
            onNext={goNext}
            onPrev={goPrev}
            onSkip={skip}
            onEnter={onDone}
            isActive={i === currentSlide}
            direction={direction}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MAIN EXPORT — SplashOnboarding
   Usage: drop <SplashOnboarding /> inside app layout,
   it self-manages visibility via localStorage.
───────────────────────────────────────────────────── */
export default function SplashOnboarding() {
  const [phase, setPhase] = useState<'idle' | 'splash' | 'onboarding' | 'done'>('idle');
  const [autoPlay, setAutoPlay] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    // Always start with the splash screen on fresh mount
    setPhase('splash');
  }, []);

  useEffect(() => {
    const onboardingDone = localStorage.getItem(STORAGE_KEY) === 'true';
    const isLoggedIn = !!session;
    setAutoPlay(isLoggedIn || onboardingDone);
  }, [session]);

  const handleSplashDone = () => {
    const onboardingDone = localStorage.getItem(STORAGE_KEY) === 'true';
    const isLoggedIn = !!session;

    if (isLoggedIn || onboardingDone) {
      setPhase('done');
    } else {
      setPhase('onboarding');
    }
  };

  if (phase === 'idle' || phase === 'done') return null;

  return (
    <>
      {phase === 'splash' && (
        <CollageSplashScreen onComplete={handleSplashDone} autoPlay={autoPlay} />
      )}
      {phase === 'onboarding' && (
        <OnboardingFlow onDone={() => setPhase('done')} />
      )}
    </>
  );
}
