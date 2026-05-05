'use client';

import { useState, useEffect } from 'react';
import { Droplets, Leaf, DollarSign, Zap, ArrowUpRight, Download, TrendingUp, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { mockEcoSavings, mockEcoSavingsHistory } from '@/shared/lib/mockData';
import { formatNumber, formatCurrency, cn } from '@/shared/lib/utils';
import { useT } from '@/shared/context/LanguageContext';

// ─── Count-up hook ────────────────────────────────────────────
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── KPI Card ─────────────────────────────────────────────────
function BigKPICard({ icon: Icon, label, value, unit, trend, bgGradient, delay }: {
  icon: React.ElementType; label: string; value: number; unit: string;
  trend: number; bgGradient: string; delay: number;
}) {
  const animatedValue = useCountUp(value);
  const t = useT();

  return (
    <div
      className="glass p-6 relative overflow-hidden opacity-0 animate-fade-in-up group"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className={cn('absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-10', bgGradient)} />
      <div className="relative z-10">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4', bgGradient)}>
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--surface-text)' }}>
          {unit === 'Rp' ? formatCurrency(animatedValue) : formatNumber(animatedValue)}
          {unit !== 'Rp' && <span className="text-base font-normal ml-1" style={{ color: 'var(--surface-text-muted)' }}>{unit}</span>}
        </p>
        <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>{label}</p>
        <div className="flex items-center gap-1 mt-2">
          <ArrowUpRight className="w-3.5 h-3.5 text-primary-500" />
          <span className="text-xs font-semibold text-primary-600">+{trend}% {t('eco_trend')}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function EcoSavingsPage() {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const t = useT();

  const exportCSV = () => {
    const headers = [t('eco_day'), t('eco_water_saved'), t('eco_fertilizer_saved'), t('eco_cost_saved'), t('eco_energy_saved')];
    const rows = mockEcoSavingsHistory.map(row =>
      [row.period, row.water, row.fertilizer, row.cost, row.energy].join(',')
    );

    const totalWater = mockEcoSavingsHistory.reduce((s, r) => s + r.water, 0);
    const totalFertilizer = mockEcoSavingsHistory.reduce((s, r) => s + r.fertilizer, 0);
    const totalCost = mockEcoSavingsHistory.reduce((s, r) => s + r.cost, 0);
    const totalEnergy = mockEcoSavingsHistory.reduce((s, r) => s + r.energy, 0);
    rows.push(`TOTAL,${totalWater},${totalFertilizer.toFixed(1)},${totalCost},${totalEnergy}`);

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrigrow-eco-savings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const isId = t('common_lang_code') === 'id';
    const printContent = `
      <!DOCTYPE html>
      <html lang="${t('common_lang_code')}">
      <head>
        <meta charset="UTF-8" />
        <title>NutriGrow — Eco-Savings Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a2e; }
          h1 { color: #166534; font-size: 22px; margin-bottom: 4px; }
          h2 { color: #555; font-size: 14px; font-weight: normal; margin-bottom: 30px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
          .kpi-value { font-size: 24px; font-weight: bold; color: #166534; }
          .kpi-label { font-size: 12px; color: #64748b; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f0fdf4; color: #166534; padding: 10px 12px; text-align: left; border-bottom: 2px solid #bbf7d0; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          tr.total { background: #f0fdf4; font-weight: bold; }
          .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>🌱 NutriGrow — ${t('eco_title')}</h1>
        <h2>${isId ? 'Periode' : 'Period'}: ${new Date().toLocaleDateString(isId ? 'id-ID' : 'en-US', { year: 'numeric', month: 'long' })} | ${isId ? 'Dicetak' : 'Printed'}: ${new Date().toLocaleString(isId ? 'id-ID' : 'en-US')}</h2>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-value">${formatNumber(mockEcoSavings.water_saved_liters)} L</div>
            <div class="kpi-label">💧 ${t('eco_water_saved')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${formatNumber(mockEcoSavings.fertilizer_saved_kg)} kg</div>
            <div class="kpi-label">🌿 ${t('eco_fertilizer_saved')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${formatCurrency(mockEcoSavings.cost_saved_rupiah)}</div>
            <div class="kpi-label">💰 ${t('eco_cost_saved')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">${formatNumber(mockEcoSavings.energy_saved_kwh)} kWh</div>
            <div class="kpi-label">⚡ ${t('eco_energy_saved')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t('eco_day')}</th>
              <th>${t('eco_water_label')}</th>
              <th>${t('eco_fert_label')}</th>
              <th>${t('eco_cost_label')}</th>
              <th>${t('eco_energy_label')}</th>
            </tr>
          </thead>
          <tbody>
            ${mockEcoSavingsHistory.map(row => `
              <tr>
                <td>${row.period}</td>
                <td>${formatNumber(row.water)}</td>
                <td>${row.fertilizer.toFixed(1)}</td>
                <td>${formatCurrency(row.cost)}</td>
                <td>${row.energy}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td>TOTAL</td>
              <td>${formatNumber(mockEcoSavingsHistory.reduce((s,r)=>s+r.water,0))}</td>
              <td>${mockEcoSavingsHistory.reduce((s,r)=>s+r.fertilizer,0).toFixed(1)}</td>
              <td>${formatCurrency(mockEcoSavingsHistory.reduce((s,r)=>s+r.cost,0))}</td>
              <td>${mockEcoSavingsHistory.reduce((s,r)=>s+r.energy,0)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          ${isId 
            ? 'Laporan ini dibuat otomatis oleh sistem NutriGrow — Bitanic Pro V4. Data diperbarui setiap 15 menit.' 
            : 'This report was automatically generated by the NutriGrow system — Bitanic Pro V4. Data is updated every 15 minutes.'}
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 500);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <TrendingUp className="w-5 h-5 text-primary-500" />
          {t('eco_title')}
        </h2>

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 glass-sm text-sm font-medium hover:scale-105 transition-transform rounded-xl border border-white/20"
            style={{ color: 'var(--surface-text)' }}
          >
            <Download className="w-4 h-4" /> {t('eco_export')}
          </button>

          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 mt-2 w-44 glass rounded-xl shadow-xl z-20 overflow-hidden border border-white/20">
                <button
                  onClick={() => { exportCSV(); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-primary-50 transition-colors text-left"
                  style={{ color: 'var(--surface-text)' }}
                >
                  <Download className="w-4 h-4 text-primary-500" />
                  {t('eco_download_csv')}
                </button>
                <div className="h-px bg-black/5" />
                <button
                  onClick={() => { exportPDF(); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-primary-50 transition-colors text-left"
                  style={{ color: 'var(--surface-text)' }}
                >
                  <FileText className="w-4 h-4 text-accent-500" />
                  {t('eco_print_pdf')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BigKPICard icon={Droplets}   label={t('eco_water_saved')}    value={mockEcoSavings.water_saved_liters}  unit="L"   trend={mockEcoSavings.water_trend}       bgGradient="bg-gradient-to-br from-secondary-400 to-secondary-600" delay={0} />
        <BigKPICard icon={Leaf}       label={t('eco_fertilizer_saved')}  value={mockEcoSavings.fertilizer_saved_kg} unit="kg"  trend={mockEcoSavings.fertilizer_trend}   bgGradient="bg-gradient-to-br from-primary-400 to-primary-600" delay={100} />
        <BigKPICard icon={DollarSign} label={t('eco_cost_saved')}  value={mockEcoSavings.cost_saved_rupiah}   unit="Rp"  trend={mockEcoSavings.cost_trend}         bgGradient="bg-gradient-to-br from-accent-400 to-accent-600" delay={200} />
        <BigKPICard icon={Zap}        label={t('eco_energy_saved')} value={mockEcoSavings.energy_saved_kwh}    unit="kWh" trend={mockEcoSavings.energy_trend}       bgGradient="bg-gradient-to-br from-purple-400 to-purple-600" delay={300} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--surface-text)' }}>💧 {t('eco_water_fert_chart')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockEcoSavingsHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: 'var(--glass-border)', borderRadius: '12px' }} />
                <Legend />
                <Bar dataKey="water" name={t('eco_water_label')} fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="fertilizer" name={t('eco_fert_label')} fill="#10B981" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--surface-text)' }}>💰 {t('eco_cost_energy_chart')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockEcoSavingsHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', border: 'var(--glass-border)', borderRadius: '12px' }} />
                <Legend />
                <Line type="monotone" dataKey="cost" name={t('eco_cost_label')} stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: '#F59E0B', r: 4 }} />
                <Line type="monotone" dataKey="energy" name={t('eco_energy_label')} stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--surface-text)' }}>📊 {t('eco_weekly_detail')}</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700 font-medium">
            Total: {formatCurrency(mockEcoSavingsHistory.reduce((s, r) => s + r.cost, 0))}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>{t('eco_day')}</th>
                <th className="text-right py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>💧 {t('eco_water_label')}</th>
                <th className="text-right py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>🌿 {t('eco_fert_label')}</th>
                <th className="text-right py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>💰 {t('eco_cost_label')}</th>
                <th className="text-right py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>⚡ {t('eco_energy_label')}</th>
              </tr>
            </thead>
            <tbody>
              {mockEcoSavingsHistory.map(row => (
                <tr key={row.period} className="border-b hover:bg-white/30 transition-colors" style={{ borderColor: 'var(--surface-border)' }}>
                  <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--surface-text)' }}>{row.period}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{formatNumber(row.water)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{row.fertilizer.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{formatCurrency(row.cost)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{row.energy}</td>
                </tr>
              ))}
              <tr className="border-t-2 font-bold" style={{ borderColor: 'var(--surface-border)', background: 'rgba(34,197,94,0.05)' }}>
                <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--surface-text)' }}>TOTAL</td>
                <td className="py-2.5 px-3 text-right font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{formatNumber(mockEcoSavingsHistory.reduce((s,r)=>s+r.water,0))}</td>
                <td className="py-2.5 px-3 text-right font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{mockEcoSavingsHistory.reduce((s,r)=>s+r.fertilizer,0).toFixed(1)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{formatCurrency(mockEcoSavingsHistory.reduce((s,r)=>s+r.cost,0))}</td>
                <td className="py-2.5 px-3 text-right font-mono text-xs" style={{ color: 'var(--surface-text)' }}>{mockEcoSavingsHistory.reduce((s,r)=>s+r.energy,0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
