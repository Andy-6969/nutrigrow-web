// src/shared/components/GrowthTimeline.tsx
// Timeline visual fase pertumbuhan tanaman — komponen reusable
'use client';

import { cn } from '@/shared/lib/utils';
import type { GrowthPhase, PlantType } from '@/shared/services/growthStageService';
import {
  getDaysSincePlanting,
  getActivePhase,
  getPhaseProgress,
  PLANT_PROFILES,
} from '@/shared/services/growthStageService';

interface GrowthTimelineProps {
  plantingDate: string;
  plantType: PlantType;
  className?: string;
}

export default function GrowthTimeline({ plantingDate, plantType, className }: GrowthTimelineProps) {
  const currentDay = getDaysSincePlanting(plantingDate);
  const activePhase = getActivePhase(currentDay, plantType);
  const profile = PLANT_PROFILES[plantType];

  // Fasi yang bisa ditampilkan (exclude "Panen" tak terbatas di kalkulasi lebar)
  const displayPhases = profile.phases.filter(p => p.dayEnd < 900);
  const totalDays = displayPhases.at(-1)?.dayEnd ?? 90;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header: Hari ke-X — Fase aktif */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{activePhase?.emoji ?? '🌱'}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--surface-text)' }}>
              Hari ke-{currentDay}
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--surface-text-muted)' }}>
                sejak tanam
              </span>
            </p>
            <p className="text-xs font-semibold" style={{ color: activePhase?.color ?? '#10b981' }}>
              {activePhase ? `Fase ${activePhase.id} — ${activePhase.name}` : 'Siklus Selesai / Tidak Diketahui'}
            </p>
          </div>
        </div>

        {/* EC target badge */}
        {activePhase && activePhase.ecTargetMin > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
            ⚡ EC {activePhase.ecTargetMin}–{activePhase.ecTargetMax} mS/cm
          </div>
        )}
        {activePhase && activePhase.ecTargetMin === 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(16,185,129,0.10)', color: '#10b981', border: '1px solid rgba(16,185,129,0.20)' }}>
            💧 Air saja (tanpa pupuk)
          </div>
        )}
      </div>

      {/* Timeline bar */}
      <div className="relative">
        {/* Fase bar container */}
        <div className="flex h-8 rounded-full overflow-hidden gap-0.5">
          {displayPhases.map(phase => {
            const widthPct = ((phase.dayEnd - phase.dayStart + 1) / totalDays) * 100;
            const isActive = phase.id === activePhase?.id;
            const isPast   = activePhase ? phase.id < activePhase.id : false;
            return (
              <div
                key={phase.id}
                className="relative flex items-center justify-center transition-all duration-500"
                style={{
                  width: `${widthPct}%`,
                  background: isActive
                    ? phase.color
                    : isPast
                    ? `${phase.color}55`
                    : `${phase.color}22`,
                  opacity: isActive ? 1 : isPast ? 0.7 : 0.45,
                }}
                title={`Fase ${phase.id}: ${phase.name} (Hari ${phase.dayStart}–${phase.dayEnd})`}
              >
                {/* Progress fill untuk fase aktif */}
                {isActive && (
                  <div className="absolute inset-0 left-0"
                    style={{
                      width: `${getPhaseProgress(currentDay, phase) * 100}%`,
                      background: `${phase.color}bb`,
                      transition: 'width 0.8s ease',
                    }}
                  />
                )}
                <span className="relative z-10 text-[10px] font-bold text-white/90 truncate px-1 hidden sm:block">
                  {phase.emoji}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hari marker di bawah */}
        <div className="flex mt-1">
          {displayPhases.map(phase => {
            const widthPct = ((phase.dayEnd - phase.dayStart + 1) / totalDays) * 100;
            return (
              <div key={phase.id} style={{ width: `${widthPct}%`, color: 'var(--surface-text-muted)' }}
                className="text-[9px] text-center truncate">
                H{phase.dayStart}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fase cards ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        {displayPhases.map(phase => {
          const isActive = phase.id === activePhase?.id;
          return (
            <div key={phase.id}
              className={cn(
                'rounded-xl p-2.5 border transition-all duration-300',
                isActive ? 'scale-[1.02]' : 'opacity-60'
              )}
              style={{
                background: isActive ? `${phase.color}18` : 'var(--surface-card)',
                borderColor: isActive ? phase.color : 'var(--surface-border)',
                boxShadow: isActive ? `0 0 12px ${phase.color}30` : 'none',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{phase.emoji}</span>
                <span className="text-[10px] font-bold truncate" style={{ color: isActive ? phase.color : 'var(--surface-text-muted)' }}>
                  {phase.name}
                </span>
              </div>
              <p className="text-[9px]" style={{ color: 'var(--surface-text-muted)' }}>
                Hari {phase.dayStart}–{phase.dayEnd >= 900 ? '∞' : phase.dayEnd}
              </p>
              <p className="text-[9px]" style={{ color: 'var(--surface-text-muted)' }}>
                {phase.frequencyPerDay}× / hari · {phase.waterVolumeLiters}L/tan
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
