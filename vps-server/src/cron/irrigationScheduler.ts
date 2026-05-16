// vps-server/src/cron/irrigationScheduler.ts
// Worker untuk menjalankan jadwal penyiraman/fertigasi otomatis
// Berjalan setiap menit untuk mengecek tabel 'schedules'

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { mqttClient } from '../mqtt/client';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Mengecek apakah cron expression (format: 'm h * * *' atau 'm h * * d')
 * cocok dengan waktu sekarang.
 */
function isCronMatch(expression: string): boolean {
  const now = new Date();
  const [min, hour, , , dayOfWeek] = expression.split(' ');
  
  const currentMin  = now.getMinutes();
  const currentHour = now.getHours();
  const currentDay  = (now.getDay() + 6) % 7; // Convert 0(Sun)-6(Sat) to 0(Mon)-6(Sun) matches UI

  const matchesMin  = min === '*' || parseInt(min) === currentMin;
  const matchesHour = hour === '*' || parseInt(hour) === currentHour;
  const matchesDay  = dayOfWeek === '*' || dayOfWeek.split(',').map(Number).includes(currentDay);

  return matchesMin && matchesHour && matchesDay;
}

export async function runScheduleCheck() {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  try {
    // 1. Ambil semua jadwal yang aktif
    const { data: activeSchedules, error } = await supabase
      .from('schedules')
      .select('*, zones(name)')
      .eq('is_active', true);

    if (error) throw error;
    if (!activeSchedules || activeSchedules.length === 0) return;

    for (const schedule of activeSchedules) {
      if (isCronMatch(schedule.cron_expression)) {
        console.log(`[Scheduler] Triggering: ${schedule.name} for ${schedule.zones?.name || schedule.zone_id} at ${timeStr}`);
        
        // 2. Tentukan target pompa berdasarkan mode (solenoid TIDAK lagi sebagai mode tersendiri)
        const isFertilizer = schedule.mode === 'fertilizer';
        const pumpTarget   = isFertilizer ? 'pump_pupuk' : 'pump';
        const irrigMode    = isFertilizer ? 'fertigation' : 'water';
        const zoneId       = schedule.zone_id;
        const durationSec  = schedule.duration_minutes * 60;

        // 3a. Buka solenoid TERLEBIH DAHULU (solenoid menutup 5 detik setelah pompa berhenti)
        const solenoidCommand = {
          action: 'on',
          mode: irrigMode,
          target: 'solenoid',
          duration_seconds: durationSec + 5,
          auto_stop: true,
          timestamp: Date.now(),
          source: 'schedule_auto_solenoid'
        };
        mqttClient.publish(zoneId, solenoidCommand);
        console.log(`[Scheduler] Solenoid opened automatically for zone ${zoneId}`);

        // 3b. Nyalakan pompa setelah jeda 1 detik (solenoid sudah terbuka)
        await new Promise(res => setTimeout(res, 1000));

        const pumpCommand = {
          action: 'on',
          mode: irrigMode,
          target: pumpTarget,
          duration_seconds: durationSec,
          auto_stop: true,
          timestamp: Date.now(),
          source: 'schedule'
        };
        mqttClient.publish(zoneId, pumpCommand);

        // 4. Update status zona ke database
        const zoneStatus = irrigMode === 'fertigation' ? 'fertigating' : 'irrigating';
        await supabase.from('zones').update({ status: zoneStatus }).eq('id', zoneId);

        // 5. Catat ke irrigation_logs
        await supabase.from('irrigation_logs').insert({
          zone_id: zoneId,
          zone_name: schedule.zones?.name || `Zone ${zoneId}`,
          mode: irrigMode,
          source: 'schedule',
          duration_minutes: schedule.duration_minutes,
          status: 'running',
          started_at: new Date().toISOString(),
        });

        // 6. Kirim notifikasi
        const modeLabel = isFertilizer ? 'Pupuk Cair' : 'Air Biasa';
        await supabase.from('notifications').insert({
          title: 'Penyiraman Terjadwal',
          body: `Memulai ${schedule.name} (${modeLabel}) di ${schedule.zones?.name || 'Zona'} — Solenoid terbuka otomatis.`,
          type: 'cycle_complete',
          zone_name: schedule.zones?.name,
          is_read: false
        });
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error execution:', err);
  }
}

// Jalankan setiap menit
export function startScheduler() {
  console.log('[Scheduler] Irrigation Worker started.');
  cron.schedule('* * * * *', () => {
    runScheduleCheck();
  });
}
