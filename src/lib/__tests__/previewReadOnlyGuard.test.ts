import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Sprint qualité Marathon/Ironman (oct. 2026) — PRÉPARATION PILOT COCKPIT,
 * vérification finale avant publication (consigne coach explicite) :
 *
 *   1. Le garde bloque bien, en conditions réelles (pas seulement en
 *      lecture de code), les 9 fonctions Edge qui appellent réellement
 *      Gemini — pour les DEUX mécanismes d'appel utilisés dans l'app :
 *      `fetch(URL, ...)` direct ET `supabase.functions.invoke(...)`.
 *   2. Il ne bloque PAS les opérations normales (fonctions de données
 *      pures, REST, Auth) — la navigation de prévisualisation reste
 *      fonctionnelle.
 *   3. Hors build de prévisualisation (VITE_PREVIEW_READONLY absent),
 *      comportement strictement inchangé.
 *
 * Point technique vérifié en lisant le code source de
 * @supabase/functions-js et @supabase/supabase-js (node_modules) avant
 * d'écrire ce test, pas supposé : `resolveFetch`/`fetchWithAuth` résolvent
 * l'identifiant global `fetch` PARESSEUSEMENT, à l'intérieur d'une closure
 * appelée à chaque requête — jamais une référence capturée une fois pour
 * toutes à la construction du client. Patcher `window.fetch` avant le
 * premier rendu couvre donc bien `supabase.functions.invoke(...)`, même si
 * le client Supabase a été construit (import statique) avant l'appel à
 * `installPreviewReadOnlyGuard()` dans main.tsx.
 */

const SUPABASE_URL = "https://wtwjkmawntybyehatkjo.supabase.co";
const AI_FUNCTIONS = [
  "ai-training-plan",
  "ai-coaching",
  "assistant-chat",
  "race-readiness-message",
  "profile-audit-ai",
  "literature-search",
  "auto-extract-recent-literature",
  "extract-literature-cohort",
  "nolio-batch-generate",
];

describe("previewReadOnlyGuard", () => {
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    originalFetch = window.fetch;
    vi.resetModules();
  });

  afterEach(() => {
    window.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("hors build de prévisualisation (VITE_PREVIEW_READONLY absent) : fetch n'est jamais patché", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(new Response("ok"));
    window.fetch = fakeFetch as unknown as typeof window.fetch;
    const { installPreviewReadOnlyGuard } = await import("../previewReadOnlyGuard");
    installPreviewReadOnlyGuard();
    await window.fetch(`${SUPABASE_URL}/functions/v1/ai-training-plan`);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it.each(AI_FUNCTIONS)(
    "dans le build de prévisualisation : bloque %s via fetch() direct, avant tout envoi réseau",
    async (fn) => {
      vi.stubEnv("VITE_PREVIEW_READONLY", "1");
      const fakeFetch = vi.fn().mockResolvedValue(new Response("ok"));
      window.fetch = fakeFetch as unknown as typeof window.fetch;
      const { installPreviewReadOnlyGuard, PreviewReadOnlyBlockedError } = await import("../previewReadOnlyGuard");
      installPreviewReadOnlyGuard();

      await expect(window.fetch(`${SUPABASE_URL}/functions/v1/${fn}`)).rejects.toBeInstanceOf(PreviewReadOnlyBlockedError);
      expect(fakeFetch).not.toHaveBeenCalled();
    }
  );

  it("laisse passer les fonctions de données pures (nolio-records) et les appels REST/Auth Supabase normaux", async () => {
    vi.stubEnv("VITE_PREVIEW_READONLY", "1");
    const fakeFetch = vi.fn().mockResolvedValue(new Response("ok"));
    window.fetch = fakeFetch as unknown as typeof window.fetch;
    const { installPreviewReadOnlyGuard } = await import("../previewReadOnlyGuard");
    installPreviewReadOnlyGuard();

    const allowed = [
      `${SUPABASE_URL}/functions/v1/nolio-records`,
      `${SUPABASE_URL}/rest/v1/profiles?select=*`,
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    ];
    for (const url of allowed) {
      await window.fetch(url);
    }
    expect(fakeFetch).toHaveBeenCalledTimes(allowed.length);
  });

  it("couvre réellement supabase.functions.invoke(...) — pas seulement fetch() direct — pour une fonction IA (ai-coaching)", async () => {
    vi.stubEnv("VITE_PREVIEW_READONLY", "1");
    const fakeFetch = vi.fn().mockResolvedValue(new Response("ok"));
    window.fetch = fakeFetch as unknown as typeof window.fetch;
    const { installPreviewReadOnlyGuard, PreviewReadOnlyBlockedError } = await import("../previewReadOnlyGuard");
    installPreviewReadOnlyGuard();

    // Client construit APRÈS l'installation du garde ici, mais le point
    // vérifié (cf. docstring) est que l'ordre n'a de toute façon aucune
    // importance : resolveFetch/fetchWithAuth ne capturent jamais `fetch`
    // à la construction.
    const client = createClient(SUPABASE_URL, "fake-anon-key-for-test");
    const { error } = await client.functions.invoke("ai-coaching", { body: { message: "test" } });

    // FunctionsClient enveloppe l'erreur fetch dans sa propre
    // FunctionsFetchError (voir @supabase/functions-js) — l'erreur du garde
    // reste accessible via `.context`, preuve que le blocage a bien eu
    // lieu AVANT tout envoi réseau, pas une erreur HTTP classique.
    expect(error).toBeTruthy();
    expect((error as { context?: unknown })?.context).toBeInstanceOf(PreviewReadOnlyBlockedError);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it("supabase.functions.invoke(...) reste fonctionnel pour une fonction non-IA (nolio-records) dans le build de prévisualisation", async () => {
    vi.stubEnv("VITE_PREVIEW_READONLY", "1");
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } })
    );
    window.fetch = fakeFetch as unknown as typeof window.fetch;
    const { installPreviewReadOnlyGuard } = await import("../previewReadOnlyGuard");
    installPreviewReadOnlyGuard();

    const client = createClient(SUPABASE_URL, "fake-anon-key-for-test");
    const { error } = await client.functions.invoke("nolio-records", { body: {} });

    expect(error).toBeNull();
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
});
