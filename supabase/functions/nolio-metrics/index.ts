// Nolio Metrics — récupère les métriques par athlète depuis Nolio et crée/maj un snapshot TFCLab.
// Endpoint officiel (slash final) :
//   GET https://www.nolio.io/api/get/metric/?athlete_id=<nolio_id>&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=15
// Mapping Nolio -> snapshots :
//   ftp->ftp, vma->vma, fc_max->fc_max, css->css, weight->weight_kg, vo2max->vo2max
// Règle : nouveau snapshot si au moins un champ diffère >0.5% du snapshot le plus récent.
// Si un snapshot source="nolio" existe déjà pour aujourd'hui → update.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_METRIC_URL = "https://www.nolio.io/api/get/metric/";

type SupabaseAdmin = ReturnType<typeof createClient>;

type NolioMetricRow = {
  ftp?: number | null;
  vma?: number | null;
  fc_max?: number | null;
  css?: number | null;
  weight?: number | null;
  vo2max?: number | null;
  date?: string | null;
  created_at?: string | null;
};

const METRIC_MAP: Record<keyof Pick<NolioMetricRow, "ftp" | "vma" | "fc_max" | "css" | "weight" | "vo2max">, string> = {
  ftp: "ftp",
  vma: "vma",
  fc_max: "fc_max",
  css: "css",
  weight: "weight_kg",
  vo2max: "vo2max",
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
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

async function fetchMetricsForAthlete(opts: {
  admin: SupabaseAdmin;
  userId: string;
  athleteNolioId: number;
  accessTokenRef: { current: string };
  refreshTokenStr: string | null;
}): Promise<{ rows: NolioMetricRow[]; warning?: string }> {
  const { admin, userId, athleteNolioId, accessTokenRef, refreshTokenStr } = opts;
  const url = `${NOLIO_METRIC_URL}?athlete_id=${athleteNolioId}&limit=15`;

  let attempt = 0;
  let didRefresh = false;
  while (attempt < 5) {
    attempt += 1;
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
        continue;
      }
    }

    if (resp.status === 429) {
      const wait = Math.min(2000 * 2 ** (attempt - 1), 16000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    const ctype = resp.headers.get("content-type") ?? "";
    if (!resp.ok) {
      let detail: string;
      if (ctype.includes("application/json")) {
        const j = await resp.json().catch(() => null) as { detail?: string } | null;
        detail = j?.detail ?? JSON.stringify(j);
      } else {
        detail = (await resp.text()).slice(0, 300);
      }
      return { rows: [], warning: `HTTP ${resp.status}: ${detail}` };
    }

    if (!ctype.includes("application/json")) {
      const txt = (await resp.text()).slice(0, 300);
      return { rows: [], warning: `non-JSON: ${txt}` };
    }
    const json = await resp.json().catch(() => null);
    const arr: NolioMetricRow[] = Array.isArray(json)
      ? json
      : Array.isArray((json as { results?: unknown })?.results)
        ? (json as { results: NolioMetricRow[] }).results
        : Array.isArray((json as { data?: unknown })?.data)
          ? (json as { data: NolioMetricRow[] }).data
          : [];
    return { rows: arr };
  }
  return { rows: [], warning: "max retries (429)" };
}

/** Garde la valeur la plus récente non-null pour chaque métrique. */
function reduceLatest(rows: NolioMetricRow[]): Partial<Record<keyof typeof METRIC_MAP, number>> {
  const sorted = [...rows].sort((a, b) => {
    const da = new Date(a.date ?? a.created_at ?? 0).getTime();
    const db = new Date(b.date ?? b.created_at ?? 0).getTime();
    return db - da; // récent d'abord
  });
  const out: Partial<Record<keyof typeof METRIC_MAP, number>> = {};
  for (const k of Object.keys(METRIC_MAP) as (keyof typeof METRIC_MAP)[]) {
    for (const r of sorted) {
      const v = toNum(r[k]);
      if (v !== null) { out[k] = v; break; }
    }
  }
  return out;
}

function diffExceeds(prev: number | null | undefined, next: number, pct = 0.005): boolean {
  if (prev === null || prev === undefined) return true;
  if (prev === 0) return next !== 0;
  return Math.abs(next - prev) / Math.abs(prev) > pct;
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

    // 1) Token
    const { data: tokenRow, error: tokErr } = await admin
      .from("nolio_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (tokErr) {
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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

    // 2) Athlètes du coach avec nolio_id
    const { data: athletes, error: athErr } = await admin
      .from("athletes")
      .select("id, name, nolio_id")
      .eq("coach_id", userId)
      .not("nolio_id", "is", null);

    if (athErr) {
      return new Response(JSON.stringify({ error: "DB error athletes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const warnings: string[] = [];

    for (const a of athletes ?? []) {
      const nolioId = Number(a.nolio_id);
      if (!Number.isFinite(nolioId)) continue;

      const { rows, warning } = await fetchMetricsForAthlete({
        admin, userId, athleteNolioId: nolioId, accessTokenRef, refreshTokenStr,
      });
      if (warning) {
        warnings.push(`athlete ${a.id} (#${nolioId}): ${warning}`);
        continue;
      }
      const latest = reduceLatest(rows);
      const incomingKeys = Object.keys(latest) as (keyof typeof METRIC_MAP)[];
      if (incomingKeys.length === 0) continue;

      // Snapshot le plus récent toutes sources
      const { data: lastSnap } = await admin
        .from("snapshots")
        .select("id, date, source, ftp, vma, fc_max, css, weight_kg, vo2max")
        .eq("athlete_id", a.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Détection changement >0.5%
      let changed = false;
      const payload: Record<string, number> = {};
      for (const k of incomingKeys) {
        const col = METRIC_MAP[k];
        const next = latest[k]!;
        const prev = lastSnap ? toNum((lastSnap as Record<string, unknown>)[col]) : null;
        payload[col] = next;
        if (diffExceeds(prev, next)) changed = true;
      }
      if (!changed) { unchangedCount += 1; continue; }

      // Snapshot nolio existant aujourd'hui ?
      const { data: todayNolio } = await admin
        .from("snapshots")
        .select("id")
        .eq("athlete_id", a.id)
        .eq("source", "nolio")
        .eq("date", today)
        .maybeSingle();

      if (todayNolio?.id) {
        const { error: upErr } = await admin
          .from("snapshots")
          .update(payload)
          .eq("id", todayNolio.id);
        if (upErr) warnings.push(`update snap ${a.id}: ${upErr.message}`);
        else updatedCount += 1;
      } else {
        const { error: insErr } = await admin
          .from("snapshots")
          .insert({
            athlete_id: a.id,
            coach_id: userId,
            date: today,
            source: "nolio",
            ...payload,
          });
        if (insErr) warnings.push(`insert snap ${a.id}: ${insErr.message}`);
        else createdCount += 1;
      }
    }

    const total = createdCount + updatedCount;
    const status = warnings.length === 0
      ? "success"
      : (total > 0 ? "partial" : "error");

    await admin.from("nolio_sync_log").insert({
      user_id: userId,
      athletes_count: total,
      status,
      error_message: warnings.length ? warnings.slice(0, 5).join(" | ").slice(0, 1000) : null,
    });

    return new Response(JSON.stringify({
      ok: status !== "error",
      created: createdCount,
      updated: updatedCount,
      unchanged: unchangedCount,
      athletes_scanned: athletes?.length ?? 0,
      warnings: warnings.slice(0, 10),
      status,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nolio-metrics fatal", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
