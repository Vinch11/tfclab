import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { RepairWorkoutMetadata } from "../_shared/repairSportingEquivalence.ts";
import { applySLFloorEnforcement } from "./jsonPlanHandler.ts";

/**
 * Revue coach "P0 progression individualisée des charges" (point 2,
 * 2026-10-24) : le plancher SL individualisé (sessionSizingMatrix.ts::
 * applySlFloorIndividualization, client) peut désormais être PLUS BAS en
 * début de rampe qu'avant correction. Question posée par la revue : un
 * plancher plus bas peut-il faire accepter à tort une fiche dont la phase
 * ne correspond pas à la semaine réelle (ex. une fiche "build/peak" admise
 * alors que la semaine est en phase "base") ?
 *
 * Réponse démontrée par ces tests : NON. `repairCandidateCompatible` (ligne
 * ~225 de jsonPlanHandler.ts) applique le filtre de phase
 * (`evaluateRepairSportingEquivalence`, repairSportingEquivalence.ts)
 * AVANT le filtre de durée (`c.durationMin[1] >= spec.floor`), et ce
 * filtre de phase ne dépend JAMAIS de la valeur numérique du plancher — il
 * compare uniquement `week.phase` aux `phases[]` de la fiche candidate.
 * Un plancher plus bas ne peut donc qu'ÉLARGIR l'ensemble des fiches déjà
 * phase-compatibles qui satisfont aussi la durée — jamais admettre une
 * fiche dont la phase ne convient pas.
 */

function metadata(id: string, phases: string[], durationMin: [number, number]): RepairWorkoutMetadata {
  return {
    metadataVersion: 1,
    complete: true,
    id,
    sport: "run",
    title: id,
    objective: id,
    intentFamily: "endurance_fondamentale",
    goals: ["10k"],
    objectiveSpecific: false,
    phases,
    durationMin,
    mainZoneMax: 2,
    specialContext: null,
    prerequisiteKeys: [],
    necessity: "Recommandé",
    when: "Toute l'année",
    avoid: "",
    tags: [],
    structure: `${id} endurance fondamentale Z1-Z2 continu`,
    zones: ["Z2"],
  };
}

// Fiche ACTUELLEMENT programmée (trop courte, à upgrader) — phase-compatible
// elle-même, présente dans le pool pour que `original` se résolve (cf.
// jsonPlanHandler.sportingEquivalence.test.ts, même convention : l'original
// doit matcher une entrée du pool pour que le garde-fou sport/intent ne
// rejette pas tout en bloc faute de métadonnée).
const ORIGINAL_SHORT_EASY = metadata("ORIGINAL_SHORT_EASY", ["base", "build", "peak"], [25, 35]);
// Candidate phase-incompatible (build/peak uniquement) mais durée large
// [60,90] — satisferait AUSSI BIEN le plancher nominal (90) que le plancher
// ramené (45) si le filtre de phase n'existait pas.
const WRONG_PHASE_BUT_RIGHT_DURATION = metadata("WRONG_PHASE_RUN_LONG", ["build", "peak"], [60, 90]);
// Candidate phase-compatible (inclut "base", la phase réelle de la semaine
// testée) mais durée plus courte [40,55] — ne satisfait QUE le plancher
// ramené (45), jamais le plancher nominal (90).
const RIGHT_PHASE_SHORTER_DURATION = metadata("RIGHT_PHASE_RUN_SHORT", ["base", "build", "peak"], [40, 55]);

const ALL_METADATA = [ORIGINAL_SHORT_EASY, WRONG_PHASE_BUT_RIGHT_DURATION, RIGHT_PHASE_SHORTER_DURATION];

function catalogDump(entries: RepairWorkoutMetadata[]): string {
  return [
    "#### Course",
    "| ID | Cat | Titre | Phase | Durée | Structure |",
    ...entries.map(e => `| ${e.id} | A | ${e.title} | ${e.phases.join("/")} | ${e.durationMin[0]}-${e.durationMin[1]} | ${e.structure} |`),
  ].join("\n");
}

function makeWeek(weekNumber: number, phase: string, durationMin: number): any {
  return {
    weekNumber,
    phase,
    sessions: [{
      day: "dimanche", sport: "run", title: ORIGINAL_SHORT_EASY.title, details: ORIGINAL_SHORT_EASY.structure,
      catalogId: ORIGINAL_SHORT_EASY.id, custom: false, durationMin,
    }],
  };
}

Deno.test("applySLFloorEnforcement — plancher NOMINAL (90min) en phase 'base' : aucune fiche ne convient (la seule durée OK est phase-incompatible) → unresolved, JAMAIS la fiche build/peak", () => {
  const chunk = { weeks: [makeWeek(1, "base", 30)] };
  const SL_FLOOR_NOMINAL = { weekType: "load", longRideWeekly: false, longRunWeekly: true, slLongRideMin: 0, slLongRunMin: 90 };
  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk] as any,
    { 1: SL_FLOOR_NOMINAL },
    [catalogDump(ALL_METADATA)],
    [ALL_METADATA],
    "10K",
  );
  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, ORIGINAL_SHORT_EASY.id, "aucune correction forcée via une fiche phase-incompatible");
  assert(repairs.some(r => r.code === "sl_upgrade_unresolved"), "signalé unresolved plutôt que de forcer une fiche incompatible");
});

Deno.test("applySLFloorEnforcement — plancher individualisé plus bas (45min) : upgrade vers la fiche phase-compatible, jamais vers la fiche build/peak pourtant disponible et de durée correcte", () => {
  const chunk = { weeks: [makeWeek(1, "base", 30)] };
  const SL_FLOOR_RAMPED = { weekType: "load", longRideWeekly: false, longRunWeekly: true, slLongRideMin: 0, slLongRunMin: 45 };
  const { chunks: out, repairs } = applySLFloorEnforcement(
    [chunk] as any,
    { 1: SL_FLOOR_RAMPED },
    [catalogDump(ALL_METADATA)],
    [ALL_METADATA],
    "10K",
  );
  const sess = out[0].weeks[0].sessions[0];
  assertEquals(sess.catalogId, RIGHT_PHASE_SHORTER_DURATION.id, "upgrade vers la fiche phase-compatible");
  assert(repairs.some(r => r.code === "sl_upgraded"));
  assert(sess.catalogId !== WRONG_PHASE_BUT_RIGHT_DURATION.id, "jamais la fiche phase-incompatible, même si sa durée conviendrait");
});
