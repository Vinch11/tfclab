import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Fix A7 (audit "génération de plan IA") : validateKeySessions (règle 3)
 * exemptait une semaine de son contrôle via `isDeload` — une heuristique de
 * CONTENU (≤3 séances actives, ou thème/phase matchant un regex de décharge)
 * indépendante du weekType RÉELLEMENT calculé à la génération
 * (inferWeekType, sessionSizingMatrix.ts — même fonction qui pilote le
 * calcul de quota hebdo). Une semaine "load" compressée à ≤3 séances actives
 * (voyage, blessure — le nombre de séances réduit sans que ce soit une
 * semaine de récupération PLANIFIÉE) était donc exemptée à tort de cette
 * règle, alors qu'elle doit être vérifiée comme n'importe quelle semaine de
 * charge.
 *
 * `scheduledWeekType` (calculé par la même fonction que la génération, à
 * partir de weekNumber/totalWeeks/objective) est maintenant utilisé comme
 * source de vérité pour cette exemption spécifique — pas `isDeload`, qui
 * reste basé sur le contenu observé pour les règles qui vérifient qu'une
 * charge a RÉELLEMENT été réduite (ex. validateLoadPattern).
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Course",
    title: "EF Z2 45min",
    details: "Endurance fondamentale",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Chantier", phase = "build"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s, i) => makeSession({
      weekNumber,
      weekTheme: theme,
      dayIndex: i,
      dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}

function makeCompliantWeek(weekNumber: number): ParsedWeek {
  return makeWeek(weekNumber, [
    { title: "EF Z2 45min", details: "Endurance" },
    { title: "Intervalles seuil 3x10min", details: "Séance clé 🔑 Z5" },
    { title: "Sortie longue 20km", details: "SL progressive 🔑" },
    { title: "Repos", sport: "Repos", isRest: true, details: "" },
  ]);
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — Marathon — 8 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

describe("validateKeySessions — exemption basée sur le weekType planifié, pas sur isDeload (fix A7)", () => {
  it("flague une semaine LOAD compressée à 2 séances sans aucune séance clé (n'est PAS une vraie semaine de récupération planifiée)", () => {
    // S3/8 pour Marathon : ni dernière semaine, ni fenêtre de taper
    // (taperWeeksForObjective("Marathon")=2 → S6-S7), ni multiple de 4
    // (recovery périodique) → inferWeekType(3, 8, "Marathon") = "load".
    const weeks = [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
      n === 3
        ? makeWeek(3, [
            { title: "EF Z2 30min", details: "Endurance légère (voyage — semaine compressée)" },
            { title: "EF Z2 25min", details: "Footing" },
          ])
        : makeCompliantWeek(n),
    );
    const result = validatePlan(makePlan(weeks), "Marathon");
    const issue = result.issues.find((i) => i.rule === "key_sessions" && i.week === 3);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
  });

  it("flague aussi une semaine LOAD dont le thème matche par erreur le regex de décharge (≥4 séances, zéro clé)", () => {
    // Thème contenant "repos" (matche DELOAD_PATTERNS) mais S5/8 = "load"
    // canonique pour Marathon (ni taper S6-S7, ni multiple de 4, ni dernière
    // semaine) — l'ancienne heuristique isDeload aurait exempté cette
    // semaine à tort sur la seule base du texte du thème.
    const weeks = [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
      n === 5
        ? makeWeek(5, [
            { title: "EF Z2 45min", details: "Footing" },
            { title: "EF Z2 40min", details: "Footing" },
            { title: "EF Z2 50min", details: "Footing tranquille" },
            { title: "EF Z2 35min", details: "Footing entre 2 blocs" },
          ], "Bloc repos actif intégré")
        : makeCompliantWeek(n),
    );
    const result = validatePlan(makePlan(weeks), "Marathon");
    const issue = result.issues.find((i) => i.rule === "key_sessions" && i.week === 5);
    expect(issue).toBeDefined();
  });

  it("continue d'exempter une vraie semaine de récupération planifiée (S4/8, multiple de 4 → recovery canonique)", () => {
    const weeks = [1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
      n === 4
        ? makeWeek(4, [
            { title: "EF Z2 30min", details: "Récup" },
            { title: "EF Z2 25min", details: "Footing léger" },
          ], "Décharge")
        : makeCompliantWeek(n),
    );
    const result = validatePlan(makePlan(weeks), "Marathon");
    const issue = result.issues.find((i) => i.rule === "key_sessions" && i.week === 4);
    expect(issue).toBeUndefined();
  });
});
