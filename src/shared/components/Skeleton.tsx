'use client';

/**
 * Skeleton loading component — dipakai di seluruh halaman dashboard
 * sebagai placeholder saat data masih di-fetch.
 */

import { cn } from '@/shared/lib/utils';

/* ─── Base Shimmer ──────────────────────────────────────────── */
function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn('rounded-xl animate-pulse', className)}
      style={{ background: 'var(--surface-card)', ...style }}
    />
  );
}

/* ─── KPI Card Skeleton (4 kolom di overview/eco-savings) ───── */
export function KPICardSkeleton() {
  return (
    <div className="glass p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Shimmer className="w-12 h-12 rounded-2xl" />
        <Shimmer className="w-16 h-5" />
      </div>
      <Shimmer className="h-8 w-3/4" />
      <Shimmer className="h-4 w-1/2" />
    </div>
  );
}

/* ─── Device Card Skeleton ──────────────────────────────────── */
export function DeviceCardSkeleton() {
  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shimmer className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Shimmer className="h-4 w-20" />
            <Shimmer className="h-3 w-14" />
          </div>
        </div>
        <Shimmer className="h-5 w-14 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Shimmer className="h-16 rounded-xl" />
        <Shimmer className="h-16 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-5/6" />
        <Shimmer className="h-3 w-4/6" />
      </div>
    </div>
  );
}

/* ─── Table Row Skeleton ────────────────────────────────────── */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Shimmer className={cn('h-4', i === 0 ? 'w-20' : 'w-full')} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Chart Skeleton ────────────────────────────────────────── */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Shimmer className="h-5 w-36" />
        <Shimmer className="h-5 w-20" />
      </div>
      <div style={{ height }} className="flex items-end gap-2 px-2">
        {[60, 80, 50, 90, 70, 85, 45].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: '100%' }}>
            <Shimmer style={{ height: `${h}%` }} className="rounded-t-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Farm Card Skeleton ────────────────────────────────────── */
export function FarmCardSkeleton() {
  return (
    <div className="glass p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Shimmer className="w-11 h-11 rounded-xl" />
          <div className="space-y-1.5 mt-1">
            <Shimmer className="h-5 w-36" />
            <Shimmer className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-1">
          <Shimmer className="w-7 h-7 rounded-lg" />
          <Shimmer className="w-7 h-7 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Shimmer className="h-14 rounded-xl" />
        <Shimmer className="h-14 rounded-xl" />
      </div>
      <Shimmer className="h-10 rounded-xl" />
    </div>
  );
}

/* ─── Zone Selector Skeleton ────────────────────────────────── */
export function ZoneSelectorSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-sm p-3 flex items-center gap-3 rounded-xl">
          <Shimmer className="w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Page Header Skeleton ──────────────────────────────────── */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Shimmer className="h-7 w-48" />
        <Shimmer className="h-4 w-32" />
      </div>
      <Shimmer className="h-10 w-32 rounded-xl" />
    </div>
  );
}

/* ─── Full page skeleton (generic) ─────────────────────────── */
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <KPICardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
