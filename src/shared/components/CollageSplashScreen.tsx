import React, { useEffect, useState } from 'react';
import { Leaf, Play, Sparkles, ArrowRight } from 'lucide-react';

interface CollageSplashScreenProps {
  onComplete?: () => void;
}

export default function CollageSplashScreen({ onComplete }: CollageSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const handleStart = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 800); // match fade-out duration
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#060F0C] overflow-hidden select-none transition-all duration-700 ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* CSS Keyframes declaration */}
      <style>{`
        @keyframes rotateRingSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rotateRingCounter {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes popUpCutout {
          0% { transform: scale(0) translateY(120px) rotate(-15deg); opacity: 0; }
          65% { transform: scale(1.1) translateY(-15px) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) translateY(0) rotate(-3deg); }
        }
        @keyframes slideInLeft {
          0% { transform: translateX(-80px) rotate(-5deg); opacity: 0; }
          100% { transform: translateX(0) rotate(0deg); opacity: 1; }
        }
        @keyframes slideInRight {
          0% { transform: translateX(80px) rotate(5deg); opacity: 0; }
          100% { transform: translateX(0) rotate(0deg); opacity: 1; }
        }
        @keyframes pulseGlow {
          0% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes floatEffect {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-10px) rotate(-1deg); }
        }
        .animate-rotate-slow {
          animation: rotateRingSlow 25s linear infinite;
        }
        .animate-rotate-counter {
          animation: rotateRingCounter 20s linear infinite;
        }
        .animate-popup-cutout {
          animation: popUpCutout 1.1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-slide-left {
          animation: slideInLeft 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-right {
          animation: slideInRight 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s infinite ease-in-out;
        }
        .animate-float {
          animation: floatEffect 4s ease-in-out infinite;
        }
      `}</style>

      {/* Dashboard-Style HUD Background Layer */}
      <div className="absolute inset-0 bg-[#060F0C] overflow-hidden pointer-events-none">
        {/* Auroras (Glowing ambient lights) */}
        <div 
          className="absolute rounded-full"
          style={{
            top: '10%', left: '15%', width: '700px', height: '400px',
            background: 'radial-gradient(ellipse, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
            filter: 'blur(90px)',
            animation: 'aurora1 25s ease-in-out infinite',
          }} 
        />
        <div 
          className="absolute rounded-full"
          style={{
            bottom: '10%', right: '10%', width: '650px', height: '350px',
            background: 'radial-gradient(ellipse, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'aurora2 22s ease-in-out infinite reverse',
          }} 
        />
        {/* Center Green glow behind the Leaf collage */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: '500px', height: '500px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, transparent 65%)',
            filter: 'blur(50px)',
          }} 
        />

        {/* Large Subtle Glowing Grid */}
        <div 
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.025) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'gridDrift 14s linear infinite',
          }} 
        />

        {/* Scan Sweep lines (cinematic HUD) */}
        <div 
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0) 10%, rgba(16, 185, 129, 0.5) 35%, rgba(6, 182, 212, 0.4) 50%, rgba(16, 185, 129, 0.5) 65%, rgba(16, 185, 129, 0) 90%, transparent 100%)',
            boxShadow: '0 0 14px rgba(16, 185, 129, 0.35)',
            animation: 'scanSweep 10s linear infinite',
          }} 
        />
        
        {/* Floating pulse rings in background */}
        {[0, 2, 4].map((delay, i) => (
          <div 
            key={i} 
            className="absolute rounded-full border pointer-events-none"
            style={{
              width: '600px', height: '600px',
              top: '50%', left: '50%',
              borderColor: i === 0 ? 'rgba(16, 185, 129, 0.06)' : i === 1 ? 'rgba(6, 182, 212, 0.05)' : 'rgba(99, 102, 241, 0.04)',
              animation: `pulseRing 7s ease-out infinite`,
              animationDelay: `${delay}s`,
            }} 
          />
        ))}
      </div>

      {/* Rotating tech rings (retained for high-energy collage style) */}
      <div className="absolute w-[450px] h-[450px] rounded-full border border-dashed border-emerald-500/15 animate-rotate-slow pointer-events-none z-0" />
      <div className="absolute w-[380px] h-[380px] rounded-full border-2 border-emerald-500/20 border-t-emerald-400/40 border-b-emerald-400/40 animate-rotate-counter pointer-events-none z-0" />

      {/* Splash Screen Container */}
      <div className="relative w-full max-w-[420px] h-full max-h-[820px] flex flex-col justify-between items-center px-6 py-12">
        
        {/* TOP HEADER: Curved Text & Subtitle */}
        <div className="w-full flex flex-col items-center mt-4 z-10">
          {/* Curved SVG Text Path matching the sport reference */}
          <svg viewBox="0 0 300 100" className="w-64 h-24 overflow-visible">
            <path 
              id="textPathCurve" 
              d="M 20 80 A 130 130 0 0 1 280 80" 
              fill="none" 
            />
            <text className="fill-emerald-400/80 font-black text-sm tracking-[0.25em] uppercase font-sans">
              <textPath href="#textPathCurve" startOffset="50%" textAnchor="middle">
                • Grow Smart • Live Green •
              </textPath>
            </text>
          </svg>

          {/* Subtitle */}
          <div className="animate-slide-left opacity-0 [animation-delay:400ms] bg-emerald-950/60 border border-emerald-500/30 px-4 py-1.5 rounded-full flex items-center gap-1.5 -mt-6">
            <Sparkles size={12} className="text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-[10px] font-bold text-emerald-200 tracking-widest uppercase">
              SMART FERTIGATION SYSTEM
            </span>
          </div>
        </div>

        {/* CENTER CUTOUT COLLAGE - Dynamic Plant sprout Sticker */}
        <div className="relative flex-1 w-full flex items-center justify-center my-6">
          
          {/* Background Abstract Shapes (Grungy/Collage design style) */}
          <div className="absolute w-64 h-64 bg-emerald-500/5 rounded-full border border-emerald-500/10 pointer-events-none" />
          
          {/* Halftone graphic circle overlay */}
          <div 
            className="absolute w-48 h-48 opacity-[0.25] rounded-full pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#10B981 3px, transparent 3px)',
              backgroundSize: '12px 12px',
            }}
          />

          {/* The Collage Sticker - Plant Sprout with thick white stroke & drop shadow */}
          <div className="relative z-10 animate-popup-cutout opacity-0 [animation-delay:200ms] hover:scale-105 transition-transform duration-300">
            {/* Float container */}
            <div className="animate-float">
              {/* Outer stroke/border sticker wrapper */}
              <div className="bg-[#ECFDF5] p-3 rounded-[40px] shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-[5px] border-emerald-500/30 flex items-center justify-center rotate-[3deg]">
                
                {/* Inner Collage Box (High contrast photo-like rendering) */}
                <div className="bg-[#051F14] p-6 rounded-[32px] border border-emerald-400/20 flex flex-col items-center">
                  
                  {/* Bitanic Logo rendering */}
                  <img 
                    src="/logo-bitanic-round.png" 
                    alt="Bitanic Logo" 
                    className="w-32 h-32 object-contain rounded-full drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                  />
                  
                  <div className="mt-3 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">SYSTEM ACTIVE</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: Typography & Pulse Let's Go Button */}
        <div className="w-full flex flex-col items-center gap-6 z-10">
          
          {/* Bold Collage Headings */}
          <div className="flex flex-col items-center">
            {/* "Live Sports Now" Style for NutriGrow */}
            <h2 className="animate-slide-left opacity-0 [animation-delay:600ms] text-4xl font-black text-[#ECFDF5] uppercase tracking-tighter leading-none italic">
              NUTRIGROW
            </h2>
            <h3 className="animate-slide-right opacity-0 [animation-delay:800ms] text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 uppercase tracking-wide leading-none italic mt-1">
              MONITOR NOW
            </h3>
          </div>

          {/* Circular Pulse CTA Button matching reference "Let's Go" */}
          <button 
            onClick={handleStart}
            className="animate-popup-cutout opacity-0 [animation-delay:1000ms] group relative w-24 h-24 rounded-full bg-emerald-600 border border-emerald-400/40 flex flex-col items-center justify-center text-center animate-pulse-glow hover:bg-emerald-500 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            {/* Outer spinning dash ring around button */}
            <div className="absolute -inset-2 rounded-full border border-dashed border-emerald-500/40 group-hover:animate-spin pointer-events-none" style={{ animationDuration: '6s' }} />
            
            <span className="text-[11px] font-black text-white uppercase tracking-widest">
              LET'S
            </span>
            <span className="text-[15px] font-black text-emerald-200 uppercase tracking-tight -mt-0.5">
              GROW
            </span>
            <ArrowRight size={14} className="text-white mt-1 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Footer branding */}
          <span className="text-[9px] text-emerald-500/40 uppercase tracking-widest font-semibold mt-2">
            BITANIC PRO V1.0 © 2026
          </span>
        </div>

      </div>
    </div>
  );
}
