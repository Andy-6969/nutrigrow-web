import { supabase } from '@/shared/lib/supabase';
import type { Zone, SensorData, Device, EcoSavingsData } from '@/shared/types/global.types';
import { mockZones, mockSensorData, mockDevices, mockSensorHistory, mockEcoSavings } from '@/shared/lib/mockData';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type SensorHistoryPoint = { time: string; soil_moisture: number; temperature: number; humidity: number; ph: number };

type SupabasePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

export interface ISensorService {
  getZones(): Promise<Zone[]>;
  getSensorData(zoneId: string): Promise<SensorData>;
  getAllSensorData(): Promise<Record<string, SensorData>>;
  getSensorHistory(zoneId: string): Promise<SensorHistoryPoint[]>;
  getEcoSavings(): Promise<EcoSavingsData>;
  getDevices(): Promise<Device[]>;
  subscribeToSensorUpdates(callback: (payload: SupabasePayload) => void): void;
  unsubscribeFromSensorUpdates(): void;
  subscribeToZoneUpdates(callback: (payload: SupabasePayload) => void): void;
  unsubscribeFromZoneUpdates(): void;
}

export class SupabaseSensorService implements ISensorService {
  private sensorChannel: ReturnType<typeof supabase.channel> | null = null;
  private zoneChannel:   ReturnType<typeof supabase.channel> | null = null;

  async getZones(): Promise<Zone[]> {
    try {
      const { data, error } = await supabase.from('zones').select('*');
      if (error) throw error;
      return (data ?? []) as Zone[];
    } catch (error) {
      console.warn('[sensorService] getZones failed, using mock data:', error);
      return mockZones;
    }
  }

  async getSensorData(zoneId: string): Promise<SensorData> {
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('zone_id', zoneId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as SensorData;
    } catch (error) {
      const e = error as { code?: string; message?: string };
      if (e.code === 'PGRST116' || e.message?.includes('not found')) {
        return mockSensorData[zoneId] || { soil_moisture: 0, temperature: 0, humidity: 0, ph: 0, recorded_at: new Date().toISOString() };
      }
      return mockSensorData[zoneId] || { soil_moisture: 0, temperature: 0, humidity: 0, ph: 0, recorded_at: new Date().toISOString() };
    }
  }

  async getAllSensorData(): Promise<Record<string, SensorData>> {
    const zones = await this.getZones();
    const result: Record<string, SensorData> = {};
    
    await Promise.all(
      zones.map(async (zone) => {
        try {
          const data = await this.getSensorData(zone.id);
          result[zone.id] = data;
        } catch (e) {
          console.error(`Failed to fetch sensor data for zone ${zone.id}`, e);
        }
      })
    );
    
    return result;
  }

  /** Ambil tren sensor 24 jam terakhir untuk satu zona — pakai RPC Supabase kalau ada */
  async getSensorHistory(zoneId: string): Promise<SensorHistoryPoint[]> {
    try {
      const { data, error } = await supabase.rpc('get_sensor_history_24h', { p_zone_id: zoneId });
      if (error || !data || data.length === 0) throw error ?? new Error('empty');
      return data as SensorHistoryPoint[];
    } catch {
      console.warn('[sensorService] getSensorHistory failed, using mock data');
      return mockSensorHistory;
    }
  }

  /** Ambil kalkulasi eco-savings dari RPC Supabase — fallback ke mock */
  async getEcoSavings(): Promise<EcoSavingsData> {
    try {
      const { data, error } = await supabase.rpc('get_eco_savings');
      if (error || !data) throw error ?? new Error('empty');
      return data as EcoSavingsData;
    } catch {
      console.warn('[sensorService] getEcoSavings failed, using mock data');
      return mockEcoSavings;
    }
  }

  async getDevices(): Promise<Device[]> {
    try {
      const { data, error } = await supabase.from('devices').select('*');
      if (error) throw error;
      return (data ?? []) as Device[];
    } catch (error) {
      console.warn('[sensorService] getDevices failed, using mock data:', error);
      return mockDevices;
    }
  }

  subscribeToSensorUpdates(callback: (payload: SupabasePayload) => void): void {
    if (this.sensorChannel) return;
    this.sensorChannel = supabase
      .channel('public:sensor_data')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_data' }, callback)
      .subscribe();
  }

  unsubscribeFromSensorUpdates(): void {
    if (this.sensorChannel) {
      supabase.removeChannel(this.sensorChannel);
      this.sensorChannel = null;
    }
  }

  subscribeToZoneUpdates(callback: (payload: SupabasePayload) => void): void {
    if (this.zoneChannel) return;
    this.zoneChannel = supabase
      .channel('public:zones')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zones' }, callback)
      .subscribe();
  }

  unsubscribeFromZoneUpdates(): void {
    if (this.zoneChannel) {
      supabase.removeChannel(this.zoneChannel);
      this.zoneChannel = null;
    }
  }
}

// Export singleton instance
export const sensorService = new SupabaseSensorService();
