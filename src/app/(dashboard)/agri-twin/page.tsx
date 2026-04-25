'use client';

import { useState, useEffect } from 'react';
import { Map, Maximize2, ZoomIn, ZoomOut, Layers, Info } from 'lucide-react';
import { mockZones, mockSensorData } from '@/shared/lib/mockData';
import { cn } from '@/shared/lib/utils';
import { ZONE_STATUS } from '@/shared/lib/constants';
import { sensorService } from '@/shared/services/sensorService';
import type { Zone, SensorData } from '@/shared/types/global.types';

// Zone positions on the virtual farm map (percentage-based layout)
const zonePositions: Record<string, { x: number; y: number; w: number; h: number }> = {
  z1: { x: 3,  y: 3,  w: 46, h: 40 },
  z2: { x: 53, y: 3,  w: 44, h: 32 },
  z3: { x: 3,  y: 48, w: 35, h: 48 },
  z4: { x: 41, y: 48, w: 18, h: 22 },
  z5: { x: 63, y: 40, w: 34, h: 56 },
};

function ZoneBlock({ zone, sensor, position, isSelected, onClick }: {
  zone: Zone;
  sensor: SensorData;
  position: typeof zonePositions['z1'];
  isSelected: boolean;
  onClick: () => void;
}) {
  const status = ZONE_STATUS[zone.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute rounded-2xl border-2 transition-all duration-300 overflow-hidden group',
        'hover:scale-[1.02] hover:z-10',
        isSelected && 'z-20 ring-2 ring-offset-2 ring-primary-400',
        zone.status === 'irrigating' && 'animate-pulse-glow',
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${position.w}%`,
        height: `${position.h}%`,
        borderColor: status.color,
        background: `linear-gradient(135deg, ${status.color}15, ${status.color}08)`,
      }}
    >
      {/* Water flow animation for irrigating zones */}
      {zone.status === 'irrigating' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-20" style={{
            background: `repeating-linear-gradient(90deg, transparent, transparent 10px, ${status.color}40 10px, ${status.color}40 20px)`,
            animation: 'waterFlow 2s linear infinite',
          }} />
        </div>
      )}

      <div className="relative z-10 p-3 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-left" style={{ color: 'var(--surface-text)' }}>
              {zone.name.split(' - ')[1] || zone.name}
            </p>
            <p className="text-[10px] text-left" style={{ color: 'var(--surface-text-muted)' }}>
              {zone.crop_type} • {zone.area_ha} ha
            </p>
          </div>
          <span className="text-lg">{status.icon}</span>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div className="flex gap-2">
            <div className="glass-sm px-1.5 py-0.5 text-[10px] font-mono font-bold" style={{ color: 'var(--surface-text)' }}>
              💧 {sensor.soil_moisture}%
            </div>
            <div className="glass-sm px-1.5 py-0.5 text-[10px] font-mono font-bold hidden sm:block" style={{ color: 'var(--surface-text)' }}>
              🌡️ {sensor.temperature}°C
            </div>
          </div>
          <span className={cn(
            'text-[9px] font-semibold px-2 py-0.5 rounded-full',
          )} style={{ backgroundColor: `${status.color}20`, color: status.color }}>
            {status.label}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function AgriTwinPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [sensorDataMap, setSensorDataMap] = useState<Record<string, SensorData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedZones = await sensorService.getZones();
        const fetchedSensors = await sensorService.getAllSensorData();
        setZones(fetchedZones);
        setSensorDataMap(fetchedSensors);
      } catch (error) {
        console.error("Error fetching Agri-Twin data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    // Subscribe to real-time updates
    sensorService.subscribeToSensorUpdates((payload) => {
      const newData = payload.new as SensorData;
      if (newData.zone_id) {
        setSensorDataMap(prev => ({
          ...prev,
          [newData.zone_id as string]: newData
        }));
      }
    });

    sensorService.subscribeToZoneUpdates((payload) => {
      const updatedZone = payload.new as Zone;
      setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z));
    });

    return () => {
      sensorService.unsubscribeFromSensorUpdates();
      sensorService.unsubscribeFromZoneUpdates();
    };
  }, []);

  const selected = selectedZone ? zones.find(z => z.id === selectedZone) : null;
  const selectedSensor = selectedZone ? sensorDataMap[selectedZone] : null;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Map className="w-5 h-5 text-primary-500" />
          Agri-Twin — Digital Twin Lahan
        </h2>
        <div className="flex items-center gap-2">
          <button className="p-2 glass-sm rounded-lg hover:bg-white/60 transition-all border border-white/10">
            <Maximize2 className="w-4 h-4" style={{ color: 'var(--surface-text-muted)' }} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Map/Schematic View */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="glass p-4 relative min-h-[600px] flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                  <p className="text-sm font-mono text-primary-400">LOADING DIGITAL TWIN...</p>
                </div>
              </div>
            ) : (
              <div className="relative flex-1 bg-black/5 rounded-2xl border-2 border-dashed border-primary-200/50 overflow-hidden">
                {/* Schematic blocks */}
                {zones.map(zone => (
                  <ZoneBlock
                    key={zone.id}
                    zone={zone}
                    sensor={sensorDataMap[zone.id] || { soil_moisture: 0, temperature: 0 }}
                    position={zonePositions[zone.id] || { x: 0, y: 0, w: 10, h: 10 }}
                    isSelected={selectedZone === zone.id}
                    onClick={() => setSelectedZone(zone.id)}
                  />
                ))}
              </div>
            )}

            {/* View Controls */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-2">
                <button className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-all border border-primary-100">
                  <ZoomIn className="w-5 h-5 text-primary-600" />
                </button>
                <button className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-all border border-primary-100">
                  <ZoomOut className="w-5 h-5 text-primary-600" />
                </button>
                <button className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-all border border-primary-100">
                  <Layers className="w-5 h-5 text-primary-600" />
                </button>
              </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {selected ? (
            <div className="glass p-5 animate-slide-in-right" style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-primary-500" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>Detail Zona</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-bold" style={{ color: 'var(--surface-text)' }}>{selected.name}</h4>
                  <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>{selected.crop_type} • {selected.area_ha} Hektar</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-sm p-3 rounded-xl border border-primary-100/50">
                    <p className="text-[10px] text-primary-600 font-bold uppercase mb-1">Kelembaban</p>
                    <p className="text-xl font-mono font-bold" style={{ color: 'var(--surface-text)' }}>{selectedSensor?.soil_moisture}%</p>
                  </div>
                  <div className="glass-sm p-3 rounded-xl border border-secondary-100/50">
                    <p className="text-[10px] text-secondary-600 font-bold uppercase mb-1">Suhu Tanah</p>
                    <p className="text-xl font-mono font-bold" style={{ color: 'var(--surface-text)' }}>{selectedSensor?.temperature}°C</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary-50/50 border border-primary-100">
                  <p className="text-[10px] text-primary-700 font-bold uppercase mb-2">Status Operasional</p>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{ZONE_STATUS[selected.status].icon}</div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>{ZONE_STATUS[selected.status].label}</p>
                      <p className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>Terakhir update: 2 menit yang lalu</p>
                    </div>
                  </div>
                </div>

                <button className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all active:scale-95">
                  Buka Monitoring Detail
                </button>
              </div>
            </div>
          ) : (
            <div className="glass p-8 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-300">
                <Map className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>Pilih Zona</p>
                <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>Klik pada area di peta untuk melihat detail sensor real-time</p>
              </div>
            </div>
          )}

          {/* Farm Statistics */}
          <div className="glass p-5">
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--surface-text)' }}>Ringkasan Lahan</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span style={{ color: 'var(--surface-text-muted)' }}>Total Area</span>
                <span className="font-bold" style={{ color: 'var(--surface-text)' }}>10.3 Ha</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span style={{ color: 'var(--surface-text-muted)' }}>Zona Aktif</span>
                <span className="font-bold text-primary-600">3 / 5</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span style={{ color: 'var(--surface-text-muted)' }}>Kesehatan Tanah</span>
                <span className="font-bold text-success-600">Optimal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
