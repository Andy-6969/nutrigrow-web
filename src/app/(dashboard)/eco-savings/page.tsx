'use client';

import { useState, useEffect } from 'react';
import { Droplets, Leaf, DollarSign, Zap, ArrowUpRight, Download, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import { mockEcoSavings, mockEcoSavingsHistory } from '@/shared/lib/mockData';
import { formatNumber, formatCurrency, cn } from '@/shared/lib/utils';

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

function BigKPICard({ icon: Icon, label, value, unit, trend, color, bgGradient, delay }: {
  icon: React.ElementType; label: string; value: number; unit: string;
  trend: number; color: string; bgGradient: string; delay: number;
}) {
  const animatedValue = useCountUp(value);

  return (
    <div
      className="glass p-6 relative overflow-hidden opacity-0 animate-fade-in-up group"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Background gradient decoration */}
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
          <span className="text-xs font-semibold text-primary-600">+{trend}% vs bulan lalu</span>
        </div>
      </div>
    </div>
  );
}

export default function EcoSavingsPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--surface-text)' }}>
          <TrendingUp className="w-5 h-5 text-primary-500" />
          Eco-Savings Dashboard
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 glass-sm text-sm font-medium hover:scale-105 transition-transform" style={{ color: 'var(--surface-text)' }}>
          <Download className="w-4 h-4" /> Ekspor Laporan
        </button>
      </div>

      {/* Big KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BigKPICard icon={Droplets}   label="Air Dihemat"    value={mockEcoSavings.water_saved_liters}  unit="L"   trend={mockEcoSavings.water_trend}       color="#3B82F6" bgGradient="bg-gradient-to-br from-secondary-400 to-secondary-600" delay={0} />
        <BigKPICard icon={Leaf}       label="Pupuk Dihemat"  value={mockEcoSavings.fertilizer_saved_kg} unit="kg"  trend={mockEcoSavings.fertilizer_trend}   color="#10B981" bgGradient="bg-gradient-to-br from-primary-400 to-primary-600" delay={100} />
        <BigKPICard icon={DollarSign} label="Biaya Dihemat"  value={mockEcoSavings.cost_saved_rupiah}   unit="Rp"  trend={mockEcoSavings.cost_trend}         color="#F59E0B" bgGradient="bg-gradient-to-br from-accent-400 to-accent-600" delay={200} />
        <BigKPICard icon={Zap}        label="Energi Dihemat" value={mockEcoSavings.energy_saved_kwh}    unit="kWh" trend={mockEcoSavings.energy_trend}       color="#8B5CF6" bgGradient="bg-gradient-to-br from-purple-400 to-purple-600" delay={300} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart: Weekly Water + Fertilizer */}
        <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--surface-text)' }}>
            💧 Penghematan Air & Pupuk
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockEcoSavingsHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
                    border: 'var(--glass-border)', borderRadius: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="water" name="Air (L)" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="fertilizer" name="Pupuk (kg)" fill="#10B981" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart: Cost + Energy */}
        <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--surface-text)' }}>
            💰 Tren Penghematan Biaya & Energi
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockEcoSavingsHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--surface-text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
                    border: 'var(--glass-border)', borderRadius: '12px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="cost" name="Biaya (Rp)" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: '#F59E0B', r: 4 }} />
                <Line type="monotone" dataKey="energy" name="Energi (kWh)" stroke="#8B5CF6" strokeWidth={2.5} dot={{ fill: '#8B5CF6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="glass p-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--surface-text)' }}>📊 Detail Penghematan Mingguan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--surface-border)' }}>
                <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>Hari</th>
                <th className="text-right py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>💧 Air (L)</th>
                <th className="text-right py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>🌿 Pupuk (kg)</th>
                <th className="text-right py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>💰 Biaya (Rp)</th>
                <th className="text-right py-2 px-3 font-medium text-xs" style={{ color: 'var(--surface-text-muted)' }}>⚡ Energi (kWh)</th>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
