import { describe, it, expect } from "vitest";
import { validatePlan, type AmbitionAudit } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import { computeAmbitionEffective, AMBITION_ORDER, type CoachTrainingLevel } from "@/lib/ambitionDowngrade";
import { normalizeAmb, mapObjectiveToSport, VOLUME_CAP_MATRIX } from "@/lib/deriveRaceTargets";
import { AMBITIONS } from "@/lib/raceAnalysis";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #D (demande coach
 * explicite, suite à l'audit "ambition brute vs ambitionEffective") :
 * 1. `validateAmbitionCoherence` trace un déclassement d'ambition en issue
 *    purement informative, avec les mêmes chiffres EXACTS (plafond de
 *    volume, séances qualité/semaine) que ceux réellement appliqués à la
 *    génération (sources canoniques réutilisées, jamais recalculées ici).
 * 2. Les règles sportives concernées (`validateDailySessionFloor` ici,
 *    représentative) jugent désormais le plan sur `ambition` = l'ambition
 *    EFFECTIVE — démonstration concrète que le déclassement élimine une
 *    fausse alerte plutôt que d'en créer une.
 * 3. Propriété de non-régression (demande coach, point 5) : aucune ambition
 *    n'est JAMAIS augmentée par `computeAmbitionEffective`, quel que soit
 *    le niveau d'entraînement — testé ici en boucle sur toutes les
 *    combinaisons, pas seulement les cas cités.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "base", dayName: "Dimanche", dayIndex: 6,
    sport: "Course", title: "Séance", details: "", isRest: false, ...overrides,
  };
}
function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard", phase = "base"): ParsedWeek {
  return {
    weekNumber, theme, phase,
    sessions: sessions.map((s, i) => makeSession({
      weekNumber, weekTheme: theme,
      dayIndex: i % 7, dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}
function makePlan(weeks: ParsedWeek[], title = "Plan TFCL™ — Test Athlete — Ambition"): ParsedPlan {
  return { title, phases: [], weeks, totalWeeks: weeks.length };
}

/** Semaine "normale" avec des jours à 1 seule discipline (ni brick, ni LCW)
 *  — exactement le profil qui déclenche `validateDailySessionFloor` sous
 *  une ambition élevée mal transmise (le bug corrigé ici). */
function normalWeek(weekNumber: number): ParsedWeek {
  return makeWeek(weekNumber, [
    { sport: "Course", title: "Footing", details: "45min Z2" },
    { sport: "Vélo", title: "Sortie", details: "90min Z2" },
    { sport: "Natation", title: "Technique", details: "40min" },
    { sport: "Course", title: "Footing", details: "40min Z2" },
  ], "Build");
}
function buildSimplePlan(weeks: number): ParsedPlan {
  return makePlan(Array.from({ length: weeks }, (_, i) => normalWeek(i + 1)));
}

const OBJECTIVES = ["Marathon", "IM", "703"] as const;

describe("computeAmbitionEffective — propriété : jamais d'augmentation (demande coach point 5)", () => {
  const LEVELS: (CoachTrainingLevel | "auto")[] = ["auto", "untrained", "light", "trained", "highly_trained"];
  for (const ambitionSaisie of AMBITION_ORDER) {
    for (const trainingLevel of LEVELS) {
      it(`${ambitionSaisie} saisie + niveau=${trainingLevel} → effective jamais supérieure`, () => {
        const res = computeAmbitionEffective({ ambitionSaisie, trainingLevel, tss7d: null });
        const rank = (a: string) => AMBITION_ORDER.indexOf(a as typeof AMBITION_ORDER[number]);
        expect(rank(res.ambitionEffective)).toBeLessThanOrEqual(rank(res.ambitionSaisie));
      });
    }
  }
});

describe("validateAmbitionCoherence — déclassement tracé avec les chiffres réels (sources canoniques)", () => {
  for (const objective of OBJECTIVES) {
    describe(`objectif ${objective}`, () => {
      it("sans trainingLevel (fallback prudent → déclassé) : issue informative avec les plafonds/qualités exacts", () => {
        const resolution = computeAmbitionEffective({ ambitionSaisie: "elite", trainingLevel: undefined, tss7d: null });
        expect(resolution.downgraded).toBe(true); // précondition du test
        const ambitionAudit: AmbitionAudit = {
          saisie: resolution.ambitionSaisie,
          effective: resolution.ambitionEffective,
          downgraded: resolution.downgraded,
          reason: resolution.diagnosticNote,
        };
        const plan = buildSimplePlan(6);
        const result = validatePlan(
          plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          resolution.ambitionEffective, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          ambitionAudit,
        );
        const issue = result.issues.find(i => i.rule === "ambition_coherence");
        expect(issue).toBeDefined();
        expect(issue?.severity).toBe("info");

        // Chiffres EXACTS attendus — recalculés via les mêmes sources canoniques
        // que validateAmbitionCoherence, jamais une valeur en dur (anti-drift).
        const sport = mapObjectiveToSport(objective);
        const localSaisie = normalizeAmb(resolution.ambitionSaisie);
        const localEffective = normalizeAmb(resolution.ambitionEffective);
        const capSaisie = VOLUME_CAP_MATRIX[sport][localSaisie];
        const capEffective = VOLUME_CAP_MATRIX[sport][localEffective];
        const qSaisie = AMBITIONS.find(a => a.key === localSaisie)!.qualitesParSemaine;
        const qEffective = AMBITIONS.find(a => a.key === localEffective)!.qualitesParSemaine;
        expect(issue?.detail).toContain(`${capSaisie}h → ${capEffective}h`);
        expect(issue?.detail).toContain(`${qSaisie} → ${qEffective}`);
        // Jamais une augmentation (demande coach point 5), vérifié aussi sur les chiffres cités.
        expect(capEffective).toBeLessThanOrEqual(capSaisie);
        expect(qEffective).toBeLessThanOrEqual(qSaisie);
      });

      it("niveau 'trained' : pas de déclassement (plafond = ambition demandée) → aucune issue ambition_coherence", () => {
        const resolution = computeAmbitionEffective({ ambitionSaisie: "elite", trainingLevel: "trained", tss7d: null });
        expect(resolution.downgraded).toBe(false); // précondition du test
        const ambitionAudit: AmbitionAudit = {
          saisie: resolution.ambitionSaisie, effective: resolution.ambitionEffective,
          downgraded: resolution.downgraded, reason: resolution.diagnosticNote,
        };
        const plan = buildSimplePlan(6);
        const result = validatePlan(
          plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          resolution.ambitionEffective, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          ambitionAudit,
        );
        expect(result.issues.find(i => i.rule === "ambition_coherence")).toBeUndefined();
      });

      it("niveau 'highly_trained' : aucun plafond, ambition 'elite' conservée intégralement → aucune issue", () => {
        const resolution = computeAmbitionEffective({ ambitionSaisie: "elite", trainingLevel: "highly_trained", tss7d: null });
        expect(resolution.downgraded).toBe(false);
        expect(resolution.ambitionEffective).toBe("elite");
        const ambitionAudit: AmbitionAudit = {
          saisie: resolution.ambitionSaisie, effective: resolution.ambitionEffective,
          downgraded: resolution.downgraded, reason: resolution.diagnosticNote,
        };
        const plan = buildSimplePlan(6);
        const result = validatePlan(
          plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          resolution.ambitionEffective, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          ambitionAudit,
        );
        expect(result.issues.find(i => i.rule === "ambition_coherence")).toBeUndefined();
      });
    });
  }

  it("ambitionAudit omis : comportement inchangé, aucune issue ambition_coherence (tout appelant existant)", () => {
    const plan = buildSimplePlan(6);
    const result = validatePlan(plan, "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "elite");
    expect(result.issues.find(i => i.rule === "ambition_coherence")).toBeUndefined();
  });
});

describe("Correction D — démonstration concrète : le déclassement élimine une fausse alerte (validateDailySessionFloor, IM/703)", () => {
  it("ambition BRUTE 'elite' (ancien comportement) sur un plan IM normal → fausses erreurs 'daily_session_floor'", () => {
    const plan = buildSimplePlan(6);
    const result = validatePlan(plan, "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "elite");
    const floorIssues = result.issues.filter(i => i.rule === "daily_session_floor");
    expect(floorIssues.length).toBeGreaterThan(0); // le plan "normal" n'est PAS un plan Elite+ 2-3 séances/jour
  });

  it("ambition EFFECTIVE 'age_group' (plan réellement généré après déclassement) sur le MÊME plan IM → aucune fausse alerte", () => {
    const plan = buildSimplePlan(6);
    const result = validatePlan(plan, "IM", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "age_group");
    const floorIssues = result.issues.filter(i => i.rule === "daily_session_floor");
    expect(floorIssues).toHaveLength(0);
  });
});
