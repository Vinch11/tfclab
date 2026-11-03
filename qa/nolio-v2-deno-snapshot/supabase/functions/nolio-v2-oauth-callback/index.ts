/**
 * Callback OAuth Nolio V2 (QA). Sans JWT : appelé par le navigateur au retour
 * de Nolio. Sécurité = state 256 bits (digest), TTL, consommation unique
 * atomique. Redirige UNIQUEMENT vers la route QA fixe avec un code d'issue
 * énuméré ; aucun code/jeton/erreur distante dans la redirection ni les logs.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCallback, qaBackendOk, returnLocation } from "../_shared/nolioV2/oauth.ts";
import { supabaseOAuthStore } from "../_shared/nolioV2/oauthStoreSupabase.ts";

const redirect = (location: string) => new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("method_not_allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey || !qaBackendOk(url)) return redirect(returnLocation("invalid_request"));
  const store = supabaseOAuthStore(createClient(url, serviceKey));
  const r = await handleCallback({
    query: new URL(req.url).searchParams, store, now: Date.now(),
    env: { clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: url },
    fetch: async (u, i) => { const res = await fetch(u, i); return { status: res.status, json: () => res.json() }; },
  });
  console.log(JSON.stringify({ fn: "nolio-v2-oauth-callback", outcome: r.outcome }));
  return redirect(r.location);
});
