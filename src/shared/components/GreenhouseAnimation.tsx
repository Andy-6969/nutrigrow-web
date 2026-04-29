'use client';

import { useEffect, useRef } from 'react';

export type GreenhouseCondition = 'idle' | 'irrigating' | 'fertigating' | 'error' | 'offline' | 'delayed';

interface Props {
  condition?: GreenhouseCondition;
}

// ─── Theme per condition ─────────────────────────────────────────────
const THEMES: Record<GreenhouseCondition, {
  plantColor: string;
  leafTop: string;
  stemColor: string;
  soilColor: string;
  glassStroke: string;
  glassOpacity: number;
  groundColor: string;
  ambientGlow: string;
  showWater: boolean;
  waterColor: string;
  sensorColor: string;
  sensorPulse: string;
  filterGlow: string;
  wilted: boolean;
  flickerSensor: boolean;
  label: string;
  labelColor: string;
}> = {
  idle: {
    plantColor: '#10b981', leafTop: '#6ee7b7', stemColor: '#059669',
    soilColor: '#78350f', glassStroke: '#34d399', glassOpacity: 0.18,
    groundColor: '#064e3b', ambientGlow: '#10b981',
    showWater: true, waterColor: '#67e8f9',
    sensorColor: '#10b981', sensorPulse: '#10b981',
    filterGlow: '0 0 12px #10b98166', wilted: false, flickerSensor: false,
    label: 'NORMAL', labelColor: '#10b981',
  },
  irrigating: {
    plantColor: '#10b981', leafTop: '#6ee7b7', stemColor: '#059669',
    soilColor: '#451a03', glassStroke: '#38bdf8', glassOpacity: 0.22,
    groundColor: '#064e3b', ambientGlow: '#38bdf8',
    showWater: true, waterColor: '#38bdf8',
    sensorColor: '#38bdf8', sensorPulse: '#38bdf8',
    filterGlow: '0 0 18px #38bdf888', wilted: false, flickerSensor: false,
    label: 'IRRIGATING', labelColor: '#38bdf8',
  },
  fertigating: {
    plantColor: '#10b981', leafTop: '#a7f3d0', stemColor: '#059669',
    soilColor: '#451a03', glassStroke: '#a78bfa', glassOpacity: 0.22,
    groundColor: '#064e3b', ambientGlow: '#a78bfa',
    showWater: true, waterColor: '#c4b5fd',
    sensorColor: '#a78bfa', sensorPulse: '#a78bfa',
    filterGlow: '0 0 18px #a78bfa88', wilted: false, flickerSensor: false,
    label: 'FERTIGATING', labelColor: '#a78bfa',
  },
  error: {
    plantColor: '#78350f', leafTop: '#92400e', stemColor: '#451a03',
    soilColor: '#292524', glassStroke: '#f59e0b', glassOpacity: 0.12,
    groundColor: '#1c1917', ambientGlow: '#f59e0b',
    showWater: false, waterColor: '#fbbf24',
    sensorColor: '#ef4444', sensorPulse: '#ef4444',
    filterGlow: '0 0 12px #f59e0b44', wilted: true, flickerSensor: true,
    label: 'DRY / ERROR', labelColor: '#f59e0b',
  },
  offline: {
    plantColor: '#525252', leafTop: '#737373', stemColor: '#404040',
    soilColor: '#292524', glassStroke: '#6b7280', glassOpacity: 0.08,
    groundColor: '#1c1917', ambientGlow: '#6b7280',
    showWater: false, waterColor: '#9ca3af',
    sensorColor: '#ef4444', sensorPulse: '#ef4444',
    filterGlow: '0 0 6px #6b728044', wilted: true, flickerSensor: true,
    label: 'OFFLINE', labelColor: '#9ca3af',
  },
  delayed: {
    plantColor: '#10b981', leafTop: '#6ee7b7', stemColor: '#059669',
    soilColor: '#78350f', glassStroke: '#7dd3fc', glassOpacity: 0.14,
    groundColor: '#064e3b', ambientGlow: '#7dd3fc',
    showWater: false, waterColor: '#7dd3fc',
    sensorColor: '#7dd3fc', sensorPulse: '#7dd3fc',
    filterGlow: '0 0 10px #7dd3fc44', wilted: false, flickerSensor: false,
    label: 'SMART DELAY', labelColor: '#7dd3fc',
  },
};

export default function GreenhouseAnimation({ condition = 'idle' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = THEMES[condition];

  useEffect(() => {
    if (!t.showWater) return;
    const container = containerRef.current;
    if (!container) return;
    const createDrop = () => {
      const drop = document.createElement('div');
      const size = Math.random() * 3 + 2;
      const x = 18 + Math.random() * 64;
      drop.style.cssText = `
        position:absolute; width:${size}px; height:${size}px;
        background:${t.waterColor}; border-radius:50%;
        left:${x}%; bottom:22%; opacity:0; pointer-events:none;
        animation: dropFall ${1.4 + Math.random() * 1}s ease-out forwards;
      `;
      container.appendChild(drop);
      setTimeout(() => drop.remove(), 2500);
    };
    const id = setInterval(createDrop, condition === 'irrigating' ? 250 : 500);
    return () => clearInterval(id);
  }, [condition, t.showWater, t.waterColor]);

  // Plant y positions — wilt offset for dry/offline
  const wilt = t.wilted;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
      style={{ perspective: '900px' }}
    >
      <style>{`
        @keyframes dropFall {
          0%   { opacity:0; transform:translateY(0) scale(1); }
          15%  { opacity:.75; }
          100% { opacity:0; transform:translateY(-90px) scale(.4); }
        }
        @keyframes sway {
          0%,100% { transform:rotate(-2deg) scaleY(1); }
          50%      { transform:rotate(2deg) scaleY(1.02); }
        }
        @keyframes wiltSway {
          0%,100% { transform:rotate(-4deg) scaleY(.95); }
          50%      { transform:rotate(-1deg) scaleY(.93); }
        }
        @keyframes leafPulse {
          0%,100% { transform:scale(1); }
          50%      { transform:scale(1.06); }
        }
        @keyframes sceneRock {
          0%,100% { transform:rotateX(12deg) rotateY(-6deg); }
          50%      { transform:rotateX(12deg) rotateY(6deg); }
        }
        @keyframes sensorBlink {
          0%,49%,51%,100% { opacity:1; }
          50%              { opacity:.1; }
        }
        @keyframes ambientPulse {
          0%,100% { opacity:.12; }
          50%      { opacity:.22; }
        }
        @keyframes pipePulse {
          0%,100% { stroke-width:2; }
          50%      { stroke-width:3; }
        }
        .scene-rock { animation: sceneRock 9s ease-in-out infinite; }
        .plant-sway { animation: sway 3.5s ease-in-out infinite; transform-origin: bottom center; }
        .plant-wilt { animation: wiltSway 4s ease-in-out infinite; transform-origin: bottom center; }
        .leaf-pulse { animation: leafPulse 2.8s ease-in-out infinite; }
        .sensor-blink { animation: sensorBlink 1.2s step-end infinite; }
        .ambient-pulse { animation: ambientPulse 3s ease-in-out infinite; }
      `}</style>

      {/* ─── Status Label ─────────────────────────── */}
      <div
        className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-widest border"
        style={{
          color: t.labelColor,
          borderColor: `${t.labelColor}44`,
          background: `${t.labelColor}10`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {t.label}
      </div>

      {/* ─── 3D Scene ─────────────────────────────── */}
      <div className="scene-rock" style={{ transformStyle: 'preserve-3d', width: 320, height: 310 }}>
        <svg viewBox="0 0 320 310" width="320" height="310" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible', filter: `drop-shadow(${t.filterGlow})` }}>
          <defs>
            <linearGradient id="floorG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={t.groundColor} />
              <stop offset="100%" stopColor="#020a06" />
            </linearGradient>
            <linearGradient id="soilG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.soilColor} />
              <stop offset="100%" stopColor="#1c0a00" />
            </linearGradient>
            <linearGradient id="stemG" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={t.stemColor} />
              <stop offset="100%" stopColor={t.plantColor} />
            </linearGradient>
            <radialGradient id="leafG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={t.leafTop} />
              <stop offset="100%" stopColor={t.plantColor} />
            </radialGradient>
            <linearGradient id="waterG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.waterColor} stopOpacity=".9" />
              <stop offset="100%" stopColor={t.waterColor} stopOpacity=".3" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ── Ground Platform ───────────────── */}
          <polygon points="160,262 286,204 286,218 160,276 34,218 34,204" fill="#020a06" opacity=".9" />
          <polygon points="160,262 286,204 160,146 34,204" fill="url(#floorG)" stroke={`${t.glassStroke}22`} strokeWidth="1" />

          {/* Floor grid */}
          {[0.33, 0.66].map((k,i) => (
            <g key={i} opacity="0.12">
              <line x1={34+(252*k)} y1={204-(58*k)} x2={160} y2={262-(116*k)} stroke={t.glassStroke} strokeWidth=".8"/>
              <line x1={160} y1={146+(116*k)} x2={286-(252*k)} y2={204-(58*k)} stroke={t.glassStroke} strokeWidth=".8"/>
            </g>
          ))}

          {/* Soil Beds */}
          <ellipse cx="112" cy="222" rx="34" ry="12" fill="url(#soilG)" />
          <ellipse cx="215" cy="210" rx="34" ry="12" fill="url(#soilG)" />

          {/* Dry crack lines (error/offline only) */}
          {wilt && <>
            <line x1="100" y1="218" x2="115" y2="228" stroke="#78350f" strokeWidth=".8" opacity=".6"/>
            <line x1="118" y1="215" x2="108" y2="226" stroke="#78350f" strokeWidth=".8" opacity=".6"/>
            <line x1="203" y1="205" x2="218" y2="215" stroke="#78350f" strokeWidth=".8" opacity=".6"/>
          </>}

          {/* ── Greenhouse Structure ───────────── */}
          <polygon points="160,76 244,124 244,204 160,156" fill={t.glassStroke} fillOpacity={t.glassOpacity} stroke={`${t.glassStroke}88`} strokeWidth="1.2" />
          <polygon points="160,76 76,124 76,204 160,156" fill={t.glassStroke} fillOpacity={t.glassOpacity * 0.7} stroke={`${t.glassStroke}66`} strokeWidth="1.2" />

          {/* Glass panels grid */}
          {[1,2].map(i=>(
            <line key={i} x1={160+(84*(i/3))} y1={76+(48*(i/3))} x2={160+(84*(i/3))} y2={156+(48*(i/3))} stroke={`${t.glassStroke}33`} strokeWidth=".8"/>
          ))}
          <line x1="160" y1="116" x2="244" y2="164" stroke={`${t.glassStroke}22`} strokeWidth=".8"/>

          {/* Roof */}
          <polygon points="160,48 76,108 76,124 160,76" fill={t.glassStroke} fillOpacity={t.glassOpacity * 1.2} stroke={`${t.glassStroke}99`} strokeWidth="1.5"/>
          <polygon points="160,48 244,108 244,124 160,76" fill={t.glassStroke} fillOpacity={t.glassOpacity * 1.5} stroke={`${t.glassStroke}bb`} strokeWidth="1.5"/>
          <line x1="160" y1="48" x2="160" y2="76" stroke={t.leafTop} strokeWidth="2" filter="url(#glow)" opacity=".8"/>

          {/* Frame */}
          <line x1="76" y1="108" x2="76" y2="204" stroke={`${t.glassStroke}55`} strokeWidth="1.5"/>
          <line x1="244" y1="108" x2="244" y2="204" stroke={`${t.glassStroke}77`} strokeWidth="1.5"/>

          {/* ── Irrigation Pipe ───────────────── */}
          <line x1="96" y1="130" x2="224" y2="130" stroke="#0e7490" strokeWidth="4" strokeLinecap="round" opacity={t.showWater ? 1 : 0.3}/>
          {t.showWater && (
            <line x1="96" y1="130" x2="224" y2="130" stroke={t.waterColor} strokeWidth="1.5" strokeLinecap="round"
              style={{ animation: 'pipePulse 1.8s ease-in-out infinite' }}/>
          )}

          {/* Nozzles */}
          {[116, 160, 204].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy="130" r="3.5" fill="#0e7490" stroke={t.showWater ? t.waterColor : '#374151'} strokeWidth="1.2"/>
              {t.showWater && (
                <ellipse cx={x} cy={140} rx="1.5" ry="2.5" fill="url(#waterG)"
                  style={{ animation: `dropFall ${1.2+i*0.3}s ease-in ${i*0.25}s infinite` }}
                  filter="url(#glow)"
                />
              )}
            </g>
          ))}

          {/* ── Plants (Left Bed) ─────────────── */}
          {[96, 112, 128].map((x, i) => {
            const yBase = 222 - i * 3;
            const h = wilt ? 22 + i*5 : 34 + i*7;
            const cls = wilt ? 'plant-wilt' : 'plant-sway';
            return (
              <g key={i} className={cls} style={{ animationDelay: `${i*0.5}s`, transformOrigin: `${x}px ${yBase}px` }}>
                <line x1={x} y1={yBase} x2={x} y2={yBase-h} stroke="url(#stemG)" strokeWidth={wilt ? '1.5' : '2.2'} strokeLinecap="round"/>
                {/* Left leaf */}
                <ellipse cx={x-8} cy={yBase-h*0.58} rx={wilt ? 7 : 10} ry={wilt ? 3.5 : 5}
                  fill="url(#leafG)" className="leaf-pulse"
                  style={{ animationDelay:`${i*0.3}s`, transform:`rotate(${wilt?'-35deg':'-25deg'})`, transformOrigin:`${x}px ${yBase-h*0.58}px` }}
                />
                {/* Right leaf */}
                <ellipse cx={x+8} cy={yBase-h*0.76} rx={wilt ? 7 : 10} ry={wilt ? 3.5 : 5}
                  fill="url(#leafG)" className="leaf-pulse"
                  style={{ animationDelay:`${i*0.3+0.4}s`, transform:`rotate(${wilt?'35deg':'25deg'})`, transformOrigin:`${x}px ${yBase-h*0.76}px` }}
                />
                <circle cx={x} cy={yBase-h} r={wilt ? 3 : 4.5} fill={t.plantColor} filter="url(#glow)" opacity={wilt ? 0.5 : 1}/>
              </g>
            );
          })}

          {/* ── Plants (Right Bed) ────────────── */}
          {[200, 215, 230].map((x, i) => {
            const yBase = 210 - i * 3;
            const h = wilt ? 20 + i*5 : 30 + i*8;
            const cls = wilt ? 'plant-wilt' : 'plant-sway';
            return (
              <g key={i} className={cls} style={{ animationDelay:`${i*0.6+0.3}s`, transformOrigin:`${x}px ${yBase}px` }}>
                <line x1={x} y1={yBase} x2={x} y2={yBase-h} stroke="url(#stemG)" strokeWidth={wilt ? '1.5' : '2.2'} strokeLinecap="round"/>
                <ellipse cx={x-8} cy={yBase-h*0.6} rx={wilt ? 6 : 9} ry={wilt ? 3 : 4.5}
                  fill="url(#leafG)" className="leaf-pulse"
                  style={{ animationDelay:`${i*0.4}s`, transform:`rotate(${wilt?'-35deg':'-20deg'})`, transformOrigin:`${x}px ${yBase-h*0.6}px` }}
                />
                <ellipse cx={x+8} cy={yBase-h*0.78} rx={wilt ? 6 : 9} ry={wilt ? 3 : 4.5}
                  fill="url(#leafG)" className="leaf-pulse"
                  style={{ animationDelay:`${i*0.4+0.5}s`, transform:`rotate(${wilt?'35deg':'20deg'})`, transformOrigin:`${x}px ${yBase-h*0.78}px` }}
                />
                <circle cx={x} cy={yBase-h} r={wilt ? 2.5 : 4} fill={t.plantColor} filter="url(#glow)" opacity={wilt ? 0.5 : 1}/>
              </g>
            );
          })}

          {/* ── IoT Sensor Node ───────────────── */}
          <g filter="url(#glow)">
            <rect x="147" y="210" width="26" height="18" rx="4" fill="#0f172a" stroke={t.sensorColor} strokeWidth="1.5"/>
            <rect x="147" y="210" width="26" height="18" rx="4" fill={t.sensorColor} fillOpacity=".1"/>

            {/* LED 1 */}
            <circle cx="156" cy="219" r="2.2" fill={t.sensorColor}>
              {t.flickerSensor
                ? <animate attributeName="opacity" values="1;0;1;0;1" dur="1.5s" repeatCount="indefinite"/>
                : <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite"/>
              }
            </circle>
            {/* LED 2 */}
            <circle cx="163" cy="219" r="2.2" fill={condition === 'fertigating' ? '#a78bfa' : condition === 'irrigating' ? '#38bdf8' : t.sensorColor}>
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2.1s" repeatCount="indefinite"/>
            </circle>
            {/* LED 3 */}
            <circle cx="170" cy="219" r="2.2" fill={t.flickerSensor ? '#ef4444' : t.sensorColor}>
              {t.flickerSensor
                ? <animate attributeName="opacity" values="0;1;0;1" dur="0.8s" repeatCount="indefinite"/>
                : <animate attributeName="opacity" values="1;0.3;1" dur="2.4s" repeatCount="indefinite"/>
              }
            </circle>

            {/* Antenna */}
            <line x1="160" y1="210" x2="160" y2="200" stroke={t.sensorColor} strokeWidth="1.2"/>
            <circle cx="160" cy="198" r="2" fill={t.sensorColor}>
              {!t.flickerSensor && <animate attributeName="r" values="2;3.5;2" dur="2.5s" repeatCount="indefinite"/>}
              {!t.flickerSensor && <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite"/>}
            </circle>
          </g>

          {/* ── Ambient Floor Glow ────────────── */}
          <ellipse cx="160" cy="268" rx="85" ry="10" fill={t.ambientGlow} className="ambient-pulse"/>
        </svg>
      </div>
    </div>
  );
}
