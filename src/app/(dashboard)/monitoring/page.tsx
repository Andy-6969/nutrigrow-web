'use client';

import { useState, useEffect } from 'react';
import { Activity, Droplets, Thermometer, Wind, Beaker } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import { cn, getThresholdColor, getSensorStatusColor } from '@/shared/lib/utils';
import { SENSOR_THRESHOLDS, ZONE_STATUS } from '@/shared/lib/constants';
import { useT } from '@/shared/context/LanguageContext';
import { sensorService } from '@/shared/services/sensorService';
import type { Zone, SensorData } from '@/shared/types/global.types';
import type { SensorHistoryPoint } from '@/shared/services/sensorService';

function GaugeCard({ label, value, unit, icon: Icon, threshold, iconColor, isOffline }: {
  label: string; value: number; unit: string; icon: React.ElementType;
  threshold: { low: number; high: number }; iconColor: string; isOffline?: boolean;
}) {
  const t = useT();
  const status = isOffline ? 'offline' : getThresholdColor(value, threshold.low, threshold.high);
  const statusColor = isOffline ? '#9CA3AF' : getSensorStatusColor(status);
  const percentage = isOffline ? 0 : Math.min(100, Math.max(0, ((value - 0) / (threshold.high * 1.3)) * 100));

  return (
    <div className={cn(
      "glass-sm p-4 flex flex-col items-center gap-2 group hover:scale-[1.02] transition-transform cursor-default",
      isOffline && "opacity-60"
    )}>
      <Icon className="w-6 h-6" style={{ color: isOffline ? '#9CA3AF' : iconColor }} />
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={statusColor}
            strokeWidth="8"
            strokeDasharray={`${percentage * 2.64} ${264 - percentage * 2.64}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>
            {isOffline ? '--' : value.toFixed(1)}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>{unit}</span>
        </div>
      </div>
      <p className="text-xs font-medium text-center" style={{ color: 'var(--surface-text-muted)' }}>{label}</p>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
        <span className="text-[10px] capitalize" style={{ color: statusColor }}>
          {isOffline ? 'Offline' : (status === 'success' ? t('common_normal') : status === 'warning' ? t('common_warning') : t('common_critical'))}
        </span>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const t = useT();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [history, setHistory] = useState<SensorHistoryPoint[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [activeMetric, setActiveMetric] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Fetch zones on mount
  useEffect(() => {
    async function loadZones() {
      const dbZones = await sensorService.getZones();
      setZones(dbZones);
      if (dbZones.length > 0) {
        setSelectedZone(dbZones[0].id);
      } else {
        setIsLoading(false);
      }
    }
    loadZones();
  }, []);

  // Fetch current sensor data when selected zone changes (and subscribe to updates)
  useEffect(() => {
    if (!selectedZone) return;

    let isMounted = true;
    async function loadCurrentData() {
      try {
        const currentData = await sensorService.getSensorData(selectedZone);
        if (isMounted) {
          setSensorData(currentData);
        }
      } catch (err) {
        console.error('Failed to load current sensor data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCurrentData();

    // Subscribe to realtime updates for the current zone
    sensorService.subscribeToSensorUpdates((payload) => {
      const newSensor = payload.new as SensorData;
      if (newSensor && newSensor.zone_id === selectedZone && isMounted) {
        setSensorData(newSensor);
      }
    });

    // Polling fallback setiap 30 detik — jika Realtime gagal/terblokir RLS
    const pollInterval = setInterval(() => {
      if (isMounted) loadCurrentData();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      sensorService.unsubscribeFromSensorUpdates();
    };
  }, [selectedZone]);

  // Monitor hardware online status dynamically (check every 5 seconds)
  useEffect(() => {
    if (!sensorData) {
      setIsOnline(false);
      return;
    }

    const checkOnlineStatus = () => {
      const recordedTime = new Date(sensorData.recorded_at).getTime();
      const diff = Date.now() - recordedTime;
      // Jika data terakhir diterima kurang dari 2 menit (120000ms), dianggap online
      setIsOnline(diff < 120000);
    };

    checkOnlineStatus();

    const interval = setInterval(checkOnlineStatus, 5000);
    return () => clearInterval(interval);
  }, [sensorData]);

  // Fetch history when selected zone or timeRange changes
  useEffect(() => {
    if (!selectedZone) return;

    let isMounted = true;
    async function loadHistory() {
      setIsChartLoading(true);
      try {
        const historyData = await sensorService.getSensorHistory(selectedZone, timeRange);
        if (isMounted) {
          setHistory(historyData);
        }
      } catch (err) {
        console.error('Failed to load sensor history', err);
      } finally {
        if (isMounted) setIsChartLoading(false);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedZone, timeRange]);

  const activeZone = zones.find(z => z.id === selectedZone);

  const metrics = [
    { id: 'all', label: t('monitoring_all_sensors') || 'Semua Sensor', color: '#10B981', icon: Activity },
    { id: 'soil_moisture', label: t(SENSOR_THRESHOLDS.soilMoisture.key), color: '#3B82F6', icon: Droplets },
    { id: 'temperature', label: t(SENSOR_THRESHOLDS.temperature.key), color: '#EF4444', icon: Thermometer },
    { id: 'humidity', label: t(SENSOR_THRESHOLDS.humidity.key), color: '#10B981', icon: Wind },
    { id: 'ph', label: t(SENSOR_THRESHOLDS.ph.key), color: '#F59E0B', icon: Beaker },
    { id: 'tds', label: t(SENSOR_THRESHOLDS.tds.key), color: '#8B5CF6', icon: Activity },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Zone Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Activity className="w-5 h-5 text-primary-500" />
          {t('monitoring_title')}
        </h2>
        <div className="flex gap-2 flex-wrap">
          {zones.map(zone => {
            const status = ZONE_STATUS[zone.status as keyof typeof ZONE_STATUS] || ZONE_STATUS.idle;
            return (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5',
                  selectedZone === zone.id
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'glass-sm hover:scale-105'
                )}
                style={selectedZone !== zone.id ? { color: 'var(--surface-text)' } : undefined}
              >
                {status.icon} {zone.name}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : zones.length === 0 ? (
        <div className="glass p-10 text-center text-gray-500">
          Belum ada zona lahan yang terdaftar.
        </div>
      ) : (
        <>
          {/* Sensor Gauges */}
          {sensorData && (
            <div className="glass p-5 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--surface-text-muted)' }}>
                  📡 {t('monitoring_current')} — {activeZone?.name}
                </h3>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border self-start sm:self-auto",
                  isOnline 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                  <span className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                  {isOnline ? "Hardware Terkoneksi (Online)" : "Hardware Terputus (Offline)"}
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <GaugeCard
                  label={t(SENSOR_THRESHOLDS.soilMoisture.key)}
                  value={sensorData.soil_moisture || 0}
                  unit={SENSOR_THRESHOLDS.soilMoisture.unit}
                  icon={Droplets}
                  threshold={SENSOR_THRESHOLDS.soilMoisture}
                  iconColor="#3B82F6"
                  isOffline={!isOnline}
                />
                <GaugeCard
                  label={t(SENSOR_THRESHOLDS.temperature.key)}
                  value={sensorData.temperature || 0}
                  unit={SENSOR_THRESHOLDS.temperature.unit}
                  icon={Thermometer}
                  threshold={SENSOR_THRESHOLDS.temperature}
                  iconColor="#EF4444"
                  isOffline={!isOnline}
                />
                <GaugeCard
                  label={t(SENSOR_THRESHOLDS.humidity.key)}
                  value={sensorData.humidity || 0}
                  unit={SENSOR_THRESHOLDS.humidity.unit}
                  icon={Wind}
                  threshold={SENSOR_THRESHOLDS.humidity}
                  iconColor="#10B981"
                  isOffline={!isOnline}
                />
                <GaugeCard
                  label={t(SENSOR_THRESHOLDS.ph.key)}
                  value={sensorData.ph || 0}
                  unit=""
                  icon={Beaker}
                  threshold={SENSOR_THRESHOLDS.ph}
                  iconColor="#F59E0B"
                  isOffline={!isOnline}
                />
                <GaugeCard
                  label={t(SENSOR_THRESHOLDS.tds.key)}
                  value={sensorData.tds || 0}
                  unit={SENSOR_THRESHOLDS.tds.unit}
                  icon={Activity}
                  threshold={SENSOR_THRESHOLDS.tds}
                  iconColor="#8B5CF6"
                  isOffline={!isOnline}
                />
              </div>
            </div>
          )}

          {/* History Chart */}
          <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h3 className="text-base font-semibold" style={{ color: 'var(--surface-text)' }}>
                📊 {t('monitoring_chart')}
              </h3>
              <div className="flex gap-1 bg-black/10 border border-white/5 rounded-lg p-1">
                {['10m', '1h', '24h', '7d', '30d'].map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      'px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                      timeRange === range ? 'bg-primary-500 text-white shadow-sm' : ''
                    )}
                    style={timeRange !== range ? { color: 'var(--surface-text-muted)' } : undefined}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric Selector Tabs */}
            <div className="flex flex-wrap gap-1.5 mb-5 p-1 rounded-xl bg-black/10 border border-white/5">
              {metrics.map(m => {
                const Icon = m.icon;
                const isSelected = activeMetric === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveMetric(m.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-250 cursor-pointer",
                      isSelected
                        ? "shadow-sm"
                        : "opacity-75 hover:opacity-100 hover:bg-white/5"
                    )}
                    style={{
                      backgroundColor: isSelected ? `${m.color}20` : 'transparent',
                      color: isSelected ? m.color : 'var(--surface-text)',
                      border: isSelected ? `1px solid ${m.color}40` : '1px solid transparent',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? m.color : 'var(--surface-text-muted)' }} />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="h-[340px] relative">
              {isChartLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl transition-all duration-300">
                  <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                </div>
              )}
              {history.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                  Tidak ada data historis untuk rentang waktu ini.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {activeMetric === 'all' ? (
                    <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
                          border: 'var(--glass-border)', borderRadius: '12px', boxShadow: 'var(--glass-shadow)',
                          color: 'var(--surface-text)'
                        }}
                        labelStyle={{ color: 'var(--surface-text-muted)', fontSize: 11, fontWeight: 'bold' }}
                        formatter={(value: any, name: any) => {
                          let unit = '';
                          if (name === t(SENSOR_THRESHOLDS.soilMoisture.key)) unit = SENSOR_THRESHOLDS.soilMoisture.unit;
                          else if (name === t(SENSOR_THRESHOLDS.temperature.key)) unit = SENSOR_THRESHOLDS.temperature.unit;
                          else if (name === t(SENSOR_THRESHOLDS.humidity.key)) unit = SENSOR_THRESHOLDS.humidity.unit;
                          else if (name === t(SENSOR_THRESHOLDS.ph.key)) unit = SENSOR_THRESHOLDS.ph.unit;
                          else if (name === t(SENSOR_THRESHOLDS.tds.key)) unit = SENSOR_THRESHOLDS.tds.unit;
                          return [`${value} ${unit}`, name];
                        }}
                      />
                      <Line type="monotone" dataKey="soil_moisture" stroke="#3B82F6" strokeWidth={2.5} dot={false} name={t(SENSOR_THRESHOLDS.soilMoisture.key)} />
                      <Line type="monotone" dataKey="temperature" stroke="#EF4444" strokeWidth={2.5} dot={false} name={t(SENSOR_THRESHOLDS.temperature.key)} />
                      <Line type="monotone" dataKey="humidity" stroke="#10B981" strokeWidth={2.5} dot={false} name={t(SENSOR_THRESHOLDS.humidity.key)} />
                      <Line type="monotone" dataKey="ph" stroke="#F59E0B" strokeWidth={2.5} dot={false} name={t(SENSOR_THRESHOLDS.ph.key)} />
                      <Line type="monotone" dataKey="tds" stroke="#8B5CF6" strokeWidth={2.5} dot={false} name={t(SENSOR_THRESHOLDS.tds.key)} />
                    </LineChart>
                  ) : (
                    <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={metrics.find(m => m.id === activeMetric)?.color} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={metrics.find(m => m.id === activeMetric)?.color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis 
                        tick={{ fontSize: 10, fill: 'var(--surface-text-muted)' }} 
                        tickLine={false} 
                        axisLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
                          border: 'var(--glass-border)', borderRadius: '12px', boxShadow: 'var(--glass-shadow)',
                          color: 'var(--surface-text)'
                        }}
                        labelStyle={{ color: 'var(--surface-text-muted)', fontSize: 11, fontWeight: 'bold' }}
                        formatter={(value: any, name: any) => {
                          const metricInfo = metrics.find(m => m.id === activeMetric);
                          let unit = '';
                          if (activeMetric === 'soil_moisture') unit = SENSOR_THRESHOLDS.soilMoisture.unit;
                          else if (activeMetric === 'temperature') unit = SENSOR_THRESHOLDS.temperature.unit;
                          else if (activeMetric === 'humidity') unit = SENSOR_THRESHOLDS.humidity.unit;
                          else if (activeMetric === 'ph') unit = SENSOR_THRESHOLDS.ph.unit;
                          else if (activeMetric === 'tds') unit = SENSOR_THRESHOLDS.tds.unit;
                          return [`${value} ${unit}`, metricInfo?.label || name];
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={activeMetric} 
                        stroke={metrics.find(m => m.id === activeMetric)?.color} 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorMetric)" 
                        name={metrics.find(m => m.id === activeMetric)?.label} 
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
