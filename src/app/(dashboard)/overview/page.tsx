'use client';

import { useState, useEffect } from 'react';
import {
  Droplets, Leaf, Zap, CloudRain,
  Wind, Thermometer, Power, Activity, ChevronRight
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
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);
  const [isHoveringOverride, setIsHoveringOverride] = useState(false);

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

      // Auto-select the first zone
      if (fetchedZones.length > 0) {
        setSelectedZoneId(fetchedZones[0].id);
      }
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

  // Derived data from selected zone
  const selectedZone = zones.find(z => z.id === selectedZoneId) ?? null;
  const liveSensor = selectedZoneId ? (sensorDataMap[selectedZoneId] ?? null) : null;
  const zoneStatus = selectedZone
    ? (ZONE_STATUS[selectedZone.status as keyof typeof ZONE_STATUS] ?? ZONE_STATUS.idle)
    : null;
  const nodeIndex = zones.findIndex(z => z.id === selectedZoneId) + 1;

  const handleManualOverride = async () => {
    setIsOverriding(true);
    await new Promise(res => setTimeout(res, 2000));
    alert(`Manual Override diaktifkan untuk ${selectedZone?.name ?? 'zona'}! Sistem sedang menyiram.`);
    setIsOverriding(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 relative overflow-hidden p-6 -m-4 lg:-m-6">
      {/* Cinematic Radial Glow Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10 max-w-[1800px] mx-auto">

        {/* ======================================= */}
        {/* LEFT COLUMN: Context (Weather & Charts) */}
        {/* ======================================= */}
        <div className="xl:col-span-3 space-y-6 flex flex-col">
          {/* Weather Widget */}
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

          {/* 24h Trend Chart */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl flex-1 min-h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              TREN 24 JAM
              {selectedZone && (
                <span className="ml-auto text-[10px] text-slate-600 font-mono truncate max-w-[80px]">
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
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={6}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px'
                    }}
                    itemStyle={{ color: '#10B981' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="soil_moisture"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#colorSoil)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ======================================= */}
        {/* CENTER COLUMN: The Star (Agri-Twin HUD) */}
        {/* ======================================= */}
        <div className="xl:col-span-6 flex flex-col items-center justify-center relative min-h-[500px]">
          {/* HUD Header */}
          <div className="absolute top-0 text-center w-full z-20">
            <h2 className="text-3xl font-extrabold tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 uppercase">
              {selectedZone
                ? (selectedZone.name.split(' - ')[1] || selectedZone.name)
                : 'Main Greenhouse'}
            </h2>

            {/* Status & Zone indicator */}
            <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: zoneStatus?.color ?? '#10b981' }}
                />
                <span className="text-xs font-mono text-emerald-400 tracking-widest">
                  SYSTEM ONLINE // NODE {String(nodeIndex).padStart(2, '0')}
                </span>
              </div>
              {selectedZone && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${zoneStatus?.color ?? '#10b981'}20`,
                    color: zoneStatus?.color ?? '#10b981',
                  }}
                >
                  {zoneStatus?.icon} {zoneStatus?.label}
                </span>
              )}
            </div>

            {/* ─── ZONE SWITCHER — only shows when > 1 zone ─── */}
            {zones.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap px-4">
                {zones.map((zone, idx) => {
                  const st = ZONE_STATUS[zone.status as keyof typeof ZONE_STATUS] ?? ZONE_STATUS.idle;
                  const isActive = zone.id === selectedZoneId;
                  return (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold transition-all duration-200',
                        isActive
                          ? 'bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-lg'
                          : 'bg-black/30 border border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/15'
                      )}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: st.color }}
                      />
                      N{String(idx + 1).padStart(2, '0')}
                      <span className="hidden sm:inline text-slate-400 font-normal">
                        · {zone.name.split(' - ')[1] || zone.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Greenhouse Animation Container */}
          <div className="relative w-full max-w-[600px] aspect-square flex items-center justify-center">
            {/* 3D Greenhouse Animation */}
            <div className="w-[90%] h-[90%] relative z-10">
              <GreenhouseAnimation />
            </div>

            {/* HUD Floating Badges */}
            <div className="absolute top-[15%] left-[5%] bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Droplets className="w-4 h-4 text-blue-400" />
              <span className="font-mono text-sm font-semibold">{liveSensor?.soil_moisture ?? '--'}%</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider ml-1">Soil</span>
            </div>

            <div className="absolute top-[25%] right-[0%] bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="font-mono text-sm font-semibold">{liveSensor?.temperature ?? '--'}°C</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider ml-1">Temp</span>
            </div>

            <div className="absolute bottom-[20%] left-[0%] bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-xl animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <div className="w-4 h-4 flex items-center justify-center text-purple-400 font-bold text-xs">pH</div>
              <span className="font-mono text-sm font-semibold">{liveSensor?.ph ?? '--'}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider ml-1">Acid</span>
            </div>

            <div className="absolute bottom-[10%] right-[5%] bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-xl animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <Wind className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-sm font-semibold">{liveSensor?.humidity ?? '--'}%</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider ml-1">Humid</span>
            </div>

            {/* Decorative HUD Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-white/5 rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] border border-dashed border-white/5 rounded-full pointer-events-none animate-spin-slow" style={{ animationDuration: '60s' }} />
          </div>
        </div>

        {/* ======================================= */}
        {/* RIGHT COLUMN: Command & Vitals */}
        {/* ======================================= */}
        <div className="xl:col-span-3 space-y-6 flex flex-col">

          {/* Giant OVERRIDE Button */}
          <button
            onClick={handleManualOverride}
            disabled={isOverriding}
            onMouseEnter={() => setIsHoveringOverride(true)}
            onMouseLeave={() => setIsHoveringOverride(false)}
            className={cn(
              "relative w-full aspect-video rounded-3xl p-1 overflow-hidden transition-all duration-300 group",
              isOverriding ? "cursor-not-allowed opacity-80" : "cursor-pointer"
            )}
          >
            {/* Button animated border glow */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 opacity-20 group-hover:opacity-100 transition-opacity duration-500",
              isHoveringOverride && "animate-gradient-x"
            )} />

            {/* Inner Button Content */}
            <div className="absolute inset-[2px] bg-slate-950 rounded-[22px] flex flex-col items-center justify-center gap-3 transition-colors duration-300 z-10">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl",
                isOverriding
                  ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                  : "bg-slate-800 text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 group-hover:shadow-[0_0_50px_rgba(16,185,129,0.5)]"
              )}>
                <Power className={cn("w-8 h-8", isOverriding && "animate-pulse")} />
              </div>
              <div className="text-center">
                <p className="font-mono font-bold tracking-widest text-lg text-white">
                  {isOverriding ? 'MENYIRAM...' : 'MANUAL OVERRIDE'}
                </p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
                  {isOverriding
                    ? 'Proses Berjalan'
                    : selectedZone
                      ? `${selectedZone.name.split(' - ')[1] || 'Zona'}`
                      : 'Siram Sekarang'
                  }
                </p>
              </div>
            </div>
          </button>

          {/* Eco-Savings Summary Stack */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-slate-400 mb-6 tracking-wider flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-400" />
              ECO-SAVINGS IMPACT
            </h3>

            <div className="space-y-6">
              {/* Water Saved */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-1">Air Dihemat</p>
                  <p className="font-mono text-xl font-bold">{formatNumber(mockEcoSavings.water_saved_liters)}<span className="text-sm text-slate-500 ml-1">L</span></p>
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Fertilizer Saved */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-1">Pupuk Dihemat</p>
                  <p className="font-mono text-xl font-bold">{formatNumber(mockEcoSavings.fertilizer_saved_kg)}<span className="text-sm text-slate-500 ml-1">kg</span></p>
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Energy Saved */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
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
