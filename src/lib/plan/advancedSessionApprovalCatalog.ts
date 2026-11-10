/**
 * Vue « coach » des fiches approuvables : libellés et conditions lus dans le
 * CONTENU RÉEL de la bibliothèque (`objectif`, `when`, `avoid`, durée) — le
 * coach approuve en lisant ce que dit la fiche, jamais un résumé réécrit.
 *
 * Séparé de `advancedSessionApproval.ts` pour que ce dernier (importé par le
 * constructeur de configuration et le garde-fou) ne charge pas la
 * bibliothèque complète.
 */

import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { WorkoutTrainingLevel } from "@/types/workoutLibrary";
import { APPROVABLE_ADVANCED_SESSION_IDS, evaluateAdvancedSessionApproval } from "./advancedSessionApproval";

export type AdvancedSessionSportGroup = "run" | "bike" | "swim" | "strength";

export interface ApprovableAdvancedSession {
  id: string;
  group: AdvancedSessionSportGroup;
  /** `objectif` de la fiche — son intitulé lisible. */
  label: string;
  when: string;
  avoid: string;
  durationMin: [number, number];
  /** Minimums que le garde-fou applique en plus de l'approbation. */
  minimumTrainingLevel: WorkoutTrainingLevel | null;
  minimumWeeklyHours: number | null;
}

export const ADVANCED_SESSION_GROUP_ORDER: readonly AdvancedSessionSportGroup[] = [
  "run",
  "bike",
  "swim",
  "strength",
];

export const ADVANCED_SESSION_GROUP_LABELS: Readonly<Record<AdvancedSessionSportGroup, string>> = {
  run: "Course à pied",
  bike: "Vélo",
  swim: "Natation",
  strength: "Renforcement",
};

function groupForSport(sport: string): AdvancedSessionSportGroup | null {
  switch (sport) {
    case "course":
    case "run":
    case "trail":
      return "run";
    case "cyclisme":
    case "bike":
      return "bike";
    case "natation":
    case "swim":
      return "swim";
    case "strength":
    case "renforcement":
      return "strength";
    default:
      return null;
  }
}

function buildList(): ApprovableAdvancedSession[] {
  const byId = new Map(WorkoutLibrary.map(workout => [workout.id.toUpperCase(), workout]));
  const sessions: ApprovableAdvancedSession[] = [];
  for (const id of APPROVABLE_ADVANCED_SESSION_IDS) {
    const workout = byId.get(id);
    // Une fiche auditée mais absente de la bibliothèque, ou d'un sport non
    // classé, n'est pas proposée : l'approuver n'aurait aucun effet visible.
    if (!workout) continue;
    const group = groupForSport(workout.sport);
    if (!group) continue;
    // Prérequis fusionnés (métadonnées physiologiques + sécurité), lus par le
    // même module que le garde-fou : jamais une seule des deux tables.
    const { minimumTrainingLevel, minimumWeeklyHours } = evaluateAdvancedSessionApproval(id, null);
    sessions.push({
      id,
      group,
      label: workout.objectif,
      when: workout.when,
      avoid: workout.avoid,
      durationMin: workout.durationMin,
      minimumTrainingLevel,
      minimumWeeklyHours,
    });
  }
  return sessions.sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

let cached: ApprovableAdvancedSession[] | null = null;

/** Fiches approuvables présentes dans la bibliothèque, triées par intitulé. */
export function listApprovableAdvancedSessions(): readonly ApprovableAdvancedSession[] {
  if (!cached) cached = buildList();
  return cached;
}

export function groupApprovableAdvancedSessions(): ReadonlyArray<{
  group: AdvancedSessionSportGroup;
  label: string;
  sessions: readonly ApprovableAdvancedSession[];
}> {
  const sessions = listApprovableAdvancedSessions();
  return ADVANCED_SESSION_GROUP_ORDER
    .map(group => ({
      group,
      label: ADVANCED_SESSION_GROUP_LABELS[group],
      sessions: sessions.filter(session => session.group === group),
    }))
    .filter(entry => entry.sessions.length > 0);
}
