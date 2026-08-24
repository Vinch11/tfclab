// Nolio Training Load — Daily cron.
// Called by pg_cron once/day. Iterates all coaches with Nolio tokens and, for
// each of their linked athletes, refreshes the last few days (J-1 to J-3 by
// default, tolerates late syncs). Idempotent via unique (athlete_id, sport, date).
//
// Auth: shared secret. Requests must send header `x-cron-secret: <CRON_SECRET>`.
//
// Body (optional): { days?: number }  — default 4 (today + J-1/J-2/J-3).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
  const raw = (t.date_start as string | undefined) ?? (t.date as string | undefined) ?? null;
  if (!raw) return null;
  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function refreshToken(
  admin: SupabaseAdmin, userId: string, refreshTokenStr: string,
): Promise<string | null> {
  const clientSecret = Deno.env.get("NOLIO_CLIENT_SECRET");
  if (!clientSecret) return null;
  const basic = btoa(`${NOLIO_CLIENT_ID}:${clientSecret}`);
  const resp = await fetch(NOLIO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshTokenStr }).toString(),
  });
  if (!resp.ok) return null;
  const json = await resp.json().catch(() => null) as
    | { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!json?.access_token) return null;
  const newExpiresAt = new Date(Date.now() + (json.expires_in ?? 86400) * 1000).toISOString();
  await admin.from("nolio_tokens").update({
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? refreshTokenStr,
    expires_at: newExpiresAt,
  }).eq("user_id", userId);
  return json.access_token;
}

async function refreshIfNeeded(
  admin: SupabaseAdmin, userId: string,
  cur: { access_token: string; refresh_token: string | null; expires_at: string | null },
): Promise<string> {
  const expiresAt = cur.expires_at ? new Date(cur.expires_at).getTime() : 0;
  if (expiresAt && expiresAt - 60_000 > Date.now()) return cur.access_token;
  if (!cur.refresh_token) return cur.access_token;
  const fresh = await refreshToken(admin, userId, cur.refresh_token);
  return fresh ?? cur.access_token;
}

async function fetchTrainingsSince(
  accessTokenRef: { current: string },
  nolioId: number,
  fromDate: string,
): Promise<{ items: Array<Record<string, unknown>>; warning?: string }> {
  const items: Array<Record<string, unknown>> = [];
  const pageSize = 100;
  const fromMs = new Date(fromDate + "T00:00:00Z").getTime();
  for (let page = 0; page < 5; page++) {
    const url = `${NOLIO_TRAINING_URL}?athlete_id=${nolioId}&limit=${pageSize}&offset=${page * pageSize}&order_by=-date_start`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessTokenRef.current}`, Accept: "application/json" },
    });
    if (!resp.ok) {
      const t = await resp.text();
      return { items, warning: `HTTP ${resp.status}: ${t.slice(0, 160)}` };
    }
    const text = await resp.text();
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
      if (new Date(d + "T00:00:00Z").getTime() < fromMs) { reachedFloor = true; continue; }
      items.push(t);
    }
    if (arr.length < pageSize || reachedFloor) break;
  }
  return { items };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let days = 4;
  try {
    const body = await req.clone().json().catch(() => null) as { days?: number } | null;
    if (body?.days && Number.isFinite(Number(body.days))) days = Math.max(1, Math.min(30, Math.floor(Number(body.days))));
  } catch { /* noop */ }

  const startedAt = new Date().toISOString();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth: shared secret. Accept either the env `CRON_SECRET` OR the value
  // stored in Vault under `nolio_cron_secret` (read via a SECURITY DEFINER RPC).
  const providedSecret = req.headers.get("x-cron-secret") ?? "";
  const envSecret = Deno.env.get("CRON_SECRET") ?? "";
  let vaultSecret = "";
  try {
    const { data: rpcSecret } = await admin.rpc("_read_nolio_cron_secret");
    vaultSecret = (rpcSecret as string | null) ?? "";
  } catch { /* noop */ }
  const isValid = providedSecret.length > 0 &&
    ((envSecret && providedSecret === envSecret) ||
     (vaultSecret && providedSecret === vaultSecret));
  if (!isValid) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const fromDate = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const summary: {
    started_at: string;
    from_date: string;
    days: number;
    coaches: number;
    athletes_processed: number;
    rows_upserted: number;
    incidents: Array<{ user_id?: string; athlete_id?: string; nolio_id?: number; error: string }>;
  } = {
    started_at: startedAt, from_date: fromDate, days,
    coaches: 0, athletes_processed: 0, rows_upserted: 0, incidents: [],
  };

  try {
    const { data: tokens, error: tokErr } = await admin
      .from("nolio_tokens")
      .select("user_id, access_token, refresh_token, expires_at");
    if (tokErr) throw new Error(`select tokens: ${tokErr.message}`);
    summary.coaches = tokens?.length ?? 0;

    for (const tok of tokens ?? []) {
      const userId = tok.user_id as string;
      try {
        const accessTokenRef = {
          current: await refreshIfNeeded(admin, userId, {
            access_token: tok.access_token as string,
            refresh_token: (tok.refresh_token as string | null) ?? null,
            expires_at: (tok.expires_at as string | null) ?? null,
          }),
        };

        const { data: athletes } = await admin
          .from("athletes")
          .select("id, name, nolio_id")
          .eq("coach_id", userId)
          .not("nolio_id", "is", null);

        for (const a of athletes ?? []) {
          const nolioId = Number(a.nolio_id);
          if (!Number.isFinite(nolioId)) continue;
          try {
            const { items, warning } = await fetchTrainingsSince(accessTokenRef, nolioId, fromDate);
            if (warning) {
              summary.incidents.push({ user_id: userId, athlete_id: a.id as string, nolio_id: nolioId, error: warning });
            }
            // aggregate per (date, bucket) + (date, global)
            const agg = new Map<string, { tss: number; count: number }>();
            for (const t of items) {
              const date = extractDate(t);
              const tss = pickTss(t);
              if (!date || tss === null) continue;
              const bucket = nolioSportIdToBucket(Number(t.sport_id ?? t.sport));
              for (const key of [`${date}|${bucket}`, `${date}|global`]) {
                const cur = agg.get(key) ?? { tss: 0, count: 0 };
                cur.tss += tss; cur.count += 1;
                agg.set(key, cur);
              }
            }

            // For the days in window with no session, upsert TSS=0 so a late-sync
            // day that was previously 0 correctly stays 0 and reflects reality.
            // Only touch (date, global) baseline — per-sport 0-rows would multiply noise.
            const windowDates: string[] = [];
            for (let i = 0; i <= days; i++) {
              windowDates.push(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10));
            }
            for (const d of windowDates) {
              const k = `${d}|global`;
              if (!agg.has(k)) agg.set(k, { tss: 0, count: 0 });
            }

            const payload = Array.from(agg.entries()).map(([key, v]) => {
              const [date, sport] = key.split("|");
              return {
                athlete_id: a.id,
                coach_id: userId,
                date,
                sport,
                tss: Math.round(v.tss * 100) / 100,
                session_count: v.count,
                source: "nolio",
              };
            });

            if (payload.length > 0) {
              const { error: upErr } = await admin
                .from("daily_training_load")
                .upsert(payload, { onConflict: "athlete_id,sport,date" });
              if (upErr) {
                summary.incidents.push({ user_id: userId, athlete_id: a.id as string, nolio_id: nolioId, error: `upsert: ${upErr.message}` });
              } else {
                summary.rows_upserted += payload.length;
              }
            }
            summary.athletes_processed += 1;
          } catch (e) {
            summary.incidents.push({
              user_id: userId, athlete_id: a.id as string, nolio_id: nolioId,
              error: (e as Error).message ?? String(e),
            });
          }
        }
      } catch (e) {
        summary.incidents.push({ user_id: userId, error: (e as Error).message ?? String(e) });
      }
    }

    // Log one row per coach so the sync_log stays useful and RLS-scoped.
    for (const tok of tokens ?? []) {
      const uid = tok.user_id as string;
      const coachIncidents = summary.incidents.filter(i => i.user_id === uid);
      await admin.from("nolio_sync_log").insert({
        user_id: uid,
        athletes_count: summary.athletes_processed,
        status: coachIncidents.length === 0 ? "success" : (summary.rows_upserted > 0 ? "partial" : "error"),
        error_message: coachIncidents.length ? coachIncidents.slice(0, 5).map(i => i.error).join(" | ").slice(0, 1000) : null,
        notes: `[cron nolio-training-load-daily] ${JSON.stringify({ ...summary, incidents: coachIncidents }).slice(0, 3800)}`,
      });
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nolio-training-load-daily fatal", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message, summary }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
