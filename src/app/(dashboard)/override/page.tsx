'use client';
/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/set-state-in-effect */

import { useState } from 'react';
import { Wrench, Zap, Clock, AlertTriangle, Play, Square } from 'lucide-react';
import { cn, formatRelativeTime } from '@/shared/lib/utils';
import { ZONE_STATUS } from '@/shared/lib/constants';
import { useEffect, useCallback } from 'react';
import type { Zone, SensorData, OverrideLog } from '@/shared/types/global.types';
import { sensorService } from '@/shared/services/sensorService';
import { overrideService } from '@/shared/services/overrideService';
import { useRBAC } from '@/shared/hooks/useRBAC';
import { useT } from '@/shared/context/LanguageContext';

type ActuatorTarget = 'pump' | 'solenoid';

export default function OverridePage() {
  const [selectedZone, setSelectedZone] = useState('');
  const [duration, setDuration] = useState(30);
  const [zones, setZones] = useState<Zone[]>([]);
  const [sensorDataMap, setSensorDataMap] = useState<Record<string, SensorData>>({});
  const [activeOverrides, setActiveOverrides] = useState<OverrideLog[]>([]);
  const [overrideHistory, setOverrideHistory] = useState<OverrideLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState<ActuatorTarget | null>(null);
  const [now, setNow] = useState(Date.now());
  const { canControlZone } = useRBAC();
  const t = useT();

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

  // Check active overrides for pump/solenoid separately per zone
  const getActiveOverrideByTarget = (zoneId: string, target: ActuatorTarget) => {
    return activeOverrides.find(o => o.zone_id === zoneId && o.mode === target);
  };

  const isPumpActive = selectedZone ? !!getActiveOverrideByTarget(selectedZone, 'pump') : false;
  const isSolenoidActive = selectedZone ? !!getActiveOverrideByTarget(selectedZone, 'solenoid') : false;
  const isAnyOverrideActive = activeOverrides.length > 0;

  const getRemainingTime = (override: OverrideLog | undefined) => {
    if (!override) return 0;
    const startedAt = new Date(override.started_at).getTime();
    const durationMs = override.duration_minutes * 60 * 1000;
    const endsAt = startedAt + durationMs;
    return Math.max(0, Math.floor((endsAt - now) / 1000));
  };

  const handleActivate = async (target: ActuatorTarget) => {
    if (!selectedZone) return;
    setIsActivating(target);
    try {
      await overrideService.startOverride(selectedZone, duration, "Manual control via web dashboard", 'water', target);
    } catch (e) {
      console.error(`Failed to start override (${target}):`, e);
    } finally {
      setIsActivating(null);
    }
  };

  const handleDeactivate = async (target: ActuatorTarget) => {
    const override = getActiveOverrideByTarget(selectedZone, target);
    if (!override) return;
    setIsActivating(target);
    try {
      await overrideService.stopOverride(override.id, target);
    } catch (e) {
      console.error(`Failed to stop override (${target}):`, e);
    } finally {
      setIsActivating(null);
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
        {t('override_title')}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <div className={cn(
          'glass p-6 space-y-5 opacity-0 animate-fade-in-up',
          (isPumpActive || isSolenoidActive) && 'animate-pulse-glow'
        )} style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: 'var(--surface-text)' }}>🔧 {t('override_panel')}</h3>
            {isAnyOverrideActive && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger-500 text-white text-xs font-bold animate-pulse">
                <Zap className="w-3 h-3" /> {t('override_active_badge')} ({activeOverrides.length})
              </span>
            )}
          </div>

          {/* Zone Selection */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text)' }}>{t('override_select_zone')}</label>
            <div className="grid grid-cols-1 gap-2">
              {isLoading ? (
                <div className="text-sm py-4 text-center" style={{ color: 'var(--surface-text-muted)' }}>{t('override_loading_zones')}</div>
              ) : zones.map(zone => {
                const status = ZONE_STATUS[zone.status as keyof typeof ZONE_STATUS];
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
                        {hasActiveOverride && <span className="ml-2 text-[10px] bg-danger-500 text-white px-1.5 py-0.5 rounded">{t('common_active').toUpperCase()}</span>}
                        {!isAllowed && <span className="ml-2 text-[10px] bg-gray-500 text-white px-1.5 py-0.5 rounded">🔒 {t('override_locked')}</span>}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                        {t(status.key)} • 💧 {sensor?.soil_moisture ?? 0}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration Slider */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text)' }}>
              ⏱️ {t('override_duration')}: <strong className="text-primary-600">{duration} {t('override_minutes')}</strong>
            </label>
            <input
              type="range"
              min={1}
              max={120}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              disabled={isPumpActive && isSolenoidActive}
              className="w-full h-2 bg-primary-200 rounded-lg cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--surface-text-muted)' }}>
              <span>1 {t('override_minutes')}</span>
              <span>60 {t('override_minutes')}</span>
              <span>120 {t('override_minutes')}</span>
            </div>
          </div>

          {/* ════ Separated Actuator Controls ════ */}
          <div className="space-y-3">
            <label className="block text-sm font-medium" style={{ color: 'var(--surface-text)' }}>
              🎛️ {t('override_actuator_control')}
            </label>

            {/* PUMP Control (Tuya) */}
            <div className={cn(
              'p-4 rounded-xl border-2 transition-all',
              isPumpActive ? 'border-primary-500 bg-primary-50/30' : 'border-transparent',
            )} style={{ borderColor: isPumpActive ? undefined : 'var(--surface-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💧</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>{t('override_pump')}</p>
                    <p className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>Tuya Smart Plug</p>
                  </div>
                </div>
                {isPumpActive && (
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-primary-500">
                      {formatTimer(getRemainingTime(getActiveOverrideByTarget(selectedZone, 'pump')))}
                    </p>
                    <p className="text-[10px] text-primary-400">{t('override_remaining')}</p>
                  </div>
                )}
              </div>
              
              {!isPumpActive ? (
                <button
                  onClick={() => handleActivate('pump')}
                  disabled={!selectedZone || isActivating === 'pump' || isLoading}
                  className={cn(
                    'w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all duration-300 flex justify-center items-center gap-2',
                    selectedZone && isActivating !== 'pump'
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg glow-sm hover:glow-md active:scale-[0.98]'
                      : 'bg-gray-300 cursor-not-allowed'
                  )}
                >
                  <Play className="w-4 h-4" />
                  {isActivating === 'pump' ? t('override_processing') : t('override_pump_on')}
                </button>
              ) : (
                <button
                  onClick={() => handleDeactivate('pump')}
                  disabled={isActivating === 'pump'}
                  className="w-full py-2.5 rounded-xl font-bold text-white text-sm bg-danger-500 hover:bg-danger-600 shadow-lg transition-all active:scale-[0.98] glow-danger flex justify-center items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  {isActivating === 'pump' ? t('override_processing') : t('override_pump_off')}
                </button>
              )}
            </div>

            {/* SOLENOID Control (MQTT) */}
            <div className={cn(
              'p-4 rounded-xl border-2 transition-all',
              isSolenoidActive ? 'border-purple-500 bg-purple-50/30' : 'border-transparent',
            )} style={{ borderColor: isSolenoidActive ? undefined : 'var(--surface-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔧</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>{t('override_solenoid')}</p>
                    <p className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>MQTT → ESP32</p>
                  </div>
                </div>
                {isSolenoidActive && (
                  <div className="text-right">
                    <p className="text-lg font-mono font-bold text-purple-500">
                      {formatTimer(getRemainingTime(getActiveOverrideByTarget(selectedZone, 'solenoid')))}
                    </p>
                    <p className="text-[10px] text-purple-400">{t('override_remaining')}</p>
                  </div>
                )}
              </div>
              
              {!isSolenoidActive ? (
                <button
                  onClick={() => handleActivate('solenoid')}
                  disabled={!selectedZone || isActivating === 'solenoid' || isLoading}
                  className={cn(
                    'w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all duration-300 flex justify-center items-center gap-2',
                    selectedZone && isActivating !== 'solenoid'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg glow-sm hover:glow-md active:scale-[0.98]'
                      : 'bg-gray-300 cursor-not-allowed'
                  )}
                >
                  <Play className="w-4 h-4" />
                  {isActivating === 'solenoid' ? t('override_processing') : t('override_solenoid_on')}
                </button>
              ) : (
                <button
                  onClick={() => handleDeactivate('solenoid')}
                  disabled={isActivating === 'solenoid'}
                  className="w-full py-2.5 rounded-xl font-bold text-white text-sm bg-danger-500 hover:bg-danger-600 shadow-lg transition-all active:scale-[0.98] glow-danger flex justify-center items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  {isActivating === 'solenoid' ? t('override_processing') : t('override_solenoid_off')}
                </button>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-accent-200/20 border border-accent-400/30">
            <AlertTriangle className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
            <p className="text-[11px]" style={{ color: 'var(--surface-text-muted)' }}>
              {t('override_warning')}
            </p>
          </div>
        </div>

        {/* Override Log */}
        <div className="glass p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
            📋 {t('override_history')}
          </h3>
          <div className="space-y-3">
            {isLoading ? (
               <div className="text-sm py-4 text-center" style={{ color: 'var(--surface-text-muted)' }}>{t('override_loading_history')}</div>
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
                      {log.status === 'active' ? t('common_active') : t('override_completed')}
                    </span>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0',
                      log.mode === 'pump' ? 'bg-primary-100 text-primary-700' : 
                      log.mode === 'solenoid' ? 'bg-purple-100 text-purple-700' : 
                      log.mode === 'fertigation' ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'
                    )}>
                      {log.mode === 'pump' ? `💧 ${t('override_pump')}` : 
                       log.mode === 'solenoid' ? `🔧 ${t('override_solenoid')}` :
                       log.mode === 'fertigation' ? `🧪 ${t('override_nutrition')}` : `💧 ${t('override_water_only')}`}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>
                    {t('override_by')} {log.user_name} • {log.duration_minutes} {t('override_minutes')}
                    {log.reason && ` • "${log.reason}"`}
                  </p>
                  <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--surface-text-subtle)' }}>
                    <Clock className="w-3 h-3" /> {formatRelativeTime(log.started_at)}
                  </p>
                </div>
              </div>
            ))}
            {activeOverrides.length === 0 && overrideHistory.length === 0 && !isLoading && (
              <div className="text-sm py-4 text-center" style={{ color: 'var(--surface-text-muted)' }}>{t('override_no_history')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
