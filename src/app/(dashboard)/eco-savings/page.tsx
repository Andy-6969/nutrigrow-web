'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Leaf, Droplets, Zap, DollarSign, Clock, TrendingUp,
  RotateCcw, CloudRain, Wind, ToggleLeft, ToggleRight,
  ChevronRight, Info, Sparkles
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { ecoService } from '@/shared/services/ecoService';
import { useAuth } from '@/shared/context/AuthContext';
import { useT } from '@/shared/context/LanguageContext';
import { supabase } from '@/shared/lib/supabase';
import type { EcoStatus, EcoSavingsLog, EcoDailySummary, Zone } from '@/shared/types/global.types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function EcoSavingsPage() {
  const t = useT();
  const { role } = useAuth();
  const canToggle = ['super_admin', 'pemilik_kebun'].includes(role || '');

  const [ecoStatus, setEcoStatus] = useState<EcoStatus | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [dailyData, setDailyData] = useState<EcoDailySummary[]>([]);
  const [logs, setLogs] = useState<EcoSavingsLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingZone, setIsTogglingZone] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: zonesData } = await supabase
        .from('zones')
        .select('*')
        .order('name');

      const [status, history] = await Promise.all([
        ecoService.getEcoStatus(),
        ecoService.getEcoHistory(),
      ]);

      setZones((zonesData || []) as Zone[]);
      setEcoStatus(status);
      setDailyData(history.daily);
      setLogs(history.logs);
    } catch (err) {
      console.error('Failed to fetch eco data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    ecoService.subscribeToEcoSavings(() => fetchData());
    return () => ecoService.unsubscribeFromEcoSavings();
  }, [fetchData]);

  const handleZoneToggle = async (zoneId: string, currentStatus: boolean, zoneName: string) => {
    if (!canToggle) return;
    setIsTogglingZone(prev => ({ ...prev, [zoneId]: true }));
    setStatusMsg(null);
    try {
      await ecoService.toggleZoneEcoMode(zoneId, !currentStatus);
      
      // Update local state immediately
      setZones(prev => prev.map(z => z.id === zoneId ? { ...z, eco_mode: !currentStatus } : z));
      
      // Fetch updated status summary
      const status = await ecoService.getEcoStatus();
      setEcoStatus(status);

      setStatusMsg({
        type: 'success',
        text: t('eco_zone_toggle_success').replace('{name}', zoneName)
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal toggle eco mode';
      setStatusMsg({ type: 'error', text: message });
    } finally {
      setIsTogglingZone(prev => ({ ...prev, [zoneId]: false }));
    }
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toFixed(1);
  };

  const getReasonLabel = (reason: string) => {
    const map: Record<string, string> = {
      humidity_reduction: t('eco_reason_humidity'),
      rain_block: t('eco_reason_rain'),
      eco_mode: t('eco_reason_eco_mode'),
      combined: t('eco_reason_combined'),
    };
    return map[reason] || reason;
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'humidity_reduction':
        return 'bg-teal-500/15 text-teal-400 border-teal-500/25';
      case 'rain_block':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/25';
      case 'eco_mode':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
      case 'combined':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/25';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/25';
    }
  };

  const savings = ecoStatus?.savings;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* ── Header + Status Badge ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
            <Leaf className="w-7 h-7 text-emerald-500" />
            {t('eco_title')}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--surface-text-muted)' }}>
            {t('eco_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Eco-Mode Zones Count Badge */}
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors',
              ecoStatus?.eco_mode
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                : 'bg-white/5 border-white/10 text-slate-400'
            )}
          >
            <Leaf className="w-4 h-4" />
            <span>
              Eco Mode: {ecoStatus?.active_zones_count ?? 0} / {ecoStatus?.total_zones_count ?? 0} {t('eco_col_zone')} Aktif
            </span>
          </div>

          <button
            onClick={() => { setIsLoading(true); fetchData(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/5 active:scale-[0.98]"
            style={{ borderColor: 'var(--surface-border)', color: 'var(--surface-text)' }}
          >
            <RotateCcw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className={cn(
          'flex items-center gap-3 p-4 rounded-xl text-sm font-medium border animate-fade-in-up',
          statusMsg.type === 'error'
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-green-500/10 text-green-400 border-green-500/20'
        )}>
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Eco Mode Description */}
      {ecoStatus?.eco_mode && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-sm font-medium animate-fade-in-up">
          <Sparkles className="w-5 h-5 shrink-0 animate-pulse" />
          <span>{t('eco_mode_desc')}</span>
        </div>
      )}

      {isLoading ? (

        <div className="glass p-16 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>Memuat data eco-savings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Stats Grid ────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: Droplets, label: t('eco_water_saved'),
                value: `${formatNumber(savings?.water_saved_liters ?? 0)} ${t('eco_liters')}`,
                color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
                glow: 'shadow-[0_0_25px_rgba(59,130,246,0.08)]'
              },
              {
                icon: DollarSign, label: t('eco_cost_saved'),
                value: `Rp ${formatNumber(savings?.cost_saved_rupiah ?? 0)}`,
                color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
                glow: 'shadow-[0_0_25px_rgba(245,158,11,0.08)]'
              },
              {
                icon: Zap, label: t('eco_energy_saved'),
                value: `${(savings?.energy_saved_kwh ?? 0).toFixed(2)} kWh`,
                color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20',
                glow: 'shadow-[0_0_25px_rgba(234,179,8,0.08)]'
              },
              {
                icon: Clock, label: t('eco_time_saved'),
                value: `${savings?.time_saved_minutes ?? 0} ${t('eco_minutes')}`,
                color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
                glow: 'shadow-[0_0_25px_rgba(168,85,247,0.08)]'
              },
            ].map((stat, i) => (
              <div
                key={i}
                className={cn(
                  'glass rounded-2xl p-5 flex flex-col gap-3 border hover:scale-[1.02] transition-all duration-300',
                  stat.border, stat.glow
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                  <stat.icon className={cn('w-5 h-5', stat.color)} />
                </div>
                <div>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--surface-text-muted)' }}>{stat.label}</p>
                  <p className={cn('text-xl font-bold mt-0.5', stat.color)}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Zone Eco-Mode Configuration ────────────────────── */}
          <div className="glass rounded-2xl p-6 border space-y-4" style={{ borderColor: 'var(--surface-border)' }}>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
                <Leaf className="w-5 h-5 text-emerald-500" />
                {t('eco_zone_list_title')}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--surface-text-muted)' }}>
                {t('eco_mode_desc')}
              </p>
            </div>

            {zones.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--surface-text-muted)' }}>
                Tidak ada zona ditemukan.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {zones.map((zone) => {
                  const isZoneActive = !!zone.eco_mode;
                  const toggling = !!isTogglingZone[zone.id];
                  return (
                    <div
                      key={zone.id}
                      className={cn(
                        'p-4 rounded-xl border transition-all duration-300 flex items-center justify-between hover:scale-[1.01]',
                        isZoneActive
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 border-white/10'
                      )}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>{zone.name}</p>
                        <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>{zone.crop_type}</p>
                        <span className={cn(
                          'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1',
                          isZoneActive
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-slate-500/10 border-slate-500/25 text-slate-400'
                        )}>
                          {isZoneActive ? t('eco_zone_active_badge') : t('eco_zone_inactive_badge')}
                        </span>
                      </div>

                      <button
                        onClick={() => handleZoneToggle(zone.id, isZoneActive, zone.name)}
                        disabled={!canToggle || toggling}
                        className={cn(
                          'transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
                          isZoneActive ? 'text-emerald-400' : 'text-slate-500'
                        )}
                      >
                        {toggling ? (
                          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        ) : isZoneActive ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Weekly Chart ──────────────────────────────────── */}
          <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                {t('eco_weekly_chart_title')}
              </h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                {dailyData.length} hari
              </span>
            </div>

            {dailyData.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                {t('eco_no_data')}
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                      tickFormatter={(d: string) => {
                        const date = new Date(d + 'T00:00:00');
                        return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                      tickFormatter={(v: number) => `${v}L`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => [
                        typeof value === 'number' ? `${value.toFixed(1)} Liter` : `${value} Liter`,
                        t('eco_water_saved')
                      ]}
                      labelFormatter={(label: any) => {
                        if (typeof label !== 'string') return '';
                        const date = new Date(label + 'T00:00:00');
                        return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
                      }}
                    />
                    <Bar
                      dataKey="water_saved"
                      fill="url(#ecoGradient)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                    <defs>
                      <linearGradient id="ecoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Strategy Cards ────────────────────────────────── */}
          <div className="glass rounded-2xl p-6 border" style={{ borderColor: 'var(--surface-border)' }}>
            <h3 className="text-base font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--surface-text)' }}>
              <Info className="w-5 h-5 text-cyan-500" />
              {t('eco_strategy_title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Wind, title: t('eco_strategy_humidity_title'),
                  desc: t('eco_strategy_humidity_desc'),
                  color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20'
                },
                {
                  icon: CloudRain, title: t('eco_strategy_rain_title'),
                  desc: t('eco_strategy_rain_desc'),
                  color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20'
                },
                {
                  icon: Leaf, title: t('eco_strategy_ecomode_title'),
                  desc: t('eco_strategy_ecomode_desc'),
                  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20'
                },
              ].map((s, i) => (
                <div key={i} className={cn('rounded-xl p-4 border', s.border, s.bg.replace('/10', '/5'))}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.bg)}>
                      <s.icon className={cn('w-4 h-4', s.color)} />
                    </div>
                    <span className={cn('text-sm font-bold', s.color)}>{s.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--surface-text-muted)' }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── History Table ─────────────────────────────────── */}
          <div className="glass rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--surface-border)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--surface-border)' }}>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
                <ChevronRight className="w-5 h-5 text-emerald-500" />
                {t('eco_history_title')}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 ml-1">
                  {logs.length}
                </span>
              </h3>
            </div>

            {logs.length === 0 ? (
              <div className="p-10 text-center text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                {t('eco_no_data')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/20 text-xs font-semibold" style={{ color: 'var(--surface-text-muted)', borderBottom: '1px solid var(--surface-border)' }}>
                      <th className="p-4">{t('eco_col_date')}</th>
                      <th className="p-4">{t('eco_col_zone')}</th>
                      <th className="p-4">{t('eco_col_normal')}</th>
                      <th className="p-4">{t('eco_col_eco')}</th>
                      <th className="p-4">{t('eco_col_saved')}</th>
                      <th className="p-4 text-right">{t('eco_col_reason')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm" style={{ color: 'var(--surface-text)' }}>
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-xs">
                          {new Date(log.created_at).toLocaleString('id-ID', {
                            dateStyle: 'medium', timeStyle: 'short'
                          })}
                        </td>
                        <td className="p-4 font-semibold">{log.zone_name || '-'}</td>
                        <td className="p-4">
                          <span className="text-slate-400">{log.normal_duration} {t('eco_minutes')}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-emerald-400 font-semibold">{log.eco_duration} {t('eco_minutes')}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-blue-400 font-bold">{log.water_saved_liters.toFixed(0)} {t('eco_liters')}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className={cn(
                            'text-[10px] font-bold px-2.5 py-1 rounded-full border',
                            getReasonBadge(log.reason)
                          )}>
                            {getReasonLabel(log.reason)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
