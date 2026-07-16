/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1B — Client mirror of `supabase/functions/ai-training-plan/mergePlanChunks.ts`
 * ═══════════════════════════════════════════════════════════════════════════════
 * Deterministic merge of validated PlanChunks (produced by the server JSON path)
 * into a single MergedPlan (client-side representation). Contract mirrored from
 * the server, extended with sport↔objective validation (step 5 of Phase 1B).
 *
 * Volume rule (constraint N°4) — no `volumeTarget` transported. Weekly volume
 * is computed downstream in `jsonPlanToParsedPlan` from Σ durationMin.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import {
  DAY_INDEX, DAY_CAPITALIZED,
  type PlanChunk, type PlanSession, type StrategicRecapJSON, type PhaseSummaryJSON,
} from "./planSchema";
import { TRAIL_DETAILS_CRITICAL_RX, isTrailCatalogId } from "./trailMarkers";

export interface MergedSession {
  weekNumber: number;
  weekTheme: string;
  phase: string;
  dayName: string;
  dayIndex: number;
  sport: string;
  title: string;
  details: string;
  isRest: boolean;
  isKeySession: boolean;
  catalogId: string | null;
  custom: boolean;
  durationMin: number;
  zones: string[];
}

export interface MergedWeek {
  weekNumber: number;
  theme: string;
  phase: string;
  phaseObjective?: string;
  coachNotes?: string;
  sessions: MergedSession[];
}

export interface MergedPlan {
  title: string;
  diagnostic?: string;
  strategicRecap?: StrategicRecapJSON;
  phases: PhaseSummaryJSON[];
  weeks: MergedWeek[];
  totalWeeks: number;
}

export class MergePlanError extends Error {
  constructor(public code: "GAP" | "DUP" | "EMPTY" | "OUT_OF_RANGE", message: string) {
    super(message);
    this.name = "MergePlanError";
  }
}

function normalizeSession(s: PlanSession, weekNumber: number, theme: string, phase: string): MergedSession {
  const dayLower = s.day;
  return {
    weekNumber,
    weekTheme: theme,
    phase,
    dayName: DAY_CAPITALIZED[dayLower],
    dayIndex: DAY_INDEX[dayLower],
    sport: s.sport,
    title: s.title,
    details: s.details ?? "",
    isRest: s.sport === "rest",
    isKeySession: !!s.isKeySession,
    catalogId: s.catalogId ?? null,
    custom: !!s.custom,
    durationMin: s.durationMin ?? 0,
    zones: s.zones ?? [],
  };
}

export function mergePlanChunks(chunks: PlanChunk[], totalWeeks: number): MergedPlan {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new MergePlanError("EMPTY", "[SCHEMA_FAIL] merge: aucun chunk fourni.");
  }

  let title: string | undefined;
  let diagnostic: string | undefined;
  let strategicRecap: StrategicRecapJSON | undefined;
  let phases: PhaseSummaryJSON[] = [];

  for (const c of chunks) {
    if (!title && c.title) title = c.title;
    if (!diagnostic && c.diagnostic) diagnostic = c.diagnostic;
    if (!strategicRecap && c.strategicRecap) strategicRecap = c.strategicRecap;
    if (phases.length === 0 && c.phases && c.phases.length > 0) phases = c.phases;
  }

  const allWeeks: MergedWeek[] = [];
  for (const c of chunks) {
    for (const w of c.weeks) {
      if (w.weekNumber < 1 || w.weekNumber > totalWeeks) {
        throw new MergePlanError(
          "OUT_OF_RANGE",
          `[SCHEMA_FAIL] merge: weekNumber=${w.weekNumber} hors bornes [1..${totalWeeks}].`,
        );
      }
      allWeeks.push({
        weekNumber: w.weekNumber,
        theme: w.theme ?? "",
        phase: w.phase,
        phaseObjective: w.phaseObjective,
        coachNotes: w.weeklyNotes,
        sessions: w.sessions.map(s => normalizeSession(s, w.weekNumber, w.theme ?? "", w.phase)),
      });
    }
  }

  allWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

  const seen = new Set<number>();
  for (const w of allWeeks) {
    if (seen.has(w.weekNumber)) {
      throw new MergePlanError("DUP", `[SCHEMA_FAIL] merge: semaine ${w.weekNumber} en doublon.`);
    }
    seen.add(w.weekNumber);
  }
  const missing: number[] = [];
  for (let i = 1; i <= totalWeeks; i++) if (!seen.has(i)) missing.push(i);
  if (missing.length > 0) {
    throw new MergePlanError(
      "GAP",
      `[SCHEMA_FAIL] merge: semaines manquantes [${missing.join(",")}] (attendu 1..${totalWeeks}).`,
    );
  }

  return {
    title: title ?? "Plan TFCL™",
    diagnostic,
    strategicRecap,
    phases,
    weeks: allWeeks,
    totalWeeks,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Sport ↔ objective post-merge validation (safety net)
// ─────────────────────────────────────────────────────────────────────────────

export interface SportObjectiveIssue {
  severity: "critical" | "warning";
  weekNumber: number;
  dayName: string;
  reason: string;
  offendingId?: string | null;
  title: string;
}

/**
 * Detects trail contamination in triathlon / road-running plans.
 *   - catalogId matching /^[A-D]_TR(50)?_|_TRAIL_|^EXPE_HORS_VILLE_|^URBAN_|^HEDGEHOG_/i
 *   - custom:true with details matching /\bD\+|montée sèche|bâtons|power.?hike|vertical.?km/i
 * Returns [] when the plan objective IS a trail.
 */
// TRAIL_CATALOG_RX supprimé — utiliser `isTrailCatalogId` (source unique trailMarkers).

export function validateSportObjective(
  plan: MergedPlan,
  objective: string | null | undefined,
): SportObjectiveIssue[] {
  const obj = (objective || "").toLowerCase();
  const isTrailGoal =
    obj.includes("trail") || obj.includes("utmb") || obj.includes("ccc") ||
    obj.includes("occ") || (obj.includes("ultra") && !obj.includes("ironman"));
  if (isTrailGoal) return [];

  const issues: SportObjectiveIssue[] = [];
  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      const catId = s.catalogId ?? "";
      if (catId && isTrailCatalogId(catId)) {
        issues.push({
          severity: "critical",
          weekNumber: w.weekNumber,
          dayName: s.dayName,
          reason: `catalogId trail "${catId}" dans un plan non-trail`,
          offendingId: catId,
          title: s.title,
        });
        continue;
      }
      if (s.custom && TRAIL_DETAILS_CRITICAL_RX.test(`${s.title} ${s.details}`)) {
        issues.push({
          severity: "critical",
          weekNumber: w.weekNumber,
          dayName: s.dayName,
          reason: "séance custom contient un marqueur trail (D+, bâtons, power-hike…)",
          offendingId: null,
          title: s.title,
        });
      }
    }
  }
  return issues;
}
