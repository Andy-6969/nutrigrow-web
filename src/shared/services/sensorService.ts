import { supabase } from '@/shared/lib/supabase';
import type { Zone, SensorData, Device } from '@/shared/types/global.types';
import { mockZones, mockSensorData, mockDevices, mockSensorHistory } from '@/shared/lib/mockData';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type SensorHistoryPoint = {
  time: string;
  soil_moisture: number;
  temperature: number;
  humidity: number;
  ph: number;
  tds?: number; // TDS / EC Nutrisi dalam mS/cm
};

type SupabasePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

export interface ISensorService {
  getZones(): Promise<Zone[]>;
  getSensorData(zoneId: string): Promise<SensorData>;
  getAllSensorData(): Promise<Record<string, SensorData>>;
  getSensorHistory(zoneId: string, range?: string): Promise<SensorHistoryPoint[]>;
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

  /** Ambil tren sensor berdasarkan range ('24h', '7d', '30d') untuk satu zona */
  async getSensorHistory(zoneId: string, range: string = '24h'): Promise<SensorHistoryPoint[]> {
    try {
      // 1. Coba panggil RPC get_sensor_history baru
      const { data, error } = await supabase.rpc('get_sensor_history', { 
        p_zone_id: zoneId,
        p_range: range
      });
      
      if (!error && data && data.length > 0) {
        return (data as Array<Record<string, unknown>>).map(row => ({
          time:          String(row.time_label ?? row.time ?? ''),
          soil_moisture: Number(row.soil_moisture ?? 0),
          temperature:   Number(row.temperature   ?? 0),
          humidity:      Number(row.humidity      ?? 0),
          ph:            Number(row.ph            ?? 0),
          tds:           row.tds != null ? Number(row.tds) : undefined,
        }));
      }

      // 2. Jika range 24h, coba RPC get_sensor_history_24h lama
      if (range === '24h') {
        const { data: oldData, error: oldError } = await supabase.rpc('get_sensor_history_24h', { p_zone_id: zoneId });
        if (!oldError && oldData && oldData.length > 0) {
          return (oldData as Array<Record<string, unknown>>).map(row => ({
            time:          String(row.time_label ?? row.time ?? ''),
            soil_moisture: Number(row.soil_moisture ?? 0),
            temperature:   Number(row.temperature   ?? 0),
            humidity:      Number(row.humidity      ?? 0),
            ph:            Number(row.ph            ?? 0),
            tds:           row.tds != null ? Number(row.tds) : undefined,
          }));
        }
      }
      
      // 3. Fallback: Query tabel sensor_data langsung dan agregasi di memory
      let limitDays = 1;
      if (range === '7d') limitDays = 7;
      if (range === '30d') limitDays = 30;
      
      const startDate = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: tableData, error: tableError } = await supabase
        .from('sensor_data')
        .select('soil_moisture, temperature, humidity, ph, tds, recorded_at')
        .eq('zone_id', zoneId)
        .gte('recorded_at', startDate)
        .order('recorded_at', { ascending: true });
        
      if (tableError) throw tableError;
      
      if (!tableData || tableData.length === 0) {
        return this.getMockHistoryForRange(range);
      }
      
      return this.aggregateSensorData(tableData, range);
    } catch (error) {
      console.warn(`[sensorService] getSensorHistory failed for range ${range}, using mock data:`, error);
      return this.getMockHistoryForRange(range);
    }
  }

  private getMockHistoryForRange(range: string): SensorHistoryPoint[] {
    if (range === '7d') {
      return Array.from({ length: 28 }, (_, i) => {
        const d = new Date(Date.now() - (27 - i) * 6 * 60 * 60 * 1000);
        const dayStr = String(d.getDate()).padStart(2, '0');
        const monthStr = String(d.getMonth() + 1).padStart(2, '0');
        const hourStr = String(d.getHours()).padStart(2, '0');
        return {
          time: `${dayStr}/${monthStr} ${hourStr}:00`,
          soil_moisture: 50 + Math.sin(i * 0.4) * 12 + Math.random() * 4,
          temperature: 25 + Math.sin(i * 0.2) * 5 + Math.random() * 1.5,
          humidity: 65 + Math.cos(i * 0.3) * 10 + Math.random() * 2.5,
          ph: 6.2 + Math.sin(i * 0.15) * 0.5 + Math.random() * 0.15,
          tds: 1.5 + Math.sin(i * 0.1) * 0.4 + Math.random() * 0.1,
        };
      });
    } else if (range === '30d') {
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
        const dayStr = String(d.getDate()).padStart(2, '0');
        const monthStr = String(d.getMonth() + 1).padStart(2, '0');
        return {
          time: `${dayStr}/${monthStr}`,
          soil_moisture: 52 + Math.sin(i * 0.3) * 10 + Math.random() * 3,
          temperature: 26 + Math.sin(i * 0.15) * 4 + Math.random() * 1,
          humidity: 68 + Math.cos(i * 0.25) * 8 + Math.random() * 2,
          ph: 6.3 + Math.sin(i * 0.1) * 0.4 + Math.random() * 0.1,
          tds: 1.6 + Math.sin(i * 0.08) * 0.3 + Math.random() * 0.08,
        };
      });
    } else { // 24h
      return Array.from({ length: 48 }, (_, i) => {
        const d = new Date(Date.now() - (47 - i) * 30 * 60 * 1000);
        const hourStr = String(d.getHours()).padStart(2, '0');
        const minStr = String(d.getMinutes() < 30 ? '00' : '30');
        return {
          time: `${hourStr}:${minStr}`,
          soil_moisture: 45 + Math.sin(i * 0.3) * 15 + Math.random() * 5,
          temperature: 26 + Math.sin(i * 0.15) * 6 + Math.random() * 2,
          humidity: 60 + Math.cos(i * 0.2) * 15 + Math.random() * 3,
          ph: 6.5 + Math.sin(i * 0.1) * 0.8 + Math.random() * 0.2,
          tds: 1.4 + Math.sin(i * 0.05) * 0.4 + Math.random() * 0.1,
        };
      });
    }
  }

  private aggregateSensorData(rawData: any[], range: string): SensorHistoryPoint[] {
    const buckets: Record<string, {
      soil_moisture: number[];
      temperature: number[];
      humidity: number[];
      ph: number[];
      tds: number[];
      timestamp: number;
    }> = {};

    rawData.forEach(row => {
      const date = new Date(row.recorded_at);
      let key = '';
      let timestamp = date.getTime();

      if (range === '7d') {
        // Group by 6 hours: e.g. "24/05 06:00"
        const hour = Math.floor(date.getHours() / 6) * 6;
        const dayStr = String(date.getDate()).padStart(2, '0');
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        key = `${dayStr}/${monthStr} ${String(hour).padStart(2, '0')}:00`;
        
        const groupedDate = new Date(date);
        groupedDate.setHours(hour, 0, 0, 0);
        timestamp = groupedDate.getTime();
      } else if (range === '30d') {
        // Group by day: e.g. "24/05"
        const dayStr = String(date.getDate()).padStart(2, '0');
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        key = `${dayStr}/${monthStr}`;
        
        const groupedDate = new Date(date);
        groupedDate.setHours(0, 0, 0, 0);
        timestamp = groupedDate.getTime();
      } else {
        // Default 24h: Group by 30 minutes: e.g. "14:30"
        const minutes = date.getMinutes() < 30 ? 0 : 30;
        key = `${String(date.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
        const groupedDate = new Date(date);
        groupedDate.setMinutes(minutes, 0, 0);
        timestamp = groupedDate.getTime();
      }

      if (!buckets[key]) {
        buckets[key] = {
          soil_moisture: [],
          temperature: [],
          humidity: [],
          ph: [],
          tds: [],
          timestamp
        };
      }

      buckets[key].soil_moisture.push(Number(row.soil_moisture ?? 0));
      buckets[key].temperature.push(Number(row.temperature ?? 0));
      buckets[key].humidity.push(Number(row.humidity ?? 0));
      buckets[key].ph.push(Number(row.ph ?? 7.0));
      if (row.tds != null) {
        buckets[key].tds.push(Number(row.tds));
      }
    });

    const average = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    return Object.entries(buckets)
      .map(([key, data]) => ({
        time: key,
        soil_moisture: Number(average(data.soil_moisture).toFixed(1)),
        temperature: Number(average(data.temperature).toFixed(1)),
        humidity: Number(average(data.humidity).toFixed(1)),
        ph: Number(average(data.ph).toFixed(2)),
        tds: data.tds.length > 0 ? Number(average(data.tds).toFixed(3)) : undefined,
        timestamp: data.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(({ timestamp, ...rest }) => rest);
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
