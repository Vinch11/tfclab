import { describe, it, expect } from "vitest";
import { buildWorkoutCatalog, type CatalogEntry } from "@/lib/workoutCatalogBuilder";
import { validatePlan } from "@/engines/plan/planValidator";
import { HIGH_IMPACT_SESSION_PATTERNS } from "@/lib/limiterSessionPatterns";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Banc de test "profil à risque CRITIQUE" (validation PR#25) :
 *  A. le malus F-INJ ne doit pas VIDER le catalogue (profondeur + mix sport)
 *  B. le validateur doit bloquer (issues severity=error → dialogue de sauvegarde)
 *     quand le plan garde >2 séances à impact élevé/semaine, et laisser passer
 *     un plan prudent.
 */

const OBJECTIVES = ["marathon", "semi", "70.3", "ironman", "trail"];

function isRunEntry(e: CatalogEntry) { return /course|run|cap|trail/i.test(e.sport); }
function isBikeEntry(e: CatalogEntry) { return /v[ée]lo|bike|cyclisme|home ?trainer/i.test(e.sport); }
function highImpactCount(catalog: CatalogEntry[]) {
  return catalog.filter(e => {
    const text = `${e.id} ${e.structure} ${e.variants ?? ""}`.toLowerCase();
    if (isRunEntry(e)) return HIGH_IMPACT_SESSION_PATTERNS.run_long.test(text) || HIGH_IMPACT_SESSION_PATTERNS.run_intensity.test(text);
    if (isBikeEntry(e)) return HIGH_IMPACT_SESSION_PATTERNS.bike_force.test(text);
    return false;
  }).length;
}

describe("A. Catalogue sous risque CRITIQUE run+vélo", () => {
  it("garde la même profondeur et un mix run/vélo non nul sur tous les objectifs", () => {
    const report: string[] = [];
    for (const obj of OBJECTIVES) {
      for (const [ws, we] of [[1, 6], [7, 12], [13, 16]] as const) {
        const base = buildWorkoutCatalog(obj, ws, we, 16, { maxItems: 40 });
        const crit = buildWorkoutCatalog(obj, ws, we, 16, {
          maxItems: 40,
          injuryRisk: { run: "CRITIQUE", bike: "CRITIQUE" },
        });
        report.push(
          `${obj} S${ws}-${we} : total ${base.length}→${crit.length} | run ${base.filter(isRunEntry).length}→${crit.filter(isRunEntry).length}` +
          ` | vélo ${base.filter(isBikeEntry).length}→${crit.filter(isBikeEntry).length}` +
          ` | impact élevé ${highImpactCount(base)}→${highImpactCount(crit)}`,
        );

        // Profondeur préservée : le malus est un re-classement, pas un filtre.
        expect(crit.length).toBe(base.length);
        if (base.filter(isRunEntry).length > 0) expect(crit.filter(isRunEntry).length).toBeGreaterThan(0);
        if (base.filter(isBikeEntry).length > 0) expect(crit.filter(isBikeEntry).length).toBeGreaterThan(0);
        // Effet réel : jamais plus de séances à impact élevé qu'avant.
        expect(highImpactCount(crit)).toBeLessThanOrEqual(highImpactCount(base));
      }
    }
    console.log("\n[BENCH CATALOGUE CRITIQUE]\n" + report.join("\n"));
  });
});

// ── B. Blocage de la sauvegarde ───────────────────────────────────────────────

function session(over: Partial<ParsedSession>): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "T", phase: "Construction", dayName: "Lundi", dayIndex: 0,
    sport: "Course", title: "Séance", details: "", isRest: false, ...over,
  };
}

function makePlan(runLongPerWeek: number): ParsedPlan {
  const sessions: ParsedSession[] = [];
  for (let i = 0; i < runLongPerWeek; i++) {
    sessions.push(session({ dayIndex: i, title: "Sortie longue CAP 1h45", details: "Sortie longue en Z2, 21 km" }));
  }
  sessions.push(session({ dayIndex: 5, sport: "Natation", title: "Technique", details: "Éducatifs 1500m" }));
  return {
    title: "Plan test",
    phases: [{ name: "Construction", weeks: "1-2" }],
    totalWeeks: 2,
    weeks: [1, 2].map(weekNumber => ({
      weekNumber, theme: "T", phase: "Construction",
      sessions: sessions.map(s => ({ ...s, weekNumber })),
    })),
  };
}

const CRITIQUE = { run: { level: "CRITIQUE" }, bike: { level: "MODERE" } };

describe("B. Validateur — blocage sauvegarde au niveau CRITIQUE", () => {
  it("bloque un plan avec 3 sorties longues/semaine (error → dialogue critique)", () => {
    const vr = validatePlan(makePlan(3), "marathon", undefined, undefined, undefined, undefined, undefined, undefined, undefined, CRITIQUE);
    const errs = vr.issues.filter(i => i.rule === "injury_risk_compliance" && i.severity === "error");
    console.log("[BENCH VALIDATOR] 3/sem →", errs.length, "erreurs |", vr.summary.overallComment);
    expect(errs.length).toBe(2); // une par semaine
    expect(vr.issues.filter(i => i.severity === "error").length).toBeGreaterThan(0);
  });

  it("laisse passer un plan prudent (2 sorties longues/semaine)", () => {
    const vr = validatePlan(makePlan(2), "marathon", undefined, undefined, undefined, undefined, undefined, undefined, undefined, CRITIQUE);
    expect(vr.issues.filter(i => i.rule === "injury_risk_compliance").length).toBe(0);
  });

  it("n'applique rien si le risque est ÉLEVÉ (vigilance, pas blocage)", () => {
    const vr = validatePlan(makePlan(4), "marathon", undefined, undefined, undefined, undefined, undefined, undefined, undefined, { run: { level: "ELEVE" } });
    expect(vr.issues.filter(i => i.rule === "injury_risk_compliance").length).toBe(0);
  });
});
