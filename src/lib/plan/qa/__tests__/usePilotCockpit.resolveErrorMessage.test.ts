import { describe, it, expect } from "vitest";
import { resolvePilotRunErrorMessage } from "../usePilotCockpit";
import type { PlanGenerationStat } from "@/lib/plan/planGenerationStats";

/**
 * Correctif coach (échec silencieux B-5K-BEGINNER, 1er run réel du Pilot
 * Cockpit) — avant ce correctif, `runProfile` affichait TOUJOURS le même
 * message générique "Aucun mergedPlan/parsedPlan récupéré (échec de
 * génération)" quelle que soit la cause réelle (déjà capturée dans le
 * `PlanGenerationStat` correspondant via `logPlanStat`, côté
 * useAITrainingPlan.ts, mais jamais transmise jusqu'à l'UI). Ces tests
 * verrouillent le nouveau comportement : la cause réelle doit apparaître.
 */
function baseStat(overrides: Partial<PlanGenerationStat>): PlanGenerationStat {
  return {
    ts: 1234,
    format: "json",
    objective: "5 KM",
    totalWeeks: 12,
    totalChunks: 3,
    durationMs: 500,
    ok: false,
    ...overrides,
  };
}

describe("resolvePilotRunErrorMessage", () => {
  it("surface le code + le message réel capturé par logPlanStat (ex. rate limit 429)", () => {
    const stat = baseStat({ errorCode: "RATE_LIMIT_429", errorMessage: "HTTP 429 — rate limit edge function." });
    expect(resolvePilotRunErrorMessage(stat)).toBe("[RATE_LIMIT_429] HTTP 429 — rate limit edge function.");
  });

  it("surface le code + le message réel pour une exception HTTP générique", () => {
    const stat = baseStat({
      errorCode: "EXCEPTION",
      errorMessage: "Erreur du service IA (HTTP 500) : internal error",
    });
    expect(resolvePilotRunErrorMessage(stat)).toBe(
      "[EXCEPTION] Erreur du service IA (HTTP 500) : internal error",
    );
  });

  it("inclut le détail Zod (zodErrorText) quand disponible, en plus du message", () => {
    const stat = baseStat({
      errorCode: "EXCEPTION",
      errorMessage: "Chunk JSON invalide côté client.",
      schemaFailDetails: { zodErrorText: "week 3: sessions[2].sport: Required" },
    });
    expect(resolvePilotRunErrorMessage(stat)).toBe(
      "[EXCEPTION] Chunk JSON invalide côté client. — week 3: sessions[2].sport: Required",
    );
  });

  it("retombe sur parseError du schemaFailDetails si errorMessage est absent", () => {
    const stat = baseStat({ errorCode: "SCHEMA_CLIENT_FAIL", errorMessage: undefined, schemaFailDetails: { parseError: "Unexpected token }" } });
    expect(resolvePilotRunErrorMessage(stat)).toBe("[SCHEMA_CLIENT_FAIL] Unexpected token }");
  });

  it("fonctionne sans errorCode (préfixe omis)", () => {
    const stat = baseStat({ errorCode: undefined, errorMessage: "Timeout (>8 min) — génération non complétée." });
    expect(resolvePilotRunErrorMessage(stat)).toBe("Timeout (>8 min) — génération non complétée.");
  });

  it("indique explicitement l'absence de détail si le stat n'a ni message ni schemaFailDetails", () => {
    const stat = baseStat({ errorCode: "EXCEPTION", errorMessage: undefined, schemaFailDetails: undefined });
    expect(resolvePilotRunErrorMessage(stat)).toBe("[EXCEPTION] cause non précisée dans planGenerationStats");
  });

  it("retombe sur le message générique, mais avec les pistes de recherche, si aucun stat n'a été capturé", () => {
    const msg = resolvePilotRunErrorMessage(undefined);
    expect(msg).toContain("Aucun mergedPlan/parsedPlan récupéré");
    expect(msg).toContain("tfcl:plan_gen_stats");
    expect(msg).toContain("ai-training-plan");
  });

  it("retombe sur le message générique si le stat trouvé est en réalité un succès (ok:true, cas défensif)", () => {
    const stat = baseStat({ ok: true, errorCode: undefined, errorMessage: undefined });
    expect(resolvePilotRunErrorMessage(stat)).toContain("Aucun mergedPlan/parsedPlan récupéré");
  });
});
