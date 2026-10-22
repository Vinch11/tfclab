import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computePilotChunksToRun } from "./promptHelpers.ts";

/**
 * Sprint qualité Marathon/Ironman (oct. 2026) — PRÉPARATION DU PREMIER TEST
 * CONTRÔLÉ (consigne coach explicite) : mode de test EXPLICITEMENT opt-in
 * (Pilot Cockpit uniquement), permettant d'examiner les premières semaines
 * sans lancer automatiquement les chunks suivants. `computePilotChunksToRun`
 * borne la boucle de génération réelle de index.ts — jamais une simulation :
 * les chunks réellement exécutés restent une génération réelle complète.
 */

Deno.test("computePilotChunksToRun — _pilotMaxChunks absent → comportement inchangé (tous les chunks)", () => {
  assertEquals(computePilotChunksToRun(7, undefined), 7);
});

Deno.test("computePilotChunksToRun — _pilotMaxChunks=1 → limite à 1 chunk (test contrôlé 1er bloc)", () => {
  assertEquals(computePilotChunksToRun(7, 1), 1);
});

Deno.test("computePilotChunksToRun — _pilotMaxChunks supérieur au nombre réel de chunks → plafonné au nombre réel (jamais plus)", () => {
  assertEquals(computePilotChunksToRun(3, 10), 3);
});

Deno.test("computePilotChunksToRun — _pilotMaxChunks=0 → traité comme absent (0 n'est pas une limite valide, jamais 0 chunk généré silencieusement)", () => {
  assertEquals(computePilotChunksToRun(7, 0), 7);
});

Deno.test("computePilotChunksToRun — _pilotMaxChunks négatif ou non-numérique → traité comme absent, jamais une exception", () => {
  assertEquals(computePilotChunksToRun(7, -3), 7);
  assertEquals(computePilotChunksToRun(7, "beaucoup"), 7);
  assertEquals(computePilotChunksToRun(7, null), 7);
});

Deno.test("computePilotChunksToRun — _pilotMaxChunks=2 sur un plan à 7 chunks (scénario réel 10K→70.3 Tours) → 2", () => {
  assertEquals(computePilotChunksToRun(7, 2), 2);
});
