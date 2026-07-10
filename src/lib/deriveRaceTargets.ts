// ⚠️ DUPLIQUÉ dans supabase/functions/_shared/deriveRaceTargets.ts — toute modif doit être appliquée aux deux
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

/**
 * Type d'épreuve utilisé pour indexer la matrice sport × ambition
 * des plafonds de volume hebdomadaire.
 */
export type RaceSport = "run_route" | "trail" | "tri_70_3" | "ironman";

/**
 * Helper canonique : mappe un objectif texte (OBJECTIVE_OPTIONS ou libellé)
 * vers un RaceSport. Utilisé aux call-sites pour alimenter `sport` en une ligne.
 * Fallback silencieux → "run_route".
 */
export function mapObjectiveToSport(objective: string | null | undefined): RaceSport {
  const s = (objective ?? "").trim().toLowerCase();
  if (!s) return "run_route";
  if (/^ironman$|^im$|\bironman\b/.test(s) && !/70\.?3|half/.test(s)) return "ironman";
  if (/70\.?3|half.?iron/.test(s) || s === "703") return "tri_70_3";
  if (/trail|ultra/.test(s)) return "trail";
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
   * Niveau d'entraînement actuel (coach) — utilisé UNIQUEMENT par le downgrade
   * ambition (`AMBITION_MAX_BY_LEVEL` dans ambitionDowngrade.ts). Aucun effet
   * multiplicatif sur volumeCible.
   */
  trainingLevel?: "untrained" | "light" | "trained" | "highly_trained" | null;
  /**
   * Type d'épreuve (source des plafonds de volume). Si absent ou inconnu →
   * fallback "run_route" + console.warn.
   */
  sport?: RaceSport | null;
}

export interface PaceTargets {
  /** Allure objectif course (sec/km) — = racePaceSecPerKm */
  allureSemiCible: number;
  /** Allure marathon (sec/km) — semi + ~15s (≈+5.5%), utilisée pour les inserts
   *  "@ allure marathon" des sorties longues. Toujours plus LENTE que allureSemiCible. */
  allureMarathon: number;
  /** Z4b — bas du seuil (sec/km) : allure course + 10s */
  seuilBas: number;
  /** Z5 — haut du seuil (sec/km) : allure course − 5s */
  seuilHaut: number;
  /** ~97% VMA (sec/km) */
  allureVO2max: number | null;
  /** Fourchette Z2 (65-75% VMA) (sec/km) */
  allureZ2: { lo: number; hi: number } | null;
  /** VMA source (km/h) */
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
  /** Facteur expérience appliqué (1.00 si trainingLevel absent). */
  experienceFactor: number;
  /** Cap volumeCible retenu (dépend de l'ambition). Ex : elite=25h, world_class=32h. */
  volumeCibleMaxH: number;
  /** Allures dérivées — SOURCE UNIQUE pour toutes les allures du plan. */
  paceTargets: PaceTargets | null;
}

/** Construit paceTargets à partir de racePace + VMA. */
export function buildPaceTargets(racePaceSecPerKm: number, vmaKmh: number | null): PaceTargets {
  const vma = typeof vmaKmh === "number" && vmaKmh > 0 ? vmaKmh : null;
  const allureVO2max = vma ? Math.round(3600 / (0.97 * vma)) : null;
  const allureZ2 = vma
    ? { lo: Math.round(3600 / (0.75 * vma)), hi: Math.round(3600 / (0.65 * vma)) }
    : null;
  const semi = Math.round(racePaceSecPerKm);
  return {
    allureSemiCible: semi,
    // Marathon ≈ +5.5% (semi × 1.055). Garanti plus lent que semi.
    allureMarathon: Math.max(semi + 15, Math.round(semi * 1.055)),
    seuilBas: semi + 10,
    seuilHaut: Math.max(semi - 5, 120),
    allureVO2max,
    allureZ2,
    vmaKmh: vma,
  };
}


const VOLUME_CIBLE_MIN_H = 3;

/**
 * Cap volumeCible par ambition (h/sem).
 * Levée du plafond historique 15h : les profils élite / world-class doivent
 * pouvoir atteindre les volumes réels observés en littérature (Seiler,
 * Stöggl, Rønnestad) pour marathon élite (20-25h), IM elite (25-32h).
 */
const VOLUME_CIBLE_MAX_BY_AMBITION: Record<Ambition, number> = {
  finish: 12,
  perf: 14,
  sub: 18,
  elite: 25,
  world_class: 32,
};

/**
 * Facteur expérience appliqué à la cible de volume.
 * Un `sub` avec 2 ans de pratique ne doit pas cibler le même volume qu'un
 * `sub` avec 10 ans (capacité d'absorption ≠). Neutre (1.00) si non renseigné.
 * Références : Foster (charge relative), Seiler (adaptation cumulative).
 */
const EXPERIENCE_FACTOR: Record<NonNullable<DeriveRaceTargetsInput["trainingLevel"]>, number> = {
  untrained: 0.85,
  light: 0.92,
  trained: 1.00,
  highly_trained: 1.08,
};

function computeVolumeCible(
  weeklyHours: number | null | undefined,
  multiplicateur: number,
  experienceFactor: number,
  capH: number,
): number | null {
  if (typeof weeklyHours !== "number" || !Number.isFinite(weeklyHours) || weeklyHours <= 0) return null;
  const raw = weeklyHours * multiplicateur * experienceFactor;
  const bounded = Math.min(capH, Math.max(VOLUME_CIBLE_MIN_H, raw));
  return Number(bounded.toFixed(2));
}

export function deriveRaceTargets(input: DeriveRaceTargetsInput): DeriveRaceTargetsResult {
  const objKey = normalizeObj(input.objective || "");
  const amb = normalizeAmb(input.ambition || "");
  const ambDef = AMBITIONS.find(a => a.key === amb) ?? AMBITIONS[1];
  const distanceKm = objKey ? OBJECTIVE_DIST_KM[objKey] : null;
  const literatureRangeSec = input.literatureHintText ? parseLiteratureHint(input.literatureHintText) : null;
  const experienceFactor = input.trainingLevel ? EXPERIENCE_FACTOR[input.trainingLevel] : 1.0;
  const volumeCibleMaxH = VOLUME_CIBLE_MAX_BY_AMBITION[amb] ?? 15;
  const volumeCible = computeVolumeCible(input.weeklyHours, ambDef.multiplicateurVolume, experienceFactor, volumeCibleMaxH);
  if (input.weeklyHours != null) {
    // eslint-disable-next-line no-console
    console.log(
      `📦 volumeCible : ${input.weeklyHours}h × ${ambDef.multiplicateurVolume} (amb ${amb}) × ${experienceFactor} (exp ${input.trainingLevel ?? "n/a"}) = ${volumeCible ?? "n/a"}h [cap ${volumeCibleMaxH}h]`
    );
  }

  const structural = {
    qualitesParSemaine: ambDef.qualitesParSemaine,
    multiplicateurVolume: ambDef.multiplicateurVolume,
    complexiteSeances: ambDef.complexiteSeances,
    volumeCible,
    experienceFactor,
    volumeCibleMaxH,
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
  // eslint-disable-next-line no-console
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


