import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { applyReconciler } from "./jsonPlanHandler.ts";

/**
 * Audit "traitement des limiteurs" (coach, sept. 2026) : l'insertion d'une
 * séance manquante (sous-partie (b) d'applyReconciler) ne ciblait que le
 * limiteur #1 (`identifiedLimiters[0]`) — un athlète avec 3-4 limiteurs
 * classés (cas courant : VO2max, VLamax, Économie, Durabilité) laissait
 * L2/L3/L4 sans AUCUN ciblage mécanique, alors même que la matrice de
 * périodisation (systemPrompt.ts) attend une séance clé dédiée pour L2 dès
 * la Phase Base. Ces tests vérifient que le rang du meilleur limiteur
 * matché (toute la liste, pas seulement l'indice 0) prime désormais sur la
 * simple proximité de durée.
 */

const RUN_QUOTA = {
  quota: {
    swim: { min: 0, max: 0 }, bike: { min: 0, max: 0 }, run: { min: 1, max: 5 },
    brick: { min: 0, max: 1 }, strength: { min: 0, max: 0 },
    totalSessions: { min: 1, max: 10 }, maxSessionsPerDay: 2, minFullRestDays: 0,
  },
  weekType: "load",
};

// Candidat générique, sans vocabulaire de limiteur, mais PLUS proche du
// targetDur=60 (médiane 55, delta=5) que le candidat "seuil long" (médiane
// 48, delta=12) — sans ciblage limiteur, c'est LUI qui serait choisi.
const DUMP_GENERIC_CLOSER_PLUS_L2_MATCH = `#### Course
| ID | Cat | Titre | Phase | Durée | Structure |
| RUN_GENERIC_EASY | A | Footing tranquille | Base | 45-65 | endurance Z2 aisance |
| RUN_SEUIL_LONG | A | Seuil long | Base | 40-55 | Seuil long continu Z3 |
`;

function mkChunk(weekNumber: number, sessions: any[]): any {
  return { weeks: [{ weekNumber, phase: "build", theme: "Test", sessions }] };
}

Deno.test("applyReconciler (insert) — limiteur #2 (pas #1) ciblé prioritairement sur la proximité de durée", () => {
  const chunk = mkChunk(1, []);
  const identifiedLimiters = [
    "🔴 Limiteur #1 — VO2max bas",
    "🟡 Limiteur #2 — VLamax trop haute",
    "🟡 Limiteur #3 — Économie basse",
  ];

  const { chunks: out, repairs } = applyReconciler(
    [chunk],
    { 1: RUN_QUOTA },
    [DUMP_GENERIC_CLOSER_PLUS_L2_MATCH],
    identifiedLimiters,
  );

  const runSession = out[0].weeks[0].sessions.find((s: any) => s.sport === "run");
  assert(runSession, "une séance run doit avoir été insérée");
  assertEquals(runSession.catalogId, "RUN_SEUIL_LONG", "le candidat ciblant L2 (VLamax) doit primer sur le candidat générique plus proche en durée");

  const repair = repairs.find(r => r.code === "session_inserted" && r.sport === "run");
  assert(repair, "repair session_inserted attendu");
  assert(repair!.reason.includes("cible le limiteur L2"), `la raison doit mentionner L2, reçu: "${repair!.reason}"`);
});

Deno.test("applyReconciler (insert) — sans limiteur identifié, comportement d'origine préservé (proximité de durée seule)", () => {
  const chunk = mkChunk(1, []);

  const { chunks: out } = applyReconciler(
    [chunk],
    { 1: RUN_QUOTA },
    [DUMP_GENERIC_CLOSER_PLUS_L2_MATCH],
    null,
  );

  const runSession = out[0].weeks[0].sessions.find((s: any) => s.sport === "run");
  assert(runSession, "une séance run doit avoir été insérée");
  assertEquals(runSession.catalogId, "RUN_GENERIC_EASY", "sans limiteur, le candidat le plus proche en durée doit être choisi (non-régression)");
});

Deno.test("applyReconciler (insert) — un seul limiteur (L1) : comportement historique inchangé", () => {
  const chunk = mkChunk(1, []);

  const { chunks: out, repairs } = applyReconciler(
    [chunk],
    { 1: RUN_QUOTA },
    [DUMP_GENERIC_CLOSER_PLUS_L2_MATCH],
    ["Limiteur #1 — VLamax trop haute"],
  );

  const runSession = out[0].weeks[0].sessions.find((s: any) => s.sport === "run");
  assert(runSession, "une séance run doit avoir été insérée");
  assertEquals(runSession.catalogId, "RUN_SEUIL_LONG");
  const repair = repairs.find(r => r.code === "session_inserted" && r.sport === "run");
  assert(repair, "repair session_inserted attendu");
  assert(repair.reason.includes("cible le limiteur L1"));
});
