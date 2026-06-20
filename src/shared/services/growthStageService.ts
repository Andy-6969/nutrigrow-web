// src/shared/services/growthStageService.ts
// Engine kalkulasi fase pertumbuhan tanaman untuk NutriGrow Smart Fertigation

export type PlantType = 'tomato' | 'cabai' | 'lettuce' | 'custom';

export interface GrowthPhase {
  id: number;
  name: string;       // "Perkecambahan"
  nameEn: string;     // "Germination"
  dayStart: number;   // hari mulai (inklusif)
  dayEnd: number;     // hari akhir (inklusif)
  frequencyPerDay: number;
  irrigationTimes: string[];    // ["07:00", "17:00"]
  waterVolumeLiters: number;    // per tanaman
  ecTargetMin: number;          // mS/cm, 0 = tidak ada pupuk
  ecTargetMax: number;
  emoji: string;
  color: string;
}

export interface PlantProfile {
  type: PlantType;
  nameId: string;
  nameEn: string;
  phases: GrowthPhase[];
}

// ── Profil Tanaman ─────────────────────────────────────────────────────────

const TOMATO_PHASES: GrowthPhase[] = [
  {
    id: 1, name: 'Perkecambahan', nameEn: 'Germination',
    dayStart: 0, dayEnd: 7,
    frequencyPerDay: 2, irrigationTimes: ['07:00', '17:00'],
    waterVolumeLiters: 0.3, ecTargetMin: 0, ecTargetMax: 0,
    emoji: '🌱', color: '#86efac',
  },
  {
    id: 2, name: 'Bibit / Seedling', nameEn: 'Seedling',
    dayStart: 8, dayEnd: 21,
    frequencyPerDay: 2, irrigationTimes: ['06:00', '16:00'],
    waterVolumeLiters: 0.5, ecTargetMin: 0.8, ecTargetMax: 1.2,
    emoji: '🌿', color: '#4ade80',
  },
  {
    id: 3, name: 'Vegetatif', nameEn: 'Vegetative',
    dayStart: 22, dayEnd: 45,
    frequencyPerDay: 2, irrigationTimes: ['06:00', '15:00'],
    waterVolumeLiters: 1.0, ecTargetMin: 1.5, ecTargetMax: 2.0,
    emoji: '🍃', color: '#22c55e',
  },
  {
    id: 4, name: 'Pembungaan', nameEn: 'Flowering',
    dayStart: 46, dayEnd: 70,
    frequencyPerDay: 3, irrigationTimes: ['06:00', '12:00', '17:00'],
    waterVolumeLiters: 1.5, ecTargetMin: 2.0, ecTargetMax: 2.5,
    emoji: '🌸', color: '#f9a8d4',
  },
  {
    id: 5, name: 'Pembuahan', nameEn: 'Fruiting',
    dayStart: 71, dayEnd: 90,
    frequencyPerDay: 3, irrigationTimes: ['05:30', '12:00', '17:30'],
    waterVolumeLiters: 2.0, ecTargetMin: 2.0, ecTargetMax: 3.0,
    emoji: '🍅', color: '#ef4444',
  },
  {
    id: 6, name: 'Panen', nameEn: 'Harvest',
    dayStart: 91, dayEnd: 999,
    frequencyPerDay: 1, irrigationTimes: ['06:00'],
    waterVolumeLiters: 0.8, ecTargetMin: 1.0, ecTargetMax: 1.0,
    emoji: '🧺', color: '#f59e0b',
  },
];

const CABAI_PHASES: GrowthPhase[] = [
  {
    id: 1, name: 'Perkecambahan', nameEn: 'Germination',
    dayStart: 0, dayEnd: 10,
    frequencyPerDay: 2, irrigationTimes: ['07:00', '17:00'],
    waterVolumeLiters: 0.2, ecTargetMin: 0, ecTargetMax: 0,
    emoji: '🌱', color: '#86efac',
  },
  {
    id: 2, name: 'Bibit', nameEn: 'Seedling',
    dayStart: 11, dayEnd: 30,
    frequencyPerDay: 2, irrigationTimes: ['06:00', '16:00'],
    waterVolumeLiters: 0.4, ecTargetMin: 0.8, ecTargetMax: 1.0,
    emoji: '🌿', color: '#4ade80',
  },
  {
    id: 3, name: 'Vegetatif', nameEn: 'Vegetative',
    dayStart: 31, dayEnd: 60,
    frequencyPerDay: 2, irrigationTimes: ['06:00', '15:00'],
    waterVolumeLiters: 0.8, ecTargetMin: 1.2, ecTargetMax: 1.8,
    emoji: '🍃', color: '#22c55e',
  },
  {
    id: 4, name: 'Pembungaan', nameEn: 'Flowering',
    dayStart: 61, dayEnd: 90,
    frequencyPerDay: 3, irrigationTimes: ['06:00', '12:00', '17:00'],
    waterVolumeLiters: 1.2, ecTargetMin: 1.8, ecTargetMax: 2.5,
    emoji: '🌸', color: '#f9a8d4',
  },
  {
    id: 5, name: 'Pembuahan', nameEn: 'Fruiting',
    dayStart: 91, dayEnd: 120,
    frequencyPerDay: 3, irrigationTimes: ['06:00', '12:00', '17:30'],
    waterVolumeLiters: 1.5, ecTargetMin: 2.0, ecTargetMax: 2.8,
    emoji: '🌶️', color: '#dc2626',
  },
  {
    id: 6, name: 'Panen', nameEn: 'Harvest',
    dayStart: 121, dayEnd: 999,
    frequencyPerDay: 1, irrigationTimes: ['06:00'],
    waterVolumeLiters: 0.6, ecTargetMin: 1.0, ecTargetMax: 1.2,
    emoji: '🧺', color: '#f59e0b',
  },
];

const LETTUCE_PHASES: GrowthPhase[] = [
  {
    id: 1, name: 'Perkecambahan', nameEn: 'Germination',
    dayStart: 0, dayEnd: 5,
    frequencyPerDay: 2, irrigationTimes: ['07:00', '17:00'],
    waterVolumeLiters: 0.15, ecTargetMin: 0, ecTargetMax: 0.5,
    emoji: '🌱', color: '#86efac',
  },
  {
    id: 2, name: 'Bibit', nameEn: 'Seedling',
    dayStart: 6, dayEnd: 14,
    frequencyPerDay: 2, irrigationTimes: ['07:00', '16:00'],
    waterVolumeLiters: 0.3, ecTargetMin: 0.8, ecTargetMax: 1.2,
    emoji: '🌿', color: '#4ade80',
  },
  {
    id: 3, name: 'Pertumbuhan Daun', nameEn: 'Leaf Growth',
    dayStart: 15, dayEnd: 35,
    frequencyPerDay: 2, irrigationTimes: ['06:30', '15:00'],
    waterVolumeLiters: 0.5, ecTargetMin: 1.2, ecTargetMax: 1.8,
    emoji: '🥬', color: '#16a34a',
  },
  {
    id: 4, name: 'Panen', nameEn: 'Harvest',
    dayStart: 36, dayEnd: 999,
    frequencyPerDay: 1, irrigationTimes: ['07:00'],
    waterVolumeLiters: 0.3, ecTargetMin: 0.8, ecTargetMax: 1.0,
    emoji: '🧺', color: '#f59e0b',
  },
];

export const PLANT_PROFILES: Record<PlantType, PlantProfile> = {
  tomato: { type: 'tomato', nameId: 'Tomat', nameEn: 'Tomato', phases: TOMATO_PHASES },
  cabai:  { type: 'cabai',  nameId: 'Cabai', nameEn: 'Chili',  phases: CABAI_PHASES  },
  lettuce:{ type: 'lettuce',nameId: 'Selada',nameEn: 'Lettuce',phases: LETTUCE_PHASES },
  custom: { type: 'custom', nameId: 'Custom',nameEn: 'Custom',  phases: TOMATO_PHASES },
};

// ── Helper Functions ───────────────────────────────────────────────────────

/** Hitung hari sejak tanam (0-based) */
export function getDaysSincePlanting(plantingDate: string): number {
  const planted = new Date(plantingDate);
  const today = new Date();
  planted.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/** Ambil fase aktif berdasarkan hari dan profil tanaman */
export function getActivePhase(currentDay: number, plantType: PlantType): GrowthPhase | null {
  const profile = PLANT_PROFILES[plantType];
  if (!profile) return null;
  return profile.phases.find(p => currentDay >= p.dayStart && currentDay <= p.dayEnd) ?? null;
}

/** Generate schedule names dari fase aktif */
export function generateScheduleNames(
  phase: GrowthPhase,
  zoneName: string,
  zoneId: string,
  _plantCount: number
): Array<{ name: string; cron_expression: string; duration_minutes: number; zone_id: string; is_active: boolean; mode: 'water' | 'fertilizer' }> {
  return phase.irrigationTimes.map((time, i) => {
    const [hour, minute] = time.split(':').map(Number);
    const cron = `${minute} ${hour} * * *`;
    const isFertilizer = phase.ecTargetMin > 0;
    return {
      name: `[Auto] ${zoneName} — ${phase.name} Sesi ${i + 1} (${time})`,
      zone_id: zoneId,
      cron_expression: cron,
      duration_minutes: Math.round(phase.waterVolumeLiters * 5), // estimasi 5 mnt/0.2L
      is_active: true,
      mode: isFertilizer ? 'fertilizer' : 'water',
    };
  });
}

/** Progress fase dalam range 0–1 */
export function getPhaseProgress(currentDay: number, phase: GrowthPhase): number {
  if (phase.dayEnd >= 999) {
    // fase terakhir: progress = 1 setelah dayStart
    return Math.min(1, (currentDay - phase.dayStart) / 30);
  }
  const total = phase.dayEnd - phase.dayStart;
  const elapsed = currentDay - phase.dayStart;
  return Math.min(1, Math.max(0, elapsed / total));
}

/** Total progress dari seluruh siklus tanaman (untuk timeline) */
export function getTotalProgress(currentDay: number, plantType: PlantType): number {
  const profile = PLANT_PROFILES[plantType];
  const lastRealPhase = profile.phases.filter(p => p.dayEnd < 999).at(-1);
  if (!lastRealPhase) return 1;
  return Math.min(1, currentDay / lastRealPhase.dayEnd);
}
