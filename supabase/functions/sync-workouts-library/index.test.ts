import { assertEquals } from "jsr:@std/assert@1";
import {
  buildDescription,
  buildDurationByPhase,
  durationBounds,
  extractIntensity,
  resolveCanonicalDuration,
  roundDuration,
} from "./index.ts";

// ─── durationBounds ──────────────────────────────────────────────────────────

Deno.test("durationBounds — scalaire → [v,v]", () => {
  assertEquals(durationBounds({ durationMin: 50 }), [50, 50]);
});

Deno.test("durationBounds — tableau [lo,hi]", () => {
  assertEquals(durationBounds({ durationMin: [40, 80] }), [40, 80]);
});

Deno.test("durationBounds — tableau avec hi manquant → hi=lo", () => {
  assertEquals(durationBounds({ durationMin: [40] }), [40, 40]);
});

Deno.test("durationBounds — absent → [0,0]", () => {
  assertEquals(durationBounds({}), [0, 0]);
});

// ─── roundDuration ───────────────────────────────────────────────────────────

Deno.test("roundDuration — pas de 5 sous 120min, pas de 10 à partir de 120min", () => {
  assertEquals(roundDuration(62), 60);
  assertEquals(roundDuration(63), 65);
  assertEquals(roundDuration(119), 120);
  assertEquals(roundDuration(124), 120);
  assertEquals(roundDuration(126), 130);
});

// ─── resolveCanonicalDuration ────────────────────────────────────────────────

Deno.test("resolveCanonicalDuration — interpole entre lo/hi selon le poids de la phase", () => {
  const w = { durationMin: [40, 80] };
  assertEquals(resolveCanonicalDuration(w, "base"), 50); // 40+40*0.25=50
  assertEquals(resolveCanonicalDuration(w, "build"), 60); // 40+40*0.55=62→round5→60
  assertEquals(resolveCanonicalDuration(w, "peak"), 75); // 40+40*0.85=74→round5→75
  assertEquals(resolveCanonicalDuration(w, "taper"), 45); // 40+40*0.10=44→round5→45
});

Deno.test("resolveCanonicalDuration — durationByPhase explicite respecté et clampé dans [lo,hi]", () => {
  assertEquals(resolveCanonicalDuration({ durationMin: [40, 80], durationByPhase: { build: 65 } }, "build"), 65);
  // explicite au-dessus de hi → clampé à hi
  assertEquals(resolveCanonicalDuration({ durationMin: [40, 80], durationByPhase: { build: 120 } }, "build"), 80);
  // explicite en-dessous de lo → clampé à lo
  assertEquals(resolveCanonicalDuration({ durationMin: [40, 80], durationByPhase: { build: 10 } }, "build"), 40);
});

Deno.test("resolveCanonicalDuration — durationByPhase seul (sans durationMin) → retourné tel quel", () => {
  assertEquals(resolveCanonicalDuration({ durationByPhase: { base: 45 } }, "base"), 45);
});

Deno.test("resolveCanonicalDuration — hi<=lo (durée fixe) → roundDuration(lo)", () => {
  assertEquals(resolveCanonicalDuration({ durationMin: 62 }, "base"), 60);
});

Deno.test("resolveCanonicalDuration — aucune donnée exploitable → 0", () => {
  assertEquals(resolveCanonicalDuration({}, "base"), 0);
});

// ─── buildDurationByPhase ────────────────────────────────────────────────────

Deno.test("buildDurationByPhase — une entrée par phase avec une durée strictement positive", () => {
  assertEquals(buildDurationByPhase({ durationMin: [40, 80] }), {
    base: 50,
    build: 60,
    peak: 75,
    taper: 45,
  });
});

Deno.test("buildDurationByPhase — fiche sans données → objet vide (aucune phase à 0 incluse)", () => {
  assertEquals(buildDurationByPhase({}), {});
});

// ─── extractIntensity ────────────────────────────────────────────────────────

Deno.test("extractIntensity — zone de la part 'Main' prioritaire", () => {
  assertEquals(
    extractIntensity({ structure: [{ part: "Main", zones: ["Z3", "Z4"] }], metricKey: "fallback" }),
    "Z3",
  );
});

Deno.test("extractIntensity — pas de structure → metricKey ou null", () => {
  assertEquals(extractIntensity({ metricKey: "Z2" }), "Z2");
  assertEquals(extractIntensity({}), null);
});

Deno.test("extractIntensity — structure sans part 'Main' ou sans zones → fallback metricKey", () => {
  assertEquals(extractIntensity({ structure: [{ part: "Warmup", zones: ["Z1"] }], metricKey: "Z2" }), "Z2");
  assertEquals(extractIntensity({ structure: [{ part: "Main" }], metricKey: "Z2" }), "Z2");
});

// ─── buildDescription ────────────────────────────────────────────────────────

Deno.test("buildDescription — assemble objectif/quand/priorité/structure/variantes/notes, joints par '. '", () => {
  const w = {
    objectif: "Développer le seuil",
    when: "Phase build",
    necessite: "Haute",
    structure: [{ part: "Main", text: "3x8min seuil" }],
    variants: { a: "variante A", b: "variante B" },
    notes: "note finale",
  };
  assertEquals(
    buildDescription(w),
    "Développer le seuil. Quand: Phase build. Priorité: Haute. Main: 3x8min seuil. Variantes: a: variante A | b: variante B. note finale",
  );
});

Deno.test("buildDescription — champs absents simplement omis", () => {
  assertEquals(buildDescription({ objectif: "Seul champ" }), "Seul champ");
  assertEquals(buildDescription({}), "");
});

Deno.test("buildDescription — tronque à 2000 caractères", () => {
  const longNote = "x".repeat(2500);
  const out = buildDescription({ notes: longNote });
  assertEquals(out.length, 2000);
});
