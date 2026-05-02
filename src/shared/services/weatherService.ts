import { supabase } from '@/shared/lib/supabase';
import type { WeatherData, WeatherForecast, WeeklyForecastDay } from '@/shared/types/global.types';
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

// ─── Mapping WMO Weather Code → emoji & deskripsi Indonesia ──
function wmoToWeather(code: number): { icon: string; desc: string } {
  if (code === 0)               return { icon: '☀️', desc: 'Cerah' };
  if (code <= 2)                return { icon: '⛅', desc: 'Berawan Sebagian' };
  if (code === 3)               return { icon: '☁️', desc: 'Berawan' };
  if (code <= 48)               return { icon: '🌫️', desc: 'Berkabut' };
  if (code <= 55)               return { icon: '🌦️', desc: 'Gerimis' };
  if (code <= 57)               return { icon: '🌧️', desc: 'Gerimis Beku' };
  if (code <= 65)               return { icon: '🌧️', desc: 'Hujan' };
  if (code <= 67)               return { icon: '🌧️', desc: 'Hujan Beku' };
  if (code <= 77)               return { icon: '❄️', desc: 'Salju' };
  if (code <= 82)               return { icon: '🌧️', desc: 'Hujan Lebat' };
  if (code <= 86)               return { icon: '❄️', desc: 'Salju Lebat' };
  if (code === 95)              return { icon: '⛈️', desc: 'Hujan Petir' };
  if (code <= 99)               return { icon: '⛈️', desc: 'Hujan Petir + Es' };
  return { icon: '🌤️', desc: 'Cerah' };
}

// ─── Nama hari bahasa Indonesia ───────────────────────────
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// ─── Interface raw_data JSON dari VPS/BMKG ────────────────
interface BMKGRawData {
  lokasi?: {
    provinsi?: string;
    kotkab?: string;
    kecamatan?: string;
    desa?: string;
  };
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
    tp?: number;
  }>;
  akan_hujan?: boolean;
  rekomendasi_siram?: boolean;
  updated_at?: string;
  // Open-Meteo 7-day forecast (injected by VPS)
  weekly_forecast?: Array<{
    date?: string;
    weathercode?: number;
    temperature_2m_max?: number;
    temperature_2m_min?: number;
    precipitation_sum?: number;
    precipitation_probability_max?: number;
  }>;
}

/**
 * Ambil data cuaca terbaru dari tabel weather_data Supabase.
 * Data ini diisi oleh VPS setiap 3 jam dari API BMKG + Open-Meteo.
 * Fallback ke mock data jika gagal.
 */
export async function fetchWeather(): Promise<WeatherData> {
  try {
    const { data, error } = await supabase
      .from('weather_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) throw error ?? new Error('No weather data');

    // Parse raw_data JSON
    let raw: BMKGRawData = {};
    try {
      raw = typeof data.raw_data === 'string' ? JSON.parse(data.raw_data) : (data.raw_data ?? {});
    } catch { /* raw_data parse failed, use column values */ }

    const cuacaDesc = data.cuaca ?? raw.cuaca_sekarang?.cuaca ?? 'Cerah';
    const willRain  = data.akan_hujan ?? raw.akan_hujan ?? false;
    const rekSiram  = data.rekomendasi_siram ?? raw.rekomendasi_siram ?? !willRain;

    // Bangun string lokasi
    const lokasiParts = [
      raw.lokasi?.desa ?? data.desa,
      raw.lokasi?.kecamatan ?? data.kecamatan,
    ].filter(Boolean);
    const lokasi = lokasiParts.length > 0 ? lokasiParts.join(', ') : 'Tidak diketahui';

    // Map prakiraan_6jam ke WeatherForecast[]
    const forecast: WeatherForecast[] = (raw.prakiraan_6jam ?? []).map((f, i) => ({
      dt:          f.waktu ? new Date(f.waktu).getTime() : Date.now() + (i + 1) * 3600000,
      temp:        f.suhu ?? data.suhu ?? 0,
      humidity:    f.kelembaban ?? data.kelembaban ?? 0,
      pop:         f.tp ?? (willRain ? 75 : 10),
      description: f.cuaca ?? cuacaDesc,
      icon:        weatherIcon(f.cuaca ?? cuacaDesc),
    }));

    // Map weekly_forecast dari Open-Meteo (via VPS)
    const weekly_forecast: WeeklyForecastDay[] = (raw.weekly_forecast ?? []).map(day => {
      const wmo = wmoToWeather(day.weathercode ?? 0);
      const dateObj = day.date ? new Date(day.date + 'T00:00:00') : new Date();
      return {
        date:                       day.date ?? '',
        day_name:                   HARI[dateObj.getDay()] ?? '?',
        temp_max:                   day.temperature_2m_max ?? 0,
        temp_min:                   day.temperature_2m_min ?? 0,
        precipitation_probability:  day.precipitation_probability_max ?? 0,
        precipitation_sum:          day.precipitation_sum ?? 0,
        weather_code:               day.weathercode ?? 0,
        icon:                       wmo.icon,
        description:                wmo.desc,
      };
    });

    return {
      temperature:       data.suhu ?? raw.cuaca_sekarang?.suhu ?? 0,
      humidity:          data.kelembaban ?? raw.cuaca_sekarang?.kelembaban ?? 0,
      description:       cuacaDesc,
      icon:              weatherIcon(cuacaDesc),
      pop:               willRain ? 80 : 10,
      wind_speed:        raw.cuaca_sekarang?.angin_kecepatan ?? 0,
      forecast,
      akan_hujan:        willRain,
      rekomendasi_siram: rekSiram,
      last_update:       data.created_at ?? new Date().toISOString(),
      lokasi,
      weekly_forecast,
    };
  } catch (err) {
    console.warn('[weatherService] Failed to fetch from Supabase, using mock:', err);
    return mockWeather;
  }
}
