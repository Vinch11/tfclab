/**
 * ═══════════════════════════════════════════════════════════════════════════
 * APPROBATION COACH DES SÉANCES AVANCÉES — parcours de production
 *
 * `workoutSafetyPrerequisites.ts` réserve une famille de fiches (tests
 * maximaux, sprints all-out, doubles journées, protocoles lactate, charges
 * lourdes) à une « revue coach nominative » : `requireExplicitCoachApproval`.
 * Le garde-fou `isLevelPrerequisiteIncompatible` sait lire cette décision
 * (`approvedAdvancedSessionIds`), mais aucun écran de production ne la
 * renseignait : ces fiches étaient donc structurellement inatteignables dans
 * les plans générés (sprints, tests, navettes sévères, doubles journées).
 *
 * Ce module est le SEUL point d'entrée de cette décision côté production.
 * Il n'assouplit aucune règle de sécurité : il ne fait que transporter, de
 * façon bornée, la décision du coach jusqu'au garde-fou existant. (Le
 * garde-fou a été RESSERRÉ sur un point à cette occasion : une fiche de
 * l'axe historique « débutant » reste fermée à un niveau débutant vérifié
 * même approuvée — cf. `levelPrerequisiteCompatibility.ts`.)
 *
 * Trois invariants, tous testés :
 *  1. Liste fermée. Seules les fiches `requireExplicitCoachApproval` et non
 *     `blockAutomaticSelection` sont approuvables. Tout autre ID est écarté
 *     AVANT d'atteindre le garde-fou — indispensable, car celui-ci conserve
 *     une branche de compatibilité historique où un ID approuvé SANS
 *     `requireExplicitCoachApproval` contourne tous les contrôles de niveau
 *     et de volume (dérogation, pas approbation). Cette dérogation n'est pas
 *     exposée ici.
 *  2. Les fiches `blockAutomaticSelection` ne sont jamais approuvables :
 *     hypoxie, exposition chaleur, et la navette lactate course au seuil
 *     (`B_RUN_LACTATE_SHUTTLE`, dont les exclusions qualitatives n'ont pas de
 *     contrat vérifiable — revue lactate/norvégien 2026-11-09). La liste est
 *     dérivée des tables : bloquer une fiche là-bas la retire d'ici.
 *  3. L'approbation ne remplace jamais la preuve de profil : la raison
 *     affichée au coach est dérivée du verdict du garde-fou lui-même, jamais
 *     d'une règle recopiée.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { AUDITED_WORKOUT_METADATA, auditedWorkoutMetadataFor } from "@/lib/workoutPhysiologyMetadata";
import {
  AUDITED_WORKOUT_SAFETY_PREREQUISITES,
  auditedSafetyPrerequisitesFor,
} from "@/lib/workoutSafetyPrerequisites";
import type { WorkoutPrerequisites, WorkoutTrainingLevel } from "@/types/workoutLibrary";
import {
  isLevelPrerequisiteIncompatible,
  type BeginnerIntensitySignal,
} from "./levelPrerequisiteCompatibility";

/** Même fusion que `isLevelPrerequisiteIncompatible` (sécurité prioritaire). */
function mergedPrerequisitesFor(id: string): WorkoutPrerequisites {
  return {
    ...(auditedWorkoutMetadataFor(id)?.prerequisites ?? {}),
    ...(auditedSafetyPrerequisitesFor(id) ?? {}),
  };
}

function computeApprovableIds(): string[] {
  const candidates = new Set<string>([
    ...Object.keys(AUDITED_WORKOUT_SAFETY_PREREQUISITES),
    ...Object.keys(AUDITED_WORKOUT_METADATA),
  ].map(id => id.toUpperCase()));
  return [...candidates]
    .filter(id => {
      const prerequisites = mergedPrerequisitesFor(id);
      return prerequisites.requireExplicitCoachApproval === true
        && prerequisites.blockAutomaticSelection !== true;
    })
    .sort();
}

/**
 * Fiches qu'un coach peut approuver nominativement. Dérivée des tables
 * d'audit : ajouter une fiche à `workoutSafetyPrerequisites.ts` avec
 * `requireExplicitCoachApproval` suffit à la faire apparaître ici.
 */
export const APPROVABLE_ADVANCED_SESSION_IDS: readonly string[] = computeApprovableIds();

const APPROVABLE_SET: ReadonlySet<string> = new Set(APPROVABLE_ADVANCED_SESSION_IDS);

export function isApprovableAdvancedSessionId(id: unknown): boolean {
  return typeof id === "string" && APPROVABLE_SET.has(id.trim().toUpperCase());
}

/**
 * Normalise une liste d'approbations venant d'une source non fiable (état de
 * formulaire, localStorage, configuration sérialisée). Écarte sans bruit tout
 * ce qui n'est pas dans la liste fermée ; renvoie des IDs en majuscules,
 * dédoublonnés et triés (sortie stable, comparable).
 */
export function sanitizeApprovedAdvancedSessionIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const kept = new Set<string>();
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const id = raw.trim().toUpperCase();
    if (APPROVABLE_SET.has(id)) kept.add(id);
  }
  return [...kept].sort();
}

/** Sous-ensemble de `PlanConfig` lu ici — structurel, sans import circulaire. */
export interface LevelPrerequisiteSignalSource {
  ambitionMeta?: { trainingLevel: string; trainingLevelSource: string } | null;
  weeklyHours?: number | null;
  approvedAdvancedSessionIds?: readonly string[] | null;
}

/**
 * Signal unique transmis à `buildWorkoutCatalog` et `runReconciler`, pour la
 * génération complète comme pour les régénérations. Sans `ambitionMeta`, le
 * signal reste `null` (comportement inchangé : les fiches à profil vérifié
 * restent fermées, approbation ou non).
 */
export function buildLevelPrerequisiteSignal(
  source: LevelPrerequisiteSignalSource | null | undefined,
): BeginnerIntensitySignal | null {
  if (!source?.ambitionMeta) return null;
  const approved = sanitizeApprovedAdvancedSessionIds(source.approvedAdvancedSessionIds);
  return {
    trainingLevel: source.ambitionMeta.trainingLevel,
    trainingLevelSource: source.ambitionMeta.trainingLevelSource,
    weeklyHours: source.weeklyHours ?? null,
    ...(approved.length > 0 ? { approvedAdvancedSessionIds: approved } : {}),
  };
}

/** Profil tel que le garde-fou le verra pour cet athlète. */
export interface AdvancedSessionProfileSignal {
  trainingLevel: string;
  trainingLevelSource: string;
  weeklyHours?: number | null;
}

export type AdvancedSessionApprovalBlocker =
  | "not_approvable"
  | "unverified_profile"
  | "insufficient_level"
  | "insufficient_hours"
  | "beginner_level";

export interface AdvancedSessionApprovalEvaluation {
  /** La fiche fait partie de la liste fermée. */
  approvable: boolean;
  /**
   * Une approbation rendrait réellement la fiche éligible pour ce profil
   * (verdict du garde-fou lui-même, avec la seule approbation de cette fiche).
   */
  effective: boolean;
  /** Explication destinée au coach quand `effective` est faux. */
  blocker: AdvancedSessionApprovalBlocker | null;
  minimumTrainingLevel: WorkoutTrainingLevel | null;
  minimumWeeklyHours: number | null;
}

const RELIABLE_LEVEL_SOURCES = new Set(["manual", "auto-tss"]);
const BEGINNER_LEVELS = new Set(["untrained", "light"]);
const LEVEL_RANK: Readonly<Record<string, number>> = {
  untrained: 0,
  light: 1,
  trained: 2,
  highly_trained: 3,
};

/**
 * Dit au coach si cocher une fiche aura un effet pour ce profil, et sinon
 * pourquoi. `effective` vient TOUJOURS du garde-fou ; `blocker` n'est qu'une
 * explication (un test vérifie qu'ils ne divergent jamais).
 */
export function evaluateAdvancedSessionApproval(
  id: string,
  profile: AdvancedSessionProfileSignal | null | undefined,
): AdvancedSessionApprovalEvaluation {
  const normalized = String(id || "").trim().toUpperCase();
  const prerequisites = mergedPrerequisitesFor(normalized);
  const minimumTrainingLevel = prerequisites.minimumTrainingLevel ?? null;
  const minimumWeeklyHours = prerequisites.minimumWeeklyHours ?? null;

  if (!APPROVABLE_SET.has(normalized)) {
    return {
      approvable: false,
      effective: false,
      blocker: "not_approvable",
      minimumTrainingLevel,
      minimumWeeklyHours,
    };
  }

  const effective = !isLevelPrerequisiteIncompatible(
    normalized,
    profile
      ? {
          trainingLevel: profile.trainingLevel,
          trainingLevelSource: profile.trainingLevelSource,
          weeklyHours: profile.weeklyHours ?? null,
          approvedAdvancedSessionIds: [normalized],
        }
      : null,
  );

  let blocker: AdvancedSessionApprovalBlocker | null = null;
  if (!effective) {
    if (!profile || !RELIABLE_LEVEL_SOURCES.has(profile.trainingLevelSource)) {
      blocker = "unverified_profile";
    } else if (
      minimumTrainingLevel
      && (LEVEL_RANK[profile.trainingLevel] ?? -1) < LEVEL_RANK[minimumTrainingLevel]
    ) {
      blocker = "insufficient_level";
    } else if (
      minimumWeeklyHours != null
      && (profile.weeklyHours == null || profile.weeklyHours < minimumWeeklyHours)
    ) {
      blocker = "insufficient_hours";
    } else if (BEGINNER_LEVELS.has(profile.trainingLevel)) {
      // Profil vérifié, niveau/volume minimal satisfaits, refus quand même :
      // seule l'incompatibilité débutant historique du garde-fou reste.
      blocker = "beginner_level";
    } else {
      // Le garde-fou refuse pour une raison que ce module ne sait pas nommer :
      // on reste fermé et on le dit, plutôt que d'inventer une explication.
      blocker = "unverified_profile";
    }
  }

  return { approvable: true, effective, blocker, minimumTrainingLevel, minimumWeeklyHours };
}
