/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1A — Merge déterministe des chunks (contrainte N°4)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Concatène les `weeks` des chunks validés, vérifie la continuité 1..totalWeeks
 * sans trou ni doublon, dérive `dayIndex`/`isRest`, et produit un objet
 * conforme à `ParsedPlan` (src/lib/aiPlanParser.ts).
 *
 * Aucune propriété de volume déclaré n'est transportée : le volume est
 * recalculé côté client à partir de `Σ durationMin`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  DAY_INDEX,
  DAY_CAPITALIZED,
  type PlanChunk,
  type PlanSession,
} from "./planSchema.ts";

export interface MergedSession {
  weekNumber: number;
  weekTheme: string;
  phase: string;
  dayName: string;      // "Lundi" .. "Dimanche"
  dayIndex: number;     // 0..6
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
  strategicRecap?: PlanChunk["strategicRecap"];
  phases: NonNullable<PlanChunk["phases"]>;
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

  // 1) Récupère métadonnées "chunk 1" au premier chunk qui les fournit.
  let title: string | undefined;
  let diagnostic: string | undefined;
  let strategicRecap: PlanChunk["strategicRecap"] | undefined;
  let phases: NonNullable<PlanChunk["phases"]> = [];

  for (const c of chunks) {
    if (!title && c.title) title = c.title;
    if (!diagnostic && c.diagnostic) diagnostic = c.diagnostic;
    if (!strategicRecap && c.strategicRecap) strategicRecap = c.strategicRecap;
    if (phases.length === 0 && c.phases && c.phases.length > 0) phases = c.phases;
  }

  // 2) Aplati / trie / vérifie couverture.
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

  // 3) Détecte doublons et trous.
  const seen = new Set<number>();
  for (const w of allWeeks) {
    if (seen.has(w.weekNumber)) {
      throw new MergePlanError(
        "DUP",
        `[SCHEMA_FAIL] merge: semaine ${w.weekNumber} en doublon.`,
      );
    }
    seen.add(w.weekNumber);
  }
  const missing: number[] = [];
  for (let i = 1; i <= totalWeeks; i++) {
    if (!seen.has(i)) missing.push(i);
  }
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
