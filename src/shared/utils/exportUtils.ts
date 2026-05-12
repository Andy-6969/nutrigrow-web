// src/shared/utils/exportUtils.ts
// Utility functions for exporting data to CSV and other formats

import type { NutrientRecipe, ScoutingLog, SensorData } from '@/shared/types/global.types';

/** Download a string as a file */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Convert array of objects to CSV string */
function toCSV(headers: string[], rows: (string | number | boolean | undefined | null)[][]): string {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row =>
    row.map(cell => {
      const val = cell === null || cell === undefined ? '' : String(cell);
      // Wrap in quotes if contains comma, newline, or quote
      return val.includes(',') || val.includes('\n') || val.includes('"')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

/** Format date for filename */
function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────
// A. Export Recipes ke CSV
// ─────────────────────────────────────────────────────────────────
export function exportRecipesToCSV(recipes: NutrientRecipe[]) {
  const headers = [
    'Nama Resep', 'Jenis Tanaman', 'Deskripsi', 'Total Fase',
    'EC Min (mS/cm)', 'EC Max (mS/cm)', 'pH Min', 'pH Max',
    'Total Hari', 'Tanggal Dibuat'
  ];

  const rows = recipes.flatMap(recipe => {
    if (!recipe.phases || recipe.phases.length === 0) {
      return [[
        recipe.name, recipe.plant_type, recipe.description || '',
        0, 0, 0, 0, 0, 0,
        new Date(recipe.created_at).toLocaleDateString('id-ID')
      ]];
    }

    const minEC = Math.min(...recipe.phases.map(p => p.ec_target_min));
    const maxEC = Math.max(...recipe.phases.map(p => p.ec_target_max));
    const minPH = Math.min(...recipe.phases.map(p => p.ph_target_min));
    const maxPH = Math.max(...recipe.phases.map(p => p.ph_target_max));
    const totalDays = Math.max(...recipe.phases.map(p => p.day_end));

    return [[
      recipe.name,
      recipe.plant_type,
      recipe.description || '',
      recipe.phases.length,
      minEC.toFixed(1),
      maxEC.toFixed(1),
      minPH.toFixed(1),
      maxPH.toFixed(1),
      totalDays,
      new Date(recipe.created_at).toLocaleDateString('id-ID')
    ]];
  });

  const csv = toCSV(headers, rows);
  downloadFile(csv, `nutrigrow-resep-${dateStamp()}.csv`, 'text/csv;charset=utf-8;');
}

// ─────────────────────────────────────────────────────────────────
// B. Export Scouting Logs ke CSV
// ─────────────────────────────────────────────────────────────────
export function exportScoutingToCSV(logs: ScoutingLog[]) {
  const headers = [
    'Tanggal', 'Zona', 'Jenis Masalah', 'Tingkat Keparahan',
    'Status', 'Catatan', 'Pelapor', 'Foto'
  ];

  const severityLabel: Record<string, string> = {
    rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi'
  };
  const statusLabel: Record<string, string> = {
    open: 'Terbuka', in_progress: 'Dalam Proses', resolved: 'Selesai'
  };
  const typeLabel: Record<string, string> = {
    hama: 'Hama', penyakit: 'Penyakit', infrastruktur: 'Infrastruktur', lainnya: 'Lainnya'
  };

  const rows = logs.map(log => [
    new Date(log.created_at).toLocaleDateString('id-ID'),
    log.zone_name || log.zone_id,
    typeLabel[log.issue_type] || log.issue_type,
    severityLabel[log.severity] || log.severity,
    statusLabel[log.status] || log.status,
    log.notes,
    log.user_name || '-',
    log.photo_url || '-'
  ]);

  const csv = toCSV(headers, rows);
  downloadFile(csv, `nutrigrow-scouting-${dateStamp()}.csv`, 'text/csv;charset=utf-8;');
}

// ─────────────────────────────────────────────────────────────────
// C. Export Sensor Data ke CSV
// ─────────────────────────────────────────────────────────────────
export function exportSensorDataToCSV(data: SensorData[], zoneName?: string) {
  const headers = [
    'Waktu', 'Kelembaban Tanah (%)', 'Suhu (°C)', 'Kelembaban Udara (%)',
    'pH', 'EC/TDS (mS/cm)', 'Baterai (%)', 'RSSI'
  ];

  const rows = data.map(d => [
    new Date(d.recorded_at).toLocaleString('id-ID'),
    d.soil_moisture,
    d.temperature,
    d.humidity,
    d.ph,
    d.tds ?? '-',
    d.battery ?? '-',
    d.rssi ?? '-'
  ]);

  const zoneSlug = zoneName ? `-${zoneName.replace(/\s+/g, '-').toLowerCase()}` : '';
  const csv = toCSV(headers, rows);
  downloadFile(csv, `nutrigrow-sensor${zoneSlug}-${dateStamp()}.csv`, 'text/csv;charset=utf-8;');
}
