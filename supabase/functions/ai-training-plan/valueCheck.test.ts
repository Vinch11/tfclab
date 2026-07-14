import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyValueCheck } from "./valueCheck.ts";
import type { TargetTablePayload } from "./payloadSchema.ts";
import type { PlanChunk } from "./planSchema.ts";

const targetTable: TargetTablePayload = {
  ftpW: 280,
  bikeZonesW: {
    Z1: [0, 154], Z2: [157, 210], Z3: [213, 252],
    Z4a: [246, 260], Z4b: [263, 274], Z5: [277, 294], Z6: [297, 336], Z7: [420, 840],
  },
  sstW: [246, 263],
  racePowerW: 238, racePowerRange: [233, 243],
  vmaKmh: 18, runPacesSecPerKm: {
    Z1: [200, 300], Z2: [286, 333], Z3: [257, 286], Z4a: [241, 257],
  },
  racePaceSecPerKm: 220, racePaceRange: [215, 225],
  cssSecPer100m: 90, cssRange: [87, 93],
  swimZonesSecPer100m: {},
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

Deno.test("value_corrected — 3x12' @90% FTP (149W) → recalculé à 252W", () => {
  const chunk = mkChunk([{
    day: "mardi", sport: "bike", zones: ["Z4a"],
    title: "3x12' @90% FTP (149W)", details: "",
    isKeySession: true, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.correctedTokens, 1);
  assertEquals(r.unresolvedTokens, 0);
  const rep = r.repairs.find(x => x.code === "value_corrected");
  assert(rep, "attendu 1 value_corrected");
  assert(rep!.after?.includes("252W"), `after doit contenir 252W, reçu ${rep!.after}`);
  assert(!r.chunks[0].weeks[0].sessions[0].title.includes("149W"));
});

Deno.test("conforme — Z2 (200-220W) ne déclenche aucun repair", () => {
  const chunk = mkChunk([{
    day: "lundi", sport: "bike", zones: ["Z2"],
    title: "Endurance Z2 (200-220W)", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 90,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.correctedTokens, 0);
  assertEquals(r.unresolvedTokens, 0);
  assert(r.conformantTokens >= 2, `conforme attendu ≥2, reçu ${r.conformantTokens}`);
});

Deno.test("value_unresolved — @122W sans zone ni %FTP", () => {
  const chunk = mkChunk([{
    day: "mercredi", sport: "bike", zones: [],
    title: "Sortie @122W libre", details: "",
    isKeySession: false, custom: true, catalogId: null, durationMin: 60,
  }]);
  const r = applyValueCheck([chunk], targetTable);
  assertEquals(r.unresolvedTokens, 1);
  const rep = r.repairs.find(x => x.code === "value_unresolved");
  assert(rep, "attendu 1 value_unresolved");
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
