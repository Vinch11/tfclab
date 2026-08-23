/**
 * MIRROR (edge function) de `src/lib/v2/vlamaxTargets.ts` — SOURCE UNIQUE côté client,
 * portée ici verbatim (fonctions pures, aucune dépendance runtime spécifique) car
 * l'edge function Deno ne peut pas importer directement depuis `src/` (build séparé).
 *
 * ⚠️ Si tu modifies `src/lib/v2/vlamaxTargets.ts`, reporte le changement ici À L'IDENTIQUE.
 *
 * Historique : l'ancien mirror utilisait une table indexée par ambition, ancrée sur le
 * vélo (+offset pour dériver la course). La source client a migré en juillet 2026 vers une
 * cible universelle PAR DISTANCE (indépendante de l'ambition), ancrée sur la course
 * (−offset pour dériver le vélo) — ce mirror n'a jamais été resynchronisé, produisant des
 * cibles VLamax contradictoires entre le Dashboard/diagnostic (source client) et le plan IA
 * (cette table) dans un même prompt. Corrigé en portant la logique canonique ici.
 */

export type AmbitionLevel = "finisher" | "age_group" | "competitor" | "elite" | "world_class";
export interface VLamaxRange { min: number; max: number; optimal: number }

interface VlamaxTargetRange {
  ideal: number;
  min: number;
  max: number;
}

type VlamaxDiscipline = "bike" | "run" | "swim";

// ── Table canonique COURSE (valeurs universelles par distance) — identique à
// src/lib/v2/vlamaxTargets.ts RUN_TARGETS. Ancrages : Mader-Heck + INSCYD 2026.
const RUN_TARGETS: Record<string, VlamaxTargetRange> = {
  "5k":       { ideal: 0.50, min: 0.35, max: 0.70 },
  "10k":      { ideal: 0.45, min: 0.35, max: 0.60 },
  "semi":     { ideal: 0.40, min: 0.35, max: 0.48 },
  "marathon": { ideal: 0.34, min: 0.28, max: 0.42 },
  "trail":    { ideal: 0.38, min: 0.30, max: 0.48 },
  "703":      { ideal: 0.36, min: 0.28, max: 0.44 },
  "im":       { ideal: 0.32, min: 0.25, max: 0.40 },
};

const RUN_TO_BIKE_OFFSET = 0.06;
const FLOOR = 0.20;

/** Identique à normalizeVlamaxKey() de src/lib/v2/vlamaxTargets.ts. */
function normalizeVlamaxKey(objectif: string | null | undefined): keyof typeof RUN_TARGETS {
  if (!objectif) return "703";
  const raw = String(objectif).toLowerCase().trim();
  const s = raw.replace(/[\s_\-.]/g, "");

  if (s === "5k" || s === "5km" || s === "5000m") return "5k";
  if (s === "10k" || s === "10km" || s === "10000m") return "10k";
  if (s.includes("semi") || s.includes("half")) return "semi";
  if (s.includes("marathon") && !s.includes("semi") && !s.includes("half")) {
    if (s.includes("ironman") || s.includes("im")) return "im";
    return "marathon";
  }
  if (s.includes("ultra")) return "im";
  if (s.includes("trail")) return "trail";
  if (s === "703" || s.includes("703") || s.includes("halfironman") || s.includes("imh") || s === "ims") return "703";
  if (s.includes("ironman") || s === "im" || s.includes("fullim")) return "im";
  if (s === "cycling" || s === "bike" || s === "velo") return "703";
  if (s.includes("startto")) return "10k";
  return "703";
}

/** Identique à getVlamaxTarget() de src/lib/v2/vlamaxTargets.ts. */
function getVlamaxTarget(
  objectif: string | null | undefined,
  discipline: VlamaxDiscipline = "run",
): VlamaxTargetRange {
  const key = normalizeVlamaxKey(objectif);
  const run = RUN_TARGETS[key];

  if (discipline === "run") return { ...run };

  // bike / swim : offset −0.06, plancher 0.20
  const shift = (v: number) => Math.max(FLOOR, +(v - RUN_TO_BIKE_OFFSET).toFixed(2));
  return {
    ideal: shift(run.ideal),
    min: shift(run.min),
    max: shift(run.max),
  };
}

/**
 * Signature conservée pour compat avec le point d'appel existant (promptHelpers.ts).
 * `ambition` n'est plus utilisé : la cible VLamax est universelle par distance (cf.
 * commentaire d'en-tête), le paramètre est conservé pour ne pas casser l'appelant.
 */
export function getVLamaxRangeForPlan(
  objectif: string | null | undefined,
  _ambition: string | null | undefined,
  sport?: string | null,
): VLamaxRange {
  const s = (sport || "").toLowerCase();
  const discipline: VlamaxDiscipline =
    s === "cap" || s === "run" || s === "running" ? "run"
    : s === "swim" ? "swim"
    : "bike";
  const range = getVlamaxTarget(objectif, discipline);
  return { min: range.min, max: range.max, optimal: range.ideal };
}
