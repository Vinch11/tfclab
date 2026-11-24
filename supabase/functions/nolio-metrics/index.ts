// Nolio Metrics — récupère les métriques par athlète depuis Nolio et crée/maj un snapshot TFCLab.
// Endpoint utilisé :
//   GET https://www.nolio.io/api/get/user/meta/?athlete_id=<nolio_id>
// Cet endpoint retourne TOUTES les métriques de l’athlète en une seule requête.
// Mapping Nolio meta key → snapshots :
//   weight→weight_kg, hrrest→fc_repos, hrmax→fc_max, ftp→ftp, aerobicspeed→vma,
//   criticalspeedswimming→css, vo2max→vo2max
// Règles (24/11/2026) :
// - Le snapshot de référence (actif, sinon le plus récent) est COMPLÉTÉ : seuls FC repos, FC max et poids
//   vides sont remplis. Les seuils (FTP, VMA, CSS) viennent des Days, pas des métriques de plateforme.
// - Aucun snapshot existant → un snapshot source="nolio" est créé (FTP marquée « montre »).
// - La VO₂max Nolio est une valeur de montre : rangée dans field_sources.vo2max_watch, jamais dans la
//   colonne vo2max utilisée par les calculs.
// - FC repos = médiane des 7 derniers jours de mesures (lisse une mauvaise nuit).
// - Body { mode: "resting_hr", athlete_id } : renvoie seulement la FC repos, sans rien écrire.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
// Mapping Nolio meta key → snapshot column
const META_KEY_MAP: Record<string, string> = {
  weight: "weight_kg",
  hrrest: "fc_repos",
  hrmax: "fc_max",
  ftp: "ftp",
  aerobicspeed: "vma",
  criticalspeedswimming: "css",
  vo2max: "vo2max",
};

// Conversions spécifiques par colonne TFCLab :
// - css : Nolio renvoie selon deux formats observés :
//     • raw ≥ 100 → format min·100 + sec (ex 117.05 = 1:17.05/100m) → minutes·60 + secondes
//     • raw < 100  → déjà en secondes/100m (ex 96 = 1:36/100m) → valeur brute
//   Résultat exprimé en s/100m (référence TFCLab).
// - fc_repos / fc_max : entiers bpm.
export function convertNolioValue(snapCol: string, raw: number): number {
  if (snapCol === "css") {
    if (raw >= 100) {
      const minutes = Math.floor(raw / 100);
      const seconds = raw - minutes * 100;
      return Math.round((minutes * 60 + seconds) * 100) / 100;
    }
    return Math.round(raw * 100) / 100;
  }
  if (snapCol === "fc_repos" || snapCol === "fc_max") {
    return Math.round(raw);
  }
  return raw;
}

export function toNum(v: unknown): number | null {
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
export function latestMetaValue(entries: NolioMetaValue[]): number | null {
  for (const e of entries) {
    const v = toNum(e.value);
    if (v !== null) return v;
  }
  return null;
}

/** Médiane des valeurs des 7 jours précédant la mesure la plus récente. */
export function restingHrMedian(entries: NolioMetaValue[], days = 7): { value: number; date: string; count: number } | null {
  const valid = entries
    .map((e) => ({ v: toNum(e.value), d: typeof e.date === "string" ? e.date.slice(0, 10) : "" }))
    .filter((e): e is { v: number; d: string } => e.v !== null && e.v > 25 && e.v < 120 && /^\d{4}-\d{2}-\d{2}$/.test(e.d))
    .sort((a, b) => b.d.localeCompare(a.d));
  if (!valid.length) return null;
  const latest = valid[0].d;
  const from = new Date(Date.parse(latest + "T00:00:00Z") - (days - 1) * 86400000).toISOString().slice(0, 10);
  const inWindow = valid.filter((e) => e.d >= from).map((e) => e.v).sort((a, b) => a - b);
  const mid = Math.floor(inWindow.length / 2);
  const median = inWindow.length % 2 ? inWindow[mid] : (inWindow[mid - 1] + inWindow[mid]) / 2;
  return { value: Math.round(median), date: latest, count: inWindow.length };
}

export const FILL_IF_EMPTY = ["fc_repos", "fc_max", "weight_kg"] as const;
const WATCH_VO2_PROTOCOL = "VO₂max de la montre (Nolio) : affichée, non utilisée dans les calculs";
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export type NolioSnapshotPlan =
  | { kind: "none" }
  | { kind: "update"; id: string; payload: Record<string, unknown> }
  | { kind: "insert"; payload: Record<string, unknown> };

/** Décide quoi écrire à partir des métriques Nolio et du snapshot de référence (ou null). */
export function planNolioSnapshot(latest: Record<string, number>, ref: Record<string, unknown> | null, today: string): NolioSnapshotPlan {
  const sources = isObj(ref?.field_sources) ? { ...ref!.field_sources as Record<string, unknown> } : {};
  const vo2 = latest.vo2max;
  const prevWatch = isObj(sources.vo2max_watch) ? toNum(sources.vo2max_watch.value) : null;
  const watchChanged = typeof vo2 === "number" && vo2 > 0 && prevWatch !== vo2;
  if (watchChanged) sources.vo2max_watch = { source: "watch", value: vo2, date: today, protocol: WATCH_VO2_PROTOCOL };

  if (ref && typeof ref.id === "string") {
    const payload: Record<string, unknown> = {};
    for (const col of FILL_IF_EMPTY) {
      if (typeof latest[col] === "number" && toNum(ref[col]) === null) payload[col] = latest[col];
    }
    if (watchChanged) payload.field_sources = sources;
    return Object.keys(payload).length ? { kind: "update", id: ref.id, payload } : { kind: "none" };
  }

  const payload: Record<string, unknown> = {};
  for (const col of [...FILL_IF_EMPTY, "ftp", "vma", "css"]) {
    if (typeof latest[col] === "number") payload[col] = col === "ftp" ? Math.round(latest[col]) : latest[col];
  }
  if (typeof payload.ftp === "number") sources.ftp = { source: "watch", protocol: "Montre ou plateforme (Nolio)" };
  if (Object.keys(sources).length) payload.field_sources = sources;
  return Object.keys(payload).length ? { kind: "insert", payload } : { kind: "none" };
}

export function diffExceeds(prev: number | null | undefined, next: number, pct = 0.005): boolean {
  if (prev === null || prev === undefined) return true;
  if (prev === 0) return next !== 0;
  return Math.abs(next - prev) / Math.abs(prev) > pct;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Optional body: { athlete_id?: string, nolio_id?: number, mode?: "sync" | "resting_hr" }
  let requestedAthleteId: string | null = null;
  let requestedNolioId: number | null = null;
  let mode: "sync" | "resting_hr" = "sync";
  try {
    if (req.method !== "GET") {
      const body = await req.clone().json().catch(() => null) as
        | { athlete_id?: string; nolio_id?: number | string; mode?: string }
        | null;
      if (body?.athlete_id) requestedAthleteId = String(body.athlete_id);
      if (body?.mode === "resting_hr") mode = "resting_hr";
      if (body?.nolio_id != null) {
        const n = Number(body.nolio_id);
        if (Number.isFinite(n)) requestedNolioId = n;
      }
    }
  } catch { /* noop */ }


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
      .select("id, name, nolio_id, active_snapshot_id")
      .eq("coach_id", userId)
      .not("nolio_id", "is", null);

    if (athErr) {
      return new Response(JSON.stringify({ error: "DB error athletes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Si un athlète spécifique est demandé, restreindre
    let scopedAthletes = athletes ?? [];
    let targetAthleteName: string | null = null;
    if (requestedAthleteId || requestedNolioId != null) {
      scopedAthletes = scopedAthletes.filter(a =>
        (requestedAthleteId && a.id === requestedAthleteId) ||
        (requestedNolioId != null && Number(a.nolio_id) === requestedNolioId)
      );
      targetAthleteName = scopedAthletes[0]?.name ?? null;
    }

    // Lecture seule : FC repos d'un athlète pour pré-remplir la fiche ou un Day.
    if (mode === "resting_hr") {
      const a = scopedAthletes[0];
      if (!requestedAthleteId || !a) {
        return new Response(JSON.stringify({ ok: false, fc_repos: null, error: "Athlète non lié à Nolio" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: meta, warning } = await fetchAthleteMeta({
        admin, userId, athleteNolioId: Number(a.nolio_id), accessTokenRef, refreshTokenStr,
      });
      const entries = meta?.hrrest?.data;
      const fc = Array.isArray(entries) ? restingHrMedian(entries) : null;
      return new Response(JSON.stringify({ ok: !warning, fc_repos: fc, warning: warning ?? null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const warnings: string[] = [];
    const diagnosticDump: Record<string, unknown> = {};
    let firstAthleteLogged = false;

    for (const a of scopedAthletes) {
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

      // Extraction des valeurs les plus récentes (FC repos : médiane 7 jours)
      const latest: Record<string, number> = {};
      for (const [nolioKey, snapCol] of Object.entries(META_KEY_MAP)) {
        const entry = meta[nolioKey];
        if (entry && Array.isArray(entry.data) && entry.data.length > 0) {
          if (snapCol === "fc_repos") {
            const fc = restingHrMedian(entry.data);
            if (fc) latest.fc_repos = fc.value;
            continue;
          }
          const v = latestMetaValue(entry.data);
          if (v !== null) latest[snapCol] = convertNolioValue(snapCol, v);
        }
      }

      if (!firstAthleteLogged) {
        diagnosticDump.extracted = latest;
        firstAthleteLogged = true;
      }

      const incomingCols = Object.keys(latest);
      if (incomingCols.length === 0) continue;

      // Snapshot de référence : actif, sinon le plus récent.
      const cols = "id, athlete_id, date, fc_repos, fc_max, weight_kg, field_sources";
      let ref: Record<string, unknown> | null = null;
      if (a.active_snapshot_id) {
        const { data } = await admin.from("snapshots").select(cols)
          .eq("id", a.active_snapshot_id).eq("athlete_id", a.id).maybeSingle();
        ref = (data as Record<string, unknown> | null) ?? null;
      }
      if (!ref) {
        const { data } = await admin.from("snapshots").select(cols)
          .eq("athlete_id", a.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        ref = (data as Record<string, unknown> | null) ?? null;
      }

      const plan = planNolioSnapshot(latest, ref, today);
      if (plan.kind === "none") { unchangedCount += 1; continue; }
      if (plan.kind === "update") {
        const { error: upErr } = await admin.from("snapshots").update(plan.payload).eq("id", plan.id);
        if (upErr) warnings.push(`update snap ${a.id}: ${upErr.message}`);
        else updatedCount += 1;
      } else {
        const { error: insErr } = await admin.from("snapshots").insert({
          athlete_id: a.id, coach_id: userId, date: today, source: "nolio", ...plan.payload,
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
      athletes_scanned: scopedAthletes.length,
      athlete_name: targetAthleteName,
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
