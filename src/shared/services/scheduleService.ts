import { supabase } from '@/shared/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Schedule } from '@/shared/types/global.types';

export interface IScheduleService {
  getSchedules(): Promise<Schedule[]>;
  createSchedule(data: Omit<Schedule, 'id' | 'zone_name' | 'created_at' | 'updated_at'>): Promise<Schedule>;
  updateSchedule(id: string, data: Partial<Omit<Schedule, 'id' | 'zone_name' | 'created_at' | 'updated_at'>>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;
  toggleScheduleStatus(id: string, isActive: boolean): Promise<void>;
  subscribeToSchedules(callback: (payload: unknown) => void): void;
  unsubscribeFromSchedules(): void;
}

export class SupabaseScheduleService implements IScheduleService {
  private channel: RealtimeChannel | null = null;

  async getSchedules(): Promise<Schedule[]> {
    const { data, error } = await supabase
      .from('schedules')
      .select('*, zones(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[scheduleService] getSchedules failed:', error.message);
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      zone_name: (row.zones as { name?: string })?.name ?? `Zone ${row.zone_id}`
    })) as Schedule[];
  }

  async createSchedule(data: Omit<Schedule, 'id' | 'zone_name' | 'created_at' | 'updated_at'>): Promise<Schedule> {
    const { data: created, error } = await supabase
      .from('schedules')
      .insert([data])
      .select('*, zones(name)')
      .single();

    if (error) throw error;
    
    return {
      ...created,
      zone_name: created.zones?.name ?? `Zone ${created.zone_id}`
    } as Schedule;
  }

  async updateSchedule(id: string, data: Partial<Omit<Schedule, 'id' | 'zone_name' | 'created_at' | 'updated_at'>>): Promise<Schedule> {
    const { data: updated, error } = await supabase
      .from('schedules')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, zones(name)')
      .single();

    if (error) throw error;
    
    return {
      ...updated,
      zone_name: updated.zones?.name ?? `Zone ${updated.zone_id}`
    } as Schedule;
  }

  async deleteSchedule(id: string): Promise<void> {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async toggleScheduleStatus(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('schedules')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  subscribeToSchedules(callback: (payload: unknown) => void): void {
    if (this.channel) return;
    
    this.channel = supabase
      .channel('public:schedules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, callback)
      .subscribe();
  }

  unsubscribeFromSchedules(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export const scheduleService = new SupabaseScheduleService();
