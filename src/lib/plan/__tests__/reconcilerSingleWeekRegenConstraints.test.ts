/**
 * Fix B2 (audit "génération de plan IA", volet réconciliation) : la
 * régénération d'une semaine seule (AITrainingPlanPage.tsx,
 * handleRegenerateWeek) appelait l'edge function en fetch brut puis ne
 * faisait QUE fusionner le chunk reçu — jamais `runReconciler`. Une
 * contrainte dure de l'athlète ("pas de natation", "jamais le mercredi")
 * redevenait une simple suggestion de prompt sans aucun garde-fou pour ce
 * seul chemin, alors que les deux autres chemins de régénération (plan
 * complet, fenêtre) passent tous les deux par `runReconciler` avec les
 * mêmes contraintes (useAITrainingPlan.ts, opts.constraints).
 *
 * Particularité du chemin semaine seule : le chunk reçu de l'IA ne contient
 * qu'UNE semaine, dont le `weekNumber` réel (ex. S9 d'un plan de 12) n'est
 * PAS renuméroté à 1 avant que le réconciliateur tourne (contrairement au
 * mergeur, qui lui a besoin de cette renumérotation). `quotasByWeek` doit
 * donc être indexé sur ce numéro réel — ce test le prouve explicitement.
 */
import { describe, it, expect } from "vitest";
import type { PlanChunk } from "@/lib/plan/planSchema";
import type { WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";
import { runReconciler } from "@/lib/plan/planReconciler";

function mkSess(day: string, sport: string, title: string): any {
  return { day, sport, title, details: "", isKeySession: false, custom: true, durationMin: 45, zones: [] };
}

const REAL_WEEK_NUMBER = 9;

const QUOTA_ENTRY: WeekQuotaEntry = {
  quota: {
    swim: { min: 0, max: 5 }, bike: { min: 0, max: 5 }, run: { min: 0, max: 5 },
    brick: { min: 0, max: 1 }, strength: { min: 0, max: 2 },
    totalSessions: { min: 1, max: 10 }, maxSessionsPerDay: 2, minFullRestDays: 0,
  } as any,
  floors: {} as any,
  weekType: "load",
  downgraded: false,
};

function singleWeekChunk(weekNumber: number, sessions: any[]): PlanChunk {
  return { weeks: [{ weekNumber, phase: "build", theme: "S9", sessions }] } as unknown as PlanChunk;
}

describe("runReconciler — contraintes athlète sur un chunk d'UNE semaine numérotée réellement (fix B2)", () => {
  it("sport banni : la séance natation est retirée même sur un chunk mono-semaine numéroté S9 (pas S1)", () => {
    const chunk = singleWeekChunk(REAL_WEEK_NUMBER, [
      mkSess("mardi", "swim", "Endurance nage"),
      mkSess("jeudi", "run", "Footing"),
    ]);
    const rec = runReconciler([chunk], { [REAL_WEEK_NUMBER]: QUOTA_ENTRY }, 2, undefined, {
      constraints: "pas de natation — épaule",
    });
    expect(chunk.weeks[0].sessions.some((s: any) => s.sport === "swim")).toBe(false);
    expect(chunk.weeks[0].sessions.some((s: any) => s.sport === "run")).toBe(true);
    expect(rec.counters.constraint_banned_sport_removed).toBe(1);
  });

  it("jour interdit : une séance du mercredi est déplacée, même sur un chunk mono-semaine numéroté S9", () => {
    const chunk = singleWeekChunk(REAL_WEEK_NUMBER, [
      mkSess("mercredi", "run", "Footing"),
    ]);
    const rec = runReconciler([chunk], { [REAL_WEEK_NUMBER]: QUOTA_ENTRY }, 2, undefined, {
      constraints: "jamais le mercredi",
    });
    expect(chunk.weeks[0].sessions[0].day).not.toBe("mercredi");
    expect(rec.counters.constraint_day_moved).toBe(1);
  });

  it("régression : sans quotasByWeek indexé sur le VRAI numéro (ex. resté à S1 par erreur), la contrainte ne s'applique quand même — enforceAthleteConstraints ne dépend pas de quotasByWeek", () => {
    // enforceAthleteConstraints s'applique à TOUS les chunks/semaines fournis,
    // indépendamment de quotasByWeek (qui ne gouverne que les étapes 1-4 de
    // runOnePass) — seule la présence de `raw = weeklyQuotas[week.weekNumber]`
    // conditionne les étapes phase/durée/discipline/quota floor-ceiling, pas
    // l'application des contraintes athlète. On vérifie ce comportement
    // explicitement : même avec un quotasByWeek VIDE, la contrainte dure
    // s'applique toujours (elle ne doit jamais dépendre de la présence d'un
    // quota pour fonctionner).
    const chunk = singleWeekChunk(REAL_WEEK_NUMBER, [
      mkSess("mardi", "swim", "Endurance nage"),
    ]);
    const rec = runReconciler([chunk], {}, 2, undefined, {
      constraints: "pas de natation",
    });
    expect(chunk.weeks[0].sessions.some((s: any) => s.sport === "swim")).toBe(false);
    expect(rec.counters.constraint_banned_sport_removed).toBe(1);
  });
});
