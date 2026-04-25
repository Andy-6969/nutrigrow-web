import { supabase } from '@/shared/lib/supabase';
import type { Zone, SensorData, Device } from '@/shared/types/global.types';
import { mockZones, mockSensorData, mockDevices } from '@/shared/lib/mockData';

export interface ISensorService {
  getZones(): Promise<Zone[]>;
  getSensorData(zoneId: string): Promise<SensorData>;
  getAllSensorData(): Promise<Record<string, SensorData>>;
  getDevices(): Promise<Device[]>;
  subscribeToSensorUpdates(callback: (payload: any) => void): void;
  unsubscribeFromSensorUpdates(): void;
  subscribeToZoneUpdates(callback: (payload: any) => void): void;
  unsubscribeFromZoneUpdates(): void;
}

export class SupabaseSensorService implements ISensorService {
  private sensorChannel: any = null;
  private zoneChannel: any = null;

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
    } catch (error: any) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) {
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

  subscribeToSensorUpdates(callback: (payload: any) => void): void {
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

  subscribeToZoneUpdates(callback: (payload: any) => void): void {
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
