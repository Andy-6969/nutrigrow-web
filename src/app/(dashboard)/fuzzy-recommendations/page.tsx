'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Brain, Check, X, Clock, AlertTriangle, Info, Droplets, 
  FlaskConical, Thermometer, Wind, CheckCircle2, XCircle, 
  RotateCcw, Sparkles, ChevronRight, Activity, ArrowRight, ChevronDown
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { fuzzyService, FuzzyRecommendation } from '@/shared/services/fuzzyService';
import { useAuth } from '@/shared/context/AuthContext';
import { useT } from '@/shared/context/LanguageContext';
import { supabase } from '@/shared/lib/supabase';
import { sensorService } from '@/shared/services/sensorService';

// ─── FUZZY LOGIC ENGINE (MAMDANI) ──────────────────────────────
function trapezoid(x: number, a: number, b: number, c: number, d: number): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > c && x < d) return (d - x) / (d - c);
  return 0;
}

function triangle(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > b && x < c) return (c - x) / (c - b);
  return 0;
}

interface FuzzyCalculationResult {
  moisture: { dry: number; normal: number; wet: number };
  temp: { cold: number; warm: number; hot: number };
  humidity: { low: number; medium: number; high: number };
  phState: { acidic: number; neutral: number; alkaline: number };
  ecState: { low: number; ideal: number; high: number };
  rules: {
    r1: number; r2: number; r3: number; r4: number; r5: number; r6: number;
  };
  sumActivation: number;
  rawDuration: number;
  humidityAdjusted: boolean;
  ecoAdjusted: boolean;
  rainDelayed: boolean;
  finalDuration: number;
  irrigationDecision: string;
  fertilizerDecision: string;
  fertilizerAction: string;
  nutrisiMl: number;
  phAdjustment: string | null;
}

function calculateFuzzy(
  moisture: number,
  temp: number,
  humidity: number,
  ph: number,
  ec: number,
  willRain: boolean,
  ecoMode: boolean
): FuzzyCalculationResult {
  // 1. Fuzzification
  const moistureDry = trapezoid(moisture, 0, 0, 30, 50);
  const moistureNormal = triangle(moisture, 40, 60, 80);
  const moistureWet = trapezoid(moisture, 70, 85, 100, 100);

  const tempCold = trapezoid(temp, 0, 0, 18, 24);
  const tempWarm = triangle(temp, 22, 28, 32);
  const tempHot = trapezoid(temp, 30, 35, 60, 60);

  const humLow = trapezoid(humidity, 0, 0, 30, 50);
  const humMedium = triangle(humidity, 40, 65, 80);
  const humHigh = trapezoid(humidity, 70, 85, 100, 100);

  const phAcidic = trapezoid(ph, 0, 0, 5.0, 6.0);
  const phNeutral = triangle(ph, 5.8, 6.5, 7.2);
  const phAlkaline = trapezoid(ph, 7.0, 8.0, 14.0, 14.0);

  const ecLow = trapezoid(ec, 0, 0, 0.8, 1.5);
  const ecIdeal = triangle(ec, 1.2, 2.0, 2.8);
  const ecHigh = trapezoid(ec, 2.5, 3.2, 5.0, 5.0);

  // 2. Rules Evaluation (Irrigation)
  // R1: Kering AND Panas AND Rendah => SIRAM_SEGERA (25 min)
  const r1 = Math.min(moistureDry, tempHot, humLow);
  // R2: Kering AND Normal AND Sedang => SIRAM (15 min)
  const r2 = Math.min(moistureDry, tempWarm, humMedium);
  // R3: Kering AND Dingin AND Tinggi => SIRAM_SEDIKIT (8 min)
  const r3 = Math.min(moistureDry, tempCold, humHigh);
  // R4: Optimal AND Panas AND Rendah => SIRAM_SEDIKIT (8 min)
  const r4 = Math.min(moistureNormal, tempHot, humLow);
  // R5: Optimal AND Normal AND Sedang => TIDAK_PERLU (0 min)
  const r5 = Math.min(moistureNormal, tempWarm, humMedium);
  // R6: Basah => TIDAK_PERLU (0 min)
  const r6 = moistureWet;

  // 3. Defuzzification (Weighted Average)
  const sumActivation = r1 + r2 + r3 + r4 + r5 + r6;
  const sumWeight = (r1 * 25) + (r2 * 15) + (r3 * 8) + (r4 * 8) + (r5 * 0) + (r6 * 0);
  
  let rawDuration = sumActivation > 0 ? sumWeight / sumActivation : 0;
  rawDuration = Math.ceil(rawDuration); // Round up

  // 4. Adjustments
  let finalDuration = rawDuration;
  let humidityAdjusted = false;
  let ecoAdjusted = false;
  let rainDelayed = false;

  if (willRain) {
    finalDuration = 0;
    rainDelayed = true;
  } else {
    // High humidity cut (50% reduction if RH > 85%)
    if (humidity > 85 && finalDuration > 0) {
      finalDuration = Math.ceil(finalDuration * 0.5);
      humidityAdjusted = true;
    }
    // Eco Mode cut (30% reduction if ecoMode is active)
    if (ecoMode && finalDuration > 0) {
      finalDuration = Math.ceil(finalDuration * 0.7);
      ecoAdjusted = true;
    }
  }

  // Determine irrigation decision
  let irrigationDecision = 'TIDAK_PERLU';
  if (finalDuration > 0) {
    const maxVal = Math.max(r1, r2, r3, r4);
    if (maxVal > 0) {
      if (maxVal === r1) irrigationDecision = 'SIRAM_SEGERA';
      else if (maxVal === r2) irrigationDecision = 'SIRAM';
      else irrigationDecision = 'SIRAM_SEDIKIT';
    }
  }

  // 5. Fertilizer & pH decisions
  let fertilizerDecision = 'TIDAK_PERLU';
  let fertilizerAction = 'Pupuk / pH adjuster tidak diperlukan';
  let nutrisiMl = 0;
  let phAdjustment: string | null = null;

  // pH adjustment
  if (ph < 5.8) {
    phAdjustment = 'up';
    fertilizerAction = 'Aktifkan larutan pengoreksi basa (pH Up)';
  } else if (ph > 7.2) {
    phAdjustment = 'down';
    fertilizerAction = 'Aktifkan larutan pengoreksi asam (pH Down)';
  }

  // Fertilizer
  if (ec < 1.2) {
    fertilizerDecision = 'PUPUK_TINGGI';
    nutrisiMl = 50;
    fertilizerAction = phAdjustment 
      ? `Tambahkan pupuk A&B 50ml + ${fertilizerAction}` 
      : 'Tambahkan pupuk cair A & B sebanyak 50 ml';
  } else if (ec <= 2.5) {
    fertilizerDecision = 'PUPUK_RENDAH';
    nutrisiMl = 15;
    fertilizerAction = phAdjustment 
      ? `Tambahkan pupuk A&B 15ml + ${fertilizerAction}`
      : 'Tambahkan pupuk cair A & B sebanyak 15 ml (pemeliharaan)';
  } else {
    fertilizerDecision = 'TIDAK_PERLU';
    nutrisiMl = 0;
    if (phAdjustment) {
      fertilizerAction = `Bilas garam di akar (Flushing) + ${fertilizerAction}`;
    } else {
      fertilizerAction = 'Bilas penumpukan garam di akar (Flushing)';
    }
  }

  return {
    moisture: { dry: moistureDry, normal: moistureNormal, wet: moistureWet },
    temp: { cold: tempCold, warm: tempWarm, hot: tempHot },
    humidity: { low: humLow, medium: humMedium, high: humHigh },
    phState: { acidic: phAcidic, neutral: phNeutral, alkaline: phAlkaline },
    ecState: { low: ecLow, ideal: ecIdeal, high: ecHigh },
    rules: { r1, r2, r3, r4, r5, r6 },
    sumActivation,
    rawDuration,
    humidityAdjusted,
    ecoAdjusted,
    rainDelayed,
    finalDuration,
    irrigationDecision,
    fertilizerDecision,
    fertilizerAction,
    nutrisiMl,
    phAdjustment
  };
}

export default function FuzzyRecommendationsPage() {
  const t = useT();
  const { role } = useAuth();
  
  const [pending, setPending] = useState<FuzzyRecommendation[]>([]);
  const [history, setHistory] = useState<FuzzyRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [isProcessing, setIsProcessing] = useState<Record<number, 'approve' | 'reject' | null>>({});
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Simulation Panel States
  const [showSim, setShowSim] = useState(false);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [simMoisture, setSimMoisture] = useState<number>(35);
  const [simTemp, setSimTemp] = useState<number>(28);
  const [simHumidity, setSimHumidity] = useState<number>(60);
  const [simPh, setSimPh] = useState<number>(6.2);
  const [simEc, setSimEc] = useState<number>(1.8);
  const [simWillRain, setSimWillRain] = useState<boolean>(false);
  const [simEcoMode, setSimEcoMode] = useState<boolean>(false);
  const [simSending, setSimSending] = useState(false);
  const [isFetchingRealtime, setIsFetchingRealtime] = useState(false);
  const [latestRecordedAt, setLatestRecordedAt] = useState<string | null>(null);
  const [isZoneOnline, setIsZoneOnline] = useState<boolean>(false);

  // Fetch and apply latest sensor data for the selected zone
  const handleLoadRealtimeData = useCallback(async (zoneId: string) => {
    if (!zoneId) return;
    setIsFetchingRealtime(true);
    try {
      const data = await sensorService.getSensorData(zoneId);
      if (data) {
        setSimMoisture(data.soil_moisture ?? 35);
        setSimTemp(data.temperature ?? 28);
        setSimHumidity(data.humidity ?? 60);
        setSimPh(data.ph ?? 6.2);
        setSimEc(data.tds ?? 1.8);
        setLatestRecordedAt(data.recorded_at);
        
        // Online status logic: check if data is newer than 10 minutes
        const online = new Date().getTime() - new Date(data.recorded_at).getTime() < 10 * 60 * 1000;
        setIsZoneOnline(online);
      } else {
        setLatestRecordedAt(null);
        setIsZoneOnline(false);
      }
    } catch (err) {
      console.warn('[fuzzy-recommendations] Failed to load realtime sensor data:', err);
      setLatestRecordedAt(null);
      setIsZoneOnline(false);
    } finally {
      setIsFetchingRealtime(false);
    }
  }, []);

  // Backend automatically evaluates live sensors. This panel is solely for manual simulation.

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

      // Fetch zones for simulation
      const { data: fetchedZones, error: zonesError } = await supabase
        .from('zones')
        .select('id, name')
        .order('name');
      
      if (!zonesError && fetchedZones) {
        setZones(fetchedZones);
        if (fetchedZones.length > 0 && !selectedZone) {
          setSelectedZone(fetchedZones[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching fuzzy recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedZone]);

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

  // Handle Simulation Sending
  const handleSimulateSend = async () => {
    if (!selectedZone) {
      setStatusMsg({ type: 'error', text: 'Silakan pilih zona terlebih dahulu.' });
      return;
    }

    const zoneName = zones.find(z => z.id === selectedZone)?.name || 'Zona';
    
    // Calculate live values
    const calculation = calculateFuzzy(
      simMoisture,
      simTemp,
      simHumidity,
      simPh,
      simEc,
      simWillRain,
      simEcoMode
    );

    const payload = {
      zone_id: selectedZone,
      zone_name: zoneName,
      soil_moisture: simMoisture,
      temperature: simTemp,
      humidity: simHumidity,
      ph: simPh,
      ec: simEc,
      will_rain: simWillRain,
      irrigation_decision: calculation.irrigationDecision,
      irrigation_score: calculation.sumActivation > 0 ? Number((calculation.rawDuration / 25).toFixed(2)) : 0,
      irrigation_duration: calculation.finalDuration * 60, // Store in seconds for layout
      fertilizer_decision: calculation.fertilizerDecision,
      fertilizer_confidence: calculation.fertilizerDecision !== 'TIDAK_PERLU' ? 0.95 : 0,
      fertilizer_action: calculation.fertilizerAction,
      nutrisi_ml: calculation.nutrisiMl,
      ph_adjustment: calculation.phAdjustment,
      status: 'pending' as const,
      auto_execute_at: new Date(Date.now() + 5 * 60000).toISOString(), // 5 minutes timer
    };

    setSimSending(true);
    setStatusMsg(null);

    try {
      await fuzzyService.insertRecommendation(payload);
      setStatusMsg({
        type: 'success',
        text: `Sukses! Rekomendasi fuzzy simulasi untuk ${zoneName} berhasil ditambahkan ke antrian.`
      });
      fetchData();
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Gagal mengirim rekomendasi simulasi.'
      });
    } finally {
      setSimSending(false);
    }
  };

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
      case 'expired':
        return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
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
      case 'expired':
        return 'Kadaluarsa';
      default:
        return status;
    }
  };

  // Filter out pending recommendations that have expired locally
  const activePending = pending.filter(rec => {
    const remSecs = getRemainingSeconds(rec.auto_execute_at);
    return remSecs > 0;
  });

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

      {/* Simulation Panel */}
      <div className="glass rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card-ambient)' }}>
        <button 
          onClick={() => setShowSim(!showSim)}
          className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors font-bold text-lg"
          style={{ color: 'var(--surface-text)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Simulasi Parameter Sensor (Demo AI Fuzzy Logic)</span>
          </div>
          <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", showSim && "rotate-180")} />
        </button>

        {showSim && (
          <div className="p-6 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ borderColor: 'var(--surface-border)' }}>
            {/* Left Column: Inputs Form */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5 mb-1">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    1. Input Parameter Sensor
                  </h4>
                  <p className="text-xs text-slate-400">Pilih mode untuk menggunakan data real-time sensor atau mensimulasikan nilai custom.</p>
                </div>
              </div>

              {/* Info text / Fetch indicator */}
              <div className="flex flex-col gap-2 px-1 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    💡 Geser slider di bawah untuk mensimulasikan nilai, atau tarik data realtime.
                  </span>
                  <button
                    onClick={() => handleLoadRealtimeData(selectedZone)}
                    disabled={isFetchingRealtime || !selectedZone}
                    className="text-emerald-400 font-bold hover:text-emerald-300 active:scale-95 disabled:opacity-50 flex items-center gap-1 shrink-0 transition-all"
                  >
                    <RotateCcw className={cn("w-3.5 h-3.5", isFetchingRealtime && "animate-spin")} />
                    Tarik Data Realtime
                  </button>
                </div>
              </div>
              
              {/* Zone Selector & Online/Offline Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 block font-semibold">Pilih Lahan / Zona Target</label>
                  
                  {/* Online/Offline Status Badge */}
                  {selectedZone && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border animate-fade-in",
                      isZoneOnline 
                        ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]" 
                        : "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.05)]"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isZoneOnline ? "bg-green-400 animate-pulse" : "bg-red-400")} />
                      <span>{isZoneOnline ? "Sensor Online" : "Sensor Offline"}</span>
                    </div>
                  )}
                </div>
                <select 
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-black/30 border p-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-200"
                  style={{ borderColor: 'var(--surface-border)' }}
                >
                  {zones.length === 0 ? (
                    <option value="">Tidak ada zona tersedia</option>
                  ) : (
                    zones.map(z => (
                      <option key={z.id} value={z.id} className="bg-slate-900">{z.name}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Sliders vs Realtime Grid */}
              <div className="space-y-4 animate-fade-in">
                  {/* Soil Moisture */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-blue-400 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5" /> Kelembaban Tanah
                      </span>
                      <span className="text-slate-200">{simMoisture}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={simMoisture} 
                      onChange={(e) => setSimMoisture(Number(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0% (Kering)</span>
                      <span>50% (Normal)</span>
                      <span>100% (Basah)</span>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-orange-400 flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5" /> Suhu Udara
                      </span>
                      <span className="text-slate-200">{simTemp}°C</span>
                    </div>
                    <input 
                      type="range" min="-10" max="60" 
                      value={simTemp} 
                      onChange={(e) => setSimTemp(Number(e.target.value))}
                      className="w-full accent-orange-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>-10°C (Beku)</span>
                      <span>25°C (Warm)</span>
                      <span>60°C (Panas)</span>
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-teal-400 flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5" /> Kelembaban Udara
                      </span>
                      <span className="text-slate-200">{simHumidity}% RH</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" 
                      value={simHumidity} 
                      onChange={(e) => setSimHumidity(Number(e.target.value))}
                      className="w-full accent-teal-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0% (Kering)</span>
                      <span>65% (Normal)</span>
                      <span>100% (Lembab)</span>
                    </div>
                  </div>

                  {/* pH */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-yellow-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Derajat Keasaman (pH)
                      </span>
                      <span className="text-slate-200">pH {simPh.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="14" step="0.1"
                      value={simPh} 
                      onChange={(e) => setSimPh(Number(e.target.value))}
                      className="w-full accent-yellow-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>pH 0 (Sangat Asam)</span>
                      <span>pH 7 (Netral)</span>
                      <span>pH 14 (Sangat Basa)</span>
                    </div>
                  </div>

                  {/* EC */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-purple-400 flex items-center gap-1">
                        <FlaskConical className="w-3.5 h-3.5" /> Kepekatan Nutrisi (EC)
                      </span>
                      <span className="text-slate-200">{simEc.toFixed(2)} mS/cm</span>
                    </div>
                    <input 
                      type="range" min="0" max="5" step="0.05"
                      value={simEc} 
                      onChange={(e) => setSimEc(Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0.0 mS (Tawar)</span>
                      <span>2.0 mS (Ideal)</span>
                      <span>5.0 mS (Sangat Pekat)</span>
                    </div>
                  </div>
                </div>


              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5 cursor-pointer hover:bg-white/5 transition-all">
                  <input 
                    type="checkbox" checked={simWillRain} 
                    onChange={(e) => setSimWillRain(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Akan Hujan</p>
                    <p className="text-[10px] text-slate-400">Prediksi cuaca BMKG</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5 cursor-pointer hover:bg-white/5 transition-all">
                  <input 
                    type="checkbox" checked={simEcoMode} 
                    onChange={(e) => setSimEcoMode(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Eco Mode Aktif</p>
                    <p className="text-[10px] text-slate-400">Menghemat air 30%</p>
                  </div>
                </label>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSimulateSend}
                disabled={simSending || zones.length === 0}
                className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                  "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-700/20 active:scale-[0.98] disabled:opacity-50"
                )}
              >
                {simSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengirim rekomendasi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Kirim Rekomendasi Simulasi ke Antrian</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Visual Math Calculator */}
            {(() => {
              const calc = calculateFuzzy(
                simMoisture,
                simTemp,
                simHumidity,
                simPh,
                simEc,
                simWillRain,
                simEcoMode
              );
              
              return (
                <div className="space-y-6 lg:border-l lg:border-white/5 lg:pl-8">
                  <div>
                    <h4 className="font-bold text-sm text-slate-300 flex items-center gap-1.5 mb-1">
                      <Brain className="w-4 h-4 text-emerald-400" />
                      2. Kalkulator Langkah Logika Fuzzy (Mamdani)
                    </h4>
                    <p className="text-xs text-slate-400">Visualisasi instan derajat keanggotaan, evaluasi basis aturan, dan perhitungan defuzzifikasi.</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Fuzzification Outputs */}
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                      <p className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Tahap 1: Fuzzifikasi (Keanggotaan)</p>
                      
                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <p className="text-slate-400 font-medium mb-1">Kelembaban Tanah:</p>
                          <ul className="space-y-0.5 font-mono">
                            <li className={calc.moisture.dry > 0 ? "text-red-400 font-semibold" : "text-slate-500"}>- Kering (Dry): {calc.moisture.dry.toFixed(2)}</li>
                            <li className={calc.moisture.normal > 0 ? "text-blue-400 font-semibold" : "text-slate-500"}>- Optimal (Normal): {calc.moisture.normal.toFixed(2)}</li>
                            <li className={calc.moisture.wet > 0 ? "text-green-400 font-semibold" : "text-slate-500"}>- Basah (Wet): {calc.moisture.wet.toFixed(2)}</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium mb-1">Suhu Udara:</p>
                          <ul className="space-y-0.5 font-mono">
                            <li className={calc.temp.cold > 0 ? "text-cyan-400 font-semibold" : "text-slate-500"}>- Dingin (Cold): {calc.temp.cold.toFixed(2)}</li>
                            <li className={calc.temp.warm > 0 ? "text-amber-400 font-semibold" : "text-slate-500"}>- Normal (Warm): {calc.temp.warm.toFixed(2)}</li>
                            <li className={calc.temp.hot > 0 ? "text-orange-400 font-semibold" : "text-slate-500"}>- Panas (Hot): {calc.temp.hot.toFixed(2)}</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Rules Evaluation */}
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                      <p className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Tahap 2: Evaluasi Aturan (Inference)</p>
                      <ul className="space-y-1.5 font-mono text-[11px]">
                        <li className={cn(calc.rules.r1 > 0 ? "text-red-400 font-semibold" : "text-slate-500")}>
                          [R1] Kering & Panas & Rendah =&gt; SIRAM_SEGERA (25m) : {calc.rules.r1.toFixed(2)}
                        </li>
                        <li className={cn(calc.rules.r2 > 0 ? "text-blue-400 font-semibold" : "text-slate-500")}>
                          [R2] Kering & Normal & Sedang =&gt; SIRAM (15m) : {calc.rules.r2.toFixed(2)}
                        </li>
                        <li className={cn(calc.rules.r3 > 0 ? "text-cyan-400 font-semibold" : "text-slate-500")}>
                          [R3] Kering & Dingin & Tinggi =&gt; SIRAM_SEDIKIT (8m) : {calc.rules.r3.toFixed(2)}
                        </li>
                        <li className={cn(calc.rules.r4 > 0 ? "text-cyan-400 font-semibold" : "text-slate-500")}>
                          [R4] Optimal & Panas & Rendah =&gt; SIRAM_SEDIKIT (8m) : {calc.rules.r4.toFixed(2)}
                        </li>
                        <li className={cn(calc.rules.r5 > 0 ? "text-emerald-500" : "text-slate-500")}>
                          [R5] Optimal & Normal & Sedang =&gt; TIDAK_PERLU (0m) : {calc.rules.r5.toFixed(2)}
                        </li>
                        <li className={cn(calc.rules.r6 > 0 ? "text-emerald-500" : "text-slate-500")}>
                          [R6] Basah =&gt; TIDAK_PERLU (0m) : {calc.rules.r6.toFixed(2)}
                        </li>
                      </ul>
                    </div>

                    {/* Defuzzification & Adjustments */}
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                      <p className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Tahap 3 & 4: Defuzzifikasi & Penyesuaian</p>
                      
                      <div className="space-y-2 font-mono text-[11px] text-slate-300">
                        <div>
                          <p className="text-slate-400 font-semibold mb-0.5">Rumus Weighted Average:</p>
                          <p>
                            (R1×25 + R2×15 + R3×8 + R4×8) / (R1+R2+R3+R4+R5+R6) =
                          </p>
                          <p className="text-emerald-400 font-bold mt-0.5">
                            ({(calc.rules.r1*25).toFixed(1)} + {(calc.rules.r2*15).toFixed(1)} + {(calc.rules.r3*8).toFixed(1)} + {(calc.rules.r4*8).toFixed(1)}) / {calc.sumActivation.toFixed(2)} = {calc.rawDuration} menit
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/5 space-y-1">
                          <p className="text-slate-400 font-semibold">Efek Fitur Cerdas / Lingkungan:</p>
                          {calc.rainDelayed && (
                            <p className="text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> BMKG Rain Block: Durasi dipangkas ke 0 menit (Menunggu Hujan)
                            </p>
                          )}
                          {calc.humidityAdjusted && (
                            <p className="text-blue-400 font-semibold flex items-center gap-1">
                              <Info className="w-3.5 h-3.5" /> High Humidity Cut: Durasi dikurangi 50% (RH &gt; 85%)
                            </p>
                          )}
                          {calc.ecoAdjusted && (
                            <p className="text-teal-400 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Eco-Mode Active: Durasi dikurangi 30%
                            </p>
                          )}
                          {!calc.rainDelayed && !calc.humidityAdjusted && !calc.ecoAdjusted && (
                            <p className="text-slate-400">- Tidak ada penyesuaian aktif.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Final Outputs Preview */}
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                      <p className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider">Hasil Akhir Keputusan Fuzzy</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400">Keputusan Irigasi</p>
                          <p className="text-sm font-bold text-slate-100">{calc.irrigationDecision}</p>
                          <p className="text-xs text-slate-300">{calc.finalDuration} menit ({calc.finalDuration * 60} detik)</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400">Keputusan Nutrisi / pH</p>
                          <p className="text-sm font-bold text-slate-100 truncate" title={calc.fertilizerAction}>{calc.fertilizerDecision}</p>
                          <p className="text-xs text-slate-300 truncate" title={calc.fertilizerAction}>{calc.fertilizerAction}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="space-y-8">
        
        {/* PENDING RECOMMENDATIONS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--surface-border)' }}>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
              <Clock className="w-5 h-5 text-amber-500" />
              Menunggu Persetujuan
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {activePending.length} pending
              </span>
            </h3>
          </div>

          {isLoading ? (
            <div className="glass p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>Memproses data rekomendasi fuzzy...</p>
            </div>
          ) : activePending.length === 0 ? (
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
              {activePending.map((rec) => {
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
