import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Audit "fiabilité du validateur" (coach, lot Performance Validation Lab).
 *
 * Ce fichier documentait à l'origine 4 faux positifs/négatifs CONFIRMÉS
 * (règles textuelles de `validatePlan` qui ignoraient des données
 * structurées déjà disponibles, ou géraient mal la négation). Les 4
 * corrections demandées ont été appliquées dans `planValidator.ts` :
 *   F1 — phase_coherence (taper) ne confond plus "%VMA/%VO2max/%FTP"
 *        (référence d'allure) avec une vraie séance de ce type.
 *   F2 — classifySessionIntensity/clauseTier ne retombent plus sur "low"
 *        par défaut : un nouvel état "unknown" (SessionTier) est signalé
 *        explicitement par Rule #1 plutôt qu'absorbé silencieusement.
 *   F3 — prohibition_compliance distingue prescription/interdiction/simple
 *        mention au niveau de la CLAUSE (vocabulaire de négation élargi),
 *        plus seulement 3 tournures adjacentes au mot-clé.
 *   F4 — lorang_categories préfère `session.zones` (structuré, fiable) à
 *        l'ancien mapping par préfixe-lettre de catalogId, dont l'audit a
 *        confirmé qu'il est statistiquement FAUX sur le catalogue réel
 *        (0/50 fiches "cat:A" n'ont de zone haute — "A" y encode une
 *        priorité/nécessité, pas la catégorie Lorang).
 *
 * Chaque bloc ci-dessous garde le test de repro original (adapté pour
 * vérifier le comportement CORRIGÉ) + une référence positive + un cas
 * négatif/ambigu supplémentaire, pour ne pas perdre la couverture.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "taper", dayName: "Lundi", dayIndex: 0,
    sport: "Course", title: "Séance", details: "", isRest: false,
    ...overrides,
  };
}
function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Affûtage", phase = "taper"): ParsedWeek {
  return { weekNumber, theme, phase, sessions: sessions.map((s) => makeSession({ weekNumber, weekTheme: theme, ...s })) };
}
function makePlan(weeks: ParsedWeek[], phases: ParsedPlan["phases"] = [
  { name: "Fondation", weeks: "S1-S4" }, { name: "Affûtage", weeks: "S5" },
]): ParsedPlan {
  return { title: "Plan TFCL™ — 10K Test Athlete — 5 semaines", phases, weeks, totalWeeks: weeks.length };
}

describe("F1 CORRIGÉ — phase_coherence (taper) distingue référence d'allure '%VMA' et vraie séance VMA", () => {
  it("positif : 'Allure 65-75% VMA, EF facile' en taper N'EST PLUS flaguée (VMA = unité de référence)", () => {
    // Pattern exact injecté par `validatePlanPaces` (Option A zone-tag, déjà
    // en prod) : "[Z2 · endurance 65-75% VMA]" — avant le correctif, le seul
    // mot "VMA" déclenchait `PHASE_SESSION_SIGNATURES[5].forbidden` malgré
    // un contenu réel de taper exemplaire (35min Z2 facile).
    const week = makeWeek(5, [
      { title: "EF allégée", details: "[Z2 · endurance 65-75% VMA] 35min facile, dernière semaine avant course" },
    ]);
    const plan = makePlan([
      makeWeek(1, [{ title: "EF", details: "45min Z2" }], "Fondation", "base"),
      week,
    ]);
    const result = validatePlan(plan, "10K");
    const issue = result.issues.find((i) => i.rule === "phase_coherence" && i.week === 5);
    expect(issue).toBeUndefined();
  });

  it("référence : la même séance sans le tag '% VMA' n'est toujours pas flaguée (comportement inchangé)", () => {
    const week = makeWeek(5, [
      { title: "EF allégée", details: "35min Z2 facile, dernière semaine avant course" },
    ]);
    const plan = makePlan([
      makeWeek(1, [{ title: "EF", details: "45min Z2" }], "Fondation", "base"),
      week,
    ]);
    const result = validatePlan(plan, "10K");
    const issue = result.issues.find((i) => i.rule === "phase_coherence" && i.week === 5);
    expect(issue).toBeUndefined();
  });

  it("négatif : une VRAIE séance VMA (sans référence d'allure en %) en taper reste flaguée CRITIQUE — le correctif ne supprime pas la règle", () => {
    const week = makeWeek(5, [
      { title: "Fractionné VMA", details: "8x400m à VMA, récup 1'30 — dernière semaine avant course" },
    ]);
    const plan = makePlan([
      makeWeek(1, [{ title: "EF", details: "45min Z2" }], "Fondation", "base"),
      week,
    ]);
    const result = validatePlan(plan, "10K");
    const issue = result.issues.find((i) => i.rule === "phase_coherence" && i.week === 5);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
  });

  it("ambigu : une référence d'allure '%VO2max' CÔTOYANT une vraie mention de fractionné dans la même séance reste flaguée — le contenu réel prime", () => {
    // La référence d'allure en % est retirée du texte avant le test, mais
    // "fractionné" reste un marqueur de contenu réel distinct, non retiré.
    const week = makeWeek(5, [
      { title: "Fractionné court", details: "[Z5 · 90-95% VO2max] 6x2min fractionné, dernière semaine avant course" },
    ]);
    const plan = makePlan([
      makeWeek(1, [{ title: "EF", details: "45min Z2" }], "Fondation", "base"),
      week,
    ]);
    const result = validatePlan(plan, "10K");
    const issue = result.issues.find((i) => i.rule === "phase_coherence" && i.week === 5);
    expect(issue).toBeDefined();
  });
});

describe("F2 CORRIGÉ — classifySessionIntensity ne retombe plus sur 'low' par défaut : 'unknown' explicite", () => {
  it("négatif/ambigu : une séance quasi-maximale décrite sans mot-clé reconnu n'est plus silencieusement comptée 'low' — signalée explicitement comme non classifiable", () => {
    // Même séance qu'avant le correctif (effort quasi-maximal, répété, sans
    // aucun mot-clé de HIGH_INTENSITY_PATTERNS). Avant : angle mort total
    // (aucune issue). Après : Rule #1 signale explicitement le temps non
    // classifiable au lieu de l'absorber dans "low" comme conforme.
    const week = makeWeek(1, [
      { title: "Travail spécifique", details: "50 minutes à l'intensité la plus élevée soutenable, format répété", phase: "build" },
      { title: "Travail spécifique 2", details: "45 minutes à l'intensité la plus élevée soutenable, format répété", phase: "build" },
      { title: "Travail spécifique 3", details: "40 minutes à l'intensité la plus élevée soutenable, format répété", phase: "build" },
    ], "Chantier", "build");
    const plan = makePlan([week], [{ name: "Chantier", weeks: "S1" }]);
    const result = validatePlan(plan, "10K");
    // Toujours pas de faux positif "error" de polarisation (on ne prétend
    // pas savoir que c'est non polarisé — seulement qu'on ne sait pas).
    const polarError = result.issues.find((i) => i.rule === "polarization" && i.severity === "error");
    expect(polarError).toBeUndefined();
    // Mais le temps non classifiable est désormais signalé explicitement.
    const unknownWarning = result.issues.find(
      (i) => i.rule === "polarization" && i.severity === "warning" && /n'a pas pu être classé/.test(i.message)
    );
    expect(unknownWarning).toBeDefined();
  });

  it("positif : une séance décrite avec un mot-clé low reconnu (ex. 'récupération') reste correctement classée low, sans avertissement 'non classifiable'", () => {
    const week = makeWeek(1, [
      { title: "EF", details: "45min Z2 récupération active", phase: "build" },
      { title: "EF 2", details: "50min Z2 footing facile", phase: "build" },
      { title: "EF 3", details: "40min Z2 endurance fondamentale", phase: "build" },
    ], "Chantier", "build");
    const plan = makePlan([week], [{ name: "Chantier", weeks: "S1" }]);
    const result = validatePlan(plan, "10K");
    const unknownWarning = result.issues.find(
      (i) => i.rule === "polarization" && /n'a pas pu être classé/.test(i.message)
    );
    expect(unknownWarning).toBeUndefined();
  });

  it("positif (données structurées) : une séance SANS mot-clé texte mais avec `zones: ['Z2']` structuré est correctement classée low via les zones, sans avertissement", () => {
    const week = makeWeek(1, [
      { title: "Travail spécifique", details: "50 minutes, format continu", zones: ["Z2"], phase: "build" },
      { title: "Travail spécifique 2", details: "45 minutes, format continu", zones: ["Z2"], phase: "build" },
      { title: "Travail spécifique 3", details: "40 minutes, format continu", zones: ["Z2"], phase: "build" },
    ], "Chantier", "build");
    const plan = makePlan([week], [{ name: "Chantier", weeks: "S1" }]);
    const result = validatePlan(plan, "10K");
    const unknownWarning = result.issues.find(
      (i) => i.rule === "polarization" && /n'a pas pu être classé/.test(i.message)
    );
    expect(unknownWarning).toBeUndefined();
  });
});

describe("F3 CORRIGÉ — prohibition_compliance distingue prescription/interdiction/simple mention (clause, vocabulaire élargi)", () => {
  it("positif/ambigu : 'Jamais de sprint cette semaine, privilégier l'endurance' N'EST PLUS flaguée (négation élargie, plus seulement 'pas de'/'sans'/'aucun(e)')", () => {
    const week = makeWeek(1, [
      { title: "EF", details: "Jamais de sprint cette semaine, privilégier l'endurance fondamentale.", phase: "base" },
    ], "Fondation", "base");
    const plan = makePlan([week], [{ name: "Fondation", weeks: "S1" }]);
    const result = validatePlan(plan, "10K", ["Sprint Ban"]);
    const issue = result.issues.find((i) => i.rule === "prohibition_compliance" && i.week === 1);
    expect(issue).toBeUndefined();
  });

  it("référence : 'Pas de sprint cette semaine' (déjà couvert avant) n'est toujours pas flaguée", () => {
    const week = makeWeek(1, [
      { title: "EF", details: "Pas de sprint cette semaine, privilégier l'endurance fondamentale.", phase: "base" },
    ], "Fondation", "base");
    const plan = makePlan([week], [{ name: "Fondation", weeks: "S1" }]);
    const result = validatePlan(plan, "10K", ["Sprint Ban"]);
    const issue = result.issues.find((i) => i.rule === "prohibition_compliance" && i.week === 1);
    expect(issue).toBeUndefined();
  });

  it("ambigu : simple rappel du nom de l'interdiction ('Sprint Ban actif cette semaine') n'est pas une prescription — pas flaguée", () => {
    const week = makeWeek(1, [
      { title: "EF", details: "Rappel : Sprint Ban actif cette semaine, séance 100% endurance.", phase: "base" },
    ], "Fondation", "base");
    const plan = makePlan([week], [{ name: "Fondation", weeks: "S1" }]);
    const result = validatePlan(plan, "10K", ["Sprint Ban"]);
    const issue = result.issues.find((i) => i.rule === "prohibition_compliance" && i.week === 1);
    expect(issue).toBeUndefined();
  });

  it("négatif : une VRAIE prescription de sprint (sans négation) reste flaguée — le correctif ne supprime pas la détection des violations réelles", () => {
    const week = makeWeek(1, [
      { title: "Sprint", details: "10x15s sprint all-out, récup 2min.", phase: "base" },
    ], "Fondation", "base");
    const plan = makePlan([week], [{ name: "Fondation", weeks: "S1" }]);
    const result = validatePlan(plan, "10K", ["Sprint Ban"]);
    const issue = result.issues.find((i) => i.rule === "prohibition_compliance" && i.week === 1);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
  });

  it("négatif (clause distincte) : une négation sur une AUTRE clause de la même séance ne couvre pas une prescription de sprint dans une clause différente", () => {
    const week = makeWeek(1, [
      { title: "Séance mixte", details: "Jamais de plyo explosive en fin de séance. 10x15s sprint all-out, récup 2min.", phase: "base" },
    ], "Fondation", "base");
    const plan = makePlan([week], [{ name: "Fondation", weeks: "S1" }]);
    const result = validatePlan(plan, "10K", ["Sprint Ban"]);
    const issue = result.issues.find((i) => i.rule === "prohibition_compliance" && i.week === 1);
    // La clause "10x15s sprint all-out, récup 2min" ne contient aucune
    // négation : elle reste une prescription réelle, malgré la négation
    // présente dans la clause précédente.
    expect(issue).toBeDefined();
  });
});

describe("F4 CORRIGÉ — lorang_categories préfère `zones` structuré (fiable) à l'ancien mapping par préfixe-lettre de catalogId (confirmé incorrect)", () => {
  it("positif : des séances avec catalogId structuré renseigné sont désormais correctement comptées 'tagged' (traçabilité)", () => {
    const sessionsTpl: Partial<ParsedSession>[] = [
      { title: "Seuil", details: "2x15min Z4", catalogId: "B_RUN_SEUIL_2X15", zones: ["Z4"], phase: "base" },
      { title: "EF", details: "45min Z2", catalogId: "A_RUN_EF_45", zones: ["Z2"], phase: "base" },
      { title: "EF + ouvreurs", details: "40min Z2 + 4x20s", catalogId: "C_RUN_EF_STRIDES", zones: ["Z2"], phase: "base" },
      { title: "SL", details: "75min Z2", catalogId: "A_RUN_SL_75", zones: ["Z2"], phase: "base" },
    ];
    const weeks = [1, 2, 3].map((n) => makeWeek(n, sessionsTpl, "Fondation", "base"));
    const plan = makePlan(weeks, [{ name: "Fondation", weeks: "S1-S3" }]);
    const result = validatePlan(plan, "10K");
    expect(result.lorangCategories.taggedPct).toBe(100);
    const taggedIssue = result.issues.find((i) => i.rule === "lorang_categories" && /0% des séances/.test(i.message));
    expect(taggedIssue).toBeUndefined();
  });

  it("négatif/ambigu CRITIQUE : les zones structurées priment sur le préfixe-lettre du catalogId, qui ne correspond PAS à la catégorie Lorang sur le catalogue réel", () => {
    // Vérifié sur `workoutLibrary.ts` (audit) : "A_RUN_Z2_EASY" (catalogId
    // préfixe "A") a `zones: ["Z1","Z2"]` — un Lorang C (endurance), jamais
    // un Lorang A (HIT). Si le validateur se fiait au préfixe-lettre en
    // priorité, cette séance serait comptée à tort "A" (0/50 fiches "cat:A"
    // du catalogue réel n'ont de zone haute). Avec `zones` prioritaire,
    // elle doit être comptée "C".
    const sessionsTpl: Partial<ParsedSession>[] = [
      { title: "EF", details: "45min facile, technique et relâchement", catalogId: "A_RUN_Z2_EASY", zones: ["Z1", "Z2"], phase: "base" },
    ];
    const weeks = [1, 2, 3, 4].map((n) => makeWeek(n, sessionsTpl, "Fondation", "base"));
    const plan = makePlan(weeks, [{ name: "Fondation", weeks: "S1-S4" }]);
    const result = validatePlan(plan, "10K");
    expect(result.lorangCategories.CPct).toBe(100);
    expect(result.lorangCategories.APct).toBe(0);
    // Classée via les zones (fiable) : pas de séance en confiance faible.
    expect(result.lorangCategories.uncertainTagging).toBe(0);
  });

  it("référence (dernier recours préservé) : sans zones NI mot-clé, le préfixe-lettre du catalogId structuré reste utilisé en dernier recours plutôt que 'unknown' pur — mais signalé NON CERTAIN", () => {
    const sessionsTpl: Partial<ParsedSession>[] = [
      { title: "Séance", details: "Contenu neutre sans mot-clé de classification.", catalogId: "B_LCW_BIKE_LONG_RACE_SAT", phase: "base" },
    ];
    const weeks = [1, 2, 3, 4].map((n) => makeWeek(n, sessionsTpl, "Fondation", "base"));
    const plan = makePlan(weeks, [{ name: "Fondation", weeks: "S1-S4" }]);
    const result = validatePlan(plan, "10K");
    expect(result.lorangCategories.BPct).toBe(100);
    // Consigne coach : une catégorie déduite uniquement du préfixe du
    // catalogId (zones/mots-clés absents) ne doit pas être présentée comme
    // certaine — comptée à part et signalée par un avertissement dédié.
    expect(result.lorangCategories.uncertainTagging).toBe(4);
    expect(result.lorangCategories.uncertainTaggingPct).toBe(100);
    const uncertainWarning = result.issues.find(
      (i) => i.rule === "lorang_categories" && /NON certaine/.test(i.message)
    );
    expect(uncertainWarning).toBeDefined();
    expect(uncertainWarning?.severity).toBe("warning");
  });

  it("référence : une classification par zones OU mot-clé (fiable) ne déclenche jamais l'avertissement 'NON certaine'", () => {
    const sessionsTpl: Partial<ParsedSession>[] = [
      { title: "Seuil", details: "2x15min Z4", catalogId: "B_RUN_SEUIL_2X15", zones: ["Z4"], phase: "base" },
      { title: "EF", details: "45min Z2 récupération", catalogId: "A_RUN_EF_45", phase: "base" },
    ];
    const weeks = [1, 2, 3, 4].map((n) => makeWeek(n, sessionsTpl, "Fondation", "base"));
    const plan = makePlan(weeks, [{ name: "Fondation", weeks: "S1-S4" }]);
    const result = validatePlan(plan, "10K");
    expect(result.lorangCategories.uncertainTagging).toBe(0);
    const uncertainWarning = result.issues.find(
      (i) => i.rule === "lorang_categories" && /NON certaine/.test(i.message)
    );
    expect(uncertainWarning).toBeUndefined();
  });
});

describe("Cohérence du score global avec erreurs critiques (audit point 8)", () => {
  it("un plan avec au moins une erreur critique ne peut plus noter au-dessus du plafond, même si d'autres règles sans rapport sont favorables", () => {
    // Reproduit la configuration qui donnait l'anomalie constatée (Tâche 2) :
    // une séance seuil placée en taper (erreur critique phase_coherence)
    // dans un plan par ailleurs correct.
    const week5 = makeWeek(5, [
      { title: "Seuil", details: "2x18min Z4, séance de seuil complète", phase: "taper" },
    ]);
    const plan = makePlan([
      makeWeek(1, [{ title: "EF", details: "45min Z2 récupération" }], "Fondation", "base"),
      makeWeek(2, [{ title: "EF", details: "45min Z2 récupération" }], "Fondation", "base"),
      week5,
    ], [{ name: "Fondation", weeks: "S1-S2" }, { name: "Affûtage", weeks: "S5" }]);
    const result = validatePlan(plan, "10K");
    const hasCritical = result.issues.some((i) => i.severity === "error");
    expect(hasCritical).toBe(true);
    expect(result.score).toBeLessThanOrEqual(69);
    expect(result.grade).not.toBe("A");
    expect(result.grade).not.toBe("B");
  });
});
