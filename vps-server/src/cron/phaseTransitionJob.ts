import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
// Note: Pandya, please copy the growthStageService logic from the frontend to a shared lib in the backend
// import { PLANT_PROFILES, getDaysSincePlanting, getActivePhase, generateScheduleNames } from '../lib/growthStageService';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service_role to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

// Konstanta Debit Pompa (Liter/Menit). Sesuaikan dengan spesifikasi hardware di kebun.
const PUMP_CAPACITY_LPM = 100; 

export async function runMidnightPhaseCheck() {
  console.log('[Midnight Checker] Starting daily phase transition check...');

  try {
    // 1. Ambil semua zona yang memiliki planting_date (sedang aktif ditanami)
    const { data: zones, error } = await supabase
      .from('zones')
      .select('*')
      .not('planting_date', 'is', null);

    if (error) throw error;

    for (const zone of zones) {
      // Logika penghitungan HST dan Fase diletakkan di sini.
      // Karena ini contoh, pastikan mengimpor logika dari growthStageService
      
      /* CONTOH LOGIKA (Pseudocode):
      const hst = getDaysSincePlanting(zone.planting_date);
      const activePhase = getActivePhase(hst, zone.crop_type.toLowerCase());
      
      // Jika terjadi perpindahan fase (misal hari ini adalah hari pertama dari fase baru)
      if (activePhase && hst === activePhase.dayStart) {
        console.log(`[Zone ${zone.name}] Memasuki fase baru: ${activePhase.name}`);
        
        // a. Hapus semua jadwal lama untuk zona ini
        await supabase.from('schedules').delete().eq('zone_id', zone.id);

        // b. Hitung durasi pompa
        const plantCount = zone.plant_count || 100; // fallback jika kosong
        const totalWaterLiters = plantCount * activePhase.waterVolumeLiters;
        const durationMinutes = Math.ceil(totalWaterLiters / PUMP_CAPACITY_LPM);

        // c. Buat jadwal baru
        const newSchedules = activePhase.irrigationTimes.map((time, i) => {
          const [hour, minute] = time.split(':');
          return {
            zone_id: zone.id,
            name: `[Autopilot] ${activePhase.name} Sesi ${i + 1}`,
            cron_expression: `${minute} ${hour} * * *`,
            duration_minutes: durationMinutes,
            include_fertigation: activePhase.ecTargetMin > 0,
            is_active: true
          };
        });

        // d. Insert ke tabel schedules
        await supabase.from('schedules').insert(newSchedules);

        // e. Kirim notifikasi ke dashboard
        await supabase.from('notifications').insert({
          title: 'Transisi Fase Otomatis',
          body: `Zona ${zone.name} telah memasuki fase ${activePhase.name}. Jadwal penyiraman dan dosis nutrisi telah disesuaikan.`,
          type: 'cycle_complete',
          zone_name: zone.name,
          is_read: false
        });
      }
      */
    }
    
    console.log('[Midnight Checker] Finished successfully.');
  } catch (error) {
    console.error('[Midnight Checker] Error:', error);
  }
}

// Jadwalkan untuk berjalan setiap jam 00:01 tengah malam setiap hari
cron.schedule('1 0 * * *', () => {
  runMidnightPhaseCheck();
});
