import { supabase } from '@/shared/lib/supabase';
import type { ScoutingLog, ScoutingIssueType, ScoutingSeverity, ScoutingStatus } from '@/shared/types/global.types';

export type ScoutingPayload = {
  zone_id: string;
  issue_type: ScoutingIssueType;
  severity: ScoutingSeverity;
  notes: string;
  photo_url?: string;
  user_id?: string;
};

export const scoutingService = {
  async getLogs(farmId?: string): Promise<ScoutingLog[]> {
    try {
      let query = supabase
        .from('scouting_logs')
        .select(`
          *,
          zones ( name, farm_id ),
          user_profiles ( full_name )
        `)
        .order('created_at', { ascending: false });

      if (farmId) {
        query = query.eq('zones.farm_id', farmId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        zone_name: row.zones?.name,
        user_name: row.user_profiles?.full_name || 'Operator Lapangan'
      })) as ScoutingLog[];
    } catch (error) {
      console.error('Error fetching scouting logs:', error);
      return [];
    }
  },

  async createLog(payload: ScoutingPayload): Promise<{ error: string | null }> {
    try {
      // If user_id is not provided, try to get the current auth user
      if (!payload.user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          payload.user_id = user.id;
        }
      }

      const { error } = await supabase
        .from('scouting_logs')
        .insert([{ ...payload, status: 'open' }]);

      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  async updateLogStatus(id: string, status: ScoutingStatus): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('scouting_logs')
        .update({ status })
        .eq('id', id);

      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  async deleteLog(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('scouting_logs')
        .delete()
        .eq('id', id);

      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  }
};
