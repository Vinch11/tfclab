// ⚠️ DUPLIQUÉ dans src/lib/deriveRaceTargets.ts — toute modif doit être appliquée aux deux
// =============================================
// DERIVE RACE TARGETS — SOURCE UNIQUE (snapshot-based) — browser mirror
// =============================================

import { AMBITIONS, computeRaceScenarios, distanceFamilyFromKm, fractionVMAForAmbition, type Ambition, type ComplexiteSeances } from "./raceAnalysis";

const AMBITION_MAP: Record<string, Ambition> = {
  finisher: "finish",
  finish: "finish",
  age_group: "perf",
  perf: "perf",
  competitor: "sub",
  sub: "sub",
  elite: "elite",
  world_class: "world_class",
};

const OBJECTIVE_DIST_KM: Record<string, number> = {
  "5K": 5,
  "10K": 10,
  Semi: 21.0975,
  Marathon: 42.195,
};

function normalizeObj(obj: string): string | null {
  const s = obj.trim().toLowerCase();
  if (/^5\s*k/.test(s) || s === "5k") return "5K";
  if (/^10\s*k/.test(s) || s === "10k") return "10K";
  if (/semi|half/.test(s)) return "Semi";
  if (/marathon/.test(s) && !/semi|half/.test(s)) return "Marathon";
  return null;
}

function normalizeAmb(amb: string): Ambition {
  const s = amb.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (AMBITION_MAP[s]) return AMBITION_MAP[s];
  if (s.includes("world") || s.includes("mond")) return "world_class";
  if (s.includes("elite") || s.includes("pro")) return "elite";
  if (s.includes("compet")) return "sub";
  if (s.includes("age") || s.includes("group") || s.includes("confirm")) return "perf";
  if (s.includes("finish") || s.includes("decouv")) return "finish";
  return "perf";
}

export function parseLiteratureHint(hint: string): { loSec: number; hiSec: number } | null {
  if (!hint) return null;
  const cleaned = hint.replace(/\s/g, "").replace(/–/g, "-").toLowerCase();
  const toSec = (tok: string): number | null => {
    let m = tok.match(/^(?:sub)?(\d+)h(\d+)?$/);
    if (m) return parseInt(m[1], 10) * 3600 + (m[2] ? parseInt(m[2], 10) * 60 : 0);
    m = tok.match(/^(?:sub)?(\d+)'?$/);
    if (m) return parseInt(m[1], 10) * 60;
    return null;
  };
  if (cleaned.startsWith("sub")) {
    const s = toSec(cleaned);
    if (s == null) return null;
    return { loSec: Math.round(s * 0.95), hiSec: s };
  }
  const parts = cleaned.split("-");
  if (parts.length !== 2) {
    const s = toSec(cleaned);
    return s ? { loSec: s, hiSec: s } : null;
  }
  const lo = toSec(parts[0]);
  const hi = toSec(parts[1]);
  if (lo == null || hi == null) return null;
  return { loSec: Math.min(lo, hi), hiSec: Math.max(lo, hi) };
}

export function formatSecToTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m}'${String(s).padStart(2, "0")}"`;
}

export function formatSecPerKm(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

export interface DeriveRaceTargetsInput {
  vmaKmh?: number | null;
  thresholdPaceSecPerKm?: number | null;
  objective: string;
  ambition: string;
  literatureHintText?: string | null;
  /** Volume hebdo brut saisi par l'athlète (en heures). Utilisé pour calculer volumeCible. */
  weeklyHours?: number | null;
}

export interface PaceTargets {
  allureSemiCible: number;
  seuilBas: number;
  seuilHaut: number;
  allureVO2max: number | null;
  allureZ2: { lo: number; hi: number } | null;
  vmaKmh: number | null;
}

export interface DeriveRaceTargetsResult {
  source: "snapshot" | "insufficient_data";
  distanceKm: number | null;
  ambition: Ambition;
  pctVMAUsed: number | null;
  racePaceSecPerKm: number | null;
  raceTimeSec: number | null;
  paceRange: { lo: number; hi: number } | null;
  timeRange: { lo: number; hi: number } | null;
  literatureRangeSec: { loSec: number; hiSec: number } | null;
  divergencePct: number | null;
  vmaRequiredForLiterature: number | null;
  warning: string | null;
  humanSummary: string;
  qualitesParSemaine: number;
  multiplicateurVolume: number;
  complexiteSeances: ComplexiteSeances;
  volumeCible: number | null;
  paceTargets: PaceTargets | null;
}

export function buildPaceTargets(racePaceSecPerKm: number, vmaKmh: number | null): PaceTargets {
  const vma = typeof vmaKmh === "number" && vmaKmh > 0 ? vmaKmh : null;
  const allureVO2max = vma ? Math.round(3600 / (0.97 * vma)) : null;
  const allureZ2 = vma
    ? { lo: Math.round(3600 / (0.75 * vma)), hi: Math.round(3600 / (0.65 * vma)) }
    : null;
  return {
    allureSemiCible: Math.round(racePaceSecPerKm),
    seuilBas: Math.round(racePaceSecPerKm) + 10,
    seuilHaut: Math.max(Math.round(racePaceSecPerKm) - 5, 120),
    allureVO2max,
    allureZ2,
    vmaKmh: vma,
  };
}

const VOLUME_CIBLE_MIN_H = 3;
const VOLUME_CIBLE_MAX_H = 15;

function computeVolumeCible(weeklyHours: number | null | undefined, multiplicateur: number): number | null {
  if (typeof weeklyHours !== "number" || !Number.isFinite(weeklyHours) || weeklyHours <= 0) return null;
  const raw = weeklyHours * multiplicateur;
  const bounded = Math.min(VOLUME_CIBLE_MAX_H, Math.max(VOLUME_CIBLE_MIN_H, raw));
  return Number(bounded.toFixed(2));
}

export function deriveRaceTargets(input: DeriveRaceTargetsInput): DeriveRaceTargetsResult {
  const objKey = normalizeObj(input.objective || "");
  const amb = normalizeAmb(input.ambition || "");
  const ambDef = AMBITIONS.find(a => a.key === amb) ?? AMBITIONS[1];
  const distanceKm = objKey ? OBJECTIVE_DIST_KM[objKey] : null;
  const literatureRangeSec = input.literatureHintText ? parseLiteratureHint(input.literatureHintText) : null;
  const volumeCible = computeVolumeCible(input.weeklyHours, ambDef.multiplicateurVolume);
  if (input.weeklyHours != null) {
    // Log traçable : "📦 volumeCible : {weeklyHours}h × {mult} = {v}h"
    // eslint-disable-next-line no-console
    console.log(`📦 volumeCible : ${input.weeklyHours}h × ${ambDef.multiplicateurVolume} = ${volumeCible ?? "n/a"}h (ambition ${amb})`);
  }

  const structural = {
    qualitesParSemaine: ambDef.qualitesParSemaine,
    multiplicateurVolume: ambDef.multiplicateurVolume,
    complexiteSeances: ambDef.complexiteSeances,
    volumeCible,
  };

  const vma = typeof input.vmaKmh === "number" && input.vmaKmh > 0 ? input.vmaKmh : null;
  const thr = typeof input.thresholdPaceSecPerKm === "number" && input.thresholdPaceSecPerKm > 0
    ? input.thresholdPaceSecPerKm : null;

  if (!distanceKm || (!vma && !thr)) {
    return {
      source: "insufficient_data",
      distanceKm,
      ambition: amb,
      pctVMAUsed: ambDef.pctVMA,
      racePaceSecPerKm: null,
      raceTimeSec: null,
      paceRange: null,
      timeRange: null,
      literatureRangeSec,
      divergencePct: null,
      vmaRequiredForLiterature: null,
      warning: null,
      humanSummary: "Cible course non calculée (VMA/seuil ou distance manquants).",
      ...structural,
    };
  }

  const scenarios = computeRaceScenarios(
    { vmaKmh: vma, thresholdPaceSecPerKm: thr },
    distanceKm,
  );
  if ("error" in scenarios) {
    return {
      source: "insufficient_data",
      distanceKm,
      ambition: amb,
      pctVMAUsed: ambDef.pctVMA,
      racePaceSecPerKm: null,
      raceTimeSec: null,
      paceRange: null,
      timeRange: null,
      literatureRangeSec,
      divergencePct: null,
      vmaRequiredForLiterature: null,
      warning: null,
      humanSummary: `Cible course non calculée : ${scenarios.error}.`,
      ...structural,
    };
  }

  const row = scenarios.find(s => s.ambition === amb) ?? scenarios[1];
  const pace = row.paceSecPerKm;
  const time = row.timeSec;
  const fracUsed = fractionVMAForAmbition(ambDef, distanceKm);

  let divergencePct: number | null = null;
  let vmaRequired: number | null = null;
  let warning: string | null = null;

  if (literatureRangeSec) {
    const litMid = (literatureRangeSec.loSec + literatureRangeSec.hiSec) / 2;
    divergencePct = ((time - litMid) / litMid) * 100;
    const speedNeededKmh = (distanceKm / (litMid / 3600));
    vmaRequired = speedNeededKmh / fracUsed;
    if (Math.abs(divergencePct) > 8) {
      warning = `Ambition "${amb}" (littérature ${input.literatureHintText}) incompatible avec la physiologie actuelle : nécessite VMA ≈ ${vmaRequired.toFixed(1)} km/h, snapshot = ${vma?.toFixed(1) ?? "?"} km/h. Écart temps : ${divergencePct > 0 ? "+" : ""}${divergencePct.toFixed(1)}%.`;
    }
  }

  const fam = distanceFamilyFromKm(distanceKm);
  const humanSummary = `${formatSecToTime(time)} · allure ${formatSecPerKm(pace)} (source snapshot : VMA ${vma?.toFixed(1) ?? "?"} km/h × ${(fracUsed * 100).toFixed(0)}% [famille ${fam}])`;

  return {
    source: "snapshot",
    distanceKm,
    ambition: amb,
    pctVMAUsed: Number(fracUsed.toFixed(3)),
    racePaceSecPerKm: pace,
    raceTimeSec: time,
    paceRange: { lo: pace - 5, hi: pace + 5 },
    timeRange: { lo: time - 90, hi: time + 90 },
    literatureRangeSec,
    divergencePct: divergencePct != null ? Number(divergencePct.toFixed(1)) : null,
    vmaRequiredForLiterature: vmaRequired != null ? Number(vmaRequired.toFixed(2)) : null,
    warning,
    humanSummary,
    ...structural,
  };
}

