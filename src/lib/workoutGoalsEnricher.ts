/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WORKOUT GOALS ENRICHER
 * 
 * Post-processing module that automatically infers and fills in missing
 * `goals[]` and `phase[]` tags on workout library entries.
 * 
 * Strategy:
 * 1. Infer goals from session ID prefix patterns (A_IM_*, A_MAR_*, B_TR_*, etc.)
 * 2. Infer goals from variant keys (ironman, half, marathon, semi, trail_*)
 * 3. Infer goals from objectif text keywords
 * 4. Infer phases from `when` field text and `phase` array
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout, WorkoutGoal, PhaseTag } from "@/types/workoutLibrary";

// ─── GOAL INFERENCE FROM ID PATTERNS ────────────────────────────────────────

const ID_GOAL_PATTERNS: Array<{ pattern: RegExp; goals: WorkoutGoal[] }> = [
  // Ironman specific (all prefixes including TPL_, ENR_, V2_, V3_)
  { pattern: /^A_IM_|^B_IM_|^C_IM_|^D_IM_|_IM_|RACE_SIM_IM|TPL_IM_|ENR_.*_IM\b|V[23]_IM_/i, goals: ["ironman"] },
  // 70.3 specific
  { pattern: /^A_703_|^B_703_|^BRICK_703|BR_703|_703_|RACE_SIM_703|TPL_703_|ENR_.*703|V[23]_703_/i, goals: ["half"] },
  // Marathon specific
  { pattern: /^A_MAR_|^B_MAR_|^C_MAR_|^D_MAR_|_MAR_|MARATHON|TPL_MAR_|ENR_.*MARATHON/i, goals: ["marathon"] },
  // Semi specific
  { pattern: /^A_SEMI_|^B_SEMI_|^C_SEMI_|^D_SEMI_|_SEMI_|TPL_SEMI_|ENR_.*SEMI/i, goals: ["semi"] },
  // 10K specific
  { pattern: /^A_10K_|^B_10K_|^C_10K_|^D_10K_|_10K_|TPL_10K_|ENR_.*10K|V[23]_.*10K/i, goals: ["10k"] },
  // Trail 50km / Trail Short
  { pattern: /^A_TR50_|^B_TR50_|^C_TR50_|^D_TR50_|TPL_TR50_/i, goals: ["trail_short"] },
  // Trail generic (includes short, mountain, ultra)
  { pattern: /^A_TR_|^B_TR_|^C_TR_|^D_TR_|_TR_.*TRAIL|V[23]_TR_|ENR_TR_/i, goals: ["trail_short", "trail_mountain", "trail_ultra"] },
  // Brick stages
  { pattern: /^BRICK_STAGE|^BRICK_IM|^BR_IM|TPL_BRICK_IM/i, goals: ["ironman"] },
  { pattern: /^BRICK_FAST_FINISH|^BRICK_SEMI|^BR_HALF/i, goals: ["half"] },
  { pattern: /^BRICK_703|TPL_BRICK_703/i, goals: ["half"] },
  { pattern: /^BRICK_ACTIVATION/i, goals: ["ironman", "half"] },
  // Swim triathlon
  { pattern: /^A_SWIM_TRI_|^B_SWIM_TRI_|^C_SWIM_TRI_|^D_SWIM_TRI_|ENR_SWIM_TRI_|V[23]_SWIM_TRI_/i, goals: ["ironman", "half"] },
  // Taper
  { pattern: /^D_TAPER_|TAPER/i, goals: ["ironman", "half", "marathon", "semi", "10k", "trail_short", "trail_mountain"] },
  // ─── Keyword-based patterns for ENR_/V2_/V3_ sessions ───
  // VMA / VO2max → running goals
  { pattern: /VMA|VO2/i, goals: ["10k", "semi", "marathon"] },
  // Seuil / Threshold / Tempo → mid-distance
  { pattern: /SEUIL|THRESHOLD|TEMPO/i, goals: ["semi", "marathon", "half"] },
  // FatMax / Train Low / Endurance → long-distance
  { pattern: /FATMAX|TRAIN_LOW|FASTED/i, goals: ["ironman", "half", "marathon", "trail_long"] },
  // SFR / Force → cycling power goals
  { pattern: /\bSFR\b|FORCE_COTES|GRIMPEUR/i, goals: ["ironman", "half", "trail_mountain"] },
  // Norwegian / Fartlek → versatile running
  { pattern: /NORWEGIAN|FARTLEK/i, goals: ["10k", "semi", "marathon"] },
  // Sweet Spot / Over-Under → cycling build
  { pattern: /SWEET_SPOT|OVER_UNDER/i, goals: ["ironman", "half"] },
  // Race Sim generic
  { pattern: /RACE_SIM|RACE_PACE|REPETITION_GENERALE/i, goals: ["ironman", "half", "marathon", "semi"] },
  // Allure spécifique
  { pattern: /ALLURE_MARATHON/i, goals: ["marathon"] },
  { pattern: /ALLURE_SEMI/i, goals: ["semi"] },
  // Brick generic
  { pattern: /^BRICK_|^BR_|TPL_BRICK_|ENR_BRICK_/i, goals: ["ironman", "half"] },
];

// ─── GOAL INFERENCE FROM VARIANT KEYS ───────────────────────────────────────

const VARIANT_KEY_TO_GOAL: Record<string, WorkoutGoal> = {
  ironman: "ironman",
  half: "half",
  marathon: "marathon",
  semi: "semi",
  "10k": "10k",
  trail_short: "trail_short",
  trail_mountain: "trail_mountain",
  trail_ultra: "trail_ultra",
  trail_long: "trail_long",
};

function inferGoalsFromVariants(w: LibraryWorkout): WorkoutGoal[] {
  if (!w.variants) return [];
  const goals: WorkoutGoal[] = [];
  for (const [key, value] of Object.entries(w.variants)) {
    const goal = VARIANT_KEY_TO_GOAL[key];
    if (!goal) continue;
    // Only add if variant value is meaningful (not "—", not empty)
    const val = (value || "").trim();
    if (val && val !== "—" && val !== "-" && val !== "rare" && val !== "optionnel" && val !== "légère") {
      goals.push(goal);
    }
  }
  return goals;
}

// ─── GOAL INFERENCE FROM OBJECTIF TEXT ───────────────────────────────────────

const OBJECTIF_GOAL_PATTERNS: Array<{ pattern: RegExp; goals: WorkoutGoal[] }> = [
  { pattern: /\bironman\b|\bIM\b/i, goals: ["ironman"] },
  { pattern: /\b70\.3\b|\b703\b/i, goals: ["half"] },
  { pattern: /\bmarathon\b/i, goals: ["marathon"] },
  { pattern: /\bsemi[-\s]?marathon\b|\bsemi\b/i, goals: ["semi"] },
  { pattern: /\b10[kK]\b|\b10km\b/i, goals: ["10k"] },
  { pattern: /\btrail\s*ultra\b|\bultra\b|\bUTMB\b/i, goals: ["trail_ultra"] },
  { pattern: /\btrail\s*mont/i, goals: ["trail_mountain"] },
  { pattern: /\btrail\s*court\b|\btrail\s*short\b|\b20-50km\b/i, goals: ["trail_short"] },
  { pattern: /\btrail\b/i, goals: ["trail_short", "trail_mountain"] },
  { pattern: /\btriathlon\b/i, goals: ["ironman", "half"] },
];

function inferGoalsFromObjectif(w: LibraryWorkout): WorkoutGoal[] {
  const goals: WorkoutGoal[] = [];
  const text = `${w.objectif} ${w.when || ""}`;
  for (const { pattern, goals: g } of OBJECTIF_GOAL_PATTERNS) {
    if (pattern.test(text)) {
      goals.push(...g);
    }
  }
  return goals;
}

// ─── SPORT-BASED DEFAULT GOALS ──────────────────────────────────────────────

function defaultGoalsForSport(w: LibraryWorkout): WorkoutGoal[] {
  switch (w.sport) {
    case "natation":
      return ["ironman", "half"];
    case "brick":
      return ["ironman", "half"];
    case "cyclisme":
      // Generic cycling sessions are useful for triathlon + trail support
      return ["ironman", "half"];
    case "course":
      // Generic running sessions apply broadly
      return ["ironman", "half", "marathon", "semi", "10k"];
    case "strength":
      // Strength is universal
      return ["ironman", "half", "marathon", "semi", "10k", "trail_short", "trail_mountain", "trail_ultra"];
    default:
      return [];
  }
}

// ─── PHASE INFERENCE FROM `when` TEXT ───────────────────────────────────────

const WHEN_PHASE_PATTERNS: Array<{ pattern: RegExp; phases: PhaseTag[] }> = [
  { pattern: /\bbase\b/i, phases: ["base"] },
  { pattern: /\bbuild\b/i, phases: ["build"] },
  { pattern: /\bpeak\b/i, phases: ["peak"] },
  { pattern: /\btaper\b|\baffûtage\b/i, phases: ["taper"] },
  { pattern: /\btoute l'année\b|\ball year\b/i, phases: ["base", "build"] },
  { pattern: /\blendemain\b|\baprès\b|\bpost\b/i, phases: ["base", "build", "peak", "taper"] },
  { pattern: /\bveille\b|\bJ-1\b|\bmatin compétition\b/i, phases: ["taper"] },
];

function inferPhasesFromWhen(w: LibraryWorkout): PhaseTag[] {
  if (!w.when) return [];
  const phases: PhaseTag[] = [];
  for (const { pattern, phases: p } of WHEN_PHASE_PATTERNS) {
    if (pattern.test(w.when)) {
      phases.push(...p);
    }
  }
  return [...new Set(phases)];
}

// ─── PHASE INFERENCE FROM ID / CATEGORY / NECESSITE ─────────────────────────

const ID_PHASE_PATTERNS: Array<{ pattern: RegExp; phases: PhaseTag[] }> = [
  // Taper sessions
  { pattern: /TAPER|AFFUT|PRE_RACE|ACTIVATION/i, phases: ["taper"] },
  // Race simulations → peak
  { pattern: /RACE_SIM|SIMUL|DRESS_REHEARSAL/i, phases: ["peak"] },
  // Base / endurance / easy
  { pattern: /Z2_EASY|Z2_LONG|ENDURANCE|FONCIER|EASY|RECUP/i, phases: ["base", "build"] },
  // Threshold / tempo → build & peak
  { pattern: /TEMPO|THRESHOLD|SEUIL|SV2|SWEET_SPOT/i, phases: ["build", "peak"] },
  // VO2max / intervals → build & peak
  { pattern: /VO2|INTERVAL|VMA|FARTLEK|HILL_REPEAT/i, phases: ["build", "peak"] },
  // Sprint / speed → peak
  { pattern: /SPRINT|SPEED|STRIDES/i, phases: ["build", "peak"] },
  // Long runs → build & peak
  { pattern: /LONG_RUN|SL_|SORTIE_LONGUE/i, phases: ["build", "peak"] },
  // Brick → build & peak
  { pattern: /^BRICK_/i, phases: ["build", "peak"] },
  // Test / assessment → base & build
  { pattern: /TEST|ASSESSMENT|EVAL/i, phases: ["base", "build"] },
];

const CAT_PHASE_MAP: Record<string, PhaseTag[]> = {
  "Endurance fondamentale": ["base", "build"],
  "Récupération": ["base", "build", "peak", "taper"],
  "Seuil": ["build", "peak"],
  "VO2max": ["build", "peak"],
  "Vitesse": ["build", "peak"],
  "Force": ["base", "build"],
  "Tempo": ["build", "peak"],
  "Allure spécifique": ["build", "peak"],
  "Sortie longue": ["build", "peak"],
  "Brick": ["build", "peak"],
  "Test": ["base", "build"],
  "Activation": ["taper"],
  "Pré-compétition": ["taper"],
  "PPG": ["base", "build", "peak"],
  "Renforcement": ["base", "build", "peak"],
};

function inferPhasesFromIdAndCat(w: LibraryWorkout): PhaseTag[] {
  const phases = new Set<PhaseTag>();

  // From ID patterns
  for (const { pattern, phases: p } of ID_PHASE_PATTERNS) {
    if (pattern.test(w.id)) {
      p.forEach(ph => phases.add(ph));
    }
  }

  // From category
  const catPhases = CAT_PHASE_MAP[w.cat];
  if (catPhases) {
    catPhases.forEach(ph => phases.add(ph));
  }

  // From necessite
  if (w.necessite === "Obligatoire") {
    // Obligatory sessions are typically build/peak
    if (phases.size === 0) {
      phases.add("build");
      phases.add("peak");
    }
  }

  return [...phases];
}

// ─── MAIN ENRICHER ──────────────────────────────────────────────────────────

/**
 * Enrich all workouts in the library with inferred goals[] and phase[].
 * Only fills in missing values — never overwrites existing tags.
 */
export function enrichWorkoutGoals(library: LibraryWorkout[]): void {
  let goalsAdded = 0;
  let phasesAdded = 0;

  for (const w of library) {
    // ── GOALS ──
    if (!w.goals || w.goals.length === 0) {
      const inferred = new Set<WorkoutGoal>();

      // 1. ID patterns (highest priority)
      for (const { pattern, goals } of ID_GOAL_PATTERNS) {
        if (pattern.test(w.id)) {
          goals.forEach(g => inferred.add(g));
        }
      }

      // 2. Variant keys
      for (const g of inferGoalsFromVariants(w)) {
        inferred.add(g);
      }

      // 3. Objectif text
      for (const g of inferGoalsFromObjectif(w)) {
        inferred.add(g);
      }

      // 4. Sport-based defaults (only if nothing else matched)
      if (inferred.size === 0) {
        for (const g of defaultGoalsForSport(w)) {
          inferred.add(g);
        }
      }

      if (inferred.size > 0) {
        w.goals = [...inferred];
        goalsAdded++;
      }
    }

    // ── PHASES ──
    if (!w.phase || w.phase.length === 0) {
      // 1. Try from `when` text
      let inferred = inferPhasesFromWhen(w);
      // 2. Fallback: infer from ID patterns, category, necessite
      if (inferred.length === 0) {
        inferred = inferPhasesFromIdAndCat(w);
      }
      if (inferred.length > 0) {
        w.phase = inferred;
        phasesAdded++;
      }
    }
  }

  // console.log(`🏷️ Goals enricher: ${goalsAdded} sessions tagged with goals, ${phasesAdded} sessions tagged with phases`);
}
