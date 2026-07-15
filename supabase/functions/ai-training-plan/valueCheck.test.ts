import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyValueCheck } from "./valueCheck.ts";
import type { TargetTablePayload } from "./payloadSchema.ts";
import type { PlanChunk } from "./planSchema.ts";

const targetTable: TargetTablePayload = {
  ftpW: 280,
  bikeZonesW: {},
  sstW: null,
  racePowerW: 245, racePowerRange: null,
  vmaKmh: 18,
  runPacesSecPerKm: {},
  // racePace 4:04/km = 244s
  racePaceSecPerKm: 244, racePaceRange: null,
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

Deno.test("watts → %FTP (relativisation univoque, semi-ouvert)", () => {
  const chunk = mkChunk([{
    day: "mardi", sport: "bike", zones: ["Z4a"],
    title: "3x12' à 252W", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 0);
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assert(rep!.after?.includes("90% FTP"), `attendu 90% FTP, reçu ${rep!.after}`);
});

Deno.test("watts absurde (600W) → 214% FTP → gap_mapped (dans Z7 [150,300])", () => {
  const chunk = mkChunk([{
    day: "vendredi", sport: "bike", zones: ["Z7"],
    title: "Sprint 600W", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 45,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 0);
  assert(r.relativizedTokens >= 1);
});

Deno.test("règle 3 : puissance ±3W de racePower → @ puissance course", () => {
  const chunk = mkChunk([{
    day: "samedi", sport: "bike", zones: ["Z4a"],
    title: "60' à 246W", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assertEquals(rep!.after, "@ puissance course");
});

Deno.test("règle 3 : allure ±3s de racePace (4:04/km) → @ allure course", () => {
  const chunk = mkChunk([{
    day: "dimanche", sport: "run", zones: ["Z4a"],
    title: "10km @ 4:04/km", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 50,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assertEquals(rep!.after, "@ allure course");
});

Deno.test("pace 5:30/km → Z2 (semi-ouvert, hors race)", () => {
  const chunk = mkChunk([{
    day: "mercredi", sport: "run", zones: ["Z2"],
    title: "Endurance 5:30/km", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 0);
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assert(rep!.after === "Z2", `attendu Z2, reçu ${rep!.after}`);
});

Deno.test("règle 2 : trou de grille %VMA 93% → gap_mapped Z5 (pas unresolved)", () => {
  // 93% VMA = 16.74 km/h → 3600/16.74 ≈ 3:35/km. Choisir un pace produisant 93%.
  // pace = 3600/(0.93*18) = 215s = 3:35
  const chunk = mkChunk([{
    day: "jeudi", sport: "run", zones: ["Z5"],
    title: "6x800m @ 3:35/km", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 0);
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assert(rep!.reason.includes("gap_mapped"), `attendu gap_mapped, reçu ${rep!.reason}`);
});

Deno.test("règle 4 : /100m swim sans 'CSS' → CSS±Xs quand même", () => {
  // 1:34/100m = 94s ; CSS=90 → +4s
  const chunk = mkChunk([{
    day: "samedi", sport: "swim", zones: ["Z1"],
    title: "Technique 8x50m @ 1:34/100m", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 45,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 0);
  const rep = r.repairs.find(x => x.code === "value_relativized");
  assertEquals(rep!.after, "CSS+4s");
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
  assertEquals(rep!.after, "CSS+10s");
});

Deno.test("relatif : Z4A canonicalisé en Z4a, %FTP hors bornes → unresolved", () => {
  const chunk = mkChunk([{
    day: "jeudi", sport: "bike", zones: ["Z4a"],
    title: "3x10' Z4A à 350% FTP", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 1);
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
