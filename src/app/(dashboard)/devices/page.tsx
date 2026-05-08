'use client';

import { useState, useEffect } from 'react';
import { Cpu, Wifi, WifiOff, Battery, Signal, Clock, Search, Download, FileSpreadsheet, CheckCircle, X, AlertCircle } from 'lucide-react';
import { mockDevices, mockSensorData, mockSensorHistory, mockIrrigationLogs, mockOverrideLogs, mockZones } from '@/shared/lib/mockData';
import { cn, formatRelativeTime } from '@/shared/lib/utils';
import { useRBAC } from '@/shared/hooks/useRBAC';
import { DeviceCardSkeleton, PageHeaderSkeleton } from '@/shared/components/Skeleton';
import { useT } from '@/shared/context/LanguageContext';

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

function DeviceCard({ device, t }: { device: typeof mockDevices[0]; t: (k: string) => string }) {
  const batteryColor = getBatteryColor(device.battery_level);
  const signalBars = getSignalBars(device.rssi);
  const devLabel = device.device_type === 'sensor'
    ? `📡 ${t('devices_sensor')}`
    : device.device_type === 'actuator'
    ? `⚙️ ${t('devices_actuator')}`
    : `📻 ${t('devices_gateway')}`;

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
              {devLabel}
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
          {device.is_online ? t('common_online') : t('common_offline')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="glass-sm p-2 text-center">
          <Battery className={cn('w-4 h-4 mx-auto mb-0.5', batteryColor)} />
          <p className={cn('text-sm font-bold', batteryColor)}>{device.battery_level}%</p>
          <p className="text-[9px]" style={{ color: 'var(--surface-text-muted)' }}>{t('devices_battery')}</p>
        </div>
        <div className="glass-sm p-2 text-center">
          <Signal className="w-4 h-4 mx-auto mb-0.5 text-secondary-500" />
          <p className="text-sm font-bold text-secondary-500">{device.rssi} dBm</p>
          <p className="text-[9px]" style={{ color: 'var(--surface-text-muted)' }}>
            {t('devices_signal')} {'█'.repeat(signalBars)}{'░'.repeat(4 - signalBars)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs" style={{ color: 'var(--surface-text-muted)' }}>
        <div className="flex justify-between">
          <span>{t('devices_zone')}</span>
          <span className="font-medium" style={{ color: 'var(--surface-text)' }}>{device.zone_name || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('devices_firmware') || 'Firmware'}</span>
          <span className="font-mono" style={{ color: 'var(--surface-text)' }}>v{device.firmware_version}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t('devices_heartbeat')}</span>
          <span style={{ color: 'var(--surface-text)' }}>{formatRelativeTime(device.last_heartbeat)}</span>
        </div>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const [filter, setFilter] = useState<'all' | 'sensor' | 'actuator' | 'gateway'>('all');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);

  // Daftar kolom yang bisa dipilih user saat export
  // Kolom sinyal mentah (rssi) dikecualikan by default sesuai spec
  const ALL_EXPORT_COLUMNS = [
    { key: 'id',            label: 'ID Perangkat',    default: true  },
    { key: 'type',          label: 'Tipe',             default: true  },
    { key: 'zone',          label: 'Zona',             default: true  },
    { key: 'status',        label: 'Status',           default: true  },
    { key: 'battery',       label: 'Baterai (%)',      default: true  },
    { key: 'rssi',          label: 'Sinyal RSSI (dBm)',default: false }, // dikecualikan
    { key: 'firmware',      label: 'Firmware',         default: true  },
    { key: 'last_heartbeat',label: 'Last Heartbeat',   default: true  },
  ];
  const [selectedCols, setSelectedCols] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_EXPORT_COLUMNS.map(c => [c.key, c.default]))
  );
  const { hasRole } = useRBAC();
  const t = useT();

  useEffect(() => {
    const tm = setTimeout(() => setPageLoading(false), 900);
    return () => clearTimeout(tm);
  }, []);

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
    setShowExportModal(false);

    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // ── Sheet 1: Perangkat (dengan filter kolom sesuai pilihan user) ──
    const deviceRows = mockDevices.map(d => {
      const row: Record<string, string | number> = {};
      if (selectedCols['id'])             row['ID Perangkat']    = d.id.toUpperCase();
      if (selectedCols['type'])           row['Tipe']            = d.device_type === 'sensor' ? 'Sensor' : d.device_type === 'actuator' ? 'Aktuator' : 'Gateway';
      if (selectedCols['zone'])           row['Zona']            = d.zone_name || '-';
      if (selectedCols['status'])         row['Status']          = d.is_online ? 'Online' : 'Offline';
      if (selectedCols['battery'])        row['Baterai (%)']     = d.battery_level;
      if (selectedCols['rssi'])           row['Sinyal (dBm)']    = d.rssi;   // hanya jika dipilih
      if (selectedCols['firmware'])       row['Firmware']        = `v${d.firmware_version}`;
      if (selectedCols['last_heartbeat']) row['Last Heartbeat']  = d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleString('id-ID') : '-';
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deviceRows), 'Perangkat');

    // ── Sheet 2: Data Sensor (tanpa kolom sinyal mentah/debug) ──
    const sensorRows = Object.entries(mockSensorData).map(([zoneId, s]) => {
      const zone = mockZones.find(z => z.id === zoneId);
      return {
        'Zona':                 zone?.name ?? zoneId,
        'Tanaman':              zone?.crop_type ?? '-',
        'Kelembaban Tanah (%)': s.soil_moisture,
        'Suhu (°C)':            s.temperature,
        'Kelembaban Udara (%)': s.humidity,
        'pH':                   s.ph,
        'TDS / EC (mS/cm)':     s.tds ?? '-',
        'Baterai (%)':          s.battery ?? '-',
        // kolom rssi & sinyal mentah TIDAK disertakan
        'Waktu Rekam':          s.recorded_at ? new Date(s.recorded_at).toLocaleString('id-ID') : '-',
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sensorRows), 'Data Sensor');

    // ── Sheet 3: Tren 24 Jam ──
    const historyRows = mockSensorHistory.map(h => ({
      'Waktu':                    h.time,
      'Kelembaban Tanah (%)':     parseFloat(h.soil_moisture.toFixed(1)),
      'Suhu (°C)':                parseFloat(h.temperature.toFixed(1)),
      'Kelembaban Udara (%)':     parseFloat(h.humidity.toFixed(1)),
      'pH':                       parseFloat(h.ph.toFixed(2)),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyRows), 'Tren 24 Jam');

    // ── Sheet 4: Log Irigasi ──
    const irrigRows = mockIrrigationLogs.map(l => ({
      'ID Log':           l.id.toUpperCase(),
      'Zona':             l.zone_name,
      'Sumber':           l.source === 'auto' ? 'Otomatis' : l.source === 'schedule' ? 'Jadwal' : 'Manual Override',
      'Mode':             l.mode === 'water' ? 'Air Biasa' : 'Fertigasi',
      'Durasi (menit)':   l.duration_minutes,
      'Volume Air (L)':   l.water_volume_liters ?? '-',
      'Mulai':            new Date(l.started_at).toLocaleString('id-ID'),
      'Selesai':          l.ended_at ? new Date(l.ended_at).toLocaleString('id-ID') : 'Berjalan',
      'Status':           l.status === 'completed' ? 'Selesai' : l.status === 'running' ? 'Berjalan' : 'Dibatalkan',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(irrigRows), 'Log Irigasi');

    // ── Sheet 5: Log Override ──
    const overrideRows = mockOverrideLogs.map(l => ({
      'ID Log':           l.id.toUpperCase(),
      'Zona':             l.zone_name,
      'Operator':         l.user_name,
      'Mode':             l.mode === 'water' ? 'Air Biasa' : 'Fertigasi',
      'Durasi (menit)':   l.duration_minutes,
      'Alasan':           l.reason || '-',
      'Mulai':            new Date(l.started_at).toLocaleString('id-ID'),
      'Selesai':          l.ended_at ? new Date(l.ended_at).toLocaleString('id-ID') : '-',
      'Status':           l.status === 'completed' ? 'Selesai' : l.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overrideRows), 'Log Override');

    XLSX.writeFile(wb, `nutrigrow_devices_${dateStr}.xlsx`);
    setExporting(false);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const canExport = hasRole('super_admin', 'pemilik_kebun');

  // ── Export Modal ─────────────────────────────────────────────
  const ExportModal = () => (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={() => setShowExportModal(false)}>
      <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm" style={{ color: 'var(--surface-text)' }}>Pilih Kolom Export</span>
          </div>
          <button onClick={() => setShowExportModal(false)} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" style={{ color: 'var(--surface-text-muted)' }} />
          </button>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-xs"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span style={{ color: '#fbbf24' }}>Kolom <strong>Sinyal RSSI</strong> dikecualikan secara default karena berisi data teknis mentah yang tidak relevan untuk laporan.</span>
        </div>

        {/* Checklist kolom */}
        <div className="space-y-2 mb-5">
          {ALL_EXPORT_COLUMNS.map(col => (
            <label key={col.key} className="flex items-center gap-3 cursor-pointer group">
              <div
                className={cn(
                  'w-4 h-4 rounded flex items-center justify-center border transition-all',
                  selectedCols[col.key] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'
                )}
                onClick={() => setSelectedCols(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
              >
                {selectedCols[col.key] && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm" style={{ color: 'var(--surface-text)' }}>{col.label}</span>
              {!col.default && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>debug</span>
              )}
            </label>
          ))}
        </div>

        {/* Preview filename */}
        <p className="text-[10px] font-mono mb-4" style={{ color: 'var(--surface-text-muted)' }}>
          📄 nutrigrow_devices_{new Date().toISOString().slice(0,10)}.xlsx
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => setShowExportModal(false)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--surface-border)', color: 'var(--surface-text-muted)' }}>
            Batal
          </button>
          <button onClick={handleExport}
            className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
            <Download className="w-4 h-4 inline mr-1.5" />Export
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {pageLoading ? (
        <PageHeaderSkeleton />
      ) : (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <Cpu className="w-5 h-5 text-primary-500" />
          {t('devices_title')}
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 px-2 py-1 glass-sm text-primary-600 font-medium text-sm">
            <Wifi className="w-3 h-3" /> {onlineCount} {t('common_online')}
          </span>
          <span className="flex items-center gap-1 px-2 py-1 glass-sm text-danger-500 font-medium text-sm">
            <WifiOff className="w-3 h-3" /> {offlineCount} {t('common_offline')}
          </span>

          {canExport && (
            <button
              onClick={() => setShowExportModal(true)}
              disabled={exporting}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md',
                exported
                  ? 'bg-primary-500 text-white scale-[0.98]'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 hover:shadow-lg active:scale-[0.97]',
                exporting && 'opacity-70 cursor-not-allowed'
              )}
            >
              {exported ? (
                <><CheckCircle className="w-4 h-4" />{t('devices_exported')}</>
              ) : exporting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('devices_exporting')}</>
              ) : (
                <><FileSpreadsheet className="w-4 h-4" />{t('devices_export')}<Download className="w-3.5 h-3.5 opacity-80" /></>
              )}
            </button>
          )}
        </div>
      </div>
      )}

      {canExport && (
        <div className="glass-sm px-4 py-3 flex items-start gap-3 rounded-xl text-sm" style={{ borderLeft: '3px solid var(--color-primary-500)' }}>
          <FileSpreadsheet className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
          <div style={{ color: 'var(--surface-text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--surface-text)' }}>{t('devices_report_info')}</span>{' '}{t('devices_report_desc')}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--surface-text-muted)' }} />
          <input
            type="text"
            placeholder={t('devices_search')}
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
              {f === 'all' ? t('common_all') : f === 'sensor' ? `📡 ${t('devices_sensor')}` : f === 'actuator' ? `⚙️ ${t('devices_actuator')}` : `📻 ${t('devices_gateway')}`}
            </button>
          ))}
        </div>
      </div>

      {pageLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <DeviceCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((device, i) => (
            <div key={device.id} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}>
              <DeviceCard device={device} t={t} />
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="glass p-12 text-center">
          <Cpu className="w-12 h-12 mx-auto text-primary-200 mb-3" />
          <p className="text-sm font-medium" style={{ color: 'var(--surface-text-muted)' }}>
            {t('devices_no_match')}
          </p>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && <ExportModal />}
    </div>
  );
}
