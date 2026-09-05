import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel (audit "génération solide ?", passe 2) : SPRINT_BAN_VIOLATION_PATTERNS
 * (Rule 7, validateProhibitionCompliance) n'avait jamais eu de test dédié. En
 * confrontant le pattern aux vraies fiches catalogue (enrichedWorkoutsStrengthV2.ts,
 * enrichedWorkoutsTrail.ts...), plusieurs fiches explicitement taguées
 * "neuromusculaire pur"/"puissance" — exactement ce que le Sprint Ban interdit —
 * passaient inaperçues : le catalogue note les secondes avec un guillemet
 * ("10\"", "10''") et des plages ("10-15"), jamais le "s" littéral que le
 * pattern original exigeait. Élargi pour couvrir ces notations réelles.
 * Négation ajoutée sur "plyo explo" (même audit) : "pas de plyo explosive"
 * (une séance qui RESPECTE l'interdiction) était comptée à tort comme violation.
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Course",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makePlanWithSession(details: string, title = "Séance"): ParsedPlan {
  const week: ParsedWeek = {
    weekNumber: 1,
    theme: "Test",
    phase: "build",
    sessions: [makeSession({ title, details })],
  };
  return { title: "Plan Test", phases: [], weeks: [week], totalWeeks: 1 } as ParsedPlan;
}

const SPRINT_BAN = ["Sprint Ban"];

function violations(plan: ParsedPlan) {
  const vr = validatePlan(plan, "703", SPRINT_BAN);
  return vr.issues.filter(i => i.rule === "prohibition_compliance");
}

describe("validateProhibitionCompliance — Sprint Ban : notations catalogue réelles (guillemet secondes, plages)", () => {
  it("détecte une fiche côte notée avec guillemets et plage des deux côtés (catalogue réel, enrichedWorkouts.ts)", () => {
    const plan = makePlanWithSession(
      "10-15 x 10-15\" sprint en côte (8-12%). Récup trot descente. Focus: puissance et fréquence",
    );
    expect(violations(plan).length).toBeGreaterThan(0);
  });

  it("détecte une fiche côte notée avec un seul guillemet + qualificatif éloigné (catalogue réel, enrichedWorkoutsTrail.ts)", () => {
    const plan = makePlanWithSession(
      "12×8\" sprint côte raide >10% max effort (engagement bras+jambes, attaque pied avant). Pas filière lactique : neuromusculaire pur.",
    );
    expect(violations(plan).length).toBeGreaterThan(0);
  });

  it("détecte une fiche notée avec double guillemet (catalogue réel, enrichedWorkoutsV3.ts)", () => {
    const plan = makePlanWithSession("8x10'' sprint max départ arrêté / 5' Z2. Puis 30' Z2");
    expect(violations(plan).length).toBeGreaterThan(0);
  });

  it("continue de détecter le format déjà couvert avant l'élargissement (\"s\" littéral, adjacent)", () => {
    const plan = makePlanWithSession("6×10s all-out, r=3min");
    expect(violations(plan).length).toBeGreaterThan(0);
  });

  it("continue de détecter Tabata", () => {
    const plan = makePlanWithSession("Tabata 20/10 x8");
    expect(violations(plan).length).toBeGreaterThan(0);
  });

  it("ne signale PAS une séance qui respecte explicitement l'interdiction (négation \"pas de plyo explosive\")", () => {
    const plan = makePlanWithSession(
      "Force max en salle (renfo, gainage, ppg, mobilité) — pas de plyo explosive",
    );
    expect(violations(plan).length).toBe(0);
  });

  it("ne signale PAS le 30/30 Billat à 100-110% VMA (VO2max intermittent, explicitement autorisé)", () => {
    const plan = makePlanWithSession("6×5min 30/30 Billat à 100-110% VMA, r=3min");
    expect(violations(plan).length).toBe(0);
  });

  it("ne signale PAS les strides courts explicitement autorisés", () => {
    const plan = makePlanWithSession("Strides courts (5-8×15-20s) en fin d'EF pour l'économie neuromusculaire aérobie");
    expect(violations(plan).length).toBe(0);
  });

  it("ne signale PAS de violation quand la prohibition Sprint Ban n'est pas active pour cet athlète", () => {
    const week: ParsedWeek = {
      weekNumber: 1,
      theme: "Test",
      phase: "build",
      sessions: [makeSession({ details: "6×10s all-out, r=3min" })],
    };
    const plan: ParsedPlan = { title: "Plan Test", phases: [], weeks: [week], totalWeeks: 1 } as ParsedPlan;
    const vr = validatePlan(plan, "703", []);
    expect(vr.issues.filter(i => i.rule === "prohibition_compliance").length).toBe(0);
  });
});
