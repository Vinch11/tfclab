/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ACTUALISATION DES VALEURS PHYSIOLOGIQUES D'UN PLAN DÉJÀ GÉNÉRÉ
 * ═══════════════════════════════════════════════════════════════════════════════
 * Objectif : quand le FTP / la VMA / le CSS de l'athlète évoluent, on veut
 * remettre à jour les valeurs absolues du plan (watts, allures, s/100m) SANS
 * régénérer les séances (structure et pédagogie conservées).
 *
 * Principe :
 *   1. On retire du texte les annotations absolues figées "(246-263W)",
 *      "(5:33-6:15/km)", "(1:35/100m)" — écrites lors d'une génération/export
 *      antérieur avec l'ancienne physiologie.
 *   2. L'affichage (enrichWithAbsoluteValues) ré-annote à partir de la
 *      TargetTable courante, donc recalculée sur le snapshot actif.
 *
 * Les intensités relatives (Z1..Z7, %FTP, %VMA, CSS±Xs) ne sont jamais touchées :
 * elles sont la source de vérité, les valeurs absolues n'en sont qu'un rendu.
 *
 * Limite assumée : un écart important de physiologie change aussi la structure
 * optimale des séances (durée de bloc, densité). Au-delà de DRIFT_ALERT_PCT, on
 * recommande explicitement une régénération des blocs restants.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { ParsedPlan } from "@/lib/aiPlanParser";

/** Référentiel physiologique utilisé au moment de la génération. */
export interface PlanPhysioRefs {
  ftp?: number | null;
  vma?: number | null;
  css?: number | null;
  fcMax?: number | null;
  paceThresholdSecPerKm?: number | null;
  capturedAt?: string;
}

/** Seuil au-delà duquel une simple actualisation ne suffit plus. */
export const DRIFT_ALERT_PCT = 8;

export interface DriftItem {
  key: "ftp" | "vma" | "css" | "fcMax";
  label: string;
  unit: string;
  oldValue: number;
  newValue: number;
  /** Écart relatif signé, en % (positif = progression de performance). */
  pct: number;
}

const DRIFT_FIELDS: { key: DriftItem["key"]; label: string; unit: string; inverted: boolean }[] = [
  { key: "ftp", label: "FTP", unit: "W", inverted: false },
  { key: "vma", label: "VMA", unit: "km/h", inverted: false },
  { key: "css", label: "CSS", unit: "s/100m", inverted: true }, // plus bas = meilleur
  { key: "fcMax", label: "FCmax", unit: "bpm", inverted: false },
];

/** Écart entre la physiologie de génération et la physiologie actuelle. */
export function computePhysioDrift(
  baseline: PlanPhysioRefs | null | undefined,
  current: PlanPhysioRefs | null | undefined,
): { items: DriftItem[]; maxAbsPct: number; needsRegeneration: boolean } {
  const items: DriftItem[] = [];
  if (baseline && current) {
    for (const f of DRIFT_FIELDS) {
      const oldValue = baseline[f.key];
      const newValue = current[f.key];
      if (typeof oldValue !== "number" || typeof newValue !== "number") continue;
      if (oldValue <= 0 || newValue <= 0) continue;
      if (oldValue === newValue) continue;
      const raw = ((newValue - oldValue) / oldValue) * 100;
      items.push({
        key: f.key,
        label: f.label,
        unit: f.unit,
        oldValue,
        newValue,
        pct: Math.round((f.inverted ? -raw : raw) * 10) / 10,
      });
    }
  }
  const maxAbsPct = items.reduce((m, i) => Math.max(m, Math.abs(i.pct)), 0);
  return { items, maxAbsPct, needsRegeneration: maxAbsPct >= DRIFT_ALERT_PCT };
}

/**
 * Annotation absolue figée : parenthèse ne contenant que des nombres/temps et
 * une unité pilotable (W, /km, /100m, bpm). On ne touche pas aux parenthèses
 * pédagogiques ("(récup active)", "(RPE 6/10)"…).
 */
const STALE_ANNOTATION_RX =
  /\s*\((?:\d{1,3}:)?\d{1,4}(?:[.,]\d+)?\s*(?:[-–]\s*(?:\d{1,3}:)?\d{1,4}(?:[.,]\d+)?\s*)?(?:W|w|bpm|\/\s*km|\/\s*100\s*m)\)/g;

/** Retire les valeurs absolues figées d'un texte de séance. */
export function stripStaleAbsoluteValues(text: string): string {
  if (!text) return text;
  return text.replace(STALE_ANNOTATION_RX, "");
}

export interface RefreshResult {
  plan: ParsedPlan;
  /** Nombre de séances dont le texte a été nettoyé. */
  changedSessions: number;
}

/**
 * Retire du plan toutes les valeurs absolues figées et réenregistre le
 * référentiel physiologique courant. L'affichage recalcule ensuite les valeurs.
 */
export function refreshPlanAbsoluteValues(
  plan: ParsedPlan,
  currentRefs: PlanPhysioRefs,
): RefreshResult {
  let changedSessions = 0;
  const weeks = plan.weeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => {
      const title = stripStaleAbsoluteValues(s.title ?? "");
      const details = stripStaleAbsoluteValues(s.details ?? "");
      if (title === (s.title ?? "") && details === (s.details ?? "")) return s;
      changedSessions++;
      return { ...s, title, details };
    }),
  }));

  return {
    plan: {
      ...plan,
      weeks,
      physioRefs: { ...currentRefs, capturedAt: new Date().toISOString() },
    },
    changedSessions,
  };
}
