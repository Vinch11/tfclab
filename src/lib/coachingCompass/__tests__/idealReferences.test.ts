/**
 * Idéaux de référence : couverture complète, ordre cohérent, ancrage sur les
 * cohortes lues, et isolation de la prescription.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { idealReference, idealState, IDEAL_AMBITIONS, type IdealFactor, type IdealSport } from "../idealReferences";
import { compassEvidence } from "../referenceRegistry";
import { objectiveDemands } from "../objectiveDemands";

const RUN_OBJECTIVES = ["5K", "10K", "Semi", "Marathon", "Trail", "TrailShort", "TrailMountain", "TrailUltra"];
const TRI_OBJECTIVES = ["Sprint", "Olympic", "703", "IM"];
const ref = (factor: IdealFactor, objective: string, ambition: string, sport: IdealSport) =>
  idealReference(factor, { objective, ambition, sport });

describe("couverture : chaque objectif × ambition × facteur applicable a un idéal", () => {
  it("course : VO₂max et VMA pour 8 objectifs × 5 ambitions", () => {
    for (const objective of RUN_OBJECTIVES) for (const ambition of IDEAL_AMBITIONS) for (const factor of ["vo2max", "vma"] as const) {
      const r = ref(factor, objective, ambition, "run");
      expect(r, `${objective} ${ambition} ${factor}`).not.toBeNull();
      expect(r!.low).toBeLessThan(r!.point);
      expect(r!.high).toBeGreaterThan(r!.point);
      expect(["measured", "derived"]).toContain(r!.tier);
      expect(r!.basis.length).toBeGreaterThan(20);
    }
  });
  it("triathlon : VO₂max et VMA course, VO₂max et seuil vélo pour 4 objectifs × 5 ambitions", () => {
    for (const objective of TRI_OBJECTIVES) for (const ambition of IDEAL_AMBITIONS) {
      for (const [factor, sport] of [["vo2max", "run"], ["vma", "run"], ["vo2max", "bike"], ["ftpkg", "bike"]] as const) {
        expect(ref(factor, objective, ambition, sport), `${objective} ${ambition} ${factor} ${sport}`).not.toBeNull();
      }
    }
  });
  it("pas de volet vélo pour la course pure, pas de seuil vélo en course, hors référentiel = null", () => {
    expect(ref("vo2max", "Marathon", "competitor", "bike")).toBeNull();
    expect(ref("ftpkg", "703", "competitor", "run")).toBeNull();
    expect(ref("vma", "703", "competitor", "bike")).toBeNull();
    expect(ref("vo2max", "StartToRun", "competitor", "run")).toBeNull();
    expect(ref("vo2max", "inconnu", "competitor", "run")).toBeNull();
    expect(ref("vo2max", "Marathon", "inconnue", "run")).toBeNull();
  });
  it("chaque objectif de l'application est classé (route, trail, triathlon ou débutant)", () => {
    for (const o of [...RUN_OBJECTIVES, ...TRI_OBJECTIVES]) expect(objectiveDemands(o), o).toBeDefined();
  });
});

describe("cohérence : l'idéal augmente avec l'ambition", () => {
  const cases: Array<[IdealFactor, IdealSport, string[]]> = [
    ["vo2max", "run", [...RUN_OBJECTIVES, ...TRI_OBJECTIVES]],
    ["vma", "run", [...RUN_OBJECTIVES, ...TRI_OBJECTIVES]],
    ["vo2max", "bike", TRI_OBJECTIVES],
    ["ftpkg", "bike", TRI_OBJECTIVES],
  ];
  for (const [factor, sport, objectives] of cases) {
    it(`${factor} ${sport} : croissant de Découverte à Elite pour chaque objectif`, () => {
      for (const objective of objectives) {
        const points = IDEAL_AMBITIONS.map(a => ref(factor, objective, a, sport)!.point);
        for (let i = 1; i < points.length; i++) expect(points[i], `${objective} ${factor} ${i}`).toBeGreaterThan(points[i - 1]);
      }
    });
  }
});

describe("ancrage : les valeurs mesurées reprennent les cohortes lues", () => {
  it("course sur route : tranches de Gordon 2017", () => {
    expect(ref("vo2max", "Marathon", "finisher", "run")).toMatchObject({ point: 46.5, tier: "measured" });
    expect(ref("vo2max", "Marathon", "age_group", "run")).toMatchObject({ point: 53.1, tier: "measured" });
    expect(ref("vo2max", "10K", "competitor", "run")).toMatchObject({ point: 59.5, tier: "measured" });
  });
  it("Qualifiable et Elite en course : dérivés, jamais présentés comme mesurés", () => {
    expect(ref("vo2max", "Marathon", "elite", "run")!.tier).toBe("derived");
    expect(ref("vo2max", "Marathon", "world_class", "run")!.tier).toBe("derived");
  });
  it("triathlon compétiteur : cohorte Assis 2024 pour la course", () => {
    expect(ref("vo2max", "IM", "competitor", "run")).toMatchObject({ point: 56.3, tier: "measured" });
    expect(ref("vma", "703", "competitor", "run")).toMatchObject({ point: 16.69, tier: "measured" });
  });
  it("triathlon hors compétiteur : échelle course réduite de 5,4 %, dérivée", () => {
    const road = ref("vo2max", "Marathon", "age_group", "run")!.point;
    const tri = ref("vo2max", "IM", "age_group", "run")!;
    expect(tri.tier).toBe("derived");
    expect(tri.point).toBeCloseTo(road * (56.3 / 59.5), 0);
  });
  it("ultra-trail : cohortes régionale et nationale mesurées", () => {
    expect(ref("vo2max", "TrailUltra", "age_group", "run")).toMatchObject({ point: 57.33, tier: "measured" });
    expect(ref("vo2max", "TrailUltra", "competitor", "run")).toMatchObject({ point: 63.39, tier: "measured" });
    expect(ref("vo2max", "TrailShort", "competitor", "run")!.point).toBe(59.5);
  });
  it("vélo : cyclistes entraînés, juniors et professionnels mesurés ; milieu dérivé", () => {
    expect(ref("vo2max", "IM", "age_group", "bike")).toMatchObject({ point: 56.2, tier: "measured" });
    expect(ref("vo2max", "IM", "elite", "bike")).toMatchObject({ point: 74.54, tier: "measured" });
    expect(ref("vo2max", "IM", "world_class", "bike")).toMatchObject({ point: 82.64, tier: "measured" });
    expect(ref("vo2max", "IM", "competitor", "bike")!.tier).toBe("derived");
  });
  it("seuil vélo : toujours dérivé, puissance au VO₂max recoupée avec les cohortes lues", () => {
    for (const a of IDEAL_AMBITIONS) expect(ref("ftpkg", "703", a, "bike")!.tier).toBe("derived");
    // Équation (VO₂max − 7) / 10,8 contre les puissances mesurées : écart de 5 % au plus.
    const check = (vo2: number, measured: number) => expect(Math.abs((vo2 - 7) / 10.8 - measured) / measured).toBeLessThan(0.06);
    check(82.64, 7.31); check(79.79, 6.94); check(74.54, 6.64); check(56.2, 4.4);
  });
  it("les ordres de grandeur restent plausibles (marathon compétiteur, VMA 17–18 km/h)", () => {
    const vma = ref("vma", "Marathon", "competitor", "run")!;
    expect(vma.point).toBeGreaterThan(16.5);
    expect(vma.point).toBeLessThan(18.5);
  });
});

describe("ajustement à l'athlète : sexe et âge", () => {
  const at = (factor: IdealFactor, objective: string, ambition: string, sport: IdealSport, age: number | null, sex: string | null) =>
    idealReference(factor, { objective, ambition, sport, age, sex });

  it("sans âge ou sans sexe : valeur du groupe de référence, signalée comme non ajustée", () => {
    const base = ref("vo2max", "IM", "competitor", "bike")!;
    for (const [age, sex] of [[51, null], [null, "F"], [null, null], [12, "F"], [140, "M"]] as const) {
      const r = at("vo2max", "IM", "competitor", "bike", age, sex)!;
      expect(r.point, `${age}/${sex}`).toBe(base.point);
      expect(r.adjustment).toMatch(/non ajusté/);
      expect(r.tier).toBe(base.tier);
    }
  });

  it("une femme de 51 ans : idéal plus bas que celui du groupe masculin de référence (vélo, Compétiteur)", () => {
    // 65,35 × 0,913 = 59,66 ; −0,39 × (51 − 35) = −6,24 → 53,42
    const r = at("vo2max", "IM", "competitor", "bike", 51, "F")!;
    expect(r.point).toBeCloseTo(53.42, 1);
    expect(r.point).toBeLessThan(ref("vo2max", "IM", "competitor", "bike")!.point);
    expect(r.tier).toBe("derived");
    expect(r.adjustment).toMatch(/femme, 51 ans/);
  });

  it("un homme de 51 ans : seule la baisse liée à l'âge s'applique à une cohorte masculine", () => {
    // Cyclistes entraînés (42,1 ans) : 56,2 − 0,65 × (51 − 42,1) = 50,4
    expect(at("vo2max", "IM", "age_group", "bike", 51, "M")!.point).toBeCloseTo(50.4, 1);
  });

  it("une cohorte mixte est ramenée à un sexe avant d'ajuster : l'idéal d'un homme y est plus haut que la moyenne du groupe", () => {
    const group = ref("vo2max", "Marathon", "finisher", "run")!.point; // 46,5 : 29 % d'hommes
    expect(at("vo2max", "Marathon", "finisher", "run", 42, "M")!.point).toBeGreaterThan(group);
    expect(at("vo2max", "Marathon", "finisher", "run", 42, "F")!.point).toBeLessThan(at("vo2max", "Marathon", "finisher", "run", 42, "M")!.point);
  });

  it("avant 35 ans, pas de baisse liée à l'âge ; plus jeune que la cohorte, l'idéal monte", () => {
    const y = at("vo2max", "Marathon", "competitor", "run", 25, "M")!.point;
    const o = at("vo2max", "Marathon", "competitor", "run", 35, "M")!.point;
    expect(y).toBe(o);
    expect(at("vo2max", "Marathon", "competitor", "run", 60, "M")!.point).toBeLessThan(o);
  });

  it("l'idéal décroît avec l'âge, sexe et ambition fixés ; la VMA et le seuil vélo suivent la VO₂max ajustée", () => {
    for (const sex of ["M", "F"]) {
      const ages = [30, 40, 50, 60];
      for (const [factor, objective, sport] of [["vo2max", "Marathon", "run"], ["vma", "Marathon", "run"], ["ftpkg", "703", "bike"]] as const) {
        const points = ages.map(a => at(factor, objective, "competitor", sport, a, sex)!.point);
        for (let i = 1; i < points.length; i++) expect(points[i], `${factor} ${sex}`).toBeLessThanOrEqual(points[i - 1]);
        expect(points[3]).toBeLessThan(points[0]);
      }
    }
  });

  it("la zone reste centrée sur le point ajusté et l'ordre des ambitions est conservé pour une femme de 45 ans", () => {
    for (const [factor, objective, sport] of [["vo2max", "IM", "run"], ["vma", "IM", "run"], ["vo2max", "IM", "bike"], ["ftpkg", "IM", "bike"]] as const) {
      const rows = IDEAL_AMBITIONS.map(a => at(factor, objective, a, sport, 45, "F")!);
      for (const r of rows) { expect(r.low).toBeLessThan(r.point); expect(r.high).toBeGreaterThan(r.point); }
      for (let i = 1; i < rows.length; i++) expect(rows[i].point, `${factor} ${i}`).toBeGreaterThan(rows[i - 1].point);
    }
  });
});

describe("registre des sources et état", () => {
  it("chaque source citée existe dans le registre avec une adresse PMC", () => {
    const ids = new Set<string>(compassEvidence.map(e => e.id));
    for (const objective of [...RUN_OBJECTIVES, ...TRI_OBJECTIVES]) for (const a of IDEAL_AMBITIONS) {
      for (const [factor, sport] of [["vo2max", "run"], ["vma", "run"], ["vo2max", "bike"], ["ftpkg", "bike"]] as const) {
        for (const id of ref(factor, objective, a, sport)?.evidenceIds ?? []) expect(ids.has(id), `${id} (${objective} ${a})`).toBe(true);
      }
    }
    for (const e of compassEvidence.filter(e => ["gordon-2017", "quittmann-2022", "casado-2022", "trail-2020", "pro-u23-junior-2022", "cyclists-age-2007", "fat-normative-2018", "vlamax-cycling-2024", "durability-cycling-2025"].includes(e.id))) {
      expect(e.url).toMatch(/^https:\/\/pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+\/$/);
    }
  });
  it("idealState compare à la zone", () => {
    const zone = { low: 50, high: 56 };
    expect(idealState(49.9, zone)).toBe("below");
    expect(idealState(53, zone)).toBe("inside");
    expect(idealState(56.1, zone)).toBe("above");
  });
});

describe("isolation : ni la prescription ni le classement n'importent les idéaux", () => {
  it("aucun module du moteur de limiteurs, des plans ou de la prescription ne référence idealReferences", () => {
    const files = [
      "src/lib/coachingCompass/computeCoachingCompass.ts", "src/lib/coachingCompass/coachPriorities.ts",
      "src/lib/coachingCompass/compassFlow.ts", "src/lib/v2/unifiedLimiterDetection.ts",
      "src/lib/plan/prepareGenerationContracts.ts", "src/engines/plan/planConfigBuilder.ts",
    ];
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/idealReferences/);
  });
});
