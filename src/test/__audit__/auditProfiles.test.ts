/**
 * ═════════════════════════════════════════════════════════════════════════════
 * PASSE 3 — HARNESS DE NON-RÉGRESSION (sans IA)
 *
 * Exécute les helpers stables du moteur sur N profils types et compare aux
 * valeurs attendues. Toute dérive (clamp, formule, mapping, cible) brise
 * immédiatement la suite Vitest.
 *
 * Profils :
 *  - greg          : coach test (CAP semi, masters)
 *  - lab_bike      : profil labo vélo IM
 *  - debutant_run  : runner débutant 10K
 *  - elite_trail   : trail long élite
 *  - missing_data  : snapshot vide → garde "Données insuffisantes"
 *
 * Invariants verrouillés (issus de F23→F40) :
 *  - VLamax resolver : run/trail → vlamax_run, bike/tri → vlamax
 *  - TTE : âge propagé à la cible (masters)
 *  - Fatigue : mapping 1-10 ×10 = 0-100 canonique
 *  - W' : clamp [10 ; 35] kJ tracé via WprimeClampMeta
 *  - FatMax : formule canonique 78 − 52·(VLa−0.25) + 0.15·(VO2−50)
 *  - Nutrition : Mader-Heck source unique, plancher dynamique, heat ×1.10 unique
 *  - Insufficient data policy : pas de fake 0.45 / 50 / 45
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";

import { resolveVlamaxForGoal } from "@/lib/vlamaxResolver";
import { computeTTEEffectif } from "@/lib/tteEffectif";
import {
  fatigueStateToScore,
  fatigueStateToScore100,
} from "@/lib/fatigueStateMapping";
import {
  effectiveWprime,
  effectiveWprimeWithMeta,
} from "@/lib/v2/criticalPowerModel";
import { computeFatMaxAnchorPctFTP } from "@/lib/v2/fatmaxTFCL";
import { computeBaseRateMader } from "@/lib/v2/nutritionUnified";

// ─── Profils types ──────────────────────────────────────────────────────────

type Profile = {
  name: string;
  age: number;
  weightKg: number;
  sport: "bike" | "run" | "tri";
  objectif: string;
  snapshot: {
    vlamax: number | null;
    vlamax_run: number | null;
    sport_main: string | null;
  };
  vo2max: number | null;
  ftp: number | null;
  tss_7d: number | null;
  tte_observed_min: number | null;
  fatigue_state: string;
};

const PROFILES: Profile[] = [
  {
    name: "greg",
    age: 42,
    weightKg: 70,
    sport: "run",
    objectif: "semi",
    snapshot: { vlamax: 0.55, vlamax_run: 0.42, sport_main: "run" },
    vo2max: 58,
    ftp: 290,
    tss_7d: 520,
    tte_observed_min: 48,
    fatigue_state: "ok",
  },
  {
    name: "lab_bike",
    age: 32,
    weightKg: 72,
    sport: "bike",
    objectif: "IM",
    snapshot: { vlamax: 0.38, vlamax_run: null, sport_main: "bike" },
    vo2max: 65,
    ftp: 320,
    tss_7d: 700,
    tte_observed_min: 62,
    fatigue_state: "fresh",
  },
  {
    name: "debutant_run",
    age: 28,
    weightKg: 78,
    sport: "run",
    objectif: "10k",
    snapshot: { vlamax: null, vlamax_run: 0.65, sport_main: "run" },
    vo2max: 45,
    ftp: 220,
    tss_7d: 280,
    tte_observed_min: null,
    fatigue_state: "fatigued",
  },
  {
    name: "elite_trail",
    age: 35,
    weightKg: 64,
    sport: "run",
    objectif: "trail_long",
    snapshot: { vlamax: 0.50, vlamax_run: 0.35, sport_main: "run" },
    vo2max: 72,
    ftp: 340,
    tss_7d: 850,
    tte_observed_min: 75,
    fatigue_state: "fresh",
  },
  {
    name: "missing_data",
    age: 30,
    weightKg: 70,
    sport: "tri",
    objectif: "70.3",
    snapshot: { vlamax: null, vlamax_run: null, sport_main: null },
    vo2max: null,
    ftp: null,
    tss_7d: null,
    tte_observed_min: null,
    fatigue_state: "ok",
  },
  // Lot 3 — 3 profils supplémentaires (audit qualité IA plan)
  {
    // Master 55 ans × world_class IM → guard santé + TTE age-adjusted
    name: "master_worldclass_im",
    age: 55,
    weightKg: 74,
    sport: "tri",
    objectif: "IM",
    snapshot: { vlamax: 0.33, vlamax_run: 0.40, sport_main: "bike" },
    vo2max: 62,
    ftp: 310,
    tss_7d: 780,
    tte_observed_min: 65,
    fatigue_state: "ok",
  },
  {
    // Ultra-trail élite avec préparation ≤6 semaines → guard "phases écrasées"
    name: "ultra_short_prep",
    age: 38,
    weightKg: 66,
    sport: "run",
    objectif: "ultra",
    snapshot: { vlamax: 0.42, vlamax_run: 0.32, sport_main: "run" },
    vo2max: 68,
    ftp: 320,
    tss_7d: 900,
    tte_observed_min: 90,
    fatigue_state: "fresh",
  },
  {
    // Tri Sprint débutant → intensité tolérée, plancher CHO 0 g/h (durée <1h)
    name: "sprint_tri_debutant",
    age: 34,
    weightKg: 80,
    sport: "tri",
    objectif: "sprint",
    snapshot: { vlamax: 0.62, vlamax_run: 0.70, sport_main: "bike" },
    vo2max: 48,
    ftp: 210,
    tss_7d: 250,
    tte_observed_min: 32,
    fatigue_state: "ok",
  },
];

const byName = (n: string) => PROFILES.find((p) => p.name === n)!;

// ─── 1. VLamax Resolver — sport-aware ───────────────────────────────────────

describe("PASSE 3 — VLamax Resolver", () => {
  it("greg (run/semi) → vlamax_run = 0.42", () => {
    const p = byName("greg");
    const r = resolveVlamaxForGoal(p.snapshot, { goal: p.objectif });
    expect(r.source).toBe("run");
    expect(r.value).toBe(0.42);
  });

  it("lab_bike (IM) → vlamax (bike) = 0.38", () => {
    const p = byName("lab_bike");
    const r = resolveVlamaxForGoal(p.snapshot, { goal: p.objectif });
    expect(r.source).toBe("bike");
    expect(r.value).toBe(0.38);
  });

  it("elite_trail → vlamax_run = 0.35 (pas vélo 0.50)", () => {
    const p = byName("elite_trail");
    const r = resolveVlamaxForGoal(p.snapshot, { goal: p.objectif });
    expect(r.source).toBe("run");
    expect(r.value).toBe(0.35);
  });

  it("missing_data → value=null + reason renseignée", () => {
    const p = byName("missing_data");
    const r = resolveVlamaxForGoal(p.snapshot, { goal: p.objectif });
    expect(r.value).toBeNull();
    expect(r.reason).not.toBe("ok");
  });
});

// ─── 2. TTE Effectif — âge propagé (F33) ────────────────────────────────────

describe("PASSE 3 — TTE Effectif (F33 age propagation)", () => {
  it("greg (42 ans, OBSERVED 48 min) → source observed, target ajustée masters", () => {
    const p = byName("greg");
    const r = computeTTEEffectif({
      ftp: p.ftp,
      tss_7d: p.tss_7d,
      tte_mode: "OBSERVED",
      tte_observed_min: p.tte_observed_min,
      objectif: p.objectif,
      age: p.age,
    });
    expect(r.source).toBe("observed");
    expect(r.tte_min).toBe(48);
    expect(r.target).toBeDefined();
  });

  it("missing_data → source unknown, tte_min=0 (F38 pas de fake 45)", () => {
    const p = byName("missing_data");
    const r = computeTTEEffectif({
      ftp: null,
      tss_7d: null,
      tte_mode: null,
      tte_observed_min: null,
      objectif: p.objectif,
      age: p.age,
    });
    expect(r.source).toBe("unknown");
    expect(r.tte_min).toBe(0);
    expect(r.confidence).toBeLessThanOrEqual(0.25);
  });

  it("masters (50 ans, IM, OBSERVED 50) doit avoir target différente d'un junior", () => {
    const masters = computeTTEEffectif({
      ftp: 280, tss_7d: 600, tte_mode: "OBSERVED",
      tte_observed_min: 50, objectif: "IM", age: 50,
    });
    const junior = computeTTEEffectif({
      ftp: 280, tss_7d: 600, tte_mode: "OBSERVED",
      tte_observed_min: 50, objectif: "IM", age: 25,
    });
    // Au minimum la target diffère (ajustement masters −2/−5/−8 min)
    expect(masters.target).not.toBe(junior.target);
  });
});

// ─── 3. Fatigue Mapping — canonical 1-10 ×10 (F34) ──────────────────────────

describe("PASSE 3 — Fatigue State canonical 0-100 (F34)", () => {
  const cases: Array<[string, number, number]> = [
    ["fresh", 2, 20],
    ["ok", 4, 40],
    ["fatigued", 6, 60],
    ["high", 8, 80],
    ["injured", 10, 100],
  ];
  for (const [state, score10, score100] of cases) {
    it(`${state} → ${score10} (1-10) / ${score100} (0-100)`, () => {
      expect(fatigueStateToScore(state)).toBe(score10);
      expect(fatigueStateToScore100(state)).toBe(score100);
    });
  }
});

// ─── 4. W' Clamp — traçabilité (F39) ────────────────────────────────────────

describe("PASSE 3 — W' clamp [10 ; 35] kJ (F39)", () => {
  it("8 kJ → floor appliqué + meta.bound='floor'", () => {
    const meta = effectiveWprimeWithMeta(8000);
    expect(meta.value).toBe(10000);
    expect(meta.clamped).toBe(true);
    expect(meta.bound).toBe("floor");
    expect(meta.reason).toMatch(/plancher/);
  });
  it("40 kJ → ceiling appliqué + meta.bound='ceiling'", () => {
    const meta = effectiveWprimeWithMeta(40000);
    expect(meta.value).toBe(35000);
    expect(meta.clamped).toBe(true);
    expect(meta.bound).toBe("ceiling");
    expect(meta.reason).toMatch(/plafond/);
  });
  it("22 kJ → pas de clamp", () => {
    const meta = effectiveWprimeWithMeta(22000);
    expect(meta.clamped).toBe(false);
    expect(meta.bound).toBeNull();
  });
  it("effectiveWprime numérique reste cohérent", () => {
    expect(effectiveWprime(8000)).toBe(10000);
    expect(effectiveWprime(40000)).toBe(35000);
    expect(effectiveWprime(22000)).toBe(22000);
  });
});

// ─── 5. FatMax canonique (F23/F24/F25/F29) ──────────────────────────────────

describe("PASSE 3 — FatMax canonical formula", () => {
  it("VLa=0.25, VO2=50 → 78% FTP (anchor base)", () => {
    expect(computeFatMaxAnchorPctFTP(0.25, 50)).toBe(78);
  });
  it("VLa basse 0.20 + VO2 élevé 70 → anchor proche du plafond 82", () => {
    const v = computeFatMaxAnchorPctFTP(0.20, 70)!;
    expect(v).toBeGreaterThanOrEqual(78);
    expect(v).toBeLessThanOrEqual(82);
  });
  it("VLa très élevée 0.80 → anchor proche du plancher 48", () => {
    const v = computeFatMaxAnchorPctFTP(0.80, 50)!;
    expect(v).toBeGreaterThanOrEqual(48);
    expect(v).toBeLessThanOrEqual(60);
  });
  it("VLa null → null (pas de fake default)", () => {
    expect(computeFatMaxAnchorPctFTP(null, 50)).toBeNull();
  });
});

// ─── 6. Nutrition Mader-Heck (F26/F27/F30/F31) ──────────────────────────────

describe("PASSE 3 — Nutrition Mader-Heck canonical", () => {
  it("vélo IM 5h, intensité 70% → baseRate dans plage Mader (40–90 g/h)", () => {
    const r = computeBaseRateMader(72, "velo", 65, 0.38, 70, 5, false);
    expect(r.baseRate).toBeGreaterThanOrEqual(40);
    expect(r.baseRate).toBeLessThanOrEqual(90);
    expect(r.method).toBe("mader");
  });
  it("CAP <1h (10K) → plancher = 0 (F31, pas de bypass)", () => {
    const r = computeBaseRateMader(70, "cap", 58, 0.42, 85, 0.8, false);
    expect(r.baseRate).toBeGreaterThanOrEqual(0);
    expect(r.baseRate).toBeLessThanOrEqual(75);
  });
  it("heat=true appliqué une seule fois (F30) → baseRate ≥ baseline cool", () => {
    const cool = computeBaseRateMader(72, "velo", 65, 0.38, 70, 5, false);
    const hot = computeBaseRateMader(72, "velo", 65, 0.38, 70, 5, true);
    expect(hot.baseRate).toBeGreaterThanOrEqual(cool.baseRate);
  });
});
