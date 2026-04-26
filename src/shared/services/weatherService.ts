import type { WeatherData } from '@/shared/types/global.types';
import { mockWeather } from '@/shared/lib/mockData';

export async function fetchWeather(lat?: number, lon?: number): Promise<WeatherData> {
  if (!lat || !lon) return mockWeather;
  
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) return mockWeather;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );
    if (!res.ok) throw new Error('Failed to fetch weather');
    
    const data = await res.json();
    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: '🌤️', // simple mapping or default
      pop: data.pop ? Math.round(data.pop * 100) : 0,
      wind_speed: data.wind.speed,
      forecast: []
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return mockWeather;
  }
}
