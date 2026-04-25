'use client';

import { useState } from 'react';
import { Cpu, Wifi, WifiOff, Battery, Signal, Clock, Search, Filter } from 'lucide-react';
import { mockDevices } from '@/shared/lib/mockData';
import { cn, formatRelativeTime } from '@/shared/lib/utils';

function getBatteryColor(level: number) {
  if (level > 60) return 'text-primary-500';
  if (level > 30) return 'text-accent-500';
  return 'text-danger-500';
}

function getSignalBars(rssi: number) {
  if (rssi > -60) return 4;
  if (rssi > -70) return 3;
  if (rssi > -80) return 2;
  if (rssi > -90) return 1;
  return 0;
}

function DeviceCard({ device }: { device: typeof mockDevices[0] }) {
  const batteryColor = getBatteryColor(device.battery_level);
  const signalBars = getSignalBars(device.rssi);

  return (
    <div className={cn(
      'glass p-4 group hover:scale-[1.01] transition-all duration-200 cursor-default',
      !device.is_online && 'opacity-70'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-white',
            device.device_type === 'sensor' && 'bg-gradient-to-br from-secondary-400 to-secondary-600',
            device.device_type === 'actuator' && 'bg-gradient-to-br from-primary-400 to-primary-600',
            device.device_type === 'gateway' && 'bg-gradient-to-br from-purple-400 to-purple-600',
          )}>
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--surface-text)' }}>
              {device.device_type === 'sensor' ? '📡 Sensor' : device.device_type === 'actuator' ? '⚙️ Aktuator' : '📻 Gateway'}
            </p>
            <p className="text-[10px] font-mono" style={{ color: 'var(--surface-text-muted)' }}>
              ID: {device.id.toUpperCase()}
            </p>
          </div>
        </div>
        <div className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
          device.is_online ? 'bg-primary-100 text-primary-700' : 'bg-danger-50 text-danger-600'
        )}>
          {device.is_online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {device.is_online ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="glass-sm p-2 text-center">
          <Battery className={cn('w-4 h-4 mx-auto mb-0.5', batteryColor)} />
          <p className={cn('text-sm font-bold', batteryColor)}>{device.battery_level}%</p>
          <p className="text-[9px]" style={{ color: 'var(--surface-text-muted)' }}>Baterai</p>
        </div>
        <div className="glass-sm p-2 text-center">
          <Signal className="w-4 h-4 mx-auto mb-0.5 text-secondary-500" />
          <p className="text-sm font-bold text-secondary-500">{device.rssi} dBm</p>
          <p className="text-[9px]" style={{ color: 'var(--surface-text-muted)' }}>
            Sinyal {'█'.repeat(signalBars)}{'░'.repeat(4 - signalBars)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs" style={{ color: 'var(--surface-text-muted)' }}>
        <div className="flex justify-between">
          <span>Zona</span>
          <span className="font-medium" style={{ color: 'var(--surface-text)' }}>{device.zone_name || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span>Firmware</span>
          <span className="font-mono" style={{ color: 'var(--surface-text)' }}>v{device.firmware_version}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Heartbeat</span>
          <span style={{ color: 'var(--surface-text)' }}>{formatRelativeTime(device.last_heartbeat)}</span>
        </div>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const [filter, setFilter] = useState<'all' | 'sensor' | 'actuator' | 'gateway'>('all');
  const [search, setSearch] = useState('');

  const filtered = mockDevices.filter(d => {
    if (filter !== 'all' && d.device_type !== filter) return false;
    if (search && !d.id.toLowerCase().includes(search.toLowerCase()) && !d.zone_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const onlineCount = mockDevices.filter(d => d.is_online).length;
  const offlineCount = mockDevices.filter(d => !d.is_online).length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Cpu className="w-5 h-5 text-primary-500" />
          Device Management
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 px-2 py-1 glass-sm text-primary-600 font-medium">
            <Wifi className="w-3 h-3" /> {onlineCount} Online
          </span>
          <span className="flex items-center gap-1 px-2 py-1 glass-sm text-danger-500 font-medium">
            <WifiOff className="w-3 h-3" /> {offlineCount} Offline
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--surface-text-muted)' }} />
          <input
            type="text"
            placeholder="Cari perangkat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass-sm text-sm outline-none focus:ring-2 focus:ring-primary-500"
            style={{ color: 'var(--surface-text)' }}
          />
        </div>
        <div className="flex gap-1 bg-white/50 rounded-xl p-1" style={{ border: '1px solid var(--surface-border)' }}>
          {(['all', 'sensor', 'actuator', 'gateway'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                filter === f ? 'bg-primary-500 text-white' : ''
              )}
              style={filter !== f ? { color: 'var(--surface-text-muted)' } : undefined}
            >
              {f === 'all' ? 'Semua' : f === 'sensor' ? '📡 Sensor' : f === 'actuator' ? '⚙️ Aktuator' : '📻 Gateway'}
            </button>
          ))}
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((device, i) => (
          <div key={device.id} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}>
            <DeviceCard device={device} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass p-12 text-center">
          <Cpu className="w-12 h-12 mx-auto text-primary-200 mb-3" />
          <p className="text-sm font-medium" style={{ color: 'var(--surface-text-muted)' }}>
            Tidak ada perangkat yang cocok dengan filter
          </p>
        </div>
      )}
    </div>
  );
}
