/**
 * Records Nolio V2 → candidats de snapshot. PUR (aucun réseau, aucune écriture).
 *
 * Risques traités explicitement (audit Nolio v2, 7 nov. 2026) :
 * 1. Un record Nolio n'est PAS un test validé : chaque candidat garde sa date,
 *    son entraînement d'origine et sa source Nolio. Rien n'est écrit dans le
 *    snapshot ici — seulement proposé pour revue et confirmation du coach.
 * 2. Unités hétérogènes par sport (W, m/s, /km, /100m, km/h, bpm) : chaque
 *    conversion est explicite par unité reçue ; une unité non reconnue est
 *    ignorée, jamais traitée par défaut comme une autre.
 * 3. Budget d'appels : cette fonction ne fait aucune requête ; le plan de
 *    requêtes borné vit dans recordsClient.ts (RECORDS_QUERY_PLAN, 4 appels).
 */
import type { RawMetricsRecord } from "./recordsClient.ts";

export type SnapshotField =
  | "pmax_5s" | "p30s_w" | "p60s_w" | "map5min_w" | "ftp_estimated"
  | "time_5k_sec" | "time_10k_sec" | "time_half_sec" | "time_marathon_sec"
  | "css" | "fc_max";

export type SportGroup = "bike" | "run" | "swim" | "other";

export type SnapshotCandidate = {
  field: SnapshotField;
  label: string;
  sportGroup: SportGroup;
  /** Valeur dans l'unité de stockage du snapshot (W, s, s/100m, bpm). */
  value: number;
  unit: "W" | "s" | "s/100m" | "bpm";
  windowLabel: string;
  date: string;
  trainingName: string | null;
  source: string | null;
  /** Valeur et unité Nolio d'origine, pour transparence coach (jamais masqué). */
  rawValue: number;
  rawUnit: string;
  /** false si aucun contrôle de plausibilité n'a pu être appliqué (ex. FTP inconnu). */
  plausibilityChecked: boolean;
};

export type MapperWarning = { reason: string; detail: string };

const bikeSport = (name: string | undefined): boolean => {
  const s = (name ?? "").toLowerCase();
  return s.includes("vélo") || s.includes("velo") || s.includes("bike") || s.includes("cyclisme") || s.includes("trainer");
};
const runSport = (name: string | undefined): boolean => {
  const s = (name ?? "").toLowerCase();
  return s.includes("course") || s.includes("run") || s.includes("trail") || s.includes("footing") || s.includes("cap");
};
const swimSport = (name: string | undefined): boolean => {
  const s = (name ?? "").toLowerCase();
  return s.includes("nat") || s.includes("swim") || s.includes("piscine");
};
function sportGroupOf(name: string | undefined): SportGroup {
  if (bikeSport(name)) return "bike";
  if (runSport(name)) return "run";
  if (swimSport(name)) return "swim";
  return "other";
}

/** Fenêtre exacte, sinon tolérance ±2% (le catalogue de fenêtres Nolio peut varier). */
function near(innerVal: number, target: number, tolerancePct = 0.02): boolean {
  return Math.abs(innerVal - target) <= target * tolerancePct;
}
function best(records: RawMetricsRecord[], target: number, higherIsBetter: boolean): RawMetricsRecord | null {
  const matches = records.filter((r) => near(r.inner_val, target));
  if (!matches.length) return null;
  return matches.reduce((a, b) => (higherIsBetter ? (b.value > a.value ? b : a) : (b.value < a.value ? b : a)));
}

/** Vitesse/allure Nolio → secondes totales sur `distanceM`. Unité non reconnue ⇒ null, jamais de défaut silencieux. */
function totalSecondsFromPaceRecord(r: RawMetricsRecord, distanceM: number): number | null {
  const u = r.unit.toLowerCase();
  if (!Number.isFinite(r.value) || r.value <= 0) return null;
  if (u === "km/h") return (distanceM / 1000) / r.value * 3600;
  if (u === "m/s") return distanceM / r.value;
  if (u === "/km" || u === "sec/km" || u === "s/km") return r.value * (distanceM / 1000);
  if (u === "/100m" || u === "sec/100m" || u === "s/100m") return r.value * (distanceM / 100);
  return null; // unité inattendue : jamais interprétée par supposition
}
/** Vitesse Nolio → s/100m pour la natation. Même garde d'unité qu'au-dessus. */
function css100mFromPaceRecord(r: RawMetricsRecord): number | null {
  const u = r.unit.toLowerCase();
  if (!Number.isFinite(r.value) || r.value <= 0) return null;
  if (u === "m/s") return 100 / r.value;
  if (u === "km/h") return 100 / (r.value * 1000 / 3600);
  if (u === "/100m" || u === "sec/100m" || u === "s/100m") return r.value;
  return null;
}

export type MapOptions = { knownFtp?: number | null };

export function mapRecordsToSnapshotCandidates(records: RawMetricsRecord[], opts: MapOptions = {}): { candidates: SnapshotCandidate[]; warnings: MapperWarning[] } {
  const candidates: SnapshotCandidate[] = [];
  const warnings: MapperWarning[] = [];
  const push = (c: Omit<SnapshotCandidate, "plausibilityChecked"> & { plausible: boolean | null }) => {
    candidates.push({ ...c, plausibilityChecked: c.plausible !== null });
  };
  const meta = (r: RawMetricsRecord) => ({ date: r.date, trainingName: r.training_name ?? null, source: r.source ?? null, rawValue: r.value, rawUnit: r.unit });

  const bike = records.filter((r) => r.cat === "ppr" && r.record_type === "time" && bikeSport(r.sport_name));
  const run = records.filter((r) => r.cat === "par" && runSport(r.sport_name));
  const swim = records.filter((r) => r.cat === "par" && swimSport(r.sport_name) && r.unit.toLowerCase() !== "/km");
  const hr = records.filter((r) => r.cat === "phrr" && r.record_type === "time");

  // ── Vélo : puissance courte/soutenue (watts uniquement — unité vérifiée) ──
  const ftp = opts.knownFtp && opts.knownFtp > 0 ? opts.knownFtp : null;
  const bikeWindow = (sec: number, field: SnapshotField, label: string, ratioCap: number, absCap: number) => {
    const r = best(bike.filter((x) => x.unit === "W"), sec, true);
    if (!r) return;
    const plausible = ftp ? r.value / ftp <= ratioCap : r.value < absCap ? null : false;
    if (plausible === false) { warnings.push({ reason: `${field}_implausible`, detail: `${label} : ${r.value}W` }); return; }
    push({ field, label, sportGroup: "bike", value: r.value, unit: "W", windowLabel: label, plausible, ...meta(r) });
  };
  bikeWindow(5, "pmax_5s", "5 s", 4.0, 2000);
  bikeWindow(30, "p30s_w", "30 s", 4.0, 1500);
  bikeWindow(60, "p60s_w", "1 min", 4.0, 1200);
  bikeWindow(300, "map5min_w", "5 min", 1.6, 600);
  const p20 = best(bike.filter((x) => x.unit === "W"), 1200, true);
  const p30 = best(bike.filter((x) => x.unit === "W"), 1800, true);
  if (p30) push({ field: "ftp_estimated", label: "FTP — P30' directe", sportGroup: "bike", value: Math.round(p30.value), unit: "W", windowLabel: "30 min (direct)", plausible: null, ...meta(p30) });
  else if (p20) push({ field: "ftp_estimated", label: "FTP — estimée P20'×0.95", sportGroup: "bike", value: Math.round(p20.value * 0.95), unit: "W", windowLabel: "20 min ×0.95", plausible: null, ...meta(p20) });

  // ── Course : temps de référence par distance (jamais de confusion d'unité) ──
  const runDistance = (meters: number, field: SnapshotField, label: string, minSec: number, maxSec: number) => {
    const r = best(run.filter((x) => x.record_type === "distance" && near(x.inner_val, meters)), meters, true);
    if (!r) return;
    const t = totalSecondsFromPaceRecord(r, meters);
    if (t === null) { warnings.push({ reason: `${field}_unit_unrecognized`, detail: `${label} : unité "${r.unit}"` }); return; }
    if (t < minSec || t > maxSec) { warnings.push({ reason: `${field}_implausible`, detail: `${label} : ${Math.round(t)}s hors [${minSec},${maxSec}]` }); return; }
    push({ field, label, sportGroup: "run", value: Math.round(t), unit: "s", windowLabel: label, plausible: true, ...meta(r) });
  };
  runDistance(5000, "time_5k_sec", "5 km", 840, 3600);
  runDistance(10000, "time_10k_sec", "10 km", 1800, 7200);
  runDistance(21097, "time_half_sec", "Semi", 3600, 16200);
  runDistance(42195, "time_marathon_sec", "Marathon", 7200, 32400);

  // ── Natation : CSS 100 m, best-of plausible parmi plusieurs fenêtres ──
  const cssCandidates = [
    { label: "1500 m", r: best(swim.filter((x) => x.record_type === "distance"), 1500, true) },
    { label: "800 m", r: best(swim.filter((x) => x.record_type === "distance"), 800, true) },
    { label: "400 m", r: best(swim.filter((x) => x.record_type === "distance"), 400, true) },
    { label: "20 min", r: best(swim.filter((x) => x.record_type === "time"), 1200, true) },
    { label: "25 min", r: best(swim.filter((x) => x.record_type === "time"), 1500, true) },
    { label: "30 min", r: best(swim.filter((x) => x.record_type === "time"), 1800, true) },
  ];
  let bestCss: { label: string; val: number; r: RawMetricsRecord } | null = null;
  for (const c of cssCandidates) {
    if (!c.r) continue;
    const css = css100mFromPaceRecord(c.r);
    if (css === null) { warnings.push({ reason: "css_unit_unrecognized", detail: `${c.label} : unité "${c.r.unit}"` }); continue; }
    if (css < 70 || css > 180) { warnings.push({ reason: "css_implausible", detail: `${c.label} : ${css.toFixed(1)}s/100m hors [70,180]` }); continue; }
    if (!bestCss || css < bestCss.val) bestCss = { label: c.label, val: css, r: c.r };
  }
  if (bestCss) push({ field: "css", label: `CSS (source ${bestCss.label})`, sportGroup: "swim", value: Math.round(bestCss.val * 100) / 100, unit: "s/100m", windowLabel: bestCss.label, plausible: true, ...meta(bestCss.r) });

  // ── FC max : fenêtres ≥5 min, tous sports ──
  const hrCandidates = hr.filter((r) => r.inner_val >= 300 && r.unit.toLowerCase() === "bpm" && r.value >= 150 && r.value <= 210);
  if (hrCandidates.length) {
    const r = hrCandidates.reduce((a, b) => (b.value > a.value ? b : a));
    push({ field: "fc_max", label: "FC max", sportGroup: "other", value: Math.round(r.value), unit: "bpm", windowLabel: `${Math.round(r.inner_val / 60)} min+`, plausible: true, ...meta(r) });
  }

  return { candidates, warnings };
}
