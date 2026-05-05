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
import GreenhouseAnimation, { type GreenhouseCondition } from '@/shared/components/GreenhouseAnimation';
import { fetchWeather } from '@/shared/services/weatherService';
import { useT } from '@/shared/context/LanguageContext';
import { overrideService } from '@/shared/services/overrideService';

// Static particle data — defined outside component to avoid re-creation
const PARTICLES = [
  { x: 3,  y: 5,  size: 2,   color: 'rgba(16,185,129,0.7)',  dur: 14, del: 0   },
  { x: 12, y: 20, size: 1.5, color: 'rgba(6,182,212,0.6)',   dur: 18, del: 1.5 },
  { x: 22, y: 45, size: 2.5, color: 'rgba(16,185,129,0.5)',  dur: 12, del: 3   },
  { x: 35, y: 10, size: 1,   color: 'rgba(99,102,241,0.6)',  dur: 20, del: 0.5 },
  { x: 48, y: 60, size: 2,   color: 'rgba(6,182,212,0.5)',   dur: 16, del: 2   },
  { x: 58, y: 30, size: 1.5, color: 'rgba(16,185,129,0.7)',  dur: 13, del: 4   },
  { x: 67, y: 70, size: 1,   color: 'rgba(6,182,212,0.4)',   dur: 22, del: 1   },
  { x: 75, y: 15, size: 2,   color: 'rgba(52,211,153,0.6)',  dur: 17, del: 3.5 },
  { x: 82, y: 50, size: 1.5, color: 'rgba(16,185,129,0.5)',  dur: 15, del: 0.8 },
  { x: 90, y: 35, size: 2.5, color: 'rgba(99,102,241,0.5)',  dur: 19, del: 2.5 },
  { x: 8,  y: 75, size: 1,   color: 'rgba(6,182,212,0.6)',   dur: 11, del: 5   },
  { x: 18, y: 90, size: 2,   color: 'rgba(16,185,129,0.6)',  dur: 16, del: 1.2 },
  { x: 30, y: 55, size: 1.5, color: 'rgba(52,211,153,0.5)',  dur: 21, del: 3.8 },
  { x: 42, y: 85, size: 1,   color: 'rgba(6,182,212,0.5)',   dur: 14, del: 0.3 },
  { x: 55, y: 40, size: 2,   color: 'rgba(16,185,129,0.7)',  dur: 18, del: 2.8 },
  { x: 72, y: 25, size: 2.5, color: 'rgba(6,182,212,0.4)',   dur: 23, del: 1.7 },
  { x: 85, y: 65, size: 1,   color: 'rgba(52,211,153,0.7)',  dur: 15, del: 0.6 },
  { x: 93, y: 10, size: 2,   color: 'rgba(16,185,129,0.5)',  dur: 20, del: 3.2 },
];

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

  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const t = useT();

  const IRRIGATION_MODES = [
    { id: 'water' as const,       label: t('override_mode_water'), emoji: '💧', desc: t('overview_water_desc'),    color: '#38bdf8', glowColor: 'rgba(56,189,248,0.35)',  borderColor: 'rgba(56,189,248,0.5)',  bgColor: 'rgba(56,189,248,0.08)'  },
    { id: 'fertilizer' as const,  label: t('overview_fertilizer_liquid'),emoji: '🧪', desc: t('overview_fertilizer_desc'), color: '#a78bfa', glowColor: 'rgba(167,139,250,0.35)', borderColor: 'rgba(167,139,250,0.5)', bgColor: 'rgba(167,139,250,0.08)' },
    { id: 'fertigation' as const, label: t('override_mode_fertigation'),emoji: '⚗️',desc: t('overview_fertigation_desc'),   color: '#34d399', glowColor: 'rgba(52,211,153,0.35)',  borderColor: 'rgba(52,211,153,0.5)',  bgColor: 'rgba(52,211,153,0.08)'  },
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

  useEffect(() => {
    if (!weather) return;
    if ((weather.weekly_forecast ?? []).length > 0) return;
    if (weeklyOverride) return;

    const DEFAULT_LAT = -6.3885;
    const DEFAULT_LON = 106.7814;
    const HARI = t('common_lang_code') === 'id' ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const wmoMap = (code: number): { icon: string; desc: string } => {
      if (code === 0)  return { icon: '☀️', desc: t('common_lang_code') === 'id' ? 'Cerah' : 'Clear' };
      if (code <= 2)   return { icon: '⛅', desc: t('common_lang_code') === 'id' ? 'Berawan Sebagian' : 'Partly Cloudy' };
      if (code === 3)  return { icon: '☁️', desc: t('common_lang_code') === 'id' ? 'Berawan' : 'Cloudy' };
      if (code <= 48)  return { icon: '🌫️', desc: t('common_lang_code') === 'id' ? 'Berkabut' : 'Foggy' };
      if (code <= 55)  return { icon: '🌦️', desc: t('common_lang_code') === 'id' ? 'Gerimis' : 'Drizzle' };
      if (code <= 65)  return { icon: '🌧️', desc: t('common_lang_code') === 'id' ? 'Hujan' : 'Rain' };
      if (code <= 77)  return { icon: '❄️', desc: t('common_lang_code') === 'id' ? 'Salju' : 'Snow' };
      if (code <= 82)  return { icon: '🌧️', desc: t('common_lang_code') === 'id' ? 'Hujan Lebat' : 'Heavy Rain' };
      if (code === 95) return { icon: '⛈️', desc: t('common_lang_code') === 'id' ? 'Hujan Petir' : 'Thunderstorm' };
      if (code <= 99)  return { icon: '⛈️', desc: t('common_lang_code') === 'id' ? 'Hujan Petir + Es' : 'Thunderstorm + Hail' };
      return { icon: '🌤️', desc: t('common_lang_code') === 'id' ? 'Cerah' : 'Clear' };
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
        }
      } catch { }
    };
    autoFetch();
  }, [weather, weeklyOverride, t]);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollY(scrollTop);
      setScrollProgress(maxScroll > 0 ? scrollTop / maxScroll : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navigate = useCallback((dir: 'prev' | 'next') => {
    if (zones.length <= 1) return;
    setSlideDir(dir === 'next' ? 'right' : 'left');
    setZoneIndex(prev => dir === 'next' ? (prev + 1) % zones.length : (prev - 1 + zones.length) % zones.length);
    setAnimKey(k => k + 1);
  }, [zones.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const selectLocation = async (loc: { name: string; admin1: string; country: string; latitude: number; longitude: number }) => {
    setShowDropdown(false);
    setSearchQuery(`${loc.name}, ${loc.admin1}`);
    setSearchResults([]);
    setIsFetchingWeekly(true);
    const HARI = t('common_lang_code') === 'id' ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const wmoMap = (code: number): { icon: string; desc: string } => {
      if (code === 0)  return { icon: '☀️', desc: t('common_lang_code') === 'id' ? 'Cerah' : 'Clear' };
      if (code <= 2)   return { icon: '⛅', desc: t('common_lang_code') === 'id' ? 'Berawan Sebagian' : 'Partly Cloudy' };
      if (code === 3)  return { icon: '☁️', desc: t('common_lang_code') === 'id' ? 'Berawan' : 'Cloudy' };
      if (code <= 48)  return { icon: '🌫️', desc: t('common_lang_code') === 'id' ? 'Berkabut' : 'Foggy' };
      if (code <= 55)  return { icon: '🌦️', desc: t('common_lang_code') === 'id' ? 'Gerimis' : 'Drizzle' };
      if (code <= 65)  return { icon: '🌧️', desc: t('common_lang_code') === 'id' ? 'Hujan' : 'Rain' };
      if (code <= 77)  return { icon: '❄️', desc: t('common_lang_code') === 'id' ? 'Salju' : 'Snow' };
      if (code <= 82)  return { icon: '🌧️', desc: t('common_lang_code') === 'id' ? 'Hujan Lebat' : 'Heavy Rain' };
      if (code === 95) return { icon: '⛈️', desc: t('common_lang_code') === 'id' ? 'Hujan Petir' : 'Thunderstorm' };
      if (code <= 99)  return { icon: '⛈️', desc: t('common_lang_code') === 'id' ? 'Hujan Petir + Es' : 'Thunderstorm + Hail' };
      return { icon: '🌤️', desc: t('common_lang_code') === 'id' ? 'Cerah' : 'Clear' };
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
    } catch { }
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

      <div className="fixed top-0 left-0 right-0 h-0.5 z-[200] pointer-events-none">
        <div className="h-full transition-all duration-75"
          style={{
            width: `${scrollProgress * 100}%`,
            background: 'linear-gradient(90deg, #10b981, #06b6d4, #6366f1)',
            boxShadow: '0 0 10px rgba(16,185,129,0.8), 0 0 20px rgba(6,182,212,0.4)',
          }} />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute rounded-full"
          style={{
            top: '5%', left: '8%', width: '650px', height: '650px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.16) 0%, rgba(5,150,105,0.06) 50%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'aurora1 14s ease-in-out infinite',
            transform: `translateY(${scrollY * -0.06}px)`,
          }} />
        <div className="absolute rounded-full"
          style={{
            top: '-12%', right: '4%', width: '580px', height: '580px',
            background: 'radial-gradient(circle, rgba(6,182,212,0.13) 0%, rgba(8,145,178,0.05) 50%, transparent 70%)',
            filter: 'blur(75px)',
            animation: 'aurora2 17s ease-in-out infinite',
            transform: `translateY(${scrollY * -0.04}px)`,
          }} />
        <div className="absolute rounded-full"
          style={{
            bottom: '2%', right: '18%', width: '480px', height: '480px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, rgba(79,70,229,0.04) 50%, transparent 70%)',
            filter: 'blur(70px)',
            animation: 'aurora3 20s ease-in-out infinite',
            transform: `translateY(${scrollY * -0.03}px)`,
          }} />
        <div className="absolute rounded-full"
          style={{
            bottom: '-8%', left: '32%', width: '750px', height: '380px',
            background: 'radial-gradient(ellipse, rgba(20,184,166,0.09) 0%, transparent 70%)',
            filter: 'blur(90px)',
            animation: 'aurora2 22s ease-in-out infinite reverse',
          }} />

        <div className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(16,185,129,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.022) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'gridDrift 14s linear infinite',
          }} />

        <div className="absolute left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0) 10%, rgba(16,185,129,0.5) 35%, rgba(6,182,212,0.4) 50%, rgba(16,185,129,0.5) 65%, rgba(16,185,129,0) 90%, transparent 100%)',
            boxShadow: '0 0 14px rgba(16,185,129,0.35)',
            animation: 'scanSweep 10s linear infinite',
          }} />

        {[0, 2, 4].map((delay, i) => (
          <div key={i} className="absolute rounded-full border"
            style={{
              width: '600px', height: '600px',
              top: '50%', left: '50%',
              borderColor: i === 0 ? 'rgba(16,185,129,0.06)' : i === 1 ? 'rgba(6,182,212,0.05)' : 'rgba(99,102,241,0.04)',
              animation: `pulseRing 7s ease-out infinite`,
              animationDelay: `${delay}s`,
            }} />
        ))}

        {PARTICLES.map((p, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              bottom: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
              animation: `particleFloat ${p.dur}s ${p.del}s ease-in-out infinite`,
            }} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10 max-w-[1800px] mx-auto">

        {/* ── LEFT COLUMN ── */}
        <div className="xl:col-span-3 space-y-6 flex flex-col">

          {/* Weather Forecast Card */}
          <div style={card} className="p-6 animate-card-entrance animate-delay-1">
            <h3 className="text-sm font-semibold mb-4 tracking-wider flex items-center gap-2" style={textMuted}>
              <CloudRain className="w-4 h-4 text-cyan-400" />
              {t('overview_weather').toUpperCase()}
              <span className="ml-auto text-[9px] font-mono" style={textSubtle}>BMKG</span>
            </h3>
            <div className="flex items-center gap-4 mb-5">
              <span className="text-5xl drop-shadow-lg">{weather?.icon ?? '🌤️'}</span>
              <div>
                <p className="text-3xl font-bold" style={textMain}>
                  {weather?.temperature ?? '--'}°C
                </p>
                <p className="text-sm capitalize mt-0.5" style={textMuted}>{weather?.description ?? t('common_loading')}</p>
              </div>
            </div>

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

            <div className="flex items-center gap-1.5 pt-2 mb-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
              <Clock className="w-3 h-3" style={textSubtle} />
              <p className="text-[10px] font-mono" style={textSubtle}>
                {t('overview_last_update')}: {weather?.last_update ? new Date(weather.last_update).toLocaleString(t('common_lang_code') === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                style={{
                  background: weather?.akan_hujan ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                  color: weather?.akan_hujan ? '#f59e0b' : '#10b981',
                  border: `1px solid ${weather?.akan_hujan ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                }}>
                <CloudDrizzle className="w-3 h-3" />
                {weather ? (weather.akan_hujan ? t('overview_rain_warning') : t('overview_clear_ok')) : '--'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                style={{
                  background: weather?.rekomendasi_siram ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                  color: weather?.rekomendasi_siram ? '#10b981' : '#ef4444',
                  border: `1px solid ${weather?.rekomendasi_siram ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                <Sprout className="w-3 h-3" />
                {weather ? (weather.rekomendasi_siram ? t('overview_water_ok') : t('overview_delay_warning')) : '--'}
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
            <h3 className="text-sm font-semibold mb-3 tracking-wider flex items-center gap-2" style={textMuted}>
              <Calendar className="w-4 h-4 text-cyan-400" />
              {t('overview_forecast').toUpperCase()}
              <span className="ml-auto text-[9px] font-mono" style={textSubtle}>Open-Meteo</span>
            </h3>

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
                  placeholder={t('overview_search_location')}
                  className="flex-1 bg-transparent outline-none text-[11px] placeholder:opacity-50"
                  style={{ color: 'var(--surface-text)' }}
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="shrink-0 hover:opacity-70 transition-opacity">
                    <X className="w-3.5 h-3.5" style={textSubtle} />
                  </button>
                )}
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]"
                  style={{ 
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(24px)',
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
                        {isToday ? (t('common_lang_code') === 'id' ? 'Hari' : 'Today') : day.day_name}
                      </span>
                      <span className="text-xl w-7 text-center shrink-0 drop-shadow-sm">{day.icon}</span>
                      <span className="text-[10px] font-medium flex-1 leading-[1.1] line-clamp-2" style={textMain}>
                        {day.description}
                      </span>
                      <div
                        className="flex items-center gap-1 shrink-0 justify-end w-12 cursor-help"
                        title={t('common_lang_code') === 'id' ? `Suhu Maks: ${Math.round(day.temp_max)}°C | Suhu Min: ${Math.round(day.temp_min)}°C` : `Max Temp: ${Math.round(day.temp_max)}°C | Min Temp: ${Math.round(day.temp_min)}°C`}
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
                  <p className="text-xs" style={textSubtle}>{t('common_no_data')}</p>
                </div>
              )}
            </div>

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
                    ? new Date(weeklyUpdatedAt ?? weather!.last_update).toLocaleTimeString(t('common_lang_code') === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                    : '--'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN (HUD) ── */}
        <div className="xl:col-span-6 flex flex-col items-center justify-center relative min-h-[500px] animate-card-entrance animate-delay-2">

          <div className="absolute top-0 text-center w-full z-20 px-12" style={slideInStyle} key={`header-${animKey}`}>
            <h2 className="text-3xl font-extrabold tracking-[0.2em] uppercase" style={textMain}>
              {selectedZone ? (selectedZone.name.split(' - ')[1] || selectedZone.name) : 'Main Greenhouse'}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: zoneStatus?.color ?? '#10b981' }} />
              <span className="text-xs font-mono tracking-widest" style={{ color: '#10b981' }}>
                SYSTEM ONLINE // {t('overview_node')} {String(zoneIndex + 1).padStart(2, '0')} {t('overview_of')} {String(zones.length).padStart(2, '0')}
              </span>
              {selectedZone && zoneStatus && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${zoneStatus.color}20`, color: zoneStatus.color }}>
                  {zoneStatus.icon} {t(zoneStatus.key)}
                </span>
              )}
            </div>
            {selectedZone && (
              <p className="text-[11px] font-mono mt-1" style={textSubtle}>
                {selectedZone.crop_type} · {selectedZone.area_ha} ha
              </p>
            )}
          </div>

          {multiZone && (
            <button onClick={() => navigate('prev')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md hover:scale-110 transition-all duration-200 shadow-xl"
              style={{ background: 'var(--surface-card)', border: 'var(--glass-border)', color: 'var(--surface-text-muted)' }}
              title={t('common_lang_code') === 'id' ? 'Zona Sebelumnya' : 'Previous Zone'}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative w-full max-w-[560px] aspect-square flex items-center justify-center overflow-hidden"
            key={`scene-${animKey}`} style={slideInStyle}>
            <div className="w-[90%] h-[90%] relative z-10">
              <GreenhouseAnimation condition={animCondition} />
            </div>

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

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] rounded-full pointer-events-none"
              style={{ border: '1px solid var(--surface-border)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] border-dashed rounded-full pointer-events-none"
              style={{ border: '1px dashed var(--surface-border)', animation: 'spin 60s linear infinite' }} />
          </div>

          {multiZone && (
            <button onClick={() => navigate('next')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md hover:scale-110 transition-all duration-200 shadow-xl"
              style={{ background: 'var(--surface-card)', border: 'var(--glass-border)', color: 'var(--surface-text-muted)' }}
              title={t('common_lang_code') === 'id' ? 'Zona Berikutnya' : 'Next Zone'}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

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

          <div style={card} className="p-4 animate-card-entrance animate-delay-3">
            <p className="text-[10px] font-mono tracking-widest mb-3 uppercase" style={textMuted}>{t('override_mode_label').toUpperCase()}</p>
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
                  {isOverriding ? t('overview_watering') : t('overview_manual_override')}
                </p>
                <p className="text-xs mt-1 uppercase tracking-widest" style={textMuted}>
                  {isOverriding ? (t('common_lang_code') === 'id' ? 'Proses Berjalan' : 'Running Process') : (selectedZone?.name.split(' - ')[1] || t('overview_water_now'))}
                </p>
              </div>
            </div>
          </button>

          <div style={card} className="p-6 flex-1 flex flex-col justify-between animate-card-entrance animate-delay-6">
            <h3 className="text-sm font-semibold mb-6 tracking-wider flex items-center gap-2" style={textMuted}>
              <Leaf className="w-4 h-4 text-emerald-500" />
              {t('overview_ecosavings').toUpperCase()} IMPACT
            </h3>
            <div className="space-y-5">
              {[
                { icon: <Droplets className="w-5 h-5 text-blue-400"/>,   bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)',  label: t('eco_water_saved'),    val: formatNumber(ecoSavings?.water_saved_liters ?? 0),   unit: 'L'   },
                { icon: <Leaf className="w-5 h-5 text-emerald-400"/>,    bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)',  label: t('eco_fertilizer_saved'),  val: formatNumber(ecoSavings?.fertilizer_saved_kg ?? 0),  unit: 'kg'  },
                { icon: <Zap className="w-5 h-5 text-purple-400"/>,      bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)',  label: t('eco_energy_saved'), val: formatNumber(ecoSavings?.energy_saved_kwh ?? 0),     unit: 'kWh' },
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
              <span style={textMuted}>{t('eco_cost_saved')}</span>
              <span className="font-mono text-emerald-500 font-semibold">Rp {formatNumber(ecoSavings?.cost_saved_rupiah ?? 0)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
