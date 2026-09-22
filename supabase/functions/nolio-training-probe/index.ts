// Sonde Nolio — SÉANCES RÉALISÉES — MODE DIAGNOSTIC READ-ONLY
//
// Objectif : voir la forme BRUTE, non réduite, de ce que renvoie l'endpoint
// des séances réalisées (`GET /api/get/training/`) — aujourd'hui
// nolio-training-load n'en extrait que { date, sport, TSS }. Cette sonde sert
// à répondre à deux questions avant de construire quoi que ce soit d'autre :
//   1) Nolio renvoie-t-il des données détaillées par séance (puissance/allure
//      moyenne et max, durée et distance réelles, FC, découpage par intervalle) ?
//   2) `id_partner` (notre clé de déduplication envoyée à la création d'une
//      séance planifiée) est-il ré-émis sur la séance réalisée correspondante,
//      ce qui permettrait de relier un résultat à la séance de test poussée ?
//
// N'écrit dans AUCUNE table. Renvoie le JSON brut de Nolio tel quel, plus un
// petit inventaire des clés présentes pour se repérer rapidement.
//
// Body: { nolio_athlete_id?: number, use_current_user?: boolean,
//         limit?: number (def 5, max 50), offset?: number, order_by?: string,
//         date_start?: string, date_end?: string, training_id?: number|string }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_BASE = "https://www.nolio.io/api";
const NOLIO_TRAINING_URL = `${NOLIO_BASE}/get/training/`;

async function refreshIfNeeded(
  admin: ReturnType<typeof createClient>,
  userId: string,
  cur: { access_token: string; refresh_token: string | null; expires_at: string | null },
): Promise<string> {
  const expiresAt = cur.expires_at ? new Date(cur.expires_at).getTime() : 0;
  if (expiresAt && expiresAt - 60_000 > Date.now()) return cur.access_token;
  if (!cur.refresh_token) return cur.access_token;
  const secret = Deno.env.get("NOLIO_CLIENT_SECRET");
  if (!secret) return cur.access_token;
  const basic = btoa(`${NOLIO_CLIENT_ID}:${secret}`);
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: cur.refresh_token });
  const resp = await fetch(NOLIO_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });
  if (!resp.ok) return cur.access_token;
  const j = await resp.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!j?.access_token) return cur.access_token;
  const newExp = new Date(Date.now() + (j.expires_in ?? 86400) * 1000).toISOString();
  await admin.from("nolio_tokens").update({
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? cur.refresh_token,
    expires_at: newExp,
  }).eq("user_id", userId);
  return j.access_token;
}

async function tryFetch(url: string, token: string) {
  const r = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  const text = await r.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* keep raw text */ }
  return { url, status: r.status, ok: r.ok, body: json ?? text };
}

/** Union des clés présentes + un exemple de valeur par clé, pour se repérer sans tout relire. */
function inventoryKeys(items: Array<Record<string, unknown>>): Record<string, unknown> {
  const inventory: Record<string, unknown> = {};
  for (const item of items) {
    for (const [k, v] of Object.entries(item)) {
      if (!(k in inventory) && v !== null && v !== undefined && v !== "") {
        inventory[k] = v;
      }
    }
  }
  return inventory;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({})) as {
      nolio_athlete_id?: number;
      use_current_user?: boolean;
      limit?: number;
      offset?: number;
      order_by?: string;
      date_start?: string;
      date_end?: string;
      training_id?: number | string;
    };
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tokenRow } = await admin.from("nolio_tokens").select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
    if (!tokenRow?.access_token) {
      return new Response(JSON.stringify({ error: "Nolio non connecté" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });

    let nolioAthleteId = body.use_current_user ? undefined : body.nolio_athlete_id;
    if (!body.use_current_user && !nolioAthleteId) {
      const { data: ath } = await admin.from("athletes").select("nolio_id").eq("coach_id", userId).not("nolio_id", "is", null).limit(1).maybeSingle();
      nolioAthleteId = ath?.nolio_id as number | undefined;
    }

    // MODE 1 : GET direct par id de séance réalisée — teste plusieurs formes candidates.
    if (body.training_id) {
      const tid = body.training_id;
      const candidates = [
        `${NOLIO_TRAINING_URL}${tid}/`,
        `${NOLIO_TRAINING_URL}?id=${tid}`,
        `${NOLIO_TRAINING_URL}?training_id=${tid}`,
      ];
      const results = [];
      for (const u of candidates) results.push(await tryFetch(u, token));
      return new Response(JSON.stringify({ mode: "by_id", training_id: tid, attempts: results }, null, 2),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // MODE default : liste des dernières séances réalisées, JSON brut + inventaire des clés.
    const limit = Math.min(Math.max(body.limit ?? 5, 1), 50);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(body.offset ?? 0),
      order_by: body.order_by ?? "-date_start",
    });
    if (nolioAthleteId) params.set("athlete_id", String(nolioAthleteId));
    if (body.date_start) params.set("date_start", body.date_start);
    if (body.date_end) params.set("date_end", body.date_end);
    const url = `${NOLIO_TRAINING_URL}?${params.toString()}`;
    const r = await tryFetch(url, token);
    const list = Array.isArray(r.body) ? r.body : ((r.body as { results?: unknown[] })?.results ?? []);
    const arr = list as Array<Record<string, unknown>>;

    return new Response(JSON.stringify({
      mode: "list",
      ok: r.ok,
      status: r.status,
      nolio_athlete_id: nolioAthleteId,
      url,
      total_returned: arr.length,
      has_id_partner_field: arr.some((t) => "id_partner" in t),
      key_inventory_with_sample_values: inventoryKeys(arr),
      raw_items: arr,
    }, null, 2), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
