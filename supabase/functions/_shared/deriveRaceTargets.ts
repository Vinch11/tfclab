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

export type RaceSport = "run_route" | "trail" | "tri_70_3" | "ironman";

/**
 * Table exhaustive objectif → RaceSport.
 * ⚠️ MIROIR EXACT dans src/lib/deriveRaceTargets.ts.
 * Sources :
 *   - Enums ObjectifType (src/types/athlete.ts L8)
 *   - Labels OBJECTIVE_OPTIONS (src/pages/AITrainingPlanPage.tsx L79-89)
 *   - Labels getObjectifLabel (src/types/athlete.ts L67-93)
 * Clés normalisées (trim + lowercase). Toute valeur absente → warning + fallback "run_route".
 */
const OBJECTIVE_TO_SPORT: Record<string, RaceSport> = {
  // Enums ObjectifType
  "im": "ironman",
  "703": "tri_70_3",
  "marathon": "run_route",
  "semi": "run_route",
  "5k": "run_route",
  "10k": "run_route",
  "starttorun": "run_route",
  "trail": "trail",
  "trailshort": "trail",
  "trailmountain": "trail",
  "trailultra": "trail",
  // Labels OBJECTIVE_OPTIONS (AITrainingPlanPage.tsx L79-89)
  "ironman": "ironman",
  "ironman 70.3": "tri_70_3",
  "semi-marathon": "run_route",
  "10 km": "run_route",
  "start to run (5-10 km)": "run_route",
  "trail court (20-40 km)": "trail",
  "trail montagne (40-80 km)": "trail",
  "ultra trail (80 km+)": "trail",
  // Labels getObjectifLabel (athlete.ts L67-93)
  "70.3 / half ironman": "tri_70_3",
  "5 km": "run_route",
  "start to run": "run_route",
  "trail (général)": "trail",
  "trail court (20–40km)": "trail",
  "trail montagne (40–80km)": "trail",
  "ultra trail (80km+)": "trail",
};

/**
 * Helper canonique : mappe un objectif texte vers un RaceSport via lookup exact.
 * ⚠️ MIROIR EXACT dans src/lib/deriveRaceTargets.ts.
 * Toute valeur non vide inconnue → console.warn + fallback "run_route".
 */
export function mapObjectiveToSport(objective: string | null | undefined): RaceSport {
  const s = (objective ?? "").trim().toLowerCase();
  if (!s) return "run_route";
  const hit = OBJECTIVE_TO_SPORT[s];
  if (hit) return hit;
  console.warn(`mapObjectiveToSport: objectif inconnu '${objective}' → fallback run_route`);
  return "run_route";
}

export interface DeriveRaceTargetsInput {
  vmaKmh?: number | null;
  thresholdPaceSecPerKm?: number | null;
  objective: string;
  ambition: string;
  literatureHintText?: string | null;
  /** Volume hebdo brut saisi par l'athlète (en heures). Utilisé pour calculer volumeCible. */
  weeklyHours?: number | null;
  /**
   * Niveau d'entraînement (coach) — utilisé UNIQUEMENT par le downgrade
   * ambition (`AMBITION_MAX_BY_LEVEL`). Aucun effet multiplicatif sur volumeCible.
   */
  trainingLevel?: "untrained" | "light" | "trained" | "highly_trained" | null;
  /** Type d'épreuve (source des plafonds). Fallback "run_route" + console.warn. */
  sport?: RaceSport | null;
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
  volumeCibleMaxH: number;
  sportResolved: RaceSport;
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

/**
 * ⚠️ MIROIR EXACT dans src/lib/deriveRaceTargets.ts — toute modif doit être appliquée aux deux.
 * Matrice sport × ambition (h/sem) : plafonds de volumeCible.
 */
const VOLUME_CAP_MATRIX: Record<RaceSport, Record<Ambition, number>> = {
  run_route: { finish: 8,  perf: 10, sub: 12, elite: 14, world_class: 16 },
  trail:     { finish: 8,  perf: 10, sub: 12, elite: 14, world_class: 16 },
  tri_70_3:  { finish: 10, perf: 12, sub: 14, elite: 18, world_class: 22 },
  ironman:   { finish: 12, perf: 14, sub: 18, elite: 25, world_class: 32 },
};

function resolveSport(sport: RaceSport | null | undefined): RaceSport {
  const allowed: RaceSport[] = ["run_route", "trail", "tri_70_3", "ironman"];
  if (sport && allowed.includes(sport)) return sport;
  console.warn(`⚠️ deriveRaceTargets: sport inconnu ou absent (reçu: ${JSON.stringify(sport)}) → fallback "run_route"`);
  return "run_route";
}

/**
 * volumeCible = min(cap_matriciel, max(plancher, weeklyHours × multiplicateurAmbition)).
 * EXPERIENCE_FACTOR retiré : l'expérience module l'ambition via ambitionDowngrade.
 */
function computeVolumeCible(
  weeklyHours: number | null | undefined,
  multiplicateur: number,
  capH: number,
): number | null {
  if (typeof weeklyHours !== "number" || !Number.isFinite(weeklyHours) || weeklyHours <= 0) return null;
  const raw = weeklyHours * multiplicateur;
  const bounded = Math.min(capH, Math.max(VOLUME_CIBLE_MIN_H, raw));
  return Number(bounded.toFixed(2));
}

export function deriveRaceTargets(input: DeriveRaceTargetsInput): DeriveRaceTargetsResult {
  const objKey = normalizeObj(input.objective || "");
  const amb = normalizeAmb(input.ambition || "");
  const ambDef = AMBITIONS.find(a => a.key === amb) ?? AMBITIONS[1];
  const distanceKm = objKey ? OBJECTIVE_DIST_KM[objKey] : null;
  const literatureRangeSec = input.literatureHintText ? parseLiteratureHint(input.literatureHintText) : null;
  const sportResolved = resolveSport(input.sport ?? null);
  const volumeCibleMaxH = VOLUME_CAP_MATRIX[sportResolved][amb] ?? 15;
  const volumeCible = computeVolumeCible(input.weeklyHours, ambDef.multiplicateurVolume, volumeCibleMaxH);
  if (input.weeklyHours != null) {
    console.log(
      `📦 volumeCible : ${input.weeklyHours}h × ${ambDef.multiplicateurVolume} (amb ${amb}) = ${volumeCible ?? "n/a"}h [cap ${sportResolved}/${amb}=${volumeCibleMaxH}h]`
    );
  }

  const structural = {
    qualitesParSemaine: ambDef.qualitesParSemaine,
    multiplicateurVolume: ambDef.multiplicateurVolume,
    complexiteSeances: ambDef.complexiteSeances,
    volumeCible,
    volumeCibleMaxH,
    sportResolved,
    paceTargets: null as PaceTargets | null,
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

  const paceTargets = buildPaceTargets(pace, vma);
  console.log("🎯 deriveRaceTargets paceTargets", paceTargets);

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
    paceTargets,
  };
}


