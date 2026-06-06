/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL Adaptation Predictor™
 * Estime les adaptations physiologiques futures en fonction d'un levier
 * d'entraînement appliqué pendant 4-6 semaines.
 *
 * Répond à : "Si j'applique cette stratégie pendant un bloc,
 * quelles adaptations et quel impact performance ?"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { resolveVlamaxForGoal } from "@/lib/vlamaxResolver";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TrainingLeverId =
  | "volume_z2"
  | "threshold_work"
  | "glycolytic_block"
  | "max_force"
  | "running_economy"
  | "reduce_anaerobic"
  | "vo2max_intervals"
  | "train_low"
  | "norwegian_method"
  | "plyometrics"
  | "polarized_hi"
  | "increase_ftp_kg";

export interface TrainingLever {
  id: TrainingLeverId;
  label: string;
  description: string;
  emoji: string;
}

export interface PhysioState {
  vo2max: number | null;
  vlamax: number | null;
  fatmax_pct: number | null;
  lt2_pct: number | null;
  tte_min: number | null;
  durability_score: number | null;  // 0-100
  economy_score: number | null;     // 0-100
  ftp: number | null;
  weight_kg: number | null;
}

export type MetricId = "vo2max" | "vlamax" | "fatmax" | "lt2" | "tte" | "durability" | "economy";

export interface MetricDelta {
  id: MetricId;
  label: string;
  unit: string;
  current: number | null;
  projected: number | null;
  deltaMin: number;
  deltaMax: number;
  deltaMidPct: number;
  direction: "up" | "down" | "stable";
  significance: "major" | "moderate" | "minor" | "none";
  available: boolean;
}

export interface PerformancePrediction {
  distance: string;
  currentPace: string | null;
  projectedPace: string | null;
  improvementPct: number;
  explanation: string;
}

export interface AdaptationScenario {
  lever: TrainingLever;
  metrics: MetricDelta[];
  performancePredictions: PerformancePrediction[];
  overallImpactScore: number;   // 0-100
  impactLabel: string;
  recommendation: string;
}

export interface AdaptationPredictorResult {
  scenarios: AdaptationScenario[];
  bestScenarioId: TrainingLeverId;
  bestScenarioReason: string;
  currentState: PhysioState;
  objectif: string;
  limiterId: string | null;
  limiterLabel: string | null;
}

export interface AdaptationPredictorInput {
  snapshot: Record<string, unknown>;
  limiterId: string | null;
  limiterLabel: string | null;
  objectif: string;
  selectedLevers?: TrainingLeverId[];
  /** Sport principal de l'athlète (run / bike / tri / trail). Sert à résoudre
   *  correctement la VLamax via `resolveVlamaxForGoal` et à choisir le profil
   *  de pondération performance (Audit P0 — B1). */
  sportMain?: string | null;
  /** Durée du plan en semaines. Sert à moduler l'amplitude des deltas projetés
   *  via `durationFactor` (Audit P0 — B2). Défaut 6 semaines (référence). */
  weeksAvailable?: number;
}

/** Facteur d'échelle de la projection en fonction de la durée du plan.
 *  Référence = 6 semaines (= 1.0). Plancher 0.5 (plan court < 3 sem), plafond
 *  2.5 (plan > 15 sem — au-delà la trainability sature, cf. Bouchard 2011). */
function computeDurationFactor(weeksAvailable: number | undefined): number {
  if (!weeksAvailable || !Number.isFinite(weeksAvailable) || weeksAvailable <= 0) return 1;
  const raw = weeksAvailable / 6;
  return Math.max(0.5, Math.min(2.5, raw));
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVERS CATALOGUE
// ═══════════════════════════════════════════════════════════════════════════════

export const TRAINING_LEVERS: TrainingLever[] = [
  { id: "volume_z2", label: "Volume Z2", description: "Augmenter le volume en endurance fondamentale", emoji: "🏔️" },
  { id: "threshold_work", label: "Travail Seuil", description: "Intervalles au seuil lactique (LT2)", emoji: "⚡" },
  { id: "glycolytic_block", label: "Bloc Glycolytique", description: "Sprints et efforts anaérobies intenses", emoji: "🔥" },
  { id: "max_force", label: "Force Maximale", description: "Musculation et travail de force", emoji: "💪" },
  { id: "running_economy", label: "Travail Économie", description: "Drills, cadence, technique de course", emoji: "🦶" },
  { id: "reduce_anaerobic", label: "Réduction Anaérobie", description: "Suppression des intensités glycolytiques", emoji: "🧘" },
  { id: "vo2max_intervals", label: "VO₂max Intervalles", description: "Billat 30/30, 5×4min Z5 — développement du plafond aérobie", emoji: "🫁" },
  { id: "train_low", label: "Train Low", description: "Entraînement glycogène-restricted pour améliorer l'oxydation lipidique", emoji: "🍃" },
  { id: "norwegian_method", label: "Méthode Norvégienne", description: "Double seuil (2×20-25min @LT2) — protocole Ingebrigtsen/Blummenfelt", emoji: "🇳🇴" },
  { id: "plyometrics", label: "Pliométrie", description: "Drop jumps, bounds, réactivité — amélioration économie neuromusculaire", emoji: "🦘" },
  { id: "polarized_hi", label: "Polarisé 80/20 Intensifié", description: "80% Z1-Z2 + 20% Z5-Z6 — maximiser les adaptations aérobies", emoji: "⚖️" },
  { id: "increase_ftp_kg", label: "Développer FTP/kg", description: "Sweet spot, over-unders, tempo — améliorer la puissance relative", emoji: "📊" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EFFETS ATTENDUS PAR LEVIER (min%, max% de variation)
// Positif = augmentation, Négatif = diminution
// ═══════════════════════════════════════════════════════════════════════════════

interface LeverEffect {
  metric: MetricId;
  minPct: number;
  maxPct: number;
}

const LEVER_EFFECTS: Record<TrainingLeverId, LeverEffect[]> = {
  volume_z2: [
    { metric: "vo2max", minPct: 1, maxPct: 3 },
    { metric: "fatmax", minPct: 5, maxPct: 10 },
    { metric: "vlamax", minPct: -3, maxPct: -1 },      // Légère baisse (bien pour endurance)
    { metric: "durability", minPct: 5, maxPct: 12 },
    { metric: "tte", minPct: 3, maxPct: 8 },
    { metric: "economy", minPct: 1, maxPct: 3 },
    { metric: "lt2", minPct: 1, maxPct: 3 },
  ],
  threshold_work: [
    { metric: "lt2", minPct: 3, maxPct: 6 },
    { metric: "tte", minPct: 10, maxPct: 20 },
    { metric: "fatmax", minPct: 1, maxPct: 3 },
    { metric: "vo2max", minPct: 0, maxPct: 1 },
    { metric: "vlamax", minPct: -2, maxPct: 0 },
    { metric: "durability", minPct: 2, maxPct: 5 },
    { metric: "economy", minPct: 0, maxPct: 2 },
  ],
  glycolytic_block: [
    // P1 recalibration — Lievens 2020 : chez athlètes déjà entraînés,
    // un bloc glycolytique 4-8 sem ne déplace VLamax que de +3 à +8% (et non +15%).
    { metric: "vlamax", minPct: 3, maxPct: 8 },
    { metric: "vo2max", minPct: 1, maxPct: 3 },
    { metric: "fatmax", minPct: -6, maxPct: -2 },
    { metric: "durability", minPct: -4, maxPct: -1 },
    { metric: "tte", minPct: -4, maxPct: 0 },
    { metric: "economy", minPct: 0, maxPct: 1 },
    { metric: "lt2", minPct: 0, maxPct: 2 },
  ],
  max_force: [
    { metric: "economy", minPct: 3, maxPct: 8 },
    { metric: "vo2max", minPct: 0, maxPct: 1 },
    { metric: "vlamax", minPct: -2, maxPct: 2 },
    { metric: "fatmax", minPct: 0, maxPct: 2 },
    { metric: "durability", minPct: 0, maxPct: 3 },
    { metric: "tte", minPct: 0, maxPct: 3 },
    { metric: "lt2", minPct: 1, maxPct: 3 },
  ],
  running_economy: [
    { metric: "economy", minPct: 3, maxPct: 8 },
    { metric: "vo2max", minPct: 0, maxPct: 1 },
    { metric: "vlamax", minPct: 0, maxPct: 0 },
    { metric: "fatmax", minPct: 0, maxPct: 2 },
    { metric: "durability", minPct: 1, maxPct: 3 },
    { metric: "tte", minPct: 1, maxPct: 5 },
    { metric: "lt2", minPct: 1, maxPct: 3 },
  ],
  reduce_anaerobic: [
    { metric: "vlamax", minPct: -10, maxPct: -5 },     // Forte baisse (très bon pour endurance)
    { metric: "fatmax", minPct: 3, maxPct: 8 },
    { metric: "durability", minPct: 3, maxPct: 8 },
    { metric: "vo2max", minPct: -1, maxPct: 1 },
    { metric: "tte", minPct: 2, maxPct: 8 },
    { metric: "economy", minPct: 0, maxPct: 2 },
    { metric: "lt2", minPct: 1, maxPct: 4 },
  ],
  vo2max_intervals: [
    { metric: "vo2max", minPct: 3, maxPct: 6 },
    { metric: "lt2", minPct: 2, maxPct: 4 },
    { metric: "tte", minPct: 2, maxPct: 5 },
    { metric: "vlamax", minPct: 0, maxPct: 3 },       // Légère hausse possible
    { metric: "fatmax", minPct: -2, maxPct: 0 },
    { metric: "durability", minPct: 0, maxPct: 2 },
    { metric: "economy", minPct: 1, maxPct: 3 },
  ],
  train_low: [
    { metric: "fatmax", minPct: 8, maxPct: 15 },
    { metric: "vlamax", minPct: -6, maxPct: -2 },
    { metric: "durability", minPct: 5, maxPct: 10 },
    { metric: "vo2max", minPct: 0, maxPct: 2 },
    { metric: "tte", minPct: 2, maxPct: 6 },
    { metric: "economy", minPct: 0, maxPct: 2 },
    { metric: "lt2", minPct: 0, maxPct: 2 },
  ],
  norwegian_method: [
    // P1 recalibration — Seiler 2010, Sylta/Tønnessen 2016, Casado/Foster 2022 :
    // double seuil sur un bloc 6-12 sem améliore TTE de +5 à +15% (et non +25%, ordre saisonnier).
    { metric: "lt2", minPct: 3, maxPct: 6 },
    { metric: "tte", minPct: 5, maxPct: 15 },
    { metric: "vo2max", minPct: 1, maxPct: 3 },
    { metric: "vlamax", minPct: -3, maxPct: -1 },
    { metric: "fatmax", minPct: 1, maxPct: 3 },
    { metric: "durability", minPct: 2, maxPct: 6 },
    { metric: "economy", minPct: 1, maxPct: 3 },
  ],
  plyometrics: [
    { metric: "economy", minPct: 4, maxPct: 8 },      // Hewett 2007, Beattie 2017
    { metric: "vo2max", minPct: 0, maxPct: 1 },
    { metric: "vlamax", minPct: 0, maxPct: 3 },
    { metric: "fatmax", minPct: 0, maxPct: 1 },
    { metric: "durability", minPct: 1, maxPct: 3 },
    { metric: "tte", minPct: 0, maxPct: 2 },
    { metric: "lt2", minPct: 1, maxPct: 3 },
  ],
  polarized_hi: [
    { metric: "vo2max", minPct: 2, maxPct: 5 },
    { metric: "fatmax", minPct: 3, maxPct: 7 },
    { metric: "vlamax", minPct: -4, maxPct: -1 },
    { metric: "durability", minPct: 4, maxPct: 8 },
    { metric: "tte", minPct: 3, maxPct: 8 },
    { metric: "economy", minPct: 1, maxPct: 3 },
    { metric: "lt2", minPct: 2, maxPct: 4 },
  ],
  increase_ftp_kg: [
    { metric: "lt2", minPct: 3, maxPct: 6 },
    { metric: "tte", minPct: 5, maxPct: 12 },
    { metric: "vo2max", minPct: 1, maxPct: 3 },
    { metric: "vlamax", minPct: -2, maxPct: 0 },
    { metric: "fatmax", minPct: 1, maxPct: 4 },
    { metric: "durability", minPct: 2, maxPct: 5 },
    { metric: "economy", minPct: 0, maxPct: 2 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC CONFIGS
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricConfig {
  id: MetricId;
  label: string;
  unit: string;
  higherIsBetter: boolean;
}

const METRIC_CONFIGS: MetricConfig[] = [
  { id: "vo2max", label: "VO₂max", unit: "mL/kg/min", higherIsBetter: true },
  { id: "vlamax", label: "VLamax", unit: "mmol/L/s", higherIsBetter: false },
  { id: "fatmax", label: "FatMax", unit: "% FTP", higherIsBetter: true },
  { id: "lt2", label: "LT2", unit: "% VO₂max", higherIsBetter: true },
  { id: "tte", label: "TTE", unit: "min", higherIsBetter: true },
  { id: "durability", label: "Durabilité", unit: "score", higherIsBetter: true },
  { id: "economy", label: "Économie", unit: "score", higherIsBetter: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACT STATE FROM SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════

function extractPhysioState(
  snapshot: Record<string, unknown>,
  objectif: string,
  sportMain: string | null | undefined,
): PhysioState {
  const vo2max = (snapshot.vo2max as number) ?? null;
  // Résolution VLamax sport-aware (run/trail → vlamax_run, bike/tri → vlamax).
  // Audit P0 — B1: on passe explicitement `objectif` et `sportMain` au resolver
  // (au lieu de relire `snapshot.objectif` qui n'était quasi jamais peuplé,
  // ce qui faisait fallback systématique sur la VLamax vélo pour les coureurs).
  const vlamax = resolveVlamaxForGoal(
    {
      vlamax: snapshot.vlamax as number | null,
      vlamax_run: snapshot.vlamax_run as number | null,
      sport_main: (snapshot.sport_main as string | null) ?? sportMain ?? null,
      vma: snapshot.vma as number | null,
      pace_threshold_sec_per_km: snapshot.pace_threshold_sec_per_km as number | null,
      tte_observed_min: snapshot.tte_observed_min as number | null,
      sprint_15s_distance: snapshot.sprint_15s_distance as number | null,
      running_power_max: snapshot.running_power_max as number | null,
      running_power_threshold: snapshot.running_power_threshold as number | null,
      vlamax_source: snapshot.vlamax_source as string | null,
      vlamax_protocol: snapshot.vlamax_protocol as string | null,
      vo2max,
    },
    { goal: objectif, objectif }
  ).value;
  const ftp = (snapshot.ftp as number) ?? null;
  const weight_kg = (snapshot.weight_kg as number) ?? null;

  // Estimate FatMax from VLamax (+ VO2max si dispo)
  // Audit 2D F23/F25: formule canonique TFCL alignée `fatmaxTFCL.computeFatMaxTFCL`
  // FatMax_%FTP = clamp(78 − 52·(VLa − 0.25) + 0.15·(VO2 − 50), 48, 82)
  let fatmax_pct: number | null = null;
  if (vlamax !== null) {
    const vo2Term = vo2max && Number.isFinite(vo2max) && vo2max > 0 ? 0.15 * (vo2max - 50) : 0;
    fatmax_pct = Math.max(48, Math.min(82, 78 - 52 * (vlamax - 0.25) + vo2Term));
  }

  // Estimate LT2 as % VO2max (~78-88% typical)
  // Audit P0 — B4: coefficient Jeukendrup 1997 (VO2 = FTP/kg × 10.8 + 7),
  // l'ancien × 12 + 5 surestimait lt2_pct de ~11 %.
  let lt2_pct: number | null = null;
  if (vo2max && ftp && weight_kg && weight_kg > 0) {
    const ftpVo2 = (ftp / weight_kg) * 10.8 + 7;
    lt2_pct = Math.min(95, Math.max(70, (ftpVo2 / vo2max) * 100));
  }

  const tte_min = (snapshot.tte_observed_min as number) ?? null;

  // Durability from HR drift (Maunder 2021) — seul proxy physiologique fiable.
  // Audit P2 — fix: l'ancien fallback `durability ≈ tte × 1.5` n'a aucune base
  // (TTE ≠ durabilité aérobie tardive). On respecte la politique
  // "Insufficient Data No Fake Defaults" → null si HR drift absent.
  let durability_score: number | null = null;
  const hrDrift = snapshot.run_hr_drift_pct as number | null;
  if (hrDrift !== null && hrDrift !== undefined && Number.isFinite(hrDrift)) {
    durability_score = Math.max(0, Math.min(100, 100 - hrDrift * 5));
  }

  const economy_score = (snapshot.run_economy_score as number) ?? null;

  return { vo2max, vlamax, fatmax_pct, lt2_pct, tte_min, durability_score, economy_score, ftp, weight_kg };
}

function getMetricValue(state: PhysioState, id: MetricId): number | null {
  switch (id) {
    case "vo2max": return state.vo2max;
    case "vlamax": return state.vlamax;
    case "fatmax": return state.fatmax_pct;
    case "lt2": return state.lt2_pct;
    case "tte": return state.tte_min;
    case "durability": return state.durability_score;
    case "economy": return state.economy_score;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE PREDICTION — sport-aware (Audit P0 — B3)
// Les pondérations métriques varient selon le sport principal et l'objectif
// (route, trail, bike, tri). On retourne 2 à 3 "distances" pertinentes.
// ═══════════════════════════════════════════════════════════════════════════════

type DistKey =
  | "10k" | "semi" | "marathon"
  | "trail_short" | "trail_long" | "trail_ultra"
  | "ftp_test" | "ftp_4h" | "gran_fondo"
  | "sprint_tri" | "olympic_tri" | "half_im" | "ironman";

const DISTANCE_WEIGHTS: Record<DistKey, Record<MetricId, number>> = {
  // Course route
  "10k":       { vo2max: 0.30, vlamax: 0.10, fatmax: 0.05, lt2: 0.25, tte: 0.15, durability: 0.05, economy: 0.10 },
  "semi":      { vo2max: 0.20, vlamax: 0.15, fatmax: 0.10, lt2: 0.20, tte: 0.15, durability: 0.10, economy: 0.10 },
  "marathon":  { vo2max: 0.15, vlamax: 0.20, fatmax: 0.15, lt2: 0.15, tte: 0.10, durability: 0.15, economy: 0.10 },
  // Trail (fatmax + durability + economy dominants)
  "trail_short": { vo2max: 0.20, vlamax: 0.15, fatmax: 0.10, lt2: 0.15, tte: 0.10, durability: 0.15, economy: 0.15 },
  "trail_long":  { vo2max: 0.12, vlamax: 0.15, fatmax: 0.20, lt2: 0.10, tte: 0.10, durability: 0.20, economy: 0.13 },
  "trail_ultra": { vo2max: 0.08, vlamax: 0.12, fatmax: 0.25, lt2: 0.08, tte: 0.10, durability: 0.25, economy: 0.12 },
  // Cyclisme (LT2 + VO2max + FTP/kg = TTE)
  "ftp_test":   { vo2max: 0.30, vlamax: 0.10, fatmax: 0.05, lt2: 0.30, tte: 0.15, durability: 0.05, economy: 0.05 },
  "ftp_4h":     { vo2max: 0.15, vlamax: 0.15, fatmax: 0.20, lt2: 0.15, tte: 0.10, durability: 0.20, economy: 0.05 },
  "gran_fondo": { vo2max: 0.15, vlamax: 0.15, fatmax: 0.20, lt2: 0.15, tte: 0.10, durability: 0.20, economy: 0.05 },
  // Triathlon
  "sprint_tri":  { vo2max: 0.28, vlamax: 0.12, fatmax: 0.05, lt2: 0.25, tte: 0.15, durability: 0.05, economy: 0.10 },
  "olympic_tri": { vo2max: 0.22, vlamax: 0.15, fatmax: 0.08, lt2: 0.22, tte: 0.13, durability: 0.10, economy: 0.10 },
  "half_im":     { vo2max: 0.15, vlamax: 0.18, fatmax: 0.15, lt2: 0.15, tte: 0.10, durability: 0.17, economy: 0.10 },
  "ironman":     { vo2max: 0.10, vlamax: 0.20, fatmax: 0.20, lt2: 0.10, tte: 0.08, durability: 0.22, economy: 0.10 },
};

const DISTANCE_LABELS: Record<DistKey, string> = {
  "10k": "10 km",
  "semi": "Semi-marathon",
  "marathon": "Marathon",
  "trail_short": "Trail court (< 25 km)",
  "trail_long": "Trail long (25–80 km)",
  "trail_ultra": "Ultra (> 80 km)",
  "ftp_test": "FTP / CLM 40 km",
  "ftp_4h": "Sortie longue 4 h",
  "gran_fondo": "Gran Fondo",
  "sprint_tri": "Triathlon S",
  "olympic_tri": "Triathlon M",
  "half_im": "Half Ironman",
  "ironman": "Ironman",
};

/** Sélectionne 3 distances pertinentes à projeter selon le sport et l'objectif. */
function pickPerformanceDistances(objectif: string, sportMain: string | null | undefined): DistKey[] {
  const obj = (objectif || "").toLowerCase();
  const sport = (sportMain || "").toLowerCase();

  // Objectif explicite prioritaire
  if (/ultra|utmb|ccc|tor|diagonal/.test(obj)) return ["trail_long", "trail_ultra", "trail_short"];
  if (/trail/.test(obj)) return ["trail_short", "trail_long", "trail_ultra"];
  if (/ironman\b|im\b|140\.6/.test(obj)) return ["ironman", "half_im", "olympic_tri"];
  if (/half[\s-]?ironman|70\.3|h70/.test(obj)) return ["half_im", "olympic_tri", "ironman"];
  if (/olympic|m\b|distance m/.test(obj)) return ["olympic_tri", "sprint_tri", "half_im"];
  if (/sprint.*tri|tri.*sprint|s\b/.test(obj)) return ["sprint_tri", "olympic_tri", "half_im"];
  if (/marathon|42/.test(obj)) return ["marathon", "semi", "10k"];
  if (/semi|half|21/.test(obj)) return ["semi", "10k", "marathon"];
  if (/10.?k|10000/.test(obj)) return ["10k", "semi", "marathon"];
  if (/5.?k|5000/.test(obj)) return ["10k", "semi", "marathon"];
  if (/ftp|clm|chrono|tt\b/.test(obj)) return ["ftp_test", "ftp_4h", "gran_fondo"];
  if (/fondo|cyclo|gran/.test(obj)) return ["gran_fondo", "ftp_4h", "ftp_test"];

  // Fallback par sport
  if (sport === "bike" || sport === "cyclisme") return ["ftp_test", "ftp_4h", "gran_fondo"];
  if (sport === "tri" || sport === "triathlon") return ["olympic_tri", "half_im", "ironman"];
  if (sport === "trail") return ["trail_short", "trail_long", "trail_ultra"];
  if (sport === "run" || sport === "cap" || sport === "course") return ["10k", "semi", "marathon"];

  // Dernier recours
  return ["10k", "semi", "marathon"];
}

function estimatePerformanceImpact(
  metrics: MetricDelta[],
  objectif: string,
  sportMain: string | null | undefined,
): PerformancePrediction[] {
  const distances = pickPerformanceDistances(objectif, sportMain);

  return distances.map(dist => {
    const weights = DISTANCE_WEIGHTS[dist];
    const label = DISTANCE_LABELS[dist];
    let totalImpact = 0;

    for (const metric of metrics) {
      if (!metric.available) continue;
      const w = weights[metric.id] || 0;
      let effectiveDelta = metric.deltaMidPct;
      const config = METRIC_CONFIGS.find(c => c.id === metric.id);
      if (config && !config.higherIsBetter) {
        effectiveDelta = -effectiveDelta;
      }
      totalImpact += effectiveDelta * w;
    }

    // Scale: 1% physiological improvement ≈ 0.5-0.8% performance improvement
    const perfImprovementPct = totalImpact * 0.6;

    return {
      distance: label,
      currentPace: null,
      projectedPace: null,
      improvementPct: Math.round(perfImprovementPct * 10) / 10,
      explanation: perfImprovementPct > 1.5
        ? `Gain significatif attendu sur ${label}`
        : perfImprovementPct > 0.5
          ? `Amélioration modérée sur ${label}`
          : perfImprovementPct > 0
            ? `Impact marginal sur ${label}`
            : `Risque de régression sur ${label}`,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD SCENARIO
// ═══════════════════════════════════════════════════════════════════════════════

function buildScenario(
  lever: TrainingLever,
  state: PhysioState,
  objectif: string,
  sportMain: string | null | undefined,
  durationFactor: number,
  limiterId: string | null,
): AdaptationScenario {
  const effects = LEVER_EFFECTS[lever.id];

  // Audit P2 — trainability différentielle.
  // Si le levier cible explicitement le limiteur, on amplifie les métriques
  // directement liées et on amortit légèrement les autres effets du même levier.
  const leverTargetsLimiter = limiterId
    ? (LIMITER_TO_LEVERS[limiterId] || []).includes(lever.id)
    : false;
  const targetedMetrics = limiterId ? (LIMITER_TO_METRICS[limiterId] || []) : [];

  const metrics: MetricDelta[] = METRIC_CONFIGS.map(config => {
    const current = getMetricValue(state, config.id);
    const effect = effects.find(e => e.metric === config.id);
    const available = current !== null && current !== undefined && Number.isFinite(current);

    if (!available || !effect || current === null) {
      return {
        id: config.id,
        label: config.label,
        unit: config.unit,
        current,
        projected: null,
        deltaMin: 0,
        deltaMax: 0,
        deltaMidPct: 0,
        direction: "stable" as const,
        significance: "none" as const,
        available: false,
      };
    }

    // Audit P0 — B2: amplitudes mises à l'échelle selon la durée du plan.
    // Audit P2: + multiplicateur de trainability quand le levier cible le limiteur.
    let trainabilityMult = 1;
    if (leverTargetsLimiter) {
      trainabilityMult = targetedMetrics.includes(config.id)
        ? TRAINABILITY_TARGETED_BOOST
        : TRAINABILITY_OFF_TARGET_DAMP;
    }
    const scaledMin = effect.minPct * durationFactor * trainabilityMult;
    const scaledMax = effect.maxPct * durationFactor * trainabilityMult;
    const midPct = (scaledMin + scaledMax) / 2;
    const projected = current * (1 + midPct / 100);

    let direction: "up" | "down" | "stable";
    if (midPct > 0.5) direction = "up";
    else if (midPct < -0.5) direction = "down";
    else direction = "stable";

    const absMid = Math.abs(midPct);
    let significance: "major" | "moderate" | "minor" | "none";
    if (absMid >= 5) significance = "major";
    else if (absMid >= 2) significance = "moderate";
    else if (absMid > 0) significance = "minor";
    else significance = "none";

    return {
      id: config.id,
      label: config.label,
      unit: config.unit,
      current,
      projected: Math.round(projected * 100) / 100,
      deltaMin: Math.round(scaledMin * 10) / 10,
      deltaMax: Math.round(scaledMax * 10) / 10,
      deltaMidPct: Math.round(midPct * 10) / 10,
      direction,
      significance,
      available: true,
    };
  });

  const performancePredictions = estimatePerformanceImpact(metrics, objectif, sportMain);

  // Overall impact score: weighted average of positive effects for endurance
  const availableMetrics = metrics.filter(m => m.available);
  let impactScore = 50;
  if (availableMetrics.length > 0) {
    let totalPositive = 0;
    let count = 0;
    for (const m of availableMetrics) {
      const config = METRIC_CONFIGS.find(c => c.id === m.id)!;
      const effectiveDelta = config.higherIsBetter ? m.deltaMidPct : -m.deltaMidPct;
      totalPositive += effectiveDelta;
      count++;
    }
    impactScore = Math.round(Math.max(0, Math.min(100, 50 + totalPositive * 3)));
  }

  let impactLabel: string;
  if (impactScore >= 75) impactLabel = "Impact majeur";
  else if (impactScore >= 60) impactLabel = "Impact significatif";
  else if (impactScore >= 45) impactLabel = "Impact modéré";
  else impactLabel = "Impact faible";

  // Generate recommendation text
  const topPositive = metrics
    .filter(m => m.available && m.significance !== "none")
    .sort((a, b) => Math.abs(b.deltaMidPct) - Math.abs(a.deltaMidPct))
    .slice(0, 2);

  const recommendation = topPositive.length > 0
    ? `${lever.label} : effet principal sur ${topPositive.map(m => m.label).join(" et ")} (${topPositive.map(m => `${m.deltaMidPct > 0 ? "+" : ""}${m.deltaMidPct.toFixed(1)}%`).join(", ")}).`
    : `${lever.label} : effets limités avec le profil actuel.`;

  return {
    lever,
    metrics,
    performancePredictions,
    overallImpactScore: impactScore,
    impactLabel,
    recommendation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEST LEVER SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

const LIMITER_TO_LEVERS: Record<string, TrainingLeverId[]> = {
  aerobic_engine: ["vo2max_intervals", "volume_z2", "polarized_hi", "threshold_work"],
  glycolytic: ["reduce_anaerobic", "train_low", "volume_z2"],
  specific_endurance: ["norwegian_method", "threshold_work", "volume_z2"],
  metabolic_efficiency: ["train_low", "reduce_anaerobic", "volume_z2"],
  neuromuscular: ["max_force", "plyometrics", "running_economy"],
  anaerobic_capacity: ["glycolytic_block", "max_force", "plyometrics"],
};

/**
 * Audit P2 — trainability différentielle.
 * Quand un levier cible le limiteur dominant, les métriques directement liées
 * à ce limiteur réagissent plus fortement (Bouchard 2011 — non-responders sur
 * non-targeted, +20-30 % d'amplitude sur targeted). Le bonus +15 pts du ranking
 * ne touchait que l'ordre, pas l'amplitude affichée.
 */
const LIMITER_TO_METRICS: Record<string, MetricId[]> = {
  aerobic_engine: ["vo2max", "lt2"],
  glycolytic: ["vlamax", "fatmax"],
  specific_endurance: ["tte", "lt2", "durability"],
  metabolic_efficiency: ["fatmax", "durability"],
  neuromuscular: ["economy"],
  anaerobic_capacity: ["vlamax"],
};

const TRAINABILITY_TARGETED_BOOST = 1.25;   // +25 % d'amplitude sur métrique ciblée
const TRAINABILITY_OFF_TARGET_DAMP = 0.85;  // −15 % sur métriques non ciblées du levier ciblé

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function computeAdaptationPrediction(input: AdaptationPredictorInput): AdaptationPredictorResult {
  const { snapshot, limiterId, limiterLabel, objectif, selectedLevers, sportMain, weeksAvailable } = input;

  const state = extractPhysioState(snapshot, objectif, sportMain);
  const durationFactor = computeDurationFactor(weeksAvailable);

  // Determine which levers to simulate
  const leversToSimulate = selectedLevers && selectedLevers.length > 0
    ? TRAINING_LEVERS.filter(l => selectedLevers.includes(l.id))
    : TRAINING_LEVERS;

  const scenarios = leversToSimulate.map(lever => buildScenario(lever, state, objectif, sportMain, durationFactor, limiterId));

  // Find best scenario
  let bestIdx = 0;
  let bestScore = -1;

  // Prioritize levers matching the limiter
  const preferredLevers = limiterId ? (LIMITER_TO_LEVERS[limiterId] || []) : [];

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    let score = s.overallImpactScore;
    if (preferredLevers.includes(s.lever.id)) {
      score += 15; // Bonus for limiter alignment
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  const best = scenarios[bestIdx];
  const bestReason = limiterLabel
    ? `${best.lever.label} est la stratégie la plus efficace pour traiter le limiteur "${limiterLabel}" et améliorer la performance ${objectif}.`
    : `${best.lever.label} produit le meilleur impact global sur le profil physiologique actuel.`;

  return {
    scenarios,
    bestScenarioId: best.lever.id,
    bestScenarioReason: bestReason,
    currentState: state,
    objectif,
    limiterId,
    limiterLabel,
  };
}

export function getImpactScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 45) return "text-amber-600";
  return "text-muted-foreground";
}

export function getImpactScoreBgColor(score: number): string {
  if (score >= 75) return "bg-emerald-500/10 border-emerald-500/30";
  if (score >= 60) return "bg-blue-500/10 border-blue-500/30";
  if (score >= 45) return "bg-amber-500/10 border-amber-500/30";
  return "bg-muted/50 border-border";
}
