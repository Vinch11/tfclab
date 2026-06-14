// Nolio Send Plan — envoie les séances d'un plan IA TFCLab vers Nolio.
// Endpoints officiels :
//   POST https://www.nolio.io/api/token/                      (refresh)
//   POST https://www.nolio.io/api/create/planned/training/    (création séance planifiée)
// id_partner = clé de déduplication côté Nolio.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const NOLIO_CLIENT_ID = "THi6TP72G6ZJVHsIdPxA9BRsZ4kVQZiVd0k6ilKv";
const NOLIO_TOKEN_URL = "https://www.nolio.io/api/token/";
const NOLIO_CREATE_TRAINING_URL = "https://www.nolio.io/api/create/planned/training/";

type SupabaseAdmin = ReturnType<typeof createClient>;

type WbalIntensityRef = "FTP" | "CP" | "MAP" | "VMA" | "CSS" | "HR" | "absolute";

type WbalIntervalBlock = {
  reps: number;
  durationSec: number;
  intensity: number;
  intensityRef: WbalIntensityRef;
  defaultRestSec: number;
  recoveryStrategy?: string;
  label?: string;
};

type WbalProfile = {
  sport: string;
  blocks: WbalIntervalBlock[];
  restBetweenBlocksSec?: number;
  notes?: string;
};

type WorkoutStructurePart = { part: string; text: string; zones: string[] };

type ParsedSession = {
  weekNumber: number;
  dayIndex: number; // 0=Lun ... 6=Dim
  sport: string;
  title: string;
  details: string;
  isRest: boolean;
  structure?: WorkoutStructurePart[] | null;
  wbalProfile?: WbalProfile | null;
};

type AthleteRefs = {
  ftp?: number | null;
  vma?: number | null;
  css?: number | null;
  fcMax?: number | null;
};

type Body = {
  athlete_id: string;
  nolio_athlete_id: number;
  planStartDate: string; // YYYY-MM-DD (lundi de la semaine 1)
  sessions: ParsedSession[];
  refs?: AthleteRefs;
};

type NolioStep = {
  type: "step";
  step_duration_type: "duration";
  step_duration_value: number;
  intensity_type: "warmup" | "active" | "rest" | "cooldown" | "repetition";
  target_type: "no_target" | "power" | "pace" | "heartrate";
  target_value_min?: number;
  target_value_max?: number;
  target_value?: number;
  notes?: string;
};

type NolioRepStep = {
  intensity_type: "repetition";
  value: number; // reps
  steps: NolioStep[];
};

type NolioStructuredItem = NolioStep | NolioRepStep;

function mapTargetType(ref: WbalIntensityRef): NolioStep["target_type"] {
  switch (ref) {
    case "FTP":
    case "CP":
    case "MAP":
      return "power";
    case "VMA":
    case "CSS":
      return "pace";
    case "HR":
      return "heartrate";
    default:
      return "no_target";
  }
}

/**
 * Calcule la valeur absolue cible pour un target_type/intensityRef × % intensité.
 * Retourne null si la ref athlète manque.
 */
function computeTargetValue(
  ref: WbalIntensityRef,
  intensityPct: number,
  refs: AthleteRefs,
): number | null {
  if (!Number.isFinite(intensityPct) || intensityPct <= 0) return null;
  switch (ref) {
    case "FTP":
    case "CP":
    case "MAP":
      if (!refs.ftp) return null;
      return Math.round(refs.ftp * intensityPct / 100);
    case "VMA": {
      if (!refs.vma) return null;
      // pace en sec/km : 1000 / (vma_kmh * (intensity/100) * 1000/3600)
      const speedMs = refs.vma * (intensityPct / 100) * (1000 / 3600);
      if (speedMs <= 0) return null;
      return Math.round(1000 / speedMs);
    }
    case "CSS": {
      if (!refs.css) return null;
      // css = sec/100m à 100%. pace cible (sec/100m) = css * 100 / intensity
      return Math.round(refs.css * 100 / intensityPct);
    }
    case "HR":
      if (!refs.fcMax) return null;
      return Math.round(refs.fcMax * intensityPct / 100);
    default:
      return null;
  }
}

/**
 * Construit le tableau structured_workout Nolio depuis un WbalProfile TFCLab.
 * - warmup 10min
 * - chaque block : repetition wrapper si reps>1, sinon step active direct
 * - cooldown 10min
 */
function buildStructuredWorkout(
  wbal: WbalProfile,
  refs: AthleteRefs,
): NolioStructuredItem[] {
  const items: NolioStructuredItem[] = [];

  items.push({
    step_duration_type: "duration",
    step_duration_value: 600,
    intensity_type: "warmup",
    target_type: "no_target",
  });

  for (const block of wbal.blocks ?? []) {
    const targetType = mapTargetType(block.intensityRef);
    const center = computeTargetValue(block.intensityRef, block.intensity, refs);
    const lo = computeTargetValue(block.intensityRef, block.intensity * 0.95, refs);
    const hi = computeTargetValue(block.intensityRef, block.intensity * 1.05, refs);

    const activeStep: NolioStep = {
      step_duration_type: "duration",
      step_duration_value: Math.max(1, Math.round(block.durationSec)),
      intensity_type: "active",
      target_type: targetType,
      ...(targetType !== "no_target" && lo != null && hi != null
        ? { target_value_min: Math.min(lo, hi), target_value_max: Math.max(lo, hi) }
        : {}),
      ...(targetType !== "no_target" && center != null ? { target_value: center } : {}),
      ...(block.label ? { notes: block.label } : {}),
    };

    if (block.reps > 1) {
      const restStep: NolioStep = {
        step_duration_type: "duration",
        step_duration_value: Math.max(1, Math.round(block.defaultRestSec || 60)),
        intensity_type: "rest",
        target_type: "no_target",
      };
      items.push({
        intensity_type: "repetition",
        value: block.reps,
        steps: [activeStep, restStep],
      });
    } else {
      items.push(activeStep);
    }
  }

  items.push({
    step_duration_type: "duration",
    step_duration_value: 600,
    intensity_type: "cooldown",
    target_type: "no_target",
  });

  return items;
}

function mapSport(sport: string): number {
  const s = (sport ?? "").toLowerCase();
  if (s.includes("cap") || s.includes("run") || s.includes("course")) return 1;
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike") || s.includes("cyclisme")) return 2;
  if (s.includes("nat") || s.includes("swim")) return 3;
  if (s.includes("renfo") || s.includes("muscu") || s.includes("strength") || s.includes("force")) return 7;
  return 1;
}

function addDaysYMD(startYMD: string, days: number): string {
  const [y, m, d] = startYMD.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
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
  // CRITIQUE : stocker le NOUVEAU refresh_token (l'ancien est invalidé).
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

async function postSession(opts: {
  url: string;
  accessTokenRef: { current: string };
  refreshTokenStr: string | null;
  admin: SupabaseAdmin;
  userId: string;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number; detail?: string }> {
  const { url, accessTokenRef, refreshTokenStr, admin, userId, payload } = opts;
  let didRefresh = false;
  let attempt = 0;
  while (attempt < 2) {
    attempt += 1;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessTokenRef.current}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
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
      await new Promise((r) => setTimeout(r, 2000));
      // une seule réessai pour 429 (spec)
      const retry = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessTokenRef.current}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const ctype2 = retry.headers.get("content-type") ?? "";
      if (retry.ok) return { ok: true, status: retry.status };
      const detail2 = ctype2.includes("application/json")
        ? JSON.stringify(await retry.json().catch(() => null))
        : (await retry.text()).slice(0, 300);
      return { ok: false, status: retry.status, detail: detail2 };
    }

    const ctype = resp.headers.get("content-type") ?? "";
    if (resp.ok) return { ok: true, status: resp.status };
    const detail = ctype.includes("application/json")
      ? JSON.stringify(await resp.json().catch(() => null))
      : (await resp.text()).slice(0, 300);
    return { ok: false, status: resp.status, detail };
  }
  return { ok: false, status: 0, detail: "unreachable" };
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

    // Validation body
    const body = (await req.json().catch(() => null)) as Body | null;
    if (
      !body ||
      typeof body.athlete_id !== "string" ||
      typeof body.nolio_athlete_id !== "number" ||
      typeof body.planStartDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.planStartDate) ||
      !Array.isArray(body.sessions)
    ) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Token
    const { data: tokenRow, error: tokErr } = await admin
      .from("nolio_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (tokErr || !tokenRow?.access_token) {
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

    let sent = 0;
    let skipped = 0;
    const errors: { week: number; day: number; status: number; detail?: string }[] = [];

    for (let i = 0; i < body.sessions.length; i++) {
      const s = body.sessions[i];
      if (s?.isRest) { skipped += 1; continue; }
      if (!s || !Number.isFinite(s.weekNumber) || !Number.isFinite(s.dayIndex)) {
        skipped += 1; continue;
      }
      if (s.dayIndex < 0 || s.dayIndex > 6) { skipped += 1; continue; }

      const dateStart = addDaysYMD(
        body.planStartDate,
        (s.weekNumber - 1) * 7 + s.dayIndex,
      );

      const structured_workout = s.wbalProfile && Array.isArray(s.wbalProfile.blocks) && s.wbalProfile.blocks.length > 0
        ? buildStructuredWorkout(s.wbalProfile, body.refs ?? {})
        : null;

      const idPartnerStr = String(body.nolio_athlete_id) + String(s.weekNumber).padStart(2, "0") + String(s.dayIndex);
      const payload: Record<string, unknown> = {
        id_partner: parseInt(idPartnerStr, 10),
        athlete_id: body.nolio_athlete_id,
        sport_id: mapSport(s.sport),
        name: s.title ?? "Séance",
        date_start: dateStart,
        description: s.details ?? "",
      };
      if (structured_workout) payload.structured_workout = structured_workout;

      const res = await postSession({
        url: NOLIO_CREATE_TRAINING_URL,
        accessTokenRef,
        refreshTokenStr,
        admin,
        userId,
        payload,
      });

      if (res.ok) sent += 1;
      else errors.push({ week: s.weekNumber, day: s.dayIndex, status: res.status, detail: res.detail });

      // 200ms entre chaque pour respecter rate-limits Nolio
      if (i < body.sessions.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return new Response(JSON.stringify({
      ok: errors.length === 0,
      sent,
      skipped,
      total: body.sessions.length,
      errors: errors.slice(0, 20),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nolio-send-plan fatal", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
