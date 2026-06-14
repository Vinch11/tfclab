// Nolio Sync — récupère les athlètes Nolio du coach et renseigne `athletes.nolio_id`.
// Endpoints officiels (slash final obligatoire) :
//   - GET https://www.nolio.io/api/get/athletes/?wants_coach=false
// /get/training/ et /get/metric/ ne sont pas encore appelés (autorisation en cours).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_ATHLETES_URL = "https://www.nolio.io/api/get/athletes/?wants_coach=false";

type NolioAthlete = {
  nolio_id: number;
  name?: string;
  teams?: unknown[];
};

function normName(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
}

async function refreshIfNeeded(
  admin: ReturnType<typeof createClient>,
  userId: string,
  currentToken: { access_token: string; refresh_token: string | null; expires_at: string | null },
): Promise<string> {
  const expiresAt = currentToken.expires_at ? new Date(currentToken.expires_at).getTime() : 0;
  const skewMs = 60_000;
  if (expiresAt && expiresAt - skewMs > Date.now()) return currentToken.access_token;
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

  const newExpiresAt = new Date(
    Date.now() + (json.expires_in ?? 24 * 60 * 60) * 1000,
  ).toISOString();
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(jwt);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Récupère le token Nolio
    const { data: tokenRow, error: tokErr } = await admin
      .from("nolio_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (tokErr) {
      console.error("nolio-sync token select error", tokErr);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!tokenRow?.access_token) {
      return new Response(
        JSON.stringify({ error: "Nolio non connecté" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const accessToken = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });

    // 2) Appelle l'API Nolio — athlètes du coach
    const nolioResp = await fetch(NOLIO_ATHLETES_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    const nolioText = await nolioResp.text();
    if (!nolioResp.ok) {
      console.error("nolio athletes fetch failed", nolioResp.status, nolioText);
      await admin.from("nolio_sync_log").insert({
        user_id: userId,
        athletes_count: 0,
        status: "error",
        error_message: `Nolio API ${nolioResp.status}: ${nolioText.slice(0, 500)}`,
      });
      return new Response(
        JSON.stringify({
          error: "Échec de l'appel à l'API Nolio",
          status: nolioResp.status,
          body: nolioText.slice(0, 500),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let nolioJson: unknown;
    try {
      nolioJson = JSON.parse(nolioText);
    } catch {
      await admin.from("nolio_sync_log").insert({
        user_id: userId,
        athletes_count: 0,
        status: "error",
        error_message: "Réponse Nolio non-JSON",
      });
      return new Response(JSON.stringify({ error: "Réponse Nolio invalide" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // L'API renvoie un tableau d'objets { nolio_id, name, teams }
    const nolioAthletes: NolioAthlete[] = Array.isArray(nolioJson)
      ? (nolioJson as NolioAthlete[])
      : Array.isArray((nolioJson as { results?: unknown })?.results)
        ? ((nolioJson as { results: NolioAthlete[] }).results)
        : [];

    // 3) Charge les athlètes existants du coach
    const { data: existing, error: athErr } = await admin
      .from("athletes")
      .select("id, name, nolio_id")
      .eq("coach_id", userId);

    if (athErr) {
      console.error("nolio-sync athletes select", athErr);
      return new Response(JSON.stringify({ error: "DB error athletes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const byNolioId = new Map<number, typeof existing[number]>();
    const byName = new Map<string, typeof existing[number]>();
    for (const a of existing ?? []) {
      if (a.nolio_id != null) byNolioId.set(Number(a.nolio_id), a);
      const n = normName(a.name);
      if (n) byName.set(n, a);
    }

    let updated = 0;
    const errors: string[] = [];

    for (const na of nolioAthletes) {
      try {
        const nolioId = typeof na.nolio_id === "number" ? na.nolio_id : Number(na.nolio_id);
        if (!Number.isFinite(nolioId)) continue;
        const name = (na.name ?? "").trim();

        const match =
          byNolioId.get(nolioId) ||
          (name ? byName.get(normName(name)) : undefined) ||
          null;

        if (!match) continue;
        if (match.nolio_id === nolioId) continue; // déjà à jour

        const { error: upErr } = await admin
          .from("athletes")
          .update({ nolio_id: nolioId })
          .eq("id", match.id);
        if (upErr) {
          errors.push(`update ${match.id}: ${upErr.message}`);
        } else {
          updated += 1;
        }
      } catch (e) {
        errors.push((e as Error).message);
      }
    }

    const status = errors.length === 0 ? "success" : (updated > 0 ? "partial" : "error");

    await admin.from("nolio_sync_log").insert({
      user_id: userId,
      athletes_count: updated,
      status,
      error_message: errors.length ? errors.slice(0, 5).join(" | ").slice(0, 1000) : null,
    });

    return new Response(
      JSON.stringify({
        ok: status !== "error",
        athletes_count: updated,
        updated,
        received: nolioAthletes.length,
        status,
        errors: errors.slice(0, 5),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("nolio-sync fatal", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
