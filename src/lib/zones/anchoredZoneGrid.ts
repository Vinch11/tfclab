/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GRILLE Z1–Z7 ANCRÉE SUR LE SEUIL CRITIQUE (CP vélo / CS course)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Même vocabulaire que la grille des plans (Z1, Z2, Z3, Z4a, Z4b, Z5, Z6, Z7),
 * mais chaque limite est une fraction du seuil critique de l'athlète, calculé
 * uniquement depuis les données du bilan TFCL. Le modèle VO₂max/VLamax ne fixe
 * aucune limite : il ne sert qu'à signaler une incohérence.
 *
 * Bases (étude du 23/11/2026, « Étude scientifique — correction de la grille ») :
 *  - Domaines modéré / lourd / sévère, limite lourd/sévère = CP/CS (Jones 2019).
 *  - MLSS ≈ CP − 12 W en moyenne (Micheli 2025) → ≈ 95 % CP ; MLSS ≈ 93–94 % CS
 *    (Eur J Appl Physiol 2021 ; de Lucas 2012 : CS − 6 %).
 *  - Premier seuil (T1) ≈ 82,3 % CS (Hunter 2024, 26 études) ; vélo ≈ 77 % CP,
 *    déduit des fractions de VO₂max de Poole 2016 (valeur la moins solide).
 *  - Z3/Z4a/Z4b : convention de coaching à l'intérieur du domaine lourd.
 *
 * Affichage et préparation seulement tant que ZONE_GRID_MODE vaut "current"
 * (zoneGridConfig.ts) : aucune prescription n'utilise cette grille.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { LegacyZoneId } from "./zoneMapping";
import { DEFAULT_REST_HR_FRACTION, DEFAULT_THRESHOLD_HR_FRACTION, HR_SUBTHRESHOLD_EXPONENT } from "./deriveTrainingZones";
import { isMeasuredOrigin, readThresholdOrigin, type ThresholdOrigin } from "./thresholdOrigin";
import { vo2maxFromVma, vo2maxVmaMismatch } from "./vo2maxCoherence";
import { LEVEL_VMA_PERCENT, levelForAmbition } from "./thresholdPaceLevels";
import { parseStoredCriticalMetrics, type StoredCriticalSport } from "@/lib/criticalMetrics";
import { CRITICAL_POLICY } from "@/lib/criticalEfforts";
import { findMLSSPower } from "@/lib/v2/maderMetabolicModel";

export type GridSport = "bike" | "run";
export const ANCHORED_ZONE_IDS: LegacyZoneId[] = ["Z1", "Z2", "Z3", "Z4a", "Z4b", "Z5", "Z6", "Z7"];

/** Limites hautes de Z1…Z5 en fraction du seuil critique (Z5 se termine au seuil critique). */
export const GRID_FRACTIONS: Record<GridSport, Record<"Z1" | "Z2" | "Z3" | "Z4a" | "Z4b" | "Z5", number>> = {
  // Haut de Z2 vélo à 0,75 CP (et non 0,77) : validation par simulation (nov. 2026), le premier
  // seuil varie d'un athlète à l'autre ; 0,75 garde l'endurance sous ce seuil chez 70 % des athlètes.
  bike: { Z1: 0.65, Z2: 0.75, Z3: 0.85, Z4a: 0.90, Z4b: 0.93, Z5: 1.0 },
  run: { Z1: 0.70, Z2: 0.82, Z3: 0.86, Z4a: 0.90, Z4b: 0.93, Z5: 1.0 },
};
/** MLSS en fraction du seuil critique. */
export const MLSS_FRACTION: Record<GridSport, number> = { bike: 0.95, run: 0.94 };
/**
 * Seuil critique DÉDUIT d'un seuil saisi (FTP en W, allure seuil convertie en km/h), sans CP/CS confirmée.
 * Vélo : CP ≈ FTP / 0,965 (CP ≈ FTP + 3 %, FTP ≈ MLSS + 1,4 %).
 * Course : CS ≈ 1,01 × vitesse seuil. Le test 20 min × 0,95 n'est pas validé en course ; selon le modèle
 * de la vitesse critique il donne ≈ 99 % de la CS. Avec / 0,94, la Z5 débordait dans le domaine sévère
 * chez 82 % des athlètes simulés ; avec 1,01, l'erreur éventuelle est du côté lent (sûr).
 */
export const THRESHOLD_TO_CRITICAL: Record<GridSport, number> = { bike: 1 / 0.965, run: 1.01 };
/** Plafond d'un seuil critique DÉDUIT, en fraction de la VMA (au-delà : VMA ou seuil à revérifier). */
const MAX_DERIVED_CS_OVER_VMA = 0.97;
const DAY_MS = 86400000;

export type AnchorSource =
  | "critical_confirmed"   // CP/CS confirmée par le coach, récente
  | "threshold_test"       // FTP / allure seuil d'un test réalisé (20 min, ou CS du Track Day)
  | "threshold_unknown"    // valeur du bilan sans provenance (bilans antérieurs)
  | "threshold_estimate"   // calculateur TFCL ou montre
  | "vma_estimate";        // estimation depuis la VMA (calculateur TFCL)

export const ANCHOR_SOURCE_LABELS: Record<AnchorSource, string> = {
  critical_confirmed: "Seuil critique confirmé par le coach",
  threshold_test: "Test réalisé (20 min, Bike Day puissance critique ou Track Day)",
  threshold_unknown: "Seuil du bilan, provenance non renseignée",
  threshold_estimate: "Seuil estimé (calculateur ou montre)",
  vma_estimate: "Estimation depuis la VMA",
};

export interface AnchoredZone {
  id: LegacyZoneId;
  /** Bornes en W (vélo) ou km/h (course) ; `max` null = zone ouverte (Z7). */
  min: number;
  max: number | null;
  /** FC en bpm, null pour Z7 ou sans FCmax. */
  hr: [number, number] | null;
}

export interface AnchoredGrid {
  sport: GridSport;
  /** Seuil critique retenu (W ou km/h). */
  critical: number;
  mlss: number;
  firstThreshold: number;
  /** Plafond de Z6 : PMA 5 min (W) ou VMA (km/h). */
  top: number;
  source: AnchorSource;
  measured: boolean;
  zones: AnchoredZone[];
  /** Contrôles de cohérence, sans effet sur les zones. */
  alerts: string[];
}

export interface AnchoredGridSnapshot {
  date?: string | null;
  ftp?: number | null;
  vma?: number | null;
  pace_threshold_sec_per_km?: number | null;
  map5min_w?: number | null;
  fc_max?: number | null;
  fc_repos?: number | null;
  vo2max?: number | null;
  vlamax?: number | null;
  weight_kg?: number | null;
  critical_metrics?: unknown;
  field_sources?: unknown;
}

export interface AnchoredGridOptions {
  /** Ambition (clé TFCL) pour l'estimation depuis la VMA. */
  ambition?: string | null;
  /** Valeurs effectives si différentes du bilan (ex. FC max, poids, VO₂max). */
  fcMax?: number | null;
  today?: string;
}

const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

function usableCritical(c: StoredCriticalSport | undefined, today: string): StoredCriticalSport | null {
  if (!c || c.status !== "confirmed" || c.coachReview?.verdict === "reject") return null;
  const age = (Date.parse(today + "T00:00:00Z") - Date.parse(c.latestEffortDate?.slice(0, 10) + "T00:00:00Z")) / DAY_MS;
  return Number.isFinite(age) && age <= CRITICAL_POLICY.maxAgeDays ? c : null;
}

/** FC au fil de l'intensité (réserve cardiaque), mêmes constantes que deriveTrainingZones. */
function heartRateCurve(sport: GridSport, fcMax: number, fcRest: number | null, topOverMlss: number) {
  const rest = fcRest ? Math.min(0.65, Math.max(0.28, fcRest / fcMax)) : DEFAULT_REST_HR_FRACTION;
  const thr = DEFAULT_THRESHOLD_HR_FRACTION[sport];
  const hrrAtThreshold = (thr - rest) / (1 - rest);
  const rTop = Math.max(1.04, topOverMlss);
  return (ratioToMlss: number) => {
    const r = Math.max(0, ratioToMlss);
    if (r <= 1) return Math.round((rest + hrrAtThreshold * Math.pow(r, HR_SUBTHRESHOLD_EXPONENT) * (1 - rest)) * fcMax);
    const over = Math.min(1, (r - 1) / (rTop - 1));
    return Math.round((thr + over * (1 - thr)) * fcMax);
  };
}

function buildZones(sport: GridSport, critical: number, top: number, fcMax: number | null, fcRest: number | null): AnchoredZone[] {
  const f = GRID_FRACTIONS[sport];
  const bounds = [0, f.Z1, f.Z2, f.Z3, f.Z4a, f.Z4b, f.Z5].map(x => x * critical);
  const mlss = critical * MLSS_FRACTION[sport];
  const hr = fcMax ? heartRateCurve(sport, fcMax, fcRest, top / mlss) : null;
  const zones: AnchoredZone[] = ANCHORED_ZONE_IDS.slice(0, 6).map((id, i) => ({ id, min: bounds[i], max: bounds[i + 1], hr: null }));
  zones.push({ id: "Z6", min: critical, max: top, hr: null }, { id: "Z7", min: top, max: null, hr: null });
  return zones.map(z => ({
    ...z,
    hr: hr && z.max != null ? [hr(z.min / mlss), Math.min(fcMax!, hr(z.max / mlss))] as [number, number] : null,
  }));
}

/** Grille vélo : CP confirmée, sinon FTP (CP ≈ FTP / 0,965). Null sans FTP ni CP. */
export function anchoredBikeGrid(s: AnchoredGridSnapshot, o: AnchoredGridOptions = {}): AnchoredGrid | null {
  const today = o.today ?? new Date().toISOString().slice(0, 10);
  const parsed = parseStoredCriticalMetrics(s.critical_metrics);
  const cp = usableCritical(parsed.cycling, today);
  const ftp = positive(s.ftp) ? s.ftp : null;
  const origin: ThresholdOrigin | null = readThresholdOrigin(s.field_sources, "ftp");
  if (!cp && !ftp) return null;
  const alerts: string[] = [];
  let critical: number, source: AnchorSource;
  if (cp) { critical = cp.critical; source = "critical_confirmed"; }
  else {
    critical = ftp! * THRESHOLD_TO_CRITICAL.bike;
    source = isMeasuredOrigin(origin) ? "threshold_test" : origin ? "threshold_estimate" : "threshold_unknown";
    if (origin === "watch") alerts.push("FTP de montre ou de plateforme : estimation, à confirmer par un test 20 min.");
  }
  if (cp && ftp && Math.abs(cp.critical * MLSS_FRACTION.bike - ftp) / ftp > 0.08)
    alerts.push(`La FTP (${Math.round(ftp)} W) s'écarte de plus de 8 % du MLSS attendu depuis la CP confirmée (${Math.round(cp.critical * MLSS_FRACTION.bike)} W).`);
  const unconfirmed = parsed.cycling && !cp ? parsed.cycling : null;
  if (unconfirmed && Math.abs(unconfirmed.critical - critical) / critical > 0.05)
    alerts.push(`CP non confirmée (${Math.round(unconfirmed.critical)} W) différente du seuil retenu (${Math.round(critical)} W) : à valider par le coach.`);
  const map5 = positive(s.map5min_w) ? s.map5min_w : null;
  const fromModel = cp ? cp.critical + cp.reserve / 300 : null;
  const top = Math.max(map5 ?? fromModel ?? critical * 1.2, critical * 1.05);
  if (map5 && map5 < critical * 1.1) alerts.push(`Puissance 5 min (${Math.round(map5)} W) à peine au-dessus du seuil critique (${Math.round(critical)} W) : effort 5 min probablement sous-maximal.`);
  if (positive(s.vo2max) && positive(s.vlamax) && positive(s.weight_kg) && ftp) {
    const mlss = findMLSSPower({ vo2max: s.vo2max, vlamax: s.vlamax, weight: s.weight_kg });
    if (positive(mlss) && Math.abs(mlss - ftp) / ftp > 0.08)
      alerts.push(`Le modèle VO₂max/VLamax place le seuil à ${Math.round(mlss)} W pour une FTP de ${Math.round(ftp)} W : VO₂max ou VLamax à vérifier (souvent une valeur de montre).`);
  }
  const fcMax = positive(o.fcMax) ? o.fcMax : positive(s.fc_max) ? s.fc_max : null;
  return { sport: "bike", critical, mlss: critical * MLSS_FRACTION.bike, firstThreshold: critical * GRID_FRACTIONS.bike.Z2, top, source,
    measured: source === "critical_confirmed" || source === "threshold_test", zones: buildZones("bike", critical, top, fcMax, positive(s.fc_repos) ? s.fc_repos : null), alerts };
}

/** Grille course : CS confirmée, sinon allure seuil (CS ≈ 1,01 × vitesse seuil), sinon VMA. Null sans VMA ni seuil. */
export function anchoredRunGrid(s: AnchoredGridSnapshot, o: AnchoredGridOptions = {}): AnchoredGrid | null {
  const today = o.today ?? new Date().toISOString().slice(0, 10);
  const parsed = parseStoredCriticalMetrics(s.critical_metrics);
  const cs = usableCritical(parsed.running, today);
  const vma = positive(s.vma) ? s.vma : null;
  const pace = positive(s.pace_threshold_sec_per_km) ? s.pace_threshold_sec_per_km : null;
  const origin = readThresholdOrigin(s.field_sources, "pace_threshold_sec_per_km");
  const alerts: string[] = [];
  let critical: number, source: AnchorSource;
  if (cs) { critical = cs.critical * 3.6; source = "critical_confirmed"; }
  else if (pace && origin !== "watch" && origin !== "calculator") {
    critical = (3600 / pace) * THRESHOLD_TO_CRITICAL.run;
    source = isMeasuredOrigin(origin) ? "threshold_test" : "threshold_unknown";
  } else if (vma) {
    // Cible du calculateur TFCL = allure d'un effort maximal de 20 min, proche de la CS
    // (tenable environ 20 à 30 min, Jones 2019) : CS ≈ VMA × % du niveau.
    critical = vma * LEVEL_VMA_PERCENT[levelForAmbition(o.ambition)].target;
    source = "vma_estimate";
    if (pace) alerts.push(`Allure seuil ${origin === "watch" ? "de montre" : "du calculateur"} non utilisée : estimation, à remplacer par un test seuil 20 min.`);
  } else if (pace) {
    critical = (3600 / pace) * THRESHOLD_TO_CRITICAL.run;
    source = "threshold_estimate";
  } else return null;
  if (vma && critical > vma * MAX_DERIVED_CS_OVER_VMA) {
    if (source === "critical_confirmed") alerts.push(`CS confirmée à ${Math.round(critical / vma * 100)} % de la VMA : VMA probablement sous-estimée.`);
    else {
      alerts.push(`Seuil très proche de la VMA (${Math.round(critical / vma * 100)} %) : VMA ou allure seuil à revérifier ; seuil critique limité à ${Math.round(MAX_DERIVED_CS_OVER_VMA * 100)} % de la VMA.`);
      critical = vma * MAX_DERIVED_CS_OVER_VMA;
    }
  }
  const unconfirmed = parsed.running && !cs ? parsed.running : null;
  if (unconfirmed && Math.abs(unconfirmed.critical * 3.6 - critical) / critical > 0.05)
    alerts.push(`CS non confirmée (${(unconfirmed.critical * 3.6).toFixed(1)} km/h) différente du seuil retenu (${critical.toFixed(1)} km/h) : à valider par le coach.`);
  // VO₂max ≈ 3,5 × VMA (km/h) (Léger) : un écart > 10 % signale souvent une VO₂max de montre.
  if (vma && positive(s.vo2max)) {
    const expected = vo2maxFromVma(vma);
    if (vo2maxVmaMismatch(s.vo2max, vma))
      alerts.push(`VO₂max saisie (${Math.round(s.vo2max)} ml/kg/min) incohérente avec la VMA de ${vma} km/h (≈ ${Math.round(expected)} attendus) : VO₂max ou VMA à vérifier (souvent une valeur de montre).`);
  }
  const top = Math.max(vma ?? critical * 1.1, critical * 1.03);
  const fcMax = positive(o.fcMax) ? o.fcMax : positive(s.fc_max) ? s.fc_max : null;
  return { sport: "run", critical, mlss: critical * MLSS_FRACTION.run, firstThreshold: critical * GRID_FRACTIONS.run.Z2, top, source,
    measured: source === "critical_confirmed" || source === "threshold_test", zones: buildZones("run", critical, top, fcMax, positive(s.fc_repos) ? s.fc_repos : null), alerts };
}

/** Bornes en W pour la table des plans. */
export function bikeGridWatts(grid: AnchoredGrid): Partial<Record<LegacyZoneId, [number, number]>> {
  const out: Partial<Record<LegacyZoneId, [number, number]>> = {};
  for (const z of grid.zones) out[z.id] = [Math.round(z.min), Math.round(z.max ?? grid.top * 2.5)];
  return out;
}

/** Bornes en s/km [rapide, lent] pour la table des plans. */
export function runGridPaces(grid: AnchoredGrid): Partial<Record<LegacyZoneId, [number, number]>> {
  const out: Partial<Record<LegacyZoneId, [number, number]>> = {};
  for (const z of grid.zones) {
    const fast = z.max != null ? 3600 / z.max : 3600 / (grid.top * 1.6);
    const slow = z.min > 0 ? 3600 / z.min : 3600 / (grid.critical * 0.4);
    out[z.id] = [Math.round(fast), Math.round(slow)];
  }
  return out;
}

export function gridHeartRates(grid: AnchoredGrid): Partial<Record<LegacyZoneId, [number, number]>> {
  const out: Partial<Record<LegacyZoneId, [number, number]>> = {};
  for (const z of grid.zones) if (z.hr) out[z.id] = z.hr;
  return out;
}
