'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Leaf, Wifi, BarChart3, ChevronRight, ChevronLeft,
  Droplets, CloudRain, Radio, ToggleRight, ArrowRight,
  Cpu, Zap, Activity,
} from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';

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

      {/* Bitanic Logo — entrance */}
      <div
        className="relative z-10 mb-8 transition-all duration-700"
        style={{
          opacity: phase === 'circuit' ? 0 : 1,
          transform: phase === 'circuit' ? 'scale(0.4) rotate(-15deg)' : 'scale(1) rotate(0deg)',
        }}
      >
        <img 
          src="/logo-bitanic-round.png" 
          alt="Bitanic Logo" 
          className="w-24 h-24 object-contain animate-logo-breath"
          style={{
            filter: `drop-shadow(0 0 ${phase === 'ready' ? '24px' : '8px'} rgba(16,185,129,0.6))`,
          }}
        />
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
          @keyframes logoBreath {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
          }
          .animate-logo-breath {
            animation: logoBreath 3s ease-in-out infinite;
          }
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
   COMPONENTS: CUSTOM PREMIUM SVG ANIMATIONS (Lottie Alternatives)
───────────────────────────────────────────────────── */
function AnimatedSmartDelay() {
  return (
    <div className="relative w-full max-w-[280px] h-[280px] flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        <defs>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id="groundGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#064E3B" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
        </defs>

        {/* Outer Tech Radar Rings */}
        <circle cx="100" cy="100" r="85" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="100" cy="100" r="70" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1.5" />
        
        {/* Orbital Node */}
        <circle cx="100" cy="100" r="70" fill="none" />
        <circle cx="30" cy="100" r="3" fill="#22D3EE" filter="url(#glow-cyan)" className="animate-orbit" style={{ transformOrigin: '100px 100px' }} />

        {/* Rain Drops */}
        <g opacity="0.8">
          <line x1="85" y1="90" x2="80" y2="115" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" className="animate-rain-1" />
          <line x1="100" y1="95" x2="95" y2="120" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" className="animate-rain-2" />
          <line x1="115" y1="90" x2="110" y2="115" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" className="animate-rain-3" />
        </g>

        {/* Cloud Body */}
        <path 
          d="M70 85 A18 18 0 0 1 100 75 A22 22 0 0 1 135 80 A18 18 0 0 1 130 98 L70 98 A15 15 0 0 1 70 85 Z" 
          fill="url(#cloudGrad)" 
          filter="url(#glow-cyan)"
          className="animate-float" 
        />
        
        {/* Cloud Details */}
        <path d="M85 88 Q90 85 95 88" stroke="#E0F2FE" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <path d="M105 88 Q110 85 115 88" stroke="#E0F2FE" strokeWidth="1" strokeLinecap="round" opacity="0.6" />

        {/* Rain Barrier / Smart Delay HUD */}
        <path d="M60 125 C80 115, 120 115, 140 125" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow-cyan)" className="animate-barrier" />
        
        {/* Dotted target beneath */}
        <ellipse cx="100" cy="155" rx="40" ry="10" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" strokeDasharray="3 3" />
        
        {/* Ground Plants / Soil */}
        <path d="M50 160 Q100 150 150 160" stroke="url(#groundGrad)" strokeWidth="3" strokeLinecap="round" />
        
        {/* Signal Waves from Ground */}
        <ellipse cx="100" cy="155" rx="20" ry="5" stroke="#10B981" strokeWidth="1" className="animate-soil-wave" />
        <ellipse cx="100" cy="155" rx="35" ry="8.7" stroke="#10B981" strokeWidth="1" className="animate-soil-wave" style={{ animationDelay: '0.8s' }} />

        {/* Mini Plant Shoots */}
        <path d="M75 156 Q73 148 70 146 Q74 148 76 156" fill="#34D399" />
        <path d="M125 156 Q127 148 130 146 Q126 148 124 156" fill="#34D399" />
        <path d="M100 153 Q99 143 95 140 Q101 144 100 153" fill="#059669" filter="url(#glow-cyan)" />

        {/* Weather Forecast Badge Overlay */}
        <g className="animate-float" style={{ animationDelay: '-1s' }}>
          <rect x="110" y="40" width="60" height="22" rx="6" fill="#0D1F1A" stroke="#22D3EE" strokeWidth="1" />
          <text x="140" y="54" fill="#22D3EE" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">95% RAIN</text>
        </g>
        
        <g className="animate-float" style={{ animationDelay: '-2s' }}>
          <rect x="30" y="45" width="65" height="22" rx="6" fill="#0D1F1A" stroke="#10B981" strokeWidth="1" />
          <text x="62.5" y="59" fill="#10B981" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">SMART DELAY</text>
        </g>
      </svg>
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes rain {
          0% { stroke-dashoffset: 0; opacity: 0; transform: translateY(-10px); }
          30% { opacity: 0.8; }
          60% { opacity: 0.4; }
          100% { stroke-dashoffset: -30; opacity: 0; transform: translateY(20px); }
        }
        @keyframes barrierPulse {
          0%, 100% { opacity: 0.8; stroke-width: 2.5; filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.5)); }
          50% { opacity: 1; stroke-width: 3.5; filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8)); }
        }
        @keyframes soilWave {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-orbit {
          animation: orbit 10s linear infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-rain-1 {
          stroke-dasharray: 8 20;
          animation: rain 1.5s linear infinite;
        }
        .animate-rain-2 {
          stroke-dasharray: 8 20;
          animation: rain 1.5s linear infinite;
          animation-delay: 0.5s;
        }
        .animate-rain-3 {
          stroke-dasharray: 8 20;
          animation: rain 1.5s linear infinite;
          animation-delay: 1s;
        }
        .animate-barrier {
          animation: barrierPulse 2s ease-in-out infinite;
        }
        .animate-soil-wave {
          transform-origin: 100px 155px;
          animation: soilWave 2.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
      `}</style>
    </div>
  );
}

function AnimatedLoRa() {
  return (
    <div className="relative w-full max-w-[280px] h-[280px] flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        <defs>
          <filter id="glow-emerald" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="towerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>
        </defs>

        {/* Tech grid ring background */}
        <circle cx="100" cy="110" r="80" stroke="rgba(16, 185, 129, 0.08)" strokeWidth="1" />
        <circle cx="100" cy="110" r="50" stroke="rgba(16, 185, 129, 0.05)" strokeWidth="1" strokeDasharray="3 3" />

        {/* Signal Lines to Remote Nodes */}
        <line x1="100" y1="70" x2="40" y2="120" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="100" y1="70" x2="160" y2="120" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="100" y1="70" x2="60" y2="155" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="100" y1="70" x2="140" y2="155" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1.5" strokeDasharray="4 4" />

        {/* Data Packets traveling along lines */}
        <circle cx="40" cy="120" r="3" fill="#34D399" filter="url(#glow-emerald)" className="animate-packet-1" />
        <circle cx="160" cy="120" r="3" fill="#34D399" filter="url(#glow-emerald)" className="animate-packet-2" />
        <circle cx="60" cy="155" r="3" fill="#10B981" filter="url(#glow-emerald)" className="animate-packet-3" />
        <circle cx="140" cy="155" r="3" fill="#10B981" filter="url(#glow-emerald)" className="animate-packet-4" />

        {/* Central Gateway Tower */}
        <path d="M90 140 L100 65 L110 140" stroke="url(#towerGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="94" y1="110" x2="106" y2="110" stroke="#10B981" strokeWidth="1.5" />
        <line x1="97" y1="85" x2="103" y2="85" stroke="#10B981" strokeWidth="1.5" />
        
        {/* Transmitter Head */}
        <circle cx="100" cy="65" r="8" fill="#0D1F1A" stroke="#34D399" strokeWidth="2" />
        <circle cx="100" cy="65" r="3" fill="#34D399" filter="url(#glow-emerald)" className="animate-pulse-node" />

        {/* Concentric Signal Pulse Waves */}
        <path d="M85 58 A20 20 0 0 1 115 58" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" className="animate-signal-wave-1" />
        <path d="M75 51 A32 32 0 0 1 125 51" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" className="animate-signal-wave-2" />
        <path d="M65 44 A44 44 0 0 1 135 44" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" className="animate-signal-wave-3" />

        {/* Ground Platform */}
        <ellipse cx="100" cy="140" rx="30" ry="6" fill="#0D1F1A" stroke="#064E3B" strokeWidth="2" />

        {/* Node Device Icons at remote ends */}
        <circle cx="40" cy="120" r="10" fill="#0D1F1A" stroke="#34D399" strokeWidth="1.5" />
        <circle cx="40" cy="120" r="3" fill="#34D399" />
        
        <circle cx="160" cy="120" r="10" fill="#0D1F1A" stroke="#34D399" strokeWidth="1.5" />
        <circle cx="160" cy="120" r="3" fill="#34D399" />
        
        <circle cx="60" cy="155" r="10" fill="#0D1F1A" stroke="#10B981" strokeWidth="1.5" />
        <circle cx="60" cy="155" r="3" fill="#10B981" />
        
        <circle cx="140" cy="155" r="10" fill="#0D1F1A" stroke="#10B981" strokeWidth="1.5" />
        <circle cx="140" cy="155" r="3" fill="#10B981" />

        {/* LoRa HUD Info Card overlay */}
        <g className="animate-float-card">
          <rect x="45" y="15" width="110" height="20" rx="5" fill="#0D1F1A" stroke="#34D399" strokeWidth="1" />
          <circle cx="57" cy="25" r="2.5" fill="#34D399" className="animate-blink" />
          <text x="66" y="27.2" fill="#E0F2FE" fontSize="6.5" fontWeight="bold" textAnchor="start" fontFamily="sans-serif">LORA P2P: CONNECTED</text>
        </g>
      </svg>
      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes signalPulse {
          0% { opacity: 0.2; transform: scale(0.9); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: scale(1.15); }
        }
        @keyframes blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes packet1 {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(60px, -50px); opacity: 0; }
        }
        @keyframes packet2 {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(-60px, -50px); opacity: 0; }
        }
        @keyframes packet3 {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(40px, -85px); opacity: 0; }
        }
        @keyframes packet4 {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate(-40px, -85px); opacity: 0; }
        }
        .animate-float-card {
          animation: floatCard 3s ease-in-out infinite;
        }
        .animate-blink {
          animation: blink 1s ease-in-out infinite;
        }
        .animate-pulse-node {
          animation: blink 1.2s ease-in-out infinite;
        }
        .animate-signal-wave-1 {
          transform-origin: 100px 65px;
          animation: signalPulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .animate-signal-wave-2 {
          transform-origin: 100px 65px;
          animation: signalPulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          animation-delay: 0.6s;
        }
        .animate-signal-wave-3 {
          transform-origin: 100px 65px;
          animation: signalPulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          animation-delay: 1.2s;
        }
        .animate-packet-1 {
          animation: packet1 2s linear infinite;
        }
        .animate-packet-2 {
          animation: packet2 2s linear infinite;
          animation-delay: 0.5s;
        }
        .animate-packet-3 {
          animation: packet3 2.5s linear infinite;
          animation-delay: 0.8s;
        }
        .animate-packet-4 {
          animation: packet4 2.5s linear infinite;
          animation-delay: 1.3s;
        }
      `}</style>
    </div>
  );
}

function AnimatedEcoSavings() {
  return (
    <div className="relative w-full max-w-[280px] h-[280px] flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
        <defs>
          <filter id="glow-lime" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A3E635" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>

        {/* Tech HUD Ring Gauge */}
        <circle cx="100" cy="100" r="75" stroke="rgba(163, 230, 53, 0.1)" strokeWidth="8" />
        
        {/* Animated Dash Progress Ring */}
        <circle 
          cx="100" 
          cy="100" 
          r="75" 
          stroke="url(#circleGrad)" 
          strokeWidth="6" 
          strokeLinecap="round"
          strokeDasharray="471" 
          strokeDashoffset="120"
          className="animate-gauge"
          filter="url(#glow-lime)"
        />

        {/* Tech Grid / Crosshairs inside */}
        <line x1="100" y1="35" x2="100" y2="45" stroke="rgba(163, 230, 53, 0.3)" strokeWidth="1" />
        <line x1="100" y1="155" x2="100" y2="165" stroke="rgba(163, 230, 53, 0.3)" strokeWidth="1" />
        <line x1="35" y1="100" x2="45" y2="100" stroke="rgba(163, 230, 53, 0.3)" strokeWidth="1" />
        <line x1="155" y1="100" x2="165" y2="100" stroke="rgba(163, 230, 53, 0.3)" strokeWidth="1" />

        {/* Glowing HUD Center Metrics */}
        <circle cx="100" cy="100" r="50" fill="#0D1F1A" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
        
        {/* Growing Plant Sprout inside dashboard */}
        <g transform="translate(100, 115) scale(0.9)">
          <path d="M0 0 Q-5 -15 -2 -25 Q1 -35 5 -40" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M-2 -25 Q-15 -30 -12 -15 Q-5 -15 -2 -25" fill="#A3E635" filter="url(#glow-lime)" />
          <path d="M1 -33 Q12 -38 12 -23 Q5 -23 1 -33" fill="#10B981" />
        </g>

        {/* Rotating outer indicator dots */}
        <circle cx="100" cy="100" r="85" stroke="none" fill="none" />
        <circle cx="100" cy="15" r="4" fill="#A3E635" filter="url(#glow-lime)" className="animate-indicator-rotate" style={{ transformOrigin: '100px 100px' }} />

        {/* Dashboard floating bar charts */}
        <g className="animate-chart-float" opacity="0.9">
          <rect x="25" y="125" width="50" height="35" rx="4" fill="#0D1F1A" stroke="#10B981" strokeWidth="1" />
          <rect x="35" y="148" width="6" height="6" fill="#10B981" className="animate-bar-1" />
          <rect x="45" y="142" width="6" height="12" fill="#34D399" className="animate-bar-2" />
          <rect x="55" y="136" width="6" height="18" fill="#A3E635" className="animate-bar-3" />
        </g>

        {/* Resource Efficiency HUD overlay */}
        <g className="animate-chart-float" style={{ animationDelay: '-1.5s' }} opacity="0.9">
          <rect x="125" y="125" width="55" height="35" rx="4" fill="#0D1F1A" stroke="#A3E635" strokeWidth="1" />
          <text x="152.5" y="140" fill="#A3E635" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">+34%</text>
          <text x="152.5" y="152" fill="#86EFAC" fontSize="6.5" fontWeight="semibold" textAnchor="middle" fontFamily="sans-serif">EFFICIENCY</text>
        </g>
      </svg>
      <style>{`
        @keyframes rotateIndicator {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gaugePulse {
          0%, 100% { stroke-dashoffset: 120; opacity: 0.9; }
          50% { stroke-dashoffset: 70; opacity: 1; filter: drop-shadow(0 0 6px rgba(163, 230, 53, 0.7)); }
        }
        @keyframes chartFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes growBar {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.3); }
        }
        .animate-indicator-rotate {
          animation: rotateIndicator 12s linear infinite;
        }
        .animate-gauge {
          transform: rotate(-90deg);
          transform-origin: 100px 100px;
          animation: gaugePulse 4s ease-in-out infinite;
        }
        .animate-chart-float {
          animation: chartFloat 3s ease-in-out infinite;
        }
        .animate-bar-1 {
          transform-origin: 35px 154px;
          animation: growBar 2s ease-in-out infinite;
        }
        .animate-bar-2 {
          transform-origin: 45px 154px;
          animation: growBar 2s ease-in-out infinite;
          animation-delay: 0.4s;
        }
        .animate-bar-3 {
          transform-origin: 55px 154px;
          animation: growBar 2s ease-in-out infinite;
          animation-delay: 0.8s;
        }
      `}</style>
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

  const handleLogin = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onEnter();
    router.push('/login');
  };

  const handleRegister = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onEnter();
    router.push('/register');
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

        {/* Animated Custom SVG Alternative */}
        <div className="absolute inset-0 flex items-center justify-center p-8 z-[12]">
          {slide.id === 1 && <AnimatedSmartDelay />}
          {slide.id === 2 && <AnimatedLoRa />}
          {slide.id === 3 && <AnimatedEcoSavings />}
        </div>




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
              onClick={handleLogin}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base tracking-wide transition-all duration-200 hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 group"
            >
              Login
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handleRegister}
              className="w-full py-3 rounded-2xl border border-emerald-500/30 text-emerald-300 font-semibold text-sm tracking-wide hover:bg-emerald-950/50 transition-all duration-200"
            >
              Register
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
  const { session, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;

    // Only initialize the phase once on mount
    setPhase((prev) => {
      if (prev !== 'idle') return prev;

      // Check if splash was already shown in this browser session
      const sessionSplashShown = typeof window !== 'undefined' && sessionStorage.getItem('ng_session_splash_shown') === 'true';
      if (sessionSplashShown) {
        const onboardingDone = localStorage.getItem(STORAGE_KEY) === 'true';
        const isLoggedIn = !!session;
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

        if (isLoggedIn || onboardingDone || isDesktop) {
          return 'done';
        }
        return 'onboarding';
      }

      return 'splash';
    });
  }, [isInitialized, session]);

  const handleSplashDone = () => {
    const onboardingDone = localStorage.getItem(STORAGE_KEY) === 'true';
    const isLoggedIn = !!session;
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ng_session_splash_shown', 'true');
    }

    if (isLoggedIn || onboardingDone || isDesktop) {
      if (isDesktop && !onboardingDone) {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
      setPhase('done');
    } else {
      setPhase('onboarding');
    }
  };

  if (phase === 'idle' || phase === 'done') return null;

  return (
    <>
      {phase === 'splash' && (
        <SplashScreen onDone={handleSplashDone} />
      )}
      {phase === 'onboarding' && (
        <OnboardingFlow onDone={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('ng_session_splash_shown', 'true');
          }
          setPhase('done');
        }} />
      )}
    </>
  );
}
