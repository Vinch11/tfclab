import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Audit scientifique P0 — F4 et F6 (voir AUDIT_SCIENTIFIQUE_P0.md).
 *
 * F4 : `isDeload = DELOAD_PATTERNS.test(themeText) || activeSessions.length <= 3`
 * (planValidator.ts:591) exempte automatiquement de la Règle #1 (ratio
 * polarisation low/mid/high) TOUTE semaine à ≤3 séances actives, même si son
 * thème ne contient AUCUN mot-clé de décharge et que son contenu réel est
 * 100% intense. Le seuil `<5` de validateWeeklyHardDayDensity (déjà testé
 * par planValidator.weeklyHardDayDensity.test.ts) ne peut physiquement pas
 * être le point d'exposition réel pour ce cas : avec ≤4 séances actives on
 * ne peut jamais atteindre les 6 jours durs nécessaires pour déclencher
 * "protectedDays<=1". Le vrai point d'exposition est la Règle #1
 * (validatePolarization), qui exempte via `wm.isDeload` sans jamais
 * regarder le contenu réel des séances restantes.
 *
 * F6 : validateWeeklyHardDayDensity borne sa recherche de streak à
 * `dayIndex` 0..6 DE LA SEMAINE COURANTE (déjà documenté comme limite
 * connue, non corrigée, dans le commentaire de la fonction) — un
 * enchaînement de jours durs qui commence en fin de semaine N et se
 * poursuit en début de semaine N+1 n'est jamais vu.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Course",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Chantier", phase = "build"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s) => makeSession({ weekNumber, weekTheme: theme, ...s })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return {
    title: "Plan TFCL™ — 10K Test Athlete — 2 semaines",
    phases: [],
    weeks,
    totalWeeks: weeks.length,
  };
}

const HARD = (day: number, extra: Partial<ParsedSession> = {}) => ({
  dayIndex: day, dayName: DAYS[day], title: "Séance dure", details: "40min Z5 seuil haut", ...extra,
});
const EASY = (day: number) => ({ dayIndex: day, dayName: DAYS[day], title: "Séance facile", details: "45min Z1 footing facile" });

describe("F4 — semaine courte (≤3 séances), aucun thème de décharge, 100% intense", () => {
  // Plan de 6 semaines réaliste (nécessaire pour que `scheduledWeekType`
  // — calculé depuis weekNumber/totalWeeks réels — classe correctement la
  // semaine 3 comme "load" et non comme un faux "taper"/"recovery" dû à un
  // decalage weekNumber/totalWeeks artificiel).
  const filler = (n: number) => makeWeek(n, [EASY(0), EASY(2), EASY(4)], "Base", "base");

  it("3 séances toutes Z5/Z6, thème « Chantier » (aucun mot-clé décharge) → la Règle #1 devrait s'appliquer", () => {
    const week3 = makeWeek(3, [
      HARD(1, { title: "Intervalles VO2max 5x3min", details: "Z6" }),
      HARD(3, { title: "Seuil 2x20min", details: "Z5" }),
      HARD(5, { title: "Over-under 4x8min", details: "Z5 intervalles" }),
    ], "Chantier spécifique");

    const result = validatePlan(makePlan([filler(1), filler(2), week3, filler(4), filler(5), filler(6)]));

    const polarIssue = result.issues.find(
      (i) => i.rule === "polarization" && i.week === 3 && /non polarisée|marginale/i.test(i.message),
    );
    expect(polarIssue).toBeDefined();
  });

  it("référence : la même semaine à 6 séances (non-exemptée) est bien détectée aujourd'hui", () => {
    const week3 = makeWeek(3, [
      HARD(0, { title: "Intervalles VO2max 5x3min", details: "Z6" }),
      HARD(1, { title: "Seuil 2x20min", details: "Z5" }),
      HARD(2, { title: "Over-under 4x8min", details: "Z5 intervalles" }),
      HARD(3, { title: "VMA 30/30", details: "Z6" }),
      HARD(4, { title: "Fartlek seuil", details: "Z5 intervalles" }),
      HARD(5, { title: "Sprint côtes 10x30s", details: "Z7 force" }),
    ], "Chantier spécifique");
    const result = validatePlan(makePlan([filler(1), filler(2), week3, filler(4), filler(5), filler(6)]));
    const polarIssue = result.issues.find((i) => i.rule === "polarization" && i.week === 3);
    expect(polarIssue).toBeDefined();
  });

  it("une VRAIE semaine de décharge (3 séances faciles) reste exemptée — pas de faux positif", () => {
    const week3 = makeWeek(3, [EASY(1), EASY(3), EASY(5)], "Décharge");
    const result = validatePlan(makePlan([filler(1), filler(2), week3, filler(4), filler(5), filler(6)]));
    const polarIssue = result.issues.find((i) => i.rule === "polarization" && i.week === 3);
    expect(polarIssue).toBeUndefined();
  });
});

describe("F6 — enchaînement de jours durs à cheval sur deux semaines", () => {
  it("Sam(S3)+Dim(S3)+Lun(S4)+Mar(S4) = 4 jours durs consécutifs sur le calendrier réel doit être détecté", () => {
    // Chaque semaine prise ISOLÉMENT ne contient que 2 jours durs
    // consécutifs (sous MAX_CONSECUTIVE_HARD_DAYS=3) — mais sur le calendrier
    // réel, Sam(S3)→Dim(S3)→Lun(S4)→Mar(S4) forme une séquence ININTERROMPUE
    // de 4 jours durs. L'implémentation actuelle borne sa recherche à
    // dayIndex 0..6 DE LA SEMAINE COURANTE et ne peut donc jamais la voir.
    const week3 = makeWeek(3, [EASY(0), EASY(1), EASY(2), EASY(3), EASY(4), HARD(5), HARD(6)], "Chantier");
    const week4 = makeWeek(4, [HARD(0), HARD(1), EASY(2), EASY(3), EASY(4), EASY(5), EASY(6)], "Chantier");

    const result = validatePlan(makePlan([week3, week4]));

    // Comportement attendu après correction (F6) : une séquence réelle de 4
    // jours durs consécutifs à cheval sur S3/S4 doit être signalée — qu'elle
    // porte le numéro de la semaine où elle débute (S3) ou celui où elle se
    // termine (S4) n'est pas fixé ici, seule l'existence du signal compte.
    const streakIssue = result.issues.find(
      (i) => i.rule === "polarization" && (i.week === 3 || i.week === 4) && /consécutifs/i.test(i.message),
    );
    // Échoue aujourd'hui : aucune des deux semaines ne dépasse individuellement
    // le seuil de 3 jours consécutifs, donc rien n'est détecté.
    expect(streakIssue).toBeDefined();
  });
});
