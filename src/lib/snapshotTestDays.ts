/**
 * Bilan organisé par journée de tests + vérifications communes
 * (création ET modification). Aucune valeur n'est déduite ici :
 * on vérifie seulement la cohérence de ce que le coach a saisi ou importé.
 */
import { parseStoredCriticalMetrics } from "@/lib/criticalMetrics";
import { parseStoredDurability } from "@/lib/durability/longSessionDurability";
export type TestDayFieldKey =
  | "date" | "weight_kg" | "fc_max" | "fc_repos"
  | "pmax_5s" | "p30s_w" | "p60s_w" | "sprint_15s"
  | "map5min_w" | "vma"
  | "ftp" | "tte_observed_min" | "pace_threshold" | "tte_observed_min_run" | "css" | "vo2max"
  | "run_pace_ref" | "run_hr_ref" | "run_duration_min" | "run_hr_drift_pct"
  | "tte_ref_w" | "tte_ref_pace";

export interface TestDayField { key: TestDayFieldKey; label: string; unit: string; placeholder: string; type?: "number" | "date" | "text" }
export interface TestDay { id: string; title: string; hint: string; fields: TestDayField[] }

/**
 * Fiche rangée par sport (24/11/2026) : chaque valeur n'a qu'un seul endroit de saisie,
 * dans le bloc du Day qui la mesure. CP/W′ et CS/D′ restent dans « Repères critiques ».
 */
export const TEST_DAYS: TestDay[] = [
  { id: "ctx", title: "Contexte", hint: "Date du bilan, poids et fréquences cardiaques. La FC repos se remplit depuis Nolio quand la montre la transmet.", fields: [
    { key: "date", label: "Date du bilan", unit: "", placeholder: "", type: "date" },
    { key: "weight_kg", label: "Poids", unit: "kg", placeholder: "60" },
    { key: "fc_max", label: "FC max", unit: "bpm", placeholder: "185" },
    { key: "fc_repos", label: "FC repos", unit: "bpm", placeholder: "50" },
  ] },
  { id: "bike", title: "Vélo", hint: "Bike Day : sprints, 5 min et seuil. La puissance critique se valide dans « Repères critiques ».", fields: [
    { key: "pmax_5s", label: "Sprint 5 s", unit: "W", placeholder: "900" },
    { key: "p30s_w", label: "30 s", unit: "W", placeholder: "600" },
    { key: "p60s_w", label: "60 s", unit: "W", placeholder: "450" },
    { key: "map5min_w", label: "Puissance 5 min", unit: "W", placeholder: "320" },
    { key: "ftp", label: "FTP / seuil", unit: "W", placeholder: "260" },
    { key: "tte_observed_min", label: "Durée tenue au seuil", unit: "min", placeholder: "45" },
    { key: "tte_ref_w", label: "Puissance tenue pendant cette durée", unit: "W", placeholder: "= FTP" },
  ] },
  { id: "run", title: "Course", hint: "Track Day : sprint, VMA et seuil. Les 4 dernières cases (footing à allure stable) sont facultatives. La vitesse critique se valide dans « Repères critiques ».", fields: [
    { key: "sprint_15s", label: "Distance en 15 s", unit: "m", placeholder: "95" },
    { key: "vma", label: "VMA", unit: "km/h", placeholder: "17" },
    { key: "pace_threshold", label: "Allure seuil", unit: "min/km", placeholder: "4:10", type: "text" },
    { key: "tte_observed_min_run", label: "Durée tenue au seuil", unit: "min", placeholder: "40" },
    { key: "tte_ref_pace", label: "Allure tenue pendant cette durée", unit: "min/km", placeholder: "= seuil", type: "text" },
    { key: "run_pace_ref", label: "Footing : allure stable", unit: "min/km", placeholder: "5:30", type: "text" },
    { key: "run_hr_ref", label: "Footing : FC moyenne", unit: "bpm", placeholder: "145" },
    { key: "run_duration_min", label: "Footing : durée", unit: "min", placeholder: "60" },
    { key: "run_hr_drift_pct", label: "Footing : dérive cardiaque", unit: "%", placeholder: "3" },
  ] },
  { id: "swim", title: "Natation", hint: "Pool Day : CSS calculée à partir du 400 m et du 200 m.", fields: [
    { key: "css", label: "CSS", unit: "s/100 m", placeholder: "95" },
  ] },
  { id: "labo", title: "Labo", hint: "Mesures de laboratoire ou estimations documentées. Une VO₂max de montre est gardée pour information mais n'entre pas dans les calculs.", fields: [
    { key: "vo2max", label: "VO₂max", unit: "ml/kg/min", placeholder: "55" },
  ] },
];

/** Provenance de la VO₂max saisie. « watch » = affichée, jamais utilisée par les calculs. */
export type Vo2maxOrigin = "lab" | "estimated" | "watch" | "entered";
export const VO2MAX_ORIGIN_OPTIONS: { value: Vo2maxOrigin; label: string }[] = [
  { value: "lab", label: "Laboratoire (mesure des gaz)" },
  { value: "estimated", label: "Estimation TFCL (3,5 × VMA, Track Day)" },
  { value: "watch", label: "Montre (Garmin…) : information seulement" },
  { value: "entered", label: "Autre / saisie libre" },
];
const VO2_ORIGINS = new Set<Vo2maxOrigin>(["lab", "estimated", "watch", "entered"]);
const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** VO₂max affichée dans la fiche + sa provenance. Une valeur de montre vit dans field_sources.vo2max_watch. */
export function readVo2max(snapshot: { vo2max?: number | null; field_sources?: unknown }): { value: number | null; origin: Vo2maxOrigin | null } {
  const sources = obj(snapshot.field_sources);
  if (typeof snapshot.vo2max === "number" && snapshot.vo2max > 0) {
    const raw = obj(sources.vo2max).source;
    return { value: snapshot.vo2max, origin: typeof raw === "string" && VO2_ORIGINS.has(raw as Vo2maxOrigin) ? raw as Vo2maxOrigin : null };
  }
  const watch = obj(sources.vo2max_watch).value;
  return typeof watch === "number" && watch > 0 ? { value: watch, origin: "watch" } : { value: null, origin: null };
}

/**
 * Colonne vo2max + field_sources à enregistrer. Montre → colonne vide (aucun calcul ne la lit),
 * valeur gardée dans field_sources.vo2max_watch pour l'affichage.
 */
export function writeVo2max(fieldSources: unknown, value: number | null, origin: Vo2maxOrigin | "" | null | undefined, date: string): { vo2max: number | null; field_sources: Record<string, unknown> } {
  const next = { ...obj(fieldSources) };
  if (value == null || !(value > 0)) {
    delete next.vo2max;
    if (origin === "watch") delete next.vo2max_watch;
    return { vo2max: null, field_sources: next };
  }
  if (origin === "watch") {
    delete next.vo2max;
    next.vo2max_watch = { source: "watch", value, date, protocol: "VO₂max de montre : affichée, non utilisée dans les calculs" };
    return { vo2max: null, field_sources: next };
  }
  if (origin) next.vo2max = { source: origin, protocol: VO2MAX_ORIGIN_OPTIONS.find(o => o.value === origin)?.label ?? origin };
  return { vo2max: value, field_sources: next };
}

type Form = Partial<Record<string, string>>;
const num = (v?: string) => { if (!v || !v.trim()) return null; const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
export function paceToSec(v?: string): number | null {
  if (!v || !v.trim()) return null;
  const m = v.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

const RANGES: Partial<Record<TestDayFieldKey, [number, number]>> = {
  weight_kg: [30, 150], fc_max: [100, 230], pmax_5s: [200, 2500], p30s_w: [100, 1500], p60s_w: [80, 1200],
  sprint_15s: [30, 200], map5min_w: [80, 700], vma: [8, 30], ftp: [50, 600],
  tte_observed_min: [1, 120], tte_observed_min_run: [1, 120], css: [50, 300],
  fc_repos: [25, 110], vo2max: [20, 95],
  tte_ref_w: [50, 600],
  run_hr_ref: [60, 220], run_duration_min: [10, 300], run_hr_drift_pct: [-30, 50],
};
const LABEL = Object.fromEntries(TEST_DAYS.flatMap((d) => d.fields.map((f) => [f.key, f.label])));

export interface SnapshotCheck { errors: string[]; warnings: string[] }

/** Mêmes règles en création et en modification. Erreur = enregistrement bloqué. */
export function checkSnapshotForm(f: Form): SnapshotCheck {
  const errors: string[] = []; const warnings: string[] = [];
  if (!f.date) errors.push("La date du bilan est obligatoire.");
  for (const [k, [lo, hi]] of Object.entries(RANGES) as [TestDayFieldKey, [number, number]][]) {
    const v = num(f[k]);
    if (v == null) continue;
    if (Number.isNaN(v)) errors.push(`${LABEL[k]} : nombre invalide.`);
    else if (v < lo || v > hi) errors.push(`${LABEL[k]} : ${v} hors des limites (${lo}–${hi}).`);
  }
  const pace = paceToSec(f.pace_threshold);
  if (Number.isNaN(pace)) errors.push("Course — allure seuil : format attendu min:ss (ex. 4:10).");
  if (Number.isNaN(paceToSec(f.run_pace_ref))) errors.push("Course — allure du footing : format attendu min:ss (ex. 5:30).");

  // Cohérence puissance-durée : une puissance plus longue ne peut pas dépasser une plus courte.
  const chain: TestDayFieldKey[] = ["pmax_5s", "p30s_w", "p60s_w", "map5min_w", "ftp"];
  for (let i = 0; i < chain.length - 1; i++) {
    const a = num(f[chain[i]]), b = num(f[chain[i + 1]]);
    if (a && b && !Number.isNaN(a) && !Number.isNaN(b) && b > a) errors.push(`${LABEL[chain[i + 1]]} (${b} W) dépasse ${LABEL[chain[i]]} (${a} W).`);
  }
  // Allure seuil plus rapide que la VMA = impossible.
  const vma = num(f.vma);
  if (pace && !Number.isNaN(pace) && vma && !Number.isNaN(vma)) {
    const vmaPace = 3600 / vma;
    if (pace < vmaPace) errors.push("Course — allure seuil plus rapide que la VMA.");
  }
  const fcRest = num(f.fc_repos), fcMax = num(f.fc_max);
  if (fcRest && fcMax && !Number.isNaN(fcRest) && !Number.isNaN(fcMax) && fcRest >= fcMax) errors.push("FC repos supérieure ou égale à la FC max.");
  if (Number.isNaN(paceToSec(f.tte_ref_pace))) errors.push("Course — allure tenue pendant la durée au seuil : format attendu min:ss.");
  for (const sport of ["bike", "run"] as const) {
    const t = tteFromForm(f, sport);
    if (t.stale) warnings.push(sport === "bike"
      ? `Durée au seuil vélo tenue à ${t.refLabel} alors que la FTP est ${t.thresholdLabel} : elle est gardée pour information mais n'entre pas dans les calculs. À refaire au bon seuil.`
      : `Durée au seuil course tenue à ${t.refLabel} alors que l'allure seuil est ${t.thresholdLabel} : gardée pour information, hors calculs. À refaire au bon seuil.`);
  }
  const tteBike = num(f.tte_observed_min), tteRun = num(f.tte_observed_min_run);
  if (tteBike && !num(f.ftp)) warnings.push("Durée tenue au seuil vélo sans FTP : à quelle intensité a-t-elle été tenue ?");
  if (tteRun && !pace) warnings.push("Durée tenue au seuil course sans allure seuil.");
  return { errors, warnings };
}

export interface ProfileReadiness { label: string; ready: boolean; need: string }

/** Ce que le bilan permet de calculer, sans rien estimer. */
export function snapshotReadiness(f: Form): ProfileReadiness[] {
  const has = (k: string) => { const v = num(f[k]); return v != null && !Number.isNaN(v) && v > 0; };
  const critical = parseStoredCriticalMetrics(f.critical_metrics);
  return [
    { label: "Puissance critique / W′ vélo", ready: critical.cycling?.status === "confirmed", need: "efforts critiques distincts de 2 à 15 min, validés dans Repères critiques ; les records 30 s et 60 s ne valident pas CP/W′" },
    { label: "Vitesse critique / D′ course", ready: critical.running?.status === "confirmed", need: "efforts maximaux du Track Day, validés dans Repères critiques" },
    { label: "Endurance au seuil vélo · TTE", ready: has("tte_observed_min") && has('ftp'), need: "durée tenue et seuil vélo ; protocole à confirmer" },
    { label: "Endurance au seuil course · TTE", ready: has("tte_observed_min_run") && Number.isFinite(paceToSec(f.pace_threshold)) && (paceToSec(f.pace_threshold) ?? 0) > 0, need: "durée tenue et allure seuil ; protocole à confirmer" },
    { label: "Durabilité prolongée", ready: Object.keys(parseStoredDurability(f.critical_metrics)).length > 0, need: "comparaison avant/après effort prolongé (Durability Day ou sorties longues Nolio) ; TTE seul insuffisant" },
    { label: "Glycolyse course (sprint)", ready: has("sprint_15s"), need: "distance sprint 15 s" },
    { label: "Ratio seuil / VMA course", ready: has("vma") && !!paceToSec(f.pace_threshold), need: "VMA et allure seuil" },
  ];
}

const MEASURED_ORIGINS = new Set(["test_20min", "cp_test", "track_day_cs"]);

/** Nombre de repères documentés par un test (Day, labo) : sert aux champs calculés ci-dessous. */
function documentedAnchors(f: Form): number {
  const critical = parseStoredCriticalMetrics(f.critical_metrics);
  const positive = (k: string) => { const v = num(f[k]); return v != null && !Number.isNaN(v) && v > 0; };
  return [
    critical.cycling?.status === "confirmed" || (positive("ftp") && MEASURED_ORIGINS.has(f.ftp_origin ?? "")),
    critical.running?.status === "confirmed" || (!!paceToSec(f.pace_threshold) && MEASURED_ORIGINS.has(f.pace_threshold_origin ?? "")),
    positive("vma"), positive("map5min_w"), positive("css"),
    positive("vo2max") && f.vo2max_origin === "lab",
  ].filter(Boolean).length;
}

/**
 * Fiabilité du bilan (0–1), calculée au lieu d'être saisie : 0,3 de base + 0,1 par repère
 * documenté par un test (seuils mesurés ou CP/CS confirmées, VMA, PMA 5 min, CSS, VO₂max labo), plafond 0,9.
 * null quand rien n'est documenté (comportement des bilans sans fiabilité saisie).
 */
export function snapshotConfidence(f: Form): number | null {
  const n = documentedAnchors(f);
  return n === 0 ? null : Math.min(0.9, Math.round((0.3 + 0.1 * n) * 10) / 10);
}

/** Qualité du protocole (1–5) : 4 si un seuil est documenté par un test, sinon la valeur importée ou 3. */
export function snapshotProtocolQuality(f: Form): number {
  const critical = parseStoredCriticalMetrics(f.critical_metrics);
  const measured = critical.cycling?.status === "confirmed" || critical.running?.status === "confirmed"
    || MEASURED_ORIGINS.has(f.ftp_origin ?? "") || MEASURED_ORIGINS.has(f.pace_threshold_origin ?? "");
  const imported = num(f.protocol_quality);
  const base = imported != null && !Number.isNaN(imported) && imported >= 1 && imported <= 5 ? Math.round(imported) : 3;
  return measured ? Math.max(4, base) : base;
}


/**
 * Durée tenue au seuil (TTE) et intensité réellement tenue.
 * Une TTE n'a de sens qu'au seuil du bilan : tenue à plus de 5 % d'écart (FTP mal calibrée,
 * allure seuil changée), elle est gardée pour information dans field_sources mais retirée des calculs.
 */
export const TTE_THRESHOLD_TOLERANCE = 0.05;
const mmss = (sec: number) => { const t = Math.round(sec); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

export function tteFromForm(f: Form, sport: "bike" | "run"): { minutes: number | null; ref: number | null; threshold: number | null; stale: boolean; refLabel: string; thresholdLabel: string } {
  const minutes = num(sport === "bike" ? f.tte_observed_min : f.tte_observed_min_run);
  const ref = sport === "bike" ? num(f.tte_ref_w) : paceToSec(f.tte_ref_pace);
  const threshold = sport === "bike" ? num(f.ftp) : paceToSec(f.pace_threshold);
  const valid = (v: number | null) => v != null && !Number.isNaN(v) && v > 0;
  const stale = valid(minutes) && valid(ref) && valid(threshold) && Math.abs(ref! - threshold!) / threshold! > TTE_THRESHOLD_TOLERANCE;
  const label = (v: number | null) => !valid(v) ? "" : sport === "bike" ? `${Math.round(v!)} W` : `${mmss(v!)}/km`;
  return { minutes: valid(minutes) ? minutes : null, ref: valid(ref) ? ref : null, threshold: valid(threshold) ? threshold : null, stale, refLabel: label(ref), thresholdLabel: label(threshold) };
}

const TTE_KEYS = { bike: { column: "tte_observed_min", record: "tte_observed_min_record" }, run: { column: "tte_observed_min_run", record: "tte_observed_min_run_record" } } as const;

/** Colonnes TTE + field_sources à enregistrer. TTE tenue à un autre seuil → colonne vide, valeur gardée à part. */
export function writeTte(fieldSources: unknown, f: Form, date: string): { tte_observed_min: number | null; tte_observed_min_run: number | null; field_sources: Record<string, unknown> } {
  const next = { ...obj(fieldSources) };
  const out = { tte_observed_min: null as number | null, tte_observed_min_run: null as number | null };
  for (const sport of ["bike", "run"] as const) {
    const t = tteFromForm(f, sport);
    const { column, record } = TTE_KEYS[sport];
    delete next[column]; delete next[record];
    if (t.minutes == null) continue;
    const meta = { ...(t.ref != null ? (sport === "bike" ? { refW: Math.round(t.ref) } : { refPaceSec: Math.round(t.ref) }) : {}) };
    if (t.stale) next[record] = { value: Math.round(t.minutes), date, ...meta, threshold: Math.round(t.threshold!), note: "Tenue à un autre seuil : hors calculs, à refaire." };
    else {
      out[column] = Math.round(t.minutes);
      if (Object.keys(meta).length) next[column] = meta;
    }
  }
  return { ...out, field_sources: next };
}

/** Valeurs de formulaire depuis un bilan (TTE en calcul ou gardée à part). */
export function readTte(snapshot: { tte_observed_min?: number | null; tte_observed_min_run?: number | null; field_sources?: unknown }) {
  const fs = obj(snapshot.field_sources);
  const pick = (sport: "bike" | "run") => {
    const { column, record } = TTE_KEYS[sport];
    const stored = sport === "bike" ? snapshot.tte_observed_min : snapshot.tte_observed_min_run;
    const meta = obj(fs[column]), rec = obj(fs[record]);
    const value = typeof stored === "number" && stored > 0 ? stored : typeof rec.value === "number" ? rec.value : null;
    const ref = sport === "bike" ? (meta.refW ?? rec.refW) : (meta.refPaceSec ?? rec.refPaceSec);
    return { value, ref: typeof ref === "number" ? ref : null, stale: !(typeof stored === "number" && stored > 0) && typeof rec.value === "number", threshold: typeof rec.threshold === "number" ? rec.threshold : null };
  };
  return { bike: pick("bike"), run: pick("run"), formatPace: mmss };
}
