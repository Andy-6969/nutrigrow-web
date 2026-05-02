'use client';

import { useState, useEffect, useRef } from 'react';
import { Map, Maximize2, Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { mockSensorData } from '@/shared/lib/mockData';
import { cn } from '@/shared/lib/utils';
import { ZONE_STATUS } from '@/shared/lib/constants';
import { sensorService } from '@/shared/services/sensorService';
import type { Zone, SensorData } from '@/shared/types/global.types';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

const waterFlowAnimation = {
  v: '5.7.4', fr: 30, ip: 0, op: 60, w: 200, h: 80, nm: 'WaterFlow',
  layers: [{
    ty: 4, nm: 'Wave', sr: 1,
    ks: {
      o: { a: 0, k: 40 },
      p: { a: 1, k: [{ t: 0, s: [0, 40, 0], e: [200, 40, 0], i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } }, { t: 60, s: [200, 40, 0] }] },
    },
    shapes: [
      { ty: 'el', s: { a: 0, k: [80, 25] }, p: { a: 0, k: [0, 0] }, nm: 'Ellipse' },
      { ty: 'fl', c: { a: 0, k: [0.2, 0.6, 1, 1] }, o: { a: 0, k: 60 }, nm: 'Fill' },
    ],
    ip: 0, op: 60,
  }],
};

type ZoneLayout = { x: number; y: number; w: number; h: number };

const RESIZE_DIRS = ['nw', 'ne', 'sw', 'se'] as const;
const MIN_W = 130, MIN_H = 90;

function ZoneBlock({
  zone, sensor, layout, isSelected,
  onClick, onLayoutChange,
}: {
  zone: Zone; sensor: SensorData; layout: ZoneLayout;
  isSelected: boolean; onClick: () => void;
  onLayoutChange: (l: ZoneLayout) => void;
}) {
  const status = ZONE_STATUS[zone.status as keyof typeof ZONE_STATUS] || ZONE_STATUS.idle;
  const isActive = zone.status === 'irrigating' || zone.status === 'fertigating';
  const isFertigating = zone.status === 'fertigating';

  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeStart = useRef<{ mx: number; my: number; ox: number; oy: number; ow: number; oh: number; dir: string } | null>(null);
  const layoutRef = useRef(layout);
  useEffect(() => { layoutRef.current = layout; }, [layout]);

  /* ── Drag handlers ── */
  const onDragDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.resizeHandle) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onClick();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: layoutRef.current.x, oy: layoutRef.current.y };
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    onLayoutChange({ ...layoutRef.current, x: Math.max(0, dragStart.current.ox + dx), y: Math.max(0, dragStart.current.oy + dy) });
  };
  const onDragUp = () => { dragStart.current = null; };

  /* ── Resize handlers ── */
  const onResizeDown = (e: React.PointerEvent, dir: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeStart.current = { mx: e.clientX, my: e.clientY, ox: layoutRef.current.x, oy: layoutRef.current.y, ow: layoutRef.current.w, oh: layoutRef.current.h, dir };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeStart.current) return;
    const { mx, my, ox, oy, ow, oh, dir } = resizeStart.current;
    const dx = e.clientX - mx, dy = e.clientY - my;
    let { x, y, w, h } = layoutRef.current;
    if (dir.includes('e')) w = Math.max(MIN_W, ow + dx);
    if (dir.includes('s')) h = Math.max(MIN_H, oh + dy);
    if (dir.includes('w')) { w = Math.max(MIN_W, ow - dx); x = ox + (ow - w); }
    if (dir.includes('n')) { h = Math.max(MIN_H, oh - dy); y = oy + (oh - h); }
    onLayoutChange({ x, y, w, h });
  };
  const onResizeUp = () => { resizeStart.current = null; };

  const cursorMap: Record<string, string> = { nw: 'nw-resize', ne: 'ne-resize', sw: 'sw-resize', se: 'se-resize' };

  return (
    <div
      className={cn('absolute rounded-2xl border-2 overflow-hidden group', isSelected && 'ring-2 ring-primary-400', isActive && 'animate-pulse-glow')}
      style={{ left: layout.x, top: layout.y, width: layout.w, height: layout.h, borderColor: status.color, background: `linear-gradient(135deg, ${status.color}15, ${status.color}08)`, cursor: 'grab', userSelect: 'none', zIndex: isSelected ? 20 : 10 }}
      onPointerDown={onDragDown}
      onPointerMove={onDragMove}
      onPointerUp={onDragUp}
    >
      {/* Lottie water overlay */}
      {isActive && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30" style={isFertigating ? { filter: 'hue-rotate(240deg) saturate(1.5)' } : undefined}>
          <Lottie animationData={waterFlowAnimation} loop autoplay style={{ width: '100%', height: '100%' }} rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }} />
        </div>
      )}
      {isActive && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-10" style={{ background: `repeating-linear-gradient(90deg, transparent, transparent 10px, ${status.color}40 10px, ${status.color}40 20px)`, animation: 'waterFlow 2s linear infinite' }} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-3 h-full flex flex-col justify-between pointer-events-none">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-left" style={{ color: 'var(--surface-text)' }}>{zone.name.split(' - ')[1] || zone.name}</p>
            <p className="text-[10px] text-left" style={{ color: 'var(--surface-text-muted)' }}>{zone.crop_type} • {zone.area_ha} ha</p>
          </div>
          <span className="text-lg">{status.icon}</span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          <div className="flex gap-2">
            <div className="glass-sm px-1.5 py-0.5 text-[10px] font-mono font-bold" style={{ color: 'var(--surface-text)' }}>💧 {sensor.soil_moisture}%</div>
            <div className="glass-sm px-1.5 py-0.5 text-[10px] font-mono font-bold hidden sm:block" style={{ color: 'var(--surface-text)' }}>🌡️ {sensor.temperature}°C</div>
          </div>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${status.color}20`, color: status.color }}>{status.label}</span>
        </div>
      </div>

      {/* Resize handles — only shown when selected */}
      {isSelected && RESIZE_DIRS.map(dir => (
        <div
          key={dir}
          data-resize-handle={dir}
          className="absolute w-3.5 h-3.5 bg-white border-2 border-primary-500 rounded-sm z-30"
          style={{
            top: dir.includes('n') ? -6 : 'auto', bottom: dir.includes('s') ? -6 : 'auto',
            left: dir.includes('w') ? -6 : 'auto', right: dir.includes('e') ? -6 : 'auto',
            cursor: cursorMap[dir],
          }}
          onPointerDown={(e) => onResizeDown(e, dir)}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
        />
      ))}
    </div>
  );
}

export default function AgriTwinPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [sensorDataMap, setSensorDataMap] = useState<Record<string, SensorData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [layouts, setLayouts] = useState<Record<string, ZoneLayout>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedZones = await sensorService.getZones();
        const fetchedSensors = await sensorService.getAllSensorData();
        setZones(fetchedZones);
        setSensorDataMap(fetchedSensors);
        // Init layouts in a 2-column grid
        const initLayouts: Record<string, ZoneLayout> = {};
        fetchedZones.forEach((z, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          initLayouts[z.id] = { x: 16 + col * 230, y: 60 + row * 160, w: 200, h: 130 };
        });
        setLayouts(initLayouts);
      } catch (err) {
        console.error('Error fetching Agri-Twin data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    sensorService.subscribeToSensorUpdates((payload) => {
      const nd = payload.new as SensorData;
      if (nd.zone_id) setSensorDataMap(prev => ({ ...prev, [nd.zone_id as string]: nd }));
    });
    sensorService.subscribeToZoneUpdates((payload) => {
      const uz = payload.new as Zone;
      setZones(prev => prev.map(z => z.id === uz.id ? uz : z));
    });
    return () => {
      sensorService.unsubscribeFromSensorUpdates();
      sensorService.unsubscribeFromZoneUpdates();
    };
  }, []);

  const selected = selectedZone ? zones.find(z => z.id === selectedZone) : null;
  const selectedSensor = selectedZone ? sensorDataMap[selectedZone] : null;
  const activeCount = zones.filter(z => z.status === 'irrigating' || z.status === 'fertigating').length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Map className="w-5 h-5 text-primary-500" />
          Agri-Twin — Digital Twin Lahan
        </h2>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-100 text-primary-700">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />{activeCount} zona aktif
            </span>
          )}
          <button className="p-2 glass-sm rounded-lg hover:bg-white/60 transition-all border border-white/10">
            <Maximize2 className="w-4 h-4" style={{ color: 'var(--surface-text-muted)' }} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map canvas */}
        <div className="lg:col-span-3">
          <div className="glass p-4 relative" style={{ minHeight: 560 }}>
            {isLoading ? (
              <div className="flex items-center justify-center" style={{ minHeight: 500 }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                  <p className="text-sm font-mono text-primary-400">LOADING DIGITAL TWIN...</p>
                </div>
              </div>
            ) : (
              <div
                className="relative bg-black/5 rounded-2xl border-2 border-dashed border-primary-200/50 overflow-hidden"
                style={{ minHeight: 500 }}
                onClick={() => setSelectedZone(null)}
              >
                {/* Legend */}
                <div className="absolute top-3 left-3 z-30 flex flex-wrap gap-1.5">
                  {Object.entries(ZONE_STATUS).map(([key, val]) => (
                    <span key={key} className="text-[9px] font-semibold px-2 py-0.5 rounded-full glass-sm flex items-center gap-1">
                      <span>{val.icon}</span> {val.label}
                    </span>
                  ))}
                </div>
                {/* Hint text */}
                <p className="absolute bottom-3 left-3 text-[10px] z-30" style={{ color: 'var(--surface-text-muted)' }}>
                  💡 Drag zona untuk memindahkan • Tarik sudut zona untuk resize
                </p>

                {/* Zone blocks */}
                {zones.map(zone => {
                  const layout = layouts[zone.id];
                  if (!layout) return null;
                  return (
                    <ZoneBlock
                      key={zone.id}
                      zone={zone}
                      sensor={sensorDataMap[zone.id] || mockSensorData[zone.id] || { soil_moisture: 0, temperature: 0, humidity: 0, ph: 0, recorded_at: '' }}
                      layout={layout}
                      isSelected={selectedZone === zone.id}
                      onClick={() => setSelectedZone(zone.id)}
                      onLayoutChange={(l) => setLayouts(prev => ({ ...prev, [zone.id]: l }))}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
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
                    <p className="text-xl font-mono font-bold" style={{ color: 'var(--surface-text)' }}>{selectedSensor?.soil_moisture ?? '—'}%</p>
                  </div>
                  <div className="glass-sm p-3 rounded-xl border border-secondary-100/50">
                    <p className="text-[10px] text-secondary-600 font-bold uppercase mb-1">Suhu Udara</p>
                    <p className="text-xl font-mono font-bold" style={{ color: 'var(--surface-text)' }}>{selectedSensor?.temperature ?? '—'}°C</p>
                  </div>
                  <div className="glass-sm p-3 rounded-xl border border-accent-100/50">
                    <p className="text-[10px] text-accent-600 font-bold uppercase mb-1">pH Tanah</p>
                    <p className="text-xl font-mono font-bold" style={{ color: 'var(--surface-text)' }}>{selectedSensor?.ph ?? '—'}</p>
                  </div>
                  <div className="glass-sm p-3 rounded-xl border border-purple-100/50">
                    <p className="text-[10px] text-purple-600 font-bold uppercase mb-1">Kelembaban Udara</p>
                    <p className="text-xl font-mono font-bold" style={{ color: 'var(--surface-text)' }}>{selectedSensor?.humidity ?? '—'}%</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-primary-50/50 border border-primary-100">
                  <p className="text-[10px] text-primary-700 font-bold uppercase mb-2">Status Operasional</p>
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{ZONE_STATUS[selected.status as keyof typeof ZONE_STATUS]?.icon || '💤'}</div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>{ZONE_STATUS[selected.status as keyof typeof ZONE_STATUS]?.label || 'Unknown'}</p>
                      <p className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>Real-time dari sensor</p>
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
                <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>Klik pada zona di peta untuk melihat detail sensor real-time</p>
              </div>
            </div>
          )}

          {/* Farm Statistics */}
          <div className="glass p-5">
            <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--surface-text)' }}>Ringkasan Lahan</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span style={{ color: 'var(--surface-text-muted)' }}>Total Area</span>
                <span className="font-bold" style={{ color: 'var(--surface-text)' }}>{zones.reduce((s, z) => s + z.area_ha, 0).toFixed(1)} Ha</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span style={{ color: 'var(--surface-text-muted)' }}>Zona Aktif</span>
                <span className="font-bold text-primary-600">{activeCount} / {zones.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span style={{ color: 'var(--surface-text-muted)' }}>Zona Error / Offline</span>
                <span className="font-bold text-danger-600">{zones.filter(z => z.status === 'error').length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span style={{ color: 'var(--surface-text-muted)' }}>Smart Delay Aktif</span>
                <span className="font-bold text-accent-600">{zones.filter(z => z.status === 'delayed').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
