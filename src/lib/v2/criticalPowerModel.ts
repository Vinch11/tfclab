// =============================================
// CRITICAL POWER / W' MODEL — Skiba (2012), Monod & Scherrer (1965)
// Two For Coaching Lab
// =============================================
//
// Implements:
// 1. Hyperbolic CP/W' regression from multi-duration power data
// 2. W'bal differential reconstitution model (Skiba 2012)
// 3. Optimal recovery prescription for interval training
// =============================================

// =============================================
// TYPES
// =============================================

export interface PowerDurationPoint {
  durationSec: number;
  powerWatts: number;
  label?: string;
}

export interface CPDiagnostic {
  code: string;
  severity: "warning" | "critical";
  message: string;
  detail: string;
}

export interface CriticalPowerResult {
  cp: number;            // Critical Power (W) — raw regression output
  effectiveCP: number;   // Effective CP (W) — bounded by FTP when CP is suspect
  wprime: number;        // W' (J) — anaerobic work capacity
  wprimeKJ: number;      // W' in kJ for display
  r2: number;            // Goodness of fit (0-1)
  cpWkg?: number;        // CP in W/kg
  effectiveCPWkg?: number; // Effective CP in W/kg
  wprimeJkg?: number;    // W' in J/kg
  points: PowerDurationPoint[];  // Points used for regression
  ftpCpRatio?: number;   // FTP / CP ratio (typically 0.93-1.0)
  diagnostics: CPDiagnostic[];  // Physiological plausibility warnings
  dataQuality: "good" | "suspect" | "implausible"; // Overall data quality
  cpBounded: boolean;    // true if effectiveCP was capped by FTP
}

export interface WbalState {
  timeSeconds: number;
  powerWatts: number;
  wbalJoules: number;    // Remaining W' at this instant
  wbalPct: number;       // W' remaining as % (0-100)
  depleted: boolean;     // W'bal ≤ 0
}

export interface IntervalRecovery {
  intervalPowerW: number;
  intervalDurationSec: number;
  recoveryPowerW: number;
  recoveryDurationSec: number;
  wbalAfterInterval: number;     // J remaining after work
  wbalAfterRecovery: number;     // J remaining after rest
  wbalPctAfterRecovery: number;  // % W' reconstituted
  canRepeat: boolean;            // Enough W' for another rep?
  maxReps: number;               // Max sustainable reps
}

export interface RecoveryPrescription {
  minRecoverySec: number;      // To restore ≥50% W'
  optimalRecoverySec: number;  // To restore ≥75% W'
  fullRecoverySec: number;     // To restore ≥95% W'
}

// =============================================
// 1. HYPERBOLIC CP/W' REGRESSION
// =============================================
// Model: P(t) = CP + W'/t  ⟹  Work(t) = CP × t + W'
// Linear regression on Work = f(t): slope = CP, intercept = W'

/**
 * Fit CP and W' from multi-duration power data using linear regression.
 * Requires at least 2 points, ideally 3-5 spanning 3s to 20min+.
 *
 * Sources:
 * - Monod H. & Scherrer J. (1965) – The work capacity of a synergic muscular group
 * - Hill D.W. (1993) – The critical power concept
 * - Jones A.M. et al. (2019) – Critical Power: Applications to sports medicine
 */
export function fitCriticalPower(points: (PowerDurationPoint | PowerDurationPointEx)[]): CriticalPowerResult | null {
  // Separate regression points from overlay points
  const allValid = points.filter(p => p.durationSec > 0 && p.powerWatts > 0);
  const regressionPoints = allValid.filter(p =>
    'regressionPoint' in p ? (p as PowerDurationPointEx).regressionPoint : true
  );

  // Need at least 2 regression data points
  if (regressionPoints.length < 2) return null;

  // Linear regression: Work(t) = CP × t + W'
  // y = work (J), x = duration (s)
  const n = regressionPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (const p of regressionPoints) {
    const x = p.durationSec;
    const y = p.powerWatts * p.durationSec; // Work in Joules
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const cp = (n * sumXY - sumX * sumY) / denom;
  const wprime = (sumY - cp * sumX) / n;

  // R² calculation (on regression points only)
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const p of regressionPoints) {
    const x = p.durationSec;
    const yActual = p.powerWatts * p.durationSec;
    const yPred = cp * x + wprime;
    ssTot += (yActual - yMean) ** 2;
    ssRes += (yActual - yPred) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Sanity checks — widened for elite athletes
  if (cp < 30 || cp > 800 || wprime < 500 || wprime > 80000) {
    return null; // Physiologically implausible
  }

  const cpRounded = Math.round(cp);
  return {
    cp: cpRounded,
    effectiveCP: cpRounded, // Will be adjusted by analyzeCriticalPower if FTP available
    wprime: Math.round(wprime),
    wprimeKJ: Math.round(wprime / 100) / 10, // 1 decimal kJ
    r2: Math.round(r2 * 1000) / 1000,
    points: allValid, // Return ALL points (regression + overlay) for display
    diagnostics: [], // Will be populated by analyzeCriticalPower
    dataQuality: "good",
    cpBounded: false,
  };
}

/**
 * Build power-duration points from snapshot data.
 * Maps snapshot fields to standardized durations.
 *
 * IMPORTANT — Scientific rationale for point selection:
 * - P5s is EXCLUDED from regression: 5s power is neuromuscular (PCr-driven),
 *   not well-modeled by the 2-parameter hyperbolic model (Jones 2019).
 * - FTP is EXCLUDED from regression: FTP ≠ 60-min power. Its duration varies
 *   40-70min per athlete, making it unsuitable as a fixed-duration anchor.
 *   Including it biases CP upward and compresses W'.
 *
 * Both P5s and FTP are returned as overlay points (regressionPoint: false)
 * for display on the power-duration curve.
 *
 * Valid regression range: ~30s to 5-7min (Jones et al., 2019)
 */
export interface PowerDurationPointEx extends PowerDurationPoint {
  regressionPoint: boolean; // true = used in CP/W' fit, false = overlay only
}

export function buildPointsFromSnapshot(snapshot: {
  pmax_5s?: number | null;
  p30s_w?: number | null;
  p60s_w?: number | null;
  map5min_w?: number | null;
  ftp?: number | null;
}): PowerDurationPointEx[] {
  const points: PowerDurationPointEx[] = [];

  // P5s — overlay only (neuromuscular, outside model validity)
  if (snapshot.pmax_5s && snapshot.pmax_5s > 0) {
    points.push({ durationSec: 5, powerWatts: snapshot.pmax_5s, label: "P5s", regressionPoint: false });
  }
  // P30s — valid regression point
  if (snapshot.p30s_w && snapshot.p30s_w > 0) {
    points.push({ durationSec: 30, powerWatts: snapshot.p30s_w, label: "P30s", regressionPoint: true });
  }
  // P60s — valid regression point
  if (snapshot.p60s_w && snapshot.p60s_w > 0) {
    points.push({ durationSec: 60, powerWatts: snapshot.p60s_w, label: "P60s", regressionPoint: true });
  }
  // MAP 5min — valid regression point (upper boundary of validity)
  if (snapshot.map5min_w && snapshot.map5min_w > 0) {
    points.push({ durationSec: 300, powerWatts: snapshot.map5min_w, label: "MAP5min", regressionPoint: true });
  }
  // FTP — overlay only (duration unknown, biases regression)
  if (snapshot.ftp && snapshot.ftp > 0) {
    points.push({ durationSec: 3600, powerWatts: snapshot.ftp, label: "FTP", regressionPoint: false });
  }

  return points;
}

/**
 * Full CP/W' analysis from snapshot, with enrichment.
 */
export function analyzeCriticalPower(snapshot: {
  pmax_5s?: number | null;
  p30s_w?: number | null;
  p60s_w?: number | null;
  map5min_w?: number | null;
  ftp?: number | null;
  weight_kg?: number | null;
}): CriticalPowerResult | null {
  const points = buildPointsFromSnapshot(snapshot);
  const result = fitCriticalPower(points);
  if (!result) return null;

  // Enrich with per-kg values
  if (snapshot.weight_kg && snapshot.weight_kg > 0) {
    result.cpWkg = Math.round((result.cp / snapshot.weight_kg) * 100) / 100;
    result.wprimeJkg = Math.round(result.wprime / snapshot.weight_kg);
  }

  // FTP/CP ratio
  if (snapshot.ftp && snapshot.ftp > 0) {
    result.ftpCpRatio = Math.round((snapshot.ftp / result.cp) * 1000) / 1000;
  }

  // =============================================
  // EFFECTIVE CP — bounded by FTP when suspect
  // =============================================
  // Physiologically, CP is ~5-15W above FTP. When regression gives CP >> FTP,
  // it means short-duration data isn't truly maximal. Rather than using an
  // inflated CP for recovery calculations (which would underestimate rest),
  // we cap effectiveCP at FTP + 10W.
  const CP_FTP_MAX_GAP = 20; // W — above this, CP is considered suspect
  const CP_FTP_EFFECTIVE_OFFSET = 10; // W — effectiveCP = FTP + this offset
  
  if (snapshot.ftp && snapshot.ftp > 0 && result.cp > snapshot.ftp + CP_FTP_MAX_GAP) {
    result.effectiveCP = snapshot.ftp + CP_FTP_EFFECTIVE_OFFSET;
    result.cpBounded = true;
  } else {
    result.effectiveCP = result.cp;
    result.cpBounded = false;
  }

  if (snapshot.weight_kg && snapshot.weight_kg > 0) {
    result.effectiveCPWkg = Math.round((result.effectiveCP / snapshot.weight_kg) * 100) / 100;
  }
  const diag: CPDiagnostic[] = [];

  // 1. CP vs FTP coherence — CP should be within ~5-15W of FTP (not 40W+)
  if (snapshot.ftp && snapshot.ftp > 0) {
    const cpFtpDiff = result.cp - snapshot.ftp;
    if (cpFtpDiff > 25) {
      diag.push({
        code: "CP_FTP_GAP",
        severity: "critical",
        message: `CP (${result.cp}W) surpasse FTP (${snapshot.ftp}W) de ${cpFtpDiff}W`,
        detail: `CP et FTP mesurent des seuils similaires. CP est généralement supérieur de 5-15W au FTP. Un écart de ${cpFtpDiff}W indique que les données de puissance courte (P30s, P60s, MAP5') ne sont probablement pas issues d'efforts maximaux, ou que le FTP est sous-estimé. Cela gonfle artificiellement CP et écrase W'.`,
      });
    } else if (cpFtpDiff > 15) {
      diag.push({
        code: "CP_FTP_GAP",
        severity: "warning",
        message: `Écart CP-FTP élevé (${cpFtpDiff}W)`,
        detail: `L'écart CP-FTP est à la limite haute. Vérifiez que les efforts courts sont bien des all-out et que le FTP est à jour.`,
      });
    }
  }

  // 2. W' plausibility — normal range 10-25 kJ, extreme sprinters up to 35 kJ
  if (result.wprimeKJ < 8) {
    diag.push({
      code: "WPRIME_LOW",
      severity: result.wprimeKJ < 5 ? "critical" : "warning",
      message: `W' anormalement bas (${result.wprimeKJ} kJ)`,
      detail: `La plage physiologique normale de W' est 10-25 kJ. Une valeur de ${result.wprimeKJ} kJ signifie que le modèle "voit" très peu de capacité anaérobie. Cause probable : la courbe de puissance est trop plate — les efforts courts (P30s, P60s) ne sont pas assez supérieurs à MAP5'. Cela arrive quand les tests ne sont pas des efforts maximaux all-out.`,
    });
  }
  // R4: ceiling — W' > 35 kJ est physiologiquement implausible (max sprinters world-class ~30-35 kJ)
  if (result.wprimeKJ > 35) {
    diag.push({
      code: "WPRIME_HIGH",
      severity: result.wprimeKJ > 45 ? "critical" : "warning",
      message: `W' anormalement élevé (${result.wprimeKJ} kJ)`,
      detail: `Le W' mesuré dépasse 35 kJ, ce qui n'est plausible que pour des sprinters de classe mondiale. Cause probable : P30s ou P60s issus d'un effort très court (sprint pur < 30s) qui surestime la composante anaérobie. Les calculs de prescription (repos, reps, W'bal) sont automatiquement plafonnés à 35 kJ pour éviter les sur-prescriptions.`,
    });
  }

  // 3. Power curve flatness — P60s should be significantly above MAP5min
  if (snapshot.p60s_w && snapshot.map5min_w && snapshot.p60s_w > 0 && snapshot.map5min_w > 0) {
    const ratio60to300 = snapshot.p60s_w / snapshot.map5min_w;
    if (ratio60to300 < 1.08) {
      diag.push({
        code: "FLAT_CURVE",
        severity: "warning",
        message: `Courbe trop plate : P60s/MAP5' = ${ratio60to300.toFixed(2)}`,
        detail: `Un cycliste produit typiquement 15-25% de plus sur 1 min que sur 5 min (ratio ~1.15-1.25). Un ratio de ${ratio60to300.toFixed(2)} est anormalement bas, ce qui force le modèle à surestimer CP et sous-estimer W'. Probable : effort non-maximal sur P60s ou P30s.`,
      });
    }
  }

  // 4. P30s vs P60s — P30s should be meaningfully higher
  if (snapshot.p30s_w && snapshot.p60s_w && snapshot.p30s_w > 0 && snapshot.p60s_w > 0) {
    const ratio30to60 = snapshot.p30s_w / snapshot.p60s_w;
    if (ratio30to60 < 1.15) {
      diag.push({
        code: "P30_P60_FLAT",
        severity: "warning",
        message: `P30s/P60s trop proche (ratio ${ratio30to60.toFixed(2)})`,
        detail: `On attend un ratio P30s/P60s de 1.25-1.50 (30s est un effort nettement plus intense que 60s). Un ratio de ${ratio30to60.toFixed(2)} suggère que le P30s n'est pas un vrai sprint maximal 30s.`,
      });
    }
  }

  // 5. MAP5min vs FTP — MAP5min should be 10-20% above FTP
  if (snapshot.map5min_w && snapshot.ftp && snapshot.map5min_w > 0 && snapshot.ftp > 0) {
    const mapFtpRatio = snapshot.map5min_w / snapshot.ftp;
    if (mapFtpRatio < 1.10) {
      diag.push({
        code: "MAP_FTP_CLOSE",
        severity: "warning",
        message: `MAP5'/FTP trop proche (ratio ${mapFtpRatio.toFixed(2)})`,
        detail: `MAP5' est typiquement 15-25% au-dessus du FTP. Un ratio de ${mapFtpRatio.toFixed(2)} suggère soit un MAP5' sous-estimé (test non-maximal sur 5 min), soit un FTP surestimé.`,
      });
    }
  }

  // 6. Regression with only 2 points — mathematically perfect but underdetermined
  const regPts = points.filter(p => p.regressionPoint).length;
  if (regPts === 2) {
    diag.push({
      code: "FEW_POINTS",
      severity: "warning",
      message: `Seulement 2 points de régression`,
      detail: `Avec 2 points, la régression est mathématiquement parfaite (R²=1.000) mais pas fiable. Le modèle n'a aucun degré de liberté pour détecter des erreurs. Ajoutez un 3ème point (idéalement un effort maximal 2-3 min) pour valider la cohérence.`,
    });
  }

  result.diagnostics = diag;
  result.dataQuality = diag.some(d => d.severity === "critical") ? "implausible"
    : diag.length > 0 ? "suspect" : "good";

  return result;
}

// =============================================
// 2. W'bal RECONSTITUTION MODEL — Skiba (2015)
// =============================================
// Differential equation (Skiba 2012):
//   dW'bal/dt = -(P - CP) × u(P - CP) + (W' - W'bal) / τ × u(CP - P)
//
// Where:
//   u(x) = 1 if x > 0, else 0 (Heaviside step)
//
// Simplified discrete integration (Skiba et al., 2015):
//   If P > CP:  W'bal[t] = W'bal[t-1] - (P - CP) × dt
//   If P ≤ CP:  W'bal[t] = W' - (W' - W'bal[t-1]) × exp(-dt/τ)
//
// τ from Skiba 2015 empirical model (NOT the 2012 τ=W'/(DCP×CP)):
//   τ = 546 × e^(−0.01 × DCP) + 316
//   DCP = CP − recovery_power

// =============================================
// W' PHYSIOLOGICAL FLOOR & CEILING (R3 + R4)
// =============================================
// FLOOR (10 kJ): When regression gives an implausibly low W' (< 10 kJ),
// recovery calculations cascade-fail (maxReps=0, near-zero rest durations).
// Root cause: non-maximal short-duration data → flat curve → W' compressed.
// Fix: for PRESCRIPTION purposes (not display), enforce a physiological floor.
//
// CEILING (35 kJ): When regression gives an implausibly high W' (> 35 kJ),
// recovery calculations over-prescribe (too many reps, too short rests).
// Root cause: P5s included or sprint power inflated → W' over-estimated.
// Literature: trained cyclists 12-25 kJ, world-class sprinters max 30-35 kJ.
// Fix: cap W' at 35 kJ for prescription. UI still shows raw value for transparency.
//
// The UI displays the RAW W' so the coach sees the data quality issue;
// only PRESCRIPTION paths (recovery, intervals, W'bal sim) use the bounded value.
const WPRIME_FLOOR_J = 10000;   // 10 kJ — physiological minimum for prescriptions
const WPRIME_CEILING_J = 35000; // 35 kJ — physiological maximum for prescriptions

/**
 * Apply W' floor + ceiling for prescription purposes.
 * Returns the value bounded between physiological floor and ceiling.
 */
export function effectiveWprime(wprimeJ: number): number {
  return Math.min(WPRIME_CEILING_J, Math.max(wprimeJ, WPRIME_FLOOR_J));
}

export interface WprimeClampMeta {
  /** Bounded value (J) — safe for prescriptions */
  value: number;
  /** Original raw W' (J) */
  rawJ: number;
  /** True if the floor or ceiling was applied */
  clamped: boolean;
  /** Which bound was hit, if any */
  bound: "floor" | "ceiling" | null;
  /** Human-readable reason (FR) for UI/annotation surfacing */
  reason: string | null;
}

/**
 * F39 — Surfaces W' clamping metadata so consumers (plan annotations, exports,
 * staff reports) can warn the coach when the raw W' was outside [10 ; 35] kJ.
 * Use this whenever the bounded value is consumed in a user-facing context;
 * `effectiveWprime()` remains available for pure numeric prescription paths.
 */
export function effectiveWprimeWithMeta(wprimeJ: number): WprimeClampMeta {
  const value = effectiveWprime(wprimeJ);
  if (wprimeJ < WPRIME_FLOOR_J) {
    return {
      value,
      rawJ: wprimeJ,
      clamped: true,
      bound: "floor",
      reason: `W' brut ${(wprimeJ / 1000).toFixed(1)}kJ < plancher 10kJ — borné pour prescription`,
    };
  }
  if (wprimeJ > WPRIME_CEILING_J) {
    return {
      value,
      rawJ: wprimeJ,
      clamped: true,
      bound: "ceiling",
      reason: `W' brut ${(wprimeJ / 1000).toFixed(1)}kJ > plafond 35kJ — borné pour prescription`,
    };
  }
  return { value, rawJ: wprimeJ, clamped: false, bound: null, reason: null };
}

/**
 * Calculate τ (time constant for W' reconstitution)
 *
 * Uses the empirical formula from Skiba et al. (2015):
 *   τ = 546 × e^(−0.01 × DCP) + 316
 *
 * Where DCP = CP − recovery_power (W).
 * Lower recovery power → larger DCP → shorter τ → faster reconstitution.
 *
 * IMPORTANT: For passive rest (0W), DCP = CP → τ is at its minimum (~350-400s).
 * For active rest at 40% CP, DCP is smaller → τ larger → slower reconstitution.
 * The recovery power assumption significantly affects prescribed rest durations.
 *
 * Source: Skiba P.F. et al. (2015) – Modelling the expenditure and reconstitution
 * of work capacity above critical power. Int J Sports Physiol Perform.
 */
export function calculateTau(
  cp: number,
  recoveryPower: number
): number {
  const dcp = cp - recoveryPower;
  if (dcp <= 0) return Infinity; // Recovery at or above CP = no reconstitution

  // Skiba 2015 empirical model — validated across trained cyclists
  const tau = 546 * Math.exp(-0.01 * dcp) + 316;
  // Typical τ range: ~350-850s depending on DCP
  return Math.max(200, Math.min(1500, tau));
}

/**
 * Simulate W'bal over a power trace (array of power values at 1s intervals).
 * Returns W'bal state at each second.
 */
export function simulateWbal(
  powerTrace: number[],
  cp: number,
  wprimeJ: number,
  dtSec: number = 1
): WbalState[] {
  // R3: apply physiological floor + ceiling so simulation matches prescription paths
  const wEff = effectiveWprime(wprimeJ);
  const states: WbalState[] = [];
  let wbal = wEff;

  for (let i = 0; i < powerTrace.length; i++) {
    const power = powerTrace[i];
    const time = i * dtSec;

    if (power > cp) {
      // Depletion phase
      wbal -= (power - cp) * dtSec;
    } else {
      // Reconstitution phase
      const tau = calculateTau(cp, power);
      wbal = wEff - (wEff - wbal) * Math.exp(-dtSec / tau);
    }

    // Clamp
    wbal = Math.max(0, Math.min(wEff, wbal));

    states.push({
      timeSeconds: time,
      powerWatts: power,
      wbalJoules: Math.round(wbal),
      wbalPct: Math.round((wbal / wEff) * 100),
      depleted: wbal <= 0,
    });
  }

  return states;
}

// =============================================
// 3. INTERVAL RECOVERY PRESCRIPTION
// =============================================

/**
 * Calculate W'bal after an interval + recovery, and prescribe optimal rest.
 * 
 * This is the key function for the AI plan generator:
 * Given interval parameters, it tells how long to rest between reps.
 */
export function prescribeIntervalRecovery(
  cp: number,
  wprimeJ: number,
  intervalPowerW: number,
  intervalDurationSec: number,
  recoveryPowerW: number = 0, // Default: passive rest (most conservative)
): IntervalRecovery & RecoveryPrescription {
  // Apply W' floor for prescription reliability
  const wEff = effectiveWprime(wprimeJ);
  
  // W'bal after interval work bout
  const wbalAfterWork = Math.max(0, wEff - (intervalPowerW - cp) * intervalDurationSec);

  // If interval power ≤ CP, no W' depletion
  if (intervalPowerW <= cp) {
    return {
      intervalPowerW,
      intervalDurationSec,
      recoveryPowerW,
      recoveryDurationSec: 60,
      wbalAfterInterval: wEff,
      wbalAfterRecovery: wEff,
      wbalPctAfterRecovery: 100,
      canRepeat: true,
      maxReps: 20,
      minRecoverySec: 30,
      optimalRecoverySec: 60,
      fullRecoverySec: 120,
    };
  }

  const tau = calculateTau(cp, recoveryPowerW);
  const depleted = wEff - wbalAfterWork;

  // Time to reconstitute to X% of W'
  // W'bal(t) = W' - depleted × exp(-t/τ)
  // Solve for t: t = -τ × ln((W' - target) / depleted)
  const solveTime = (targetPct: number): number => {
    const targetWbal = wEff * targetPct;
    if (targetWbal >= wEff) return Infinity;
    const remaining = wEff - targetWbal;
    if (remaining >= depleted || depleted <= 0) return 0;
    return Math.max(0, -tau * Math.log(remaining / depleted));
  };

  // Physiological minimum rest floors (even if W'bal math says 0):
  // - Neuromuscular recovery, lactate clearance, and O2 replenishment
  //   require time regardless of W' balance
  // - Floors based on work:rest ratio norms from exercise physiology literature
  const physioMinRest = intervalDurationSec <= 15
    ? intervalDurationSec * 6   // Sprint: 1:6 work:rest (e.g., 10s → 60s)
    : intervalDurationSec <= 30
    ? intervalDurationSec * 1   // 30/30 style: 1:1
    : intervalDurationSec <= 60
    ? intervalDurationSec * 1.5 // 1min reps: 1:1.5
    : intervalDurationSec <= 180
    ? intervalDurationSec * 0.75 // 3min reps: 1:0.75
    : intervalDurationSec * 0.5; // 5min+ reps: 1:0.5

  const rawMin = Math.round(solveTime(0.50));
  const rawOptimal = Math.round(solveTime(0.75));
  const rawFull = Math.round(solveTime(0.95));

  const minRecoverySec = Math.max(Math.round(physioMinRest * 0.7), rawMin);
  const optimalRecoverySec = Math.max(Math.round(physioMinRest), rawOptimal);
  const fullRecoverySec = Math.max(Math.round(physioMinRest * 1.5), rawFull);

  // Calculate W'bal after optimal recovery
  const wbalAfterRecovery = wEff - depleted * Math.exp(-optimalRecoverySec / tau);
  const wbalPctAfterRecovery = Math.round((wbalAfterRecovery / wEff) * 100);

  // Max reps via iterative W'bal simulation (accounts for progressive depletion)
  const wCostPerRep = (intervalPowerW - cp) * intervalDurationSec;
  let maxReps = 0;
  let simWbal = wEff;
  for (let rep = 0; rep < 30; rep++) {
    // Work phase: deplete
    simWbal = Math.max(0, simWbal - wCostPerRep);
    if (simWbal <= 0) break;
    maxReps++;
    // Recovery phase: reconstitute from current (diminished) W'bal
    const depletedNow = wEff - simWbal;
    simWbal = wEff - depletedNow * Math.exp(-optimalRecoverySec / tau);
    // Stop if next rep would deplete entirely
    if (simWbal - wCostPerRep <= 0) break;
  }

  return {
    intervalPowerW,
    intervalDurationSec,
    recoveryPowerW,
    recoveryDurationSec: optimalRecoverySec,
    wbalAfterInterval: Math.round(wbalAfterWork),
    wbalAfterRecovery: Math.round(wbalAfterRecovery),
    wbalPctAfterRecovery,
    canRepeat: wbalPctAfterRecovery > 30,
    maxReps: Math.min(20, maxReps),
    minRecoverySec,
    optimalRecoverySec,
    fullRecoverySec,
  };
}

/**
 * Recovery power strategy for interval prescriptions.
 * - "passive": 0W between reps (most conservative — shortest τ)
 * - "active-light": ~30% CP between reps (Z1, easy spin)
 * - "active-tempo": ~50% CP between reps (Z2, tempo recovery)
 *
 * Note: higher recovery power → longer τ → longer required rest.
 * Per-format overrides in the formats list still apply when defined.
 */
export type RecoveryPowerStrategy = "passive" | "active-light" | "active-tempo";

function resolveRecoveryPower(
  cp: number,
  formatRecPower: number,
  strategy: RecoveryPowerStrategy
): number {
  // If a format already specifies an active recovery (>0), keep it (over-under, etc.)
  if (formatRecPower > 0) return formatRecPower;
  switch (strategy) {
    case "active-tempo": return Math.round(cp * 0.50);
    case "active-light": return Math.round(cp * 0.30);
    case "passive":
    default: return 0;
  }
}

/**
 * Generate recovery prescriptions for common interval formats.
 * Used to inject into the AI plan generator prompt.
 *
 * @param recoveryStrategy R6: configurable inter-rep recovery power
 *   (default "passive" = 0W, most conservative). Per-format active recoveries
 *   (e.g. over-under) override this strategy.
 */
export function generateRecoveryTable(
  cp: number,
  wprimeJ: number,
  weightKg?: number,
  recoveryStrategy: RecoveryPowerStrategy = "passive"
): {
  format: string;
  intervalPower: string;
  optimalRest: string;
  maxReps: number;
  wprimeUsed: number; // Expose which W' was used (raw or floored)
}[] {
  const wEff = effectiveWprime(wprimeJ);

  // Default recovery power: resolved from strategy unless format overrides
  const formats = [
    { label: "30/30 VO2max", pctCP: 1.20, durSec: 30, recPower: 0 },
    { label: "1min @120%", pctCP: 1.20, durSec: 60, recPower: 0 },
    { label: "3min @VO2max", pctCP: 1.15, durSec: 180, recPower: 0 },
    { label: "5min @105%", pctCP: 1.05, durSec: 300, recPower: cp * 0.5 },
    { label: "Over-under 3min", pctCP: 1.05, durSec: 180, recPower: cp * 0.85 },
    { label: "Sprint 10s", pctCP: 2.00, durSec: 10, recPower: 0 },
  ];

  return formats.map(f => {
    const power = Math.round(cp * f.pctCP);
    const recPower = resolveRecoveryPower(cp, f.recPower, recoveryStrategy);
    const rx = prescribeIntervalRecovery(cp, wprimeJ, power, f.durSec, recPower);
    const powerLabel = weightKg ? `${power}W (${(power / weightKg).toFixed(1)}W/kg)` : `${power}W`;
    const formatRest = (sec: number) => sec >= 120 ? `${Math.round(sec / 60)}min` : `${sec}s`;

    return {
      format: f.label,
      intervalPower: powerLabel,
      optimalRest: `${formatRest(rx.minRecoverySec)}-${formatRest(rx.optimalRecoverySec)}`,
      maxReps: rx.maxReps,
      wprimeUsed: wEff,
    };
  });
}

/**
 * Format CP/W' analysis as text block for AI prompt injection.
 * IMPORTANT: Uses effectiveCP (bounded by FTP) for recovery prescriptions.
 */
export function formatCPWprimeForPrompt(
  cpResult: CriticalPowerResult,
  weightKg?: number,
  ftp?: number
): string {
  const lines: string[] = [];
  const useCP = cpResult.effectiveCP; // Always use effective CP for prescriptions

  lines.push(`\n#### ⚡ Modèle Critical Power / W' (Skiba — individualisé)`);
  lines.push(`- **CP (régression brute)** : ${cpResult.cp}W${cpResult.cpWkg ? ` (${cpResult.cpWkg} W/kg)` : ""}`);
  if (cpResult.cpBounded) {
    lines.push(`- **⚠️ CP effectif (borné par FTP)** : ${cpResult.effectiveCP}W${cpResult.effectiveCPWkg ? ` (${cpResult.effectiveCPWkg} W/kg)` : ""}`);
    lines.push(`  → Le CP brut (${cpResult.cp}W) est artificiellement gonflé (écart >${cpResult.cp - (ftp || 0)}W avec FTP). Le CP effectif = FTP+10W est utilisé pour les prescriptions de repos.`);
  }
  if (ftp) {
    lines.push(`- **FTP (terrain)** : ${ftp}W — référence principale pour l'intensité des séances`);
    lines.push(`  → Le FTP reste la métrique de référence pour calibrer les zones d'entraînement. CP n'est utilisé que pour le modèle W'bal de repos inter-séries.`);
  }
  const wEffJ = effectiveWprime(cpResult.wprime);
  const wEffKJ = Math.round(wEffJ / 100) / 10;
  const wprimeFloored = wEffJ > cpResult.wprime;
  
  lines.push(`- **W' (capacité anaérobie)** : ${cpResult.wprimeKJ} kJ${cpResult.wprimeJkg ? ` (${cpResult.wprimeJkg} J/kg)` : ""}`);
  if (wprimeFloored) {
    lines.push(`- **⚠️ W' effectif (plancher physiologique)** : ${wEffKJ} kJ — Le W' mesuré (${cpResult.wprimeKJ} kJ) est sous le seuil physiologique. Un plancher de 10 kJ est appliqué pour les prescriptions de repos afin d'éviter des repos irréalistes.`);
  }
  lines.push(`- **Qualité du modèle** : R²=${cpResult.r2} (${cpResult.r2 > 0.95 ? "excellent" : cpResult.r2 > 0.90 ? "bon" : "acceptable"}, ${cpResult.points.length} points)`);
  lines.push(`- **Qualité des données** : ${cpResult.dataQuality === "good" ? "✅ Cohérent" : cpResult.dataQuality === "suspect" ? "⚠️ À vérifier" : "🔴 Incohérence détectée"}`);

  // Include diagnostics in prompt so AI can adjust
  if (cpResult.diagnostics.length > 0) {
    lines.push(`\n⚠️ **ALERTES PHYSIOLOGIQUES** (le modèle CP/W' est potentiellement biaisé) :`);
    for (const d of cpResult.diagnostics) {
      lines.push(`- [${d.severity === "critical" ? "CRITIQUE" : "ATTENTION"}] ${d.message}`);
    }
    lines.push(`→ **CONSÉQUENCE POUR LE PLAN** : W' effectif de ${wEffKJ} kJ utilisé pour les prescriptions (plancher appliqué si W' mesuré < 10 kJ).`);
  }

  // CRITICAL: Always prioritize FTP over CP for training intensities
  lines.push(`\n#### 🎯 HIÉRARCHIE D'INTENSITÉ`);
  lines.push(`- **Zones d'entraînement** → TOUJOURS basées sur le FTP (${ftp || "n/a"}W), PAS sur le CP`);
  lines.push(`- **Repos inter-séries** → calculés via W'bal avec CP effectif (${useCP}W)`);
  lines.push(`- **CP brut (${cpResult.cp}W)** → affiché uniquement pour information, JAMAIS utilisé comme cible d'intensité`);

  // Recovery table — uses effectiveCP
  const recoveryTable = generateRecoveryTable(useCP, cpResult.wprime, weightKg);
  lines.push(`\n#### 🔄 Durées de Repos Optimales (W'bal Skiba 2012 — CP effectif ${useCP}W)`);
  lines.push(`| Format | Puissance | Repos optimal | Reps max |`);
  lines.push(`|--------|-----------|---------------|----------|`);
  for (const row of recoveryTable) {
    lines.push(`| ${row.format} | ${row.intervalPower} | ${row.optimalRest} | ${row.maxReps} |`);
  }
  lines.push(`\n⚠️ UTILISE CES DURÉES DE REPOS quand tu prescris des intervalles. Elles sont calculées individuellement à partir du W' de l'athlète.`);
  lines.push(`- Repos trop court = W' non reconstitué → qualité des répétitions dégradée dès la 3ème rep`);
  lines.push(`- Repos trop long = stimulus insuffisant → pas de surcompensation optimale`);

  return lines.join("\n");
}
