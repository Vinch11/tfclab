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

    // Période d'import (optionnelle) — filtre `date_recorded` côté serveur
    let dateFrom: string | null = null;
    let dateTo: string | null = null;
    let athleteIdsFilter: string[] | null = null;
    let forceOverwrite = false;
    try {
      const body = await req.json().catch(() => null) as { date_from?: string; date_to?: string; athlete_ids?: string[]; force_overwrite?: boolean } | null;
      if (body?.date_from && /^\d{4}-\d{2}-\d{2}$/.test(body.date_from)) dateFrom = body.date_from;
      if (body?.date_to && /^\d{4}-\d{2}-\d{2}$/.test(body.date_to)) dateTo = body.date_to;
      if (Array.isArray(body?.athlete_ids) && body!.athlete_ids!.length > 0) {
        athleteIdsFilter = body!.athlete_ids!.filter((x) => typeof x === "string");
      }
      if (body?.force_overwrite === true) forceOverwrite = true;
    } catch { /* ignore */ }

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

    // 2) Athlètes liés (optionnellement restreints à athlete_ids)
    let athletesQuery = admin
      .from("athletes")
      .select("id, name, nolio_id")
      .eq("coach_id", userId)
      .not("nolio_id", "is", null);
    if (athleteIdsFilter && athleteIdsFilter.length > 0) {
      athletesQuery = athletesQuery.in("id", athleteIdsFilter);
    }
    const { data: athletes, error: athErr } = await athletesQuery;

    if (athErr) {
      return new Response(JSON.stringify({ error: "DB error", detail: athErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary: Array<{ athlete: string; imported: number; errors: string[] }> = [];
    let totalImported = 0;
    const seenNolioIds = new Set<number>();

    for (const ath of athletes ?? []) {
      const nolioId = (ath as any).nolio_id as number;
      const athleteId = (ath as any).id as string;
      if (seenNolioIds.has(nolioId)) {
        console.log(`skipped: duplicate nolio_id ${nolioId} (athlete ${(ath as any).name})`);
        summary.push({ athlete: (ath as any).name ?? String(athleteId), imported: 0, errors: [`skipped: duplicate nolio_id ${nolioId}`] } as any);
        continue;
      }
      seenNolioIds.add(nolioId);
      const errors: string[] = [];
      const rowsToUpsert: Array<Record<string, unknown>> = [];

      const queries: Array<{
        cat: "ppr" | "par" | "phrr";
        recordType: "time" | "distance";
        sports?: number[];
        defaultSportIds: number[];
      }> = [
        // PPR vélo — puissance par durée (Pmax 5s, Sprint, MAP, FTP, durabilité)
        { cat: "ppr", recordType: "time", sports: BIKE_SPORTS, defaultSportIds: BIKE_SPORTS },
        // PPR vélo — puissance par distance (CLM, cyclo)
        { cat: "ppr", recordType: "distance", sports: BIKE_SPORTS, defaultSportIds: BIKE_SPORTS },
        // PAR course — allure par durée (sprint 15s, VMA 6min)
        { cat: "par", recordType: "time", sports: RUN_SPORTS, defaultSportIds: RUN_SPORTS },
        // PAR course — allure par distance (400m, 1km, 5km, 10km, semi, marathon)
        { cat: "par", recordType: "distance", sports: RUN_SPORTS, defaultSportIds: RUN_SPORTS },
        // PAR natation — allure par durée (CSS, endurance)
        { cat: "par", recordType: "time", sports: [SWIM_SPORT], defaultSportIds: [SWIM_SPORT] },
        // PAR natation — allure par distance (50m, 100m, 200m, 400m, 1500m, 3800m)
        { cat: "par", recordType: "distance", sports: [SWIM_SPORT], defaultSportIds: [SWIM_SPORT] },
        // PHRR FC — par durée, tous sports confondus
        { cat: "phrr", recordType: "time", defaultSportIds: [...BIKE_SPORTS, ...RUN_SPORTS, SWIM_SPORT] },
        // PHRR FC — par distance, tous sports confondus
        { cat: "phrr", recordType: "distance", defaultSportIds: [...BIKE_SPORTS, ...RUN_SPORTS, SWIM_SPORT] },
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
            const date_recorded = (r.date_recorded ?? r.date ?? null) as string | null;
            // Filtre par fenêtre temporelle (si fournie) — on n'importe que les records datés dans la période
            if (dateFrom || dateTo) {
              if (!date_recorded) continue;
              if (dateFrom && date_recorded < dateFrom) continue;
              if (dateTo && date_recorded > dateTo) continue;
            }
            rowsToUpsert.push({
              athlete_id: athleteId,
              nolio_athlete_id: nolioId,
              cat: q.cat,
              record_type: q.recordType,
              item_seconds,
              value,
              date_recorded,
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

      // ─── 3) Mise à jour snapshot (création d'un snapshot du jour) ──────
      let snapshotUpdates = 0;
      let snapshotIdUsed: string | null = null;
      let snapshotCreated = false;
      try {
        const today = new Date().toISOString().slice(0, 10);

        // Cherche un snapshot existant pour aujourd'hui
        const { data: todaySnap } = await admin
          .from("snapshots")
          .select("*")
          .eq("athlete_id", athleteId)
          .eq("date", today)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let snapId: string | null = (todaySnap as any)?.id ?? null;

        if (!snapId) {
          // ❗ Snapshot Nolio "complet" : on clone depuis le dernier snapshot existant
          // les champs de baseline labo/manuel jamais fournis par Nolio (poids, FTP labo,
          // VO2max, fat_pct, tte_observed_min, paramètres VLamax/protocol…). Les champs
          // effectivement recalculés depuis Nolio (vma, css, fc_max, pmax_5s, time_*…)
          // seront écrasés ci-dessous par la phase d'agrégation.
          const { data: athleteRow } = await admin
            .from("athletes")
            .select("coach_id")
            .eq("id", athleteId)
            .maybeSingle();

          const { data: prevSnap } = await admin
            .from("snapshots")
            .select("*")
            .eq("athlete_id", athleteId)
            .lt("date", today)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Champs portés depuis le snapshot précédent (Nolio ne les mesure pas).
          // ⚠️ Inclut PROTECTED_FROM_IMPORT (cf. plus bas) : ces champs sont
          // toujours carry-over et JAMAIS écrasés par les records Nolio.
          const CARRY_OVER_FIELDS = [
            "weight_kg", "fat_pct", "vo2max", "ftp",
            "p30s_w", "p60s_w", "map5min_w",
            "tte_observed_min", "tte_observed_min_run", "tte_mode",
            "pace_threshold_sec_per_km", "running_power_threshold",
            "running_power_max", "running_power_1s", "running_power_5s",
            "running_power_30s", "running_power_60s", "running_power_5min",
            "fc_repos", "objectif", "sport_main",
            "vlamax", "vlamax_run", "vlamax_source", "vlamax_protocol",
            "protocol_quality", "metabolic_profile",
            "run_economy_score", "run_economy_label",
            "carb_tolerance_band", "fatigue_state",
            // Données terrain — protégées de tout écrasement par Nolio
            "sprint_15s_distance", "vma",

          ];

          const carry: Record<string, unknown> = {};
          const isPlausibleRunningPowerCarry = (field: string, value: unknown): boolean => {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) return true;
            if (field === "running_power_max" && n > 1200) return false;
            if (field === "running_power_threshold" && (n < 120 || n > 520)) return false;
            if (["running_power_1s", "running_power_5s"].includes(field) && n > 1200) return false;
            if (["running_power_30s", "running_power_60s"].includes(field) && n > 900) return false;
            if (field === "running_power_5min" && n > 650) return false;
            return true;
          };
          if (prevSnap) {
            for (const f of CARRY_OVER_FIELDS) {
              const v = (prevSnap as any)[f];
              if (f.startsWith("running_power_") && !isPlausibleRunningPowerCarry(f, v)) {
                errors.push(`${f} carry-over ignoré — valeur CAP incohérente (${v})`);
                continue;
              }
              if (v !== null && v !== undefined) carry[f] = v;
            }
          }

          const base: Record<string, unknown> = {
            ...carry,
            athlete_id: athleteId,
            coach_id: (athleteRow as any)?.coach_id ?? null,
            date: today,
            source: "nolio-records",
          };

          const { data: inserted, error: insErr } = await admin
            .from("snapshots")
            .insert(base)
            .select("id")
            .maybeSingle();
          if (insErr) {
            errors.push(`snapshot create: ${insErr.message}`);
          } else {
            snapId = (inserted as any)?.id ?? null;
            snapshotCreated = !!snapId;
            if (snapId) console.log(`created nolio snapshot for athlete ${athleteId}: ${snapId} (carry-over ${Object.keys(carry).length} fields from ${(prevSnap as any)?.id ?? "—"})`);
          }
        }


        if (snapId) {
          snapshotIdUsed = snapId;

          const { data: snap } = await admin
            .from("snapshots")
            .select("pmax_5s, p30s_w, p60s_w, map5min_w, sprint_15s_distance, vma, ftp, css, fc_max, time_5k_sec, time_10k_sec, time_half_sec, time_marathon_sec")
            .eq("id", snapId)
            .maybeSingle();

          const BIKE_SPORT_IDS = [14, 18];

          // ─── Source agrégée : on lit *toute* la table nolio_records pour cet athlète
          // (records persistés cumulés) en plus de l'éventuel batch fraîchement importé.
          // Cela permet de reconstituer le snapshot même quand Nolio renvoie 429 ou
          // quand tous les records sont déjà connus en base (imported=0).
          const { data: persistedRecords } = await admin
            .from("nolio_records")
            .select("cat, record_type, item_seconds, value, sport_id, date_recorded")
            .eq("athlete_id", athleteId);
          const aggregateSource: Array<Record<string, unknown>> = [
            ...rowsToUpsert,
            ...((persistedRecords ?? []) as Array<Record<string, unknown>>),
          ];

          // ─── Helpers d'agrégation ───────────────────────────────────────
          const bestMax = (cat: string, recordType: string, sec: number, sportFilter?: number[]): number | null => {
            const matches = aggregateSource.filter(x =>
              x.cat === cat &&
              x.record_type === recordType &&
              Number(x.item_seconds) === sec &&
              (!sportFilter || sportFilter.includes(Number(x.sport_id))),
            );
            if (matches.length === 0) return null;
            const vals = matches.map(x => Number(x.value)).filter(Number.isFinite);
            return vals.length ? Math.max(...vals) : null;
          };
          const bestMin = (cat: string, recordType: string, sec: number, sportFilter?: number[]): number | null => {
            const matches = aggregateSource.filter(x =>
              x.cat === cat &&
              x.record_type === recordType &&
              Number(x.item_seconds) === sec &&
              (!sportFilter || sportFilter.includes(Number(x.sport_id))),
            );
            if (matches.length === 0) return null;
            const vals = matches.map(x => Number(x.value)).filter(v => Number.isFinite(v) && v > 0);
            return vals.length ? Math.min(...vals) : null;
          };
          // forceOverwrite : prend la valeur du record le plus récent (date_recorded max)
          // au lieu du max/min historique. Reflète la forme actuelle plutôt que le PB absolu.
          const latest = (cat: string, recordType: string, sec: number, sportFilter?: number[]): number | null => {
            const matches = aggregateSource.filter(x =>
              x.cat === cat &&
              x.record_type === recordType &&
              Number(x.item_seconds) === sec &&
              (!sportFilter || sportFilter.includes(Number(x.sport_id))),
            );
            if (matches.length === 0) return null;
            const sorted = [...matches].sort((a, b) => {
              const da = String(a.date_recorded ?? "");
              const db = String(b.date_recorded ?? "");
              return db.localeCompare(da);
            });
            const v = Number(sorted[0].value);
            return Number.isFinite(v) ? v : null;
          };
          // Sélecteur unifié : bestMax (historique) ou latest (forme actuelle)
          const pickMax = forceOverwrite ? latest : bestMax;
          const pickMin = forceOverwrite ? latest : bestMin;

          const updates: Record<string, number> = {};
          const betterMax = (cur: unknown, nv: number | null) => {
            if (nv == null || !Number.isFinite(nv) || nv <= 0) return false;
            if (forceOverwrite) return true;
            return nv > Number(cur ?? 0);
          };
          const betterMin = (cur: unknown, nv: number | null) => {
            if (nv == null || !Number.isFinite(nv) || nv <= 0) return false;
            if (forceOverwrite) return true;
            const c = Number(cur);
            return !Number.isFinite(c) || c <= 0 || nv < c;
          };

          const snapFtp = Number((snap as any)?.ftp);
          const hasFtp = Number.isFinite(snapFtp) && snapFtp > 0;

          // ─── PPR vélo / durée ───────────────────────────────────────────
          const p5 = pickMax("ppr", "time", 5, BIKE_SPORT_IDS);
          const p30 = pickMax("ppr", "time", 30, BIKE_SPORT_IDS);
          const p60 = pickMax("ppr", "time", 60, BIKE_SPORT_IDS);
          const p300 = pickMax("ppr", "time", 300, BIKE_SPORT_IDS);

          // Garde physiologique : items < 30s → ratio /FTP < 4.0 ; item 300s → ratio /FTP < 1.6
          const validateShort = (label: string, w: number | null, ratioCap: number, absCap: number): number | null => {
            if (w == null) return null;
            if (hasFtp) {
              const r = w / snapFtp;
              if (r > ratioCap) {
                errors.push(`${label} ignoré — ratio ${label}/FTP = ${r.toFixed(2)} (seuil < ${ratioCap})`);
                return null;
              }
            } else if (w >= absCap) {
              errors.push(`${label} ignoré — ${w}W ≥ plafond absolu ${absCap}W (FTP indisponible)`);
              return null;
            }
            return w;
          };

          const p5Valid = validateShort("pmax_5s", p5, 4.0, 2000);
          const p30Valid = validateShort("p30s_w", p30, 4.0, 1500);
          const p60Valid = validateShort("p60s_w", p60, 4.0, 1200);
          const p300Valid = (() => {
            if (p300 == null) return null;
            if (hasFtp) {
              const r = p300 / snapFtp;
              if (r > 1.6) {
                errors.push(`map5min_w ignoré — ratio MAP/FTP = ${r.toFixed(2)} (seuil < 1.6)`);
                return null;
              }
            } else if (p300 >= 600) {
              errors.push(`map5min_w ignoré — ${p300}W ≥ plafond absolu 600W (FTP indisponible)`);
              return null;
            }
            return p300;
          })();

          if (betterMax((snap as any)?.pmax_5s, p5Valid)) updates.pmax_5s = p5Valid as number;
          if (betterMax((snap as any)?.p30s_w, p30Valid)) updates.p30s_w = p30Valid as number;
          if (betterMax((snap as any)?.p60s_w, p60Valid)) updates.p60s_w = p60Valid as number;
          if (betterMax((snap as any)?.map5min_w, p300Valid)) updates.map5min_w = p300Valid as number;

          // ─── PAR course / durée — value = vitesse moyenne (m/s) sur `item_seconds` ─
          // 🔒 PROTECTED_FROM_IMPORT
          // sprint_15s_distance, vma, tte_observed_min(_run), protocol_quality,
          // vlamax_protocol, vlamax_source : champs terrain/labo qui ne peuvent
          // jamais être déduits d'un record Nolio. On ne les met PAS à jour ici,
          // ils restent ceux portés par CARRY_OVER_FIELDS.
          // VMA : uniquement via Track Day / Tri Test Day / saisie coach.
          // Le record par/time/360 reste persisté dans `nolio_records` pour
          // référence mais n'alimente plus le snapshot.


          // ─── PAR course / distance — item_seconds = distance (m), value = VITESSE (m/s) ──
          // Conversion : t_total_sec = distance_m / value_mps
          // (Vérifié par cohérence physiologique : la vitesse décroît avec la distance)
          const mpsToTotalSec = (mps: number | null, distanceM: number): number | null => {
            if (mps == null || !Number.isFinite(mps) || mps <= 0) return null;
            return distanceM / mps;
          };
          const validateRaceTime = (
            label: string,
            t: number | null,
            minSec: number,
            maxSec: number,
          ): number | null => {
            if (t == null || !Number.isFinite(t)) return null;
            if (t < minSec || t > maxSec) {
              errors.push(`${label} ignoré — ${Math.round(t)}s hors plage physiologique [${minSec}s, ${maxSec}s]`);
              return null;
            }
            return t;
          };
          const time5k = validateRaceTime("time_5k_sec", mpsToTotalSec(bestMax("par", "distance", 5000, RUN_SPORTS), 5000), 840, 3600);
          const time10k = validateRaceTime("time_10k_sec", mpsToTotalSec(bestMax("par", "distance", 10000, RUN_SPORTS), 10000), 1800, 7200);
          const timeHalf = validateRaceTime("time_half_sec", mpsToTotalSec(bestMax("par", "distance", 21097, RUN_SPORTS), 21097), 3600, 16200);
          const timeMarathon = validateRaceTime("time_marathon_sec", mpsToTotalSec(bestMax("par", "distance", 42195, RUN_SPORTS), 42195), 7200, 32400);
          if (betterMin((snap as any)?.time_5k_sec, time5k)) updates.time_5k_sec = Math.round(time5k as number);
          if (betterMin((snap as any)?.time_10k_sec, time10k)) updates.time_10k_sec = Math.round(time10k as number);
          if (betterMin((snap as any)?.time_half_sec, timeHalf)) updates.time_half_sec = Math.round(timeHalf as number);
          if (betterMin((snap as any)?.time_marathon_sec, timeMarathon)) updates.time_marathon_sec = Math.round(timeMarathon as number);
          // (400m / 1000m : stockés uniquement dans nolio_records, consommés par fetchAthleteRaceRecords pour calibration VLamax)

          // ─── CSS natation = 100/vitesse (s/100m) ──
          // ⚠️ sport_id=19 mélange piscine ET open water. On agrège deux familles
          // de candidats et on prend le MEILLEUR (m/s max) qui reste dans la plage
          // piscine plausible [70, 180] s/100m :
          //  1) par/distance : 1500m, 800m, 400m
          //  2) par/time     : best m/s soutenu sur 1200s, 1500s, 1800s (proxy CSS classique)
          const cssCandidates: Array<{ label: string; mps: number | null }> = [
            { label: "dist1500", mps: bestMax("par", "distance", 1500, [SWIM_SPORT]) },
            { label: "dist800",  mps: bestMax("par", "distance", 800,  [SWIM_SPORT]) },
            { label: "dist400",  mps: bestMax("par", "distance", 400,  [SWIM_SPORT]) },
            { label: "time1200", mps: bestMax("par", "time", 1200, [SWIM_SPORT]) },
            { label: "time1500", mps: bestMax("par", "time", 1500, [SWIM_SPORT]) },
            { label: "time1800", mps: bestMax("par", "time", 1800, [SWIM_SPORT]) },
          ];
          let bestCss: { label: string; cssVal: number } | null = null;
          for (const { label, mps } of cssCandidates) {
            if (mps == null || mps <= 0) continue;
            const cssVal = 100 / mps;
            if (cssVal >= 70 && cssVal <= 180) {
              if (!bestCss || cssVal < bestCss.cssVal) bestCss = { label, cssVal };
            } else {
              errors.push(`css(${label}) ignoré — ${cssVal.toFixed(1)}s/100m hors plage piscine [70, 180]s/100m`);
            }
          }
          if (bestCss && betterMin((snap as any)?.css, bestCss.cssVal)) {
            updates.css = Math.round(bestCss.cssVal * 100) / 100;
            errors.push(`css retenu = ${bestCss.cssVal.toFixed(1)}s/100m (source: ${bestCss.label})`);
          }
          // (50/100/200/1500/3800 : stockés uniquement dans nolio_records)

          // ─── PHRR FC — max parmi tous les records item ≥ 300s (5min) ────
          const hrCandidates = aggregateSource
            .filter(x => x.cat === "phrr" && Number(x.item_seconds) >= 300)
            .map(x => Number(x.value))
            .filter(v => Number.isFinite(v) && v >= 150 && v <= 210);
          if (hrCandidates.length > 0) {
            const fcMaxObs = Math.max(...hrCandidates);
            const curFc = Number((snap as any)?.fc_max);
            if (!Number.isFinite(curFc) || fcMaxObs > curFc) {
              updates.fc_max = Math.round(fcMaxObs);
            }
          }

          if (Object.keys(updates).length > 0) {
            const { error: snapErr } = await admin
              .from("snapshots")
              .update(updates)
              .eq("id", snapId);
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
        snapshot_id: snapshotIdUsed,
        snapshot_created: snapshotCreated,
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
