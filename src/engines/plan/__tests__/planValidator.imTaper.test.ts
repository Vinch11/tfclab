import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #5 : tests réels
 * du comportement d'affûtage Ironman sur le chemin RÉELLEMENT consommé par
 * les plans générés (`validatePlan`/`planValidator.ts`), par opposition à
 * `annotationEngineV2.taperIM.test.ts` (existant) qui ne teste qu'une
 * fonctionnalité d'annotation de modèles DOCX, jamais utilisée par
 * `useAITrainingPlan.ts` (le pipeline de génération réel).
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "base", dayName: "Dimanche", dayIndex: 6,
    sport: "Course", title: "Séance", details: "", isRest: false, ...overrides,
  };
}
function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard", phase = "base"): ParsedWeek {
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
  return { title: "Plan TFCL™ — IM Test Athlete", phases: [], weeks, totalWeeks: weeks.length };
}

/** Format "Xh" / "XhYY" — `parseSessionDurationMin` plafonne un token "NNNmin"
 *  à 300 (sinon ignoré) ; les sorties longues vélo réalistes en IM (jusqu'à
 *  ~6h) doivent donc être écrites en heures, comme un coach le ferait. */
function formatMin(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest === 0 ? `${h}h` : `${h}h${String(rest).padStart(2, "0")}`;
}

/** Semaine IM standard : natation + vélo (sortie longue + séance clé) + course (sortie longue + séance clé). */
function imWeek(weekNumber: number, bikeLongMin: number, runLongMin: number, phase: string, theme: string): ParsedWeek {
  return makeWeek(weekNumber, [
    { sport: "Natation", title: "Technique", details: "45min" },
    { sport: "Vélo", title: "Sortie longue vélo", details: formatMin(bikeLongMin) },
    { sport: "Vélo", title: "Sweet Spot", details: "60min Séance clé 🔑" },
    { sport: "Course", title: "Sortie longue course", details: formatMin(runLongMin) },
    { sport: "Course", title: "Seuil", details: "40min Séance clé 🔑" },
  ], theme, phase);
}
function raceWeek(weekNumber: number): ParsedWeek {
  return makeWeek(weekNumber, [
    { sport: "Natation", title: "Activation courte", details: "20min" },
    { sport: "Vélo", title: "Activation", details: "20min" },
    { sport: "Course", title: "🏁 COURSE OBJECTIF", details: "Jour J — Ironman" },
  ], "Jour J", "taper");
}

describe("validatePlan — affûtage Ironman réel (3 semaines, cf. TAPER_WEEKS_BY_OBJECTIVE)", () => {
  it("un plan IM de 8 semaines avec un affûtage correctement réduit (3 dernières semaines) n'est jamais signalé 'Volume en baisse'", () => {
    // S1-S4 : montée en charge normale. S5-S7 : affûtage réel (volume en
    // baisse progressive, exactement ce qu'un affûtage DOIT faire) — mais
    // S5/S6 restent étiquetées "peak"/"Spécifique" (bug réel documenté,
    // taperVolumeOverride.ts commentaire "C1" : seule la dernière semaine de
    // taper est parfois correctement relabellisée "taper" par la
    // génération). `inferWeekType` calcule S5-S6-S7 = taper par POSITION,
    // indépendamment de ce mauvais étiquetage de phase.
    const weeks = [
      imWeek(1, 190, 94, "build", "Build"),
      imWeek(2, 200, 98, "build", "Build"),
      imWeek(3, 210, 102, "build", "Build"),
      imWeek(4, 220, 106, "build", "Build"), // S4 : multiple de 4 → recovery par position, hors de cause ici
      imWeek(5, 150, 70, "peak", "Spécifique"),   // affûtage réel, mal étiqueté
      imWeek(6, 100, 50, "peak", "Spécifique"),   // affûtage réel, mal étiqueté
      imWeek(7, 60, 30, "taper", "Affûtage"),      // affûtage réel, bien étiqueté
      raceWeek(8),
    ];
    const result = validatePlan(makePlan(weeks), "IM");
    const volumeDownIssue = result.issues.find(i => i.rule === "progression" && /Volume en baisse/i.test(i.message));
    expect(volumeDownIssue).toBeUndefined();
  });

  it("confirme que S5-S6-S7 sont bien calculées comme la fenêtre de taper IM (3 semaines) pour ce plan de 8 semaines", () => {
    const weeks = [
      imWeek(1, 190, 94, "build", "Build"),
      imWeek(2, 200, 98, "build", "Build"),
      imWeek(3, 210, 102, "build", "Build"),
      imWeek(4, 220, 106, "build", "Build"),
      imWeek(5, 150, 70, "peak", "Spécifique"),
      imWeek(6, 100, 50, "peak", "Spécifique"),
      imWeek(7, 60, 30, "taper", "Affûtage"),
      raceWeek(8),
    ];
    const result = validatePlan(makePlan(weeks), "IM");
    const typesByWeek = new Map(result.weekMetrics.map(m => [m.weekNumber, m.scheduledWeekType]));
    expect(typesByWeek.get(5)).toBe("taper");
    expect(typesByWeek.get(6)).toBe("taper");
    expect(typesByWeek.get(7)).toBe("taper");
    expect(typesByWeek.get(8)).toBe("race");
  });

  it("une sortie longue vélo/course qui BAISSE pendant l'affûtage n'est jamais signalée comme un 'saut' dangereux (la règle ne flague que les hausses)", () => {
    const weeks = [
      imWeek(1, 190, 94, "build", "Build"),
      imWeek(2, 200, 98, "build", "Build"),
      imWeek(3, 210, 102, "build", "Build"),
      imWeek(4, 220, 106, "build", "Build"),
      imWeek(5, 150, 70, "peak", "Spécifique"),
      imWeek(6, 100, 50, "peak", "Spécifique"), // -33% vs S5 : baisse réelle d'affûtage
      imWeek(7, 60, 30, "taper", "Affûtage"),    // -40% vs S6
      raceWeek(8),
    ];
    const result = validatePlan(makePlan(weeks), "IM");
    const longSessionIssues = result.issues.filter(i => i.rule === "progression" && /sortie longue/i.test(i.message));
    expect(longSessionIssues).toHaveLength(0);
  });

  it("un vrai saut dangereux de sortie longue vélo PENDANT la phase de charge (pas l'affûtage) reste détecté — le fix ne désactive pas la règle elle-même", () => {
    const weeks = [
      imWeek(1, 140, 94, "build", "Build"),
      imWeek(2, 150, 98, "build", "Build"),
      imWeek(3, 240, 102, "build", "Build"), // +60% vs S2 : saut dangereux, hors affûtage
      imWeek(4, 220, 106, "build", "Build"),
      imWeek(5, 150, 70, "peak", "Spécifique"),
      imWeek(6, 100, 50, "peak", "Spécifique"),
      imWeek(7, 60, 30, "taper", "Affûtage"),
      raceWeek(8),
    ];
    const result = validatePlan(makePlan(weeks), "IM");
    const bikeJump = result.issues.find(i => i.rule === "progression" && i.week === 3 && /sortie longue Vélo/i.test(i.message));
    expect(bikeJump).toBeDefined();
  });
});
