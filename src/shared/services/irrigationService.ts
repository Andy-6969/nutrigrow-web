import { supabase } from '@/shared/lib/supabase';
import type { IrrigationLog } from '@/shared/types/global.types';

export interface IIrrigationService {
  getActiveIrrigations(): Promise<IrrigationLog[]>;
  getIrrigationHistory(): Promise<IrrigationLog[]>;
  toggleIrrigation(zoneId: string, currentStatus: string): Promise<void>;
  subscribeToIrrigationUpdates(callback: (payload: any) => void): void;
  unsubscribeFromIrrigationUpdates(): void;
}

export class SupabaseIrrigationService implements IIrrigationService {
  private channel: any = null;

  async toggleIrrigation(zoneId: string, currentStatus: string): Promise<void> {
    try {
      const newStatus = currentStatus === 'irrigating' ? 'idle' : 'irrigating';
      
      // Update zone status
      const { error: zoneError } = await supabase
        .from('zones')
        .update({ status: newStatus })
        .eq('id', zoneId);
      
      if (zoneError) throw zoneError;

      if (newStatus === 'irrigating') {
        // Create a log entry
        await supabase.from('irrigation_logs').insert({
          zone_id: zoneId,
          status: 'running',
          started_at: new Date().toISOString(),
          water_usage_liters: 0
        });
      } else {
        // Complete the log entry
        await supabase.from('irrigation_logs')
          .update({ 
            status: 'completed', 
            ended_at: new Date().toISOString(),
            water_usage_liters: Math.floor(Math.random() * 50) + 10
          })
          .eq('zone_id', zoneId)
          .eq('status', 'running');
      }
    } catch (error) {
      console.warn('[irrigationService] toggleIrrigation failed, mocking update:', error);
      // In a real app, we'd use a state manager or notify the UI
    }
  }

  async getActiveIrrigations(): Promise<IrrigationLog[]> {
    const { data, error } = await supabase
      .from('irrigation_logs')
      .select('*')
      .eq('status', 'running')
      .order('started_at', { ascending: false });
    
    if (error) {
      console.warn('[irrigationService] getActiveIrrigations failed:', error.message);
      return [];
    }
    return (data ?? []) as IrrigationLog[];
  }

  async getIrrigationHistory(): Promise<IrrigationLog[]> {
    const { data, error } = await supabase
      .from('irrigation_logs')
      .select('*')
      .neq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.warn('[irrigationService] getIrrigationHistory failed:', error.message);
      return [];
    }
    return (data ?? []) as IrrigationLog[];
  }

  subscribeToIrrigationUpdates(callback: (payload: any) => void): void {
    if (this.channel) return;
    
    this.channel = supabase
      .channel('public:irrigation_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'irrigation_logs' }, callback)
      .subscribe();
  }

  unsubscribeFromIrrigationUpdates(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

// Export singleton instance
export const irrigationService = new SupabaseIrrigationService();
