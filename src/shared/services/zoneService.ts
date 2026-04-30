// src/shared/services/zoneService.ts
import { supabase } from '@/shared/lib/supabase';
import type { Zone, ZoneStatus } from '@/shared/types/global.types';

export type ZonePayload = {
  farm_id: string;
  name: string;
  area_ha: number;
  crop_type: string;
  status: ZoneStatus;
  latitude?: number;
  longitude?: number;
};

export const zoneService = {
  /** Buat zona baru */
  async createZone(payload: ZonePayload): Promise<{ data: Zone | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('zones')
        .insert([payload])
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: data as Zone, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  },

  /** Update zona */
  async updateZone(id: string, payload: Partial<Omit<ZonePayload, 'farm_id'>>): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('zones')
        .update(payload)
        .eq('id', id);
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  /** Hapus zona */
  async deleteZone(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('zones')
        .delete()
        .eq('id', id);
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },
};
