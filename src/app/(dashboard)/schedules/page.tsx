'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, Plus, Clock, Trash2, Edit, X, Loader2, Sprout, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Schedule, Zone } from '@/shared/types/global.types';
import { scheduleService } from '@/shared/services/scheduleService';
import { sensorService } from '@/shared/services/sensorService';
import { useRBAC } from '@/shared/hooks/useRBAC';
import { useT } from '@/shared/context/LanguageContext';
import GrowthTimeline from '@/shared/components/GrowthTimeline';
import {
  PLANT_PROFILES, getDaysSincePlanting, getActivePhase,
  generateScheduleNames, type PlantType
} from '@/shared/services/growthStageService';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 5); // 05:00 - 20:00

function parseCron(cron: string) {
  const [minute, hour, , , dayOfWeek] = cron.split(' ');
  return {
    hour: parseInt(hour) || 0,
    minute: parseInt(minute) || 0,
    days: dayOfWeek === '*' ? [0, 1, 2, 3, 4, 5, 6] : dayOfWeek.split(',').map(Number),
    label: `${String(parseInt(hour)).padStart(2, '0')}:${String(parseInt(minute)).padStart(2, '0')}`,
  };
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    name: '', zone_id: '', cron_expression: '0 6 * * *',
    duration_minutes: 15, include_fertigation: false,
  });

  const { canControlZone } = useRBAC();
  const t = useT();

  // ── Growth Stage State ──
  const [plantingDate, setPlantingDate] = useState('');
  const [plantType, setPlantType]       = useState<PlantType>('tomato');
  const [plantCount, setPlantCount]     = useState(100);
  const [growthZoneId, setGrowthZoneId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const handleZoneSelect = (zoneId: string) => {
    setGrowthZoneId(zoneId);
    const selectedZone = zones.find(z => z.id === zoneId);
    if (selectedZone) {
      if (selectedZone.planting_date) setPlantingDate(selectedZone.planting_date);
      if (selectedZone.plant_count) setPlantCount(selectedZone.plant_count);
      
      const cType = selectedZone.crop_type?.toLowerCase() || '';
      if (cType.includes('caba') || cType.includes('cabe') || cType.includes('chili')) setPlantType('cabai');
      else if (cType.includes('tomat')) setPlantType('tomato');
      else if (cType.includes('selada') || cType.includes('lett')) setPlantType('lettuce');
      else setPlantType('custom');
    }
  };

  const selectedZoneObj = useMemo(() => zones.find(z => z.id === growthZoneId), [zones, growthZoneId]);

  const currentDay  = plantingDate ? getDaysSincePlanting(plantingDate) : 0;
  const activePhase = plantingDate ? getActivePhase(currentDay, plantType) : null;

  const DAYS = t('common_lang_code') === 'id' 
    ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const fetchData = useCallback(async () => {
    try {
      const [fetchedSchedules, fetchedZones] = await Promise.all([
        scheduleService.getSchedules(),
        sensorService.getZones()
      ]);
      setSchedules(fetchedSchedules);
      setZones(fetchedZones);
    } catch (e) {
      console.error('Failed to load schedules/zones', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    scheduleService.subscribeToSchedules(() => fetchData());
    return () => scheduleService.unsubscribeFromSchedules();
  }, [fetchData]);

  const calendarSlots = useMemo(() => {
    return schedules.map(s => ({ ...s, ...parseCron(s.cron_expression) }));
  }, [schedules]);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      await scheduleService.toggleScheduleStatus(id, !currentStatus);
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm(t('schedules_confirm_delete'))) return;
    try {
      setSchedules(prev => prev.filter(s => s.id !== id));
      await scheduleService.deleteSchedule(id);
    } catch (error) {
      console.error(error);
      fetchData();
    }
  };

  const openCreate = () => {
    setEditingSchedule(null);
    setFormData({ name: '', zone_id: '', cron_expression: '0 6 * * *', duration_minutes: 15, include_fertigation: false });
    setShowForm(true);
  };

  const openEdit = (s: Schedule) => {
    setEditingSchedule(s);
    setFormData({ name: s.name, zone_id: s.zone_id, cron_expression: s.cron_expression, duration_minutes: s.duration_minutes, include_fertigation: s.include_fertigation });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingSchedule) {
        await scheduleService.updateSchedule(editingSchedule.id, formData);
      } else {
        await scheduleService.createSchedule({ ...formData, is_active: true });
      }
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save schedule', error);
      alert(t('schedules_save_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Generate jadwal otomatis dari fase pertumbuhan ──
  const handleGenerateAutoSchedule = async () => {
    if (!plantingDate || !growthZoneId || !activePhase) return;
    if (!confirm(`Ini akan membuat ${activePhase.irrigationTimes.length} jadwal baru untuk zona yang dipilih. Lanjutkan?`)) return;

    setIsGenerating(true);
    try {
      const zone = zones.find(z => z.id === growthZoneId);
      const newSchedules = generateScheduleNames(activePhase, zone?.name ?? 'Zona', growthZoneId, plantCount);
      for (const s of newSchedules) {
        await scheduleService.createSchedule(s);
      }
      setGenerateSuccess(true);
      fetchData();
      setTimeout(() => setGenerateSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate schedules', err);
      alert('Gagal membuat jadwal otomatis. Coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Calendar className="w-5 h-5 text-primary-500" />
          {t('schedules_title')}
        </h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium text-sm hover:bg-primary-600 transition-all shadow-lg glow-sm hover:glow-md active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> {t('schedules_new')}
        </button>
      </div>

      {/* ── GROWTH STAGE PANEL ── */}
      <div className="glass p-5 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards', animationDelay: '50ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <Sprout className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>Jadwal Berbasis Umur Tanaman</h3>
          {activePhase && (
            <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${activePhase.color}20`, color: activePhase.color, border: `1px solid ${activePhase.color}44` }}>
              {activePhase.emoji} Hari ke-{currentDay} — {activePhase.name}
            </span>
          )}
        </div>

        {/* Form input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text-muted)' }}>📅 Tanggal Tanam</label>
            <input
              type="date"
              value={plantingDate}
              onChange={e => setPlantingDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
              style={{ color: 'var(--surface-text)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text-muted)' }}>🌱 Jenis Tanaman</label>
            <select
              value={plantType}
              onChange={e => setPlantType(e.target.value as PlantType)}
              className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
              style={{ color: 'var(--surface-text)' }}
            >
              {Object.values(PLANT_PROFILES).map(p => (
                <option key={p.type} value={p.type}>{p.nameId}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text-muted)' }}>🌿 Jumlah Tanaman</label>
            <input
              type="number" min={1} max={10000}
              value={plantCount}
              onChange={e => setPlantCount(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
              style={{ color: 'var(--surface-text)' }}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 flex flex-wrap items-center gap-2" style={{ color: 'var(--surface-text-muted)' }}>
              📍 Zona Target
              {selectedZoneObj?.planting_date && (
                 <span className="text-[10px] bg-primary-500/20 text-primary-500 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                   <Zap className="w-3 h-3"/> Autopilot Aktif
                 </span>
              )}
            </label>
            <select
              value={growthZoneId}
              onChange={e => handleZoneSelect(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
              style={{ color: 'var(--surface-text)' }}
            >
              <option value="">-- Pilih Zona --</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        </div>

        {/* Timeline visual */}
        {plantingDate && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            <GrowthTimeline plantingDate={plantingDate} plantType={plantType} />
          </div>
        )}

        {/* Info fase aktif */}
        {activePhase && (
          <div className="rounded-xl p-3 mb-4 text-sm grid grid-cols-2 sm:grid-cols-4 gap-3"
            style={{ background: `${activePhase.color}0d`, border: `1px solid ${activePhase.color}30` }}>
            <div>
              <p className="text-[10px] font-medium" style={{ color: 'var(--surface-text-muted)' }}>Waktu Penyiraman</p>
              <p className="font-bold text-xs mt-0.5" style={{ color: activePhase.color }}>
                {activePhase.irrigationTimes.join(' · ')}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium" style={{ color: 'var(--surface-text-muted)' }}>Volume / Tanaman</p>
              <p className="font-bold text-xs mt-0.5" style={{ color: activePhase.color }}>{activePhase.waterVolumeLiters} L</p>
            </div>
            <div>
              <p className="text-[10px] font-medium" style={{ color: 'var(--surface-text-muted)' }}>Total Air (est.)</p>
              <p className="font-bold text-xs mt-0.5" style={{ color: activePhase.color }}>{(activePhase.waterVolumeLiters * plantCount).toFixed(0)} L</p>
            </div>
            <div>
              <p className="text-[10px] font-medium" style={{ color: 'var(--surface-text-muted)' }}>EC Target</p>
              <p className="font-bold text-xs mt-0.5" style={{ color: activePhase.color }}>
                {activePhase.ecTargetMin === 0 ? 'Tanpa Pupuk' : `${activePhase.ecTargetMin}–${activePhase.ecTargetMax} mS/cm`}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={handleGenerateAutoSchedule}
            disabled={!plantingDate || !growthZoneId || !activePhase || isGenerating}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
              'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {isGenerating
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : generateSuccess
              ? <CheckCircle2 className="w-4 h-4" />
              : <Zap className="w-4 h-4" />}
            {isGenerating ? 'Membuat Jadwal...' : generateSuccess ? 'Jadwal Dibuat!' : 'Terapkan Jadwal Otomatis'}
          </button>
          <button
            onClick={() => { setPlantingDate(''); setGrowthZoneId(''); setPlantType('tomato'); setPlantCount(100); }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all glass-sm hover:scale-105"
            style={{ color: 'var(--surface-text-muted)' }}
          >
            🔄 Reset ke Manual
          </button>
          {!plantingDate && (
            <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>← Isi tanggal tanam untuk memulai</p>
          )}
        </div>
      </div>

      <div className="glass p-5 overflow-x-auto opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--surface-text)' }}>📅 {t('schedules_weekly')}</h3>
        <div className="grid gap-px rounded-xl overflow-hidden min-w-[700px]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', background: 'var(--surface-border)' }}>
          <div className="p-2 text-[10px] font-bold text-center" style={{ background: 'rgba(16,185,129,0.25)', color: 'var(--surface-text)' }}>{t('schedules_time')}</div>
          {DAYS.map(d => (
            <div key={d} className="p-2 text-[10px] font-bold text-center" style={{ background: 'rgba(16,185,129,0.25)', color: 'var(--surface-text)' }}>{d}</div>
          ))}

          {HOURS.map(hour => (
            <div key={`row-${hour}`} className="contents">
              <div key={`t-${hour}`} className="p-1.5 text-[10px] text-center font-mono border-t" style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--surface-text-muted)', borderColor: 'var(--surface-border)' }}>
                {String(hour).padStart(2, '0')}:00
              </div>
              {DAYS.map((_, dayIdx) => {
                const slots = calendarSlots.filter(s => s.hour === hour && s.days.includes(dayIdx));
                return (
                  <div key={`c-${hour}-${dayIdx}`} className="p-0.5 min-h-[36px] border-t transition-colors" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-card)')}
                  >
                    {slots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => openEdit(slot)}
                        className={cn(
                          'w-full text-[9px] px-1 py-0.5 rounded truncate text-left transition-all',
                          slot.is_active
                            ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm'
                            : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                        )}
                        title={`${slot.name} — ${slot.duration_minutes}m`}
                      >
                        {slot.name.replace('Penyiraman ', '').replace('Fertigasi ', '🌿 ')}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--surface-text)' }}>📋 {t('schedules_list')}</h3>
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-sm py-8 text-center flex justify-center items-center gap-2" style={{ color: 'var(--surface-text-muted)' }}>
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" /> {t('schedules_loading')}
            </div>
          ) : (schedules.length === 0 ? (
            <div className="text-sm py-8 text-center" style={{ color: 'var(--surface-text-muted)' }}>{t('common_no_data')}</div>
          ) : schedules.map((schedule, i) => {
            const cron = parseCron(schedule.cron_expression);
            return (
              <div key={schedule.id} className={cn(
                'glass-sm p-4 flex items-center gap-4 transition-all opacity-0 animate-fade-in-up group',
                !schedule.is_active && 'opacity-60'
              )} style={{ animationDelay: `${(i + 3) * 80}ms`, animationFillMode: 'forwards' }}>
                <button
                  onClick={() => toggleActive(schedule.id, schedule.is_active)}
                  disabled={!canControlZone(schedule.zone_id)}
                  className={cn(
                    'w-10 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 shrink-0',
                    schedule.is_active ? 'bg-primary-500' : 'bg-gray-300',
                    !canControlZone(schedule.zone_id) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white shadow transition-transform duration-300',
                    schedule.is_active ? 'translate-x-4' : 'translate-x-0'
                  )} />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--surface-text)' }}>{schedule.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {cron.label}</span>
                    <span>📍 {schedule.zone_name}</span>
                    <span>⏱️ {schedule.duration_minutes} {t('override_minutes')}</span>
                    {schedule.include_fertigation && <span className="text-primary-600 font-medium">🌿 {t('override_nutrition')}</span>}
                  </div>
                </div>

                {canControlZone(schedule.zone_id) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(schedule)} className="p-1.5 rounded-lg hover:bg-primary-50 transition-colors" title={t('common_edit')}>
                      <Edit className="w-4 h-4 text-primary-500" />
                    </button>
                    <button onClick={() => deleteSchedule(schedule.id)} className="p-1.5 rounded-lg hover:bg-danger-50 transition-colors" title={t('common_delete')}>
                      <Trash2 className="w-4 h-4 text-danger-500" />
                    </button>
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-heavy p-6 w-full max-w-md animate-scale-in space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>
                {editingSchedule ? `✏️ ${t('schedules_edit_title')}` : `➕ ${t('schedules_create_title')}`}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/20"><X className="w-5 h-5" style={{ color: 'var(--surface-text-muted)' }} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text)' }}>{t('schedules_name_label')}</label>
                <input
                  type="text" required value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder={t('schedules_name_placeholder')}
                  className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ color: 'var(--surface-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text)' }}>{t('schedules_zone_label')}</label>
                <select
                  value={formData.zone_id} required
                  onChange={e => setFormData(p => ({ ...p, zone_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ color: 'var(--surface-text)' }}
                >
                  <option value="">{t('schedules_zone_select')}</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text)' }}>
                  {t('schedules_duration_label')}: <strong className="text-primary-600">{formData.duration_minutes} {t('override_minutes')}</strong>
                </label>
                <input
                  type="range" min={1} max={120} value={formData.duration_minutes}
                  onChange={e => setFormData(p => ({ ...p, duration_minutes: Number(e.target.value) }))}
                  className="w-full h-2 bg-primary-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>
                  <span>1m</span><span>60m</span><span>120m</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text)' }}>{t('schedules_cron_label')}</label>
                <input
                  type="text" required value={formData.cron_expression}
                  onChange={e => setFormData(p => ({ ...p, cron_expression: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ color: 'var(--surface-text)' }}
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--surface-text-muted)' }}>
                  {t('schedules_cron_hint')}
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={formData.include_fertigation}
                  onChange={e => setFormData(p => ({ ...p, include_fertigation: e.target.checked }))}
                  className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500"
                />
                <span className="text-xs" style={{ color: 'var(--surface-text)' }}>🌿 {t('schedules_fertigation')}</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSaving} className="flex-1 flex justify-center items-center py-3 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all glow-sm hover:glow-md active:scale-[0.98] disabled:opacity-70">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingSchedule ? `💾 ${t('common_save')}` : `➕ ${t('schedules_create')}`)}
                </button>
                <button type="button" onClick={() => setShowForm(false)} disabled={isSaving} className="px-6 py-3 rounded-xl glass-sm font-medium text-sm hover:scale-105 transition-transform disabled:opacity-50" style={{ color: 'var(--surface-text-muted)' }}>
                  {t('common_cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
