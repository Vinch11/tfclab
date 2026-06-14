// Nolio Metrics — récupère les métriques par athlète depuis Nolio et crée/maj un snapshot TFCLab.
// Endpoint utilisé :
//   GET https://www.nolio.io/api/get/user/meta/?athlete_id=<nolio_id>
// Cet endpoint retourne TOUTES les métriques de l’athlète en une seule requête.
// Mapping Nolio meta key → snapshots :
//   weight→weight_kg, hrrest→fc_repos, hrmax→fc_max, ftp→ftp, aerobicspeed→vma,
//   criticalspeedswimming→css, vo2max→vo2max
// Règle : nouveau snapshot si au moins un champ diffère >0.5% du snapshot le plus récent.
// Si un snapshot source="nolio" existe déjà pour aujourd’hui → update.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_META_URL = "https://www.nolio.io/api/get/user/meta/";

type SupabaseAdmin = ReturnType<typeof createClient>;

type NolioMetaValue = {
  id: number;
  date: string;
  hour: string;
  value: number;
  source: string | null;
};

type NolioMetaResponse = Record<string, { unit: string; data: NolioMetaValue[] }>;

// Mapping Nolio meta key → snapshot column
// Note : hrrest (FC repos) n'a pas de colonne dédiée dans snapshots, ignorée.
const META_KEY_MAP: Record<string, string> = {
  weight: "weight_kg",
  hrmax: "fc_max",
  ftp: "ftp",
  aerobicspeed: "vma",
  criticalspeedswimming: "css",
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

async function fetchAthleteMeta(opts: {
  admin: SupabaseAdmin;
  userId: string;
  athleteNolioId: number;
  accessTokenRef: { current: string };
  refreshTokenStr: string | null;
}): Promise<{ data: NolioMetaResponse | null; warning?: string; raw?: string }> {
  const { admin, userId, athleteNolioId, accessTokenRef, refreshTokenStr } = opts;
  const url = `${NOLIO_META_URL}?athlete_id=${athleteNolioId}`;

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

    const text = await resp.text();
    if (!resp.ok) {
      return { data: null, warning: `HTTP ${resp.status}: ${text.slice(0, 200)}`, raw: text.slice(0, 500) };
    }
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* noop */ }
    if (!json || typeof json !== "object") {
      return { data: null, warning: "non-JSON", raw: text.slice(0, 500) };
    }
    return { data: json as NolioMetaResponse, raw: text.slice(0, 500) };
  }
  return { data: null, warning: "max retries (429)" };
}

/** Garde la valeur la plus récente non-null d’un tableau Nolio meta. */
function latestMetaValue(entries: NolioMetaValue[]): number | null {
  for (const e of entries) {
    const v = toNum(e.value);
    if (v !== null) return v;
  }
  return null;
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
    const diagnosticDump: Record<string, unknown> = {};
    let firstAthleteLogged = false;

    for (const a of athletes ?? []) {
      const nolioId = Number(a.nolio_id);
      if (!Number.isFinite(nolioId)) continue;

      const { data: meta, warning, raw } = await fetchAthleteMeta({
        admin, userId, athleteNolioId: nolioId,
        accessTokenRef, refreshTokenStr,
      });

      if (!firstAthleteLogged && raw !== undefined) {
        diagnosticDump.athlete_id = a.id;
        diagnosticDump.nolio_id = nolioId;
        diagnosticDump.raw_meta_keys = meta ? Object.keys(meta) : [];
        diagnosticDump.raw_meta_sample = meta ? Object.fromEntries(
          Object.entries(meta).slice(0, 3).map(([k, v]) => [k, { unit: v.unit, count: v.data?.length ?? 0 }])
        ) : null;
        diagnosticDump.raw_response_preview = raw;
        firstAthleteLogged = true;
      }

      if (warning) {
        warnings.push(`athlete ${a.id} #${nolioId}: ${warning}`);
        continue;
      }
      if (!meta) continue;

      // Extraction des valeurs les plus récentes
      const latest: Record<string, number> = {};
      for (const [nolioKey, snapCol] of Object.entries(META_KEY_MAP)) {
        const entry = meta[nolioKey];
        if (entry && Array.isArray(entry.data) && entry.data.length > 0) {
          const v = latestMetaValue(entry.data);
          if (v !== null) latest[snapCol] = v;
        }
      }

      if (!firstAthleteLogged) {
        diagnosticDump.extracted = latest;
        firstAthleteLogged = true;
      }

      const incomingCols = Object.keys(latest);
      if (incomingCols.length === 0) continue;

      // Snapshot le plus récent toutes sources
      const { data: lastSnap } = await admin
        .from("snapshots")
        .select("id, date, source, ftp, vma, fc_max, fc_repos, css, weight_kg, vo2max")
        .eq("athlete_id", a.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Détection changement >0.5%
      let changed = false;
      const payload: Record<string, number> = {};
      for (const col of incomingCols) {
        const next = latest[col];
        const prev = lastSnap ? toNum((lastSnap as Record<string, unknown>)[col]) : null;
        payload[col] = next;
        if (diffExceeds(prev, next)) changed = true;
      }
      if (!changed) { unchangedCount += 1; continue; }

      // Snapshot nolio existant aujourd’hui ?
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
      notes: JSON.stringify(diagnosticDump).slice(0, 4000),
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
