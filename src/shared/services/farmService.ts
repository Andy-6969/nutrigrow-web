// src/shared/services/farmService.ts
import { supabase } from '@/shared/lib/supabase';
import type { Farm, Zone } from '@/shared/types/global.types';

// ─── Mock fallback (jika tabel farms belum ada di Supabase) ──────────
const MOCK_FARMS: Farm[] = [
  {
    id: 'f1',
    name: 'Lahan Pertanian Bitanic',
    description: 'Lahan utama untuk produksi sayuran dan padi organik dengan sistem fertigasi otomatis.',
    location_address: 'Desa Sukamaju, Cirebon, Jawa Barat',
    location_lat: -6.8150,
    location_lng: 107.6150,
    total_area_ha: 5.3,
    owner_name: 'Bitanic Agritech',
    created_at: '2025-01-01T00:00:00Z',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function isMockMode(): boolean {
  // Coba deteksi apakah tabel farms tersedia; kalau tidak, pakai mock
  return typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FARM_MOCK === 'true';
}

// ─── CRUD Operations ─────────────────────────────────────────────────

export const farmService = {
  /** Fetch semua lahan dari Supabase, fallback ke mock jika error */
  async getFarms(): Promise<Farm[]> {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[farmService] getFarms error — using mock:', error.message);
        return MOCK_FARMS;
      }
      return (data as Farm[]) ?? MOCK_FARMS;
    } catch {
      return MOCK_FARMS;
    }
  },

  /** Fetch satu lahan by ID */
  async getFarmById(id: string): Promise<Farm | null> {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return MOCK_FARMS.find(f => f.id === id) ?? null;
      return data as Farm;
    } catch {
      return MOCK_FARMS.find(f => f.id === id) ?? null;
    }
  },

  /** Fetch zona berdasarkan farm_id */
  async getZonesByFarm(farmId: string): Promise<Zone[]> {
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('farm_id', farmId)
        .order('name');
      if (error) throw error;
      return (data as Zone[]) ?? [];
    } catch {
      // Fallback: import mock zones dan filter
      const { mockZones } = await import('@/shared/lib/mockData');
      return mockZones.filter(z => z.farm_id === farmId);
    }
  },

  /** Buat lahan baru */
  async createFarm(payload: Omit<Farm, 'id' | 'created_at'>): Promise<{ data: Farm | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('farms')
        .insert([payload])
        .select()
        .single();
      if (error) return { data: null, error: error.message };
      return { data: data as Farm, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  },

  /** Update lahan */
  async updateFarm(id: string, payload: Partial<Omit<Farm, 'id' | 'created_at'>>): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('farms')
        .update(payload)
        .eq('id', id);
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },

  /** Hapus lahan (zona di-cascade delete di DB) */
  async deleteFarm(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', id);
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: String(err) };
    }
  },
};
