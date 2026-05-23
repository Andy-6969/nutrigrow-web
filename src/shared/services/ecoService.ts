import { supabase } from '@/shared/lib/supabase';
import { vpsApi } from '@/shared/lib/api';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { EcoStatus, EcoSavingsLog, EcoDailySummary } from '@/shared/types/global.types';

interface EcoStatusResponse {
  success: boolean;
  eco_mode: boolean;
  savings: EcoStatus['savings'];
}

interface EcoToggleResponse {
  success: boolean;
  eco_mode: boolean;
  message: string;
}

interface EcoHistoryResponse {
  success: boolean;
  daily_summary: EcoDailySummary[];
  detailed_log: EcoSavingsLog[];
}

export class SupabaseEcoService {
  private channel: RealtimeChannel | null = null;

  /**
   * Ambil status eco mode + total savings dari VPS API
   */
  async getEcoStatus(): Promise<EcoStatus> {
    try {
      const res = await vpsApi.get<EcoStatusResponse>('/eco/status');
      return {
        eco_mode: res.eco_mode,
        savings: res.savings,
      };
    } catch (err) {
      console.warn('[ecoService] getEcoStatus failed, falling back to DB:', err);
      // Fallback: baca langsung dari Supabase
      return this.getEcoStatusFromDB();
    }
  }

  /**
   * Fallback: ambil eco status langsung dari Supabase
   */
  private async getEcoStatusFromDB(): Promise<EcoStatus> {
    const { data: settingData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'eco_mode')
      .single();

    const { data: logs } = await supabase
      .from('eco_savings_log')
      .select('water_saved_liters, normal_duration, eco_duration');

    const totalWater = (logs || []).reduce((s, r) => s + (r.water_saved_liters || 0), 0);
    const totalNormalDur = (logs || []).reduce((s, r) => s + (r.normal_duration || 0), 0);
    const totalEcoDur = (logs || []).reduce((s, r) => s + (r.eco_duration || 0), 0);
    const timeSaved = totalNormalDur - totalEcoDur;

    return {
      eco_mode: settingData?.value?.enabled === true,
      savings: {
        water_saved_liters: Math.round(totalWater * 10) / 10,
        cost_saved_rupiah: Math.round((totalWater / 1000) * 5000),
        energy_saved_kwh: Math.round((timeSaved / 60) * 0.075 * 100) / 100,
        time_saved_minutes: timeSaved,
        total_evaluations: (logs || []).length,
      },
    };
  }

  /**
   * Toggle eco mode on/off via VPS API
   */
  async toggleEcoMode(enabled: boolean): Promise<boolean> {
    const res = await vpsApi.post<EcoToggleResponse>('/eco/toggle', { enabled });
    return res.eco_mode;
  }

  /**
   * Ambil riwayat penghematan 7 hari terakhir
   */
  async getEcoHistory(): Promise<{ daily: EcoDailySummary[]; logs: EcoSavingsLog[] }> {
    try {
      const res = await vpsApi.get<EcoHistoryResponse>('/eco/history');
      return {
        daily: res.daily_summary,
        logs: res.detailed_log,
      };
    } catch (err) {
      console.warn('[ecoService] getEcoHistory via VPS failed, falling back to DB:', err);
      return this.getEcoHistoryFromDB();
    }
  }

  /**
   * Fallback: ambil history langsung dari Supabase
   */
  private async getEcoHistoryFromDB(): Promise<{ daily: EcoDailySummary[]; logs: EcoSavingsLog[] }> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('eco_savings_log')
      .select('*')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.warn('[ecoService] DB fallback failed:', error.message);
      return { daily: [], logs: [] };
    }

    const rows = (data || []) as EcoSavingsLog[];

    // Aggregate per hari
    const dailyMap: Record<string, EcoDailySummary> = {};
    rows.forEach(row => {
      const day = new Date(row.created_at).toISOString().slice(0, 10);
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, water_saved: 0, count: 0, reasons: {} };
      }
      dailyMap[day].water_saved += row.water_saved_liters || 0;
      dailyMap[day].count += 1;
      const r = row.reason || 'unknown';
      dailyMap[day].reasons[r] = (dailyMap[day].reasons[r] || 0) + 1;
    });

    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return { daily, logs: rows.slice(0, 50) };
  }

  /**
   * Real-time subscription pada tabel eco_savings_log
   */
  subscribeToEcoSavings(callback: () => void): void {
    if (this.channel) return;

    this.channel = supabase
      .channel('public:eco_savings_log')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eco_savings_log' }, callback)
      .subscribe();
  }

  unsubscribeFromEcoSavings(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const ecoService = new SupabaseEcoService();
