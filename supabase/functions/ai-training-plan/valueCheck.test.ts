import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyValueCheck } from "./valueCheck.ts";
import type { TargetTablePayload } from "./payloadSchema.ts";
import type { PlanChunk } from "./planSchema.ts";

const targetTable: TargetTablePayload = {
  ftpW: 280,
  bikeZonesW: {},
  sstW: null,
  racePowerW: null, racePowerRange: null,
  vmaKmh: 18,
  runPacesSecPerKm: {},
  racePaceSecPerKm: null, racePaceRange: null,
  cssSecPer100m: 90, cssRange: [87, 93],
  swimZonesSecPer100m: {},
  fcMax: 188, fcZonesBpm: {},
  meta: { objective: "70.3", ambition: "age_group", sport: "tri_70_3", generatedAt: 0 },
};

function mkChunk(sessions: any[]): PlanChunk {
  return {
    weeks: [{ weekNumber: 1, phase: "base", theme: "T", sessions }],
  } as unknown as PlanChunk;
}

Deno.test("watts → %FTP (relativisation univoque)", () => {
  const chunk = mkChunk([{
    day: "mardi", sport: "bike", zones: ["Z4a"],
    title: "3x12' à 252W", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 0);
  assertEquals(r.residualAbsoluteTokens, 0);
  assert(r.relativizedTokens >= 1);
  // 252/280 = 90% → Z4a range 88-93
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assert(rep!.after?.includes("90% FTP"), `attendu 90% FTP, reçu ${rep!.after}`);
});

Deno.test("watts range 200-220W → 71-79% FTP", () => {
  const chunk = mkChunk([{
    day: "mardi", sport: "bike", zones: ["Z2"],
    title: "Endurance 200-220W", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 90,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 0);
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assert(rep!.after?.includes("% FTP"), `attendu % FTP, reçu ${rep!.after}`);
});

Deno.test("watts absurde (600W) → 214% FTP hors grille → unresolved", () => {
  const chunk = mkChunk([{
    day: "vendredi", sport: "bike", zones: ["Z7"],
    title: "Sprint 600W", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 45,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  // 600/280 = 214% → dans Z7 [150,300] → conforme
  assertEquals(r.unresolvedTokens, 0);
  assert(r.relativizedTokens >= 1);
});

Deno.test("pace /km → zone (univoque)", () => {
  const chunk = mkChunk([{
    day: "mercredi", sport: "run", zones: ["Z2"],
    title: "Endurance 5:30/km", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  // 5:30/km = 10.9 km/h; VMA=18 → 60.6% → Z2 [60,70]
  assertEquals(r.unresolvedTokens, 0);
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assert(rep!.after === "Z2", `attendu Z2, reçu ${rep!.after}`);
});

Deno.test("1:40/100m avec 'CSS' dans contexte → CSS+10s", () => {
  const chunk = mkChunk([{
    day: "samedi", sport: "swim", zones: ["Z4a"],
    title: "Seuil CSS 6x100m @ 1:40/100m", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 45,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 0);
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assert(rep!.after?.startsWith("CSS+") || rep!.after === "CSS", `attendu CSS±… reçu ${rep!.after}`);
});

Deno.test("1:40/100m sans contexte CSS → unresolved (pas de zones swim canoniques)", () => {
  const chunk = mkChunk([{
    day: "samedi", sport: "swim", zones: ["Z1"],
    title: "Technique 8x50m @ 1:40/100m", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 45,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 1);
  assert(r.residualAbsoluteTokens >= 1);
});

Deno.test("relatif : Z4A canonicalisé en Z4a, %FTP hors bornes → unresolved", () => {
  const chunk = mkChunk([{
    day: "jeudi", sport: "bike", zones: ["Z4a"],
    title: "3x10' Z4A à 350% FTP", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  // 350% > 300 → unresolved
  assertEquals(r.unresolvedTokens, 1);
  // La zone Z4A doit être canonicalisée en Z4a
  const s = r.chunks[0].weeks[0].sessions[0];
  assert((s.title as string).includes("Z4a"), `Z4A → Z4a attendu, reçu "${s.title}"`);
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
