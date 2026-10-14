import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { applyReconciler } from "./jsonPlanHandler.ts";

/**
 * Audit "B-5K-BEGINNER round 3" (JSON réel 2026-10-14, consigne coach) :
 * `rest_floor_breached` se déclenchait sur 11/12 semaines du run réel, y
 * compris des semaines ayant 2-3 jours de repos réels (Lundi/Mardi/Jeudi
 * explicitement marqués `sport:"rest"`). Cause racine : `countEmptyDays`
 * comptait TOUTE séance (y compris les placeholders `sport==="rest"` qu'une
 * semaine valide porte systématiquement pour chaque jour sans entraînement)
 * — un jour de repos n'avait donc JAMAIS un compte de 0, et la comparaison
 * `finalEmptyDays < minRestDays` se déclenchait quasi systématiquement,
 * sans rapport avec le repos effectif du plan livré.
 */

function mkSess(day: string, sport: string, title: string): any {
  return { day, sport, title, details: "", catalogId: null, custom: true, durationMin: sport === "rest" ? 0 : 40, zones: [] };
}
function mkChunk(weekNumber: number, sessions: any[]): any {
  return { weeks: [{ weekNumber, phase: "build", theme: "Test", sessions }] };
}

function makeQuota(minFullRestDays: number) {
  return {
    quota: {
      swim: { min: 0, max: 0 }, bike: { min: 0, max: 0 }, run: { min: 0, max: 5 },
      brick: { min: 0, max: 0 }, strength: { min: 0, max: 2 },
      totalSessions: { min: 0, max: 10 }, maxSessionsPerDay: 2, minFullRestDays,
    },
    weekType: "load",
  };
}

Deno.test("applyReconciler — rest_floor_breached n'est plus un faux positif quand de vrais jours de repos existent", () => {
  // 4 séances actives (run×3 + strength×1) + 3 jours de repos RÉELS
  // (Lundi/Mardi/Jeudi) — reproduit exactement le profil B-5K-BEGINNER
  // (3 séances/semaine + 1 renfo, minFullRestDays=1).
  const sessions = [
    mkSess("lundi", "rest", "Repos"),
    mkSess("mardi", "rest", "Repos"),
    mkSess("mercredi", "run", "Course clé"),
    mkSess("jeudi", "rest", "Repos"),
    mkSess("vendredi", "run", "Endurance"),
    mkSess("samedi", "strength", "Renforcement"),
    mkSess("dimanche", "run", "Sortie longue"),
  ];
  const chunk = mkChunk(5, sessions);
  const { repairs, traces } = applyReconciler([chunk], { 5: makeQuota(1) }, [null]);

  const breach = repairs.find((r: any) => r.code === "rest_floor_breached");
  assertEquals(breach, undefined, "3 vrais jours de repos ne doivent JAMAIS déclencher rest_floor_breached avec minFullRestDays=1");
  assert(!traces.some((l) => l.includes("rest_floor_breached")), "aucune trace rest_floor_breached attendue");
});

Deno.test("applyReconciler — rest_floor_breached se déclenche toujours sur une vraie violation (0 jour de repos)", () => {
  // 7 jours, TOUS actifs (aucune entrée "rest") — violation réelle du
  // plancher minFullRestDays=1, doit rester détectée après le correctif.
  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const sessions = days.map((d) => mkSess(d, "run", `Séance ${d}`));
  const chunk = mkChunk(5, sessions);
  const { repairs, traces } = applyReconciler([chunk], { 5: makeQuota(1) }, [null]);

  const breach = repairs.find((r: any) => r.code === "rest_floor_breached");
  assert(breach !== undefined, "0 jour de repos réel doit toujours déclencher rest_floor_breached");
  assert(traces.some((l) => l.includes("rest_floor_breached") && l.includes("empty=0")));
});

Deno.test("applyReconciler — rest_floor_breached reste correct avec exactement minFullRestDays jours de repos (cas limite)", () => {
  // Exactement 1 jour de repos réel pour minFullRestDays=1 — à la limite,
  // ne doit PAS être signalé comme une violation (1 < 1 est faux).
  const sessions = [
    mkSess("lundi", "rest", "Repos"),
    mkSess("mardi", "run", "Course clé"),
    mkSess("mercredi", "run", "Endurance"),
    mkSess("jeudi", "strength", "Renforcement"),
    mkSess("vendredi", "run", "Tempo"),
    mkSess("samedi", "run", "Fartlek"),
    mkSess("dimanche", "run", "Sortie longue"),
  ];
  const chunk = mkChunk(5, sessions);
  const { repairs } = applyReconciler([chunk], { 5: makeQuota(1) }, [null]);

  const breach = repairs.find((r: any) => r.code === "rest_floor_breached");
  assertEquals(breach, undefined, "exactement minFullRestDays jours de repos réels ne doit pas être signalé comme une violation");
});
