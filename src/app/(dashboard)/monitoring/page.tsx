'use client';

import { useState } from 'react';
import { Activity, Droplets, Thermometer, Wind, Beaker } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import { mockZones, mockSensorData, mockSensorHistory } from '@/shared/lib/mockData';
import { cn, getThresholdColor, getSensorStatusColor } from '@/shared/lib/utils';
import { SENSOR_THRESHOLDS, ZONE_STATUS } from '@/shared/lib/constants';

function GaugeCard({ label, value, unit, icon: Icon, threshold, iconColor }: {
  label: string; value: number; unit: string; icon: React.ElementType;
  threshold: { low: number; high: number }; iconColor: string;
}) {
  const status = getThresholdColor(value, threshold.low, threshold.high);
  const statusColor = getSensorStatusColor(status);
  const percentage = Math.min(100, Math.max(0, ((value - 0) / (threshold.high * 1.3)) * 100));

  return (
    <div className="glass-sm p-4 flex flex-col items-center gap-2 group hover:scale-[1.02] transition-transform cursor-default">
      <Icon className="w-6 h-6" style={{ color: iconColor }} />
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={statusColor}
            strokeWidth="8"
            strokeDasharray={`${percentage * 2.64} ${264 - percentage * 2.64}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color: 'var(--surface-text)' }}>{value}</span>
          <span className="text-[10px]" style={{ color: 'var(--surface-text-muted)' }}>{unit}</span>
        </div>
      </div>
      <p className="text-xs font-medium text-center" style={{ color: 'var(--surface-text-muted)' }}>{label}</p>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
        <span className="text-[10px] capitalize" style={{ color: statusColor }}>{status === 'success' ? 'Normal' : status === 'warning' ? 'Perhatian' : 'Kritis'}</span>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const [selectedZone, setSelectedZone] = useState(mockZones[0].id);
  const [timeRange, setTimeRange] = useState('24h');
  const sensor = mockSensorData[selectedZone];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Zone Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Activity className="w-5 h-5 text-primary-500" />
          Monitoring Sensor Real-Time
        </h2>
        <div className="flex gap-2 flex-wrap">
          {mockZones.map(zone => {
            const status = ZONE_STATUS[zone.status];
            return (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5',
                  selectedZone === zone.id
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'glass-sm hover:scale-105'
                )}
                style={selectedZone !== zone.id ? { color: 'var(--surface-text)' } : undefined}
              >
                {status.icon} {zone.name.split(' - ')[1] || zone.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sensor Gauges */}
      <div className="glass p-5 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--surface-text-muted)' }}>
          📡 Pembacaan Saat Ini — {mockZones.find(z => z.id === selectedZone)?.name}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GaugeCard
            label={SENSOR_THRESHOLDS.soilMoisture.label}
            value={sensor.soil_moisture}
            unit={SENSOR_THRESHOLDS.soilMoisture.unit}
            icon={Droplets}
            threshold={SENSOR_THRESHOLDS.soilMoisture}
            iconColor="#3B82F6"
          />
          <GaugeCard
            label={SENSOR_THRESHOLDS.temperature.label}
            value={sensor.temperature}
            unit={SENSOR_THRESHOLDS.temperature.unit}
            icon={Thermometer}
            threshold={SENSOR_THRESHOLDS.temperature}
            iconColor="#EF4444"
          />
          <GaugeCard
            label={SENSOR_THRESHOLDS.humidity.label}
            value={sensor.humidity}
            unit={SENSOR_THRESHOLDS.humidity.unit}
            icon={Wind}
            threshold={SENSOR_THRESHOLDS.humidity}
            iconColor="#10B981"
          />
          <GaugeCard
            label={SENSOR_THRESHOLDS.ph.label}
            value={sensor.ph}
            unit=""
            icon={Beaker}
            threshold={SENSOR_THRESHOLDS.ph}
            iconColor="#F59E0B"
          />
        </div>
      </div>

      {/* History Chart */}
      <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--surface-text)' }}>
            📊 Grafik Historis Sensor
          </h3>
          <div className="flex gap-1 bg-white/50 rounded-lg p-1" style={{ border: '1px solid var(--surface-border)' }}>
            {['24h', '7d', '30d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  timeRange === range ? 'bg-primary-500 text-white' : ''
                )}
                style={timeRange !== range ? { color: 'var(--surface-text-muted)' } : undefined}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockSensorHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} interval={5} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
                  border: 'var(--glass-border)', borderRadius: '12px', boxShadow: 'var(--glass-shadow)',
                }}
              />
              <Line type="monotone" dataKey="soil_moisture" stroke="#3B82F6" strokeWidth={2} dot={false} name="Kelembaban Tanah (%)" />
              <Line type="monotone" dataKey="temperature" stroke="#EF4444" strokeWidth={2} dot={false} name="Suhu (°C)" />
              <Line type="monotone" dataKey="humidity" stroke="#10B981" strokeWidth={2} dot={false} name="Kelembaban Udara (%)" />
              <Line type="monotone" dataKey="ph" stroke="#F59E0B" strokeWidth={2} dot={false} name="pH" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
