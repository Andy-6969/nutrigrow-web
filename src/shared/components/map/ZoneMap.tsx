'use client';

import { useEffect, useRef, useState } from 'react';
import { Map } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Zone, SensorData } from '@/shared/types/global.types';
import { ZONE_STATUS } from '@/shared/lib/constants';
import { cn } from '@/shared/lib/utils';

// Token placeholder - User should replace this in .env.local
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const IS_DUMMY_TOKEN = !MAPBOX_TOKEN || MAPBOX_TOKEN.includes('dummy');

mapboxgl.accessToken = MAPBOX_TOKEN;

interface ZoneMapProps {
  zones: Zone[];
  sensorData: Record<string, SensorData>;
  className?: string;
}

export default function ZoneMap({ zones, sensorData, className }: ZoneMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(IS_DUMMY_TOKEN ? 'TOKEN_MISSING' : null);
  const markers = useRef<Record<string, mapboxgl.Marker>>({});

  useEffect(() => {
    if (!mapContainer.current || map.current || IS_DUMMY_TOKEN) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Futuristic dark style
        center: [107.6150, -6.8167], // Lembang, Indonesia
        zoom: 15,
        pitch: 45, // Tilt for 3D effect
        bearing: -17,
        antialias: true,
        failIfMajorPerformanceCaveat: false
      });

      map.current.on('load', () => {
        setIsLoaded(true);
        setError(null);
        
        // Add a glow effect to the map
        if (map.current) {
          map.current.setFog({
            range: [0.5, 10],
            color: '#111827',
            'horizon-blend': 0.1
          });
        }
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('MAP_ERROR');
      });
    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('INIT_ERROR');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when zones or sensor data change
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers that are no longer in zones
    const currentZoneIds = new Set(zones.map(z => z.id));
    Object.keys(markers.current).forEach(id => {
      if (!currentZoneIds.has(id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    // Add or update markers
    zones.forEach(zone => {
      if (!zone.latitude || !zone.longitude) return;

      const sensor = sensorData[zone.id];
      const status = ZONE_STATUS[zone.status as keyof typeof ZONE_STATUS] || ZONE_STATUS.idle;
      
      // Create custom marker element
      const el = document.createElement('div');
      el.className = cn(
        'relative w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all duration-300',
        zone.status === 'irrigating' ? 'animate-pulse-glow' : ''
      );
      el.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      el.style.border = `2px solid ${status.color}`;
      el.style.boxShadow = `0 0 15px ${status.color}80`;

      el.innerHTML = `
        <div class="text-lg">${status.icon}</div>
        <div class="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[10px] whitespace-nowrap text-white font-medium z-10 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="font-bold">${zone.name}</div>
          <div class="flex items-center gap-1">
            <span style="color: ${status.color}">●</span> ${status.key} • ${sensor?.soil_moisture ?? 0}% 💧
          </div>
        </div>
      `;

      // Hover effect to show info
      el.addEventListener('mouseenter', () => {
        const info = el.querySelector('div:last-child') as HTMLElement;
        if (info) info.style.opacity = '1';
      });
      el.addEventListener('mouseleave', () => {
        const info = el.querySelector('div:last-child') as HTMLElement;
        if (info) info.style.opacity = '0';
      });

      if (markers.current[zone.id]) {
        markers.current[zone.id].setLngLat([zone.longitude, zone.latitude]);
      } else {
        const marker = new mapboxgl.Marker(el)
          .setLngLat([zone.longitude, zone.latitude])
          .addTo(map.current!);
        markers.current[zone.id] = marker;
      }
    });
  }, [zones, sensorData, isLoaded]);

  return (
    <div className={cn('relative rounded-2xl overflow-hidden border border-white/10 glass bg-slate-900/50', className)}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
      
      {/* Fallback UI when token is missing or error occurs */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 backdrop-blur-sm z-20">
          <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mb-4 border border-primary-500/30">
            <Map className="w-8 h-8 text-primary-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {error === 'TOKEN_MISSING' ? 'Mapbox Token Diperlukan' : 'Gagal Memuat Peta'}
          </h3>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {error === 'TOKEN_MISSING' 
              ? 'Untuk mengaktifkan peta futuristik ini, silakan masukkan Mapbox Access Token Anda di file .env.local.' 
              : 'Terjadi kesalahan saat mencoba memuat Mapbox. Pastikan token Anda valid dan koneksi internet stabil.'}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <a 
              href="https://account.mapbox.com/access-tokens/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-primary-500/20"
            >
              Dapatkan Token Mapbox
            </a>
            <div className="text-[10px] font-mono text-slate-500 bg-black/40 p-2 rounded border border-white/5">
              NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx...
            </div>
          </div>
        </div>
      )}

      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
        <div className="glass-sm px-3 py-2 rounded-lg border border-white/10 backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">System Status</div>
          <div className="text-xs font-mono text-primary-400 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            AGRI-TWIN LIVE MONITORING
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 pointer-events-none">
        <div className="glass-sm px-3 py-2 rounded-lg border border-white/10 backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-1">Legend</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(ZONE_STATUS).map(([key, status]) => (
              <div key={key} className="flex items-center gap-2 text-[10px] text-white/80">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></span>
                {status.key}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            <p className="text-sm font-mono text-primary-400 animate-pulse">INITIALIZING MAP SYSTEM...</p>
          </div>
        </div>
      )}
    </div>
  );
}
