// src/shared/services/zoneService.ts
import { supabase } from '@/shared/lib/supabase';
import type { Zone, ZoneStatus } from '@/shared/types/global.types';

export type ZonePayload = {
  farm_id: string;
  name: string;
  area_ha: number;
  crop_type: string;
  status: ZoneStatus;
  planting_date?: string;
  plant_count?: number;
  recipe_id?: string | null;
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

      // If columns don't exist yet (migration pending), retry without them
      if (error && (error.message.includes('plant_count') || error.message.includes('planting_date') || error.message.includes('recipe_id') || error.message.includes('schema'))) {
        const { planting_date, plant_count, recipe_id, ...safePayload } = payload;
        const { data: d2, error: e2 } = await supabase
          .from('zones')
          .insert([safePayload])
          .select()
          .single();
        if (e2) return { data: null, error: e2.message };
        return { data: d2 as Zone, error: null };
      }

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

      // If columns don't exist yet (migration pending), retry without them
      if (error && (error.message.includes('plant_count') || error.message.includes('planting_date') || error.message.includes('recipe_id') || error.message.includes('schema'))) {
        const { planting_date, plant_count, recipe_id, ...safePayload } = payload as any;
        const { error: e2 } = await supabase
          .from('zones')
          .update(safePayload)
          .eq('id', id);
        if (e2) return { error: e2.message };
        return { error: null };
      }

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
