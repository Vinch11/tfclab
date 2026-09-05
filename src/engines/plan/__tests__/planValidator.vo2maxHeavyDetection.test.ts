import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel (audit "génération solide ?", passe 3) : le pattern numérique de
 * détection VO2max lourd (`[5-9]×5(min|')@?(1[1-9]\d|115|120)%FTP`) exigeait
 * un "@" littéral (ou rien) ET une durée d'EXACTEMENT "5" min ET 5-9
 * répétitions — le catalogue réel écrit "à" (jamais "@"), des durées
 * variées (4, 6, 8, 10-12 min) et des reps hors [5-9] (3, 4, 4-5), et sépare
 * parfois durée et %FTP par un label de zone. Sur 5 fiches catalogue
 * réelles ≥5min à >110% FTP (dont l'exemple "5×5' à 110-115% FTP" que le
 * commentaire d'origine citait lui-même comme cas cible), AUCUNE n'était
 * détectée — le contrôle était un no-op de fait sous restriction VO2max.
 * Remplacé par une extraction numérique (durée, %FTP) tolérante aux plages
 * et à un court texte intercalé, avec comparaison explicite au seuil de la
 * règle (≥5min ET >110% FTP).
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Vélo",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makePlanWithSession(details: string): ParsedPlan {
  const week: ParsedWeek = {
    weekNumber: 1,
    theme: "Test",
    phase: "build",
    sessions: [makeSession({ details })],
  };
  return { title: "Plan Test", phases: [], weeks: [week], totalWeeks: 1 } as ParsedPlan;
}

const VO2_RESTRICTION = ["Restriction VO2max"];

function violations(plan: ParsedPlan) {
  const vr = validatePlan(plan, "703", VO2_RESTRICTION);
  return vr.issues.filter(i => i.rule === "prohibition_compliance");
}

describe("validateProhibitionCompliance — restriction VO2max : notations catalogue réelles (\"à\" pas \"@\", durées/reps variées)", () => {
  it("détecte 5×5' à 110-115% FTP (catalogue réel, enrichedWorkouts.ts — cas cité par le commentaire d'origine)", () => {
    const plan = makePlanWithSession("5 x 5' à 110-115% FTP (88-92% FCmax) R:5' Z1. Steady-state VO2 obligatoire");
    expect(violations(plan).length).toBeGreaterThan(0);
  });

  it("détecte une durée séparée du %FTP par un label de zone (catalogue réel, enrichedWorkouts.ts)", () => {
    const plan = makePlanWithSession("60-80' Z2 avec 3 x 6' Z5 à 108-115% FTP. R:6' Z1 entre chaque. Pas de Z3/Z4");
    expect(violations(plan).length).toBeGreaterThan(0);
  });

  it("détecte une plage de durée dont la borne haute dépasse 5min (catalogue réel, workoutLibrary.ts progression Seiler)", () => {
    const plan = makePlanWithSession(
      "Semaines 4-6 : 4×6 min à 106-112% FTP R:3 min. Semaines 7-9 : 4×8 min à 104-110% FTP R:4 min.",
    );
    expect(violations(plan).length).toBeGreaterThan(0);
  });

  it("continue de détecter Tabata VO2", () => {
    const plan = makePlanWithSession("Tabata VO2 20/10 x8");
    expect(violations(plan).length).toBeGreaterThan(0);
  });

  it("ne signale PAS un bloc ≥5min dont le %FTP haut ne dépasse pas 110 (borne, pas de violation)", () => {
    const plan = makePlanWithSession("4×8 min à 103-110% FTP R:4 min 50% FTP");
    expect(violations(plan).length).toBe(0);
  });

  it("ne signale PAS un bloc >110% FTP dont la durée reste sous 5min (court et contrôlé, explicitement autorisé)", () => {
    const plan = makePlanWithSession("3-4×3min @105-110% FTP");
    expect(violations(plan).length).toBe(0);
  });

  it("ne signale PAS une pyramide progressive où aucun palier ne cumule ≥5min ET >110% simultanément", () => {
    const plan = makePlanWithSession(
      "8min @ 90% FTP → 6min @ 95% FTP → 4min @ 100% FTP → 2min @ 110% FTP → 1min @ 120% FTP. Récup 3min Z1 entre chaque.",
    );
    expect(violations(plan).length).toBe(0);
  });

  it("ne signale PAS de violation quand la restriction VO2max n'est pas active pour cet athlète", () => {
    const plan = makePlanWithSession("5 x 5' à 110-115% FTP");
    const vr = validatePlan(plan, "703", []);
    expect(vr.issues.filter(i => i.rule === "prohibition_compliance").length).toBe(0);
  });
});
