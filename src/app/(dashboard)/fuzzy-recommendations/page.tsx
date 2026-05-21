'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Brain, Check, X, Clock, AlertTriangle, Info, Droplets, 
  FlaskConical, Thermometer, Wind, CheckCircle2, XCircle, 
  RotateCcw, Sparkles, ChevronRight, Activity, ArrowRight
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { fuzzyService, FuzzyRecommendation } from '@/shared/services/fuzzyService';
import { useAuth } from '@/shared/context/AuthContext';
import { useT } from '@/shared/context/LanguageContext';

export default function FuzzyRecommendationsPage() {
  const t = useT();
  const { role } = useAuth();
  
  const [pending, setPending] = useState<FuzzyRecommendation[]>([]);
  const [history, setHistory] = useState<FuzzyRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState<Record<number, 'approve' | 'reject' | null>>({});
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // 1. Tick for countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Data
  const fetchData = useCallback(async () => {
    try {
      const [fetchedPending, fetchedHistory] = await Promise.all([
        fuzzyService.getPendingRecommendations(),
        fuzzyService.getRecommendationHistory(),
      ]);
      setPending(fetchedPending);
      setHistory(fetchedHistory);
    } catch (err) {
      console.error('Error fetching fuzzy recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3. Real-time Subscription
  useEffect(() => {
    fetchData();

    fuzzyService.subscribeToRecommendations(() => {
      fetchData();
    });

    return () => {
      fuzzyService.unsubscribeFromRecommendations();
    };
  }, [fetchData]);

  // 4. Action Handlers
  const handleApprove = async (rec: FuzzyRecommendation) => {
    if (!['super_admin', 'pemilik_kebun'].includes(role || '')) {
      setStatusMsg({ 
        type: 'error', 
        text: 'Akses Ditolak: Anda tidak memiliki izin untuk menyetujui rekomendasi ini.' 
      });
      return;
    }

    setIsProcessing(prev => ({ ...prev, [rec.id]: 'approve' }));
    setStatusMsg(null);

    try {
      await fuzzyService.approveRecommendation(rec.id, rec.zone_id);
      setStatusMsg({ 
        type: 'success', 
        text: `Rekomendasi #${rec.id} untuk ${rec.zone_name || 'Zona'} berhasil disetujui!` 
      });
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ 
        type: 'error', 
        text: err.message || 'Gagal menyetujui rekomendasi.' 
      });
    } finally {
      setIsProcessing(prev => ({ ...prev, [rec.id]: null }));
    }
  };

  const handleReject = async (rec: FuzzyRecommendation) => {
    if (!['super_admin', 'pemilik_kebun'].includes(role || '')) {
      setStatusMsg({ 
        type: 'error', 
        text: 'Akses Ditolak: Anda tidak memiliki izin untuk menolak rekomendasi ini.' 
      });
      return;
    }

    setIsProcessing(prev => ({ ...prev, [rec.id]: 'reject' }));
    setStatusMsg(null);

    try {
      await fuzzyService.rejectRecommendation(rec.id, rec.zone_id);
      setStatusMsg({ 
        type: 'success', 
        text: `Rekomendasi #${rec.id} untuk ${rec.zone_name || 'Zona'} berhasil ditolak.` 
      });
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ 
        type: 'error', 
        text: err.message || 'Gagal menolak rekomendasi.' 
      });
    } finally {
      setIsProcessing(prev => ({ ...prev, [rec.id]: null }));
    }
  };

  // Utility helpers
  const getRemainingSeconds = (autoExecuteAtStr: string) => {
    if (!autoExecuteAtStr) return 0;
    const autoExecuteAt = new Date(autoExecuteAtStr).getTime();
    const diff = Math.floor((autoExecuteAt - now) / 1000);
    return Math.max(0, diff);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getDecisionBadgeClass = (decision: string) => {
    switch (decision) {
      case 'SIRAM_SEGERA':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'SIRAM':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'SIRAM_SEDIKIT':
        return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      case 'TIDAK_PERLU':
      default:
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  const getFertilizerBadgeClass = (decision: string) => {
    if (decision && decision !== 'TIDAK_PERLU') {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
    return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'auto_executed':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Disetujui';
      case 'rejected':
        return 'Ditolak';
      case 'auto_executed':
        return 'Eksekusi Otomatis';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
            <Brain className="w-7 h-7 text-emerald-500 animate-pulse" />
            Rekomendasi Fuzzy Logic
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--surface-text-muted)' }}>
            Evaluasi sensor otomatis setiap 5 menit dengan mekanisme failsafe & persetujuan pemilik kebun.
          </p>
        </div>
        
        <button
          onClick={() => {
            setIsLoading(true);
            fetchData();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all hover:bg-white/5 active:scale-[0.98]"
          style={{ borderColor: 'var(--surface-border)', color: 'var(--surface-text)' }}
        >
          <RotateCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Segarkan Data
        </button>
      </div>

      {/* Action Notification Message */}
      {statusMsg && (
        <div className={cn(
          'flex items-center gap-3 p-4 rounded-xl text-sm font-medium transition-all animate-fade-in-up border',
          statusMsg.type === 'error' 
            ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
            : 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
        )}>
          {statusMsg.type === 'error' ? <XCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <div className="flex-1">{statusMsg.text}</div>
          <button onClick={() => setStatusMsg(null)} className="hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="space-y-8">
        
        {/* PENDING RECOMMENDATIONS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--surface-border)' }}>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
              <Clock className="w-5 h-5 text-amber-500" />
              Menunggu Persetujuan
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {pending.length} pending
              </span>
            </h3>
          </div>

          {isLoading ? (
            <div className="glass p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>Memproses data rekomendasi fuzzy...</p>
            </div>
          ) : pending.length === 0 ? (
            <div className="glass p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold" style={{ color: 'var(--surface-text)' }}>Semua Aman & Terkendali</p>
              <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--surface-text-muted)' }}>
                Belum ada rekomendasi baru yang menanti persetujuan. Sistem akan mengevaluasi sensor zona setiap 5 menit secara otomatis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pending.map((rec) => {
                const remSecs = getRemainingSeconds(rec.auto_execute_at);
                const isTimerRunning = remSecs > 0;
                
                return (
                  <div 
                    key={rec.id}
                    className="glass rounded-2xl p-6 flex flex-col justify-between hover:scale-[1.01] transition-all duration-300 relative overflow-hidden group"
                    style={{
                      border: isTimerRunning ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--surface-border)',
                      boxShadow: isTimerRunning ? '0 4px 20px rgba(245, 158, 11, 0.05)' : undefined
                    }}
                  >
                    {/* Glowing effect inside the card */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/5 transition-all duration-500" />
                    
                    {/* Upper details */}
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">ID Rekomendasi #{rec.id}</span>
                          <h4 className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>{rec.zone_name || `Zona ${rec.zone_id.slice(0, 8)}`}</h4>
                        </div>
                        
                        {/* Countdown */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>Auto: {isTimerRunning ? formatTimer(remSecs) : '00:00'}</span>
                        </div>
                      </div>

                      {/* Sensor Inputs Grid */}
                      <div className="grid grid-cols-5 gap-2 bg-black/10 p-3 rounded-xl border border-white/5">
                        <div className="text-center">
                          <Droplets className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                          <p className="text-[10px] text-slate-400">Kelembaban</p>
                          <p className="text-xs font-bold text-slate-200">{rec.soil_moisture}%</p>
                        </div>
                        <div className="text-center border-l border-white/5">
                          <Thermometer className="w-4 h-4 mx-auto text-orange-400 mb-1" />
                          <p className="text-[10px] text-slate-400">Suhu</p>
                          <p className="text-xs font-bold text-slate-200">{rec.temperature}°C</p>
                        </div>
                        <div className="text-center border-l border-white/5">
                          <Wind className="w-4 h-4 mx-auto text-teal-400 mb-1" />
                          <p className="text-[10px] text-slate-400">Hum Udara</p>
                          <p className="text-xs font-bold text-slate-200">{rec.humidity}%</p>
                        </div>
                        <div className="text-center border-l border-white/5">
                          <Sparkles className="w-4 h-4 mx-auto text-yellow-400 mb-1" />
                          <p className="text-[10px] text-slate-400">pH Tanah</p>
                          <p className="text-xs font-bold text-slate-200">{rec.ph}</p>
                        </div>
                        <div className="text-center border-l border-white/5">
                          <Activity className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                          <p className="text-[10px] text-slate-400">EC Tanah</p>
                          <p className="text-xs font-bold text-slate-200">{rec.ec} mS</p>
                        </div>
                      </div>

                      {/* Decisions & Recommendations */}
                      <div className="space-y-2">
                        {/* Irrigation recommendation */}
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                              <Droplets className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-400">Rekomendasi Air (Irigasi)</p>
                              <p className="text-xs text-slate-300 font-semibold mt-0.5">
                                {rec.irrigation_duration > 0 ? `Sembur air selama ${rec.irrigation_duration} detik` : 'Irigasi tidak diperlukan'}
                              </p>
                            </div>
                          </div>
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", getDecisionBadgeClass(rec.irrigation_decision))}>
                            {rec.irrigation_decision}
                          </span>
                        </div>

                        {/* Fertilizing recommendation */}
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <FlaskConical className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-400">Rekomendasi Nutrisi (Pupuk)</p>
                              <p className="text-xs text-slate-300 font-semibold mt-0.5">
                                {rec.fertilizer_action || 'Pupuk / pH adjuster tidak diperlukan'}
                              </p>
                            </div>
                          </div>
                          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", getFertilizerBadgeClass(rec.fertilizer_decision))}>
                            {rec.fertilizer_decision || 'TIDAK_PERLU'}
                          </span>
                        </div>
                      </div>
                      
                      {rec.will_rain && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium px-2 py-1 rounded-lg bg-amber-400/5 border border-amber-400/10">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Terdeteksi kemungkinan hujan segera (BMKG). Irigasi dikurangi atau dimatikan.</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex gap-3 pt-6 border-t border-white/5 mt-6 relative z-10">
                      <button
                        onClick={() => handleReject(rec)}
                        disabled={isProcessing[rec.id] !== undefined && isProcessing[rec.id] !== null}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isProcessing[rec.id] === 'reject' ? (
                          <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Tolak
                      </button>

                      <button
                        onClick={() => handleApprove(rec)}
                        disabled={isProcessing[rec.id] !== undefined && isProcessing[rec.id] !== null}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-700/20 hover:shadow-emerald-700/30 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isProcessing[rec.id] === 'approve' ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Setujui
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECOMMENDATION HISTORY */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--surface-border)' }}>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
              <Activity className="w-5 h-5 text-primary-500" />
              Riwayat Eksekusi
            </h3>
          </div>

          {isLoading ? (
            <div className="glass p-12 text-center" style={{ color: 'var(--surface-text-muted)' }}>
              Memuat histori...
            </div>
          ) : history.length === 0 ? (
            <div className="glass p-6 text-center text-sm" style={{ color: 'var(--surface-text-muted)' }}>
              Belum ada riwayat rekomendasi.
            </div>
          ) : (
            <div className="glass overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/20 text-xs font-semibold" style={{ color: 'var(--surface-text-muted)', borderBottom: '1px solid var(--surface-border)' }}>
                      <th className="p-4">Tanggal & Waktu</th>
                      <th className="p-4">Zona</th>
                      <th className="p-4">Sensor (Moist / pH / EC)</th>
                      <th className="p-4">Keputusan Irigasi</th>
                      <th className="p-4">Keputusan Nutrisi</th>
                      <th className="p-4 text-right">Status Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm" style={{ color: 'var(--surface-text)' }}>
                    {history.map((rec) => (
                      <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-xs">
                          {new Date(rec.created_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="p-4 font-semibold">
                          {rec.zone_name || `Zone ${rec.zone_id.slice(0, 8)}`}
                        </td>
                        <td className="p-4">
                          <span className="text-blue-400 font-semibold">{rec.soil_moisture}%</span>
                          <span className="text-slate-400 mx-1.5">|</span>
                          <span className="text-yellow-400 font-semibold">pH {rec.ph}</span>
                          <span className="text-slate-400 mx-1.5">|</span>
                          <span className="text-purple-400 font-semibold">{rec.ec} mS</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full w-max font-bold mb-1", getDecisionBadgeClass(rec.irrigation_decision))}>
                              {rec.irrigation_decision}
                            </span>
                            {rec.irrigation_duration > 0 && (
                              <span className="text-xs text-slate-400">{rec.irrigation_duration}s semburan</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full w-max font-bold mb-1", getFertilizerBadgeClass(rec.fertilizer_decision))}>
                              {rec.fertilizer_decision || 'TIDAK_PERLU'}
                            </span>
                            {rec.fertilizer_action && (
                              <span className="text-xs text-slate-400 truncate max-w-[200px]" title={rec.fertilizer_action}>
                                {rec.fertilizer_action}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", getStatusBadgeClass(rec.status))}>
                              {getStatusLabel(rec.status)}
                            </span>
                            {rec.executed_at && (
                              <span className="text-[10px] text-slate-400 mt-1">
                                {new Date(rec.executed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
