/**
 * Prévu / réel : le chrono réel d'une course est gardé avec la prévision du moment, pour mesurer
 * l'écart et ajuster la simulation avec les vrais résultats des athlètes.
 * Rangé dans athletes.refs.raceResults (même principe que refs.compassPerformance), clé = course.
 */
import type { RaceCard, SegmentSport } from "./raceCard";

export interface StoredRaceResult {
  raceKey: string;
  kind: string;
  date: string | null;
  /** Temps réels (s) : total et segments saisis. */
  actual: { totalSec: number; swimSec?: number | null; bikeSec?: number | null; runSec?: number | null };
  /** Prévision au moment de la saisie (min). */
  predicted: { totalMin: number | null; segments: Partial<Record<SegmentSport, number>> };
  savedAt: string;
}

export function readRaceResults(refs: unknown): Record<string, StoredRaceResult> {
  const v = refs && typeof refs === "object" ? (refs as Record<string, unknown>).raceResults : null;
  return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, StoredRaceResult> : {};
}

export function withRaceResult(refs: unknown, result: StoredRaceResult): Record<string, unknown> {
  const base = refs && typeof refs === "object" && !Array.isArray(refs) ? { ...(refs as Record<string, unknown>) } : {};
  return { ...base, raceResults: { ...readRaceResults(refs), [result.raceKey]: result } };
}

export function withoutRaceResult(refs: unknown, raceKey: string): Record<string, unknown> {
  const base = refs && typeof refs === "object" && !Array.isArray(refs) ? { ...(refs as Record<string, unknown>) } : {};
  const results = { ...readRaceResults(refs) };
  delete results[raceKey];
  return { ...base, raceResults: results };
}

/** « 3:58:12 », « 3h58 », « 58:30 » ou « 58 » (minutes) → secondes. */
export function parseRaceTime(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/\s/g, "");
  if (!t) return null;
  let m = t.match(/^(\d{1,2})h(\d{1,2})(?:[:m'](\d{1,2}))?/);
  if (m) return +m[1] * 3600 + +m[2] * 60 + (m[3] ? +m[3] : 0);
  m = t.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  m = t.match(/^(\d{1,3}):(\d{2})$/);
  if (m) return +m[1] * 60 + +m[2];
  m = t.match(/^(\d{1,3})$/);
  if (m) return +m[1] * 60;
  return null;
}

export const fmtRaceTime = (sec: number) => {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};

export function snapshotPrediction(card: RaceCard): StoredRaceResult["predicted"] {
  const segments: Partial<Record<SegmentSport, number>> = {};
  for (const s of card.segments) if (s.timeMin != null && (s.sport === "swim" || s.sport === "bike" || s.sport === "run")) segments[s.sport] = Math.round(s.timeMin * 10) / 10;
  // Long Course Weekend : pas de total enchaîné, la somme des trois épreuves sert de référence.
  const sum = card.lcw && segments.swim && segments.bike && segments.run ? segments.swim + segments.bike + segments.run : null;
  const total = card.totalMin ?? sum;
  return { totalMin: total != null ? Math.round(total * 10) / 10 : null, segments };
}

export interface ResultComparison { label: string; predictedMin: number; actualMin: number; deltaPct: number }
/** Écart réel − prévu par segment et au total, en % du prévu (positif = plus lent que prévu). */
export function compareResult(r: StoredRaceResult): { rows: ResultComparison[]; reading: string } {
  const rows: ResultComparison[] = [];
  const add = (label: string, predicted: number | null | undefined, actualSec: number | null | undefined) => {
    if (!predicted || !actualSec) return;
    const actualMin = actualSec / 60;
    rows.push({ label, predictedMin: predicted, actualMin, deltaPct: (actualMin - predicted) / predicted * 100 });
  };
  add("Natation", r.predicted.segments.swim, r.actual.swimSec);
  add("Vélo", r.predicted.segments.bike, r.actual.bikeSec);
  add("Course", r.predicted.segments.run, r.actual.runSec);
  add("Total", r.predicted.totalMin, r.actual.totalSec);
  const total = rows.find(x => x.label === "Total");
  const worst = rows.filter(x => x.label !== "Total").sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))[0];
  const reading = !total ? "Ajoute le temps total pour comparer."
    : Math.abs(total.deltaPct) <= 3 ? "Prévision juste (écart de 3 % ou moins)."
    : `${total.deltaPct > 0 ? "Plus lent" : "Plus rapide"} que prévu de ${Math.abs(total.deltaPct).toFixed(1).replace(".", ",")} %${worst && Math.abs(worst.deltaPct) > 3 ? `, surtout en ${worst.label.toLowerCase()}` : ""} : vérifier les tests de référence ou les conditions du jour.`;
  return { rows, reading };
}
