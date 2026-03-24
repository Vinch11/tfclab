/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WORKOUT CATALOG BUILDER
 * 
 * Filters the full workout library by goal + phase and serializes
 * a compact catalog (20-30 sessions) for injection into the AI prompt.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout, WorkoutGoal, PhaseTag, TrainingSport } from "@/types/workoutLibrary";
import { WorkoutLibrary } from "./workoutLibrary";

/** Compact session representation for the AI prompt */
export interface CatalogEntry {
  id: string;
  cat: string;
  sport: string;
  objectif: string;
  phase: string[];
  durationMin: [number, number];
  structure: string; // Condensed single-line
  variants?: string;
  dPlusTargetM?: number | { min: number; max: number };
}

/** Map objective strings to WorkoutGoal values */
function normalizeGoal(objective: string): WorkoutGoal[] {
  const lower = objective.toLowerCase();
  // Order matters: check specific patterns before generic ones
  if (lower.includes("70.3") || lower === "703") return ["half"];
  if (lower.includes("ironman") || lower === "im") return ["ironman"];
  // Trail variants (most specific first)
  if (lower.includes("trail") && (lower.includes("ultra") || lower.includes(">80") || lower.includes("utmb"))) return ["trail_ultra", "trail_long", "trail_mountain"];
  if (lower.includes("trail") && (lower.includes("mont") || lower.includes("mountain") || lower.includes("60") || lower.includes("80"))) return ["trail_mountain", "trail_long", "trail_short"];
  if (lower.includes("trail") && (lower.includes("court") || lower.includes("short") || lower.includes("<42") || lower.includes("30k") || lower.includes("50k") || lower.includes("20-50"))) return ["trail_short", "trail_mountain"];
  if (lower.includes("trail")) return ["trail_short", "trail_mountain", "trail_long"];
  // Running distances
  if (lower.includes("semi")) return ["semi", "10k"];
  if (lower.includes("marathon")) return ["marathon", "semi"];
  if (lower.includes("10k") || lower.includes("10km") || lower.includes("10 km")) return ["10k", "semi"];
  if (lower.includes("5k") || lower.includes("5km") || lower.includes("5 km")) return ["10k"];
  // Start to run / débutant
  if (lower.includes("start") || lower.includes("débutant") || lower.includes("beginner")) return ["10k"];
  // Triathlon generic
  if (lower.includes("triathlon") || lower.includes("tri")) return ["ironman", "half"];
  return [];
}

/** Determine which phases are relevant for a given week range */
export function phasesForWeekRange(
  weekStart: number,
  weekEnd: number,
  totalWeeks: number
): PhaseTag[] {
  const phases: PhaseTag[] = [];
  const pct = (w: number) => w / totalWeeks;

  // base: 0-35%, build: 25-65%, peak: 55-85%, taper: 80-100%
  const midPct = pct((weekStart + weekEnd) / 2);
  if (midPct <= 0.40) phases.push("base");
  if (midPct >= 0.20 && midPct <= 0.70) phases.push("build");
  if (midPct >= 0.55 && midPct <= 0.90) phases.push("peak");
  if (midPct >= 0.80) phases.push("taper");

  return phases.length > 0 ? phases : ["base", "build"];
}

/** Score a workout for relevance to the given goal + phases */
function scoreWorkout(w: LibraryWorkout, goals: WorkoutGoal[], phases: PhaseTag[]): number {
  let score = 0;

  // Goal match
  if (w.goals && w.goals.length > 0) {
    const goalMatch = w.goals.some(g => goals.includes(g));
    if (goalMatch) score += 10;
    else score -= 5;
  }

  // Phase match
  if (w.phase && w.phase.length > 0) {
    const phaseMatch = w.phase.some(p => phases.includes(p));
    if (phaseMatch) score += 8;
    else score -= 3;
  }

  // Bonus for obligatory sessions
  if (w.necessite === "Obligatoire") score += 3;
  if (w.necessite === "Recommandé") score += 1;

  // Bonus for trail-specific sessions when goal is trail
  const isTrailGoal = goals.some(g => g.startsWith("trail_"));
  if (isTrailGoal && w.tags?.some(t => t === "trail")) score += 5;
  if (isTrailGoal && w.dPlusTargetM) score += 3;

  return score;
}

/** Condense a workout's structure into a single line for the prompt */
function condenseStructure(w: LibraryWorkout): string {
  return w.structure
    .map(s => `${s.part}: ${s.text} [${s.zones.join(",")}]`)
    .join(" | ");
}

/** Pick the best variant string for the given goals */
function pickVariant(w: LibraryWorkout, goals: WorkoutGoal[]): string | undefined {
  if (!w.variants) return undefined;
  for (const g of goals) {
    const v = w.variants[g];
    if (v) return `${g}: ${v}`;
  }
  // Fallback: first available variant
  const entries = Object.entries(w.variants);
  if (entries.length > 0) return `${entries[0][0]}: ${entries[0][1]}`;
  return undefined;
}

/**
 * Build a filtered catalog of 20-30 sessions relevant to the given
 * objective, current phase range, and optional sport filter.
 */
export function buildWorkoutCatalog(
  objective: string,
  weekStart: number,
  weekEnd: number,
  totalWeeks: number,
  options?: {
    sportFilter?: TrainingSport[];
    limiters?: string[];
    maxItems?: number;
  }
): CatalogEntry[] {
  const goals = normalizeGoal(objective);
  const phases = phasesForWeekRange(weekStart, weekEnd, totalWeeks);
  const maxItems = options?.maxItems || 30;

  // Score and sort all workouts
  const scored = WorkoutLibrary
    .filter(w => {
      // Sport filter
      if (options?.sportFilter && options.sportFilter.length > 0) {
        if (!options.sportFilter.includes(w.sport)) return false;
      }
      return true;
    })
    .map(w => ({ workout: w, score: scoreWorkout(w, goals, phases) }))
    .sort((a, b) => b.score - a.score);

  // Ensure sport diversity: pick top items but ensure at least 3 per sport category
  const selected: LibraryWorkout[] = [];
  const sportCounts: Record<string, number> = {};
  const catCounts: Record<string, number> = {};

  // First pass: top scored items with diversity constraints
  for (const { workout, score } of scored) {
    if (selected.length >= maxItems) break;
    if (score < 0) continue;

    const sport = workout.sport;
    const cat = workout.cat;
    
    // Cap per sport (max 15) and per category (max 10)
    if ((sportCounts[sport] || 0) >= 15) continue;
    if ((catCounts[cat] || 0) >= 10) continue;

    selected.push(workout);
    sportCounts[sport] = (sportCounts[sport] || 0) + 1;
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }

  // Convert to compact entries
  return selected.map(w => ({
    id: w.id,
    cat: w.cat,
    sport: w.sport,
    objectif: w.objectif,
    phase: w.phase || [],
    durationMin: w.durationMin,
    structure: condenseStructure(w),
    variants: pickVariant(w, goals),
    ...(w.dPlusTargetM ? { dPlusTargetM: w.dPlusTargetM } : {}),
  }));
}

/**
 * Serialize the catalog to a markdown table for prompt injection.
 * Compact format to minimize token usage.
 */
export function serializeCatalogForPrompt(catalog: CatalogEntry[]): string {
  if (catalog.length === 0) return "";

  const lines: string[] = [];
  lines.push("\n### 📚 CATALOGUE DE SÉANCES VALIDÉES TFCL™ (OBLIGATOIRE)");
  lines.push("⚠️ Tu DOIS utiliser les séances ci-dessous comme base pour construire le plan.");
  lines.push("Chaque séance clé 🔑 doit correspondre à une entrée de ce catalogue (utilise l'ID).");
  lines.push("Tu peux adapter les durées et zones selon la progression, mais le protocole de base doit correspondre.\n");

  const hasTrailDPlus = catalog.some(e => e.dPlusTargetM);

  if (hasTrailDPlus) {
    lines.push("| ID | Cat | Sport | Objectif | Phases | Durée (min) | D+ cible (m) | Structure |");
    lines.push("|-----|-----|-------|----------|--------|-------------|--------------|-----------|");
  } else {
    lines.push("| ID | Cat | Sport | Objectif | Phases | Durée (min) | Structure |");
    lines.push("|-----|-----|-------|----------|--------|-------------|-----------|");
  }

  for (const e of catalog) {
    const phases = e.phase.join(",") || "all";
    const dur = `${e.durationMin[0]}-${e.durationMin[1]}`;
    const struct = e.structure.length > 120 ? e.structure.slice(0, 117) + "..." : e.structure;
    const dPlus = e.dPlusTargetM
      ? (typeof e.dPlusTargetM === "number" ? `${e.dPlusTargetM}` : `${e.dPlusTargetM.min}-${e.dPlusTargetM.max}`)
      : "—";
    if (hasTrailDPlus) {
      lines.push(`| ${e.id} | ${e.cat} | ${e.sport} | ${e.objectif.slice(0, 50)} | ${phases} | ${dur} | ${dPlus} | ${struct} |`);
    } else {
      lines.push(`| ${e.id} | ${e.cat} | ${e.sport} | ${e.objectif.slice(0, 50)} | ${phases} | ${dur} | ${struct} |`);
    }
  }

  if (catalog.some(e => e.variants)) {
    lines.push("\n**Variantes par objectif :**");
    for (const e of catalog) {
      if (e.variants) {
        lines.push(`- **${e.id}** : ${e.variants}`);
      }
    }
  }

  lines.push("\n⚠️ RÈGLES D'UTILISATION DU CATALOGUE :");
  lines.push("1. Pour chaque séance clé 🔑, CITE l'ID du catalogue (ex: 'A_RUN_Z2_EASY')");
  lines.push("2. Adapte la durée selon la semaine (progression) mais garde le protocole");
  lines.push("3. Si aucune séance du catalogue ne correspond, tu PEUX créer une séance custom mais mentionne 'CUSTOM'");
  lines.push("4. Les séances de récupération et repos ne nécessitent pas d'ID catalogue");

  return lines.join("\n");
}
