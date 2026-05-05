import { supabase } from '@/shared/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { OverrideLog } from '@/shared/types/global.types';
import { vpsApi } from '@/shared/lib/api';

export interface IOverrideService {
  getActiveOverrides(): Promise<OverrideLog[]>;
  getOverrideHistory(): Promise<OverrideLog[]>;
  startOverride(zoneId: string, durationMinutes: number, reason?: string, mode?: 'water' | 'fertigation'): Promise<void>;
  stopOverride(overrideId: string): Promise<void>;
  subscribeToOverrides(callback: (payload: unknown) => void): void;
  unsubscribeFromOverrides(): void;
}

export class SupabaseOverrideService implements IOverrideService {
  private channel: RealtimeChannel | null = null;

  async getActiveOverrides(): Promise<OverrideLog[]> {
    const { data, error } = await supabase
      .from('override_logs')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false });
    
    if (error) {
      console.warn('[overrideService] getActiveOverrides failed:', error.message);
      return [];
    }
    return (data ?? []) as OverrideLog[];
  }

  async getOverrideHistory(): Promise<OverrideLog[]> {
    const { data, error } = await supabase
      .from('override_logs')
      .select('*')
      .neq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.warn('[overrideService] getOverrideHistory failed:', error.message);
      return [];
    }
    return (data ?? []) as OverrideLog[];
  }

  async startOverride(zoneId: string, durationMinutes: number, reason?: string, mode: 'water' | 'fertigation' = 'water', target?: 'pump' | 'solenoid'): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const userName = session?.user?.user_metadata?.full_name || session?.user?.email || 'System User';

    const { error } = await supabase.from('override_logs').insert({
      zone_id: zoneId,
      zone_name: `Zone ${zoneId}`, // Typically, you'd fetch the zone name first or join
      user_name: userName,
      mode: target || mode,
      duration_minutes: durationMinutes,
      reason,
      status: 'active'
    });

    if (error) throw error;

    try {
      await vpsApi.post('/actuator/toggle', {
        zone_id: zoneId,
        action: 'on',
        mode: mode,
        duration: durationMinutes,
        target: target || undefined,
      });
    } catch (apiError) {
      console.error('[overrideService] Failed to trigger actuator via VPS API:', apiError);
      throw apiError;
    }
  }

  async stopOverride(overrideId: string, target?: 'pump' | 'solenoid'): Promise<void> {
    const { data: log, error: fetchError } = await supabase
      .from('override_logs')
      .select('zone_id')
      .eq('id', overrideId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('override_logs')
      .update({ 
        status: 'completed', 
        ended_at: new Date().toISOString() 
      })
      .eq('id', overrideId);

    if (error) throw error;

    try {
      await vpsApi.post('/actuator/toggle', { 
        zone_id: log.zone_id, 
        action: 'off',
        target: target || undefined,
      });
    } catch (apiError) {
      console.error('[overrideService] Failed to turn off actuator via VPS API:', apiError);
      throw apiError;
    }
  }

  subscribeToOverrides(callback: (payload: unknown) => void): void {
    if (this.channel) return;
    
    this.channel = supabase
      .channel('public:override_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'override_logs' }, callback)
      .subscribe();
  }

  unsubscribeFromOverrides(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

// Export singleton instance
export const overrideService = new SupabaseOverrideService();
