// vps-server/src/lib/fuzzyEngine.ts
// Fuzzy Logic Engine (Mamdani) for NutriGrow VPS Server
// Replicates frontend logic for autonomous execution on incoming telemetry data

function trapezoid(x: number, a: number, b: number, c: number, d: number): number {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > c && x < d) return (d - x) / (d - c);
  return 0;
}

function triangle(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > b && x < c) return (c - x) / (c - b);
  return 0;
}

export interface FuzzyCalculationResult {
  rawDuration: number;
  finalDuration: number;
  irrigationDecision: 'SIRAM_SEGERA' | 'SIRAM' | 'SIRAM_SEDIKIT' | 'TIDAK_PERLU';
  fertilizerDecision: 'PUPUK_TINGGI' | 'PUPUK_RENDAH' | 'TIDAK_PERLU';
  fertilizerAction: string;
  nutrisiMl: number;
  phAdjustment: 'up' | 'down' | null;
  humidityAdjusted: boolean;
  ecoAdjusted: boolean;
  rainDelayed: boolean;
}

export function calculateFuzzy(
  moisture: number,
  temp: number,
  humidity: number,
  ph: number,
  ec: number,
  willRain: boolean,
  ecoMode: boolean
): FuzzyCalculationResult {
  // 1. Fuzzification
  const moistureDry = trapezoid(moisture, 0, 0, 30, 50);
  const moistureNormal = triangle(moisture, 40, 60, 80);
  const moistureWet = trapezoid(moisture, 70, 85, 100, 100);

  const tempCold = trapezoid(temp, 0, 0, 18, 24);
  const tempWarm = triangle(temp, 22, 28, 32);
  const tempHot = trapezoid(temp, 30, 35, 60, 60);

  const humLow = trapezoid(humidity, 0, 0, 30, 50);
  const humMedium = triangle(humidity, 40, 65, 80);
  const humHigh = trapezoid(humidity, 70, 85, 100, 100);

  const phAcidic = trapezoid(ph, 0, 0, 5.0, 6.0);
  const phNeutral = triangle(ph, 5.8, 6.5, 7.2);
  const phAlkaline = trapezoid(ph, 7.0, 8.0, 14.0, 14.0);

  const ecLow = trapezoid(ec, 0, 0, 0.8, 1.5);
  const ecIdeal = triangle(ec, 1.2, 2.0, 2.8);
  const ecHigh = trapezoid(ec, 2.5, 3.2, 5.0, 5.0);

  // 2. Rules Evaluation (Irrigation)
  // R1: Kering AND Panas AND Rendah => SIRAM_SEGERA (25 min)
  const r1 = Math.min(moistureDry, tempHot, humLow);
  // R2: Kering AND Normal AND Sedang => SIRAM (15 min)
  const r2 = Math.min(moistureDry, tempWarm, humMedium);
  // R3: Kering AND Dingin AND Tinggi => SIRAM_SEDIKIT (8 min)
  const r3 = Math.min(moistureDry, tempCold, humHigh);
  // R4: Optimal AND Panas AND Rendah => SIRAM_SEDIKIT (8 min)
  const r4 = Math.min(moistureNormal, tempHot, humLow);
  // R5: Optimal AND Normal AND Sedang => TIDAK_PERLU (0 min)
  const r5 = Math.min(moistureNormal, tempWarm, humMedium);
  // R6: Basah => TIDAK_PERLU (0 min)
  const r6 = moistureWet;

  // 3. Defuzzification (Weighted Average)
  const sumActivation = r1 + r2 + r3 + r4 + r5 + r6;
  const sumWeight = (r1 * 25) + (r2 * 15) + (r3 * 8) + (r4 * 8) + (r5 * 0) + (r6 * 0);
  
  let rawDuration = sumActivation > 0 ? sumWeight / sumActivation : 0;
  rawDuration = Math.ceil(rawDuration); // Round up

  // 4. Adjustments
  let finalDuration = rawDuration;
  let humidityAdjusted = false;
  let ecoAdjusted = false;
  let rainDelayed = false;

  if (willRain) {
    finalDuration = 0;
    rainDelayed = true;
  } else {
    // High humidity cut (50% reduction if RH > 85%)
    if (humidity > 85 && finalDuration > 0) {
      finalDuration = Math.ceil(finalDuration * 0.5);
      humidityAdjusted = true;
    }
    // Eco Mode cut (30% reduction if ecoMode is active)
    if (ecoMode && finalDuration > 0) {
      finalDuration = Math.ceil(finalDuration * 0.7);
      ecoAdjusted = true;
    }
  }

  // Determine irrigation decision
  let irrigationDecision: 'SIRAM_SEGERA' | 'SIRAM' | 'SIRAM_SEDIKIT' | 'TIDAK_PERLU' = 'TIDAK_PERLU';
  if (finalDuration > 0) {
    const maxVal = Math.max(r1, r2, r3, r4);
    if (maxVal > 0) {
      if (maxVal === r1) irrigationDecision = 'SIRAM_SEGERA';
      else if (maxVal === r2) irrigationDecision = 'SIRAM';
      else irrigationDecision = 'SIRAM_SEDIKIT';
    }
  }

  // 5. Fertilizer & pH decisions
  let fertilizerDecision: 'PUPUK_TINGGI' | 'PUPUK_RENDAH' | 'TIDAK_PERLU' = 'TIDAK_PERLU';
  let fertilizerAction = 'Pupuk / pH adjuster tidak diperlukan';
  let nutrisiMl = 0;
  let phAdjustment: 'up' | 'down' | null = null;

  // pH adjustment
  if (ph < 5.8) {
    phAdjustment = 'up';
    fertilizerAction = 'Aktifkan larutan pengoreksi basa (pH Up)';
  } else if (ph > 7.2) {
    phAdjustment = 'down';
    fertilizerAction = 'Aktifkan larutan pengoreksi asam (pH Down)';
  }

  // Fertilizer
  if (ec < 1.2) {
    fertilizerDecision = 'PUPUK_TINGGI';
    nutrisiMl = 50;
    fertilizerAction = phAdjustment 
      ? `Tambahkan pupuk A&B 50ml + ${fertilizerAction}` 
      : 'Tambahkan pupuk cair A & B sebanyak 50 ml';
  } else if (ec <= 2.5) {
    fertilizerDecision = 'PUPUK_RENDAH';
    nutrisiMl = 15;
    fertilizerAction = phAdjustment 
      ? `Tambahkan pupuk A&B 15ml + ${fertilizerAction}`
      : 'Tambahkan pupuk cair A & B sebanyak 15 ml (pemeliharaan)';
  } else {
    fertilizerDecision = 'TIDAK_PERLU';
    nutrisiMl = 0;
    if (phAdjustment) {
      fertilizerAction = `Bilas garam di akar (Flushing) + ${fertilizerAction}`;
    } else {
      fertilizerAction = 'Bilas penumpukan garam di akar (Flushing)';
    }
  }

  return {
    rawDuration,
    finalDuration,
    irrigationDecision,
    fertilizerDecision,
    fertilizerAction,
    nutrisiMl,
    phAdjustment,
    humidityAdjusted,
    ecoAdjusted,
    rainDelayed
  };
}
