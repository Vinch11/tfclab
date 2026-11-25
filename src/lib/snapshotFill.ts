/**
 * Remplissage de la fiche depuis une autre source (bilan des Days, rapport labo).
 * Règle commune : une case déjà remplie n'est jamais remplacée, et chaque valeur reprise
 * garde l'étiquette de sa source.
 */
import { criticalEnvelope } from "@/lib/criticalMetrics";

export type FillSource = "Days" | "Nolio" | "Labo";

/** Valeurs mesurées reprises d'un bilan ; la provenance suit sa valeur. */
export const FILLABLE_FIELDS = [
  "fc_max", "fc_repos", "weight_kg", "fat_pct", "sport_main",
  "pmax_5s", "p30s_w", "p60s_w", "map5min_w", "ftp", "tte_observed_min", "tte_ref_w",
  "sprint_15s", "vma", "pace_threshold", "tte_observed_min_run", "tte_ref_pace",
  "run_pace_ref", "run_hr_ref", "run_duration_min", "run_hr_drift_pct",
  "css", "vo2max", "vlamax", "vlamax_run",
  "run_power_max", "run_power_threshold", "run_power_1s", "run_power_5s", "run_power_30s", "run_power_60s", "run_power_5min",
] as const;
const ORIGIN_OF: Record<string, string> = { ftp: "ftp_origin", pace_threshold: "pace_threshold_origin", vo2max: "vo2max_origin" };

const empty = (v: unknown) => v === undefined || v === null || String(v).trim() === "";

/** Fusion « cases vides seulement ». Retourne le nouveau formulaire et les champs remplis. */
export function fillEmpty<T extends Record<string, unknown>>(form: T, incoming: Record<string, unknown>): { form: T; filled: string[] } {
  const next: Record<string, unknown> = { ...form };
  const filled: string[] = [];
  for (const key of FILLABLE_FIELDS) {
    const value = incoming[key];
    if (empty(value) || !empty(next[key])) continue;
    next[key] = String(value);
    filled.push(key);
    const origin = ORIGIN_OF[key];
    if (origin && !empty(incoming[origin])) next[origin] = String(incoming[origin]);
  }
  // Repères critiques et durabilité : on ajoute seulement les sports absents.
  const mine = criticalEnvelope(next.critical_metrics);
  const theirs = criticalEnvelope(incoming.critical_metrics);
  const added = Object.keys(theirs).filter(k => !(k in mine));
  if (added.length) {
    next.critical_metrics = JSON.stringify({ ...mine, ...Object.fromEntries(added.map(k => [k, theirs[k]])) });
    filled.push("critical_metrics");
  }
  return { form: next as T, filled };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? String(v) : "");

/** Rapport labo (snapshot partiel) → valeurs de fiche ; VO₂max marquée « labo », VLamax mesurée. */
export function labValuesToForm(lab: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {
    vo2max: num(lab.vo2max), vma: num(lab.vma), ftp: num(lab.ftp), pmax_5s: num(lab.pmax_5s),
    weight_kg: num(lab.weight_kg), fat_pct: num(lab.fat_pct), fc_max: num(lab.fc_max), vlamax: num(lab.vlamax),
  };
  if (out.vo2max) out.vo2max_origin = "lab";
  if (out.ftp) out.ftp_origin = "entered";
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== ""));
}
