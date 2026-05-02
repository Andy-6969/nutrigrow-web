'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Droplets, Leaf, Zap, CloudRain,
  Wind, Thermometer, Power, Activity,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { formatNumber, cn } from '@/shared/lib/utils';
import { ZONE_STATUS } from '@/shared/lib/constants';
import type { WeatherData, SensorData, Zone, EcoSavingsData } from '@/shared/types/global.types';
import { sensorService, type SensorHistoryPoint } from '@/shared/services/sensorService';
import { overrideService } from '@/shared/services/overrideService';
import GreenhouseAnimation, { type GreenhouseCondition } from '@/shared/components/GreenhouseAnimation';
import { fetchWeather } from '@/shared/services/weatherService';

function toCondition(status?: string): GreenhouseCondition {
  if (!status) return 'idle';
  if (status === 'irrigating')  return 'irrigating';
  if (status === 'fertigating') return 'fertigating';
  if (status === 'delayed')     return 'delayed';
  if (status === 'error')       return 'error';
  if (status === 'offline')     return 'offline';
  return 'idle';
}

export default function OverviewPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [sensorDataMap, setSensorDataMap] = useState<Record<string, SensorData>>({});
  const [sensorHistory, setSensorHistory] = useState<SensorHistoryPoint[]>([]);
  const [ecoSavings, setEcoSavings] = useState<EcoSavingsData | null>(null);
  const [zoneIndex, setZoneIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [isOverriding, setIsOverriding] = useState(false);
  const [irrigationMode, setIrrigationMode] = useState<'water' | 'fertilizer' | 'fertigation'>('water');

  const IRRIGATION_MODES = [
    { id: 'water' as const,       label: 'Air Biasa', emoji: '💧', desc: 'Hanya air bersih',    color: '#38bdf8', glowColor: 'rgba(56,189,248,0.35)',  borderColor: 'rgba(56,189,248,0.5)',  bgColor: 'rgba(56,189,248,0.08)'  },
    { id: 'fertilizer' as const,  label: 'Pupuk Cair',emoji: '🧪', desc: 'Hanya larutan pupuk', color: '#a78bfa', glowColor: 'rgba(167,139,250,0.35)', borderColor: 'rgba(167,139,250,0.5)', bgColor: 'rgba(167,139,250,0.08)' },
    { id: 'fertigation' as const, label: 'Air + Pupuk',emoji: '⚗️',desc: 'Campuran seimbang',   color: '#34d399', glowColor: 'rgba(52,211,153,0.35)',  borderColor: 'rgba(52,211,153,0.5)',  bgColor: 'rgba(52,211,153,0.08)'  },
  ];
  const selectedMode = IRRIGATION_MODES.find(m => m.id === irrigationMode)!;

  useEffect(() => {
    const loadData = async () => {
      const [weatherData, fetchedZones, allSensors, savings] = await Promise.all([
        fetchWeather(
          Number(process.env.NEXT_PUBLIC_FARM_LAT) || undefined,
          Number(process.env.NEXT_PUBLIC_FARM_LON) || undefined,
        ),
        sensorService.getZones(),
        sensorService.getAllSensorData(),
        sensorService.getEcoSavings(),
      ]);
      setWeather(weatherData);
      setZones(fetchedZones);
      setSensorDataMap(allSensors);
      setEcoSavings(savings);
      // Load sensor history untuk zona pertama
      if (fetchedZones.length > 0) {
        const hist = await sensorService.getSensorHistory(fetchedZones[0].id);
        setSensorHistory(hist);
      }
    };
    loadData();
    sensorService.subscribeToSensorUpdates((payload) => {
      const newData = payload.new as SensorData;
      if (newData.zone_id) setSensorDataMap(prev => ({ ...prev, [newData.zone_id as string]: newData }));
    });
    sensorService.subscribeToZoneUpdates((payload) => {
      const updatedZone = payload.new as Zone;
      setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z));
    });
    return () => {
      sensorService.unsubscribeFromSensorUpdates();
      sensorService.unsubscribeFromZoneUpdates();
    };
  }, []);

  const navigate = useCallback((dir: 'prev' | 'next') => {
    if (zones.length <= 1) return;
    setSlideDir(dir === 'next' ? 'right' : 'left');
    setZoneIndex(prev => dir === 'next' ? (prev + 1) % zones.length : (prev - 1 + zones.length) % zones.length);
    setAnimKey(k => k + 1);
  }, [zones.length]);

  const selectedZone = zones[zoneIndex] ?? null;
  const liveSensor  = selectedZone ? (sensorDataMap[selectedZone.id] ?? null) : null;
  const zoneStatus  = selectedZone ? (ZONE_STATUS[selectedZone.status as keyof typeof ZONE_STATUS] ?? ZONE_STATUS.idle) : null;
  const animCondition = toCondition(selectedZone?.status);
  const multiZone   = zones.length > 1;

  const handleManualOverride = async () => {
    if (!selectedZone) return;
    setIsOverriding(true);
    const svcMode: 'water' | 'fertigation' = irrigationMode === 'water' ? 'water' : 'fertigation';
    try {
      await overrideService.startOverride(selectedZone.id, 5, 'Manual dari HUD', svcMode);
    } catch (err) {
      console.error('[override] Failed:', err);
    } finally {
      setIsOverriding(false);
    }
  };

  const slideInStyle: React.CSSProperties = animKey > 0 ? {
    animation: `slideIn${slideDir === 'right' ? 'Right' : 'Left'} 0.35s cubic-bezier(0.4,0,0.2,1) both`,
  } : {};

  /* ── shared card style ── */
  const card: React.CSSProperties = {
    background: 'var(--glass-bg)',
    backdropFilter: `blur(var(--glass-blur))`,
    WebkitBackdropFilter: `blur(var(--glass-blur))`,
    border: 'var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
    borderRadius: '24px',
  };

  const subCard: React.CSSProperties = {
    background: 'var(--surface-card)',
    border: '1px solid var(--surface-border)',
    borderRadius: '16px',
  };

  const textMain:  React.CSSProperties = { color: 'var(--surface-text)' };
  const textMuted: React.CSSProperties = { color: 'var(--surface-text-muted)' };
  const textSubtle:React.CSSProperties = { color: 'var(--surface-text-subtle)' };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] relative overflow-hidden p-6 -m-4 lg:-m-6"
      style={{ background: 'var(--surface-bg)' }}
    >
      <style>{`
        @keyframes slideInRight { from{opacity:0;transform:translateX(48px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideInLeft  { from{opacity:0;transform:translateX(-48px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      {/* Background glows — adapt opacity via CSS vars */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)' }} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10 max-w-[1800px] mx-auto">

        {/* ── LEFT COLUMN ── */}
        <div className="xl:col-span-3 space-y-6 flex flex-col">

          {/* Weather Card */}
          <div style={card} className="p-6">
            <h3 className="text-sm font-semibold mb-4 tracking-wider flex items-center gap-2" style={textMuted}>
              <CloudRain className="w-4 h-4 text-cyan-400" />
              KONDISI LINGKUNGAN
            </h3>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-6xl drop-shadow-lg">{weather?.icon ?? '🌤️'}</span>
              <div>
                <p className="text-4xl font-bold" style={textMain}>
                  {weather?.temperature ?? '--'}°C
                </p>
                <p className="text-sm capitalize mt-0.5" style={textMuted}>{weather?.description ?? 'Memuat...'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div style={subCard} className="p-3">
                <Wind className="w-4 h-4 text-emerald-500 mb-1" />
                <p className="text-xs mb-0.5" style={textMuted}>Angin</p>
                <p className="font-mono text-sm font-semibold" style={textMain}>{weather?.wind_speed ?? '--'} km/h</p>
              </div>
              <div style={subCard} className="p-3">
                <Droplets className="w-4 h-4 text-blue-400 mb-1" />
                <p className="text-xs mb-0.5" style={textMuted}>Kelembaban</p>
                <p className="font-mono text-sm font-semibold" style={textMain}>{weather?.humidity ?? '--'}%</p>
              </div>
            </div>
          </div>

          {/* 24h Chart */}
          <div style={card} className="p-6 flex-1 min-h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold mb-4 tracking-wider flex items-center gap-2" style={textMuted}>
              <Activity className="w-4 h-4 text-emerald-500" />
              TREN 24 JAM
              {selectedZone && (
                <span className="ml-auto text-[10px] font-mono truncate max-w-[90px]" style={textSubtle}>
                  {selectedZone.name.split(' - ')[1] || selectedZone.name}
                </span>
              )}
            </h3>
            <div className="flex-1 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sensorHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10B981" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: 'var(--surface-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                  <YAxis tick={{ fill: 'var(--surface-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--surface-border)', borderRadius: '12px', color: 'var(--surface-text)' }}
                    itemStyle={{ color: '#10B981' }}
                  />
                  <Area type="monotone" dataKey="soil_moisture" stroke="#10B981" strokeWidth={2} fill="url(#colorSoil)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN (HUD) ── */}
        <div className="xl:col-span-6 flex flex-col items-center justify-center relative min-h-[500px]">

          {/* HUD Header */}
          <div className="absolute top-0 text-center w-full z-20 px-12" style={slideInStyle} key={`header-${animKey}`}>
            <h2 className="text-3xl font-extrabold tracking-[0.2em] uppercase" style={textMain}>
              {selectedZone ? (selectedZone.name.split(' - ')[1] || selectedZone.name) : 'Main Greenhouse'}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: zoneStatus?.color ?? '#10b981' }} />
              <span className="text-xs font-mono tracking-widest" style={{ color: '#10b981' }}>
                SYSTEM ONLINE // NODE {String(zoneIndex + 1).padStart(2, '0')} of {String(zones.length).padStart(2, '0')}
              </span>
              {selectedZone && zoneStatus && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${zoneStatus.color}20`, color: zoneStatus.color }}>
                  {zoneStatus.icon} {zoneStatus.label}
                </span>
              )}
            </div>
            {selectedZone && (
              <p className="text-[11px] font-mono mt-1" style={textSubtle}>
                {selectedZone.crop_type} · {selectedZone.area_ha} ha
              </p>
            )}
          </div>

          {/* Nav Arrow LEFT */}
          {multiZone && (
            <button onClick={() => navigate('prev')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md hover:scale-110 transition-all duration-200 shadow-xl"
              style={{ background: 'var(--surface-card)', border: 'var(--glass-border)', color: 'var(--surface-text-muted)' }}
              title="Zona Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Greenhouse + HUD Badges */}
          <div className="relative w-full max-w-[560px] aspect-square flex items-center justify-center overflow-hidden"
            key={`scene-${animKey}`} style={slideInStyle}>
            <div className="w-[90%] h-[90%] relative z-10">
              <GreenhouseAnimation condition={animCondition} />
            </div>

            {/* Badges */}
            {[
              { pos: 'top-[16%] left-[12%]',    icon: <Droplets className="w-3.5 h-3.5 text-blue-400"/>,          val: `${liveSensor?.soil_moisture ?? '--'}%`, label: 'Soil' },
              { pos: 'top-[26%] right-[8%]',    icon: <Thermometer className="w-3.5 h-3.5 text-orange-400"/>,     val: `${liveSensor?.temperature ?? '--'}°C`,  label: 'Temp' },
              { pos: 'bottom-[21%] left-[8%]',  icon: <span className="w-3.5 h-3.5 flex items-center justify-center text-purple-400 font-bold text-[9px]">pH</span>, val: `${liveSensor?.ph ?? '--'}`, label: 'Acid' },
              { pos: 'bottom-[11%] right-[12%]',icon: <Wind className="w-3.5 h-3.5 text-cyan-400"/>,              val: `${liveSensor?.humidity ?? '--'}%`,      label: 'Humid' },
            ].map((b, i) => (
              <div key={i} className={`absolute ${b.pos} backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl z-20`}
                style={{ background: 'var(--glass-bg)', border: 'var(--glass-border)' }}>
                {b.icon}
                <span className="font-mono text-xs font-semibold" style={textMain}>{b.val}</span>
                <span className="text-[9px] uppercase tracking-wider" style={textMuted}>{b.label}</span>
              </div>
            ))}

            {/* HUD Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] rounded-full pointer-events-none"
              style={{ border: '1px solid var(--surface-border)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] border-dashed rounded-full pointer-events-none"
              style={{ border: '1px dashed var(--surface-border)', animation: 'spin 60s linear infinite' }} />
          </div>

          {/* Nav Arrow RIGHT */}
          {multiZone && (
            <button onClick={() => navigate('next')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md hover:scale-110 transition-all duration-200 shadow-xl"
              style={{ background: 'var(--surface-card)', border: 'var(--glass-border)', color: 'var(--surface-text-muted)' }}
              title="Zona Berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Dot Indicators */}
          {multiZone && (
            <div className="absolute bottom-2 flex items-center gap-2">
              {zones.map((_, i) => (
                <button key={i}
                  onClick={() => { setSlideDir(i > zoneIndex ? 'right' : 'left'); setZoneIndex(i); setAnimKey(k => k + 1); }}
                  className="rounded-full transition-all duration-300"
                  style={i === zoneIndex
                    ? { width: 20, height: 8, background: '#10b981', boxShadow: '0 0 8px #10b981' }
                    : { width: 8, height: 8, background: 'var(--surface-border)' }
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="xl:col-span-3 space-y-6 flex flex-col">

          {/* Irrigation Mode Selector */}
          <div style={card} className="p-4">
            <p className="text-[10px] font-mono tracking-widest mb-3 uppercase" style={textMuted}>Mode Penyiraman</p>
            <div className="grid grid-cols-3 gap-2">
              {IRRIGATION_MODES.map(mode => {
                const isActive = irrigationMode === mode.id;
                return (
                  <button key={mode.id} onClick={() => setIrrigationMode(mode.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200"
                    style={isActive ? {
                      background: mode.bgColor,
                      border: `1px solid ${mode.borderColor}`,
                      boxShadow: `0 0 18px ${mode.glowColor}`,
                      transform: 'scale(1.03)',
                    } : {
                      background: 'var(--surface-card)',
                      border: '1px solid var(--surface-border)',
                    }}
                  >
                    <span className="text-xl">{mode.emoji}</span>
                    <span className="text-[10px] font-bold leading-tight text-center"
                      style={{ color: isActive ? mode.color : 'var(--surface-text-muted)' }}>
                      {mode.label}
                    </span>
                    <span className="text-[9px] text-center leading-tight hidden sm:block" style={textSubtle}>
                      {mode.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Override Button */}
          <button onClick={handleManualOverride} disabled={isOverriding}
            className={cn('relative w-full aspect-video rounded-3xl p-[2px] overflow-hidden transition-all duration-300 group',
              isOverriding ? 'cursor-not-allowed opacity-80' : 'cursor-pointer')}
          >
            <div className="absolute inset-0 opacity-20 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: `linear-gradient(135deg, ${selectedMode.color}, ${selectedMode.color}88, ${selectedMode.color})` }} />
            <div className="absolute inset-[2px] rounded-[22px] flex flex-col items-center justify-center gap-3 z-10"
              style={{ background: 'var(--surface-bg)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl text-3xl"
                style={isOverriding ? { backgroundColor: `${selectedMode.color}20`, boxShadow: `0 0 30px ${selectedMode.color}88` } : undefined}>
                {isOverriding
                  ? <Power className="w-8 h-8 animate-pulse" style={{ color: selectedMode.color }} />
                  : <span className="group-hover:scale-110 transition-transform duration-200">{selectedMode.emoji}</span>
                }
              </div>
              <div className="text-center">
                <p className="font-mono font-bold tracking-widest text-lg" style={textMain}>
                  {isOverriding ? 'MENYIRAM...' : 'MANUAL OVERRIDE'}
                </p>
                <p className="text-xs mt-1 uppercase tracking-widest" style={textMuted}>
                  {isOverriding ? 'Proses Berjalan' : (selectedZone?.name.split(' - ')[1] || 'Siram Sekarang')}
                </p>
              </div>
            </div>
          </button>

          {/* Eco-Savings */}
          <div style={card} className="p-6 flex-1 flex flex-col justify-between">
            <h3 className="text-sm font-semibold mb-6 tracking-wider flex items-center gap-2" style={textMuted}>
              <Leaf className="w-4 h-4 text-emerald-500" />
              ECO-SAVINGS IMPACT
            </h3>
            <div className="space-y-5">
              {[
                { icon: <Droplets className="w-5 h-5 text-blue-400"/>,   bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)',  label: 'Air Dihemat',    val: formatNumber(ecoSavings?.water_saved_liters ?? 0),   unit: 'L'   },
                { icon: <Leaf className="w-5 h-5 text-emerald-400"/>,    bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)',  label: 'Pupuk Dihemat',  val: formatNumber(ecoSavings?.fertilizer_saved_kg ?? 0),  unit: 'kg'  },
                { icon: <Zap className="w-5 h-5 text-purple-400"/>,      bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)',  label: 'Energi Dihemat', val: formatNumber(ecoSavings?.energy_saved_kwh ?? 0),     unit: 'kWh' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: item.bg, border: `1px solid ${item.border}` }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={textMuted}>{item.label}</p>
                      <p className="font-mono text-xl font-bold" style={textMain}>
                        {item.val}<span className="text-sm ml-1" style={textMuted}>{item.unit}</span>
                      </p>
                    </div>
                  </div>
                  {i < 2 && <div className="h-px w-full mt-5" style={{ background: 'var(--surface-border)' }} />}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--surface-border)' }}>
              <span style={textMuted}>Total Estimasi Biaya</span>
              <span className="font-mono text-emerald-500 font-semibold">Rp {formatNumber(ecoSavings?.cost_saved_rupiah ?? 0)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
