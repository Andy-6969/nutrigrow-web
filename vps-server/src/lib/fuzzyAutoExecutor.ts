// vps-server/src/lib/fuzzyAutoExecutor.ts
// Monitors incoming sensor data and automatically triggers actuators if fuzzy thresholds are met

import { supabase } from './supabase';
import { mqttClient } from '../mqtt/client';
import { calculateFuzzy } from './fuzzyEngine';

export async function evaluateFuzzyAuto(data: {
  zone_id: string;
  soil_moisture: number;
  temperature: number;
  humidity: number;
  ph: number;
  tds?: number;
}): Promise<void> {
  const zoneId = data.zone_id;

  try {
    // 1. Fetch zone configuration and current status
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('id, name, eco_mode, status')
      .eq('id', zoneId)
      .single();

    if (zoneError || !zone) {
      console.warn(`[FuzzyAuto] Zone ${zoneId} not found or query error:`, zoneError?.message);
      return;
    }

    // Skip if zone is not currently idle (already irrigating/fertigating)
    if (zone.status !== 'idle') {
      return;
    }

    // 2. Fetch the latest BMKG weather forecast
    const { data: weather } = await supabase
      .from('weather_data')
      .select('akan_hujan')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const willRain = weather?.akan_hujan ?? false;
    const ecoMode = zone.eco_mode ?? false;

    // 3. Compute fuzzy logic decisions
    const calc = calculateFuzzy(
      data.soil_moisture,
      data.temperature,
      data.humidity,
      data.ph,
      data.tds ?? 0,
      willRain,
      ecoMode
    );

    const hasIrrigation = calc.irrigationDecision !== 'TIDAK_PERLU' && calc.finalDuration > 0;
    const hasFertilizer = calc.fertilizerDecision !== 'TIDAK_PERLU' && calc.nutrisiMl > 0;

    if (!hasIrrigation && !hasFertilizer) {
      return; // No actions needed
    }

    console.log(`[FuzzyAuto] 🤖 Parameter Triggered for Zone: ${zone.name} — Soil Moisture: ${data.soil_moisture}%, Temp: ${data.temperature}°C, TDS: ${data.tds ?? 0} mS/cm`);
    console.log(`[FuzzyAuto] Actions -> Irrigation: ${calc.irrigationDecision} (${calc.finalDuration}m), Fertigation: ${calc.fertilizerDecision} (${calc.nutrisiMl}ml)`);

    // 4. Save recommendation into database with status 'auto_executed'
    const { data: rec, error: insertError } = await supabase
      .from('fuzzy_recommendations')
      .insert({
        zone_id: zoneId,
        zone_name: zone.name,
        soil_moisture: data.soil_moisture,
        temperature: data.temperature,
        humidity: data.humidity,
        ph: data.ph,
        ec: data.tds ?? 0,
        will_rain: willRain,
        irrigation_decision: calc.irrigationDecision,
        irrigation_score: calc.rawDuration > 0 ? Number((calc.rawDuration / 25).toFixed(2)) : 0,
        irrigation_duration: calc.finalDuration * 60, // in seconds
        fertilizer_decision: calc.fertilizerDecision,
        fertilizer_confidence: calc.fertilizerDecision !== 'TIDAK_PERLU' ? 0.95 : 0,
        fertilizer_action: calc.fertilizerAction,
        nutrisi_ml: calc.nutrisiMl,
        ph_adjustment: calc.phAdjustment,
        status: 'auto_executed',
        auto_execute_at: new Date().toISOString(),
        executed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !rec) {
      console.error('[FuzzyAuto] Failed to save automatic fuzzy recommendation:', insertError?.message);
      return;
    }

    // 5. Determine active commands based on decisions
    // If fertigation is required, prioritize fertilizer pump, else do normal water pump
    const isFertilizer = hasFertilizer && !hasIrrigation; 
    const irrigMode = isFertilizer ? 'fertigation' : 'water';
    const pumpTarget = isFertilizer ? 'pump_pupuk' : 'pump';
    
    // Duration: 2 minutes for fertilizer pump, or the calculated duration for water pump
    const durationMinutes = isFertilizer ? 2 : calc.finalDuration;
    const durationSeconds = durationMinutes * 60;

    // 6. Actuate Solenoid Valve first (solenoid closes 5 seconds after pump stops)
    const solenoidCommand = {
      action: 'on',
      mode: irrigMode,
      target: 'solenoid',
      duration_seconds: durationSeconds + 5,
      auto_stop: true,
      timestamp: Date.now(),
      source: 'fuzzy_auto'
    };
    mqttClient.publish(zoneId, solenoidCommand);

    // Wait 1 second before turning on the pump to ensure solenoid is open
    await new Promise((res) => setTimeout(res, 1000));

    // Actuate Pump
    const pumpCommand = {
      action: 'on',
      mode: irrigMode,
      target: pumpTarget,
      duration_seconds: durationSeconds,
      auto_stop: true,
      timestamp: Date.now(),
      source: 'fuzzy_auto'
    };
    mqttClient.publish(zoneId, pumpCommand);

    // 7. Update zone status to active
    const newZoneStatus = irrigMode === 'fertigation' ? 'fertigating' : 'irrigating';
    await supabase
      .from('zones')
      .update({ status: newZoneStatus })
      .eq('id', zoneId);

    // 8. Create irrigation log entry
    await supabase.from('irrigation_logs').insert({
      zone_id: zoneId,
      zone_name: zone.name,
      mode: irrigMode,
      source: 'auto',
      duration_minutes: durationMinutes,
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // 9. Create eco_savings_log entry if water was saved
    if (calc.rainDelayed || calc.humidityAdjusted || calc.ecoAdjusted) {
      let reason: 'rain_block' | 'humidity_reduction' | 'eco_mode' | 'combined' = 'combined';
      if (calc.rainDelayed && !calc.humidityAdjusted && !calc.ecoAdjusted) reason = 'rain_block';
      else if (!calc.rainDelayed && calc.humidityAdjusted && !calc.ecoAdjusted) reason = 'humidity_reduction';
      else if (!calc.rainDelayed && !calc.humidityAdjusted && calc.ecoAdjusted) reason = 'eco_mode';

      await supabase.from('eco_savings_log').insert({
        zone_id: zoneId,
        zone_name: zone.name,
        normal_duration: calc.rawDuration,
        eco_duration: calc.finalDuration,
        water_saved_liters: (calc.rawDuration - calc.finalDuration) * 10, // assuming 10L/min pump rate
        reason,
        eco_mode_active: ecoMode,
        humidity_at_time: data.humidity,
        will_rain_at_time: willRain,
        recommendation_id: rec.id,
      });
    }

    // 10. Send realtime UI notification
    const modeName = irrigMode === 'fertigation' ? 'Fertigasi Pupuk Cair' : 'Irigasi Air';
    const triggerDetail = isFertilizer
      ? `mendeteksi EC rendah (${(data.tds ?? 0).toFixed(2)} mS/cm). ${calc.fertilizerAction}.`
      : `mendeteksi kelembaban tanah rendah (${data.soil_moisture}%). Durasi: ${calc.finalDuration} menit.`;

    await supabase.from('notifications').insert({
      title: `${modeName} Otomatis Terpicu`,
      body: `Fuzzy Logic mengaktifkan aktuator secara mandiri di ${zone.name} karena ${triggerDetail}`,
      type: 'cycle_complete',
      zone_name: zone.name,
      is_read: false
    });

  } catch (err) {
    console.error('[FuzzyAuto] Error during auto fuzzy execution process:', err);
  }
}
