import { supabase } from '@/shared/lib/supabase';
import type { WeatherData, WeatherForecast } from '@/shared/types/global.types';
import { mockWeather } from '@/shared/lib/mockData';

// ─── Mapping cuaca BMKG → emoji icon ──────────────────────
function weatherIcon(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('cerah') && d.includes('berawan')) return '⛅';
  if (d.includes('cerah'))    return '☀️';
  if (d.includes('berawan'))  return '☁️';
  if (d.includes('kabut'))    return '🌫️';
  if (d.includes('petir'))    return '⛈️';
  if (d.includes('lebat'))    return '🌧️';
  if (d.includes('sedang'))   return '🌦️';
  if (d.includes('hujan'))    return '🌧️';
  return '🌤️';
}

// ─── Interface raw_data JSON dari VPS/BMKG ────────────────
interface BMKGRawData {
  cuaca_sekarang?: {
    suhu?: number;
    kelembaban?: number;
    cuaca?: string;
    angin_kecepatan?: number;
  };
  prakiraan_6jam?: Array<{
    waktu?: string;
    cuaca?: string;
    suhu?: number;
    kelembaban?: number;
    tp?: number; // total precipitation
  }>;
  akan_hujan?: boolean;
}

/**
 * Ambil data cuaca terbaru dari tabel weather_data Supabase.
 * Data ini diisi oleh VPS setiap 3 jam dari API BMKG.
 * Fallback ke mock data jika gagal.
 */
export async function fetchWeather(): Promise<WeatherData> {
  try {
    // Ambil record terbaru dari tabel weather_data
    const { data, error } = await supabase
      .from('weather_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) throw error ?? new Error('No weather data');

    // Parse raw_data JSON untuk detail lengkap
    let raw: BMKGRawData = {};
    try {
      raw = typeof data.raw_data === 'string' ? JSON.parse(data.raw_data) : (data.raw_data ?? {});
    } catch { /* raw_data parse failed, use column values */ }

    const cuacaDesc = data.cuaca ?? raw.cuaca_sekarang?.cuaca ?? 'Cerah';
    const willRain  = data.akan_hujan ?? raw.akan_hujan ?? false;

    // Map prakiraan_6jam ke WeatherForecast[]
    const forecast: WeatherForecast[] = (raw.prakiraan_6jam ?? []).map((f, i) => ({
      dt:          f.waktu ? new Date(f.waktu).getTime() : Date.now() + (i + 1) * 3600000,
      temp:        f.suhu ?? data.suhu ?? 0,
      humidity:    f.kelembaban ?? data.kelembaban ?? 0,
      pop:         f.tp ?? (willRain ? 75 : 10),
      description: f.cuaca ?? cuacaDesc,
      icon:        weatherIcon(f.cuaca ?? cuacaDesc),
    }));

    return {
      temperature: data.suhu ?? raw.cuaca_sekarang?.suhu ?? 0,
      humidity:    data.kelembaban ?? raw.cuaca_sekarang?.kelembaban ?? 0,
      description: cuacaDesc,
      icon:        weatherIcon(cuacaDesc),
      pop:         willRain ? 80 : 10,
      wind_speed:  raw.cuaca_sekarang?.angin_kecepatan ?? 0,
      forecast,
    };
  } catch (err) {
    console.warn('[weatherService] Failed to fetch from Supabase, using mock:', err);
    return mockWeather;
  }
}
