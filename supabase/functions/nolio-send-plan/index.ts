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

type TerrainAlternative = { icon?: string; label: string; hint?: string };

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
  avoid?: string;
  notes?: string;
  objectif?: string;
  /** Alternatives terrain (trail) calculées côté client depuis la fiche bibliothèque. */
  alternatives?: TerrainAlternative[];
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
  target_type: "no_target" | "power" | "pace" | "min/100m" | "heartrate" | "duration";
  target_unit?: "W" | "%ftp" | "min/km" | "bpm";

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

  // Heart rate zones TFCLab — pour tous les sports non-vélo, la normalisation finale garde FC.
  const zonePct = highestZonePct(zText);
  if (zonePct) return hrTargetFromPct(zonePct[0], zonePct[1], refs);

  if (zNorm.includes("bpm") || zNorm.includes(" fc") || /\bfc\b/.test(zNorm)) {
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

  // Pace : cible provisoire seulement ; le normalizer final convertit toute pace non-vélo en FC.
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
  "4": [80, 87],
  "4a": [80, 87],
  "4b": [87, 91],
  "5": [91, 95],
  "6": [95, 100],
};

function hrTargetFromPct(
  pctLo: number,
  pctHi: number,
  refs?: AthleteRefs,
): Pick<NolioStep, "target_type" | "target_value_min" | "target_value_max" | "target_value"> & { pct_hrmax_min: number; pct_hrmax_max: number } {
  const loPct = Math.max(40, Math.min(100, Math.round(Math.min(pctLo, pctHi))));
  const hiPct = Math.max(loPct + 1, Math.min(100, Math.round(Math.max(pctLo, pctHi))));
  const fc = typeof refs?.fcMax === "number" && refs.fcMax > 0 ? refs.fcMax : 185;
  const lo = Math.round(fc * loPct / 100);
  const hi = Math.round(fc * hiPct / 100);
  return {
    target_type: "heartrate",
    pct_hrmax_min: loPct,
    pct_hrmax_max: hiPct,
    target_value_min: lo,
    target_value_max: hi,
    target_value: Math.round((lo + hi) / 2),
  };
}

function highestZonePct(text?: string): [number, number] | null {
  const norm = normalizeStr(text ?? "");
  const matches = Array.from(norm.matchAll(/\bz\s*([1-6])\s*([ab])?\b/g));
  if (matches.length === 0) return null;
  const rank = (m: RegExpMatchArray) => {
    const z = Number(m[1]);
    const suffix = m[2] ?? "";
    return z * 10 + (suffix === "b" ? 2 : suffix === "a" ? 1 : 0);
  };
  const top = matches.sort((a, b) => rank(b) - rank(a))[0];
  const key = `${top[1]}${top[2] ?? ""}`;
  return HR_ZONE_PCT[key] ?? HR_ZONE_PCT[top[1]] ?? null;
}

/** Détecte une cible depuis le texte libre : "100-108% FTP", "85% FTP", "Z2", "5:25/km", "4:30-4:45/km". */
function buildTargetFromText(
  text: string,
  refs: AthleteRefs,
): Pick<NolioStep, "target_type" | "target_value_min" | "target_value_max" | "target_value"> {
  if (!text) return { target_type: "no_target" };
  const t = text.toLowerCase();

  // Helper : convertit "M:SS" en secondes
  const msToSec = (s: string): number | null => {
    const m = s.match(/^(\d+):(\d{1,2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };

  // ⏱️ Allure course EXPLICITE : "4:30-4:45/km" ou "4:30 – 4:45 /km"
  const paceRange = t.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s*\/\s*km/);
  if (paceRange) {
    const a = msToSec(paceRange[1]);
    const b = msToSec(paceRange[2]);
    if (a !== null && b !== null) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return { target_type: "pace", target_value_min: lo, target_value_max: hi, target_value: Math.round((lo + hi) / 2) };
    }
  }
  // Allure course unique : "5:25/km" ou "pace 5:25/km" ou "@5:25/km"
  const paceSingle = t.match(/(\d{1,2}:\d{2})\s*\/\s*km/);
  if (paceSingle) {
    const v = msToSec(paceSingle[1]);
    if (v !== null) {
      const lo = Math.max(60, v - 5);
      const hi = v + 5;
      return { target_type: "pace", target_value_min: lo, target_value_max: hi, target_value: v };
    }
  }
  // 🏊 Allure natation EXPLICITE : "1:25/100m" ou "1:25-1:30/100m"
  const swimRange = t.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s*\/\s*100\s*m/);
  if (swimRange) {
    const a = msToSec(swimRange[1]);
    const b = msToSec(swimRange[2]);
    if (a !== null && b !== null) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return { target_type: "pace", target_value_min: lo, target_value_max: hi, target_value: Math.round((lo + hi) / 2) };
    }
  }
  const swimSingle = t.match(/(\d{1,2}:\d{2})\s*\/\s*100\s*m/);
  if (swimSingle) {
    const v = msToSec(swimSingle[1]);
    if (v !== null) {
      return { target_type: "pace", target_value_min: Math.max(30, v - 3), target_value_max: v + 3, target_value: v };
    }
  }

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
    const lo = Math.round(refs.ftp * Math.max(0, a - 3) / 100);
    const hi = Math.round(refs.ftp * (a + 3) / 100);
    return { target_type: "power", target_value_min: lo, target_value_max: hi, target_value: Math.round((lo + hi) / 2) };
  }
  // X-Y% VMA → pace via VMA athlète
  const vmaRange = t.match(/(\d+)\s*[-–—]\s*(\d+)\s*%\s*vma/);
  if (vmaRange && refs.vma) {
    const a = parseInt(vmaRange[1], 10);
    const b = parseInt(vmaRange[2], 10);
    const lo = computeTargetValue("VMA", Math.max(a, b), refs);
    const hi = computeTargetValue("VMA", Math.min(a, b), refs);
    if (lo !== null && hi !== null) {
      return { target_type: "pace", target_value_min: Math.min(lo, hi), target_value_max: Math.max(lo, hi), target_value: Math.round((lo + hi) / 2) };
    }
  }
  // X% VMA
  const vmaSingle = t.match(/(\d+)\s*%\s*vma/);
  if (vmaSingle && refs.vma) {
    const a = parseInt(vmaSingle[1], 10);
    const lo = computeTargetValue("VMA", a + 2, refs);
    const hi = computeTargetValue("VMA", Math.max(50, a - 2), refs);
    if (lo !== null && hi !== null) {
      return { target_type: "pace", target_value_min: Math.min(lo, hi), target_value_max: Math.max(lo, hi), target_value: Math.round((lo + hi) / 2) };
    }
  }
  // ZN / Z4a / Z4b (heart rate zones TFCLab)
  const zonePct = highestZonePct(t);
  if (zonePct) return hrTargetFromPct(zonePct[0], zonePct[1], refs);
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

function cleanTargetFields(src: Record<string, unknown>) {
  for (const key of [
    "target_unit",
    "target_value",
    "target_value_min",
    "target_value_max",
    "pct_ftp_min",
    "pct_ftp_max",
    "pct_vma_min",
    "pct_vma_max",
    "pct_css_min",
    "pct_css_max",
    "pct_hrmax_min",
    "pct_hrmax_max",
  ]) delete src[key];
}

function vmaPctToHrZone(pct: number): [number, number] {
  if (pct < 60) return [50, 60];
  if (pct < 75) return [60, 70];
  if (pct < 85) return [70, 80];
  if (pct < 92) return [80, 87];
  if (pct < 97) return [87, 91];
  if (pct < 103) return [91, 95];
  return [95, 100];
}

function cssPctToHrZone(pct: number): [number, number] {
  if (pct >= 115) return [50, 60];
  if (pct >= 108) return [60, 70];
  if (pct >= 103) return [70, 80];
  if (pct >= 98) return [80, 87];
  if (pct >= 93) return [87, 91];
  if (pct >= 88) return [91, 95];
  return [95, 100];
}

function defaultHrZoneForStep(src: Record<string, unknown>): [number, number] {
  const intensity = String(src.intensity_type ?? "");
  if (intensity === "warmup" || intensity === "cooldown" || intensity === "rest") return HR_ZONE_PCT["1"];
  return HR_ZONE_PCT["2"];
}

/**
 * Normalise un structured_workout avant envoi à Nolio.
 * - Renomme `repeat_count` → `value` sur tous les nœuds `repetition` (spec officielle Nolio).
 * - Supprime récursivement les clés `null`/`undefined` (Nolio rejette `pct_ftp_min: null`, etc.).
 * - Convertit les steps `intensity_type:"rest"` + `target_type:"no_target"` en cible Z1 selon le sport :
 *     • Vélo (sport_id 14/18) → power 45–55% FTP
 *     • Course/Trail (sport_id 2/52) → heartrate 50–60% FCmax
 *     • Natation (sport_id 19) → duration sans cible (rest naturel)
 * Ref: https://github.com/NolioApp/NolioAPI-Documentation/wiki/Structured-Workout
 */
function normalizeStructuredWorkoutForNolio(
  input: unknown,
  refs?: AthleteRefs,
  sportId?: number,
): unknown {
  if (Array.isArray(input)) {
    return input
      .map((v) => normalizeStructuredWorkoutForNolio(v, refs, sportId))
      .filter((v) => v !== null && v !== undefined);
  }
  if (input && typeof input === "object") {
    const src = input as Record<string, unknown>;

    // Rest + no_target → cible Z1 sport-aware (bike: power + step_percent_*, run: HR)
    if (
      src.type === "step" &&
      src.intensity_type === "rest" &&
      src.target_type === "no_target"
    ) {
      const isBike = sportId === 14 || sportId === 18;
      const isRun = sportId === 2 || sportId === 52;
      const ftp = refs?.ftp;
      const fcMax = refs?.fcMax;

      if (isBike && typeof ftp === "number" && ftp > 0) {
        const lo = Math.round(ftp * 0.45);
        const hi = Math.round(ftp * 0.55);
        src.target_type = "power";
        src.target_value_min = lo;
        src.target_value_max = hi;
        src.target_value = Math.round((lo + hi) / 2);

      } else if (isRun && typeof fcMax === "number" && fcMax > 0) {
        const lo = Math.round(fcMax * 0.50);
        const hi = Math.round(fcMax * 0.60);
        src.target_type = "heartrate";
        src.target_value_min = lo;
        src.target_value_max = hi;
        src.target_value = Math.round((lo + hi) / 2);
      }
      // 🏊 Natation rest : pas de cible naturelle. Forcer target_type="no_target"
      // (SANS target_value_*) pour éviter la pastille "empty_unit" côté Nolio.
      if (sportId === 19) {
        src.target_type = "no_target";
        delete (src as Record<string, unknown>).target_value;
        delete (src as Record<string, unknown>).target_value_min;
        delete (src as Record<string, unknown>).target_value_max;
        delete (src as Record<string, unknown>).target_unit;
        delete (src as Record<string, unknown>).manual_values;

      }

    }

    // Run/Trail (sport_id 2/52) : step_duration_type "distance" interdit côté Nolio.
    if (
      (sportId === 2 || sportId === 52) &&
      src.type === "step" &&
      src.step_duration_type === "distance"
    ) {
      const distM = typeof src.step_duration_value === "number" ? src.step_duration_value : null;
      const vma = refs?.vma;
      if (distM !== null && distM > 0 && typeof vma === "number" && vma > 0) {
        const speedMs = vma * (1000 / 3600);
        src.step_duration_type = "duration";
        src.step_duration_value = Math.round(distM / speedMs);
      } else if (distM !== null && distM > 0) {
        src.step_duration_type = "duration";
        src.step_duration_value = Math.round(distM / 4);
      } else {
        src.step_duration_type = "duration";
        src.step_duration_value = typeof src.step_duration_value === "number" ? src.step_duration_value : 60;
      }
    }

    // ============ CIBLES OFFICIELLES NOLIO ============
    // - Vélo (sport 14/18) : target_type="power", valeurs en W (depuis FTP),
    //   step_percent_low/high = %FTP
    // - Course/Trail (sport 2/52) : target_type="pace", valeurs en m/s (depuis VMA),
    //   comment = "Z2 — 5:15-5:30/km"
    // - Natation (sport 19) : target_type="pace", valeurs en m/s (depuis CSS),
    //   comment = "CSS — 1:36/100m"
    // - FC : target_type="heartrate", bpm (depuis FCmax)
    // ⛔ AUCUN target_unit, AUCUN pct_* envoyés à Nolio (champs internes TFCLab).
    if (src.type === "step") {
      const isBike = sportId === 14 || sportId === 18;
      const isRun = sportId === 2 || sportId === 52;
      const isSwim = sportId === 19;

      // ⚠️ Commentaires d'allure/CSS/zone au niveau du STEP volontairement retirés :
      // Nolio affiche déjà l'allure lisible à partir de target_value → doublon avec
      // la fiche descriptive (buildDescription). Voir issue "steps redondants".


      if (src.target_type === "power" && isBike) {
        const ftp = refs?.ftp;
        let pctMin = typeof src.pct_ftp_min === "number" ? src.pct_ftp_min : null;
        let pctMax = typeof src.pct_ftp_max === "number" ? src.pct_ftp_max : null;
        let wMin = typeof src.target_value_min === "number" ? src.target_value_min : null;
        let wMax = typeof src.target_value_max === "number" ? src.target_value_max : null;

        if (typeof ftp === "number" && ftp > 0) {
          if (wMin === null && pctMin !== null) wMin = Math.round(ftp * pctMin / 100);
          if (wMax === null && pctMax !== null) wMax = Math.round(ftp * pctMax / 100);
          if (pctMin === null && wMin !== null) pctMin = Math.round(wMin / ftp * 100);
          if (pctMax === null && wMax !== null) pctMax = Math.round(wMax / ftp * 100);
        }
        if (wMin !== null) src.target_value_min = Math.round(wMin);
        if (wMax !== null) src.target_value_max = Math.round(wMax);
        if (wMin !== null && wMax !== null) src.target_value = Math.round((wMin + wMax) / 2);
        else if (wMin !== null) src.target_value = Math.round(wMin);
        else if (wMax !== null) src.target_value = Math.round(wMax);
        // step_percent_low/high SUPPRIMÉ : Nolio n'affiche rien avec step_percent seul (test terrain).

      } else if (src.target_type === "pace" && isRun) {
        const vma = refs?.vma; // km/h
        let pctMin = typeof src.pct_vma_min === "number" ? src.pct_vma_min : null;
        let pctMax = typeof src.pct_vma_max === "number" ? src.pct_vma_max : null;
        // Détecte l'unité d'entrée : m/s (0.5-15) → sec/km, minutes décimales (15-30) → sec/km, sinon déjà sec/km.
        const toSecKm = (v: number) => {
          if (v > 0 && v < 15) return 1000 / v; // m/s → sec/km
          if (v >= 15 && v <= 30) return v * 60; // min décimales → sec/km
          return v; // déjà sec/km
        };
        const tMinOrig = typeof src.target_value_min === "number" ? toSecKm(src.target_value_min) : null;
        const tMaxOrig = typeof src.target_value_max === "number" ? toSecKm(src.target_value_max) : null;

        // Dériver %VMA depuis pace (sec/km) si manquant
        if (typeof vma === "number" && vma > 0) {
          if (pctMin === null && tMaxOrig !== null && tMaxOrig > 0) pctMin = (3600 / (tMaxOrig * vma)) * 100;
          if (pctMax === null && tMinOrig !== null && tMinOrig > 0) pctMax = (3600 / (tMinOrig * vma)) * 100;
        }
        if (pctMin === null && pctMax === null) { pctMin = 68; pctMax = 75; }
        else if (pctMin === null) pctMin = Math.max(40, (pctMax as number) - 5);
        else if (pctMax === null) pctMax = pctMin + 5;

        // Dériver pace (sec/km) depuis %VMA si manquant
        let secKmFast = tMinOrig;
        let secKmSlow = tMaxOrig;
        if (typeof vma === "number" && vma > 0) {
          if (secKmFast === null) secKmFast = 3600 / (vma * (pctMax as number) / 100);
          if (secKmSlow === null) secKmSlow = 3600 / (vma * (pctMin as number) / 100);
        }

        if (secKmFast !== null && secKmFast > 0 && secKmSlow !== null && secKmSlow > 0) {
          const speedFast = 1000 / secKmFast; // m/s rapide
          const speedSlow = 1000 / secKmSlow; // m/s lent
          const lo = Number(Math.min(speedFast, speedSlow).toFixed(3));
          const hi = Number(Math.max(speedFast, speedSlow).toFixed(3));
          src.target_type = "pace";
          src.target_value_min = lo;
          src.target_value_max = hi;
          src.target_value = Number(((lo + hi) / 2).toFixed(3));

        } else {
          src.target_type = "no_target";
          delete (src as Record<string, unknown>).target_value;
          delete (src as Record<string, unknown>).target_value_min;
          delete (src as Record<string, unknown>).target_value_max;
        }
      } else if (src.target_type === "pace" && isSwim) {
        // 🏊 Format natif Nolio "valeurs brutes + min/100m" découvert via GET training
        // d'une séance créée manuellement dans l'éditeur :
        //   target_type:"min/100m" + manual_values:true + target_value_min/max en m/s.
        // C'est un vrai pace /100m normalisé (indépendant de la distance),
        // contrairement à target_type:"speed" qui affichait un temps de step.
        const css = refs?.css; // sec/100m
        const toSec100 = (v: number) => {
          if (v > 0 && v < 5) return 100 / v; // m/s → sec/100m
          if (v >= 5 && v <= 30) return v * 60; // min décimales → sec/100m
          return v;
        };
        let tMin = typeof src.target_value_min === "number" ? toSec100(src.target_value_min) : null;
        let tMax = typeof src.target_value_max === "number" ? toSec100(src.target_value_max) : null;
        const pctMin = typeof src.pct_css_min === "number" ? src.pct_css_min : null;
        const pctMax = typeof src.pct_css_max === "number" ? src.pct_css_max : null;

        if (typeof css === "number" && css > 0) {
          if (tMin === null && pctMax !== null) tMin = css * pctMax / 100;
          if (tMax === null && pctMin !== null) tMax = css * pctMin / 100;
        }

        if (tMin !== null && tMin > 0 && tMax !== null && tMax > 0) {
          // sec/100m → m/s. Pace RAPIDE (sec faible) → vitesse HAUTE.
          const secFast = Math.min(tMin, tMax);
          const secSlow = Math.max(tMin, tMax);
          const speedHigh = Number((100 / secFast).toFixed(4)); // rapide
          const speedLow = Number((100 / secSlow).toFixed(4));  // lent
          (src as Record<string, unknown>).target_type = "min/100m";
          (src as Record<string, unknown>).manual_values = true;
          src.target_value_min = speedLow;
          src.target_value_max = speedHigh;
          delete (src as Record<string, unknown>).target_value;
          delete (src as Record<string, unknown>).target_unit;

        } else {
          // Natation sans cible exploitable → no_target propre (pas de pastille "empty_unit").
          src.target_type = "no_target";
          delete (src as Record<string, unknown>).target_value;
          delete (src as Record<string, unknown>).target_value_min;
          delete (src as Record<string, unknown>).target_value_max;
          delete (src as Record<string, unknown>).target_unit;
          delete (src as Record<string, unknown>).manual_values;
        }



      } else if (src.target_type === "heartrate") {
        const fcMax = refs?.fcMax;
        const pHrMin = typeof src.pct_hrmax_min === "number" ? src.pct_hrmax_min : null;
        const pHrMax = typeof src.pct_hrmax_max === "number" ? src.pct_hrmax_max : null;
        let tMin = typeof src.target_value_min === "number" ? src.target_value_min : null;
        let tMax = typeof src.target_value_max === "number" ? src.target_value_max : null;
        if (typeof fcMax === "number" && fcMax > 0) {
          if ((tMin === null || tMin <= 0) && pHrMin !== null) tMin = Math.round(fcMax * pHrMin / 100);
          if ((tMax === null || tMax <= 0) && pHrMax !== null) tMax = Math.round(fcMax * pHrMax / 100);
        }
        if (tMin !== null && tMin > 0) src.target_value_min = Math.round(tMin);
        if (tMax !== null && tMax > 0) src.target_value_max = Math.round(tMax);
        if (typeof src.target_value_min === "number" && typeof src.target_value_max === "number") {
          src.target_value = Math.round(((src.target_value_min as number) + (src.target_value_max as number)) / 2);
        }
      } else if (
        src.target_type === undefined ||
        src.target_type === "" ||
        src.target_type === "empty_unit" ||
        src.target_type === "duration"
      ) {
        src.target_type = "no_target";
        delete (src as Record<string, unknown>).target_value;
        delete (src as Record<string, unknown>).target_value_min;
        delete (src as Record<string, unknown>).target_value_max;
      }

      // 🔒 Strip des champs internes TFCLab non reconnus par Nolio
      // (target_unit systématiquement supprimé : Nolio l'ignore, prouvé par sondes)
      delete (src as Record<string, unknown>).target_unit;

      delete (src as Record<string, unknown>).pct_ftp_min;
      delete (src as Record<string, unknown>).pct_ftp_max;
      delete (src as Record<string, unknown>).pct_vma_min;
      delete (src as Record<string, unknown>).pct_vma_max;
      delete (src as Record<string, unknown>).pct_css_min;
      delete (src as Record<string, unknown>).pct_css_max;
      delete (src as Record<string, unknown>).pct_hrmax_min;
      delete (src as Record<string, unknown>).pct_hrmax_max;
      // step_percent_low/high : Nolio ignore ce champ (test terrain — pas d'affichage).
      delete (src as Record<string, unknown>).step_percent_low;
      delete (src as Record<string, unknown>).step_percent_high;

      // 🚴 Cadence (vélo uniquement) → secondary_step depuis notes/comment
      if (isBike && !src.secondary_step) {
        const texts: string[] = [];
        if (typeof src.notes === "string") texts.push(src.notes);
        if (typeof src.comment === "string") texts.push(src.comment);
        const joined = texts.join(" ");
        if (joined) {
          // Skip si "cadence libre" explicite
          if (!/cadence\s+libre/i.test(joined)) {
            const rangeMatch = joined.match(/(\d{2,3})\s*[-–]\s*(\d{2,3})\s*rpm/i);
            const singleMatch = !rangeMatch ? joined.match(/(\d{2,3})\s*rpm/i) : null;
            if (rangeMatch) {
              const a = parseInt(rangeMatch[1], 10);
              const b = parseInt(rangeMatch[2], 10);
              const lo = Math.min(a, b);
              const hi = Math.max(a, b);
              if (lo >= 30 && hi <= 200) {
                src.secondary_step = {
                  target_type: "cadence",
                  target_value_min: lo,
                  target_value_max: hi,
                  target_value: Math.round((lo + hi) / 2),
                };
              }
            } else if (singleMatch) {
              const v = parseInt(singleMatch[1], 10);
              if (v >= 30 && v <= 200) {
                src.secondary_step = {
                  target_type: "cadence",
                  target_value_min: v,
                  target_value_max: v,
                  target_value: v,
                };
              }
            }
          }
        }
      }
    }


    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      if (v === null || v === undefined) continue;
      // Repetition: rename repeat_count -> value (spec Nolio = `value`)
      if (k === "repeat_count" && src.type === "repetition" && !("value" in src)) {
        out.value = typeof v === "number" ? v : Number(v);
        continue;
      }
      out[k] = normalizeStructuredWorkoutForNolio(v, refs, sportId);
    }
    return out;
  }
  return input;
}

/** True si tous les steps (récursivement) ont target_type="no_target". */
function isAllNoTargetStructure(input: unknown): boolean {
  const visit = (node: unknown): boolean => {
    if (Array.isArray(node)) return node.every(visit);
    if (node && typeof node === "object") {
      const n = node as Record<string, unknown>;
      if (n.type === "step") return n.target_type === "no_target";
      if (n.type === "repetition" && Array.isArray(n.steps)) return n.steps.every(visit);
    }
    return true;
  };
  return visit(input);
}

/** Cherche une note nutrition courte dans un texte libre. */
function extractNutritionNote(text?: string): string | null {
  if (!text) return null;
  const n = text.trim();
  const hasKeyword = /cho|glucides|hydratation|nutrition|g\/h|g\s+CHO|boire|gel|isotonique|protéines|carbs/i.test(n);
  if (hasKeyword && n.length < 120) return n;
  return null;
}

/**
 * Description envoyée à Nolio — fiche bibliothèque structurée (≤4000 caractères) :
 *
 *   🎯 <objectif de la séance>
 *
 *   🔥 ÉCHAUFFEMENT — <warm-up>
 *
 *   💪 CORPS DE SÉANCE — <main>
 *
 *   🧘 RETOUR AU CALME — <cool-down>
 *
 *   🏔️ ALTERNATIVES TERRAIN :
 *     • <icon> <label> — <hint>
 *
 * Volontairement OMIS : "Quand"/phase/contexte, "⚠️ Éviter", tags (#...).
 * Ces infos servent à la sélection, pas à l'exécution.
 */
function buildDescription(s: ParsedSession, sportId?: number): string {
  const MAX_LEN = 4000;

  // Nettoyage transversal : retire [ID:...] et tags #xxx isolés, compresse espaces.
  const clean = (t: string | null | undefined): string => {
    if (!t) return "";
    return t
      .replace(/\[ID:[^\]]+\]/g, "")
      .replace(/(?:^|\s)#[\p{L}0-9_-]+/gu, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  // Échappement HTML : évite qu'un <, >, & dans le texte de séance casse le rendu Nolio.
  const esc = (t: string): string =>
    t.replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;");

  // Convertit un bloc texte multi-lignes en <li>...</li> (une puce par ligne non vide).
  const toListItems = (text: string): string => {
    const lines = text.split(/\n+/).map((l) => l.replace(/^\s*[•\-*]\s*/, "").trim()).filter(Boolean);
    if (lines.length === 0) return "";
    return lines.map((l) => `<li>${esc(l)}</li>`).join("");
  };

  const findPart = (name: string) =>
    (s.structure ?? []).find((p) =>
      normalizeStr(p.part).includes(normalizeStr(name))
    );

  const cleanedDetails = clean(s.details);
  const cleanedObjectif = clean(s.objectif);
  const warmup = clean(findPart("warm-up")?.text || findPart("échauffement")?.text);
  const main = clean(findPart("main")?.text || findPart("travail")?.text);
  const cooldown = clean(findPart("cool-down")?.text || findPart("récupération")?.text);

  const alts = Array.isArray(s.alternatives)
    ? s.alternatives.filter((a) => a && typeof a.label === "string" && a.label.trim().length > 0)
    : [];

  const hasStructure = Boolean(warmup || main || cooldown || alts.length > 0);

  // Fallback : aucune structure exploitable → texte brut existant, sans HTML.
  if (!hasStructure) {
    const parts: string[] = [];
    const intent = cleanedObjectif || cleanedDetails;
    if (intent) parts.push(`🎯 ${intent}`);
    let desc = parts.join("\n\n");
    if (desc.length > MAX_LEN) {
      const cut = desc.slice(0, MAX_LEN);
      const lastBreak = cut.lastIndexOf("\n");
      const safe = lastBreak > MAX_LEN * 0.7 ? lastBreak : MAX_LEN;
      desc = cut.slice(0, safe).trimEnd() + "…";
    }
    return desc;
  }

  const blocks: string[] = [];

  // 1) Objectif
  const intent = cleanedObjectif || cleanedDetails;
  if (intent) blocks.push(`<b>🎯 ${esc(intent)}</b>`);

  // 2) Structure de séance
  if (warmup) {
    const items = toListItems(warmup);
    if (items) blocks.push(`<b>🔥 ÉCHAUFFEMENT</b><ul>${items}</ul>`);
  }
  if (main) {
    const items = toListItems(main);
    if (items) blocks.push(`<b>💪 CORPS DE SÉANCE</b><ul>${items}</ul>`);
  }
  if (cooldown) {
    const items = toListItems(cooldown);
    if (items) blocks.push(`<b>🧘 RETOUR AU CALME</b><ul>${items}</ul>`);
  }

  // 3) Alternatives terrain
  if (alts.length > 0) {
    const items = alts.map((a) => {
      const icon = clean(a.icon);
      const label = clean(a.label);
      const hint = clean(a.hint);
      const head = icon ? `${icon} ${label}` : label;
      return `<li>${esc(hint ? `${head} — ${hint}` : head)}</li>`;
    }).join("");
    if (items) blocks.push(`<b>🏔️ Alternatives</b><ul>${items}</ul>`);
  }

  let desc = blocks.join("<br><br>");
  // Espace d'aération en fin de fiche (une seule ligne vide).
  if (desc) desc += "<br>";

  // Cap propre : coupe sur fin de </li>, </ul> ou <br>, jamais au milieu d'une balise.
  if (desc.length > MAX_LEN) {
    const cut = desc.slice(0, MAX_LEN);
    const candidates = [
      cut.lastIndexOf("</ul>"),
      cut.lastIndexOf("</li>"),
      cut.lastIndexOf("<br>"),
    ];
    const idx = Math.max(...candidates);
    if (idx > MAX_LEN * 0.5) {
      // Coupe juste après la balise trouvée
      const tag = idx === cut.lastIndexOf("</ul>") ? "</ul>"
        : idx === cut.lastIndexOf("</li>") ? "</li>"
        : "<br>";
      desc = cut.slice(0, idx + tag.length);
      // Referme un <ul> resté ouvert si on a coupé sur </li>
      const openUl = (desc.match(/<ul>/g) ?? []).length;
      const closeUl = (desc.match(/<\/ul>/g) ?? []).length;
      if (openUl > closeUl) desc += "</ul>".repeat(openUl - closeUl);
    } else {
      desc = cut;
    }
    desc += "…";
  }

  return desc;
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

function summarizeStructuredWorkout(input: unknown): { durationSec: number; distanceMeters: number } {
  const visit = (node: unknown): { durationSec: number; distanceMeters: number } => {
    if (Array.isArray(node)) {
      return node.reduce(
        (acc, item) => {
          const s = visit(item);
          acc.durationSec += s.durationSec;
          acc.distanceMeters += s.distanceMeters;
          return acc;
        },
        { durationSec: 0, distanceMeters: 0 },
      );
    }
    if (!node || typeof node !== "object") return { durationSec: 0, distanceMeters: 0 };
    const item = node as Record<string, unknown>;
    if (item.type === "repetition" && Array.isArray(item.steps)) {
      const reps = typeof item.value === "number" && Number.isFinite(item.value) && item.value > 0 ? item.value : 1;
      const inner = visit(item.steps);
      return { durationSec: inner.durationSec * reps, distanceMeters: inner.distanceMeters * reps };
    }
    if (item.type === "step") {
      const value = typeof item.step_duration_value === "number" && Number.isFinite(item.step_duration_value)
        ? item.step_duration_value
        : 0;
      if (item.step_duration_type === "duration") return { durationSec: Math.max(0, Math.round(value)), distanceMeters: 0 };
      if (item.step_duration_type === "distance") return { durationSec: 0, distanceMeters: Math.max(0, value) };
    }
    return { durationSec: 0, distanceMeters: 0 };
  };
  return visit(input);
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

      // ❌ Prefix matching supprimé : trop d'erreurs en matchant des variantes incorrectes
      // (ex: B_TR_HILLREPS_PRO → B_TR_HILLREPS_8x2_PRO = séance différente).
      // Si l'ID exact n'est pas trouvé, on tombe sur le parsing automatique du texte
      // de la séance — plus fiable qu'un mauvais match.
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
        description: buildDescription(s, sportId),
      };
      if (structured_workout) {
        // 🔒 IMPORTANT : le normalizer DOIT toujours s'exécuter sur la valeur finale de
        // `structured_workout`, peu importe la source (override manuel, structure générée
        // par IA récupérée depuis `nolio_structures_generated`, ou parsing automatique).
        // C'est ici qu'on applique : conversion pace → m/s, distance run/trail → durée s,
        // remap rest/no_target → cible Z1, suppression des clés null/undefined, etc.
        const normalized = normalizeStructuredWorkoutForNolio(structured_workout, body.refs ?? {}, sportId);
        const summary = summarizeStructuredWorkout(normalized);
        if (summary.durationSec > 0) payload.duration = summary.durationSec;
        if (summary.distanceMeters > 0) payload.distance = Number((summary.distanceMeters / 1000).toFixed(3));
        // Strength (sport_id 20) : si tous les steps ont target_type="no_target",
        // Nolio affiche "empty_unit". On préfère ne PAS envoyer de structured_workout
        // et laisser la description texte gérer l'affichage.
        const strip = sportId === 20 && isAllNoTargetStructure(normalized);
        if (!strip) {
          payload.structured_workout = normalized;
        }
      }

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

      // 📋 Audit trail : une ligne dans nolio_sync_log par séance envoyée,
      // avec le workout_id, le payload complet et la réponse Nolio.
      try {
        await admin.from("nolio_sync_log").insert({
          user_id: userId,
          athletes_count: res.ok ? 1 : 0,
          status: res.ok ? "success" : "error",
          error_message: res.ok ? null : JSON.stringify({ status: res.status, detail: res.detail }).slice(0, 2000),
          workout_id: (s.id ?? null),
          payload: {
            nolio_athlete_id: body.nolio_athlete_id,
            week: s.weekNumber,
            day: s.dayIndex,
            date_start: dateStart,
            sport_id: sportId,
            id_partner: idPartner,
            used_override: usedOverride,
            used_generated: usedGenerated,
            request: payload,
            response: {
              ok: res.ok,
              status: res.status,
              detail: res.detail ?? null,
              data: res.data ?? null,
            },
          },
        });
      } catch (perSessionLogErr) {
        console.error("nolio_sync_log per-session insert failed", perSessionLogErr);
      }

      if (res.ok) sent += 1;
      else errors.push({ week: s.weekNumber, day: s.dayIndex, status: res.status, detail: res.detail });

      // 200ms entre chaque pour respecter rate-limits Nolio
      if (i < body.sessions.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }


    // Log debug dans nolio_sync_log (notes = JSON complet pour vérifier ce qui est transmis)
    try {
      const notesJson = JSON.stringify({ refs_received: body.refs ?? null, sessions: debugLog }).slice(0, 100000);
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
