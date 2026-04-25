'use client';

import { useState, useEffect } from 'react';
import {
  Droplets, Leaf, DollarSign, Zap, CloudRain,
  Wind, Thermometer, ArrowUpRight, ArrowDownRight,
  Timer, Play, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { mockSensorHistory, mockEcoSavings, mockWeather } from '@/shared/lib/mockData';
import { formatNumber, formatCurrency, cn } from '@/shared/lib/utils';
import { ZONE_STATUS } from '@/shared/lib/constants';
import type { Zone, SensorData, IrrigationLog } from '@/shared/types/global.types';
import { sensorService } from '@/shared/services/sensorService';
import { irrigationService } from '@/shared/services/irrigationService';

// ─── Animated Count-Up ───
function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── KPI Card ───
function KPICard({ icon: Icon, label, value, unit, trend, color, delay }: {
  icon: React.ElementType; label: string; value: number; unit: string;
  trend: number; color: string; delay: number;
}) {
  const animatedValue = useCountUp(value);
  const isPositive = trend >= 0;

  return (
    <div
      className="glass p-5 flex flex-col gap-3 opacity-0 animate-fade-in-up group cursor-default"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn(
          'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
          isPositive ? 'bg-success-50 text-primary-700' : 'bg-danger-50 text-danger-600'
        )}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--surface-text)' }}>
          {unit === 'Rp' ? formatCurrency(animatedValue) : formatNumber(animatedValue)}
          {unit !== 'Rp' && <span className="text-sm font-normal ml-1" style={{ color: 'var(--surface-text-muted)' }}>{unit}</span>}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Zone Card (Mini Agri-Twin) ───
function ZoneCard({ zone, sensor }: { zone: Zone; sensor?: SensorData }) {
  const status = ZONE_STATUS[zone.status as keyof typeof ZONE_STATUS] || ZONE_STATUS.idle;
  return (
    <div className={cn(
      'glass-sm p-3 flex items-center gap-3 cursor-pointer transition-all duration-200',
      'hover:scale-[1.02] hover:shadow-lg',
      zone.status === 'irrigating' && 'animate-pulse-glow'
    )}>
      <div className="text-2xl">{status.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--surface-text)' }}>{zone.name}</p>
        <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>{status.label} • {zone.crop_type}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-bold" style={{ color: status.color }}>{sensor?.soil_moisture ?? 0}%</p>
        <p className="text-[10px]" style={{ color: 'var(--surface-text-subtle)' }}>💧 Tanah</p>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [chartType, setChartType] = useState<'soil_moisture' | 'temperature' | 'humidity' | 'ph'>('soil_moisture');

  const [zones, setZones] = useState<Zone[]>([]);
  const [sensorDataMap, setSensorDataMap] = useState<Record<string, SensorData>>({});
  const [irrigationLogs, setIrrigationLogs] = useState<IrrigationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedZones = await sensorService.getZones();
        const fetchedSensors = await sensorService.getAllSensorData();
        const fetchedLogs = await irrigationService.getActiveIrrigations();
        const logsToDisplay = fetchedLogs.length > 0 ? fetchedLogs : await irrigationService.getIrrigationHistory();

        setZones(fetchedZones);
        setSensorDataMap(fetchedSensors);
        setIrrigationLogs(logsToDisplay);
      } catch (error) {
        console.error("Error fetching overview data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    sensorService.subscribeToSensorUpdates((payload) => {
      const newData = payload.new as SensorData;
      if (newData.zone_id) {
        setSensorDataMap(prev => ({
          ...prev,
          [newData.zone_id as string]: newData
        }));
      }
    });

    sensorService.subscribeToZoneUpdates((payload) => {
      const updatedZone = payload.new as Zone;
      setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z));
    });

    irrigationService.subscribeToIrrigationUpdates(async () => {
      const fetchedLogs = await irrigationService.getActiveIrrigations();
      const logsToDisplay = fetchedLogs.length > 0 ? fetchedLogs : await irrigationService.getIrrigationHistory();
      setIrrigationLogs(logsToDisplay);
    });

    return () => {
      sensorService.unsubscribeFromSensorUpdates();
      sensorService.unsubscribeFromZoneUpdates();
      irrigationService.unsubscribeFromIrrigationUpdates();
    };
  }, []);

  const chartColors: Record<string, string> = {
    soil_moisture: '#10B981',
    temperature: '#EF4444',
    humidity: '#3B82F6',
    ph: '#F59E0B',
  };

  const chartLabels: Record<string, string> = {
    soil_moisture: 'Kelembaban Tanah (%)',
    temperature: 'Suhu Udara (°C)',
    humidity: 'Kelembaban Udara (%)',
    ph: 'pH Tanah',
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Droplets}    label="Air Dihemat"    value={mockEcoSavings.water_saved_liters}    unit="L"  trend={mockEcoSavings.water_trend}       color="bg-gradient-to-br from-secondary-400 to-secondary-600" delay={0} />
        <KPICard icon={Leaf}        label="Pupuk Dihemat"  value={mockEcoSavings.fertilizer_saved_kg}   unit="kg" trend={mockEcoSavings.fertilizer_trend}   color="bg-gradient-to-br from-primary-400 to-primary-600" delay={100} />
        <KPICard icon={DollarSign}  label="Biaya Dihemat"  value={mockEcoSavings.cost_saved_rupiah}     unit="Rp" trend={mockEcoSavings.cost_trend}         color="bg-gradient-to-br from-accent-400 to-accent-600" delay={200} />
        <KPICard icon={Zap}         label="Energi Dihemat" value={mockEcoSavings.energy_saved_kwh}      unit="kWh" trend={mockEcoSavings.energy_trend}      color="bg-gradient-to-br from-purple-400 to-purple-600" delay={300} />
      </div>

      {/* Middle Row: Agri-Twin Mini + Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Agri-Twin Mini Map */}
        <div className="lg:col-span-2 glass p-5 opacity-0 animate-fade-in-up flex flex-col" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
              🗺️ Agri-Twin — Ringkasan Lahan
            </h3>
            <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700 font-medium">
              Live • {zones.length} Zona
            </span>
          </div>
          
          <div className="flex-1">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                  Memuat data zona...
                </div>
              </div>
            ) : zones.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {zones.map(zone => (
                  <ZoneCard 
                    key={zone.id} 
                    zone={zone} 
                    sensor={sensorDataMap[zone.id]} 
                  />
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                Belum ada data zona yang tersedia.
              </div>
            )}
          </div>
        </div>

        {/* Weather + Smart Delay */}
        <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
            🌤️ Cuaca & Smart Delay
          </h3>
          
          {/* Current Weather */}
          <div className="text-center py-4">
            <span className="text-5xl">{mockWeather.icon}</span>
            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--surface-text)' }}>{mockWeather.temperature}°C</p>
            <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>{mockWeather.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="text-center glass-sm p-2">
              <Droplets className="w-4 h-4 mx-auto text-secondary-500 mb-1" />
              <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>{mockWeather.humidity}%</p>
              <p className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>Kelembaban</p>
            </div>
            <div className="text-center glass-sm p-2">
              <CloudRain className="w-4 h-4 mx-auto text-accent-500 mb-1" />
              <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>{mockWeather.pop}%</p>
              <p className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>Prob. Hujan</p>
            </div>
            <div className="text-center glass-sm p-2">
              <Wind className="w-4 h-4 mx-auto text-primary-500 mb-1" />
              <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>{mockWeather.wind_speed}</p>
              <p className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>km/h</p>
            </div>
          </div>

          {/* Smart Delay Status */}
          <div className={cn(
            'rounded-xl p-3 border',
            mockWeather.pop > 70
              ? 'bg-accent-200/20 border-accent-400/30'
              : 'bg-primary-100/30 border-primary-300/30'
          )}>
            <div className="flex items-center gap-2">
              {mockWeather.pop > 70 ? (
                <AlertCircle className="w-4 h-4 text-accent-600" />
              ) : (
                <Play className="w-4 h-4 text-primary-600" />
              )}
              <span className="text-xs font-semibold" style={{ color: 'var(--surface-text)' }}>
                {mockWeather.pop > 70 ? '⏸️ Smart Delay AKTIF' : '✅ Status: NORMAL'}
              </span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--surface-text-muted)' }}>
              {mockWeather.pop > 70
                ? 'Penyiraman ditunda — hujan diprediksi dalam 3 jam'
                : 'Tidak ada penundaan — sistem beroperasi normal'}
            </p>
          </div>

          {/* Next Schedule */}
          <div className="mt-4 glass-sm p-3">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-medium" style={{ color: 'var(--surface-text)' }}>Jadwal Berikutnya</span>
            </div>
            <p className="text-sm font-semibold mt-1" style={{ color: 'var(--surface-text)' }}>14:30 — Zona 2 (Kebun Timur)</p>
            <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>Durasi: 20 menit • Termasuk fertigasi</p>
          </div>
        </div>
      </div>

      {/* Sensor Chart */}
      <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
            📈 Pembacaan Sensor — 24 Jam Terakhir
          </h3>
          <div className="flex gap-1 bg-white/50 rounded-lg p-1" style={{ border: '1px solid var(--surface-border)' }}>
            {Object.entries(chartLabels).map(([key, label]) => {
              const shortLabels: Record<string, string> = {
                soil_moisture: 'K. Tanah',
                temperature: 'Suhu',
                humidity: 'K. Udara',
                ph: 'pH',
              };
              return (
              <button
                key={key}
                onClick={() => setChartType(key as typeof chartType)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                  chartType === key
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'hover:bg-white/60'
                )}
                style={chartType !== key ? { color: 'var(--surface-text-muted)' } : undefined}
              >
                {shortLabels[key] || label.split(' ')[0]}
              </button>
              );
            })}
          </div>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockSensorHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSensor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[chartType]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColors[chartType]} stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--surface-text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={5}
              />
              <YAxis
                tick={{ fill: 'var(--surface-text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(12px)',
                  border: 'var(--glass-border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--glass-shadow)',
                }}
                labelStyle={{ color: 'var(--surface-text)', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey={chartType}
                stroke={chartColors[chartType]}
                strokeWidth={2}
                fill="url(#colorSensor)"
                dot={false}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}>
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          🕒 Aktivitas Penyiraman Terkini
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>Zona</th>
                <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>Sumber</th>
                <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>Durasi</th>
                <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>Volume</th>
                <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                    Memuat aktivitas...
                  </td>
                </tr>
              ) : irrigationLogs.length > 0 ? (
                irrigationLogs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-white/30 transition-colors" style={{ borderColor: 'var(--surface-border)' }}>
                    <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--surface-text)' }}>{log.zone_name}</td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        log.source === 'auto' && 'bg-primary-100 text-primary-700',
                        log.source === 'schedule' && 'bg-secondary-100 text-secondary-700',
                        log.source === 'manual_override' && 'bg-accent-200 text-accent-600',
                      )}>
                        {log.source === 'auto' ? '🤖 Otomatis' : log.source === 'schedule' ? '📅 Jadwal' : '🔧 Override'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{log.duration_minutes}m</td>
                    <td className="py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{formatNumber(log.water_volume_liters)}L</td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        log.status === 'running' && 'bg-primary-100 text-primary-700 animate-pulse',
                        log.status === 'completed' && 'bg-gray-100 text-gray-600',
                      )}>
                        {log.status === 'running' ? '▶️ Berjalan' : '✅ Selesai'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                    Belum ada riwayat aktivitas penyiraman.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
