import { supabase } from '@/shared/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { vpsApi } from '@/shared/lib/api';

export interface FuzzyRecommendation {
  id: number;
  zone_id: string;
  zone_name: string;
  soil_moisture: number;
  temperature: number;
  humidity: number;
  ph: number;
  ec: number;
  will_rain: boolean;
  irrigation_decision: string;
  irrigation_score: number;
  irrigation_duration: number;
  fertilizer_decision: string;
  fertilizer_confidence: number;
  fertilizer_action: string;
  nutrisi_ml: number;
  ph_adjustment: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'auto_executed';
  auto_execute_at: string;
  executed_at: string | null;
  created_at: string;
}

export class SupabaseFuzzyService {
  private channel: RealtimeChannel | null = null;

  async getPendingRecommendations(): Promise<FuzzyRecommendation[]> {
    const { data, error } = await supabase
      .from('fuzzy_recommendations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[fuzzyService] getPendingRecommendations failed:', error.message);
      return [];
    }
    return (data ?? []) as FuzzyRecommendation[];
  }

  async getRecommendationHistory(): Promise<FuzzyRecommendation[]> {
    const { data, error } = await supabase
      .from('fuzzy_recommendations')
      .select('*')
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('[fuzzyService] getRecommendationHistory failed:', error.message);
      return [];
    }
    return (data ?? []) as FuzzyRecommendation[];
  }

  async approveRecommendation(recommendationId: number, zoneId: string): Promise<void> {
    try {
      await vpsApi.post('/fuzzy/approve', {
        recommendation_id: recommendationId,
        zone_id: zoneId,
      });
    } catch (apiError) {
      console.error('[fuzzyService] Failed to approve via VPS API:', apiError);
      throw apiError;
    }
  }

  async rejectRecommendation(recommendationId: number, zoneId: string): Promise<void> {
    try {
      await vpsApi.post('/fuzzy/reject', {
        recommendation_id: recommendationId,
        zone_id: zoneId,
      });
    } catch (apiError) {
      console.error('[fuzzyService] Failed to reject via VPS API:', apiError);
      throw apiError;
    }
  }

  subscribeToRecommendations(callback: (payload: any) => void): void {
    if (this.channel) return;

    this.channel = supabase
      .channel('public:fuzzy_recommendations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuzzy_recommendations' }, callback)
      .subscribe();
  }

  unsubscribeFromRecommendations(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const fuzzyService = new SupabaseFuzzyService();
