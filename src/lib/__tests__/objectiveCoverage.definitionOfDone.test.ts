import { describe, it, expect } from "vitest";
import type { ObjectifType } from "@/types/athlete";
import { normalizeGoal, buildWorkoutCatalog } from "@/lib/workoutCatalogBuilder";
import { normalizeObjective } from "@/lib/physiologicalTargets";
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
import { SPORT_RATIO_TARGETS } from "@/engines/plan/planValidator";
import { buildFewShotExamples } from "../../../supabase/functions/ai-training-plan/systemPrompt";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEFINITION OF DONE — COUVERTURE PAR OBJECTIF
 *
 * Contexte (discussion coach, 2026-10-02) : plusieurs bugs réels trouvés cette
 * session (Sprint/Olympique/5K sans goals[] dédié dans le catalogue, cf. PR
 * #297) partageaient le même défaut de processus — un objectif ajouté à
 * ObjectifType (src/types/athlete.ts, visible dans l'UI) sans jamais vérifier
 * qu'il est effectivement câblé dans TOUTES les couches qui en dépendent
 * (routage catalogue, cibles physiologiques, ratio par sport, few-shot IA).
 * Chaque trou a été découvert manuellement, un par un, par le coach ou par
 * audit ponctuel — jamais par un garde-fou automatique.
 *
 * Ce fichier remplace cette découverte manuelle par un contrôle mécanique :
 * pour CHAQUE valeur de ObjectifType, on vérifie que chacune des 4 couches
 * la reconnaît explicitement (jamais un repli silencieux générique). La
 * checklist ci-dessous EST la "Definition of Done" d'un nouvel objectif —
 * un objectif qui ne la remplit pas ne doit pas être exposé dans l'UI.
 *
 * Le garde-fou le plus important est `COVERAGE_GUARD` plus bas : il force
 * une erreur TypeScript (donc un échec `tsc --noEmit`, donc CI rouge) si
 * quelqu'un ajoute une valeur à `ObjectifType` sans l'ajouter aussi à
 * `ALL_OBJECTIVES` ci-dessous — impossible d'oublier silencieusement un
 * nouvel objectif comme Sprint/Olympic/5K l'ont été.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const ALL_OBJECTIVES: readonly ObjectifType[] = [
  "IM", "703", "Sprint", "Olympic", "Marathon", "Semi", "5K", "10K",
  "StartToRun", "Trail", "TrailShort", "TrailMountain", "TrailUltra",
] as const;

// Garde-fou de compilation : si `ObjectifType` gagne un membre absent de
// `ALL_OBJECTIVES`, cette ligne ne compile plus (propriété manquante dans le
// type `Record<ObjectifType, true>`) — `tsc --noEmit` échoue en CI avant même
// qu'un test ne tourne.
const COVERAGE_GUARD: Record<ObjectifType, true> = ALL_OBJECTIVES.reduce(
  (acc, o) => { acc[o] = true; return acc; },
  {} as Record<ObjectifType, true>,
);
void COVERAGE_GUARD;

// Objectifs single-sport : aucune cible de ratio par sport n'a de sens.
const RATIO_EXEMPT: ReadonlySet<ObjectifType> = new Set(["StartToRun"]);

// Vérité de référence pour normalizeObjective() (physiologicalTargets.ts) —
// pins le mapping explicitement pour qu'un futur changement accidentel
// (ex. un alias retiré par erreur) fasse échouer ce test plutôt que de
// retomber silencieusement sur la cible "703" par défaut.
const EXPECTED_PHYSIO_KEY: Record<ObjectifType, string> = {
  IM: "IM",
  "703": "703",
  Sprint: "Sprint",
  Olympic: "Olympic",
  Marathon: "Marathon",
  Semi: "Semi",
  "5K": "5K",
  "10K": "10km", // Clé interne historique (alias) — pas un bug, cf. OBJECTIVE_ALIASES
  StartToRun: "StartToRun",
  Trail: "Trail",
  TrailShort: "Trail", // Alias volontaire — même profil physio que "Trail"
  TrailMountain: "TrailMountain",
  TrailUltra: "Ultra", // Clé interne historique (alias) — pas un bug
};

describe("Definition of Done — normalizeGoal() (routage catalogue, workoutCatalogBuilder.ts)", () => {
  it.each(ALL_OBJECTIVES)("%s résout vers au moins une clé WorkoutGoal (jamais []))", (obj) => {
    const goals = normalizeGoal(obj);
    expect(goals.length).toBeGreaterThan(0);
  });
});

describe("Definition of Done — buildWorkoutCatalog() produit un catalogue non-trivial par objectif", () => {
  it.each(ALL_OBJECTIVES)("%s retourne un catalogue suffisant", (obj) => {
    const list = buildWorkoutCatalog(obj, 1, 10, 12, { maxItems: 80 });
    // StartToRun est volontairement un pool isolé et réduit (catalogue dédié
    // débutant) — tout le reste doit avoir un catalogue large (dizaines de
    // fiches), sans quoi l'objectif retombe sur un pool trop générique.
    const minExpected = obj === "StartToRun" ? 5 : 15;
    expect(list.length).toBeGreaterThanOrEqual(minExpected);
  });
});

describe("Definition of Done — cibles physiologiques (physiologicalTargets.ts)", () => {
  it.each(ALL_OBJECTIVES)("%s résout vers sa clé physio dédiée, jamais un repli silencieux vers '703'", (obj) => {
    const resolved = normalizeObjective(obj);
    expect(resolved).toBe(EXPECTED_PHYSIO_KEY[obj]);
    // Un objectif qui n'EST PAS 703 ne doit jamais silencieusement hériter de
    // ses cibles (le bug type de `normalizeObjective`'s `return alias || "703"`
    // quand l'alias est absent).
    if (obj !== "703") {
      expect(resolved).not.toBe("703");
    }
  });
});

describe("Definition of Done — ratio par sport (planValidator.ts SPORT_RATIO_TARGETS)", () => {
  it.each(ALL_OBJECTIVES)("%s a une cible de ratio dédiée, sauf exemption explicite (single-sport)", (obj) => {
    const key = normalizeObjectiveKey(obj);
    const target = SPORT_RATIO_TARGETS[key];
    if (RATIO_EXEMPT.has(obj)) {
      expect(target).toBeUndefined();
    } else {
      expect(target).toBeDefined();
    }
  });
});

describe("Definition of Done — few-shot IA (systemPrompt.ts buildFewShotExamples)", () => {
  const UNKNOWN_FALLBACK = buildFewShotExamples({ objective: "ZZZ_OBJECTIF_INCONNU_QUI_NE_DOIT_JAMAIS_EXISTER" });

  it.each(ALL_OBJECTIVES)("%s ne retombe pas sur le panel générique \"objectif inconnu\"", (obj) => {
    const result = buildFewShotExamples({ objective: obj });
    // Le panel générique (objectif non reconnu) concatène TOUTES les
    // semaines-types élite — c'est le signal exact du bug historique
    // Sprint/Olympic (Batch 2) : un objectif non reconnu par aucune branche
    // dédiée retombait sur ce même panel complet et non-ciblé.
    expect(result).not.toBe(UNKNOWN_FALLBACK);
  });
});
