import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #2 : rien ne
 * suivait l'évolution semaine après semaine de la sortie longue (le facteur
 * de risque de surcharge le plus documenté) — seulement le volume agrégé
 * (validateProgression, déjà existant). Marathon : sortie longue course
 * uniquement. Ironman/70.3 : vélo ET course, suivies séparément — une
 * progression saine du vélo ne doit pas masquer un saut dangereux de la
 * sortie longue course, et inversement.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "base",
    dayName: "Dimanche",
    dayIndex: 6,
    sport: "Course",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard", phase = "base"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s, i) => makeSession({
      weekNumber,
      weekTheme: theme,
      dayIndex: i % 7,
      dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i % 7],
      ...s,
    })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return {
    title: "Plan TFCL™ — Test Athlete",
    phases: [],
    weeks,
    totalWeeks: weeks.length,
  };
}

// Quelques séances de remplissage pour ne pas déclencher d'autres règles
// (densité, répartition) sans rapport avec ce qui est testé ici.
const FILLER = [
  { sport: "Course", title: "Footing facile", details: "40min Z1-Z2." },
  { sport: "Repos", title: "Repos", isRest: true },
];

/**
 * Complète un plan à 8 semaines totales avec des semaines de remplissage
 * neutres après les semaines testées (1-3). Nécessaire car `scheduledWeekType`
 * (inferWeekType) classe des semaines en taper/recovery/race selon leur
 * POSITION RELATIVE au total — un plan de seulement 3 semaines tombe presque
 * entièrement dans la zone de taper automatique (Marathon: 2 sem de taper +
 * 1 sem de course = 3/3), ce qui exclurait les semaines testées de la
 * comparaison avant même d'avoir pu vérifier la règle. Sur 8 semaines,
 * S1-S3 restent "load" pour tous les objectifs testés ici (taper Marathon=2,
 * IM=3 ; recovery = multiples de 4 ; race = seulement S8).
 */
function padTo8Weeks(testedWeeks: ParsedWeek[]): ParsedWeek[] {
  const padded = [...testedWeeks];
  for (let w = testedWeeks.length + 1; w <= 8; w++) {
    padded.push(makeWeek(w, [...FILLER, { sport: "Course", title: "Footing", details: "45min Z1-Z2." }]));
  }
  return padded;
}

describe("validateLongSessionProgression — sortie longue Marathon", () => {
  it("flague un saut de sortie longue course >20%/semaine", () => {
    const weeks = padTo8Weeks([
      makeWeek(1, [...FILLER, { sport: "Course", title: "Sortie longue", details: "1h30 Z2." }]),
      makeWeek(2, [...FILLER, { sport: "Course", title: "Sortie longue", details: "1h45 Z2." }]),
      makeWeek(3, [...FILLER, { sport: "Course", title: "Sortie longue", details: "2h30 Z2." }]), // +43% vs S2
    ]);
    const result = validatePlan(makePlan(weeks), "Marathon");
    const issue = result.issues.find(i => i.rule === "progression" && i.week === 3 && /sortie longue Course/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
  });

  it("ne flague pas une progression normale (≤20%/semaine)", () => {
    const weeks = padTo8Weeks([
      makeWeek(1, [...FILLER, { sport: "Course", title: "Sortie longue", details: "1h30 Z2." }]),
      makeWeek(2, [...FILLER, { sport: "Course", title: "Sortie longue", details: "1h40 Z2." }]),
      makeWeek(3, [...FILLER, { sport: "Course", title: "Sortie longue", details: "1h50 Z2." }]),
    ]);
    const result = validatePlan(makePlan(weeks), "Marathon");
    expect(result.issues.find(i => i.rule === "progression" && /sortie longue/i.test(i.message))).toBeUndefined();
  });

  it("ne ponte pas une semaine de décharge : la comparaison n'implique jamais la semaine de récupération elle-même", () => {
    const weeks = padTo8Weeks([
      makeWeek(1, [...FILLER, { sport: "Course", title: "Sortie longue", details: "2h00 Z2." }]),
      makeWeek(2, [{ sport: "Course", title: "Footing court", details: "30min Z1." }], "Récupération", "recovery"),
      // Retour à une sortie longue normale après déload — ne doit PAS être
      // comparé à S1 (2h00 → 2h05, +4%, de toute façon sous le seuil) comme
      // si S2 n'existait pas : si c'était ponté, ce serait sans impact ici,
      // donc on vérifie surtout qu'aucune comparaison n'implique S2.
      makeWeek(3, [...FILLER, { sport: "Course", title: "Sortie longue", details: "2h05 Z2." }]),
    ]);
    const result = validatePlan(makePlan(weeks), "Marathon");
    const longSessionIssues = result.issues.filter(i => i.rule === "progression" && /sortie longue/i.test(i.message));
    expect(longSessionIssues.find(i => i.week === 2 || i.week === 3)).toBeUndefined();
  });
});

describe("validateLongSessionProgression — Ironman : vélo et course suivis séparément", () => {
  it("flague un saut de sortie longue vélo même si la course progresse normalement", () => {
    const weeks = padTo8Weeks([
      makeWeek(1, [
        { sport: "Course", title: "Footing", details: "1h00 Z2." },
        { sport: "Vélo", title: "Sortie longue vélo", details: "3h00 Z2." },
      ]),
      makeWeek(2, [
        { sport: "Course", title: "Footing", details: "1h10 Z2." },
        { sport: "Vélo", title: "Sortie longue vélo", details: "5h00 Z2." }, // +67% vs S1
      ]),
      makeWeek(3, [
        { sport: "Course", title: "Footing", details: "1h15 Z2." },
        { sport: "Vélo", title: "Sortie longue vélo", details: "5h15 Z2." },
      ]),
    ]);
    const result = validatePlan(makePlan(weeks), "IM");
    const bikeIssue = result.issues.find(i => i.rule === "progression" && /sortie longue Vélo/i.test(i.message));
    const runIssue = result.issues.find(i => i.rule === "progression" && /sortie longue Course/i.test(i.message));
    expect(bikeIssue).toBeDefined();
    expect(runIssue).toBeUndefined();
  });

  it("marathon : un saut de sortie longue vélo (hors scope) n'est jamais vérifié", () => {
    const weeks = padTo8Weeks([
      makeWeek(1, [
        { sport: "Course", title: "Sortie longue", details: "1h30 Z2." },
        { sport: "Vélo", title: "Vélo loisir", details: "1h00 Z1." },
      ]),
      makeWeek(2, [
        { sport: "Course", title: "Sortie longue", details: "1h40 Z2." },
        { sport: "Vélo", title: "Vélo loisir", details: "3h00 Z1." }, // +200%, mais Marathon ne suit pas le vélo
      ]),
      makeWeek(3, [
        { sport: "Course", title: "Sortie longue", details: "1h50 Z2." },
        { sport: "Vélo", title: "Vélo loisir", details: "3h10 Z1." },
      ]),
    ]);
    const result = validatePlan(makePlan(weeks), "Marathon");
    expect(result.issues.find(i => i.rule === "progression" && /sortie longue Vélo/i.test(i.message))).toBeUndefined();
  });
});
