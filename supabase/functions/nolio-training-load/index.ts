// Nolio Training Load — fetches realized trainings for each linked athlete,
// extracts (date, sport_id, TSS = load_coggan || load_foster), aggregates per
// (day, sport) + a global daily total, and upserts into daily_training_load.
//
// Idempotent: re-runs upsert on unique key (athlete_id, sport, date).
//
// Body (all optional):
//   { athlete_id?: string, nolio_id?: number, days?: number, all_athletes?: boolean }
// Defaults: days=120, all_athletes=false (unless athlete_id/nolio_id both absent).
//
// Endpoints used:
//   POST https://www.nolio.io/api/token/                (refresh)
//   GET  https://www.nolio.io/api/get/training/?athlete_id=<id>&limit=200&offset=<n>
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_TRAINING_URL = "https://www.nolio.io/api/get/training/";

type SupabaseAdmin = ReturnType<typeof createClient>;
type SportBucket = "swim" | "bike" | "run" | "other" | "global";

function nolioSportIdToBucket(sportId: number | null | undefined): SportBucket {
  const id = Number(sportId);
  if (id === 19) return "swim";
  if (id === 14 || id === 18) return "bike";
  if (id === 2 || id === 52) return "run";
  return "other";
}

function pickTss(t: Record<string, unknown>): number | null {
  const cog = Number(t.load_coggan);
  if (Number.isFinite(cog) && cog > 0) return cog;
  const fos = Number(t.load_foster);
  if (Number.isFinite(fos) && fos > 0) return fos;
  return null;
}

function extractDate(t: Record<string, unknown>): string | null {
  const raw =
    (t.date_start as string | undefined) ??
    (t.date as string | undefined) ??
    (t.date_end as string | undefined) ??
    null;
  if (!raw) return null;
  const s = String(raw);
  // handle "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ssZ"
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function refreshToken(
  admin: SupabaseAdmin,
  userId: string,
  refreshTokenStr: string,
): Promise<string | null> {
  const clientSecret = Deno.env.get("NOLIO_CLIENT_SECRET");
  if (!clientSecret) return null;
  const basic = btoa(`${NOLIO_CLIENT_ID}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshTokenStr,
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
  if (!resp.ok) return null;
  const json = await resp.json().catch(() => null) as
    | { access_token?: string; refresh_token?: string; expires_in?: number }
    | null;
  if (!json?.access_token) return null;
  const newExpiresAt = new Date(
    Date.now() + (json.expires_in ?? 24 * 60 * 60) * 1000,
  ).toISOString();
  await admin.from("nolio_tokens").update({
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? refreshTokenStr,
    expires_at: newExpiresAt,
  }).eq("user_id", userId);
  return json.access_token;
}

async function refreshIfNeeded(
  admin: SupabaseAdmin,
  userId: string,
  cur: { access_token: string; refresh_token: string | null; expires_at: string | null },
): Promise<string> {
  const expiresAt = cur.expires_at ? new Date(cur.expires_at).getTime() : 0;
  if (expiresAt && expiresAt - 60_000 > Date.now()) return cur.access_token;
  if (!cur.refresh_token) return cur.access_token;
  const fresh = await refreshToken(admin, userId, cur.refresh_token);
  return fresh ?? cur.access_token;
}

async function fetchAllTrainings(opts: {
  admin: SupabaseAdmin;
  userId: string;
  nolioId: number;
  fromDate: string; // YYYY-MM-DD
  accessTokenRef: { current: string };
  refreshTokenStr: string | null;
}): Promise<{ items: Array<Record<string, unknown>>; warning?: string }> {
  const { admin, userId, nolioId, fromDate, accessTokenRef, refreshTokenStr } = opts;
  const items: Array<Record<string, unknown>> = [];
  const pageSize = 200;
  let offset = 0;
  let didRefresh = false;
  const fromMs = new Date(fromDate + "T00:00:00Z").getTime();

  for (let page = 0; page < 20; page++) {
    const url =
      `${NOLIO_TRAINING_URL}?athlete_id=${nolioId}&limit=${pageSize}&offset=${offset}&order_by=-date_start`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessTokenRef.current}`,
        Accept: "application/json",
      },
    });
    if (resp.status === 401 && !didRefresh && refreshTokenStr) {
      didRefresh = true;
      const fresh = await refreshToken(admin, userId, refreshTokenStr);
      if (fresh) {
        accessTokenRef.current = fresh;
        page--;
        continue;
      }
    }
    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (page + 1)));
      continue;
    }
    const text = await resp.text();
    if (!resp.ok) {
      return { items, warning: `HTTP ${resp.status}: ${text.slice(0, 200)}` };
    }
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* noop */ }
    const arr: Array<Record<string, unknown>> = Array.isArray(json)
      ? json as Array<Record<string, unknown>>
      : Array.isArray((json as { results?: unknown })?.results)
        ? (json as { results: Array<Record<string, unknown>> }).results
        : [];
    if (arr.length === 0) break;

    let reachedFloor = false;
    for (const t of arr) {
      const d = extractDate(t);
      if (!d) continue;
      const ms = new Date(d + "T00:00:00Z").getTime();
      if (ms < fromMs) { reachedFloor = true; continue; }
      items.push(t);
    }
    if (arr.length < pageSize || reachedFloor) break;
    offset += pageSize;
  }
  return { items };
}

function aggregate(items: Array<Record<string, unknown>>): Map<string, { tss: number; count: number }> {
  // key = `${date}|${bucket}` and `${date}|global`
  const out = new Map<string, { tss: number; count: number }>();
  for (const t of items) {
    const date = extractDate(t);
    const tss = pickTss(t);
    if (!date || tss === null) continue;
    const bucket = nolioSportIdToBucket(Number(t.sport_id ?? t.sport));
    for (const key of [`${date}|${bucket}`, `${date}|global`]) {
      const cur = out.get(key) ?? { tss: 0, count: 0 };
      cur.tss += tss;
      cur.count += 1;
      out.set(key, cur);
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestedAthleteId: string | null = null;
  let requestedNolioId: number | null = null;
  let requestedDays = 120;
  let allAthletes = false;
  try {
    if (req.method !== "GET") {
      const body = await req.clone().json().catch(() => null) as
        | { athlete_id?: string; nolio_id?: number | string; days?: number | string; all_athletes?: boolean }
        | null;
      if (body?.athlete_id) requestedAthleteId = String(body.athlete_id);
      if (body?.nolio_id != null) {
        const n = Number(body.nolio_id);
        if (Number.isFinite(n)) requestedNolioId = n;
      }
      if (body?.days != null) {
        const d = Number(body.days);
        if (Number.isFinite(d) && d > 0 && d <= 400) requestedDays = Math.floor(d);
      }
      if (body?.all_athletes === true) allAthletes = true;
    }
  } catch { /* noop */ }

  if (!requestedAthleteId && requestedNolioId == null) allAthletes = true;

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
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(jwt);
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

    const { data: tokenRow } = await admin
      .from("nolio_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!tokenRow?.access_token) {
      return new Response(JSON.stringify({ error: "Nolio non connecté" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const refreshTokenStr = (tokenRow.refresh_token as string | null) ?? null;
    const accessTokenRef = {
      current: await refreshIfNeeded(admin, userId, {
        access_token: tokenRow.access_token as string,
        refresh_token: refreshTokenStr,
        expires_at: (tokenRow.expires_at as string | null) ?? null,
      }),
    };

    let athletesQuery = admin
      .from("athletes")
      .select("id, name, nolio_id")
      .eq("coach_id", userId)
      .not("nolio_id", "is", null);
    const { data: athletes, error: athErr } = await athletesQuery;
    if (athErr) {
      return new Response(JSON.stringify({ error: "DB error athletes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let scoped = athletes ?? [];
    if (!allAthletes) {
      scoped = scoped.filter((a) =>
        (requestedAthleteId && a.id === requestedAthleteId) ||
        (requestedNolioId != null && Number(a.nolio_id) === requestedNolioId)
      );
    }

    const today = new Date();
    const fromDate = new Date(today.getTime() - requestedDays * 86400_000)
      .toISOString().slice(0, 10);

    const perAthlete: Array<{
      athlete_id: string;
      name: string | null;
      nolio_id: number;
      sessions: number;
      days: number;
      rows_upserted: number;
      warning?: string;
    }> = [];
    let totalRows = 0;

    for (const a of scoped) {
      const nolioId = Number(a.nolio_id);
      if (!Number.isFinite(nolioId)) continue;

      const { items, warning } = await fetchAllTrainings({
        admin, userId, nolioId, fromDate, accessTokenRef, refreshTokenStr,
      });

      const agg = aggregate(items);
      const payload: Array<Record<string, unknown>> = [];
      for (const [key, v] of agg.entries()) {
        const [date, sport] = key.split("|");
        payload.push({
          athlete_id: a.id,
          coach_id: userId,
          date,
          sport,
          tss: Math.round(v.tss * 100) / 100,
          session_count: v.count,
          source: "nolio",
        });
      }

      let upserted = 0;
      if (payload.length > 0) {
        // Batch upsert
        for (let i = 0; i < payload.length; i += 500) {
          const chunk = payload.slice(i, i + 500);
          const { error: upErr } = await admin
            .from("daily_training_load")
            .upsert(chunk, { onConflict: "athlete_id,sport,date" });
          if (upErr) {
            perAthlete.push({
              athlete_id: a.id, name: (a.name as string | null) ?? null,
              nolio_id: nolioId, sessions: items.length, days: 0, rows_upserted: upserted,
              warning: `upsert: ${upErr.message}`,
            });
            upserted = -1;
            break;
          }
          upserted += chunk.length;
        }
      }
      if (upserted >= 0) {
        const dayCount = new Set(payload.map((p) => p.date)).size;
        perAthlete.push({
          athlete_id: a.id,
          name: (a.name as string | null) ?? null,
          nolio_id: nolioId,
          sessions: items.length,
          days: dayCount,
          rows_upserted: upserted,
          warning,
        });
        totalRows += upserted;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      from_date: fromDate,
      days: requestedDays,
      athletes_processed: scoped.length,
      total_rows_upserted: totalRows,
      per_athlete: perAthlete,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nolio-training-load fatal", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
