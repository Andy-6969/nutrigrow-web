'use client';

import { useState } from 'react';
import { Droplets, Thermometer, Wind, Zap, Play, Square, X, Info, Leaf } from 'lucide-react';
import type { Zone, SensorData } from '@/shared/types/global.types';
import { irrigationService } from '@/shared/services/irrigationService';
import { cn } from '@/shared/lib/utils';

interface ZoneVectorMapProps {
  zones: Zone[];
  sensorData: Record<string, SensorData>;
  className?: string;
}

export default function ZoneVectorMap({ zones, sensorData, className }: ZoneVectorMapProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const selectedSensor = selectedZoneId ? sensorData[selectedZoneId] : null;

  const handleTogglePump = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedZoneId || !selectedZone) return;

    setIsActionLoading(true);
    try {
      await irrigationService.toggleIrrigation(selectedZoneId, selectedZone.status);
      // In a real app, the subscription would update the UI
      // For now, we'll just close the popup to simulate feedback or wait for real-time update
    } finally {
      setIsActionLoading(false);
    }
  };

  // Define SVG coordinates for 4 zones in a grid/layout
  const zonePaths = [
    { id: 'z1', path: "M 50 50 L 250 50 L 250 200 L 50 200 Z", label: "ZONA 1" },
    { id: 'z2', path: "M 260 50 L 460 50 L 460 200 L 260 200 Z", label: "ZONA 2" },
    { id: 'z3', path: "M 50 210 L 250 210 L 250 360 L 50 360 Z", label: "ZONA 3" },
    { id: 'z4', path: "M 260 210 L 460 210 L 460 360 L 260 360 Z", label: "ZONA 4" },
  ];

  return (
    <div className={cn('relative rounded-2xl overflow-hidden border border-white/10 glass bg-[#0a0f18] min-h-[450px] flex flex-col', className)}>
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="glass-sm px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Vector View</div>
          <div className="text-xs font-mono text-primary-400 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            SYSTEM ONLINE
          </div>
        </div>
      </div>

      {/* SVG Map */}
      <div className="flex-1 flex items-center justify-center p-8">
        <svg 
          viewBox="0 0 510 410" 
          className="w-full max-w-[600px] h-auto drop-shadow-[0_0_30px_rgba(16,185,129,0.1)]"
        >
          {/* Background Grid Lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Zones */}
          {zonePaths.map((p) => {
            const zone = zones.find(z => z.id === p.id);
            const sensor = sensorData[p.id];
            const isSelected = selectedZoneId === p.id;
            const isIrrigating = zone?.status === 'irrigating';
            const isDry = sensor && (sensor.soil_moisture ?? 0) < 40;
            
            // Color logic: Red if dry, Blue if irrigating, Green if safe
            let strokeColor = "#10b981"; // Safe Green
            if (isDry) strokeColor = "#ef4444"; // Dry Red
            if (isIrrigating) strokeColor = "#3b82f6"; // Irrigating Blue

            return (
              <g 
                key={p.id} 
                onClick={() => setSelectedZoneId(isSelected ? null : p.id)}
                className="cursor-pointer group"
              >
                <path
                  d={p.path}
                  fill={isSelected ? "rgba(255,255,255,0.05)" : "transparent"}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? "3" : "2"}
                  className="transition-all duration-300 group-hover:fill-white/10"
                  strokeDasharray={isIrrigating ? "5,5" : "0"}
                >
                  {isIrrigating && (
                    <animate 
                      attributeName="stroke-dashoffset" 
                      from="100" to="0" dur="5s" 
                      repeatCount="indefinite" 
                    />
                  )}
                </path>
                
                {/* Zone Label */}
                <text
                  x={parseInt(p.path.split(' ')[1]) + 100}
                  y={parseInt(p.path.split(' ')[2]) + 75}
                  textAnchor="middle"
                  fill={strokeColor}
                  className="text-[14px] font-bold font-mono pointer-events-none transition-all duration-300"
                  style={{ opacity: isSelected ? 1 : 0.6 }}
                >
                  {p.label}
                </text>

                {/* Status Indicator Circle */}
                <circle
                  cx={parseInt(p.path.split(' ')[1]) + 20}
                  cy={parseInt(p.path.split(' ')[2]) + 20}
                  r="4"
                  fill={strokeColor}
                  className={cn(isIrrigating && "animate-pulse")}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Glassmorphism Popup */}
      {selectedZone && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-20 pointer-events-none">
          <div className="w-full max-w-xs glass-heavy rounded-2xl border border-white/20 p-5 shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center border border-primary-500/30">
                  <Info className="w-4 h-4 text-primary-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">{selectedZone.name}</h4>
                  <p className="text-[10px] text-white/50 font-mono">ID: {selectedZone.id.toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedZoneId(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sensor Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-1 text-white/40">
                  <Droplets className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase">Kelembaban</span>
                </div>
                <div className="text-lg font-mono font-bold text-white">
                  {selectedSensor?.soil_moisture ?? '--'}%
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-1 text-white/40">
                  <Leaf className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase">pH Tanah</span>
                </div>
                <div className="text-lg font-mono font-bold text-white">
                  {selectedSensor?.ph ?? '6.5'}
                </div>
              </div>
            </div>

            {/* Pump Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  selectedZone.status === 'irrigating' ? "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" : "bg-white/20"
                )} />
                <span className="text-xs font-medium text-white/70">
                  Status Pompa: <span className={cn(
                    "font-bold",
                    selectedZone.status === 'irrigating' ? "text-blue-400" : "text-white/40"
                  )}>
                    {selectedZone.status === 'irrigating' ? 'ON' : 'OFF'}
                  </span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleTogglePump}
              disabled={isActionLoading}
              className={cn(
                "w-full py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg",
                selectedZone.status === 'irrigating' 
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : "bg-primary-500 text-white hover:bg-primary-600 shadow-primary-500/20"
              )}
            >
              {isActionLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : selectedZone.status === 'irrigating' ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" /> Matikan Pompa {selectedZone.name}
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Nyalakan Pompa {selectedZone.name}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-500" />
          <span className="text-[10px] text-white/60 font-medium">Zona Aman</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-[10px] text-white/60 font-medium">Zona Kering</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] text-white/60 font-medium">Pengairan</span>
        </div>
      </div>
    </div>
  );
}
