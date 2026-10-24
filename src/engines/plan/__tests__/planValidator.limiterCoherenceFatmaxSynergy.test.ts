import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Correction ciblée "plan multiobjectifs réel" (2026-10-24), constat n°4,
 * PUIS revue scientifique ciblée avant fusion (même date) :
 *
 *  (a) Scoring L2/L3 (CONSERVÉ) : le scoring des rangs L2/L3 ignorait la
 *      cible (`target`)/le statut (`status`) déjà calculés pour l'affichage,
 *      utilisant un seuil fixe `pct < 5` au lieu de refléter la vraie cible
 *      du rang (15% pour L2).
 *
 *  (b) Synergie FatMax↔VLamax (REVUE) : la première version créditait
 *      FatMax pour TOUTE séance assignée à VLamax, y compris une simple
 *      Z2/endurance fondamentale générique — rejeté en revue scientifique :
 *      un stimulus susceptible d'influencer VLamax n'est pas nécessairement
 *      ciblé et suffisamment dosé pour FatMax. Le test
 *      `fatmax.hits === vlamax.hits` validait ce problème au lieu de le
 *      détecter. Version corrigée : seules les séances explicitement
 *      à jeun/"train low" (protocole de référence, documenté, pour
 *      l'adaptation FatMax) sont créditées — une Z2 générique SANS ce
 *      marqueur reste non créditée, la couverture restant basse/absente
 *      plutôt que fabriquée.
 */

function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "build", dayName: "Lundi", dayIndex: 0,
    sport: "Vélo", title: "Séance", details: "60min", isRest: false, isKeySession: true, ...overrides,
  };
}

function makeGenericZ2Week(weekNumber: number): ParsedWeek {
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

function makeTrainLowWeek(weekNumber: number): ParsedWeek {
  return {
    weekNumber, theme: "Build", phase: "build",
    sessions: [
      makeSession({
        weekNumber, sport: "Course", title: "EF à jeun (train low)",
        details: "90min endurance fondamentale à jeun, zone 2 continue",
        dayName: "Mardi", dayIndex: 1,
      }),
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

/** Plan reproduisant l'incident réel : VLamax 90%, aucune séance à jeun/train
 *  low explicite — seulement de la Z2/EF générique. */
function makePlanGenericOnly(): ParsedPlan {
  const weeks: ParsedWeek[] = [];
  for (let w = 1; w <= 9; w++) weeks.push(makeGenericZ2Week(w));
  weeks.push(makeFtpWeek(10));
  return { title: "Plan Test", phases: [], weeks, totalWeeks: 10 } as ParsedPlan;
}

/** Plan mixte : 5 semaines à jeun/train low (critère FatMax défendable) + 4
 *  semaines Z2 générique (non défendable pour FatMax) + 1 semaine FTP. */
function makePlanMixed(): ParsedPlan {
  const weeks: ParsedWeek[] = [];
  for (let w = 1; w <= 5; w++) weeks.push(makeTrainLowWeek(w));
  for (let w = 6; w <= 9; w++) weeks.push(makeGenericZ2Week(w));
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

describe("validateLimiterCoherence — scoring L2/L3 cohérent avec le statut affiché (conservé)", () => {
  it("[TEST OBLIGATOIRE] L2 (FTP) sous la cible mais au-dessus du plancher 'absent' → statut 'low' et pénalité appliquée (plus de passe-droit silencieux à 6-14%)", () => {
    const vr = runValidation(makePlanGenericOnly());
    const ftp = vr.limiterCoverage.find((c) => c.key === "ftp");
    expect(ftp).toBeDefined();
    expect(ftp!.pct).toBeLessThan(ftp!.target); // 10% < cible 15%
    expect(ftp!.status).toBe("low");
    const ftpIssue = vr.issues.find((i) => i.rule === "limiter_coherence" && i.message.includes("Limiteur #2"));
    expect(ftpIssue).toBeDefined();
    expect(ftpIssue!.severity).toBe("warning");
  });
});

describe("validateLimiterCoherence — synergie FatMax↔VLamax restreinte au jeûne/train-low (critère spécifique et défendable)", () => {
  it("[TEST OBLIGATOIRE] séances Z2/EF génériques SANS marqueur à jeun/train-low → FatMax reste 'absent' (0%), jamais fabriqué depuis VLamax", () => {
    const vr = runValidation(makePlanGenericOnly());
    const fatmax = vr.limiterCoverage.find((c) => c.key === "fatmax");
    const vlamax = vr.limiterCoverage.find((c) => c.key === "vlamax");
    expect(vlamax!.pct).toBeGreaterThanOrEqual(90); // VLamax bien couvert...
    expect(fatmax).toBeDefined();
    expect(fatmax!.hits).toBe(0); // ...mais FatMax n'hérite plus silencieusement de cette couverture
    expect(fatmax!.pct).toBe(0);
    expect(fatmax!.status).toBe("absent");
  });

  it("[TEST OBLIGATOIRE] séances explicitement à jeun/train-low → créditées à FatMax ; les Z2 génériques du même plan ne le sont pas (fatmax.hits < vlamax.hits, jamais une simple égalité artificielle)", () => {
    const vr = runValidation(makePlanMixed());
    const fatmax = vr.limiterCoverage.find((c) => c.key === "fatmax");
    const vlamax = vr.limiterCoverage.find((c) => c.key === "vlamax");
    expect(vlamax!.hits).toBe(9); // 5 à jeun + 4 Z2 générique, toutes assignées à VLamax
    expect(fatmax!.hits).toBe(5); // seulement les 5 séances à jeun/train-low
    expect(fatmax!.hits).toBeLessThan(vlamax!.hits);
    expect(fatmax!.status).toBe("ok");
  });

  it("sans FatMax parmi les limiteurs identifiés → aucune synergie appliquée (comportement inchangé)", () => {
    const vr = validatePlan(makePlanMixed(), "IRONMAN 70.3", undefined, undefined, undefined, ["vlamax", "ftp"]);
    expect(vr.limiterCoverage.find((c) => c.key === "fatmax")).toBeUndefined();
  });
});
