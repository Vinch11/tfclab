/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Prévisualisation GitHub Pages "strictement consultative" — PRÉPARATION
 * PILOT COCKPIT 10K→70.3 Tours (consigne coach explicite, branche dédiée
 * preview/pilot-cockpit-readonly — PAS la branche PR #389, jamais fusionné).
 * ═══════════════════════════════════════════════════════════════════════════════
 * Patch GLOBAL et additif de `window.fetch`, actif UNIQUEMENT si la variable
 * d'environnement de build `VITE_PREVIEW_READONLY` vaut "1" — jamais en dev
 * local, jamais en CI, jamais dans le build Lovable/production : ces
 * environnements ne posent jamais cette variable, donc ce fichier n'a
 * STRICTEMENT AUCUN effet en dehors de ce build de prévisualisation dédié.
 *
 * Pourquoi patcher `fetch` plutôt que chaque appelant individuellement :
 * `supabase.functions.invoke(...)` (utilisé par la plupart des fonctions IA
 * de l'app) et les appels directs `fetch(PLAN_URL, ...)` (ai-training-plan)
 * aboutissent TOUS à une requête HTTP vers
 * `${VITE_SUPABASE_URL}/functions/v1/<nom-fonction>` — intercepter à ce
 * niveau unique couvre les deux mécanismes sans modifier aucun des ~10
 * fichiers métier concernés, et ne peut pas être oublié si un nouvel appel
 * IA est ajouté plus tard sur cette branche de prévisualisation.
 */

/** Fonctions Edge qui appellent réellement Gemini via le Lovable AI Gateway
 *  (vérifié : présence de LOVABLE_API_KEY/gemini dans leur code source,
 *  supabase/functions/*\/index.ts) — jamais une fonction de données pures
 *  (nolio-*, sync-workouts-library, etc.), dont le comportement reste
 *  inchangé pour ne pas casser la navigation normale de la prévisualisation. */
const AI_GENERATION_FUNCTIONS = [
  "ai-training-plan",
  "ai-coaching",
  "assistant-chat",
  "race-readiness-message",
  "profile-audit-ai",
  "literature-search",
  "auto-extract-recent-literature",
  "extract-literature-cohort",
  "nolio-batch-generate",
] as const;

export class PreviewReadOnlyBlockedError extends Error {
  constructor(matchedFunction: string) {
    super(
      `Génération IA désactivée dans cette prévisualisation de consultation (fonction "${matchedFunction}"). ` +
      `Build de test GitHub Pages — aucun appel réel n'a été envoyé, aucun coût engagé.`
    );
    this.name = "PreviewReadOnlyBlockedError";
  }
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Idempotent — un second appel (ex. hot-reload en préparation locale) ne repatch pas deux fois. */
let installed = false;

export function installPreviewReadOnlyGuard(): void {
  if (installed) return;
  if (import.meta.env.VITE_PREVIEW_READONLY !== "1") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveUrl(input);
    const matched = AI_GENERATION_FUNCTIONS.find((fn) => url.includes(`/functions/v1/${fn}`));
    if (matched) {
      // eslint-disable-next-line no-console
      console.warn(`[prévisualisation lecture seule] appel IA bloqué avant envoi : ${url}`);
      return Promise.reject(new PreviewReadOnlyBlockedError(matched));
    }
    return originalFetch(input, init);
  }) as typeof window.fetch;
}
