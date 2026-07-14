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
import { LIMITER_SESSION_PATTERNS, PROHIBITION_SESSION_PATTERNS, resolveLimiterKey, resolveProhibitionKeys } from "./limiterSessionPatterns";

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

/** Detect if a workout belongs to V5 (Elite) or V6 (Anti-monotony) modules */
function isEliteOrAntiMonotony(w: LibraryWorkout): boolean {
  const id = w.id.toUpperCase();

  // Tag-based detection (fastest path)
  if (w.tags?.some(t => [
    "elite", "anti-monotony",
    "pyramid", "descending", "fartlek", "circuit",
    "isometric", "nordic", "heat", "PAP", "swim-cord",
    "respiratory", "mental", "lactate-shuttle"
  ].includes(t))) return true;

  // V6 anti-monotony ID patterns
  if (id.includes("PYRAMID") || id.includes("DESCENDING") ||
      id.includes("FARTLEK") || id.includes("CIRCUIT_CARDIO")) return true;

  // V5 elite ID patterns — aligned with actual enrichedWorkoutsV5 IDs
  if (id.includes("ISOMETRIC") || id.includes("NORDIC") ||
      id.includes("HEAT_ACCLIM") || id.includes("LACTATE_SHUTTLE") ||
      id.includes("RESP_INSPIRATORY") || id.includes("IMT_RESPIRATORY") ||
      id.includes("PAP_") || id.includes("SWIM_CORD") ||
      id.includes("MENTAL_RACE") || id.includes("MENTAL_REHEARSAL")) return true;

  return false;
}

/**
 * STRUCTURAL SESSION PREDICATE (F-CHUNK-STRUCT)
 * ---------------------------------------------
 * Certaines séances sont des piliers hebdomadaires du plan tri
 * (sortie longue vélo, sortie longue course, brick long, race-sim).
 * Elles DOIVENT être disponibles dans CHAQUE chunk — leur répétition
 * d'un chunk à l'autre n'est pas un défaut de variété mais un principe
 * d'entraînement. On les exempte donc de l'exclusion anti-répétition.
 *
 * Règle : durée médiane ≥ 120min OU cat contient "Race-Sim"
 *         OU tags incluent sortie-longue / SL / long / long-run / race-sim / brick.
 */
export function isStructuralSession(w: LibraryWorkout): boolean {
  const median = (w.durationMin[0] + w.durationMin[1]) / 2;
  if (median >= 120) return true;
  const cat = String(w.cat || "").toLowerCase();
  if (cat.includes("race-sim") || cat.includes("race_sim")) return true;
  const tags = (w.tags || []).map(t => String(t).toLowerCase());
  if (tags.some(t => (
    t === "sortie-longue" || t === "sl" || t === "long" ||
    t === "long-run" || t === "long-ride" || t === "race-sim" ||
    t === "brick" || t === "brick-long"
  ))) return true;
  const objLower = String(w.objectif || "").toLowerCase();
  if (/\bsortie\s*longue\b|\blong\s*run\b|\blong\s*ride\b|\brace[-\s]?sim\b/.test(objLower)) return true;
  return false;
}

/** Score a workout for relevance to the given goal + phases */
/** Hard-exclude trail patterns for non-trail objectives */
const TRAIL_HARD_ID_RX = /^[A-D]_TR(?:50)?_|^EXPE_HORS_VILLE_|^V3_TRAIL_|^HEDGEHOG_|^URBAN_/i;

function scoreWorkout(
  w: LibraryWorkout,
  goals: WorkoutGoal[],
  phases: PhaseTag[],
  limiterKeys?: { primary?: string; secondary?: string }
): number {
  // ─── HARD-BAN TRAIL sur objectifs non-trail ───
  const isTrailGoal = goals.some(g => g.startsWith("trail_"));
  if (!isTrailGoal) {
    const hasTrailTag = w.tags?.some(t => String(t).toLowerCase() === "trail");
    if (hasTrailTag || TRAIL_HARD_ID_RX.test(w.id)) return -1000;
  }

  let score = 0;

  // Goal match — no penalty for unmatched to maximize diversity
  if (w.goals && w.goals.length > 0) {
    const goalMatch = w.goals.some(g => goals.includes(g));
    if (goalMatch) {
      score += 10;
      if (w.goals.length <= 2) score += 4;
      else if (w.goals.length <= 4) score += 2;
      const allMatch = w.goals.every(g => goals.includes(g));
      if (allMatch) score += 3;
    }
  } else {
    score += 2;
  }

  // Phase match
  if (w.phase && w.phase.length > 0) {
    const phaseMatch = w.phase.some(p => phases.includes(p));
    if (phaseMatch) score += 8;
  }

  if (w.necessite === "Obligatoire") score += 3;
  if (w.necessite === "Recommandé") score += 1;

  if (isTrailGoal && w.tags?.some(t => t === "trail")) score += 5;
  if (isTrailGoal && w.dPlusTargetM) score += 3;

  if (isEliteOrAntiMonotony(w)) score += 4;

  // ─── Bonus technique modulé par phase (Lorang : technique en début de cycle) ───
  // Pattern resserré : retire `cadence`/`core`/`gainage` (trop larges → captent vélo + renfo).
  const structureTextTech = (w.structure || [])
    .map(s => `${s.part} ${s.text} ${s.zones.join(" ")}`)
    .join(" ");
  const techMatchText = `${w.objectif} ${structureTextTech} ${(w.tags || []).join(" ")}`;
  const isTechnical = /technique|éducatif|drill|gammes|strides|proprio|mobilit/i.test(techMatchText);
  if (isTechnical) {
    if (phases.includes("base")) score += 8;
    else if (phases.includes("build")) score += 4;
    else if (phases.includes("peak") || phases.includes("taper")) score -= 2;
  }

  // ─── Bonus volume aérobie en phase base (socle Lorang) ───
  // Match sur objectif + tags uniquement (pas les zones — quasi toutes les séances
  // ont "Z2" en échauffement, ce qui gonflerait le bonus).
  const aerobicMatchText = `${w.objectif} ${(w.tags || []).join(" ")}`;
  const isAerobicVolume = /endurance\s*(?:fondament|foncier|longue|base|a[eé]robie)|sortie\s*longue|\bsl\b|long\s*(?:run|ride)|volume\s*a[eé]robie|steady\s*long|z2\s*(?:long|volume)/i.test(aerobicMatchText);
  if (isAerobicVolume && phases.includes("base")) {
    score += 6;
  }



  // ─── Limiter bonus (F-LIM) ───
  // Boost sessions whose text matches the diagnosed primary/secondary limiter.
  // Text = objectif + structure (all parts) + tags — même surface que planValidator.
  if (limiterKeys?.primary || limiterKeys?.secondary) {
    const structureText = (w.structure || [])
      .map(s => `${s.part} ${s.text} ${s.zones.join(" ")}`)
      .join(" ");
    const tagsText = (w.tags || []).join(" ");
    const matchText = `${w.objectif} ${structureText} ${tagsText}`;

    const primaryPattern = limiterKeys.primary ? LIMITER_SESSION_PATTERNS[limiterKeys.primary] : undefined;
    const secondaryPattern = limiterKeys.secondary ? LIMITER_SESSION_PATTERNS[limiterKeys.secondary] : undefined;

    if (primaryPattern && primaryPattern.test(matchText)) {
      score += 18;
    } else if (secondaryPattern && secondaryPattern.test(matchText)) {
      score += 8;
    }
  }

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
 * Build a filtered catalog of sessions relevant to the given
 * objective, current phase range, and optional sport filter.
 * 
 * v2: Increased capacity (60 items), diversity slots for V5/V6,
 * relaxed caps, and guaranteed minimum per sport.
 */
export function buildWorkoutCatalog(
  objective: string,
  weekStart: number,
  weekEnd: number,
  totalWeeks: number,
  options?: {
    sportFilter?: TrainingSport[];
    limiters?: string[];
    /** Raw prohibition messages (from planConfigBuilder.buildProhibitions) — will be resolved to keys. */
    prohibitions?: string[];
    maxItems?: number;
    /** Chunk index for rotation — different chunks get different secondary sessions */
    chunkIndex?: number;
    /** IDs already selected in previous chunks — avoid repeats */
    excludeIds?: Set<string>;
    /** Hard-exclude workouts whose id matches any of these regex (applied pre-scoring). */
    excludeIdPatterns?: RegExp[];
    /** Hard-exclude workouts whose tags include any of these values (applied pre-scoring). */
    excludeTags?: string[];
  }
): CatalogEntry[] {
  const goals = normalizeGoal(objective);
  const phases = phasesForWeekRange(weekStart, weekEnd, totalWeeks);
  const maxItems = options?.maxItems || 80;

  // Résolution des limiteurs (labels bruts → clés de patterns)
  const primaryKey = resolveLimiterKey(options?.limiters?.[0]);
  const secondaryKey = resolveLimiterKey(options?.limiters?.[1]);
  const limiterKeys = (primaryKey || secondaryKey) ? { primary: primaryKey, secondary: secondaryKey } : undefined;

  // ─── PROHIBITIONS : filtre d'exclusion pré-scoring (F-PROH) ───
  const activeProhibitionKeys = resolveProhibitionKeys(options?.prohibitions);
  const prohibitionPatterns = activeProhibitionKeys
    .map(k => PROHIBITION_SESSION_PATTERNS[k])
    .filter(Boolean);

  const matchesProhibition = (w: LibraryWorkout): boolean => {
    if (prohibitionPatterns.length === 0) return false;
    const structureText = (w.structure || [])
      .map(s => `${s.part} ${s.text} ${s.zones.join(" ")}`)
      .join(" ");
    const tagsText = (w.tags || []).join(" ");
    // FIX #3 : inclure l'ID catalogue (ex `A_BIKE_PMAX_01`, `HEDGEHOG_VMA_COURTE_01`)
    // pour capter les séances sprint/pmax dont le libellé seul n'expose pas le mot.
    const text = `${w.id ?? ""} ${w.objectif} ${structureText} ${tagsText}`;
    return prohibitionPatterns.some(p => p.test(text));
  };

  // Garde-fou : par sport, si l'exclusion réduit le pool sous MIN_VIABLE,
  // on rétablit les séances de ce sport (prohibition molle).
  const MIN_VIABLE_PER_SPORT = 8;
  const bypassProhibitionForSport = new Set<string>();
  if (prohibitionPatterns.length > 0) {
    const bySport: Record<string, { total: number; kept: number }> = {};
    for (const w of WorkoutLibrary) {
      if (options?.sportFilter && options.sportFilter.length > 0 && !options.sportFilter.includes(w.sport)) continue;
      const s = w.sport;
      bySport[s] = bySport[s] || { total: 0, kept: 0 };
      bySport[s].total++;
      if (!matchesProhibition(w)) bySport[s].kept++;
    }
    for (const [sport, { total, kept }] of Object.entries(bySport)) {
      if (total >= MIN_VIABLE_PER_SPORT && kept < MIN_VIABLE_PER_SPORT) {
        bypassProhibitionForSport.add(sport);
        console.warn(
          `[buildWorkoutCatalog] ⚠️ Prohibition molle pour sport="${sport}" : ` +
          `${kept}/${total} séances restantes après exclusion (min viable=${MIN_VIABLE_PER_SPORT}). ` +
          `Exclusion désactivée pour ce sport.`
        );
      }
    }
  }

  // Score and sort all workouts (avec exclusion prohibitions)
  let excludedCount = 0;
  const excludeIdPatterns = options?.excludeIdPatterns || [];
  const excludeTagsSet = new Set((options?.excludeTags || []).map(t => t.toLowerCase()));
  const scored = WorkoutLibrary
    .filter(w => {
      if (options?.sportFilter && options.sportFilter.length > 0) {
        if (!options.sportFilter.includes(w.sport)) return false;
      }
      if (options?.excludeIds?.has(w.id) && !isStructuralSession(w)) return false;
      if (excludeIdPatterns.length > 0 && excludeIdPatterns.some(rx => rx.test(w.id))) return false;
      if (excludeTagsSet.size > 0 && (w.tags || []).some(t => excludeTagsSet.has(String(t).toLowerCase()))) return false;
      if (prohibitionPatterns.length > 0 && !bypassProhibitionForSport.has(w.sport) && matchesProhibition(w)) {
        excludedCount++;
        return false;
      }
      return true;
    })
    .map(w => ({ workout: w, score: scoreWorkout(w, goals, phases, limiterKeys) }))
    .sort((a, b) => b.score - a.score);

  if (activeProhibitionKeys.length > 0) {
    console.log(
      `[buildWorkoutCatalog] Prohibitions actives: [${activeProhibitionKeys.join(", ")}] → ` +
      `${excludedCount} séance(s) exclue(s) du pool` +
      (bypassProhibitionForSport.size > 0 ? ` (bypass: ${Array.from(bypassProhibitionForSport).join(", ")})` : "")
    );
  }

  const selected: LibraryWorkout[] = [];
  const selectedIds = new Set<string>();
  const sportCounts: Record<string, number> = {};
  const catCounts: Record<string, number> = {};

  const mainSlots = Math.floor(maxItems * 0.75); // 75% for top-scored
  const diversitySlots = maxItems - mainSlots;    // 25% reserved for V5/V6 + rotation

  // ─── Pass 1: Top scored items with relaxed caps ───
  for (const { workout, score } of scored) {
    if (selected.length >= mainSlots) break;

    const sport = workout.sport;
    const cat = workout.cat;
    
    // Relaxed caps: 25/sport, 15/category
    if ((sportCounts[sport] || 0) >= 25) continue;
    if ((catCounts[cat] || 0) >= 15) continue;

    selected.push(workout);
    selectedIds.add(workout.id);
    sportCounts[sport] = (sportCounts[sport] || 0) + 1;
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }

  // ─── Pass 2: Diversity slots — guarantee V5/V6 representation ───
  const eliteSessions = scored
    .filter(({ workout }) => isEliteOrAntiMonotony(workout) && !selectedIds.has(workout.id))
    .map(s => s.workout);

  // Rotate which V5/V6 sessions are included per chunk
  const chunkIdx = options?.chunkIndex || 0;
  const rotationOffset = chunkIdx * 4; // Shift selection window by 4 per chunk

  for (let i = 0; i < eliteSessions.length && selected.length < mainSlots + Math.floor(diversitySlots * 0.6); i++) {
    const idx = (i + rotationOffset) % eliteSessions.length;
    const w = eliteSessions[idx];
    if (selectedIds.has(w.id)) continue;
    selected.push(w);
    selectedIds.add(w.id);
  }

  // ─── Pass 3: Fill remaining diversity slots with lowest-exposure sessions ───
  // These are sessions that score >= 0 but didn't make the top cut
  const remaining = scored
    .filter(({ workout }) => !selectedIds.has(workout.id) && !isEliteOrAntiMonotony(workout))
    .map(s => s.workout);
  
  // Use chunk-based rotation to cycle through remaining sessions
  const rotStart = (chunkIdx * 15) % Math.max(remaining.length, 1);
  for (let i = 0; i < remaining.length && selected.length < maxItems; i++) {
    const idx = (i + rotStart) % remaining.length;
    selected.push(remaining[idx]);
    selectedIds.add(remaining[idx].id);
  }

  // ─── Pass 4: Backfill — ensure minimum 3 sessions per sport present ───
  const finalSportCounts: Record<string, number> = {};
  for (const w of selected) {
    finalSportCounts[w.sport] = (finalSportCounts[w.sport] || 0) + 1;
  }
  
  const underrepresentedSports = Object.entries(
    scored.reduce((acc, { workout }) => {
      acc[workout.sport] = true;
      return acc;
    }, {} as Record<string, boolean>)
  )
    .map(([sport]) => sport)
    .filter(sport => (finalSportCounts[sport] || 0) < 3);

  for (const sport of underrepresentedSports) {
    const candidates = scored
      .filter(({ workout }) => workout.sport === sport && !selectedIds.has(workout.id))
      .slice(0, 3 - (finalSportCounts[sport] || 0));
    for (const { workout } of candidates) {
      if (selected.length >= maxItems + 5) break; // Allow slight overflow for minimum coverage
      selected.push(workout);
      selectedIds.add(workout.id);
    }
  }

  // ─── Pool-size instrumentation : "course" par phase ───
  const isTrailGoal = goals.some(g => g.startsWith("trail_"));
  if (!isTrailGoal) {
    const courseSelected = selected.filter(w => w.sport === "course");
    const perPhase: Record<string, number> = { base: 0, build: 0, peak: 0, taper: 0, any: 0 };
    for (const w of courseSelected) {
      const ph = (w.phase && w.phase.length > 0) ? w.phase : ["any"];
      for (const p of ph) perPhase[p] = (perPhase[p] || 0) + 1;
    }
    const COURSE_POOL_MIN = 25;
    const details = Object.entries(perPhase)
      .filter(([, n]) => n > 0)
      .map(([p, n]) => `${p}=${n}`)
      .join(", ");
    console.log(`[buildWorkoutCatalog] course pool = ${courseSelected.length} (${details || "vide"}) — chunk=${chunkIdx}`);
    for (const [phase, n] of Object.entries(perPhase)) {
      if (phase === "any") continue;
      if (n > 0 && n < COURSE_POOL_MIN) {
        console.warn(
          `[buildWorkoutCatalog] ⚠️ Pool COURSE trop restreint en phase="${phase}" : ${n} < ${COURSE_POOL_MIN}. ` +
          `Risque de répétition de séances. Chunk=${chunkIdx}.`
        );
      }
    }
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

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG DURATION STATS — derivable metadata for the Volume×Ambition matrix
// ═══════════════════════════════════════════════════════════════════════════════

export interface CatalogDurationStats {
  /** Per-sport: min/max/median durations from catalog entries */
  [sport: string]: {
    minDur: number;
    maxDur: number;
    medianDur: number;
    count: number;
  };
}

/**
 * Compute duration statistics grouped by sport from a catalog.
 * Used to derive standard session durations instead of hardcoding them.
 */
export function computeCatalogDurationStats(catalog: CatalogEntry[]): CatalogDurationStats {
  const bySport: Record<string, number[]> = {};

  for (const e of catalog) {
    const sport = e.sport.toLowerCase();
    if (!bySport[sport]) bySport[sport] = [];
    // Use midpoint of duration range
    const mid = (e.durationMin[0] + e.durationMin[1]) / 2;
    bySport[sport].push(mid);
  }

  const stats: CatalogDurationStats = {};
  for (const [sport, durations] of Object.entries(bySport)) {
    durations.sort((a, b) => a - b);
    const mid = durations.length % 2 === 0
      ? (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2
      : durations[Math.floor(durations.length / 2)];
    stats[sport] = {
      minDur: durations[0],
      maxDur: durations[durations.length - 1],
      medianDur: Math.round(mid),
      count: durations.length,
    };
  }
  return stats;
}

/** Map raw catalog sport to a normalized display sport bucket. */
function normalizeSportBucket(sport: string): { key: string; label: string; emoji: string; order: number } {
  const s = (sport || "").toLowerCase();
  if (s === "cyclisme" || s === "bike" || s === "vélo" || s === "velo") return { key: "bike", label: "VÉLO", emoji: "🚴", order: 1 };
  if (s === "course" || s === "run") return { key: "run", label: "COURSE À PIED", emoji: "🏃", order: 2 };
  if (s === "trail") return { key: "trail", label: "TRAIL / CAP MONTAGNE", emoji: "⛰️", order: 3 };
  if (s === "natation" || s === "swim") return { key: "swim", label: "NATATION", emoji: "🏊", order: 4 };
  if (s === "brick") return { key: "brick", label: "BRICK (enchaînement)", emoji: "🔁", order: 5 };
  if (s === "strength" || s === "renforcement") return { key: "strength", label: "RENFO / MOBILITÉ", emoji: "💪", order: 6 };
  if (s === "mixed") return { key: "mixed", label: "MIXTE", emoji: "🎯", order: 7 };
  return { key: s || "autre", label: (s || "AUTRE").toUpperCase(), emoji: "•", order: 9 };
}

/**
 * Serialize the catalog to a markdown table for prompt injection.
 * Sessions are GROUPED BY SPORT so the AI cannot pick a bike ID for a run slot.
 */
export function serializeCatalogForPrompt(catalog: CatalogEntry[]): string {
  if (catalog.length === 0) return "";

  const lines: string[] = [];
  lines.push("\n### 📚 CATALOGUE DE SÉANCES VALIDÉES TFCL™ (OBLIGATOIRE)");
  lines.push("⚠️ Tu DOIS utiliser les séances ci-dessous comme base pour construire le plan.");
  lines.push("Chaque séance clé 🔑 doit correspondre à une entrée de ce catalogue (utilise l'ID).");
  lines.push("Les séances sont **groupées par sport**. Un slot d'un sport donné ne peut JAMAIS recevoir un ID d'un autre sport.\n");

  const hasTrailDPlus = catalog.some(e => e.dPlusTargetM);

  const buckets = new Map<string, { info: ReturnType<typeof normalizeSportBucket>; entries: CatalogEntry[] }>();
  for (const e of catalog) {
    const info = normalizeSportBucket(e.sport);
    if (!buckets.has(info.key)) buckets.set(info.key, { info, entries: [] });
    buckets.get(info.key)!.entries.push(e);
  }
  const ordered = Array.from(buckets.values()).sort((a, b) => a.info.order - b.info.order);

  const header = hasTrailDPlus
    ? "| ID | Cat | Objectif | Phases | Durée (min) | D+ cible (m) | Structure |"
    : "| ID | Cat | Objectif | Phases | Durée (min) | Structure |";
  const sep = hasTrailDPlus
    ? "|-----|-----|----------|--------|-------------|--------------|-----------|"
    : "|-----|-----|----------|--------|-------------|-----------|";

  for (const { info, entries } of ordered) {
    lines.push(`\n#### ${info.emoji} ${info.label} — ${entries.length} séance(s)`);
    lines.push(header);
    lines.push(sep);
    for (const e of entries) {
      const phases = e.phase.join(",") || "all";
      const dur = `${e.durationMin[0]}-${e.durationMin[1]}`;
      const struct = e.structure.length > 120 ? e.structure.slice(0, 117) + "..." : e.structure;
      const dPlus = e.dPlusTargetM
        ? (typeof e.dPlusTargetM === "number" ? `${e.dPlusTargetM}` : `${e.dPlusTargetM.min}-${e.dPlusTargetM.max}`)
        : "—";
      if (hasTrailDPlus) {
        lines.push(`| ${e.id} | ${e.cat} | ${e.objectif.slice(0, 50)} | ${phases} | ${dur} | ${dPlus} | ${struct} |`);
      } else {
        lines.push(`| ${e.id} | ${e.cat} | ${e.objectif.slice(0, 50)} | ${phases} | ${dur} | ${struct} |`);
      }
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
  lines.push("1. Pour chaque séance, la colonne **Détails** DOIT contenir la DESCRIPTION COMPLÈTE du protocole (échauffement, structure intervalles/séries, récup, zones/allures/puissance, durée totale) — recopie/adapte la `Structure` du catalogue, ne te contente JAMAIS de l'ID seul.");
  lines.push("2. Format Détails OBLIGATOIRE : `<protocole complet en 1-3 phrases avec chiffres précis>. [ID: <CATALOG_ID>]` — l'ID en fin entre crochets, JAMAIS seul.");
  lines.push("   ❌ INTERDIT : `| Mardi | CAP | TTE Intro Seuil | ID: B_RUN_TEMPO_PROGRESSIVE |`");
  lines.push("   ✅ CORRECT : `| Mardi | CAP | 🔑 TTE Intro Seuil | 15min éch Z2. 4×6min @seuil (88% VMA) r=2min trot. 15min RC. 1h05 total. [ID: B_RUN_TEMPO_PROGRESSIVE] |`");
  lines.push("3. Adapte la durée selon la semaine (progression) mais garde le protocole.");
  lines.push("4. Si aucune séance du catalogue ne correspond, tu PEUX créer une séance custom (décris le protocole complet, mentionne 'CUSTOM' au lieu de l'ID).");
  lines.push("5. Les séances de récupération et repos ne nécessitent pas d'ID catalogue (mais gardent une description : durée, zone, type).");
  lines.push("6. 🚫 **NON-CROSS-SPORT** : chaque ID vit dans UN SEUL groupe sport ci-dessus. Un slot vélo ne peut recevoir qu'un ID du groupe 🚴 VÉLO ; un slot course qu'un ID 🏃 COURSE (⛰️ TRAIL uniquement si l'objectif du plan est un trail) ; un slot natation qu'un ID 🏊 NATATION ; un slot renfo qu'un ID 💪 RENFO. Les IDs 🔁 BRICK sont réservés aux enchaînements planifiés comme tels. Toute violation = séance rejetée.");
  lines.push("7. 🚫 **Pas de watts dans une séance course**, pas d'allure /km dans une séance vélo, pas de puissance dans une séance natation. Chaque sport a sa métrique dédiée (Watts vélo, allure/VMA course, CSS/temps 100m natation).");

  return lines.join("\n");
}
