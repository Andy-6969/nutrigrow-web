'use client';

import { useState } from 'react';
import { Cpu, Wifi, WifiOff, Battery, Signal, Clock, Search, Download, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { mockDevices, mockSensorData, mockSensorHistory, mockIrrigationLogs, mockOverrideLogs, mockZones } from '@/shared/lib/mockData';
import { cn, formatRelativeTime } from '@/shared/lib/utils';
import { useRBAC } from '@/shared/hooks/useRBAC';

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
            device.device_type === 'sensor'   && 'bg-gradient-to-br from-secondary-400 to-secondary-600',
            device.device_type === 'actuator' && 'bg-gradient-to-br from-primary-400 to-primary-600',
            device.device_type === 'gateway'  && 'bg-gradient-to-br from-purple-400 to-purple-600',
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

/* ─── Excel Export Util ─────────────────────────────────────────────── */
async function exportToExcel(onDone: () => void) {
  // Lazy import — hanya load saat dibutuhkan
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();
  const now = new Date();
  const tanggal = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  /* ── Sheet 1: Ringkasan Perangkat ── */
  const deviceRows = mockDevices.map(d => ({
    'ID Perangkat': d.id.toUpperCase(),
    'Tipe': d.device_type === 'sensor' ? 'Sensor' : d.device_type === 'actuator' ? 'Aktuator' : 'Gateway',
    'Zona': d.zone_name || '-',
    'Status': d.is_online ? 'Online' : 'Offline',
    'Baterai (%)': d.battery_level,
    'RSSI (dBm)': d.rssi,
    'Firmware': `v${d.firmware_version}`,
    'Last Heartbeat': d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleString('id-ID') : '-',
  }));
  const wsDevices = XLSX.utils.json_to_sheet(deviceRows);
  wsDevices['!cols'] = [14,12,10,8,12,12,10,20].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsDevices, 'Perangkat');

  /* ── Sheet 2: Kondisi Sensor Terkini ── */
  const sensorRows = Object.entries(mockSensorData).map(([zoneId, s]) => {
    const zone = mockZones.find(z => z.id === zoneId);
    return {
      'Zona': zone?.name ?? zoneId,
      'Tanaman': zone?.crop_type ?? '-',
      'Kelembaban Tanah (%)': s.soil_moisture,
      'Suhu (°C)': s.temperature,
      'Kelembaban Udara (%)': s.humidity,
      'pH': s.ph,
      'Baterai (%)': s.battery,
      'RSSI (dBm)': s.rssi,
      'Waktu Rekam': s.recorded_at ? new Date(s.recorded_at).toLocaleString('id-ID') : '-',
    };
  });
  const wsSensor = XLSX.utils.json_to_sheet(sensorRows);
  wsSensor['!cols'] = [24,12,22,10,22,6,12,12,20].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsSensor, 'Data Sensor');

  /* ── Sheet 3: Riwayat Sensor 24 Jam ── */
  const historyRows = mockSensorHistory.map(h => ({
    'Waktu': h.time,
    'Kelembaban Tanah (%)': parseFloat(h.soil_moisture.toFixed(1)),
    'Suhu (°C)': parseFloat(h.temperature.toFixed(1)),
    'Kelembaban Udara (%)': parseFloat(h.humidity.toFixed(1)),
    'pH': parseFloat(h.ph.toFixed(2)),
  }));
  const wsHistory = XLSX.utils.json_to_sheet(historyRows);
  wsHistory['!cols'] = [8,22,10,22,8].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsHistory, 'Tren 24 Jam');

  /* ── Sheet 4: Log Irigasi ── */
  const irrigRows = mockIrrigationLogs.map(l => ({
    'ID Log': l.id.toUpperCase(),
    'Zona': l.zone_name,
    'Sumber': l.source === 'auto' ? 'Otomatis' : l.source === 'schedule' ? 'Jadwal' : 'Manual Override',
    'Mode': l.mode === 'water' ? 'Air Biasa' : l.mode === 'fertigation' ? 'Fertigasi' : 'Pupuk Cair',
    'Durasi (menit)': l.duration_minutes,
    'Volume Air (L)': l.water_volume_liters ?? '-',
    'Mulai': new Date(l.started_at).toLocaleString('id-ID'),
    'Selesai': l.ended_at ? new Date(l.ended_at).toLocaleString('id-ID') : 'Berjalan',
    'Status': l.status === 'completed' ? 'Selesai' : l.status === 'running' ? 'Berjalan' : 'Dibatalkan',
  }));
  const wsIrrig = XLSX.utils.json_to_sheet(irrigRows);
  wsIrrig['!cols'] = [10,12,16,14,16,14,20,20,12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsIrrig, 'Log Irigasi');

  /* ── Sheet 5: Log Override ── */
  const overrideRows = mockOverrideLogs.map(l => ({
    'ID Log': l.id.toUpperCase(),
    'Zona': l.zone_name,
    'Operator': l.user_name,
    'Mode': l.mode === 'water' ? 'Air Biasa' : l.mode === 'fertigation' ? 'Fertigasi' : 'Pupuk Cair',
    'Durasi (menit)': l.duration_minutes,
    'Alasan': l.reason || '-',
    'Mulai': new Date(l.started_at).toLocaleString('id-ID'),
    'Selesai': l.ended_at ? new Date(l.ended_at).toLocaleString('id-ID') : '-',
    'Status': l.status === 'completed' ? 'Selesai' : l.status,
  }));
  const wsOverride = XLSX.utils.json_to_sheet(overrideRows);
  wsOverride['!cols'] = [10,12,14,14,16,24,20,20,12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsOverride, 'Log Override');

  /* ── Filename & Save ── */
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  XLSX.writeFile(wb, `NutriGrow_LaporanSensor_${dateStr}.xlsx`);
  onDone();
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function DevicesPage() {
  const [filter, setFilter] = useState<'all' | 'sensor' | 'actuator' | 'gateway'>('all');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const { hasRole } = useRBAC();

  const filtered = mockDevices.filter(d => {
    if (filter !== 'all' && d.device_type !== filter) return false;
    if (search && !d.id.toLowerCase().includes(search.toLowerCase()) && !d.zone_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const onlineCount  = mockDevices.filter(d => d.is_online).length;
  const offlineCount = mockDevices.filter(d => !d.is_online).length;

  const handleExport = async () => {
    setExporting(true);
    setExported(false);
    await exportToExcel(() => {
      setExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    });
  };

  /* pemilik_kebun & super_admin bisa export */
  const canExport = hasRole('super_admin', 'pemilik_kebun');

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Cpu className="w-5 h-5 text-primary-500" />
          Device Management
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status badges */}
          <span className="flex items-center gap-1 px-2 py-1 glass-sm text-primary-600 font-medium text-sm">
            <Wifi className="w-3 h-3" /> {onlineCount} Online
          </span>
          <span className="flex items-center gap-1 px-2 py-1 glass-sm text-danger-500 font-medium text-sm">
            <WifiOff className="w-3 h-3" /> {offlineCount} Offline
          </span>

          {/* Export Button — hanya untuk super_admin & pemilik_kebun */}
          {canExport && (
            <button
              id="btn-export-excel"
              onClick={handleExport}
              disabled={exporting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md',
                exported
                  ? 'bg-primary-500 text-white scale-[0.98]'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 hover:shadow-lg active:scale-[0.97]',
                exporting && 'opacity-70 cursor-not-allowed'
              )}
              title="Export laporan kondisi sensor & perangkat ke Excel"
            >
              {exported ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Tersimpan!
                </>
              ) : exporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengekspor...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel
                  <Download className="w-3.5 h-3.5 opacity-80" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Export Info Banner ── */}
      {canExport && (
        <div
          className="glass-sm px-4 py-3 flex items-start gap-3 rounded-xl text-sm"
          style={{ borderLeft: '3px solid var(--color-primary-500)' }}
        >
          <FileSpreadsheet className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
          <div style={{ color: 'var(--surface-text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--surface-text)' }}>Laporan Excel</span> berisi 5 sheet:{' '}
            Ringkasan Perangkat, Data Sensor Terkini, Tren 24 Jam, Log Irigasi, dan Log Override.
          </div>
        </div>
      )}

      {/* ── Filters ── */}
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
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
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

      {/* ── Device Grid ── */}
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
