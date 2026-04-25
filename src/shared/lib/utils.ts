// src/shared/lib/utils.ts

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)} Jt`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(1)} Rb`;
  return `Rp ${amount}`;
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getThresholdColor(value: number, low: number, high: number): 'success' | 'warning' | 'danger' {
  if (value < low) return 'danger';
  if (value > high) return 'warning';
  return 'success';
}

export function getSensorStatusColor(status: string): string {
  switch (status) {
    case 'success': return '#10B981';
    case 'warning': return '#F59E0B';
    case 'danger': return '#EF4444';
    default: return '#6B7280';
  }
}
