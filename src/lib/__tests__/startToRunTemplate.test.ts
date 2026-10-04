import { describe, it, expect } from "vitest";
import { buildStartToRunTemplatePlan } from "../startToRunTemplate";
import { EnrichedWorkoutsStartToRun } from "../enrichedWorkoutsStartToRun";

/**
 * Bug réel (audit "plan Mamou", 12 semaines Start-to-Run + jalon 10km) qui a
 * motivé ce template statique :
 *  - S3 régressait vers un format PLUS FACILE que S2 (WALK_RUN_1_2 après
 *    WALK_RUN_2_2) au lieu de progresser/consolider — la fiche dédiée
 *    S2R_CONSOLIDATION_WEEK_SESSION existe pourtant précisément pour éviter
 *    ce cas, mais n'était utilisée qu'à partir de S6.
 *  - À partir de S5, la quasi-totalité des séances course/renfo étaient
 *    [CUSTOM] (improvisées hors catalogue par le modèle), y compris des
 *    formats qui existent pourtant en fiche (S2R_WALK_RUN_5_1, utilisée
 *    correctement ailleurs dans le MÊME plan mais réinventée en CUSTOM à
 *    un autre endroit).
 * Ce template élimine les deux : calendrier 100% déterministe, dérivé des
 * champs `when` des fiches S2R elles-mêmes (source de vérité unique), aucun
 * appel LLM donc aucune possibilité de contenu hors catalogue.
 */
describe("startToRunTemplate — plan Start-to-Run statique 12 semaines", () => {
  const plan = buildStartToRunTemplatePlan();
  const catalogIds = new Set(EnrichedWorkoutsStartToRun.map((w) => w.id));

  it("produit exactement 12 semaines", () => {
    expect(plan.totalWeeks).toBe(12);
    expect(plan.weeks).toHaveLength(12);
    expect(plan.weeks.map((w) => w.weekNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("chaque semaine a exactement 7 jours (Lundi à Dimanche)", () => {
    for (const week of plan.weeks) {
      const dayIndexes = week.sessions.map((s) => s.dayIndex).filter((d, i, arr) => arr.indexOf(d) === i);
      expect(dayIndexes.sort((a, b) => a - b), `semaine ${week.weekNumber}`).toEqual([0, 1, 2, 3, 4, 5, 6]);
    }
  });

  it("chaque catalogId référencé existe réellement dans EnrichedWorkoutsStartToRun (aucun contenu hors catalogue possible)", () => {
    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        if (session.catalogId) {
          expect(catalogIds.has(session.catalogId), `${session.catalogId} (S${week.weekNumber})`).toBe(true);
        }
      }
    }
  });

  it("ne régresse JAMAIS vers un format de course plus facile d'une semaine à l'autre (bug S3 du plan Mamou)", () => {
    // Ordre de difficulté croissante des formats marche-course/continu.
    const DIFFICULTY_RANK: Record<string, number> = {
      S2R_WALK_RUN_1_2: 1,
      S2R_WALK_RUN_2_2: 2,
      S2R_WALK_RUN_3_1: 3,
      S2R_WALK_RUN_5_1: 4,
      S2R_CONTINUOUS_15: 5,
      S2R_CONTINUOUS_20_25: 6,
      S2R_CONTINUOUS_30_LONG: 7,
    };
    // S2R_CONSOLIDATION_WEEK_SESSION répète le format de la semaine
    // précédente (pas de régression, pas de progression) — exclu du ranking.
    let lastRank = 0;
    for (const week of plan.weeks) {
      const ids = week.sessions
        .filter((s) => s.catalogId && s.catalogId in DIFFICULTY_RANK)
        .map((s) => DIFFICULTY_RANK[s.catalogId!]);
      if (ids.length === 0) continue; // semaine de consolidation
      const rank = Math.max(...ids);
      expect(rank, `semaine ${week.weekNumber} ne doit pas régresser sous le rang ${lastRank}`).toBeGreaterThanOrEqual(lastRank);
      lastRank = Math.max(lastRank, rank);
    }
  });

  it("utilise le format 2'/2' en S3 (progression réelle depuis S2, jamais un retour au 1'/2')", () => {
    const week3 = plan.weeks.find((w) => w.weekNumber === 3)!;
    const ids = week3.sessions.filter((s) => s.catalogId).map((s) => s.catalogId);
    expect(ids).toContain("S2R_WALK_RUN_2_2");
    expect(ids).not.toContain("S2R_WALK_RUN_1_2");
  });

  it("place les semaines de consolidation UNIQUEMENT en S4, S8, S12 (jamais avant S4, conformément à la fiche)", () => {
    const consolidationWeeks = plan.weeks
      .filter((w) => w.sessions.some((s) => s.catalogId === "S2R_CONSOLIDATION_WEEK_SESSION"))
      .map((w) => w.weekNumber);
    expect(consolidationWeeks.sort((a, b) => a - b)).toEqual([4, 8]);
    // S12 utilise la fiche "objectif final" dédiée (CONTINUOUS_30_LONG), pas
    // la consolidation générique — cf. son propre `when` ("Semaine 12, sortie
    // la plus longue de la semaine").
    const week12 = plan.weeks.find((w) => w.weekNumber === 12)!;
    const week12Ids = week12.sessions.filter((s) => s.catalogId).map((s) => s.catalogId);
    expect(week12Ids).toContain("S2R_CONTINUOUS_30_LONG");
    expect(week12Ids).not.toContain("S2R_CONSOLIDATION_WEEK_SESSION");
  });

  it("place la première course continue (15min) en S9, conformément au `when` de la fiche", () => {
    const week9 = plan.weeks.find((w) => w.weekNumber === 9)!;
    const ids = week9.sessions.filter((s) => s.catalogId).map((s) => s.catalogId);
    expect(ids).toContain("S2R_CONTINUOUS_15");
  });

  it("aucun jour ne contient 2 séances de course consécutives sur 2 jours de suite (règle S2R : jamais 2 jours de course de suite)", () => {
    for (const week of plan.weeks) {
      const runDayIndexes = week.sessions
        .filter((s) => !s.isRest && s.sport === "course" && s.catalogId && /^S2R_(WALK_RUN|CONSOLIDATION|CONTINUOUS)/.test(s.catalogId))
        .map((s) => s.dayIndex);
      for (const d of runDayIndexes) {
        expect(runDayIndexes.includes(d + 1), `semaine ${week.weekNumber}, jours ${d} et ${d + 1} consécutifs`).toBe(false);
      }
    }
  });

  it("la fiche de progression CAP (marche-course/continu) est toujours compatible avec la phase affichée de la semaine", () => {
    // Restreint aux fiches qui définissent la progression course elle-même —
    // les fiches transversales (renforcement/mobilité/technique) sont conçues
    // pour s'appliquer sur plusieurs phases et n'entrent pas dans ce garde-fou.
    const CAP_PROGRESSION = /^S2R_(WALK_RUN|CONSOLIDATION|CONTINUOUS)/;
    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        if (!session.catalogId || !CAP_PROGRESSION.test(session.catalogId)) continue;
        const w = EnrichedWorkoutsStartToRun.find((x) => x.id === session.catalogId)!;
        if (w.phase && w.phase.length > 0) {
          expect(
            w.phase.includes(week.phase as typeof w.phase[number]),
            `${session.catalogId} (phase=${w.phase}) utilisée en semaine ${week.weekNumber} (phase=${week.phase})`,
          ).toBe(true);
        }
      }
    }
  });

  it("le dosage de renforcement 'none' ne place aucune séance de la progression FORCE dédiée (mobilité/récupération reste, elle, toujours active)", () => {
    const planNoStrength = buildStartToRunTemplatePlan({ strengthDose: "none" });
    for (const week of planNoStrength.weeks) {
      expect(week.sessions.some((s) => s.catalogId?.startsWith("S2R_STR_FOUNDATION_"))).toBe(false);
    }
  });

  it("le dosage 'light' ne place jamais plus de séances de renforcement que 'full', et au moins 1/semaine", () => {
    const planFull = buildStartToRunTemplatePlan({ strengthDose: "full" });
    const planLight = buildStartToRunTemplatePlan({ strengthDose: "light" });
    const strCount = (w: (typeof planFull.weeks)[number]) =>
      w.sessions.filter((s) => s.catalogId?.startsWith("S2R_STR_FOUNDATION_")).length;
    for (let i = 0; i < 12; i++) {
      const fullCount = strCount(planFull.weeks[i]);
      const lightCount = strCount(planLight.weeks[i]);
      expect(fullCount, `semaine ${i + 1}`).toBeGreaterThanOrEqual(1);
      expect(lightCount, `semaine ${i + 1} (light) ne doit pas dépasser full`).toBeLessThanOrEqual(fullCount);
      expect(lightCount, `semaine ${i + 1} (light) doit rester >= 1`).toBeGreaterThanOrEqual(1);
    }
    // Au moins une semaine où full > light (sinon la dose n'a aucun effet observable).
    const anyDifference = Array.from({ length: 12 }, (_, i) => i).some(
      (i) => strCount(planFull.weeks[i]) > strCount(planLight.weeks[i]),
    );
    expect(anyDifference).toBe(true);
  });

  it("les minutes COURUES cumulées (métrique de progression retenue par la bibliothèque S2R, cf. son en-tête) croissent globalement de S1 à S11", () => {
    // Volume total hebdo (course + renfo + marche de récup) n'est PAS le bon
    // proxy de charge ici : la fréquence de marche/renfo varie par design
    // (ex. S9-11 passent à 2 sorties course/semaine au lieu de 3, cf. le
    // `when` de S2R_WALK_RUN_5_1/CONTINUOUS_*), donc le volume TOTAL peut
    // baisser même quand la charge course elle-même progresse. On isole donc
    // les minutes courues (durée du bloc "Main" des fiches de progression
    // CAP), seule métrique que la bibliothèque elle-même utilise pour définir
    // la progression (`notes` de chaque fiche : "~24min/semaine", "~42min",
    // "~54min", "~75min"...).
    const CAP_PROGRESSION = /^S2R_(WALK_RUN|CONTINUOUS)/;
    const RUN_MINUTES_IN_MAIN: Record<string, number> = {
      S2R_WALK_RUN_1_2: 8,
      S2R_WALK_RUN_2_2: 14,
      S2R_WALK_RUN_3_1: 18,
      S2R_WALK_RUN_5_1: 25,
      S2R_CONTINUOUS_15: 15,
      S2R_CONTINUOUS_20_25: 22, // milieu de la fourchette 20-25
      S2R_CONTINUOUS_30_LONG: 30,
    };
    const runMinutesOfWeek = (weekNumber: number) =>
      plan.weeks.find((w) => w.weekNumber === weekNumber)!.sessions
        .filter((s) => s.catalogId && CAP_PROGRESSION.test(s.catalogId))
        .reduce((sum, s) => sum + (RUN_MINUTES_IN_MAIN[s.catalogId!] ?? 0), 0);

    const week1 = runMinutesOfWeek(1);
    const week5 = runMinutesOfWeek(5);
    const week7 = runMinutesOfWeek(7);
    const week9 = runMinutesOfWeek(9);
    const week11 = runMinutesOfWeek(11);
    expect(week1).toBeGreaterThan(0);
    expect(week5).toBeGreaterThan(week1);
    expect(week7).toBeGreaterThan(week5);
    expect(week9).toBeGreaterThan(0);
    expect(week11).toBeGreaterThan(week9);
  });
});

describe("startToRunTemplate — option startWeek (saut de palier selon l'expérience déclarée)", () => {
  it("startWeek=1 (défaut) est strictement identique à l'appel sans options", () => {
    const withDefault = buildStartToRunTemplatePlan();
    const withExplicit1 = buildStartToRunTemplatePlan({ startWeek: 1 });
    expect(withExplicit1).toEqual(withDefault);
  });

  it("startWeek=5 renvoie 8 semaines renumérotées 1..8, en commençant par le contenu de la S5 canonique", () => {
    const full = buildStartToRunTemplatePlan();
    const sliced = buildStartToRunTemplatePlan({ startWeek: 5 });
    expect(sliced.totalWeeks).toBe(8);
    expect(sliced.weeks.map((w) => w.weekNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // Même thème/contenu que la semaine 5 canonique, juste renumérotée en semaine 1.
    expect(sliced.weeks[0].theme).toBe(full.weeks[4].theme);
    expect(sliced.weeks[0].sessions.map((s) => s.catalogId)).toEqual(
      full.weeks[4].sessions.map((s) => s.catalogId),
    );
  });

  it("startWeek=10 renvoie les 3 dernières semaines (bloc continu), jamais de régression vers le marche-course", () => {
    const sliced = buildStartToRunTemplatePlan({ startWeek: 10 });
    expect(sliced.totalWeeks).toBe(3);
    const WALK_RUN = /^S2R_WALK_RUN/;
    for (const week of sliced.weeks) {
      for (const session of week.sessions) {
        if (session.catalogId) expect(WALK_RUN.test(session.catalogId)).toBe(false);
      }
    }
  });

  it("startWeek=12 renvoie uniquement la semaine de validation finale", () => {
    const sliced = buildStartToRunTemplatePlan({ startWeek: 12 });
    expect(sliced.totalWeeks).toBe(1);
    expect(sliced.weeks[0].sessions.some((s) => s.catalogId === "S2R_CONTINUOUS_30_LONG")).toBe(true);
  });

  it("valeurs hors bornes (0, négatif, >12, décimal) sont ramenées dans [1, 12]", () => {
    expect(buildStartToRunTemplatePlan({ startWeek: 0 }).totalWeeks).toBe(12);
    expect(buildStartToRunTemplatePlan({ startWeek: -5 }).totalWeeks).toBe(12);
    expect(buildStartToRunTemplatePlan({ startWeek: 99 }).totalWeeks).toBe(1);
    expect(buildStartToRunTemplatePlan({ startWeek: 4.9 }).weeks[0].weekNumber).toBe(1);
  });

  it("les phases (blocs) sont reprojetées sur la nouvelle numérotation et n'incluent pas un bloc déjà dépassé", () => {
    const sliced = buildStartToRunTemplatePlan({ startWeek: 6 });
    // Bloc 1 (S1-S4 canoniques) entièrement dépassé à startWeek=6 → absent.
    expect(sliced.phases.some((p) => p.name.includes("Bloc 1"))).toBe(false);
    // Bloc 2 (S5-S8) partiellement couvert (S6-S8) → reprojeté en S1-S3.
    const bloc2 = sliced.phases.find((p) => p.name.includes("Bloc 2"));
    expect(bloc2?.weeks).toBe("S1-S3");
  });

  it("le titre et le diagnostic mentionnent le palier d'entrée quand startWeek > 1, pas quand startWeek = 1", () => {
    const full = buildStartToRunTemplatePlan();
    const sliced = buildStartToRunTemplatePlan({ startWeek: 9 });
    expect(full.title).not.toMatch(/palier/i);
    expect(sliced.title).toMatch(/palier S9/);
    expect(sliced.diagnostic).toMatch(/Démarrage directement au palier/);
  });

  it("strengthDose reste appliqué correctement en combinaison avec startWeek", () => {
    const sliced = buildStartToRunTemplatePlan({ startWeek: 5, strengthDose: "none" });
    for (const week of sliced.weeks) {
      for (const session of week.sessions) {
        expect(session.catalogId?.startsWith("S2R_STR_")).not.toBe(true);
      }
    }
  });
});
