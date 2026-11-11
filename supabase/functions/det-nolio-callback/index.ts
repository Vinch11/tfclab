/**
 * Callback OAuth Nolio V2 (production). Sans JWT : appelé par le navigateur au
 * retour de Nolio. Sécurité = state 256 bits (digest), TTL, consommation unique
 * atomique, PKCE. Redirige UNIQUEMENT vers la page de planification de l'app
 * avec un code d'issue énuméré ; aucun code, jeton ni erreur distante dans la
 * redirection ni les journaux.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { appOriginFrom, handleCallback, returnLocation, type OAuthStore } from "../det-nolio-export/lib/oauth.ts";

const redirect = (location: string) => new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("method_not_allowed", { status: 405 });
  const appOrigin = appOriginFrom(Deno.env.get("NOLIO_V2_APP_ORIGIN"));
  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return redirect(returnLocation(appOrigin, "invalid_request"));
  const admin = createClient(url, serviceKey);
  const store: OAuthStore = {
    insertState: async () => false,
    async consumeState(digest, nowIso) {
      const { data, error } = await admin.from("det_nolio_v2_oauth_states")
        .update({ consumed_at: nowIso })
        .eq("state_digest", digest).is("consumed_at", null).gt("expires_at", nowIso)
        .select("state_digest, coach_id, pkce_verifier, expires_at");
      if (error || !Array.isArray(data) || data.length !== 1) return null;
      return data[0];
    },
    async upsertGrant(row) {
      const { data, error } = await admin.rpc("det_nolio_v2_grant_connect", {
        p_coach_id: row.coach_id, p_app_type: row.app_type, p_scopes: row.granted_scopes,
        p_user_ref: row.nolio_user_ref, p_allowed: row.allowed_athletes, p_access: row.access_token,
        p_refresh: row.refresh_token, p_expires: row.token_expires_at,
      });
      return !error && (data as { ok?: boolean } | null)?.ok === true;
    },
  };
  const r = await handleCallback({
    query: new URL(req.url).searchParams, store, now: Date.now(),
    env: { clientId: Deno.env.get("NOLIO_V2_CLIENT_ID"), clientSecret: Deno.env.get("NOLIO_V2_CLIENT_SECRET"), supabaseUrl: url, appOrigin },
    fetch: async (u, i) => { const res = await fetch(u, i); return { status: res.status, json: () => res.json() }; },
  });
  console.log(JSON.stringify({ fn: "det-nolio-callback", outcome: r.outcome }));
  return redirect(r.location);
});
