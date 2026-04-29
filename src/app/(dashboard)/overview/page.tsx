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
import { mockSensorHistory, mockEcoSavings } from '@/shared/lib/mockData';
import { formatNumber, cn } from '@/shared/lib/utils';
import { ZONE_STATUS } from '@/shared/lib/constants';
import type { WeatherData, SensorData, Zone } from '@/shared/types/global.types';
import { sensorService } from '@/shared/services/sensorService';
import GreenhouseAnimation from '@/shared/components/GreenhouseAnimation';
import { fetchWeather } from '@/shared/services/weatherService';

export default function OverviewPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [sensorDataMap, setSensorDataMap] = useState<Record<string, SensorData>>({});
  const [zoneIndex, setZoneIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [isOverriding, setIsOverriding] = useState(false);
  const [isHoveringOverride, setIsHoveringOverride] = useState(false);
  const [irrigationMode, setIrrigationMode] = useState<'water' | 'fertilizer' | 'fertigation'>('water');

  const IRRIGATION_MODES = [
    {
      id: 'water' as const,
      label: 'Air Biasa',
      emoji: '💧',
      desc: 'Hanya air bersih',
      color: '#38bdf8',
      glow: 'shadow-[0_0_20px_rgba(56,189,248,0.4)]',
      border: 'border-sky-400/60',
      bg: 'bg-sky-400/10',
    },
    {
      id: 'fertilizer' as const,
      label: 'Pupuk Cair',
      emoji: '🧪',
      desc: 'Hanya larutan pupuk',
      color: '#a78bfa',
      glow: 'shadow-[0_0_20px_rgba(167,139,250,0.4)]',
      border: 'border-violet-400/60',
      bg: 'bg-violet-400/10',
    },
    {
      id: 'fertigation' as const,
      label: 'Air + Pupuk',
      emoji: '⚗️',
      desc: 'Campuran seimbang',
      color: '#34d399',
      glow: 'shadow-[0_0_20px_rgba(52,211,153,0.4)]',
      border: 'border-emerald-400/60',
      bg: 'bg-emerald-400/10',
    },
  ];

  const selectedMode = IRRIGATION_MODES.find(m => m.id === irrigationMode)!;

  useEffect(() => {
    const loadData = async () => {
      const [weatherData, fetchedZones, allSensors] = await Promise.all([
        fetchWeather(
          Number(process.env.NEXT_PUBLIC_FARM_LAT) || undefined,
          Number(process.env.NEXT_PUBLIC_FARM_LON) || undefined,
        ),
        sensorService.getZones(),
        sensorService.getAllSensorData(),
      ]);
      setWeather(weatherData);
      setZones(fetchedZones);
      setSensorDataMap(allSensors);
    };
    loadData();

    sensorService.subscribeToSensorUpdates((payload) => {
      const newData = payload.new as SensorData;
      if (newData.zone_id) {
        setSensorDataMap(prev => ({ ...prev, [newData.zone_id as string]: newData }));
      }
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
    setZoneIndex(prev =>
      dir === 'next'
        ? (prev + 1) % zones.length
        : (prev - 1 + zones.length) % zones.length
    );
    setAnimKey(k => k + 1);
  }, [zones.length]);

  const selectedZone = zones[zoneIndex] ?? null;
  const liveSensor = selectedZone ? (sensorDataMap[selectedZone.id] ?? null) : null;
  const zoneStatus = selectedZone
    ? (ZONE_STATUS[selectedZone.status as keyof typeof ZONE_STATUS] ?? ZONE_STATUS.idle)
    : null;
  const multiZone = zones.length > 1;

  const handleManualOverride = async () => {
    setIsOverriding(true);
    const modeLabel = IRRIGATION_MODES.find(m => m.id === irrigationMode)?.label ?? irrigationMode;
    await new Promise(res => setTimeout(res, 2000));
    alert(`Manual Override diaktifkan!\nZona: ${selectedZone?.name ?? '-'}\nMode: ${modeLabel}`);
    setIsOverriding(false);
  };

  const slideInStyle: React.CSSProperties = animKey > 0 ? {
    animation: `slideIn${slideDir === 'right' ? 'Right' : 'Left'} 0.35s cubic-bezier(0.4,0,0.2,1) both`,
  } : {};

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 relative overflow-hidden p-6 -m-4 lg:-m-6">
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10 max-w-[1800px] mx-auto">

        {/* ── LEFT COLUMN ── */}
        <div className="xl:col-span-3 space-y-6 flex flex-col">
          {/* Weather */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 tracking-wider flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              KONDISI LINGKUNGAN
            </h3>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-6xl drop-shadow-lg">{weather?.icon ?? '🌤️'}</span>
              <div>
                <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
                  {weather?.temperature ?? '--'}°C
                </p>
                <p className="text-sm text-slate-400 capitalize">{weather?.description ?? 'Memuat...'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                <Wind className="w-4 h-4 text-emerald-400 mb-1" />
                <p className="text-xs text-slate-500">Angin</p>
                <p className="font-mono text-sm">{weather?.wind_speed ?? '--'} km/h</p>
              </div>
              <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
                <Droplets className="w-4 h-4 text-blue-400 mb-1" />
                <p className="text-xs text-slate-500">Kelembaban</p>
                <p className="font-mono text-sm">{weather?.humidity ?? '--'}%</p>
              </div>
            </div>
          </div>

          {/* 24h Chart */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl flex-1 min-h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              TREN 24 JAM
              {selectedZone && (
                <span className="ml-auto text-[10px] text-slate-600 font-mono truncate max-w-[90px]">
                  {selectedZone.name.split(' - ')[1] || selectedZone.name}
                </span>
              )}
            </h3>
            <div className="flex-1 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockSensorHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#10B981' }} />
                  <Area type="monotone" dataKey="soil_moisture" stroke="#10B981" strokeWidth={2} fill="url(#colorSoil)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN (HUD) ── */}
        <div className="xl:col-span-6 flex flex-col items-center justify-center relative min-h-[500px]">

          {/* HUD Header — slides with zone */}
          <div className="absolute top-0 text-center w-full z-20 px-12" style={slideInStyle} key={`header-${animKey}`}>
            <h2 className="text-3xl font-extrabold tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 uppercase">
              {selectedZone ? (selectedZone.name.split(' - ')[1] || selectedZone.name) : 'Main Greenhouse'}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: zoneStatus?.color ?? '#10b981' }} />
              <span className="text-xs font-mono text-emerald-400 tracking-widest">
                SYSTEM ONLINE // NODE {String(zoneIndex + 1).padStart(2, '0')} of {String(zones.length).padStart(2, '0')}
              </span>
              {selectedZone && zoneStatus && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${zoneStatus.color}20`, color: zoneStatus.color }}>
                  {zoneStatus.icon} {zoneStatus.label}
                </span>
              )}
            </div>
            {/* Zone name + crop info */}
            {selectedZone && (
              <p className="text-[11px] text-slate-600 font-mono mt-1">
                {selectedZone.crop_type} · {selectedZone.area_ha} ha
              </p>
            )}
          </div>

          {/* Nav Arrow — LEFT */}
          {multiZone && (
            <button
              onClick={() => navigate('prev')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-110 transition-all duration-200 shadow-xl"
              title="Zona Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Greenhouse Animation + Badges — slides on zone change */}
          <div
            className="relative w-full max-w-[560px] aspect-square flex items-center justify-center overflow-hidden"
            key={`scene-${animKey}`}
            style={slideInStyle}
          >
            {/* 3D Greenhouse */}
            <div className="w-[90%] h-[90%] relative z-10">
              <GreenhouseAnimation />
            </div>

            {/* HUD Badges — well spaced to avoid arrow overlap */}
            <div className="absolute top-[16%] left-[12%] bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl z-20">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono text-xs font-semibold">{liveSensor?.soil_moisture ?? '--'}%</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Soil</span>
            </div>

            <div className="absolute top-[26%] right-[8%] bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl z-20">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-mono text-xs font-semibold">{liveSensor?.temperature ?? '--'}°C</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Temp</span>
            </div>

            <div className="absolute bottom-[21%] left-[8%] bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl z-20">
              <span className="w-3.5 h-3.5 flex items-center justify-center text-purple-400 font-bold text-[9px]">pH</span>
              <span className="font-mono text-xs font-semibold">{liveSensor?.ph ?? '--'}</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Acid</span>
            </div>

            <div className="absolute bottom-[11%] right-[12%] bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl z-20">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-xs font-semibold">{liveSensor?.humidity ?? '--'}%</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">Humid</span>
            </div>

            {/* HUD Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-white/5 rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] border border-dashed border-white/5 rounded-full pointer-events-none" style={{ animation: 'spin 60s linear infinite' }} />
          </div>

          {/* Nav Arrow — RIGHT */}
          {multiZone && (
            <button
              onClick={() => navigate('next')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-110 transition-all duration-200 shadow-xl"
              title="Zona Berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Dot Indicators (bottom of center column) */}
          {multiZone && (
            <div className="absolute bottom-2 flex items-center gap-2">
              {zones.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSlideDir(i > zoneIndex ? 'right' : 'left');
                    setZoneIndex(i);
                    setAnimKey(k => k + 1);
                  }}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    i === zoneIndex
                      ? 'w-5 h-2 bg-emerald-400 shadow-[0_0_8px_#10b981]'
                      : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="xl:col-span-3 space-y-6 flex flex-col">

          {/* ── IRRIGATION MODE SELECTOR ── */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 shadow-2xl">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-3 uppercase">Mode Penyiraman</p>
            <div className="grid grid-cols-3 gap-2">
              {IRRIGATION_MODES.map(mode => {
                const isActive = irrigationMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setIrrigationMode(mode.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200',
                      isActive
                        ? `${mode.bg} ${mode.border} ${mode.glow} scale-[1.03]`
                        : 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10'
                    )}
                  >
                    <span className="text-xl">{mode.emoji}</span>
                    <span
                      className="text-[10px] font-bold leading-tight text-center"
                      style={{ color: isActive ? mode.color : '#64748b' }}
                    >
                      {mode.label}
                    </span>
                    <span className="text-[9px] text-slate-600 text-center leading-tight hidden sm:block">
                      {mode.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* OVERRIDE Button */}
          <button
            onClick={handleManualOverride}
            disabled={isOverriding}
            onMouseEnter={() => setIsHoveringOverride(true)}
            onMouseLeave={() => setIsHoveringOverride(false)}
            className={cn(
              "relative w-full aspect-video rounded-3xl p-[2px] overflow-hidden transition-all duration-300 group",
              isOverriding ? "cursor-not-allowed opacity-80" : "cursor-pointer"
            )}
          >
            {/* Border glow — color follows selected mode */}
            <div
              className="absolute inset-0 opacity-20 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `linear-gradient(135deg, ${selectedMode.color}, ${selectedMode.color}88, ${selectedMode.color})`,
              }}
            />
            <div className="absolute inset-[2px] bg-slate-950 rounded-[22px] flex flex-col items-center justify-center gap-3 z-10">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl text-3xl"
                style={isOverriding ? {
                  backgroundColor: `${selectedMode.color}20`,
                  boxShadow: `0 0 30px ${selectedMode.color}88`,
                } : undefined}
              >
                {isOverriding
                  ? <Power className="w-8 h-8 animate-pulse" style={{ color: selectedMode.color }} />
                  : <span className="group-hover:scale-110 transition-transform duration-200">{selectedMode.emoji}</span>
                }
              </div>
              <div className="text-center">
                <p className="font-mono font-bold tracking-widest text-lg text-white">
                  {isOverriding ? 'MENYIRAM...' : 'MANUAL OVERRIDE'}
                </p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
                  {isOverriding ? 'Proses Berjalan' : (selectedZone?.name.split(' - ')[1] || 'Siram Sekarang')}
                </p>
              </div>
            </div>
          </button>

          {/* Eco-Savings */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-slate-400 mb-6 tracking-wider flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-400" />
              ECO-SAVINGS IMPACT
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Air Dihemat</p>
                  <p className="font-mono text-xl font-bold">{formatNumber(mockEcoSavings.water_saved_liters)}<span className="text-sm text-slate-500 ml-1">L</span></p>
                </div>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Pupuk Dihemat</p>
                  <p className="font-mono text-xl font-bold">{formatNumber(mockEcoSavings.fertilizer_saved_kg)}<span className="text-sm text-slate-500 ml-1">kg</span></p>
                </div>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Energi Dihemat</p>
                  <p className="font-mono text-xl font-bold">{formatNumber(mockEcoSavings.energy_saved_kwh)}<span className="text-sm text-slate-500 ml-1">kWh</span></p>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
              <span>Total Estimasi Biaya</span>
              <span className="font-mono text-emerald-400">Rp {formatNumber(mockEcoSavings.cost_saved_rupiah)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
