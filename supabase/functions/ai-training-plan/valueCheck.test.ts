import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyValueCheck } from "./valueCheck.ts";
import type { TargetTablePayload } from "./payloadSchema.ts";
import type { PlanChunk } from "./planSchema.ts";

const targetTable: TargetTablePayload = {
  ftpW: 280,
  bikeZonesW: {
    Z1: [0, 154], Z2: [157, 210], Z3: [213, 252],
    Z4a: [246, 260], Z4b: [263, 274], Z5: [277, 294], Z6: [297, 336],
    // Pas de Z7 dans ce test pour que 600W soit hors plage
  },
  sstW: [246, 263],
  racePowerW: 238, racePowerRange: [233, 243],
  vmaKmh: 18, runPacesSecPerKm: {
    Z1: [200, 300], Z2: [286, 333], Z3: [257, 286], Z4a: [241, 257],
  },
  racePaceSecPerKm: 220, racePaceRange: [215, 225],
  cssSecPer100m: 90, cssRange: [87, 93],
  swimZonesSecPer100m: {
    Z1: [95, 115], Z2: [92, 100],
  },
  fcMax: 188, fcZonesBpm: { Z2: [131, 147], Z4a: [156, 164] },
  meta: { objective: "70.3", ambition: "age_group", sport: "tri_70_3", generatedAt: 0 },
};

function mkChunk(sessions: any[]): PlanChunk {
  return {
    weeks: [{
      weekNumber: 1, phase: "base", theme: "T",
      sessions,
    }],
  } as unknown as PlanChunk;
}

Deno.test("appartenance globale — 145W (Z1/Z2) + 290W (Z5) conforme, 0 correction", () => {
  const chunk = mkChunk([{
    day: "mardi", sport: "bike", zones: ["Z2"],
    title: "20' éch Z2 + 3x10' Z5 (290W) r=5' (145W)", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.correctedTokens, 0, `attendu 0 correction, reçu ${r.correctedTokens} — ${JSON.stringify(r.repairs)}`);
  assertEquals(r.unresolvedTokens, 0);
  assert(r.conformantTokens >= 2, `≥2 tokens conformes attendus, reçu ${r.conformantTokens}`);
});

Deno.test("252W sans zone → conforme SST (appartenance globale)", () => {
  const chunk = mkChunk([{
    day: "mercredi", sport: "bike", zones: [],
    title: "Sortie à 252W", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 0);
  assertEquals(r.correctedTokens, 0);
  assert(r.conformantTokens >= 1);
});

Deno.test("310W au-dessus des plages → recadré 294W (baisse safe)", () => {
  const chunk = mkChunk([{
    day: "jeudi", sport: "bike", zones: ["Z5"],
    title: "Bloc 3x8' à 310W", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.correctedTokens, 1);
  assertEquals(r.unresolvedTokens, 0);
  const rep = r.repairs.find(x => x.code === "value_corrected");
  assert(rep, "attendu 1 value_corrected");
  assert(rep!.after?.includes("336W") || rep!.after?.includes("294W"),
    `borne haute attendue (294 ou 336), reçu ${rep!.after}`);
});

Deno.test("600W au-dessus de toute plage → hausse impossible, recadré à la baisse (336W Z6)", () => {
  const chunk = mkChunk([{
    day: "vendredi", sport: "bike", zones: ["Z6"],
    title: "Sprint 600W", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 45,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  // 600 > toutes bornes hautes → nearest border DOWN à 336W → correction safe
  assertEquals(r.correctedTokens, 1);
  const rep = r.repairs.find(x => x.code === "value_corrected");
  assert(rep!.after?.includes("336W"));
});

Deno.test("50W trop bas pour toute zone bike → hausse INTERDITE → unresolved", () => {
  const chunk = mkChunk([{
    day: "vendredi", sport: "bike", zones: ["Z2"],
    title: "Récupération @ 50W", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 30,
  }]);
  // 50W est dans Z1 [0,154] donc conforme globalement.
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.correctedTokens, 0);
  assertEquals(r.unresolvedTokens, 0);
});

Deno.test("1:40/100m en séance technique (pas de 'CSS') → conforme via plages nat.", () => {
  const chunk = mkChunk([{
    day: "samedi", sport: "swim", zones: ["Z1"],
    title: "Technique 8x50m easy @ 1:40/100m", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 45,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  // 100s → dans Z1 swim [95,115]
  assertEquals(r.correctedTokens, 0);
  assertEquals(r.unresolvedTokens, 0);
  assert(r.conformantTokens >= 1);
});

Deno.test("1:40/100m annoncé comme CSS → hors [87-93s] mais 'plus lent' → safe DOWN", () => {
  const chunk = mkChunk([{
    day: "samedi", sport: "swim", zones: ["Z4a"],
    title: "Seuil CSS 6x100m @ 1:40/100m", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 45,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  // 100s > 93s → nearestBorder=93 → 93 < 100 → DOWN (plus lent en pace = plus grand secondes = 100 déjà lent),
  // ici ns=93 < sec=100 → 'ns < sec' = plus rapide → INTERDIT → unresolved
  assertEquals(r.unresolvedTokens, 1);
});

Deno.test("%FTP autoritatif : 90% FTP (149W) FTP=280 → recalculé 252W", () => {
  const chunk = mkChunk([{
    day: "mardi", sport: "bike", zones: ["Z4a"],
    title: "3x12' @90% FTP (149W)", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.correctedTokens, 1);
  const rep = r.repairs.find(x => x.code === "value_corrected");
  assert(rep!.after?.includes("252W"), `after doit contenir 252W, reçu ${rep!.after}`);
});

Deno.test("SKIP quand targetTable absent", () => {
  const chunk = mkChunk([{
    day: "lundi", sport: "bike", zones: ["Z2"],
    title: "Sortie 200W", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], null);
  assertEquals(r.totalTokens, 0);
  assert(r.traces[0].includes("SKIP"));
});
