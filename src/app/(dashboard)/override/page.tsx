'use client';

import { useState } from 'react';
import { Wrench, Zap, Clock, AlertTriangle, Play, Square } from 'lucide-react';
import { cn, formatRelativeTime } from '@/shared/lib/utils';
import { ZONE_STATUS } from '@/shared/lib/constants';
import { useEffect, useCallback } from 'react';
import type { Zone, SensorData, OverrideLog } from '@/shared/types/global.types';
import { sensorService } from '@/shared/services/sensorService';
import { overrideService } from '@/shared/services/overrideService';
import { useRBAC } from '@/shared/hooks/useRBAC';

export default function OverridePage() {
  const [selectedZone, setSelectedZone] = useState('');
  const [duration, setDuration] = useState(30);
  const [overrideMode, setOverrideMode] = useState<'water' | 'fertigation'>('water');
  const [zones, setZones] = useState<Zone[]>([]);
  const [sensorDataMap, setSensorDataMap] = useState<Record<string, SensorData>>({});
  const [activeOverrides, setActiveOverrides] = useState<OverrideLog[]>([]);
  const [overrideHistory, setOverrideHistory] = useState<OverrideLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { canControlZone } = useRBAC();

  // Global Timer Tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [fetchedZones, fetchedSensors, active, history] = await Promise.all([
        sensorService.getZones(),
        sensorService.getAllSensorData(),
        overrideService.getActiveOverrides(),
        overrideService.getOverrideHistory()
      ]);
      setZones(fetchedZones);
      setSensorDataMap(fetchedSensors);
      setActiveOverrides(active);
      setOverrideHistory(history);
    } catch (error) {
      console.error("Failed to fetch override data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
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

    overrideService.subscribeToOverrides(() => {
      fetchData();
    });

    return () => {
      sensorService.unsubscribeFromSensorUpdates();
      overrideService.unsubscribeFromOverrides();
    };
  }, [fetchData]);

  const activeOverrideForSelectedZone = activeOverrides.find(o => o.zone_id === selectedZone);
  const isOverrideActive = !!activeOverrideForSelectedZone;
  // Calculate if ANY override is active globally for the red warning badge
  const isAnyOverrideActive = activeOverrides.length > 0;

  const getRemainingTime = () => {
    if (!activeOverrideForSelectedZone) return 0;
    const startedAt = new Date(activeOverrideForSelectedZone.started_at).getTime();
    const durationMs = activeOverrideForSelectedZone.duration_minutes * 60 * 1000;
    const endsAt = startedAt + durationMs;
    const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
    return remaining;
  };

  const handleActivate = async () => {
    if (!selectedZone) return;
    setIsActivating(true);
    try {
      await overrideService.startOverride(selectedZone, duration, "Manual control via web dashboard", overrideMode);
    } catch (e) {
      console.error("Failed to start override:", e);
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!activeOverrideForSelectedZone) return;
    setIsActivating(true);
    try {
      await overrideService.stopOverride(activeOverrideForSelectedZone.id);
    } catch (e) {
      console.error("Failed to stop override:", e);
    } finally {
      setIsActivating(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
        <Wrench className="w-5 h-5 text-primary-500" />
        Manual Override
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <div className={cn(
          'glass p-6 space-y-5 opacity-0 animate-fade-in-up',
          isOverrideActive && 'animate-pulse-glow'
        )} style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: 'var(--surface-text)' }}>🔧 Panel Kontrol Override</h3>
            {isAnyOverrideActive && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger-500 text-white text-xs font-bold animate-pulse">
                <Zap className="w-3 h-3" /> OVERRIDE AKTIF ({activeOverrides.length})
              </span>
            )}
          </div>

          {/* Zone Selection */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text)' }}>Pilih Zona</label>
            <div className="grid grid-cols-1 gap-2">
              {isLoading ? (
                <div className="text-sm py-4 text-center" style={{ color: 'var(--surface-text-muted)' }}>Memuat zona...</div>
              ) : zones.map(zone => {
                const status = ZONE_STATUS[zone.status];
                const sensor = sensorDataMap[zone.id];
                const hasActiveOverride = activeOverrides.some(o => o.zone_id === zone.id);
                const isAllowed = canControlZone(zone.id);
                
                return (
                  <button
                    key={zone.id}
                    onClick={() => isAllowed && setSelectedZone(zone.id)}
                    disabled={!isAllowed}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left relative',
                      selectedZone === zone.id
                        ? 'border-primary-500 bg-primary-50/50 shadow-md'
                        : 'border-transparent hover:bg-white/30',
                      hasActiveOverride && 'border-danger-300 bg-danger-50/30',
                      !isAllowed && 'opacity-50 cursor-not-allowed bg-gray-100 grayscale'
                    )}
                    style={{ borderColor: selectedZone === zone.id ? undefined : 'var(--surface-border)' }}
                  >
                    <span className="text-xl">{status.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium flex items-center" style={{ color: 'var(--surface-text)' }}>
                        {zone.name}
                        {hasActiveOverride && <span className="ml-2 text-[10px] bg-danger-500 text-white px-1.5 py-0.5 rounded">AKTIF</span>}
                        {!isAllowed && <span className="ml-2 text-[10px] bg-gray-500 text-white px-1.5 py-0.5 rounded">🔒 TERKUNCI</span>}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                        {status.label} • 💧 {sensor?.soil_moisture ?? 0}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text)' }}>Mode Penyiraman</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOverrideMode('water')}
                disabled={isOverrideActive}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                  overrideMode === 'water' ? 'border-primary-500 bg-primary-50/50 text-primary-700' : 'border-transparent bg-white/20 hover:bg-white/40',
                  isOverrideActive && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-2xl">💧</span>
                <span className="text-xs font-bold">Air Biasa</span>
              </button>
              <button
                onClick={() => setOverrideMode('fertigation')}
                disabled={isOverrideActive}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                  overrideMode === 'fertigation' ? 'border-purple-500 bg-purple-50/50 text-purple-700' : 'border-transparent bg-white/20 hover:bg-white/40',
                  isOverrideActive && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-2xl">🧪</span>
                <span className="text-xs font-bold">Air + Nutrisi</span>
              </button>
            </div>
          </div>

          {/* Duration Slider */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text)' }}>
              ⏱️ Durasi: <strong className="text-primary-600">{duration} menit</strong>
            </label>
            <input
              type="range"
              min={1}
              max={120}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              disabled={isOverrideActive}
              className="w-full h-2 bg-primary-200 rounded-lg cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--surface-text-muted)' }}>
              <span>1 menit</span>
              <span>60 menit</span>
              <span>120 menit</span>
            </div>
          </div>

          {/* Timer Display */}
          {isOverrideActive && (
            <div className="text-center py-4 glass-sm rounded-xl">
              <p className="text-xs mb-1" style={{ color: 'var(--surface-text-muted)' }}>Sisa Waktu</p>
              <p className="text-4xl font-mono font-bold text-primary-500">{formatTimer(getRemainingTime())}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--surface-text-muted)' }}>
                {zones.find(z => z.id === selectedZone)?.name}
              </p>
            </div>
          )}

          {/* Action Button */}
          {!isOverrideActive ? (
            <button
              onClick={handleActivate}
              disabled={!selectedZone || isActivating || isLoading}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-300 flex justify-center items-center',
                selectedZone && !isActivating
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl glow-sm hover:glow-md active:scale-[0.98]'
                  : 'bg-gray-300 cursor-not-allowed'
              )}
            >
              <Play className="w-5 h-5 mr-2" />
              {isActivating ? 'MEMPROSES...' : 'AKTIFKAN OVERRIDE'}
            </button>
          ) : (
            <button
              onClick={handleDeactivate}
              disabled={isActivating}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-white text-lg bg-danger-500 hover:bg-danger-600 shadow-lg transition-all duration-200 active:scale-[0.98] glow-danger flex justify-center items-center",
                isActivating && "opacity-70 cursor-not-allowed"
              )}
            >
              <Square className="w-5 h-5 mr-2" />
              {isActivating ? 'MEMPROSES...' : 'HENTIKAN OVERRIDE'}
            </button>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-accent-200/20 border border-accent-400/30">
            <AlertTriangle className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
            <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>
              Override akan mem-bypass semua logika otomatis (Fuzzy Logic & Smart Delay). 
              Aktuator akan langsung dieksekusi sesuai durasi yang ditentukan.
            </p>
          </div>
        </div>

        {/* Override Log */}
        <div className="glass p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
            📋 Riwayat Override
          </h3>
          <div className="space-y-3">
            {isLoading ? (
               <div className="text-sm py-4 text-center" style={{ color: 'var(--surface-text-muted)' }}>Memuat riwayat...</div>
            ) : [...activeOverrides, ...overrideHistory].map(log => (
              <div key={log.id} className="glass-sm p-4 flex items-start gap-3 hover:scale-[1.01] transition-transform">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shrink-0',
                  log.status === 'active' ? 'bg-primary-500 animate-pulse' : 'bg-gray-400'
                )}>
                  {log.status === 'active' ? '▶️' : '✅'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--surface-text)' }}>{log.zone_name}</p>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0',
                      log.status === 'active' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {log.status === 'active' ? 'Aktif' : 'Selesai'}
                    </span>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0',
                      log.mode === 'fertigation' ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'
                    )}>
                      {log.mode === 'fertigation' ? '🧪 Nutrisi' : '💧 Air Saja'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>
                    Oleh {log.user_name} • {log.duration_minutes} menit
                    {log.reason && ` • "${log.reason}"`}
                  </p>
                  <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--surface-text-subtle)' }}>
                    <Clock className="w-3 h-3" /> {formatRelativeTime(log.started_at)}
                  </p>
                </div>
              </div>
            ))}
            {activeOverrides.length === 0 && overrideHistory.length === 0 && !isLoading && (
              <div className="text-sm py-4 text-center" style={{ color: 'var(--surface-text-muted)' }}>Belum ada riwayat override.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
