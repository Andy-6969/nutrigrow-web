'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Droplets, Leaf, Zap, CloudRain,
  Wind, Thermometer, Power, Calendar,
  ChevronLeft, ChevronRight, MapPin, Clock, CloudDrizzle, Sprout,
  Search, X, Loader2, Compass
} from 'lucide-react';
import { formatNumber, cn } from '@/shared/lib/utils';
import { ZONE_STATUS } from '@/shared/lib/constants';
import type { WeatherData, SensorData, Zone, EcoSavingsData } from '@/shared/types/global.types';
import { sensorService } from '@/shared/services/sensorService';
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

  const [ecoSavings, setEcoSavings] = useState<EcoSavingsData | null>(null);
  const [zoneIndex, setZoneIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [isOverriding, setIsOverriding] = useState(false);
  const [irrigationMode, setIrrigationMode] = useState<'water' | 'fertilizer' | 'fertigation'>('water');

  // ── Weekly forecast search state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; admin1: string; country: string; latitude: number; longitude: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingWeekly, setIsFetchingWeekly] = useState(false);
  const [weeklyOverride, setWeeklyOverride] = useState<import('@/shared/types/global.types').WeeklyForecastDay[] | null>(null);
  const [weeklyLocation, setWeeklyLocation] = useState<string | null>(null);
  const [weeklyUpdatedAt, setWeeklyUpdatedAt] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const IRRIGATION_MODES = [
    { id: 'water' as const,       label: 'Air Biasa', emoji: '💧', desc: 'Hanya air bersih',    color: '#38bdf8', glowColor: 'rgba(56,189,248,0.35)',  borderColor: 'rgba(56,189,248,0.5)',  bgColor: 'rgba(56,189,248,0.08)'  },
    { id: 'fertilizer' as const,  label: 'Pupuk Cair',emoji: '🧪', desc: 'Hanya larutan pupuk', color: '#a78bfa', glowColor: 'rgba(167,139,250,0.35)', borderColor: 'rgba(167,139,250,0.5)', bgColor: 'rgba(167,139,250,0.08)' },
    { id: 'fertigation' as const, label: 'Air + Pupuk',emoji: '⚗️',desc: 'Campuran seimbang',   color: '#34d399', glowColor: 'rgba(52,211,153,0.35)',  borderColor: 'rgba(52,211,153,0.5)',  bgColor: 'rgba(52,211,153,0.08)'  },
  ];
  const selectedMode = IRRIGATION_MODES.find(m => m.id === irrigationMode)!;

  useEffect(() => {
    const loadData = async () => {
      const [weatherData, fetchedZones, allSensors, savings] = await Promise.all([
        fetchWeather(),
        sensorService.getZones(),
        sensorService.getAllSensorData(),
        sensorService.getEcoSavings(),
      ]);
      setWeather(weatherData);
      setZones(fetchedZones);
      setSensorDataMap(allSensors);
      setEcoSavings(savings);
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

  // ── Auto-fallback: jika weekly_forecast kosong (race condition saat VPS write),
  //    langsung fetch Open-Meteo menggunakan koordinat kebun (Depok/Beji)
  useEffect(() => {
    if (!weather) return;
    if ((weather.weekly_forecast ?? []).length > 0) return; // data sudah ada, skip
    if (weeklyOverride) return; // sudah ada override dari search, skip

    // Koordinat default kebun (Beji, Depok)
    const DEFAULT_LAT = -6.3885;
    const DEFAULT_LON = 106.7814;
    const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const wmoMap = (code: number): { icon: string; desc: string } => {
      if (code === 0)  return { icon: '☀️', desc: 'Cerah' };
      if (code <= 2)   return { icon: '⛅', desc: 'Berawan Sebagian' };
      if (code === 3)  return { icon: '☁️', desc: 'Berawan' };
      if (code <= 48)  return { icon: '🌫️', desc: 'Berkabut' };
      if (code <= 55)  return { icon: '🌦️', desc: 'Gerimis' };
      if (code <= 65)  return { icon: '🌧️', desc: 'Hujan' };
      if (code <= 77)  return { icon: '❄️', desc: 'Salju' };
      if (code <= 82)  return { icon: '🌧️', desc: 'Hujan Lebat' };
      if (code === 95) return { icon: '⛈️', desc: 'Hujan Petir' };
      if (code <= 99)  return { icon: '⛈️', desc: 'Hujan Petir + Es' };
      return { icon: '🌤️', desc: 'Cerah' };
    };

    const autoFetch = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_LAT}&longitude=${DEFAULT_LON}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FJakarta&forecast_days=7`
        );
        const json = await res.json();
        const daily = json.daily;
        if (daily?.time) {
          const days: import('@/shared/types/global.types').WeeklyForecastDay[] = daily.time.map((date: string, i: number) => {
            const { icon, desc } = wmoMap(daily.weathercode?.[i] ?? 0);
            const d = new Date(date + 'T00:00:00');
            return {
              date,
              day_name: HARI[d.getDay()] ?? '?',
              temp_max: daily.temperature_2m_max?.[i] ?? 0,
              temp_min: daily.temperature_2m_min?.[i] ?? 0,
              precipitation_probability: daily.precipitation_probability_max?.[i] ?? 0,
              precipitation_sum: daily.precipitation_sum?.[i] ?? 0,
              weather_code: daily.weathercode?.[i] ?? 0,
              icon, description: desc,
            };
          });
          setWeeklyOverride(days);
          // Tidak perlu update weeklyLocation agar tetap tampil lokasi dari weather.lokasi
        }
      } catch {
        // Gagal juga tidak apa-apa, biarkan "Data weekly belum tersedia"
      }
    };

    autoFetch();
  }, [weather, weeklyOverride]);

  const navigate = useCallback((dir: 'prev' | 'next') => {
    if (zones.length <= 1) return;
    setSlideDir(dir === 'next' ? 'right' : 'left');
    setZoneIndex(prev => dir === 'next' ? (prev + 1) % zones.length : (prev - 1 + zones.length) % zones.length);
    setAnimKey(k => k + 1);
  }, [zones.length]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Geocoding: cari lokasi ──
  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=6&language=id&format=json`
        );
        const json = await res.json();
        setSearchResults(json.results ?? []);
        setShowDropdown(true);
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 400);
  };

  // ── Fetch 7-day forecast dari Open-Meteo untuk lokasi terpilih ──
  const selectLocation = async (loc: { name: string; admin1: string; country: string; latitude: number; longitude: number }) => {
    setShowDropdown(false);
    setSearchQuery(`${loc.name}, ${loc.admin1}`);
    setSearchResults([]);
    setIsFetchingWeekly(true);
    const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const wmoMap = (code: number): { icon: string; desc: string } => {
      if (code === 0)  return { icon: '☀️', desc: 'Cerah' };
      if (code <= 2)   return { icon: '⛅', desc: 'Berawan Sebagian' };
      if (code === 3)  return { icon: '☁️', desc: 'Berawan' };
      if (code <= 48)  return { icon: '🌫️', desc: 'Berkabut' };
      if (code <= 55)  return { icon: '🌦️', desc: 'Gerimis' };
      if (code <= 65)  return { icon: '🌧️', desc: 'Hujan' };
      if (code <= 77)  return { icon: '❄️', desc: 'Salju' };
      if (code <= 82)  return { icon: '🌧️', desc: 'Hujan Lebat' };
      if (code === 95) return { icon: '⛈️', desc: 'Hujan Petir' };
      if (code <= 99)  return { icon: '⛈️', desc: 'Hujan Petir + Es' };
      return { icon: '🌤️', desc: 'Cerah' };
    };
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Asia%2FJakarta&forecast_days=7`
      );
      const json = await res.json();
      const daily = json.daily;
      if (daily?.time) {
        const days: import('@/shared/types/global.types').WeeklyForecastDay[] = daily.time.map((date: string, i: number) => {
          const { icon, desc } = wmoMap(daily.weathercode?.[i] ?? 0);
          const d = new Date(date + 'T00:00:00');
          return {
            date,
            day_name: HARI[d.getDay()] ?? '?',
            temp_max: daily.temperature_2m_max?.[i] ?? 0,
            temp_min: daily.temperature_2m_min?.[i] ?? 0,
            precipitation_probability: daily.precipitation_probability_max?.[i] ?? 0,
            precipitation_sum: daily.precipitation_sum?.[i] ?? 0,
            weather_code: daily.weathercode?.[i] ?? 0,
            icon, description: desc,
          };
        });
        setWeeklyOverride(days);
        setWeeklyLocation(`${loc.name}, ${loc.admin1}`);
        setWeeklyUpdatedAt(new Date().toISOString());
      }
    } catch { /* biarkan data lama tetap tampil */ }
    finally { setIsFetchingWeekly(false); }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setWeeklyOverride(null);
    setWeeklyLocation(null);
    setWeeklyUpdatedAt(null);
    setShowDropdown(false);
  };

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

          {/* Weather Forecast Card */}
          <div style={card} className="p-6 animate-card-entrance animate-delay-1">
            <h3 className="text-sm font-semibold mb-4 tracking-wider flex items-center gap-2" style={textMuted}>
              <CloudRain className="w-4 h-4 text-cyan-400" />
              WEATHER FORECAST
              <span className="ml-auto text-[9px] font-mono" style={textSubtle}>BMKG</span>
            </h3>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-5xl drop-shadow-lg">{weather?.icon ?? '🌤️'}</span>
              <div>
                <p className="text-3xl font-bold" style={textMain}>
                  {weather?.temperature ?? '--'}°C
                </p>
                <p className="text-sm capitalize mt-0.5" style={textMuted}>{weather?.description ?? 'Memuat...'}</p>
              </div>
            </div>

            {/* Metrics Grid: icon-only */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div style={subCard} className="p-2.5 flex flex-col items-center text-center">
                <Droplets className="w-4 h-4 text-blue-400 mb-1.5" />
                <p className="font-mono text-sm font-semibold" style={textMain}>{weather?.humidity ?? '--'}%</p>
              </div>
              <div style={subCard} className="p-2.5 flex flex-col items-center text-center">
                <Wind className="w-4 h-4 text-cyan-400 mb-1.5" />
                <p className="font-mono text-sm font-semibold" style={textMain}>{weather?.wind_speed ?? '--'} <span className="text-[9px] font-normal" style={textSubtle}>km/j</span></p>
              </div>
              <div style={subCard} className="p-2.5 flex flex-col items-center text-center">
                <Compass className="w-4 h-4 text-amber-400 mb-1.5" />
                <p className="text-[11px] font-semibold leading-tight" style={textMain}>{weather?.wind_direction ?? '--'}</p>
              </div>
            </div>

            {/* Update Timestamp */}
            <div className="flex items-center gap-1.5 pt-2 mb-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
              <Clock className="w-3 h-3" style={textSubtle} />
              <p className="text-[10px] font-mono" style={textSubtle}>
                Update: {weather?.last_update ? new Date(weather.last_update).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
              </p>
            </div>

            {/* Status Badges: Akan Hujan, Rek. Siram, Lokasi */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                style={{
                  background: weather?.akan_hujan ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                  color: weather?.akan_hujan ? '#f59e0b' : '#10b981',
                  border: `1px solid ${weather?.akan_hujan ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                }}>
                <CloudDrizzle className="w-3 h-3" />
                {weather ? (weather.akan_hujan ? 'Hujan ⚠️' : 'Cerah ✓') : '--'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                style={{
                  background: weather?.rekomendasi_siram ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  color: weather?.rekomendasi_siram ? '#10b981' : '#ef4444',
                  border: `1px solid ${weather?.rekomendasi_siram ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                <Sprout className="w-3 h-3" />
                {weather ? (weather.rekomendasi_siram ? 'Siram ✓' : 'Tunda ✗') : '--'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                style={{
                  background: 'rgba(168,85,247,0.10)',
                  color: '#c084fc',
                  border: '1px solid rgba(168,85,247,0.2)',
                }}>
                <MapPin className="w-3 h-3" />
                {weather?.lokasi ?? '--'}
              </span>
            </div>
          </div>

          {/* Weekly Forecast */}
          <div style={card} className="p-6 flex-1 min-h-[300px] flex flex-col animate-card-entrance animate-delay-3">
            {/* Header */}
            <h3 className="text-sm font-semibold mb-3 tracking-wider flex items-center gap-2" style={textMuted}>
              <Calendar className="w-4 h-4 text-cyan-400" />
              PRAKIRAAN 7 HARI
              <span className="ml-auto text-[9px] font-mono" style={textSubtle}>Open-Meteo</span>
            </h3>

            {/* Search Box */}
            <div ref={searchRef} className="relative mb-3 z-50">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors focus-within:border-cyan-500/50"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--surface-border)' }}>
                {isSearching
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: '#06b6d4' }} />
                  : <Search className="w-3.5 h-3.5 shrink-0" style={{ color: '#06b6d4' }} />
                }
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearchInput(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  placeholder="Cari lokasi lain..."
                  className="flex-1 bg-transparent outline-none text-[11px] placeholder:opacity-50"
                  style={{ color: 'var(--surface-text)' }}
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="shrink-0 hover:opacity-70 transition-opacity">
                    <X className="w-3.5 h-3.5" style={textSubtle} />
                  </button>
                )}
              </div>

              {/* Dropdown hasil pencarian */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]"
                  style={{ 
                    background: 'rgba(15, 23, 42, 0.95)', // Warna solid gelap (slate-900)
                    backdropFilter: 'blur(24px)',         // Efek blur sangat kuat
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.1)' 
                  }}>
                  {searchResults.map(loc => (
                    <button key={loc.id}
                      onClick={() => selectLocation(loc)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/10 transition-colors duration-150"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    >
                      <MapPin className="w-3 h-3 shrink-0 text-cyan-400" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold truncate" style={{ color: '#f8fafc' }}>{loc.name}</p>
                        <p className="text-[9px] truncate" style={{ color: '#94a3b8' }}>{loc.admin1}, {loc.country}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List 7 hari */}
            <div className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden mb-3 pr-1 relative">
              {isFetchingWeekly && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl z-10"
                  style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                </div>
              )}
              {((weeklyOverride ?? weather?.weekly_forecast) ?? []).length > 0 ? (
                (weeklyOverride ?? weather!.weekly_forecast).map((day, i) => {
                  const isToday = i === 0;
                  const rainHigh = day.precipitation_probability > 50;
                  return (
                    <div key={day.date}
                      className="flex items-center gap-2 py-2 px-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: isToday ? 'rgba(16,185,129,0.08)' : 'var(--surface-card)',
                        border: isToday ? '1px solid rgba(16,185,129,0.25)' : '1px solid var(--surface-border)',
                      }}
                    >
                      <span className="text-[11px] font-bold w-7 shrink-0" style={isToday ? { color: '#10b981' } : textMuted}>
                        {isToday ? 'Hari' : day.day_name}
                      </span>
                      <span className="text-xl w-7 text-center shrink-0 drop-shadow-sm">{day.icon}</span>
                      <span className="text-[10px] font-medium flex-1 leading-[1.1] line-clamp-2" style={textMain}>
                        {day.description}
                      </span>
                      <div
                        className="flex items-center gap-1 shrink-0 justify-end w-12 cursor-help"
                        title={`Suhu Maks: ${Math.round(day.temp_max)}°C | Suhu Min: ${Math.round(day.temp_min)}°C`}
                      >
                        <span className="text-xs font-mono font-bold" style={textMain}>{Math.round(day.temp_max)}°</span>
                        <span className="text-[10px] font-mono" style={textSubtle}>{Math.round(day.temp_min)}°</span>
                      </div>
                      <div className="flex items-center gap-0.5 w-10 justify-end shrink-0">
                        <Droplets className="w-3 h-3" style={{ color: rainHigh ? '#f59e0b' : '#3b82f6' }} />
                        <span className="text-[10px] font-mono font-semibold" style={{ color: rainHigh ? '#f59e0b' : '#10b981' }}>
                          {day.precipitation_probability}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <p className="text-xs" style={textSubtle}>Data weekly belum tersedia</p>
                </div>
              )}
            </div>

            {/* Footer Lokasi & Update */}
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                <p className="text-[10px] font-semibold truncate" style={textMuted}>
                  {weeklyLocation ?? weather?.lokasi ?? '--'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Clock className="w-3 h-3" style={textSubtle} />
                <p className="text-[10px] font-mono" style={textSubtle}>
                  {(weeklyUpdatedAt ?? weather?.last_update)
                    ? new Date(weeklyUpdatedAt ?? weather!.last_update).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : '--'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN (HUD) ── */}
        <div className="xl:col-span-6 flex flex-col items-center justify-center relative min-h-[500px] animate-card-entrance animate-delay-2">

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
          <div style={card} className="p-4 animate-card-entrance animate-delay-3">
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
            className={cn('relative w-full aspect-video rounded-3xl p-[2px] overflow-hidden transition-all duration-300 group animate-card-entrance animate-delay-5',
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
          <div style={card} className="p-6 flex-1 flex flex-col justify-between animate-card-entrance animate-delay-6">
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
