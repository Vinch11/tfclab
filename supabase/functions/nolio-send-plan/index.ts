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
  id?: string | null;
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
  type: "repetition";
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
      const speedMs = refs.vma * (intensityPct / 100) * (1000 / 3600);
      if (speedMs <= 0) return null;
      return Math.round(1000 / speedMs);
    }
    case "CSS": {
      if (!refs.css) return null;
      return Math.round(refs.css * 100 / intensityPct);
    }
    case "HR":
      if (!refs.fcMax) return null;
      return Math.round(refs.fcMax * intensityPct / 100);
    default:
      return null;
  }
}

/** Parse "30min", "20 min", "1h", "1h30", "45'", "45 s" → secondes. Retourne null si aucun match. */
function parseDurationToSec(text: string): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  // 1h30 / 1h
  const hm = t.match(/(\d+)\s*h\s*(\d{1,2})?/);
  if (hm) {
    const h = parseInt(hm[1], 10) || 0;
    const m = hm[2] ? parseInt(hm[2], 10) : 0;
    const sec = h * 3600 + m * 60;
    if (sec > 0) return sec;
  }
  // 30min / 30 min / 30'
  const mm = t.match(/(\d+)\s*(?:min|'|’)/);
  if (mm) {
    const m = parseInt(mm[1], 10) || 0;
    if (m > 0) return m * 60;
  }
  // 45 s / 45sec
  const ss = t.match(/(\d+)\s*(?:s|sec)\b/);
  if (ss) {
    const s = parseInt(ss[1], 10) || 0;
    if (s > 0) return s;
  }
  return null;
}

function normalizeStr(s: string): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function mapPartToIntensity(part: string): "warmup" | "active" | "cooldown" {
  const p = normalizeStr(part);
  if (p.includes("warm") || p.includes("echauffement")) return "warmup";
  if (p.includes("cool") || p.includes("retour") || p.includes("recup finale")) return "cooldown";
  return "active";
}

/** Cherche un range "127-149 bpm" / "127 - 149 bpm" / "200-250 W" / "4:30-4:00/km" */
function parseRange(text: string, unitPattern: string): { min: number; max: number } | null {
  const re = new RegExp(`(\\d+(?:[.:]\\d+)?)\\s*[-–—]\\s*(\\d+(?:[.:]\\d+)?)\\s*${unitPattern}`, "i");
  const m = text.match(re);
  if (!m) return null;
  const toNum = (s: string) => {
    if (s.includes(":")) {
      const [mm, ss] = s.split(":");
      return parseInt(mm, 10) * 60 + parseInt(ss, 10);
    }
    return parseFloat(s);
  };
  const a = toNum(m[1]);
  const b = toNum(m[2]);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

function parsePctRange(text: string): { min: number; max: number } | null {
  const m = text.match(/(\d+)\s*[-–—]\s*(\d+)\s*%/);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

/** Détermine target depuis zones[]. */
function buildTargetFromZones(
  zones: string[],
  refs: AthleteRefs,
): Pick<NolioStep, "target_type" | "target_value_min" | "target_value_max" | "target_value"> {
  const zText = (zones ?? []).join(" | ");
  const zNorm = normalizeStr(zText);

  // Heart rate
  if (zNorm.includes("bpm") || zNorm.includes(" fc") || /\bfc\b/.test(zNorm) || /\bz\d/.test(zNorm)) {
    const r = parseRange(zText, "bpm");
    if (r) {
      return {
        target_type: "heartrate",
        target_value_min: Math.round(r.min),
        target_value_max: Math.round(r.max),
        target_value: Math.round((r.min + r.max) / 2),
      };
    }
    return { target_type: "no_target" };
  }

  // Power
  if (/\bw\b/.test(zNorm) || zNorm.includes("ftp") || zNorm.includes("puissance") || zNorm.includes("watt")) {
    const rw = parseRange(zText, "w");
    if (rw) {
      return {
        target_type: "power",
        target_value_min: Math.round(rw.min),
        target_value_max: Math.round(rw.max),
        target_value: Math.round((rw.min + rw.max) / 2),
      };
    }
    const pct = parsePctRange(zText);
    if (pct && refs.ftp) {
      const lo = Math.round(refs.ftp * pct.min / 100);
      const hi = Math.round(refs.ftp * pct.max / 100);
      return {
        target_type: "power",
        target_value_min: lo,
        target_value_max: hi,
        target_value: Math.round((lo + hi) / 2),
      };
    }
    return { target_type: "no_target" };
  }

  // Pace
  if (zNorm.includes("allure") || zNorm.includes("/km") || zNorm.includes("vma")) {
    const rp = parseRange(zText, "\\/?\\s*km");
    if (rp) {
      return {
        target_type: "pace",
        target_value_min: Math.round(rp.min),
        target_value_max: Math.round(rp.max),
        target_value: Math.round((rp.min + rp.max) / 2),
      };
    }
    const pct = parsePctRange(zText);
    if (pct && refs.vma) {
      const lo = computeTargetValue("VMA", pct.max, refs); // pace ↑ qd %↓
      const hi = computeTargetValue("VMA", pct.min, refs);
      if (lo != null && hi != null) {
        return {
          target_type: "pace",
          target_value_min: Math.min(lo, hi),
          target_value_max: Math.max(lo, hi),
          target_value: Math.round((lo + hi) / 2),
        };
      }
    }
    return { target_type: "no_target" };
  }

  return { target_type: "no_target" };
}

/** Construit structured_workout depuis le tableau `structure` (warm/main/cool). */
function buildStructuredFromParts(
  structure: WorkoutStructurePart[],
  refs: AthleteRefs,
  wbalProfile?: WbalProfile | null,
): NolioStructuredItem[] {
  const items: NolioStructuredItem[] = [];
  for (const p of structure) {
    const intensity = mapPartToIntensity(p.part);

    // Durée : texte → wbalProfile → défauts
    let duration = parseDurationToSec(p.text || "");
    if (duration == null) {
      if (wbalProfile?.blocks?.length && intensity === "active") {
        duration = wbalProfile.blocks[0]?.durationSec ?? 1200;
      } else {
        duration = intensity === "active" ? 1200 : 600;
      }
    }

    const target = buildTargetFromZones(p.zones || [], refs);
    items.push({
      type: "step",
      step_duration_type: "duration",
      step_duration_value: Math.max(1, duration),
      intensity_type: intensity,
      ...target,
      ...(p.text ? { notes: p.text.slice(0, 500) } : {}),
    });
  }
  return items;
}



function detectSportId(text: string): number | null {
  const s = normalizeStr(text);
  if (!s) return null;
  if (s.includes("bike") || s.includes("velo") || s.includes("cycle") || s.includes("cyclisme") || s.includes("cycling")) return 2;
  if (s.includes("swim") || s.includes("nat") || s.includes("natation") || s.includes("swimming")) return 3;
  if (s.includes("renfo") || s.includes("strength") || s.includes("muscu") || s.includes("renforcement")) return 7;
  if (s.includes("run") || s.includes("cap") || s.includes("trail") || s.includes("course") || s.includes("running")) return 1;
  return null;
}

function mapSport(sport: string, title?: string, id?: string | null): number {
  const fromSport = detectSportId(sport);
  if (fromSport !== null) return fromSport;
  const fromTitle = detectSportId(title ?? "");
  if (fromTitle !== null) return fromTitle;
  const fromId = detectSportId(id ?? "");
  if (fromId !== null) return fromId;
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
    const debugLog: Array<Record<string, unknown>> = [];

    // Suffixe de version basé sur la date du jour (MMDD) → force Nolio à accepter un nouvel envoi
    const now = new Date();
    const versionSuffix = String(now.getUTCMonth() + 1).padStart(2, "0") + String(now.getUTCDate()).padStart(2, "0");

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

      const structure = Array.isArray(s.structure) ? s.structure : [];
      const structured_workout = structure.length > 0
        ? buildStructuredFromParts(structure, body.refs ?? {}, s.wbalProfile ?? null)
        : null;

      const idPartnerBase = String(body.nolio_athlete_id) + String(s.weekNumber).padStart(2, "0") + String(s.dayIndex);
      const idPartner = `${idPartnerBase}_${versionSuffix}`;
      const sportId = mapSport(s.sport, s.title, s.id ?? null);
      const payload: Record<string, unknown> = {
        id_partner: idPartner,
        athlete_id: body.nolio_athlete_id,
        sport_id: sportId,
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

      debugLog.push({
        week: s.weekNumber,
        day: s.dayIndex,
        name: s.title ?? null,
        input: {
          sport: s.sport ?? null,
          title: s.title ?? null,
          id: s.id ?? null,
        },
        id_partner: idPartner,
        sport_id: sportId,
        structured_workout,
        response: { ok: res.ok, status: res.status, detail: res.detail ?? null },
      });

      if (res.ok) sent += 1;
      else errors.push({ week: s.weekNumber, day: s.dayIndex, status: res.status, detail: res.detail });

      // 200ms entre chaque pour respecter rate-limits Nolio
      if (i < body.sessions.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Log debug dans nolio_sync_log (notes = JSON complet pour vérifier ce qui est transmis)
    try {
      const notesJson = JSON.stringify({ sessions: debugLog }).slice(0, 100000);
      await admin.from("nolio_sync_log").insert({
        user_id: userId,
        athletes_count: sent,
        status: errors.length === 0 ? "success" : "partial",
        error_message: errors.length > 0 ? JSON.stringify(errors.slice(0, 5)) : null,
        notes: notesJson,
      });
    } catch (logErr) {
      console.error("nolio_sync_log insert failed", logErr);
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
