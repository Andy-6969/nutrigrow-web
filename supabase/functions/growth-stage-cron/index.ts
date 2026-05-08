// supabase/functions/growth-stage-cron/index.ts
// Supabase Edge Function — Cron Job Harian
// Cek zona mana yang berganti fase pertumbuhan hari ini
// dan kirim notifikasi ke pengguna terkait.
//
// Deploy:  supabase functions deploy growth-stage-cron
// Trigger: Supabase Dashboard → Edge Functions → Schedules → 0 22 * * * (UTC = 05:00 WIB)
//
// Docs: https://supabase.com/docs/guides/functions/schedule-functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Tipe ─────────────────────────────────────────────────────
interface ZoneRow {
  id: string;
  name: string;
  plant_type: string;
  planting_date: string;
}

interface GrowthPhase {
  id: number;
  name: string;
  emoji: string;
  dayStart: number;
  dayEnd: number;
}

// ─── Data Fase Pertumbuhan (mirror dari growthStageService.ts) ──
const PHASES: Record<string, GrowthPhase[]> = {
  tomato: [
    { id: 1, name: 'Perkecambahan',   emoji: '🌱', dayStart: 0,  dayEnd: 7   },
    { id: 2, name: 'Bibit / Seedling',emoji: '🌿', dayStart: 8,  dayEnd: 21  },
    { id: 3, name: 'Vegetatif',       emoji: '🍃', dayStart: 22, dayEnd: 45  },
    { id: 4, name: 'Pembungaan',      emoji: '🌸', dayStart: 46, dayEnd: 70  },
    { id: 5, name: 'Pembuahan',       emoji: '🍅', dayStart: 71, dayEnd: 90  },
    { id: 6, name: 'Panen',           emoji: '🧺', dayStart: 91, dayEnd: 999 },
  ],
  cabai: [
    { id: 1, name: 'Perkecambahan',   emoji: '🌱', dayStart: 0,   dayEnd: 10  },
    { id: 2, name: 'Bibit',           emoji: '🌿', dayStart: 11,  dayEnd: 30  },
    { id: 3, name: 'Vegetatif',       emoji: '🍃', dayStart: 31,  dayEnd: 60  },
    { id: 4, name: 'Pembungaan',      emoji: '🌸', dayStart: 61,  dayEnd: 90  },
    { id: 5, name: 'Pembuahan',       emoji: '🌶️', dayStart: 91,  dayEnd: 120 },
    { id: 6, name: 'Panen',           emoji: '🧺', dayStart: 121, dayEnd: 999 },
  ],
  lettuce: [
    { id: 1, name: 'Perkecambahan',    emoji: '🌱', dayStart: 0,  dayEnd: 5   },
    { id: 2, name: 'Bibit',            emoji: '🌿', dayStart: 6,  dayEnd: 14  },
    { id: 3, name: 'Pertumbuhan Daun', emoji: '🥬', dayStart: 15, dayEnd: 35  },
    { id: 4, name: 'Panen',            emoji: '🧺', dayStart: 36, dayEnd: 999 },
  ],
};

// ─── Helper ────────────────────────────────────────────────────
function getDaysSincePlanting(plantingDateStr: string): number {
  const planted = new Date(plantingDateStr);
  const today   = new Date();
  planted.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - planted.getTime()) / 86_400_000));
}

function getPhase(day: number, plantType: string): GrowthPhase | null {
  const phases = PHASES[plantType] ?? PHASES['tomato'];
  return phases.find(p => day >= p.dayStart && day <= p.dayEnd) ?? null;
}

// ─── Handler Utama ─────────────────────────────────────────────
Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  // Ambil semua zona yang punya planting_date
  const { data: zones, error } = await supabase
    .from('zones')
    .select('id, name, plant_type, planting_date')
    .not('planting_date', 'is', null);

  if (error || !zones) {
    console.error('[growth-stage-cron] Failed to fetch zones:', error?.message);
    return new Response(JSON.stringify({ error: 'Failed to fetch zones' }), { status: 500 });
  }

  const results: Array<{ zone: string; action: string }> = [];

  for (const zone of zones as ZoneRow[]) {
    const today = getDaysSincePlanting(zone.planting_date);
    const yesterday = today - 1;

    const phaseToday     = getPhase(today, zone.plant_type ?? 'tomato');
    const phaseYesterday = getPhase(yesterday, zone.plant_type ?? 'tomato');

    // Fase berganti hari ini → kirim notifikasi
    if (phaseToday && phaseYesterday && phaseToday.id !== phaseYesterday.id) {
      const { error: rpcError } = await supabase.rpc('insert_growth_stage_notification', {
        p_zone_id:    zone.id,
        p_phase_name: phaseToday.name,
        p_emoji:      phaseToday.emoji,
        p_day:        today,
      });

      if (rpcError) {
        console.error(`[growth-stage-cron] Failed to notify zone ${zone.name}:`, rpcError.message);
        results.push({ zone: zone.name, action: 'notify_failed' });
      } else {
        console.log(`[growth-stage-cron] ✅ Notified: ${zone.name} → Fase ${phaseToday.name}`);
        results.push({ zone: zone.name, action: `notified:${phaseToday.name}` });
      }
    } else {
      results.push({ zone: zone.name, action: 'no_change' });
    }
  }

  return new Response(JSON.stringify({
    timestamp: new Date().toISOString(),
    zones_checked: zones.length,
    results,
  }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
