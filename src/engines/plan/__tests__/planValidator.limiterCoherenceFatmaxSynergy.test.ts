import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Correction ciblée "plan multiobjectifs réel" (2026-10-24), constat n°4 :
 * incident réel confirmé — un plan réel avec limiteurs L1=VLamax, L2=FTP,
 * L3=FatMax affichait "L1 96%, L2 6%, L3 0%" mais un score de couverture
 * 95/100, malgré des séances Sweet Spot/seuil/Z2/brick réellement présentes.
 * Deux causes démontrées, corrigées ici :
 *  (a) FatMax n'avait aucune synergie de co-contribution avec VLamax
 *      (contrairement à TTE/Économie/FTP), alors que sa zone d'entraînement
 *      EST la zone Z2/aérobie/train-low que le pattern VLamax détecte déjà —
 *      le rendant structurellement quasi inatteignable.
 *  (b) Le scoring des rangs L2/L3 ignorait la cible (`target`)/le statut
 *      (`status`) déjà calculés pour l'affichage, utilisant un seuil fixe
 *      `pct < 5` au lieu de refléter la vraie cible du rang (15% pour L2).
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "build", dayName: "Lundi", dayIndex: 0,
    sport: "Vélo", title: "Séance", details: "60min", isRest: false, isKeySession: true, ...overrides,
  };
}

function makeVlamaxWeek(weekNumber: number): ParsedWeek {
  return {
    weekNumber, theme: "Build", phase: "build",
    sessions: [
      makeSession({
        weekNumber, sport: "Course", title: "Endurance fondamentale Z2",
        details: "90min endurance fondamentale, zone 2 continue",
        dayName: "Mardi", dayIndex: 1,
      }),
      makeSession({ weekNumber, sport: "Course", title: "Repos", isRest: true, isKeySession: false }),
    ],
  };
}

function makeFtpWeek(weekNumber: number): ParsedWeek {
  return {
    weekNumber, theme: "Build", phase: "build",
    sessions: [
      makeSession({
        weekNumber, sport: "Vélo", title: "Sweet Spot 4x12min",
        details: "Sweet Spot 4x12min @88-92% FTP",
        dayName: "Jeudi", dayIndex: 3,
      }),
    ],
  };
}

function makePlan(): ParsedPlan {
  const weeks: ParsedWeek[] = [];
  for (let w = 1; w <= 9; w++) weeks.push(makeVlamaxWeek(w));
  weeks.push(makeFtpWeek(10));
  return { title: "Plan Test", phases: [], weeks, totalWeeks: 10 } as ParsedPlan;
}

function runValidation(plan: ParsedPlan) {
  return validatePlan(
    plan, "IRONMAN 70.3",
    undefined, undefined,
    undefined, ["vlamax", "ftp", "fatmax"],
  );
}

describe("validateLimiterCoherence — synergie FatMax↔VLamax et scoring L2/L3 cohérent avec le statut affiché", () => {
  it("[TEST OBLIGATOIRE] FatMax (L3) hérite de la couverture VLamax (L1) via la synergie de zone partagée, jamais 0% artificiel", () => {
    const vr = runValidation(makePlan());
    const fatmax = vr.limiterCoverage.find((c) => c.key === "fatmax");
    const vlamax = vr.limiterCoverage.find((c) => c.key === "vlamax");
    expect(fatmax).toBeDefined();
    expect(vlamax).toBeDefined();
    expect(fatmax!.hits).toBe(vlamax!.hits); // mêmes séances Z2/EF partagées
    expect(fatmax!.pct).toBeGreaterThanOrEqual(90);
    expect(fatmax!.status).toBe("ok");
  });

  it("[TEST OBLIGATOIRE] L2 (FTP) sous la cible mais au-dessus du plancher 'absent' → statut 'low' et pénalité appliquée (plus de passe-droit silencieux à 6-14%)", () => {
    const vr = runValidation(makePlan());
    const ftp = vr.limiterCoverage.find((c) => c.key === "ftp");
    expect(ftp).toBeDefined();
    expect(ftp!.pct).toBeLessThan(ftp!.target); // 10% < cible 15%
    expect(ftp!.status).toBe("low");
    const ftpIssue = vr.issues.find((i) => i.rule === "limiter_coherence" && i.message.includes("Limiteur #2"));
    expect(ftpIssue).toBeDefined();
    expect(ftpIssue!.severity).toBe("warning");
  });

  it("le score de couverture limiteurs reflète désormais la sous-représentation L2 (92/100, plus 95/100 artificiel)", () => {
    const vr = runValidation(makePlan());
    const limiterIssues = vr.issues.filter((i) => i.rule === "limiter_coherence");
    // L1 ok (pas de pénalité), L2 "low" (-8), L3 "ok" après synergie (pas de pénalité) = 92.
    expect(limiterIssues.filter((i) => i.message.includes("Limiteur #1"))).toHaveLength(0);
    expect(limiterIssues.filter((i) => i.message.includes("Limiteur #3"))).toHaveLength(0);
    expect(limiterIssues.filter((i) => i.message.includes("Limiteur #2"))).toHaveLength(1);
  });

  it("sans FatMax parmi les limiteurs identifiés → aucune synergie appliquée (comportement inchangé)", () => {
    const vr = validatePlan(makePlan(), "IRONMAN 70.3", undefined, undefined, undefined, ["vlamax", "ftp"]);
    expect(vr.limiterCoverage.find((c) => c.key === "fatmax")).toBeUndefined();
  });
});
