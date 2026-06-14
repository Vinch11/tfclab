// Nolio List Athletes — retourne la liste brute des athlètes Nolio du coach.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_ATHLETES_URL = "https://www.nolio.io/api/get/athletes/?wants_coach=false&limit=300";

async function refreshIfNeeded(
  admin: ReturnType<typeof createClient>,
  userId: string,
  currentToken: { access_token: string; refresh_token: string | null; expires_at: string | null },
): Promise<string> {
  const expiresAt = currentToken.expires_at ? new Date(currentToken.expires_at).getTime() : 0;
  if (expiresAt && expiresAt - 60_000 > Date.now()) return currentToken.access_token;
  if (!currentToken.refresh_token) return currentToken.access_token;
  const clientSecret = Deno.env.get("NOLIO_CLIENT_SECRET");
  if (!clientSecret) return currentToken.access_token;
  const basic = btoa(`${NOLIO_CLIENT_ID}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: currentToken.refresh_token,
  });
  const resp = await fetch(NOLIO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  if (!resp.ok) return currentToken.access_token;
  const json = await resp.json().catch(() => null) as
    | { access_token?: string; refresh_token?: string; expires_in?: number }
    | null;
  if (!json?.access_token) return currentToken.access_token;
  const newExpiresAt = new Date(Date.now() + (json.expires_in ?? 86400) * 1000).toISOString();
  await admin
    .from("nolio_tokens")
    .update({
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? currentToken.refresh_token,
      expires_at: newExpiresAt,
    })
    .eq("user_id", userId);
  return json.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(jwt);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: tokenRow } = await admin
      .from("nolio_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!tokenRow?.access_token) {
      return new Response(JSON.stringify({ error: "Nolio non connecté" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accessToken = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });
    const resp = await fetch(NOLIO_ATHLETES_URL, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    const text = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Nolio API error", status: resp.status, body: text.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let json: unknown;
    try { json = JSON.parse(text); } catch {
      return new Response(JSON.stringify({ error: "Réponse Nolio invalide" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const athletes = Array.isArray(json)
      ? json
      : Array.isArray((json as { results?: unknown })?.results)
        ? (json as { results: unknown[] }).results
        : [];
    return new Response(JSON.stringify({ athletes }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
