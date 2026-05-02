'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, Plus, Clock, Trash2, Edit, X, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { Schedule, Zone } from '@/shared/types/global.types';
import { scheduleService } from '@/shared/services/scheduleService';
import { sensorService } from '@/shared/services/sensorService';
import { useRBAC } from '@/shared/hooks/useRBAC';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
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
      // Optimistic update
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      await scheduleService.toggleScheduleStatus(id, !currentStatus);
    } catch (error) {
      console.error(error);
      fetchData(); // revert on failure
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;
    try {
      setSchedules(prev => prev.filter(s => s.id !== id));
      await scheduleService.deleteSchedule(id);
    } catch (error) {
      console.error(error);
      fetchData(); // revert
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
      alert('Gagal menyimpan jadwal. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Calendar className="w-5 h-5 text-primary-500" />
          Jadwal Fertigasi
        </h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium text-sm hover:bg-primary-600 transition-all shadow-lg glow-sm hover:glow-md active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Buat Jadwal Baru
        </button>
      </div>

      {/* Calendar View */}
      <div className="glass p-5 overflow-x-auto opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--surface-text)' }}>📅 Kalender Mingguan</h3>
        <div className="grid gap-px rounded-xl overflow-hidden min-w-[700px]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', background: 'var(--surface-border)' }}>
          {/* Header */}
          <div className="p-2 text-[10px] font-bold text-center" style={{ background: 'rgba(16,185,129,0.25)', color: 'var(--surface-text)' }}>Waktu</div>
          {DAYS.map(d => (
            <div key={d} className="p-2 text-[10px] font-bold text-center" style={{ background: 'rgba(16,185,129,0.25)', color: 'var(--surface-text)' }}>{d}</div>
          ))}

          {/* Time slots */}
          {HOURS.map(hour => (
            <>
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
            </>
          ))}
        </div>
      </div>

      {/* Schedule List */}
      <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--surface-text)' }}>📋 Daftar Jadwal</h3>
        <div className="space-y-2">
          {isLoading ? (
             <div className="text-sm py-8 text-center flex justify-center items-center gap-2" style={{ color: 'var(--surface-text-muted)' }}>
               <Loader2 className="w-5 h-5 animate-spin text-primary-500" /> Memuat jadwal...
             </div>
          ) : schedules.map((schedule, i) => {
            const cron = parseCron(schedule.cron_expression);
            return (
              <div key={schedule.id} className={cn(
                'glass-sm p-4 flex items-center gap-4 transition-all opacity-0 animate-fade-in-up group',
                !schedule.is_active && 'opacity-60'
              )} style={{ animationDelay: `${(i + 3) * 80}ms`, animationFillMode: 'forwards' }}>
                {/* Toggle */}
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--surface-text)' }}>{schedule.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {cron.label}</span>
                    <span>📍 {schedule.zone_name}</span>
                    <span>⏱️ {schedule.duration_minutes}m</span>
                    {schedule.include_fertigation && <span className="text-primary-600 font-medium">🌿 Fertigasi</span>}
                  </div>
                </div>

                {/* Actions */}
                {canControlZone(schedule.zone_id) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(schedule)} className="p-1.5 rounded-lg hover:bg-primary-50 transition-colors">
                      <Edit className="w-4 h-4 text-primary-500" />
                    </button>
                    <button onClick={() => deleteSchedule(schedule.id)} className="p-1.5 rounded-lg hover:bg-danger-50 transition-colors">
                      <Trash2 className="w-4 h-4 text-danger-500" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-heavy p-6 w-full max-w-md animate-scale-in space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--surface-text)' }}>
                {editingSchedule ? '✏️ Edit Jadwal' : '➕ Buat Jadwal Baru'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/20"><X className="w-5 h-5" style={{ color: 'var(--surface-text-muted)' }} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text)' }}>Nama Jadwal</label>
                <input
                  type="text" required value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Contoh: Penyiraman Pagi Zona 1"
                  className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ color: 'var(--surface-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text)' }}>Zona Irigasi</label>
                <select
                  value={formData.zone_id} required
                  onChange={e => setFormData(p => ({ ...p, zone_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ color: 'var(--surface-text)' }}
                >
                  <option value="">-- Pilih Zona --</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text)' }}>
                  Durasi: <strong className="text-primary-600">{formData.duration_minutes} menit</strong>
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
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--surface-text)' }}>Jadwal (Cron)</label>
                <input
                  type="text" required value={formData.cron_expression}
                  onChange={e => setFormData(p => ({ ...p, cron_expression: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500"
                  style={{ color: 'var(--surface-text)' }}
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--surface-text-muted)' }}>
                  Format: menit jam hari bulan hari_minggu • Contoh: 0 6 * * * = setiap hari jam 06:00
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={formData.include_fertigation}
                  onChange={e => setFormData(p => ({ ...p, include_fertigation: e.target.checked }))}
                  className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500"
                />
                <span className="text-xs" style={{ color: 'var(--surface-text)' }}>🌿 Sertakan fertigasi</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSaving} className="flex-1 flex justify-center items-center py-3 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-all glow-sm hover:glow-md active:scale-[0.98] disabled:opacity-70">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingSchedule ? '💾 Simpan' : '➕ Buat Jadwal')}
                </button>
                <button type="button" onClick={() => setShowForm(false)} disabled={isSaving} className="px-6 py-3 rounded-xl glass-sm font-medium text-sm hover:scale-105 transition-transform disabled:opacity-50" style={{ color: 'var(--surface-text-muted)' }}>
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
