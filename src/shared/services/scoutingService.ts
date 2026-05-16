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

const MAX_FILE_SIZE_MB = 10;

export const scoutingService = {
  async getLogs(farmId?: string): Promise<ScoutingLog[]> {
    try {
      console.log(`[scoutingService] Fetching logs. Filter farmId: ${farmId || 'NONE'}`);
      
      const { data, error } = await supabase
        .from('scouting_logs')
        .select(`
          *,
          zones ( name, farm_id ),
          user_profiles ( full_name )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[scoutingService] getLogs DB error:', error.code, error.message, error.details);
        return [];
      }

      console.log(`[scoutingService] Raw rows fetched: ${data?.length ?? 0}`);

      let logs = (data || []).map((row: any) => ({
        ...row,
        zone_name: row.zones?.name ?? 'Zona Tidak Diketahui',
        user_name: row.user_profiles?.full_name ?? 'Operator Lapangan',
      })) as ScoutingLog[];

      if (farmId) {
        const before = logs.length;
        logs = logs.filter(log => (log as any).zones?.farm_id === farmId);
        console.log(`[scoutingService] Farm filter ${farmId}: ${before} → ${logs.length}`);
      }

      return logs;
    } catch (err) {
      console.error('[scoutingService] getLogs exception:', err);
      return [];
    }
  },

  async createLog(payload: ScoutingPayload): Promise<{ error: string | null }> {
    try {
      // Ambil user yang sedang login jika user_id belum ada
      if (!payload.user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) payload.user_id = user.id;
      }

      console.log('[scoutingService] Creating log:', { zone_id: payload.zone_id, issue_type: payload.issue_type, has_photo: !!payload.photo_url });

      const { data, error } = await supabase
        .from('scouting_logs')
        .insert([{ ...payload, status: 'open' }])
        .select('id')
        .single();

      if (error) {
        console.error('[scoutingService] createLog error:', error.code, error.message, error.details);
        return { error: `${error.message} (code: ${error.code})` };
      }

      console.log('[scoutingService] Log created OK, id:', data?.id);
      return { error: null };
    } catch (err) {
      console.error('[scoutingService] createLog exception:', err);
      return { error: String(err) };
    }
  },

  async updateLogStatus(id: string, status: ScoutingStatus): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('scouting_logs')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('[scoutingService] updateLogStatus error:', error.message);
        return { error: error.message };
      }
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
   * Max 10 MB. Format: JPEG, PNG, WebP, HEIC.
   */
  async uploadPhoto(file: File): Promise<{ url: string | null; error: string | null }> {
    try {
      // Validasi ukuran file
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        return { url: null, error: `Ukuran file terlalu besar (${sizeMB.toFixed(1)} MB). Maksimal ${MAX_FILE_SIZE_MB} MB.` };
      }

      const fileExt  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      console.log(`[scoutingService] Uploading photo: ${filePath} (${sizeMB.toFixed(2)} MB)`);

      const { error: uploadError } = await supabase.storage
        .from('scouting_images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('[scoutingService] uploadPhoto error:', uploadError.message);
        return { url: null, error: uploadError.message };
      }

      const { data } = supabase.storage
        .from('scouting_images')
        .getPublicUrl(filePath);

      console.log('[scoutingService] Photo uploaded OK:', data.publicUrl);
      return { url: data.publicUrl, error: null };
    } catch (err) {
      console.error('[scoutingService] uploadPhoto exception:', err);
      return { url: null, error: String(err) };
    }
  },
};
