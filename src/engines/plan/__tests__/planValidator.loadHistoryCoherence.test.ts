import { describe, it, expect } from "vitest";
import { validatePlan, type WeeklyLoadContext, type SessionDensityConfig } from "../planValidator";
import { computeAmbitionEffective } from "@/lib/ambitionDowngrade";
import { computeCRR, computeChargeScore } from "@/lib/chargeRecenteReference";
import { resolveVolumeRampLoadAdjustment } from "@/lib/volumeRampLoadAdjustment";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #E (demande coach
 * explicite, suite à une hausse réelle 8h→17h/sem sur 4 semaines) :
 * `validateLoadHistoryCoherence` — historique de charge DÉCLARATIF (heures),
 * distinct du garde-fou CRR/TSS MESURÉ (chargeRecenteReference.ts /
 * volumeRampLoadAdjustment.ts), que ce fichier vérifie explicitement rester
 * intact et non-interféré (point 3 de la demande).
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "base", dayName: "Dimanche", dayIndex: 6,
    sport: "Course", title: "Séance", details: "", isRest: false, ...overrides,
  };
}
function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Build", phase = "base"): ParsedWeek {
  return {
    weekNumber, theme, phase,
    sessions: sessions.map((s, i) => makeSession({
      weekNumber, weekTheme: theme,
      dayIndex: i % 7, dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}
function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — Test Athlete — Historique de charge", phases: [], weeks, totalWeeks: weeks.length };
}
function sportSessions(sport: string, totalMin: number): Partial<ParsedSession>[] {
  if (totalMin <= 0) return [];
  if (totalMin <= 200) return [{ sport, title: `${sport} A`, details: `${totalMin}min` }];
  const half = Math.ceil(totalMin / 2);
  return [{ sport, title: `${sport} A`, details: `${half}min` }, { sport, title: `${sport} B`, details: `${totalMin - half}min` }];
}
/** Semaine générique ~17h (1020min), répartie sur 3 disciplines — le mix
 *  exact n'importe pas pour cette règle (elle ne regarde que le total). */
function week17h(n: number): ParsedWeek {
  return makeWeek(n, [...sportSessions("Natation", 180), ...sportSessions("Vélo", 480), ...sportSessions("Course", 360)]);
}
function week8h(n: number): ParsedWeek {
  return makeWeek(n, [...sportSessions("Natation", 60), ...sportSessions("Vélo", 240), ...sportSessions("Course", 180)]);
}
function week20h(n: number): ParsedWeek {
  return makeWeek(n, [...sportSessions("Natation", 200), ...sportSessions("Vélo", 600), ...sportSessions("Course", 400)]);
}

const OBJECTIVES = ["10K", "Marathon", "703", "IM"] as const;

describe("validateLoadHistoryCoherence — historique de charge déclaratif (Correction E)", () => {
  for (const objective of OBJECTIVES) {
    describe(`objectif ${objective}`, () => {
      it("8h chronique → 17h récent (4 semaines), plan qui se maintient à 17h : hausse signalée, pas de consolidation en défaut", () => {
        const plan = makePlan(Array.from({ length: 10 }, (_, i) => week17h(i + 1)));
        const loadContext: WeeklyLoadContext = { chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 };
        const result = validatePlan(
          plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined, loadContext,
        );
        const increaseIssue = result.issues.find(i => i.rule === "load_history" && /Hausse de charge déclarative/i.test(i.message));
        const consolidationIssues = result.issues.filter(i => i.rule === "load_history" && /dépasse déjà le volume récent/i.test(i.message));
        expect(increaseIssue).toBeDefined();
        expect(increaseIssue?.severity).toBe("warning");
        expect(consolidationIssues).toHaveLength(0);
      });

      it("8h chronique → 17h récent (4 semaines), plan qui repart à 20h dès S1 : consolidation signalée explicitement", () => {
        const plan = makePlan(Array.from({ length: 10 }, (_, i) => week20h(i + 1)));
        const loadContext: WeeklyLoadContext = { chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 };
        const result = validatePlan(
          plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined, loadContext,
        );
        const consolidationIssue = result.issues.find(i => i.rule === "load_history" && i.week === 1 && /dépasse déjà le volume récent/i.test(i.message));
        expect(consolidationIssue).toBeDefined();
        expect(consolidationIssue?.severity).toBe("warning"); // jamais "error" — déclaratif, jamais bloquant automatiquement
      });

      it("charge stable depuis plusieurs mois (chronique = récent, longue durée) : aucun signal", () => {
        const plan = makePlan(Array.from({ length: 10 }, (_, i) => week17h(i + 1)));
        const loadContext: WeeklyLoadContext = { chronicWeeklyHours: 17, recentWeeklyHours: 17, recentWeeksCount: 20 };
        const result = validatePlan(
          plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined, loadContext,
        );
        expect(result.issues.filter(i => i.rule === "load_history")).toHaveLength(0);
      });

      it("historique partiellement inconnu (recentWeeklyHours seul, pas de chronicWeeklyHours) : contrôle inactif, aucun signal fabriqué", () => {
        const plan = makePlan(Array.from({ length: 10 }, (_, i) => week20h(i + 1)));
        const loadContext: WeeklyLoadContext = { recentWeeklyHours: 17, recentWeeksCount: 4 };
        const result = validatePlan(
          plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined, loadContext,
        );
        expect(result.issues.filter(i => i.rule === "load_history")).toHaveLength(0);
      });

      it("recentWeeksCount inconnu : la hausse est signalée mais la durée est présentée comme non précisée, jamais estimée", () => {
        const plan = makePlan(Array.from({ length: 10 }, (_, i) => week17h(i + 1)));
        const loadContext: WeeklyLoadContext = { chronicWeeklyHours: 8, recentWeeklyHours: 17 };
        const result = validatePlan(
          plan, objective, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
          undefined, undefined, undefined, undefined, undefined, undefined, undefined, loadContext,
        );
        const issue = result.issues.find(i => i.rule === "load_history" && /Hausse de charge déclarative/i.test(i.message));
        expect(issue).toBeDefined();
        expect(issue?.message).toMatch(/durée non précisée/i);
      });
    });
  }

  it("loadContext omis : comportement inchangé, aucun signal (tout appelant existant)", () => {
    const plan = makePlan(Array.from({ length: 10 }, (_, i) => week20h(i + 1)));
    const result = validatePlan(plan, "703");
    expect(result.issues.filter(i => i.rule === "load_history")).toHaveLength(0);
  });

  it("n'est jamais présenté comme un ACWR mesuré : le message (titre de l'issue) ne mentionne jamais 'ACWR', et le detail dit explicitement que ce n'est PAS un ACWR mesuré", () => {
    const plan = makePlan(Array.from({ length: 10 }, (_, i) => week20h(i + 1)));
    const loadContext: WeeklyLoadContext = { chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 };
    const result = validatePlan(
      plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, loadContext,
    );
    const loadHistoryIssues = result.issues.filter(i => i.rule === "load_history");
    expect(loadHistoryIssues.length).toBeGreaterThan(0);
    for (const issue of loadHistoryIssues) {
      expect(issue.message).not.toMatch(/ACWR/);
      // Le detail peut évoquer l'ACWR, mais uniquement pour le distinguer explicitement ("pas un ACWR mesuré").
      if (issue.detail && /ACWR/.test(issue.detail)) {
        expect(issue.detail).toMatch(/pas un ACWR mesuré/i);
      }
    }
  });
});

describe("Contrainte d'agenda — maxDoubleDaysPerWeek (Correction E, distinct de maxSessionsPerDay)", () => {
  function dayWeek(n: number, doublesCount: number): ParsedWeek {
    // 7 jours, `doublesCount` d'entre eux ont 2 séances, le reste 1.
    const sessions: Partial<ParsedSession>[] = [];
    for (let d = 0; d < 7; d++) {
      sessions.push({ dayIndex: d, sport: "Course", title: "Séance A", details: "45min" });
      if (d < doublesCount) sessions.push({ dayIndex: d, sport: "Vélo", title: "Séance B", details: "60min" });
    }
    return makeWeek(n, sessions);
  }

  it("respecte le plafond déclaré (4 journées doubles max, exactement 4 ici) : aucune alerte", () => {
    const plan = makePlan([dayWeek(1, 4)]);
    const cfg: SessionDensityConfig = { maxDoubleDaysPerWeek: 4, maxSessionsPerDay: 2 };
    const result = validatePlan(
      plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, cfg,
    );
    expect(result.issues.filter(i => /journées à 2 séances/i.test(i.message))).toHaveLength(0);
  });

  it("dépasse le plafond déclaré (5 journées doubles pour un max de 4) : signalé explicitement", () => {
    const plan = makePlan([dayWeek(1, 5)]);
    const cfg: SessionDensityConfig = { maxDoubleDaysPerWeek: 4, maxSessionsPerDay: 2 };
    const result = validatePlan(
      plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, cfg,
    );
    const issue = result.issues.find(i => /journées à 2 séances/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.message).toMatch(/5 journées.*max déclaré 4/i);
  });

  it("maxDoubleDaysPerWeek omis : comportement inchangé (pas de nouvelle alerte même avec 7 journées doubles)", () => {
    const plan = makePlan([dayWeek(1, 7)]);
    const cfg: SessionDensityConfig = { maxSessionsPerDay: 2 };
    const result = validatePlan(
      plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, cfg,
    );
    expect(result.issues.filter(i => /journées à 2 séances/i.test(i.message))).toHaveLength(0);
  });
});

describe("Non-interférence avec le garde-fou CRR/TSS mesuré (demande coach point 3 — conservé intact)", () => {
  it("l'historique déclaratif (heures) et la CRR mesurée (TSS) produisent chacun leur propre signal, sans interférence ni conversion de l'un vers l'autre", () => {
    // CRR mesurée réelle (source SNAPSHOT) indiquant une charge en surcharge —
    // le garde-fou TSS existant doit réagir à SA façon, indépendamment du
    // nouvel historique déclaratif en heures.
    const crr = computeCRR({ tss7d: 900, snapshotDate: new Date().toISOString().split("T")[0], snapshotUpdatedAt: null, nolioTss7d: null, manualOverride: null });
    const chargeScore = computeChargeScore(crr, "703");
    const adjustment = resolveVolumeRampLoadAdjustment("trained", crr, chargeScore.status);

    // La CRR mesurée est bien utilisée — jamais remplacée ni ignorée par le nouvel historique déclaratif.
    expect(crr.source).toBe("SNAPSHOT");
    expect(adjustment.triggered).toBe(true); // surcharge réelle mesurée → garde-fou existant déclenché, inchangé

    // Le résultat de computeAmbitionEffective (utilisé par la génération) ne
    // consomme JAMAIS chronicWeeklyHours/recentWeeklyHours (heures) — seul
    // trainingLevel/tss7d y entrent, confirmé par signature et absence totale
    // de tout paramètre "heures" dans computeAmbitionEffective.
    const resolution = computeAmbitionEffective({ ambitionSaisie: "elite", trainingLevel: "trained", tss7d: 900 });
    expect(resolution.ambitionEffective).toBeDefined();

    // Et le nouveau signal déclaratif reste disponible indépendamment, sur UN PLAN :
    const plan = makePlan(Array.from({ length: 10 }, (_, i) => week20h(i + 1)));
    const loadContext: WeeklyLoadContext = { chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 };
    const result = validatePlan(
      plan, "703", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, loadContext,
    );
    expect(result.issues.filter(i => i.rule === "load_history").length).toBeGreaterThan(0);
  });
});
