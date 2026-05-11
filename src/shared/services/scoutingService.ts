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
  },

  /**
   * Upload foto ke bucket scouting_images di Supabase Storage.
   * @returns URL publik dari foto yang di-upload, atau null jika gagal.
   */
  async uploadPhoto(file: File): Promise<{ url: string | null; error: string | null }> {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('scouting_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) return { url: null, error: uploadError.message };

      const { data } = supabase.storage
        .from('scouting_images')
        .getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (err) {
      return { url: null, error: String(err) };
    }
  }
};
