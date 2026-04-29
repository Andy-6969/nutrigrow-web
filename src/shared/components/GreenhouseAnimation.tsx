'use client';

import { useEffect, useRef } from 'react';

export default function GreenhouseAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Particle effect: floating water droplets
    const container = containerRef.current;
    if (!container) return;

    const createParticle = () => {
      const particle = document.createElement('div');
      const size = Math.random() * 4 + 2;
      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, #67e8f9, #06b6d4);
        border-radius: 50%;
        left: ${20 + Math.random() * 60}%;
        bottom: 20%;
        opacity: 0;
        pointer-events: none;
        animation: floatUp ${2 + Math.random() * 2}s ease-out forwards;
        z-index: 20;
      `;
      container.appendChild(particle);
      setTimeout(() => particle.remove(), 4000);
    };

    const interval = setInterval(createParticle, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
      style={{ perspective: '900px' }}
    >
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 0; transform: translateY(0) scale(1); }
          20%  { opacity: 0.8; }
          100% { opacity: 0; transform: translateY(-120px) scale(0.3) translateX(${Math.random() > 0.5 ? '' : '-'}${Math.floor(Math.random() * 30)}px); }
        }

        @keyframes plantSway {
          0%, 100% { transform: rotate(-2deg) scaleY(1); }
          50%       { transform: rotate(2deg) scaleY(1.02); }
        }

        @keyframes leafPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50%       { transform: scale(1.08) rotate(3deg); }
        }

        @keyframes scanLine {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(220px); opacity: 0; }
        }

        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 6px #10b981) drop-shadow(0 0 12px #10b98166); }
          50%       { filter: drop-shadow(0 0 14px #10b981) drop-shadow(0 0 28px #10b98188); }
        }

        @keyframes orbitDot {
          from { transform: rotate(0deg) translateX(110px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(110px) rotate(-360deg); }
        }

        @keyframes orbitDot2 {
          from { transform: rotate(120deg) translateX(100px) rotate(-120deg); }
          to   { transform: rotate(480deg) translateX(100px) rotate(-480deg); }
        }

        @keyframes orbitDot3 {
          from { transform: rotate(240deg) translateX(90px) rotate(-240deg); }
          to   { transform: rotate(600deg) translateX(90px) rotate(-600deg); }
        }

        @keyframes rotateScene {
          0%, 100% { transform: rotateX(12deg) rotateY(-8deg); }
          50%       { transform: rotateX(12deg) rotateY(8deg); }
        }

        @keyframes drip {
          0%   { transform: translateY(0) scaleY(1); opacity: 1; }
          60%  { transform: translateY(30px) scaleY(1.8); opacity: 0.8; }
          100% { transform: translateY(60px) scaleY(0.2); opacity: 0; }
        }

        @keyframes pipePulse {
          0%, 100% { stroke: #06b6d4; }
          50%       { stroke: #67e8f9; }
        }

        @keyframes dataFlicker {
          0%, 95%, 100% { opacity: 1; }
          96%, 99% { opacity: 0.4; }
        }

        .scene-rotate { animation: rotateScene 8s ease-in-out infinite; }
        .plant-sway   { animation: plantSway 3s ease-in-out infinite; transform-origin: bottom center; }
        .leaf-pulse   { animation: leafPulse 2.5s ease-in-out infinite; }
        .glow-effect  { animation: glow-pulse 2s ease-in-out infinite; }
        .data-flicker { animation: dataFlicker 5s ease-in-out infinite; }
      `}</style>

      {/* ─── Orbit Data Dots ─────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <div style={{ position: 'relative', width: 0, height: 0 }}>
          {/* dot 1 */}
          <div style={{ position: 'absolute', animation: 'orbitDot 9s linear infinite' }}>
            <div className="bg-emerald-400/90 rounded-full shadow-[0_0_8px_#10b981] data-flicker"
              style={{ width: 8, height: 8, marginLeft: -4, marginTop: -4 }} />
          </div>
          {/* dot 2 */}
          <div style={{ position: 'absolute', animation: 'orbitDot2 12s linear infinite' }}>
            <div className="bg-cyan-400/90 rounded-full shadow-[0_0_8px_#22d3ee]"
              style={{ width: 6, height: 6, marginLeft: -3, marginTop: -3 }} />
          </div>
          {/* dot 3 */}
          <div style={{ position: 'absolute', animation: 'orbitDot3 15s linear infinite' }}>
            <div className="bg-teal-300/80 rounded-full shadow-[0_0_8px_#5eead4]"
              style={{ width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5 }} />
          </div>
        </div>
      </div>

      {/* ─── Scan Line ─────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl">
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent 0%, #10b98144 30%, #10b981 50%, #10b98144 70%, transparent 100%)',
            animation: 'scanLine 4s linear infinite',
          }}
        />
      </div>

      {/* ─── 3D Greenhouse Scene ───────────────────────────── */}
      <div className="scene-rotate" style={{ transformStyle: 'preserve-3d', width: 340, height: 320 }}>
        <svg
          viewBox="0 0 340 320"
          width="340"
          height="320"
          xmlns="http://www.w3.org/2000/svg"
          className="glow-effect"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Floor gradient */}
            <linearGradient id="floorGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>

            {/* Glass panel gradient */}
            <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.06" />
            </linearGradient>

            {/* Glass panel darker */}
            <linearGradient id="glassGrad2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0.04" />
            </linearGradient>

            {/* Roof gradient */}
            <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.08" />
            </linearGradient>

            {/* Plant gradient */}
            <linearGradient id="plantGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Leaf gradient */}
            <radialGradient id="leafGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#059669" />
            </radialGradient>

            {/* Water gradient */}
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.6" />
            </linearGradient>

            {/* Ground soil */}
            <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="softGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── GROUND PLATFORM (Isometric base) ────────────── */}
          <polygon points="170,270 300,210 300,225 170,285 40,225 40,210" fill="#021a12" opacity="0.9" />
          <polygon points="170,270 300,210 170,150 40,210" fill="url(#floorGrad)" stroke="#10b98133" strokeWidth="1" />

          {/* Grid lines on floor */}
          {[0.25, 0.5, 0.75].map((t, i) => (
            <g key={i} opacity="0.2">
              <line x1={40 + (300 - 40) * t} y1={210 - 60 * t} x2={170} y2={270 - 120 * t} stroke="#10b981" strokeWidth="0.8" />
              <line x1={170} y1={150 + 120 * t} x2={300 - (300 - 40) * t} y2={210 - 60 * t} stroke="#10b981" strokeWidth="0.8" />
            </g>
          ))}

          {/* ── SOIL BEDS ────────────────────────────────────── */}
          {/* Left bed */}
          <ellipse cx="120" cy="228" rx="38" ry="14" fill="url(#soilGrad)" stroke="#92400e33" strokeWidth="1" />
          {/* Right bed */}
          <ellipse cx="228" cy="215" rx="38" ry="14" fill="url(#soilGrad)" stroke="#92400e33" strokeWidth="1" />

          {/* ── GREENHOUSE STRUCTURE ─────────────────────────── */}
          {/* Back wall */}
          <polygon points="170,80 260,130 260,210 170,160" fill="url(#glassGrad)" stroke="#67e8f966" strokeWidth="1.2" />
          {/* Left wall */}
          <polygon points="170,80 80,130 80,210 170,160" fill="url(#glassGrad2)" stroke="#67e8f955" strokeWidth="1.2" />

          {/* Glass panels - back wall (grid lines) */}
          {[1, 2].map(i => (
            <line key={i}
              x1={170 + (260 - 170) * (i / 3)} y1={80 + (130 - 80) * (i / 3)}
              x2={170 + (260 - 170) * (i / 3)} y2={160 + (210 - 160) * (i / 3)}
              stroke="#a5f3fc44" strokeWidth="0.8"
            />
          ))}
          {[1, 2].map(i => (
            <line key={i}
              x1={170} y1={80 + (130 - 80) * (i / 3) + (160 - 80) * (i / 3) / 3}
              x2={260} y2={130 + (210 - 130) * (i / 3)}
              stroke="#a5f3fc33" strokeWidth="0.8"
            />
          ))}

          {/* Roof - left panel */}
          <polygon points="170,50 80,110 80,130 170,80" fill="url(#roofGrad)" stroke="#6ee7b788" strokeWidth="1.5" />
          {/* Roof - right panel */}
          <polygon points="170,50 260,110 260,130 170,80" fill="url(#roofGrad)" stroke="#6ee7b7aa" strokeWidth="1.5" />

          {/* Roof ridge line */}
          <line x1="170" y1="50" x2="170" y2="80" stroke="#a7f3d0" strokeWidth="2" filter="url(#glow)" />

          {/* Structure frame lines */}
          <line x1="80" y1="110" x2="80" y2="210" stroke="#34d39966" strokeWidth="1.5" />
          <line x1="260" y1="110" x2="260" y2="210" stroke="#34d39988" strokeWidth="1.5" />
          <line x1="80" y1="210" x2="170" y2="160" stroke="#34d39944" strokeWidth="1" />
          <line x1="260" y1="210" x2="170" y2="160" stroke="#34d39944" strokeWidth="1" />

          {/* ── IRRIGATION PIPES ─────────────────────────────── */}
          {/* Main horizontal pipe */}
          <line x1="100" y1="135" x2="240" y2="135" stroke="#0e7490" strokeWidth="5" strokeLinecap="round" />
          <line x1="100" y1="135" x2="240" y2="135" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round"
            style={{ animation: 'pipePulse 2s ease-in-out infinite' }} />

          {/* Drip nozzles */}
          {[120, 170, 220].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy="135" r="4" fill="#0e7490" stroke="#22d3ee" strokeWidth="1.5" />
              {/* Drip drops */}
              <ellipse cx={x} cy={145 + i * 2} rx="2" ry="3" fill="url(#waterGrad)"
                style={{ animation: `drip ${1.5 + i * 0.4}s ease-in ${i * 0.3}s infinite` }}
                filter="url(#softGlow)"
              />
            </g>
          ))}

          {/* ── PLANTS ────────────────────────────────────────── */}
          {/* Left bed plants */}
          {[100, 118, 136].map((x, i) => {
            const yBase = 228 - i * 3;
            const height = 40 + i * 8;
            return (
              <g key={i} className="plant-sway" style={{ animationDelay: `${i * 0.5}s`, transformOrigin: `${x}px ${yBase}px` }}>
                {/* Stem */}
                <line x1={x} y1={yBase} x2={x} y2={yBase - height} stroke="url(#plantGrad)" strokeWidth="2.5" strokeLinecap="round" />
                {/* Left leaf */}
                <ellipse cx={x - 10} cy={yBase - height * 0.6} rx="12" ry="6" fill="url(#leafGrad)"
                  className="leaf-pulse"
                  style={{ animationDelay: `${i * 0.3}s`, transform: 'rotate(-25deg)', transformOrigin: `${x}px ${yBase - height * 0.6}px` }}
                />
                {/* Right leaf */}
                <ellipse cx={x + 10} cy={yBase - height * 0.75} rx="12" ry="6" fill="url(#leafGrad)"
                  className="leaf-pulse"
                  style={{ animationDelay: `${i * 0.3 + 0.5}s`, transform: 'rotate(25deg)', transformOrigin: `${x}px ${yBase - height * 0.75}px` }}
                />
                {/* Top bud */}
                <circle cx={x} cy={yBase - height} r="5" fill="#6ee7b7" filter="url(#softGlow)" />
              </g>
            );
          })}

          {/* Right bed plants */}
          {[208, 226, 244].map((x, i) => {
            const yBase = 215 - i * 3;
            const height = 36 + i * 10;
            return (
              <g key={i} className="plant-sway" style={{ animationDelay: `${i * 0.7 + 0.3}s`, transformOrigin: `${x}px ${yBase}px` }}>
                <line x1={x} y1={yBase} x2={x} y2={yBase - height} stroke="url(#plantGrad)" strokeWidth="2.5" strokeLinecap="round" />
                <ellipse cx={x - 10} cy={yBase - height * 0.6} rx="11" ry="5.5" fill="url(#leafGrad)"
                  className="leaf-pulse"
                  style={{ animationDelay: `${i * 0.4}s`, transform: 'rotate(-20deg)', transformOrigin: `${x}px ${yBase - height * 0.6}px` }}
                />
                <ellipse cx={x + 11} cy={yBase - height * 0.78} rx="11" ry="5.5" fill="url(#leafGrad)"
                  className="leaf-pulse"
                  style={{ animationDelay: `${i * 0.4 + 0.6}s`, transform: 'rotate(20deg)', transformOrigin: `${x}px ${yBase - height * 0.78}px` }}
                />
                <circle cx={x} cy={yBase - height} r="4.5" fill="#34d399" filter="url(#softGlow)" />
              </g>
            );
          })}

          {/* ── SENSOR NODE (IoT device) ───────────────────────── */}
          <g filter="url(#glow)">
            <rect x="155" y="215" width="30" height="20" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
            <rect x="155" y="215" width="30" height="20" rx="4" fill="#10b98122" />
            {/* LED dots */}
            <circle cx="163" cy="225" r="2.5" fill="#10b981">
              <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="172" cy="225" r="2.5" fill="#22d3ee">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="181" cy="225" r="2.5" fill="#a78bfa">
              <animate attributeName="opacity" values="1;0.3;1" dur="2.2s" repeatCount="indefinite" />
            </circle>
            {/* Antenna */}
            <line x1="170" y1="215" x2="170" y2="204" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="170" cy="202" r="2.5" fill="#10b981">
              <animate attributeName="r" values="2.5;4;2.5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* ── AMBIENT GLOW at bottom ─────────────────────────── */}
          <ellipse cx="170" cy="275" rx="90" ry="12" fill="#10b981" opacity="0.12" />
        </svg>
      </div>

      {/* ─── Corner Data Readouts ─────────────────────────── */}
      <div className="absolute top-4 left-4 z-30 font-mono text-[9px] text-emerald-400/50 data-flicker leading-relaxed pointer-events-none">
        <p>SYS:ONLINE</p>
        <p>NODE:01/01</p>
        <p>TEMP:OK</p>
      </div>
      <div className="absolute top-4 right-4 z-30 font-mono text-[9px] text-cyan-400/50 data-flicker leading-relaxed text-right pointer-events-none"
        style={{ animationDelay: '0.5s' }}>
        <p>IRRIG:ACTIVE</p>
        <p>PUMP:ON</p>
        <p>AI:MONITORING</p>
      </div>
    </div>
  );
}
