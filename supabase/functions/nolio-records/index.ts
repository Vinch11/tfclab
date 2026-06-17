// Nolio Records — récupère les records de performance (ppr/par/phrr) depuis Nolio
// et les stocke dans la table `nolio_records`.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_RECORDS_BASE = "https://www.nolio.io/api/get/records/";

// Sport mappings Nolio
const BIKE_SPORTS = [14, 18];
const RUN_SPORTS = [2, 52];
const SWIM_SPORT = 19;

type NolioRecord = {
  item_seconds?: number;
  value?: number | string;
  date_recorded?: string;
  date?: string;
  sport_id?: number;
  sport?: number;
  athlete_id?: number;
  [k: string]: unknown;
};

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

// Debug capture du premier appel (Vince / nolio_id=338386)
type DebugCapture = {
  url: string;
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body_preview: string;
  body_length: number;
};
const debugCaptures: DebugCapture[] = [];

async function fetchRecords(
  accessToken: string,
  nolioAthleteId: number,
  cat: "ppr" | "par" | "phrr",
  recordType: "time" | "distance",
  sports?: number[],
  captureRaw = false,
): Promise<NolioRecord[]> {
  const params = new URLSearchParams({
    cat,
    record_type: recordType,
    athlete_id: String(nolioAthleteId),
  });
  if (sports && sports.length > 0) {
    params.set("sports", sports.join(","));
  }
  const url = `${NOLIO_RECORDS_BASE}?${params.toString()}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });

  // Capture brute pour debug (Vince)
  let rawBody = "";
  if (captureRaw) {
    rawBody = await resp.text();
    const headersObj: Record<string, string> = {};
    resp.headers.forEach((v, k) => { headersObj[k] = v; });
    debugCaptures.push({
      url,
      status: resp.status,
      status_text: resp.statusText,
      headers: headersObj,
      body_preview: rawBody.slice(0, 4000),
      body_length: rawBody.length,
    });
    console.log(`[nolio-records DEBUG] ${cat}/${recordType} athlete=${nolioAthleteId} → HTTP ${resp.status} body[${rawBody.length}]: ${rawBody.slice(0, 500)}`);
  }

  if (!resp.ok) {
    console.warn(`nolio-records fetch ${cat}/${recordType} for ${nolioAthleteId} → HTTP ${resp.status}`);
    return [];
  }
  let json: any;
  try {
    json = captureRaw ? JSON.parse(rawBody) : await resp.json();
  } catch { return []; }
  if (!json) return [];
  if (Array.isArray(json)) return json as NolioRecord[];
  if (Array.isArray(json.results)) return json.results as NolioRecord[];
  if (Array.isArray(json.records)) return json.records as NolioRecord[];
  return [];
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

    // 1) Token
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
    const accessToken = await refreshIfNeeded(admin, userId, {
      access_token: tokenRow.access_token as string,
      refresh_token: (tokenRow.refresh_token as string | null) ?? null,
      expires_at: (tokenRow.expires_at as string | null) ?? null,
    });

    // 2) Athlètes liés
    const { data: athletes, error: athErr } = await admin
      .from("athletes")
      .select("id, name, nolio_id")
      .eq("coach_id", userId)
      .not("nolio_id", "is", null);

    if (athErr) {
      return new Response(JSON.stringify({ error: "DB error", detail: athErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary: Array<{ athlete: string; imported: number; errors: string[] }> = [];
    let totalImported = 0;

    for (const ath of athletes ?? []) {
      const nolioId = (ath as any).nolio_id as number;
      const athleteId = (ath as any).id as string;
      const errors: string[] = [];
      const rowsToUpsert: Array<Record<string, unknown>> = [];

      const queries: Array<{
        cat: "ppr" | "par" | "phrr";
        recordType: "time" | "distance";
        sports?: number[];
        defaultSportIds: number[];
      }> = [
        { cat: "ppr", recordType: "time", defaultSportIds: BIKE_SPORTS },
        { cat: "par", recordType: "time", defaultSportIds: RUN_SPORTS },
        { cat: "par", recordType: "time", sports: [SWIM_SPORT], defaultSportIds: [SWIM_SPORT] },
      ];

      for (const q of queries) {
        try {
          const shouldCapture = nolioId === 338386;
          const records = await fetchRecords(accessToken, nolioId, q.cat, q.recordType, q.sports, shouldCapture);
          for (const r of records) {
            const item_seconds = Number((r as any).inner_val ?? r.item_seconds);
            const value = Number(r.value);
            const sport_id = Number(r.sport_id ?? r.sport ?? q.defaultSportIds[0]);
            if (!Number.isFinite(item_seconds) || !Number.isFinite(value) || !Number.isFinite(sport_id)) continue;
            rowsToUpsert.push({
              athlete_id: athleteId,
              nolio_athlete_id: nolioId,
              cat: q.cat,
              record_type: q.recordType,
              item_seconds,
              value,
              date_recorded: (r.date_recorded ?? r.date ?? null) as string | null,
              sport_id,
              synced_at: new Date().toISOString(),
            });
          }
        } catch (e) {
          errors.push(`${q.cat}/${q.recordType}: ${(e as Error).message}`);
        }
      }

      if (rowsToUpsert.length > 0) {
        const { error: upErr } = await admin
          .from("nolio_records")
          .upsert(rowsToUpsert, {
            onConflict: "athlete_id,cat,record_type,item_seconds,sport_id",
          });
        if (upErr) {
          errors.push(`upsert: ${upErr.message}`);
        } else {
          totalImported += rowsToUpsert.length;
        }
      }

      // ─── 3) Mise à jour snapshot actif si records meilleurs ────────────
      let snapshotUpdates = 0;
      try {
        const { data: athRow } = await admin
          .from("athletes")
          .select("active_snapshot_id")
          .eq("id", athleteId)
          .maybeSingle();
        const activeSnapId = (athRow as any)?.active_snapshot_id as string | null;
        if (activeSnapId) {
          const { data: snap } = await admin
            .from("snapshots")
            .select("pmax_5s, p30s_w, p60s_w, map5min_w, sprint_15s_distance, vma")
            .eq("id", activeSnapId)
            .maybeSingle();

          const pick = (cat: string, sec: number, sports: number[]) => {
            const r = rowsToUpsert.find(x =>
              x.cat === cat &&
              x.item_seconds === sec &&
              sports.includes(x.sport_id as number),
            );
            return r ? Number(r.value) : null;
          };

          const p5 = pick("ppr", 5, BIKE_SPORTS);
          const p30 = pick("ppr", 30, BIKE_SPORTS);
          const p60 = pick("ppr", 60, BIKE_SPORTS);
          const p300 = pick("ppr", 300, BIKE_SPORTS);
          // par run record 15s → sprint distance = vitesse(m/s) × 15
          const par15 = pick("par", 15, RUN_SPORTS);
          // par run record 360s (6min) → vma = (distance_6min / 6) × 60 / 1000 × 1.05
          const par360 = pick("par", 360, RUN_SPORTS);

          const updates: Record<string, number> = {};
          const better = (cur: unknown, nv: number | null) =>
            nv != null && Number.isFinite(nv) && nv > Number(cur ?? 0);

          if (better((snap as any)?.pmax_5s, p5)) updates.pmax_5s = p5 as number;
          if (better((snap as any)?.p30s_w, p30)) updates.p30s_w = p30 as number;
          if (better((snap as any)?.p60s_w, p60)) updates.p60s_w = p60 as number;
          if (better((snap as any)?.map5min_w, p300)) updates.map5min_w = p300 as number;

          if (par15 != null && Number.isFinite(par15) && par15 > 0) {
            // par en sec/km → vitesse m/s = 1000 / par
            const speedMs = 1000 / par15;
            const sprintDist = speedMs * 15;
            if (better((snap as any)?.sprint_15s_distance, sprintDist)) {
              updates.sprint_15s_distance = Math.round(sprintDist * 10) / 10;
            }
          }
          if (par360 != null && Number.isFinite(par360) && par360 > 0) {
            // par en sec/km → distance_6min (m) = 360 / par × 1000
            const dist6m = (360 / par360) * 1000;
            const vmaEst = (dist6m / 6) * 60 / 1000 * 1.05;
            if (better((snap as any)?.vma, vmaEst)) {
              updates.vma = Math.round(vmaEst * 100) / 100;
            }
          }

          if (Object.keys(updates).length > 0) {
            const { error: snapErr } = await admin
              .from("snapshots")
              .update(updates)
              .eq("id", activeSnapId);
            if (snapErr) {
              errors.push(`snapshot update: ${snapErr.message}`);
            } else {
              snapshotUpdates = Object.keys(updates).length;
            }
          }
        }
      } catch (e) {
        errors.push(`snapshot sync: ${(e as Error).message}`);
      }

      summary.push({
        athlete: (ath as any).name ?? String(athleteId),
        imported: rowsToUpsert.length,
        errors,
        snapshot_updates: snapshotUpdates,
      } as any);
    }

    // Log dans nolio_sync_log pour traçabilité
    try {
      await admin.from("nolio_sync_log").insert({
        user_id: userId,
        status: "success",
        athletes_count: athletes?.length ?? 0,
        notes: { source: "nolio-records", total_records: totalImported, summary, vince_debug: debugCaptures },
        synced_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn("sync_log insert failed", logErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        athletes_processed: athletes?.length ?? 0,
        total_records: totalImported,
        summary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("nolio-records error", e);
    try {
      const adminErr = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await adminErr.from("nolio_sync_log").insert({
        status: "error",
        error_message: `nolio-records: ${(e as Error).message}`,
        notes: { source: "nolio-records", stack: (e as Error).stack?.slice(0, 500) },
        synced_at: new Date().toISOString(),
      });
    } catch (_) { /* ignore */ }
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
