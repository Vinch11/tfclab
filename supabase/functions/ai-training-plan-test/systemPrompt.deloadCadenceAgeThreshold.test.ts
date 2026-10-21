import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getSystemPrompt } from "./systemPrompt.ts";

/**
 * Bug réel corrigé (audit "système de périodisation") : le prompt mentionne
 * la cadence de décharge liée à l'âge (2:1 au lieu de 3:1) à plusieurs
 * endroits. Deux occurrences disaient "≥40 ans" — cohérent avec le moteur de
 * quotas réel (sessionSizingMatrix.ts: `athleteAge >= 40`, fixé lors de
 * l'audit F1) — mais la section "MICRO-CYCLE UNDULATING" disait encore
 * "45 ans", un reliquat de cet audit qui n'avait pas couvert cette 3e
 * occurrence. Un athlète de 42 ans aurait donc reçu deux consignes
 * contradictoires sur sa propre cadence de décharge dans le même prompt.
 */
Deno.test("getSystemPrompt — aucune occurrence de l'ancien seuil erroné '45 ans' pour la cadence de décharge", () => {
  const prompt = getSystemPrompt({ objective: "Marathon" });
  assert(!prompt.includes("45 ans"), "le seuil erroné '45 ans' ne doit plus apparaître (aligné sur 40 ans partout)");
});
