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
          zones ( name, farm_id )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[scoutingService] getLogs DB error:', JSON.stringify(error));
        // Fallback to absolute simple select if zones table fails
        const { data: simple, error: err2 } = await supabase
          .from('scouting_logs')
          .select('*')
          .order('created_at', { ascending: false });
        if (err2) {
          console.error('[scoutingService] getLogs fallback error:', JSON.stringify(err2));
          return [];
        }
        return (simple || []).map((row: any) => ({
          ...row,
          zone_name: row.zone_id,
          user_name: 'Operator',
        })) as ScoutingLog[];
      }

      // Fetch user profiles in a separate query to avoid missing foreign key relation issues
      const userIds = Array.from(new Set((data || []).map((row: any) => row.user_id).filter(Boolean)));
      const userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, nama')
          .in('id', userIds);
        if (profiles) {
          profiles.forEach((p: any) => {
            userMap[p.id] = p.nama;
          });
        }
      }

      console.log(`[scoutingService] Raw rows fetched: ${data?.length ?? 0}`);

      let logs = (data || []).map((row: any) => ({
        ...row,
        zone_name: row.zones?.name ?? 'Zona Tidak Diketahui',
        user_name: userMap[row.user_id] ?? 'Operator Lapangan',
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

      // Sanitasi payload: hapus field string kosong agar tidak konflik dgn DB constraint
      const cleanPayload: Record<string, any> = {
        zone_id:    payload.zone_id,
        issue_type: payload.issue_type,
        severity:   payload.severity,
        notes:      payload.notes,
        status:     'open',
        user_id:    payload.user_id,
      };
      if (payload.photo_url && payload.photo_url.trim() !== '') {
        cleanPayload.photo_url = payload.photo_url;
      }

      console.log('[scoutingService] Creating log:', cleanPayload);

      const { data, error } = await supabase
        .from('scouting_logs')
        .insert([cleanPayload])
        .select('id')
        .single();

      if (error) {
        console.error('[scoutingService] createLog error:', JSON.stringify(error));
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
