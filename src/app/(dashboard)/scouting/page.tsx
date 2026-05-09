'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bug, Camera, Plus, MapPin, Clock, AlertTriangle, CheckCircle2, Search, Filter, Wrench, X, Save, Loader2, Info } from 'lucide-react';
import { useT } from '@/shared/context/LanguageContext';
import { useRBAC } from '@/shared/hooks/useRBAC';
import { scoutingService, type ScoutingPayload } from '@/shared/services/scoutingService';
import { sensorService } from '@/shared/services/sensorService';
import type { ScoutingLog, Zone, ScoutingIssueType, ScoutingSeverity, ScoutingStatus } from '@/shared/types/global.types';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/context/ToastContext';
import { PageHeaderSkeleton } from '@/shared/components/Skeleton';

const TYPE_COLORS: Record<ScoutingIssueType, { bg: string, text: string, icon: any }> = {
  hama: { bg: 'bg-rose-500/20', text: 'text-rose-500', icon: Bug },
  penyakit: { bg: 'bg-orange-500/20', text: 'text-orange-500', icon: AlertTriangle },
  infrastruktur: { bg: 'bg-blue-500/20', text: 'text-blue-500', icon: Wrench },
  lainnya: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Info },
};

const SEVERITY_LABELS: Record<ScoutingSeverity, string> = {
  rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi/Kritis'
};

const SEVERITY_COLORS: Record<ScoutingSeverity, string> = {
  rendah: 'text-emerald-500', sedang: 'text-orange-500', tinggi: 'text-danger-500'
};

export default function ScoutingPage() {
  const t = useT();
  const { canAccess } = useRBAC();
  const { success, error: showError } = useToast();

  const [logs, setLogs] = useState<ScoutingLog[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [form, setForm] = useState<ScoutingPayload>({
    zone_id: '', issue_type: 'hama', severity: 'rendah', notes: '', photo_url: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [fetchedLogs, fetchedZones] = await Promise.all([
      scoutingService.getLogs(),
      sensorService.getZones()
    ]);
    setLogs(fetchedLogs);
    setZones(fetchedZones);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zone_id || !form.notes) return;
    
    setModalLoading(true);
    const { error } = await scoutingService.createLog(form);
    setModalLoading(false);
    
    if (error) {
      showError('Gagal menyimpan laporan', error);
      return;
    }
    
    success('Laporan Terkirim', 'Terima kasih atas laporan lapangannya!');
    setShowModal(false);
    setForm({ zone_id: '', issue_type: 'hama', severity: 'rendah', notes: '', photo_url: '' });
    fetchData();
  };

  const handleUpdateStatus = async (id: string, newStatus: ScoutingStatus) => {
    const { error } = await scoutingService.updateLogStatus(id, newStatus);
    if (!error) {
      setLogs(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
      success('Status Diperbarui', `Laporan ditandai sebagai ${newStatus}`);
    } else {
      showError('Gagal memperbarui', error);
    }
  };

  const filteredLogs = logs.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'open') return l.status === 'open' || l.status === 'in_progress';
    if (filter === 'resolved') return l.status === 'resolved';
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
            <Bug className="w-6 h-6 text-orange-500" />
            Catatan Lapangan (Scouting)
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--surface-text-muted)' }}>
            Laporkan temuan hama, penyakit, atau kerusakan alat di kebun secara real-time.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all"
        >
          <Camera className="w-4 h-4" /> Laporan Baru
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--surface-border)' }}>
        {(['all', 'open', 'resolved'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-all",
              filter === tab 
                ? "border-orange-500 text-orange-500" 
                : "border-transparent hover:text-orange-400"
            )}
            style={{ color: filter !== tab ? 'var(--surface-text-muted)' : undefined }}
          >
            {tab === 'all' ? 'Semua Laporan' : tab === 'open' ? 'Membutuhkan Tindakan' : 'Selesai'}
          </button>
        ))}
      </div>

      {/* Logs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl glass-sm animate-pulse" />)}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium" style={{ color: 'var(--surface-text)' }}>Tidak ada laporan</p>
          <p className="text-xs mt-1" style={{ color: 'var(--surface-text-muted)' }}>Kebun dalam kondisi aman terkendali.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLogs.map(log => {
            const Icon = TYPE_COLORS[log.issue_type].icon;
            const isResolved = log.status === 'resolved';

            return (
              <div key={log.id} className={cn(
                "glass p-5 flex flex-col gap-3 transition-all",
                isResolved && "opacity-70 grayscale-[0.5]"
              )}>
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", TYPE_COLORS[log.issue_type].bg)}>
                      <Icon className={cn("w-4 h-4", TYPE_COLORS[log.issue_type].text)} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--surface-text)' }}>
                        {log.issue_type}
                      </p>
                      <p className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--surface-text-muted)' }}>
                        <Clock className="w-3 h-3" /> 
                        {new Date(log.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    isResolved ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-danger-500/10 text-danger-500 border-danger-500/30 animate-pulse"
                  )}>
                    {isResolved ? 'Selesai' : 'Perlu Tindakan'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1 mt-1">
                  <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--surface-text)' }}>
                    <MapPin className="w-4 h-4 text-primary-500" /> {log.zone_name || 'Zona Tidak Diketahui'}
                  </p>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--surface-text-muted)' }}>
                    Tingkat Keparahan: <span className={cn("font-bold", SEVERITY_COLORS[log.severity])}>{SEVERITY_LABELS[log.severity]}</span>
                  </p>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--surface-text-muted)' }}>
                    Pelapor: {log.user_name}
                  </p>
                </div>

                <div className="text-sm p-3 rounded-xl glass-sm italic mt-1" style={{ color: 'var(--surface-text)' }}>
                  "{log.notes}"
                </div>

                {log.photo_url && (
                  <div className="mt-2 h-32 w-full rounded-xl overflow-hidden bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={log.photo_url} alt="Bukti" className="w-full h-full object-cover hover:scale-110 transition-transform" />
                  </div>
                )}

                {/* Actions */}
                {!isResolved && canAccess('farm_management') && (
                  <button
                    onClick={() => handleUpdateStatus(log.id, 'resolved')}
                    className="mt-auto w-full py-2 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Tandai Selesai
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Laporan Baru */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="glass-heavy w-full max-w-md rounded-2xl p-6 space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--surface-border)' }}>
              <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
                <Camera className="w-5 h-5 text-orange-500" /> Buat Laporan Lapangan
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" style={{ color: 'var(--surface-text-muted)' }} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text-muted)' }}>📍 Lokasi (Zona) *</label>
                <select required value={form.zone_id} onChange={e => setForm({...form, zone_id: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-orange-500" style={{ color: 'var(--surface-text)' }}>
                  <option value="">-- Pilih Zona --</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text-muted)' }}>Kategori *</label>
                  <select required value={form.issue_type} onChange={e => setForm({...form, issue_type: e.target.value as ScoutingIssueType})}
                    className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-orange-500" style={{ color: 'var(--surface-text)' }}>
                    <option value="hama">🐛 Hama</option>
                    <option value="penyakit">🦠 Penyakit</option>
                    <option value="infrastruktur">🔧 Alat Rusak</option>
                    <option value="lainnya">ℹ️ Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text-muted)' }}>Tingkat Bahaya *</label>
                  <select required value={form.severity} onChange={e => setForm({...form, severity: e.target.value as ScoutingSeverity})}
                    className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-orange-500" style={{ color: 'var(--surface-text)' }}>
                    <option value="rendah">🟢 Rendah (Aman)</option>
                    <option value="sedang">🟠 Sedang (Waspada)</option>
                    <option value="tinggi">🔴 Tinggi (Kritis)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text-muted)' }}>Keterangan *</label>
                <textarea required value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Misal: Ditemukan banyak kutu putih di bawah daun sebelah utara..." rows={3}
                  className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-orange-500 resize-none" style={{ color: 'var(--surface-text)' }} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--surface-text-muted)' }}>Link Foto (Opsional)</label>
                <input type="url" value={form.photo_url} onChange={e => setForm({...form, photo_url: e.target.value})}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl glass-sm text-sm outline-none focus:ring-2 focus:ring-orange-500" style={{ color: 'var(--surface-text)' }} />
                <p className="text-[10px] mt-1" style={{ color: 'var(--surface-text-muted)' }}>Untuk saat ini masukkan URL gambar langsung.</p>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={modalLoading}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-rose-600 flex items-center justify-center gap-2 disabled:opacity-50">
                  {modalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
