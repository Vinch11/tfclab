// Sonde Nolio — MODE DIAGNOSTIC READ-ONLY
// Modes:
//   - default: liste séances planifiées sur plage de dates (limité par cap Nolio ~30)
//   - training_id: tente GET direct par ID sur plusieurs endpoints candidats
//   - paginate: itère offset/page pour dépasser le cap 30
// Body: { nolio_athlete_id?, use_current_user?, date_start?, date_end?,
//         training_id?, paginate?, order?, extra_params? }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_BASE = "https://www.nolio.io/api";
const NOLIO_GET_PLANNED_URL = `${NOLIO_BASE}/get/planned/training/`;

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
  try { json = JSON.parse(text); } catch { /* keep */ }
  return { url, status: r.status, ok: r.ok, body: json ?? text };
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
      date_start?: string;
      date_end?: string;
      training_id?: number | string;
      paginate?: boolean;
      order?: string;
      extra_params?: Record<string, string>;
      raw_all?: boolean;
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

    // MODE 1: GET direct par training_id — teste plusieurs endpoints candidats
    if (body.training_id) {
      const tid = body.training_id;
      const candidates = [
        `${NOLIO_BASE}/get/planned/training/${tid}/`,
        `${NOLIO_BASE}/get/planned/training/?id=${tid}`,
        `${NOLIO_BASE}/get/planned/training/?training_id=${tid}`,
        `${NOLIO_BASE}/get/training/${tid}/`,
        `${NOLIO_BASE}/training/${tid}/`,
        `${NOLIO_BASE}/planned/training/${tid}/`,
      ];
      const results = [];
      for (const u of candidates) {
        results.push(await tryFetch(u, token));
      }
      return new Response(JSON.stringify({ mode: "by_id", training_id: tid, attempts: results }, null, 2),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // MODE 2: pagination pour dépasser le cap
    if (body.paginate) {
      const pages: Array<{ url: string; status: number; count: number; sample_ids: unknown[] }> = [];
      const allSwim: Array<Record<string, unknown>> = [];
      const orderings = body.order ? [body.order] : ["-date", "-planned_date", "-created_at"];
      for (const order of orderings) {
        for (let offset = 0; offset < 500; offset += 50) {
          const params = new URLSearchParams({ limit: "50", offset: String(offset), order_by: order });
          if (nolioAthleteId) params.set("athlete_id", String(nolioAthleteId));
          const url = `${NOLIO_GET_PLANNED_URL}?${params.toString()}`;
          const r = await tryFetch(url, token);
          const list = Array.isArray(r.body) ? r.body : ((r.body as { results?: unknown[] })?.results ?? []);
          const arr = list as Array<Record<string, unknown>>;
          pages.push({ url, status: r.status, count: arr.length, sample_ids: arr.slice(0, 3).map((t) => t.id ?? t.pk) });
          for (const t of arr) {
            const sid = t.sport_id ?? t.sport ?? null;
            const name = String(t.name ?? "").toLowerCase();
            if (sid === 19 || name.includes("nat") || name.includes("css") || name.includes("s2r") || name.includes("start to run") || name.includes("[test]") || name.includes("[probe]")) {
              allSwim.push(t);
            }
          }
          if (arr.length === 0) break;
        }
      }
      // dédup par id
      const byId = new Map<unknown, Record<string, unknown>>();
      for (const t of allSwim) byId.set(t.id ?? t.pk ?? JSON.stringify(t), t);
      const uniqueSwim = Array.from(byId.values());
      return new Response(JSON.stringify({ mode: "paginate", matched_count: uniqueSwim.length, matched_trainings_raw: uniqueSwim }, null, 2),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // MODE default: liste sur plage
    const dateStart = body.date_start ?? "2026-07-01";
    const dateEnd = body.date_end ?? "2026-07-31";
    const params = new URLSearchParams({ from: dateStart, to: dateEnd, limit: "100" });
    if (nolioAthleteId) params.set("athlete_id", String(nolioAthleteId));
    if (body.extra_params) for (const [k, v] of Object.entries(body.extra_params)) params.set(k, v);
    const url = `${NOLIO_GET_PLANNED_URL}?${params.toString()}`;
    const r = await tryFetch(url, token);
    const list = Array.isArray(r.body) ? r.body : ((r.body as { results?: unknown[] })?.results ?? []);
    const arr = list as Array<Record<string, unknown>>;
    const swim = arr.filter((t) => {
      const sid = t.sport_id ?? t.sport ?? null;
      const name = String(t.name ?? "").toLowerCase();
      return sid === 19 || name.includes("nat") || name.includes("[test]") || name.includes("css") || name.includes("[probe]");
    });
    return new Response(JSON.stringify({
      mode: "list",
      ok: r.ok, status: r.status,
      nolio_athlete_id: nolioAthleteId,
      date_range: { start: dateStart, end: dateEnd },
      url,
      total_returned: arr.length,
      all_ids_sample: arr.slice(0, 40).map((t) => ({ id: t.id ?? t.pk, name: t.name, sport_id: t.sport_id, date: t.date ?? t.planned_date })),
      swim_count: swim.length,
      swim_trainings_raw: swim,
      raw_all: body.raw_all ? arr : undefined,
    }, null, 2), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
