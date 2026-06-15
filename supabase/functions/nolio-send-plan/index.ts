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
const NOLIO_DELETE_TRAINING_URL = "https://www.nolio.io/api/delete/planned/training/";

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
  sessionIndex?: number; // 0 = première séance du jour, 1 = deuxième, etc.
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

const HR_ZONE_PCT: Record<string, [number, number]> = {
  "1": [50, 60],
  "2": [60, 70],
  "3": [70, 80],
  "4": [80, 90],
  "5": [90, 95],
  "6": [95, 100],
};

/** Détecte une cible depuis le texte libre : "100-108% FTP", "85% FTP", "Z2". */
function buildTargetFromText(
  text: string,
  refs: AthleteRefs,
): Pick<NolioStep, "target_type" | "target_value_min" | "target_value_max" | "target_value"> {
  if (!text) return { target_type: "no_target" };
  const t = text.toLowerCase();

  // X-Y% FTP
  const ftpRange = t.match(/(\d+)\s*[-–—]\s*(\d+)\s*%\s*ftp/);
  if (ftpRange && refs.ftp) {
    const a = parseInt(ftpRange[1], 10);
    const b = parseInt(ftpRange[2], 10);
    const lo = Math.round(refs.ftp * Math.min(a, b) / 100);
    const hi = Math.round(refs.ftp * Math.max(a, b) / 100);
    return { target_type: "power", target_value_min: lo, target_value_max: hi, target_value: Math.round((lo + hi) / 2) };
  }
  // X% FTP
  const ftpSingle = t.match(/(\d+)\s*%\s*ftp/);
  if (ftpSingle && refs.ftp) {
    const a = parseInt(ftpSingle[1], 10);
    const v = Math.round(refs.ftp * a / 100);
    return { target_type: "power", target_value_min: v, target_value_max: v, target_value: v };
  }
  // ZN (heart rate zones)
  const zMatch = t.match(/\bz\s*([1-6])\b/);
  if (zMatch && refs.fcMax) {
    const [pctLo, pctHi] = HR_ZONE_PCT[zMatch[1]];
    const lo = Math.round(refs.fcMax * pctLo / 100);
    const hi = Math.round(refs.fcMax * pctHi / 100);
    return { target_type: "heartrate", target_value_min: lo, target_value_max: hi, target_value: Math.round((lo + hi) / 2) };
  }
  return { target_type: "no_target" };
}

/** Détecte NxM' ou N×M' dans le texte, et extrait la récup après "/". */
function parseRepetitionPattern(text: string): {
  reps: number;
  workSec: number;
  restSec: number | null;
  restText: string;
} | null {
  if (!text) return null;
  // 4x8' or 4×8' or 4 x 8 min
  const m = text.match(/(\d+)\s*[x×]\s*(\d+)\s*(?:'|’|min)/i);
  if (!m) return null;
  const reps = parseInt(m[1], 10);
  const workMin = parseInt(m[2], 10);
  if (!reps || !workMin) return null;
  // Récup : segment après "/"
  let restSec: number | null = null;
  let restText = "";
  const slashIdx = text.indexOf("/", m.index! + m[0].length);
  if (slashIdx >= 0) {
    restText = text.slice(slashIdx + 1).trim();
    restSec = parseDurationToSec(restText);
  }
  return { reps, workSec: workMin * 60, restSec, restText };
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
    const text = p.text || "";

    // Tentative répétition (uniquement pour parties actives)
    if (intensity === "active") {
      const rep = parseRepetitionPattern(text);
      if (rep) {
        const fromZones = buildTargetFromZones(p.zones || [], refs);
        const fromText = buildTargetFromText(text, refs);
        const target = fromZones.target_type !== "no_target" ? fromZones : fromText;
        const activeStep: NolioStep = {
          type: "step",
          step_duration_type: "duration",
          step_duration_value: rep.workSec,
          intensity_type: "active",
          ...target,
          notes: text.slice(0, 500),
        };
        const restTarget = rep.restText
          ? buildTargetFromText(rep.restText, refs)
          : { target_type: "no_target" as const };
        const restStep: NolioStep = {
          type: "step",
          step_duration_type: "duration",
          step_duration_value: rep.restSec ?? 120,
          intensity_type: "rest",
          ...restTarget,
          ...(rep.restText ? { notes: rep.restText.slice(0, 500) } : {}),
        };
        items.push({
          type: "repetition",
          intensity_type: "repetition",
          value: rep.reps,
          steps: [activeStep, restStep],
        });
        continue;
      }
    }

    // Durée : texte → wbalProfile → défauts
    let duration = parseDurationToSec(text);
    if (duration == null) {
      if (wbalProfile?.blocks?.length && intensity === "active") {
        duration = wbalProfile.blocks[0]?.durationSec ?? 1200;
      } else {
        duration = intensity === "active" ? 1200 : 600;
      }
    }

    const fromZones = buildTargetFromZones(p.zones || [], refs);
    const target = fromZones.target_type !== "no_target"
      ? fromZones
      : buildTargetFromText(text, refs);
    items.push({
      type: "step",
      step_duration_type: "duration",
      step_duration_value: Math.max(1, duration),
      intensity_type: intensity,
      ...target,
      ...(text ? { notes: text.slice(0, 500) } : {}),
    });
  }
  return items;
}



// Mapping basé sur les vrais sport_id Nolio découverts via GET /api/get/training/
// 2=Course à pied, 14=Vélo Route, 18=Vélo Home Trainer, 19=Natation, 20=Renforcement, 52=Trail
function detectSportId(text: string): number | null {
  const s = normalizeStr(text);
  if (!s) return null;
  // Ordre important : trail avant run, home trainer avant bike, natation avant rien
  if (s.includes("trail")) return 52;
  if (s.includes("home trainer") || s.includes("hometrainer") || /\bht\b/.test(s) || s.includes("indoor")) return 18;
  if (s.includes("bike") || s.includes("velo") || s.includes("cycle") || s.includes("cyclisme") || s.includes("cycling")) return 14;
  if (s.includes("swim") || s.includes("nat") || s.includes("natation") || s.includes("swimming")) return 19;
  if (s.includes("renfo") || s.includes("strength") || s.includes("muscu") || s.includes("renforcement")) return 20;
  if (s.includes("brick") || s.includes("triathlon") || /\btri\b/.test(s)) return 2;
  if (s.includes("run") || s.includes("cap") || s.includes("course") || s.includes("running")) return 2;
  return null;
}

function mapSport(sport: string, title?: string, id?: string | null): number {
  const fromSport = detectSportId(sport);
  if (fromSport !== null) return fromSport;
  const fromTitle = detectSportId(title ?? "");
  if (fromTitle !== null) return fromTitle;
  const fromId = detectSportId(id ?? "");
  if (fromId !== null) return fromId;
  return 2; // défaut Course à pied
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
}): Promise<{ ok: boolean; status: number; detail?: string; data?: unknown }> {
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
      const isJson2 = ctype2.includes("application/json");
      const parsed2 = isJson2 ? await retry.json().catch(() => null) : null;
      if (retry.ok) return { ok: true, status: retry.status, data: parsed2 };
      const detail2 = isJson2 ? JSON.stringify(parsed2) : (await retry.text()).slice(0, 300);
      return { ok: false, status: retry.status, detail: detail2 };
    }

    const ctype = resp.headers.get("content-type") ?? "";
    const isJson = ctype.includes("application/json");
    const parsed = isJson ? await resp.json().catch(() => null) : null;
    if (resp.ok) return { ok: true, status: resp.status, data: parsed };
    const detail = isJson ? JSON.stringify(parsed) : (await resp.text()).slice(0, 300);
    return { ok: false, status: resp.status, detail };
  }
  return { ok: false, status: 0, detail: "unreachable" };
}

/**
 * Strategy C : recalcule target_value_min/max depuis pct_*_min/max si refs athlète présentes.
 * Conserve target_value_* stocké comme fallback si refs manquantes ou pct absent.
 * Récursif sur les blocs `repetition`.
 */
function recomputeAbsoluteFromPct(items: unknown, refs: AthleteRefs): unknown {
  if (!Array.isArray(items)) return items;
  return items.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const item = { ...(raw as Record<string, unknown>) };
    if (item.type === "repetition" && Array.isArray(item.steps)) {
      item.steps = recomputeAbsoluteFromPct(item.steps, refs);
      return item;
    }
    const ttype = item.target_type as string | undefined;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

    // % FTP → watts
    if (ttype === "power") {
      const pmin = num(item.pct_ftp_min);
      const pmax = num(item.pct_ftp_max);
      if (refs.ftp && pmin != null && pmax != null) {
        const lo = Math.round(refs.ftp * pmin / 100);
        const hi = Math.round(refs.ftp * pmax / 100);
        item.target_value_min = lo;
        item.target_value_max = hi;
        item.target_value = Math.round((lo + hi) / 2);
      }
    }
    // % VMA → pace s/km (% bas = pace haute)
    else if (ttype === "pace") {
      const pmin = num(item.pct_vma_min);
      const pmax = num(item.pct_vma_max);
      if (refs.vma && pmin != null && pmax != null && pmin > 0 && pmax > 0) {
        const paceFromVma = (pct: number) => Math.round(1000 / (refs.vma! * (pct / 100) * (1000 / 3600)));
        const lo = paceFromVma(pmax); // % haut = pace courte
        const hi = paceFromVma(pmin);
        item.target_value_min = Math.min(lo, hi);
        item.target_value_max = Math.max(lo, hi);
        item.target_value = Math.round((lo + hi) / 2);
      } else {
        // CSS pour natation (s/100m). pct_css = % du temps CSS (105 = +5% lent).
        const cmin = num(item.pct_css_min);
        const cmax = num(item.pct_css_max);
        if (refs.css && cmin != null && cmax != null) {
          const lo = Math.round(refs.css * cmin / 100);
          const hi = Math.round(refs.css * cmax / 100);
          item.target_value_min = Math.min(lo, hi);
          item.target_value_max = Math.max(lo, hi);
          item.target_value = Math.round((lo + hi) / 2);
        }
      }
    }
    // % HRmax → bpm
    else if (ttype === "heartrate") {
      const pmin = num(item.pct_hrmax_min);
      const pmax = num(item.pct_hrmax_max);
      if (refs.fcMax && pmin != null && pmax != null) {
        const lo = Math.round(refs.fcMax * pmin / 100);
        const hi = Math.round(refs.fcMax * pmax / 100);
        item.target_value_min = lo;
        item.target_value_max = hi;
        item.target_value = Math.round((lo + hi) / 2);
      }
    }
    return item;
  });
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

    // Préchargement des overrides Nolio par session_id (structured_workout + sport_id personnalisés)
    const sessionIds = Array.from(
      new Set(
        body.sessions
          .map((s) => (s?.id ?? "").trim())
          .filter((id) => id.length > 0),
      ),
    );
    const overridesMap = new Map<string, { sport_id: number; structured_workout: unknown }>();
    const generatedMap = new Map<string, { sport_id: number; structured_workout: unknown }>();
    if (sessionIds.length > 0) {
      const { data: ovRows } = await admin
        .from("nolio_workout_overrides")
        .select("session_id, sport_id, structured_workout")
        .in("session_id", sessionIds);
      for (const r of (ovRows ?? []) as Array<{ session_id: string; sport_id: number; structured_workout: unknown }>) {
        overridesMap.set(r.session_id, { sport_id: r.sport_id, structured_workout: r.structured_workout });
      }
      // Structures Nolio générées par IA et validées (status='ok'). Priorité inférieure aux overrides manuels.
      const { data: genRows } = await admin
        .from("nolio_structures_generated")
        .select("workout_id, sport_id, structured_workout, status")
        .in("workout_id", sessionIds)
        .eq("status", "ok");
      for (const r of (genRows ?? []) as Array<{ workout_id: string; sport_id: number; structured_workout: unknown }>) {
        generatedMap.set(r.workout_id, { sport_id: r.sport_id, structured_workout: r.structured_workout });
      }
    }


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
      const overrideKey = (s.id ?? "").trim();
      const override = overrideKey ? overridesMap.get(overrideKey) : undefined;
      let structured_workout: unknown = null;
      let usedOverride = false;

      // Détection du shape de l'override :
      //  - Nouveau (parts) : [{ part, text, zones }] → on remplace la `structure`
      //    source et on relance le parsing automatique.
      //  - Ancien (Nolio brut) : [{ type:"step"|"repetition", ... }] → usage direct.
      let sourceStructure: WorkoutStructurePart[] = structure;
      if (override && Array.isArray(override.structured_workout) && override.structured_workout.length > 0) {
        const first = (override.structured_workout as unknown[])[0] as Record<string, unknown> | undefined;
        const isPartsShape = first !== undefined && typeof first === "object" && "part" in first;
        if (isPartsShape) {
          sourceStructure = (override.structured_workout as unknown as WorkoutStructurePart[]).map((p) => ({
            part: String(p.part ?? ""),
            text: String(p.text ?? ""),
            zones: Array.isArray(p.zones) ? p.zones.map((z) => String(z)) : [],
          }));
          usedOverride = true;
        } else {
          structured_workout = override.structured_workout;
          usedOverride = true;
        }
      }

      // Si pas d'override manuel : tenter la structure générée par IA (status='ok').
      let usedGenerated = false;
      if (!usedOverride && overrideKey) {
        const gen = generatedMap.get(overrideKey);
        if (gen && Array.isArray(gen.structured_workout) && gen.structured_workout.length > 0) {
          // Strategy C : recalcul depuis pct_* avec refs de l'athlète destinataire,
          // fallback sur target_value_* stocké (valeurs absolues figées au moment du batch).
          structured_workout = recomputeAbsoluteFromPct(gen.structured_workout, body.refs ?? {});
          usedGenerated = true;
        }
      }

      if (structured_workout == null && sourceStructure.length > 0) {
        let built = buildStructuredFromParts(sourceStructure, body.refs ?? {}, s.wbalProfile ?? null);
        // Garde-fou : jamais de wrapper repetition à la racine englobant toute la séance.
        if (built && built.length === 1 && built[0].type === "repetition") {
          built = (built[0] as NolioRepStep).steps;
        }
        structured_workout = built;
      }

      const sessionIndex = Number.isFinite(s.sessionIndex as number) ? Number(s.sessionIndex) : 0;
      const idPartner = parseInt(
        String(body.nolio_athlete_id) +
        String(s.weekNumber).padStart(2, '0') +
        String(s.dayIndex) +
        String(sessionIndex) +
        String(new Date().getDate()).padStart(2, '0'),
        10,
      );
      const generatedForSport = usedGenerated && overrideKey ? generatedMap.get(overrideKey) : undefined;
      const sportId = usedOverride && override
        ? override.sport_id
        : generatedForSport
          ? generatedForSport.sport_id
          : mapSport(s.sport, s.title, s.id ?? null);


      // Suppression préalable : la séance peut déjà exister avec un sport_id obsolète.
      // On ignore systématiquement les erreurs (404/inexistante = cas normal).
      const deleteRes = await postSession({
        url: NOLIO_DELETE_TRAINING_URL,
        accessTokenRef,
        refreshTokenStr,
        admin,
        userId,
        payload: { id_partner: idPartner, athlete_id: body.nolio_athlete_id },
      }).catch(() => null);

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
        used_override: usedOverride,
        used_generated: usedGenerated,
        structured_workout,
        delete_response: deleteRes
          ? { ok: deleteRes.ok, status: deleteRes.status, detail: deleteRes.detail ?? null }
          : null,
        response: {
          ok: res.ok,
          status: res.status,
          detail: res.detail ?? null,
          data_raw: res.data ?? null,
        },
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
