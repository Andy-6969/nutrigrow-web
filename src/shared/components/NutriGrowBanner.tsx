'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Thermometer, Droplets, Activity, Wifi, Leaf,
  ChevronLeft, ChevronRight, Radio, Brain, Sprout,
  Globe, Mail, Phone,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────────────────────────────────── */
const METRICS = [
  { icon: Thermometer, iconColor: '#f97316', label: 'Suhu Udara', value: '28.4', unit: '°C',  badge: 'Optimal', badgeColor: '#4ade80', arcColor: '#f97316', pct: 72 },
  { icon: Droplets,    iconColor: '#38bdf8', label: 'Kelembapan', value: '74',   unit: '%',   badge: 'Normal',  badgeColor: '#4ade80', arcColor: '#38bdf8', pct: 74 },
  { icon: Activity,    iconColor: '#a78bfa', label: 'pH Larutan', value: '6.3',  unit: '',    badge: 'OPTIMAL', badgeColor: '#4ade80', arcColor: '#a78bfa', pct: 68 },
  { icon: Wifi,        iconColor: '#10b981', label: 'EC / TDS',   value: '1.85', unit: 'mS',  badge: 'IDEAL',   badgeColor: '#4ade80', arcColor: '#10b981', pct: 62 },
];

const FEATURES_HERO = [
  { icon: '📡', text: 'Monitoring Real-time' },
  { icon: '🤖', text: 'Rekomendasi Fuzzy AI' },
  { icon: '💧', text: 'Otomasi Irigasi' },
  { icon: '🌾', text: 'Multi-Farm Support' },
];

const FEATURE_CARDS = [
  {
    icon: Radio, iconColor: '#06b6d4', iconBorder: 'rgba(6,182,212,0.35)',
    title: 'Monitoring', titleBold: 'Nutrisi Real-time',
    desc: 'Pantau kadar pH, EC/TDS, suhu, dan kelembapan secara langsung dari perangkat IoT yang terpasang di setiap zona kebun hidroponik Anda.',
    featured: false, delay: '0s',
  },
  {
    icon: Brain, iconColor: '#ffffff', iconBorder: 'rgba(255,255,255,0.3)',
    title: 'Rekomendasi', titleBold: 'Fuzzy Logic AI',
    desc: 'Sistem kecerdasan buatan berbasis logika fuzzy memberikan rekomendasi tindakan optimal berdasarkan kondisi sensor dan data cuaca terkini.',
    featured: true, delay: '0.12s',
  },
  {
    icon: Sprout, iconColor: '#f59e0b', iconBorder: 'rgba(245,158,11,0.35)',
    title: 'Manajemen', titleBold: 'Multi-Farm',
    desc: 'Kelola beberapa kebun sekaligus dalam satu platform terintegrasi. Jadwalkan irigasi, fertigasi, dan pantau laporan panen dari mana saja.',
    featured: false, delay: '0.24s',
  },
];

const PARTICLES = [
  { x: 4,  y: 18, s: 2,   c: 'rgba(16,185,129,0.85)', d: 11, dl: 0   },
  { x: 13, y: 55, s: 1.5, c: 'rgba(6,182,212,0.7)',   d: 15, dl: 1.2 },
  { x: 24, y: 30, s: 2.5, c: 'rgba(52,211,153,0.75)', d: 10, dl: 2.6 },
  { x: 38, y: 72, s: 1,   c: 'rgba(6,182,212,0.6)',   d: 17, dl: 0.3 },
  { x: 52, y: 12, s: 2,   c: 'rgba(16,185,129,0.65)', d: 13, dl: 3.4 },
  { x: 65, y: 60, s: 1.5, c: 'rgba(99,102,241,0.7)',  d: 19, dl: 1.0 },
  { x: 77, y: 28, s: 2,   c: 'rgba(52,211,153,0.6)',  d: 12, dl: 4.0 },
  { x: 88, y: 68, s: 1,   c: 'rgba(16,185,129,0.8)',  d: 16, dl: 0.7 },
  { x: 33, y: 88, s: 1.5, c: 'rgba(6,182,212,0.5)',   d: 21, dl: 2.0 },
  { x: 71, y: 8,  s: 2.5, c: 'rgba(16,185,129,0.55)', d: 14, dl: 3.0 },
  { x: 9,  y: 48, s: 1,   c: 'rgba(99,102,241,0.6)',  d: 18, dl: 1.8 },
  { x: 57, y: 92, s: 2,   c: 'rgba(6,182,212,0.65)',  d: 9,  dl: 4.8 },
  { x: 45, y: 40, s: 1.5, c: 'rgba(52,211,153,0.55)', d: 22, dl: 0.6 },
  { x: 82, y: 45, s: 1,   c: 'rgba(16,185,129,0.7)',  d: 20, dl: 5.0 },
];

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg)), y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg)),   y2 = cy + r * Math.sin(rad(endDeg));
  return `M ${x1} ${y1} A ${r} ${r} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/* ─────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────── */
export default function NutriGrowBanner() {
  const [activeVariant, setActiveVariant] = useState(2);
  const [mounted, setMounted]             = useState(false);
  const [imageLoaded, setImageLoaded]     = useState(false);
  const [scrollY, setScrollY]             = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  const BANNERS = [
    { src: '/xbanner-v1.png', label: 'Nature Meets Technology', labelColor: '#6ee7b7' },
    { src: '/xbanner-v2.png', label: 'The Living Farm',         labelColor: '#a78bfa' },
    { src: '/xbanner-v3.png', label: 'Dawn at the Smart Farm',  labelColor: '#fbbf24' },
  ];

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dots: { x: number; y: number; r: number; sp: number; op: number }[] = [];
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 35; i++) {
      dots.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.4, sp: Math.random() * 0.5 + 0.15, op: Math.random() * 0.5 + 0.25 });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        d.y -= d.sp;
        if (d.y < -3) { d.y = canvas.height + 3; d.x = Math.random() * canvas.width; }
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${d.op})`; ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [mounted]);

  const prev = useCallback(() => setActiveVariant(v => (v - 1 + BANNERS.length) % BANNERS.length), []);
  const next = useCallback(() => setActiveVariant(v => (v + 1) % BANNERS.length), []);
  const active = BANNERS[activeVariant];

  return (
    <div id="nutrigrow-hero-banner" className="w-full mb-6">
      {/* ── Keyframes ───────────────────────────────────────────── */}
      <style>{`
        @keyframes ngScan { 0%{left:-1%;opacity:0} 3%{opacity:1} 97%{opacity:.6} 100%{left:101%;opacity:0} }
        @keyframes ngPulse { 0%,100%{transform:translate(-50%,-50%) scale(.25);opacity:.55} 100%{transform:translate(-50%,-50%) scale(2.8);opacity:0} }
        @keyframes ngAurora1 { 0%,100%{transform:translate(0,0) scale(1);opacity:.9} 40%{transform:translate(28px,-22px) scale(1.07);opacity:1} 80%{transform:translate(-14px,18px) scale(.95);opacity:.8} }
        @keyframes ngAurora2 { 0%,100%{transform:translate(0,0) scale(1);opacity:.7} 50%{transform:translate(-30px,20px) scale(1.1);opacity:1} }
        @keyframes ngGridDrift { 0%{background-position:0 0} 100%{background-position:44px 44px} }
        @keyframes ngParticle { 0%{transform:translateY(0);opacity:0} 5%{opacity:1} 90%{opacity:.8} 100%{transform:translateY(-340px);opacity:0} }
        @keyframes ngCardIn { from{opacity:0;transform:translateY(18px) scale(.94)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ngTextIn { from{opacity:0;transform:translateX(-22px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ngLogoIn { from{opacity:0;transform:scale(.65) rotate(-12deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
        @keyframes ngSpinRing { to{transform:rotate(360deg)} }
        @keyframes ngGlow { 0%,100%{box-shadow:0 0 18px rgba(16,185,129,.5),0 0 36px rgba(16,185,129,.2)} 50%{box-shadow:0 0 32px rgba(16,185,129,.85),0 0 60px rgba(16,185,129,.35)} }
        @keyframes ngFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes ngImgReveal { from{opacity:0;filter:brightness(.6) blur(8px)} to{opacity:1;filter:brightness(1) blur(0)} }
        @keyframes ngArcDraw { from{stroke-dashoffset:200} to{stroke-dashoffset:0} }
        @keyframes ngFeatCardIn { from{opacity:0;transform:translateY(28px) scale(.93)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ngFeatIconPop { 0%{transform:scale(.5) rotate(-15deg);opacity:0} 70%{transform:scale(1.1) rotate(3deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes ngContactShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes ngFeatPulse { 0%,100%{box-shadow:0 12px 40px rgba(16,185,129,.35),0 4px 16px rgba(0,0,0,.4)} 50%{box-shadow:0 12px 52px rgba(16,185,129,.55),0 4px 24px rgba(0,0,0,.5)} }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          § 1  HERO BANNER — plantation photo + branding
      ══════════════════════════════════════════════════════════ */}
      <div
        className="relative w-full overflow-hidden rounded-t-2xl"
        style={{ height: 'clamp(220px, 30vw, 380px)' }}
      >
        {/* Photos */}
        <div className="absolute inset-0 overflow-hidden">
          {BANNERS.map((b, i) => (
            <img key={b.src} src={b.src} alt={b.label}
              onLoad={() => { if (i === activeVariant) setImageLoaded(true); }}
              className="absolute inset-0 w-full h-full"
              style={{
                objectFit: 'cover', objectPosition: 'center 30%',
                opacity: i === activeVariant ? 1 : 0,
                transition: 'opacity 0.7s cubic-bezier(0.4,0,0.2,1)',
                animation: i === activeVariant && imageLoaded ? 'ngImgReveal 1s ease-out both' : undefined,
                transform: `translateY(${scrollY * 0.04}px)`,
              }}
            />
          ))}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(2,44,34,.35) 0%,transparent 28%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg,transparent 20%,rgba(4,26,17,.55) 50%,rgba(2,18,12,.88) 75%,rgba(1,15,10,.97) 100%)' }} />
        <div className="absolute pointer-events-none" style={{ top:'-20%',left:'-5%',width:'50%',height:'120%',borderRadius:'50%',background:'radial-gradient(circle,rgba(16,185,129,.18) 0%,transparent 65%)',filter:'blur(48px)',animation:'ngAurora1 14s ease-in-out infinite' }} />
        <div className="absolute pointer-events-none" style={{ top:'-15%',right:'0',width:'42%',height:'100%',borderRadius:'50%',background:'radial-gradient(circle,rgba(6,182,212,.14) 0%,transparent 65%)',filter:'blur(60px)',animation:'ngAurora2 18s ease-in-out infinite' }} />

        {/* Grid + scan */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:'linear-gradient(rgba(16,185,129,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,.025) 1px,transparent 1px)',backgroundSize:'44px 44px',animation:'ngGridDrift 14s linear infinite' }} />
        <div className="absolute top-0 bottom-0 pointer-events-none" style={{ width:2,background:'linear-gradient(180deg,transparent 0%,rgba(16,185,129,.6) 40%,rgba(6,182,212,.5) 60%,transparent 100%)',boxShadow:'0 0 14px rgba(16,185,129,.5)',animation:'ngScan 9s linear infinite' }} />

        {/* Pulse rings */}
        {[0, 2.8, 5.6].map((dl, i) => (
          <div key={i} className="absolute rounded-full border pointer-events-none"
            style={{ width:130,height:130,top:'50%',left:'18%',borderColor:i===0?'rgba(16,185,129,.15)':i===1?'rgba(6,182,212,.1)':'rgba(99,102,241,.08)',animation:'ngPulse 6.5s ease-out infinite',animationDelay:`${dl}s` }} />
        ))}

        {/* Canvas + particles */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity:.5 }} />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLES.map((p, i) => (
            <div key={i} className="absolute rounded-full"
              style={{ left:`${p.x}%`,bottom:`${p.y}%`,width:p.s,height:p.s,background:p.c,boxShadow:`0 0 ${p.s*5}px ${p.c}`,animation:`ngParticle ${p.d}s ${p.dl}s ease-in-out infinite` }} />
          ))}
        </div>

        {/* Corner accents */}
        <div className="absolute top-0 left-0 pointer-events-none">
          <div style={{ width:80,height:2,background:'linear-gradient(90deg,rgba(16,185,129,.8),transparent)' }} />
          <div style={{ width:2,height:60,background:'linear-gradient(180deg,rgba(16,185,129,.8),transparent)' }} />
        </div>
        <div className="absolute bottom-0 right-0 pointer-events-none">
          <div style={{ position:'absolute',bottom:0,right:0,width:80,height:2,background:'linear-gradient(270deg,rgba(6,182,212,.6),transparent)' }} />
          <div style={{ position:'absolute',bottom:0,right:0,width:2,height:60,background:'linear-gradient(0deg,rgba(6,182,212,.6),transparent)' }} />
        </div>

        {/* CONTENT */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6 md:p-8">
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5" style={{ animation:'ngLogoIn .7s cubic-bezier(.16,1,.3,1) both',animationDelay:'.1s' }}>
              <div className="relative shrink-0">
                <div className="absolute inset-[-7px] rounded-full border border-dashed border-emerald-500/30 pointer-events-none" style={{ animation:'ngSpinRing 22s linear infinite' }} />
                <div className="relative flex items-center justify-center rounded-full overflow-hidden"
                  style={{ width:44,height:44,background:'rgba(16,185,129,.15)',border:'1.5px solid rgba(16,185,129,.45)',animation:'ngGlow 3.5s ease-in-out infinite' }}>
                  <img src="/logo-bitanic-round.png" alt="NutriGrow" style={{ width:'86%',height:'86%',objectFit:'cover',borderRadius:'50%' }} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background:'#10b981',borderColor:'#010f0a',boxShadow:'0 0 6px #10b981' }} />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide leading-none" style={{ color:'#ecfdf5',fontFamily:'Outfit,Inter,sans-serif' }}>NutriGrow</p>
                <p className="text-[9px] font-mono tracking-widest" style={{ color:'#6ee7b7' }}>SMART FERTIGATION</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md" style={{ background:'rgba(13,31,26,.7)',border:'1px solid rgba(16,185,129,.3)',animation:'ngFadeIn .8s .4s both' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'#10b981',boxShadow:'0 0 5px #10b981' }} />
              <span className="text-[9px] font-mono font-semibold tracking-widest" style={{ color:'#6ee7b7' }}>SISTEM AKTIF</span>
            </div>
          </div>

          {/* Center hero text */}
          <div className="flex flex-col items-start">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono tracking-[.22em] uppercase mb-1" style={{ color:'#6ee7b7',animation:'ngFadeIn .6s .2s both' }}>
              <Leaf style={{ width:10,height:10,color:'#10b981' }} />
              Platform IoT Pertanian Cerdas
            </span>
            <h1 className="font-extrabold leading-none tracking-tight"
              style={{ fontSize:'clamp(2rem,5.5vw,3.8rem)',color:'#ecfdf5',fontFamily:'Outfit,Inter,sans-serif',textShadow:'0 0 50px rgba(16,185,129,.35),0 3px 12px rgba(0,0,0,.7)',animation:'ngTextIn .75s cubic-bezier(.16,1,.3,1) both',animationDelay:'.25s' }}>
              NutriGrow
            </h1>
            <p className="font-semibold mt-1"
              style={{ fontSize:'clamp(.65rem,1.6vw,1.05rem)',color:'#6ee7b7',animation:'ngTextIn .7s cubic-bezier(.16,1,.3,1) both',animationDelay:'.38s' }}>
              Smart Hydroponic Monitoring System
            </p>
            <p className="italic font-medium mt-0.5"
              style={{ fontSize:'clamp(.6rem,1.2vw,.85rem)',color:'#34d399',animation:'ngTextIn .7s cubic-bezier(.16,1,.3,1) both',animationDelay:'.48s' }}>
              Pantau Nutrisi.{' '}<span style={{ color:'#a7f3d0' }}>Optimalkan Panen.</span>
            </p>
            <div className="mt-2"
              style={{ width:'clamp(60px,12vw,140px)',height:2,background:'linear-gradient(90deg,#10b981,rgba(6,182,212,.7),transparent)',boxShadow:'0 0 8px rgba(16,185,129,.6)',animation:'ngFadeIn .8s .55s both' }} />
            <div className="hidden sm:flex flex-wrap gap-1.5 mt-2.5" style={{ animation:'ngFadeIn .9s .65s both' }}>
              {FEATURES_HERO.map(f => (
                <span key={f.text} className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background:'rgba(16,185,129,.1)',color:'#6ee7b7',border:'1px solid rgba(16,185,129,.22)',backdropFilter:'blur(8px)' }}>
                  <span>{f.icon}</span>{f.text}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom: sensor cards + variant nav */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-end gap-2 flex-1 min-w-0">
              {METRICS.map((m, i) => {
                const Icon = m.icon;
                const sd = -210, ed = sd + (m.pct / 100) * 240;
                return (
                  <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-1 rounded-xl py-2 px-1.5 backdrop-blur-md"
                    style={{ background:'rgba(4,14,10,.72)',border:'1px solid rgba(16,185,129,.22)',boxShadow:'0 4px 24px rgba(0,0,0,.5)',animation:`ngCardIn .65s cubic-bezier(.16,1,.3,1) both`,animationDelay:`${.55+i*.1}s` }}>
                    <svg width="44" height="30" viewBox="0 0 44 30" style={{ overflow:'visible' }}>
                      <path d={describeArc(22,28,18,-210,30)} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" strokeLinecap="round" />
                      <path d={describeArc(22,28,18,sd,ed)} fill="none" stroke={m.arcColor} strokeWidth="3" strokeLinecap="round"
                        style={{ filter:`drop-shadow(0 0 4px ${m.arcColor})`,strokeDasharray:200,animation:`ngArcDraw 1.2s ${.7+i*.12}s cubic-bezier(.22,1,.36,1) both` }} />
                      <foreignObject x="14" y="14" width="16" height="16">
                        <Icon style={{ width:14,height:14,color:m.iconColor }} />
                      </foreignObject>
                    </svg>
                    <p className="font-mono font-bold leading-none text-center" style={{ fontSize:'clamp(.7rem,1.6vw,1rem)',color:'#ecfdf5' }}>
                      {m.value}<span style={{ fontSize:'.6em',color:m.iconColor }}>{m.unit}</span>
                    </p>
                    <p className="text-[7px] sm:text-[8px] font-semibold uppercase tracking-wider text-center leading-tight" style={{ color:'#6ee7b7' }}>{m.label}</p>
                    <span className="text-[6px] sm:text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background:`${m.badgeColor}18`,color:m.badgeColor,border:`1px solid ${m.badgeColor}33` }}>{m.badge}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0" style={{ animation:'ngFadeIn 1s .7s both' }}>
              <span className="text-[8px] font-mono tracking-wider text-right hidden sm:block" style={{ color:active.labelColor,maxWidth:90 }}>{active.label}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={prev} className="w-6 h-6 flex items-center justify-center rounded-full backdrop-blur-md transition-all hover:scale-110"
                  style={{ background:'rgba(13,31,26,.8)',border:'1px solid rgba(16,185,129,.3)',color:'#6ee7b7' }}>
                  <ChevronLeft style={{ width:12,height:12 }} />
                </button>
                <div className="flex items-center gap-1">
                  {BANNERS.map((_, i) => (
                    <button key={i} onClick={() => setActiveVariant(i)} className="rounded-full transition-all duration-300"
                      style={i===activeVariant?{width:20,height:7,background:'#10b981',boxShadow:'0 0 7px #10b981'}:{width:7,height:7,background:'rgba(16,185,129,.3)'}} />
                  ))}
                </div>
                <button onClick={next} className="w-6 h-6 flex items-center justify-center rounded-full backdrop-blur-md transition-all hover:scale-110"
                  style={{ background:'rgba(13,31,26,.8)',border:'1px solid rgba(16,185,129,.3)',color:'#6ee7b7' }}>
                  <ChevronRight style={{ width:12,height:12 }} />
                </button>
              </div>
              <span className="text-[8px] font-mono tracking-widest hidden sm:block" style={{ color:'rgba(110,231,183,.5)' }}>nutrigrow.my.id</span>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none" style={{ background:'linear-gradient(to top,rgba(1,15,10,.7),transparent)' }} />
      </div>

      {/* ══════════════════════════════════════════════════════════
          § 2  3-COLUMN FEATURE CARDS  (referensi gambar)
      ══════════════════════════════════════════════════════════ */}
      <div
        className="relative w-full overflow-visible px-4 sm:px-8 pt-10 pb-8"
        style={{
          background: 'var(--surface-bg-alt, #0D1F1A)',
          borderLeft:  '1px solid rgba(16,185,129,.1)',
          borderRight: '1px solid rgba(16,185,129,.1)',
        }}
      >
        {/* Grid texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage:'linear-gradient(rgba(16,185,129,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,.018) 1px,transparent 1px)',backgroundSize:'32px 32px' }} />
        {/* Top divider glow */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background:'linear-gradient(90deg,transparent,rgba(16,185,129,.5) 30%,rgba(6,182,212,.4) 70%,transparent)' }} />

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          {FEATURE_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="relative flex flex-col items-center text-center"
                style={{ animation:`ngFeatCardIn .7s cubic-bezier(.16,1,.3,1) both`,animationDelay:card.delay }}>

                {/* Floating icon circle — sits above card top edge */}
                <div className="relative z-10 flex items-center justify-center rounded-full shrink-0 mb-[-22px]"
                  style={{
                    width: 68, height: 68,
                    background: card.featured ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(13,31,26,.95)',
                    border: `2.5px solid ${card.iconBorder}`,
                    boxShadow: card.featured
                      ? '0 0 24px rgba(16,185,129,.55), 0 0 50px rgba(16,185,129,.2)'
                      : '0 6px 24px rgba(0,0,0,.55)',
                    animation: `ngFeatIconPop .65s cubic-bezier(.16,1,.3,1) both`,
                    animationDelay: `${parseFloat(card.delay) + .1}s`,
                  }}>
                  <Icon style={{ width:30, height:30, color:card.iconColor }} />
                </div>

                {/* Card body */}
                <div className="w-full flex flex-col items-center pt-12 pb-7 px-5 rounded-2xl relative overflow-hidden"
                  style={{
                    background: card.featured
                      ? 'linear-gradient(155deg, #047A55 0%, #059669 45%, #10b981 100%)'
                      : 'var(--glass-bg, rgba(13,31,26,.7))',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    border: card.featured ? '1px solid rgba(255,255,255,.18)' : '1px solid rgba(16,185,129,.18)',
                    boxShadow: card.featured
                      ? '0 14px 44px rgba(16,185,129,.38), 0 4px 16px rgba(0,0,0,.45)'
                      : '0 6px 28px rgba(0,0,0,.42)',
                    transform: card.featured ? 'translateY(-10px)' : 'none',
                    animation: card.featured ? 'ngFeatPulse 3s ease-in-out infinite' : undefined,
                  }}>

                  {/* Shimmer line on featured */}
                  {card.featured && (
                    <div className="absolute top-0 left-0 right-0 h-px"
                      style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,.65),transparent)',backgroundSize:'200% 100%',animation:'ngContactShimmer 3s linear infinite' }} />
                  )}

                  {/* Title light */}
                  <p className="text-base font-light leading-snug"
                    style={{ color: card.featured ? 'rgba(255,255,255,.85)' : 'var(--surface-text-muted,#6EE7B7)' }}>
                    {card.title}
                  </p>
                  {/* Title bold */}
                  <p className="text-[1.1rem] font-extrabold leading-snug"
                    style={{ color: card.featured ? '#fff' : 'var(--surface-text,#ECFDF5)', fontFamily:'Outfit,Inter,sans-serif' }}>
                    {card.titleBold}
                  </p>

                  {/* Decorative divider */}
                  <div className="my-3 w-10 h-[2px] rounded-full"
                    style={{ background: card.featured ? 'rgba(255,255,255,.4)' : 'rgba(16,185,129,.4)' }} />

                  {/* Description */}
                  <p className="text-[0.75rem] leading-relaxed"
                    style={{ color: card.featured ? 'rgba(255,255,255,.82)' : 'var(--surface-text-muted,#6EE7B7)' }}>
                    {card.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          § 3  CONTACT BAR
      ══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #022C22 0%, #047A55 50%, #022C22 100%)',
          backgroundSize: '200% 100%',
          animation: 'ngContactShimmer 10s linear infinite',
          borderLeft:  '1px solid rgba(16,185,129,.25)',
          borderRight: '1px solid rgba(16,185,129,.25)',
        }}>
        {/* Diagonal stripe texture */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage:'repeating-linear-gradient(45deg,rgba(255,255,255,.015) 0px,rgba(255,255,255,.015) 1px,transparent 1px,transparent 12px)' }} />

        <div className="relative z-10 flex items-center justify-center gap-3 py-4 px-6">
          <Phone style={{ width:20,height:20,color:'#6ee7b7',flexShrink:0 }} />
          <p className="font-bold tracking-wide"
            style={{ fontSize:'clamp(.95rem,2.5vw,1.35rem)',color:'#fff',fontFamily:'Outfit,Inter,sans-serif',textShadow:'0 0 20px rgba(110,231,183,.4)' }}>
            Hubungi Kami:{' '}
            <span style={{ color:'#6ee7b7',fontFamily:'JetBrains Mono,monospace' }}>0812-4027-0320</span>
          </p>
          <Phone style={{ width:20,height:20,color:'#6ee7b7',flexShrink:0,transform:'scaleX(-1)' }} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          § 4  FOOTER CONTACT INFO
      ══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-b-2xl flex items-center justify-center py-3 px-6"
        style={{ background:'rgba(4,10,8,.97)',borderLeft:'1px solid rgba(16,185,129,.12)',borderRight:'1px solid rgba(16,185,129,.12)',borderBottom:'1px solid rgba(16,185,129,.12)',boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
        <div className="flex items-center gap-2 justify-center" style={{ animation:'ngFadeIn 1s .5s both' }}>
          <Globe style={{ width:13,height:13,color:'#6ee7b7',flexShrink:0 }} />
          <span className="text-xs font-mono" style={{ color:'#6ee7b7' }}>www.nutrigrow.my.id</span>
        </div>
      </div>
    </div>
  );
}
