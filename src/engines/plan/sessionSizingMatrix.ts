/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2A — Moteur de dimensionnement déterministe des séances hebdomadaires
 * ═══════════════════════════════════════════════════════════════════════════════
 * Le nombre de séances par sport et par semaine est CALCULÉ par le code depuis
 * une matrice validée par le coach, injecté comme contrainte ferme dans le
 * prompt de génération, puis vérifié post-merge. Le LLM place et sélectionne
 * les séances ; il ne décide plus jamais combien.
 *
 * Fonction pure : mêmes entrées → mêmes sorties. Aucun accès réseau/random.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type EvidenceTier = "peer_reviewed" | "practitioner_literature" | "elite_practice";

export interface QuotaRange { min: number; max: number }

export interface WeeklyQuota {
  swim: QuotaRange; bike: QuotaRange; run: QuotaRange;
  brick: QuotaRange; strength: QuotaRange;
  totalSessions: QuotaRange;
  maxSessionsPerDay: number;
  minFullRestDays: number;
  source: { tier: EvidenceTier; ref: string };
}

export interface SizingFloors {
  minSwimPerWeek?: number;        // triathlon uniquement
  longRideWeekly?: boolean;       // 1 SL vélo/sem hors taper
  longRunWeekly?: boolean;        // 1 SL CAP/sem hors taper
  minStrengthPerWeek: number;     // jamais 0 (Petersen, effet protecteur)
  /** Durée plancher SL vélo (min). Injectée par format. Recovery ×0.7. */
  slLongRideMin?: number;
  /** Durée plancher SL CAP (min). Injectée par format. Recovery ×0.7. */
  slLongRunMin?: number;
}

export type SizingObjectiveKey =
  | "703" | "IM" | "TRI_SPRINT" | "TRI_OLYMPIQUE"
  | "SEMI" | "MARATHON" | "10K" | "5K" | "STARTTORUN";

export type SizingAmbitionKey = "finisher" | "age_group" | "competitor" | "elite";

export type WeekType = "load" | "recovery" | "taper" | "race";

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCES (littérature/pratique) — affichage futur, aligné rapport physio
// ═══════════════════════════════════════════════════════════════════════════════
const SRC_703: { tier: EvidenceTier; ref: string } = {
  tier: "practitioner_literature",
  ref: "Olbrecht (fréquence nat) ; Friel ; pratique Lorang/école norvégienne (elite_practice)",
};
const SRC_IM: { tier: EvidenceTier; ref: string } = {
  tier: "elite_practice",
  ref: "Lorang (logs Frodeno/Haug), école norvégienne (Tønnessen case studies)",
};
const SRC_TRI_COURT: { tier: EvidenceTier; ref: string } = {
  tier: "practitioner_literature",
  ref: "Olbrecht ; Seiler (part polarisée accrue sur formats courts)",
};
const SRC_CAP: { tier: EvidenceTier; ref: string } = {
  tier: "practitioner_literature",
  ref: "Daniels ; Canova (elite_practice) ; Rønnestad & Mujika 2014 pour strength (peer_reviewed)",
};

export const FLOORS_SOURCE: { tier: EvidenceTier; ref: string } = {
  tier: "peer_reviewed",
  ref: "Petersen 2011 (strength maintien) ; Mujika & Padilla 2003 (taper)",
};

export const FLOORS_TRI: SizingFloors = {
  minSwimPerWeek: 2,
  longRideWeekly: true,
  longRunWeekly: true,
  minStrengthPerWeek: 1,
};
export const FLOORS_CAP: SizingFloors = {
  longRunWeekly: true,
  minStrengthPerWeek: 1,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MATRICE (valeurs exactes — ne pas modifier sans mise à jour tests + coach)
// ═══════════════════════════════════════════════════════════════════════════════

interface AmbitionRow {
  hoursMin?: number; hoursMax?: number;
  swim: QuotaRange; bike: QuotaRange; run: QuotaRange;
  brick: QuotaRange; strength: QuotaRange;
  totalSessions: QuotaRange;
  maxSessionsPerDay: number;
  minFullRestDays: number;
}

type Matrix = Record<SizingObjectiveKey, Partial<Record<SizingAmbitionKey, AmbitionRow>>>;

const MATRIX: Matrix = {
  "703": {
    finisher:   { hoursMin: 5,  hoursMax: 8,  swim: { min: 2, max: 2 }, bike: { min: 2, max: 2 }, run: { min: 2, max: 3 }, brick: { min: 0, max: 1 }, strength: { min: 1, max: 1 }, totalSessions: { min: 7,  max: 9  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    age_group:  { hoursMin: 8,  hoursMax: 11, swim: { min: 3, max: 3 }, bike: { min: 3, max: 3 }, run: { min: 3, max: 3 }, brick: { min: 1, max: 1 }, strength: { min: 1, max: 1 }, totalSessions: { min: 11, max: 11 }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    competitor: { hoursMin: 11, hoursMax: 14, swim: { min: 3, max: 4 }, bike: { min: 3, max: 4 }, run: { min: 3, max: 4 }, brick: { min: 1, max: 1 }, strength: { min: 2, max: 2 }, totalSessions: { min: 12, max: 12 }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    elite:      { hoursMin: 15, hoursMax: 30, swim: { min: 4, max: 5 }, bike: { min: 4, max: 5 }, run: { min: 4, max: 5 }, brick: { min: 1, max: 2 }, strength: { min: 2, max: 2 }, totalSessions: { min: 15, max: 18 }, maxSessionsPerDay: 3, minFullRestDays: 0 },
  },
  IM: {
    finisher:   { hoursMin: 5,  hoursMax: 8,  swim: { min: 2, max: 2 }, bike: { min: 2, max: 2 }, run: { min: 2, max: 3 }, brick: { min: 0, max: 1 }, strength: { min: 1, max: 1 }, totalSessions: { min: 7,  max: 9  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    age_group:  { hoursMin: 8,  hoursMax: 11, swim: { min: 3, max: 3 }, bike: { min: 3, max: 3 }, run: { min: 3, max: 3 }, brick: { min: 1, max: 1 }, strength: { min: 1, max: 1 }, totalSessions: { min: 11, max: 11 }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    competitor: { hoursMin: 11, hoursMax: 14, swim: { min: 3, max: 4 }, bike: { min: 3, max: 4 }, run: { min: 3, max: 4 }, brick: { min: 1, max: 1 }, strength: { min: 2, max: 2 }, totalSessions: { min: 12, max: 12 }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    elite:      { hoursMin: 15, hoursMax: 30, swim: { min: 4, max: 6 }, bike: { min: 4, max: 5 }, run: { min: 4, max: 5 }, brick: { min: 1, max: 2 }, strength: { min: 2, max: 2 }, totalSessions: { min: 15, max: 18 }, maxSessionsPerDay: 3, minFullRestDays: 0 },
  },
  // TRI court : bike/run = 703 −1 (plancher 2), swim identique 703, brick 0-1, strength idem 703.
  TRI_SPRINT: {
    finisher:   { hoursMin: 5,  hoursMax: 8,  swim: { min: 2, max: 2 }, bike: { min: 2, max: 2 }, run: { min: 2, max: 2 }, brick: { min: 0, max: 1 }, strength: { min: 1, max: 1 }, totalSessions: { min: 7,  max: 8  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    age_group:  { hoursMin: 8,  hoursMax: 11, swim: { min: 3, max: 3 }, bike: { min: 2, max: 2 }, run: { min: 2, max: 2 }, brick: { min: 0, max: 1 }, strength: { min: 1, max: 1 }, totalSessions: { min: 8,  max: 9  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    competitor: { hoursMin: 11, hoursMax: 14, swim: { min: 3, max: 4 }, bike: { min: 2, max: 3 }, run: { min: 2, max: 3 }, brick: { min: 0, max: 1 }, strength: { min: 2, max: 2 }, totalSessions: { min: 9,  max: 12 }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    elite:      { hoursMin: 15, hoursMax: 30, swim: { min: 4, max: 5 }, bike: { min: 3, max: 4 }, run: { min: 3, max: 4 }, brick: { min: 0, max: 1 }, strength: { min: 2, max: 2 }, totalSessions: { min: 12, max: 15 }, maxSessionsPerDay: 3, minFullRestDays: 0 },
  },
  TRI_OLYMPIQUE: {
    finisher:   { hoursMin: 5,  hoursMax: 8,  swim: { min: 2, max: 2 }, bike: { min: 2, max: 2 }, run: { min: 2, max: 2 }, brick: { min: 0, max: 1 }, strength: { min: 1, max: 1 }, totalSessions: { min: 7,  max: 8  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    age_group:  { hoursMin: 8,  hoursMax: 11, swim: { min: 3, max: 3 }, bike: { min: 2, max: 2 }, run: { min: 2, max: 2 }, brick: { min: 0, max: 1 }, strength: { min: 1, max: 1 }, totalSessions: { min: 8,  max: 9  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    competitor: { hoursMin: 11, hoursMax: 14, swim: { min: 3, max: 4 }, bike: { min: 2, max: 3 }, run: { min: 2, max: 3 }, brick: { min: 0, max: 1 }, strength: { min: 2, max: 2 }, totalSessions: { min: 9,  max: 12 }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    elite:      { hoursMin: 15, hoursMax: 30, swim: { min: 4, max: 5 }, bike: { min: 3, max: 4 }, run: { min: 3, max: 4 }, brick: { min: 0, max: 1 }, strength: { min: 2, max: 2 }, totalSessions: { min: 12, max: 15 }, maxSessionsPerDay: 3, minFullRestDays: 0 },
  },
  // CAP route — pas de seuil horaire (matrice v1)
  SEMI: {
    finisher:   { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 3, max: 3 }, brick: { min: 0, max: 0 }, strength: { min: 1, max: 1 }, totalSessions: { min: 4,  max: 5  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    age_group:  { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 4, max: 4 }, brick: { min: 0, max: 0 }, strength: { min: 1, max: 1 }, totalSessions: { min: 5,  max: 6  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    competitor: { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 5, max: 5 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 7,  max: 8  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    elite:      { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 6, max: 8 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 8,  max: 11 }, maxSessionsPerDay: 2, minFullRestDays: 0 },
  },
  MARATHON: {
    finisher:   { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 3, max: 3 }, brick: { min: 0, max: 0 }, strength: { min: 1, max: 1 }, totalSessions: { min: 4,  max: 5  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    age_group:  { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 4, max: 4 }, brick: { min: 0, max: 0 }, strength: { min: 1, max: 1 }, totalSessions: { min: 5,  max: 6  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    competitor: { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 5, max: 5 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 7,  max: 8  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    elite:      { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 6, max: 8 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 8,  max: 11 }, maxSessionsPerDay: 2, minFullRestDays: 0 },
  },
  "10K": {
    finisher:   { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 3, max: 3 }, brick: { min: 0, max: 0 }, strength: { min: 1, max: 1 }, totalSessions: { min: 4,  max: 5  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    age_group:  { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 4, max: 4 }, brick: { min: 0, max: 0 }, strength: { min: 1, max: 1 }, totalSessions: { min: 5,  max: 6  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    competitor: { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 5, max: 5 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 7,  max: 8  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    elite:      { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 6, max: 8 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 8,  max: 11 }, maxSessionsPerDay: 2, minFullRestDays: 0 },
  },
  "5K": {
    finisher:   { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 3, max: 3 }, brick: { min: 0, max: 0 }, strength: { min: 1, max: 1 }, totalSessions: { min: 4,  max: 5  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    age_group:  { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 4, max: 4 }, brick: { min: 0, max: 0 }, strength: { min: 1, max: 1 }, totalSessions: { min: 5,  max: 6  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    competitor: { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 5, max: 5 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 7,  max: 8  }, maxSessionsPerDay: 2, minFullRestDays: 1 },
    elite:      { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 6, max: 8 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 8,  max: 11 }, maxSessionsPerDay: 2, minFullRestDays: 0 },
  },
  // Start to Run — débuter/reprendre la course (marche-course).
  // Jamais de "sortie longue" : 3 séances marche-course courtes + renfo fondation.
  // Fréquence > volume (Nielsen 2013, Videbæk 2015 : risque blessure du débutant
  // piloté par la progression de charge, pas par la durée d'une séance unique).
  STARTTORUN: {
    finisher:   { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 3, max: 3 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 4, max: 5 }, maxSessionsPerDay: 1, minFullRestDays: 2 },
    age_group:  { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 3, max: 3 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 4, max: 5 }, maxSessionsPerDay: 1, minFullRestDays: 2 },
    competitor: { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 3, max: 3 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 4, max: 5 }, maxSessionsPerDay: 1, minFullRestDays: 2 },
    elite:      { swim: { min: 0, max: 0 }, bike: { min: 0, max: 1 }, run: { min: 3, max: 3 }, brick: { min: 0, max: 0 }, strength: { min: 2, max: 2 }, totalSessions: { min: 4, max: 5 }, maxSessionsPerDay: 1, minFullRestDays: 2 },
  },
};

/** Durées planchers SL par format (min). Consommées par validateWeeklyQuotas. */
const SL_MIN_BY_OBJECTIVE: Record<SizingObjectiveKey, { bike?: number; run?: number }> = {
  IM:            { bike: 150, run: 100 },
  "703":         { bike: 120, run: 90 },
  TRI_OLYMPIQUE: { bike: 90,  run: 70 },
  TRI_SPRINT:    { bike: 75,  run: 60 },
  SEMI:          { run: 90 },
  MARATHON:      { run: 110 },
  "10K":         { run: 60 },
  "5K":          { run: 60 },
  // Start to Run : aucune sortie longue (voir STARTTORUN_MAX_SESSION_MIN).
  STARTTORUN:    {},
};

/**
 * Plafond DÉTERMINISTE de durée d'une séance marche-course Start to Run,
 * par numéro de semaine (1-indexé). Progression ~+5 min / 2 semaines.
 * Aucune séance ne doit dépasser ces valeurs — un débutant ou une reprise
 * post-blessure ne fait pas de sortie de 1h+ en début de plan.
 */
export function startToRunMaxSessionMin(weekNumber: number): number {
  const w = Math.max(1, Math.round(weekNumber || 1));
  if (w <= 2) return 35;
  if (w <= 4) return 40;
  if (w <= 6) return 45;
  if (w <= 8) return 50;
  if (w <= 10) return 55;
  return 60;
}


function sourceFor(obj: SizingObjectiveKey): { tier: EvidenceTier; ref: string } {
  if (obj === "703") return SRC_703;
  if (obj === "IM") return SRC_IM;
  if (obj === "TRI_SPRINT" || obj === "TRI_OLYMPIQUE") return SRC_TRI_COURT;
  return SRC_CAP;
}

/** Normalise l'objectif utilisateur en clé matrice, ou null si non couvert (trail/autre). */
export function normalizeSizingObjective(objective: string | null | undefined): SizingObjectiveKey | null {
  if (!objective) return null;
  const l = objective.toLowerCase();
  if (l.includes("trail") || l.includes("ultra") || l.includes("utmb") || l.includes("ccc") || l.includes("occ") || l.includes("hardrock") || l.includes("skyrun")) return null;
  // Avant tout le reste : Start to Run ne doit jamais tomber sur 5K/10K.
  if (l.includes("start to run") || l.includes("start-to-run") || l.includes("starttorun") || l.includes("s2r") || l.includes("débutant") || l.includes("debutant")) return "STARTTORUN";
  if (l.includes("70.3") || l.includes("half iron") || l.includes("half-iron") || l === "703" || l.includes("ironman 70")) return "703";
  if (l.includes("ironman") || l === "im" || l.match(/\bim\b/)) return "IM";
  if (l.includes("sprint") && (l.includes("tri") || l.includes("triathlon"))) return "TRI_SPRINT";
  if ((l.includes("olymp") || l.includes("courte distance") || l === "cd") && (l.includes("tri") || l.includes("triathlon"))) return "TRI_OLYMPIQUE";
  if (l.includes("semi") || l.includes("half marathon") || l.includes("half-marathon")) return "SEMI";
  if (l.includes("marathon")) return "MARATHON";
  if (l.includes("10k") || l.includes("10 km")) return "10K";
  if (l.includes("5k") || l === "5km") return "5K";
  return null;
}

/** Normalise l'ambition effective vers la clé matrice 4-tier (world_class → elite). */
export function normalizeSizingAmbition(ambition: string | null | undefined): SizingAmbitionKey {
  if (!ambition) return "age_group";
  const l = ambition.toLowerCase();
  if (l === "world_class" || l === "worldclass" || l.includes("world-class")) return "elite";
  if (l === "finisher" || l === "discovery" || l.includes("decouverte") || l.includes("découverte")) return "finisher";
  if (l === "age_group" || l === "confirmed" || l.includes("confirmé") || l.includes("confirme")) return "age_group";
  if (l === "competitor" || l.includes("compétit") || l.includes("competit")) return "competitor";
  if (l === "elite" || l.includes("qualifiable") || l.includes("qualif")) return "elite";
  return "age_group";
}

const AMBITION_ORDER: SizingAmbitionKey[] = ["finisher", "age_group", "competitor", "elite"];

function isTri(obj: SizingObjectiveKey): boolean {
  return obj === "703" || obj === "IM" || obj === "TRI_SPRINT" || obj === "TRI_OLYMPIQUE";
}

function floorsFor(obj: SizingObjectiveKey): SizingFloors {
  if (obj === "STARTTORUN") {
    // Pas de sortie longue chez le débutant / la reprise post-blessure :
    // 3 marche-course de durée plafonnée + 2 renfo fondation.
    return { longRideWeekly: false, longRunWeekly: false, minStrengthPerWeek: 2 };
  }
  const base = isTri(obj) ? { ...FLOORS_TRI } : { ...FLOORS_CAP };
  const sl = SL_MIN_BY_OBJECTIVE[obj];
  if (sl?.bike && base.longRideWeekly) base.slLongRideMin = sl.bike;
  if (sl?.run && base.longRunWeekly) base.slLongRunMin = sl.run;
  return base;
}


/**
 * Compute deterministic weekly session quota.
 *
 * @param objective         Objectif libre (sera normalisé). Retourne null si non couvert (trail, autre).
 * @param ambitionEffective Ambition effective déjà passée par computeAmbitionEffective (JAMAIS brute).
 * @param hoursAvailable    Heures/semaine dispo (garde-fou 703/IM uniquement en v1).
 * @param weekType          "load" | "recovery" | "taper" | "race".
 */
export function computeWeeklySessionQuota(
  objective: string,
  ambitionEffective: string,
  hoursAvailable: number,
  weekType: WeekType,
): {
  quota: WeeklyQuota;
  floors: SizingFloors;
  downgraded: boolean;
  downgradeReason?: string;
} | null {
  const objKey = normalizeSizingObjective(objective);
  if (!objKey) return null;
  const requested = normalizeSizingAmbition(ambitionEffective);

  // Garde-fou heures↔ambition (703/IM/TRI_* qui portent hoursMin)
  let ambition: SizingAmbitionKey = requested;
  let downgraded = false;
  let downgradeReason: string | undefined;
  const startIdx = AMBITION_ORDER.indexOf(requested);
  for (let i = startIdx; i >= 0; i--) {
    const row = MATRIX[objKey]?.[AMBITION_ORDER[i]];
    if (!row) continue;
    if (typeof row.hoursMin !== "number" || hoursAvailable >= row.hoursMin) {
      ambition = AMBITION_ORDER[i];
      break;
    }
  }
  if (ambition !== requested) {
    downgraded = true;
    const askedRow = MATRIX[objKey]?.[requested];
    downgradeReason = `${hoursAvailable}h déclarées < ${askedRow?.hoursMin ?? "?"}h requises pour ${requested} — quota calculé sur ${ambition}`;
  }

  const row = MATRIX[objKey]?.[ambition];
  if (!row) return null;

  const src = sourceFor(objKey);
  const floors = floorsFor(objKey);

  // Base quota (copie profonde des ranges pour mutation locale)
  const base: WeeklyQuota = {
    swim: { ...row.swim },
    bike: { ...row.bike },
    run: { ...row.run },
    brick: { ...row.brick },
    strength: { ...row.strength },
    totalSessions: { ...row.totalSessions },
    maxSessionsPerDay: row.maxSessionsPerDay,
    minFullRestDays: row.minFullRestDays,
    source: src,
  };

  // Modulateurs weekType
  let quota: WeeklyQuota = base;
  const localFloors: SizingFloors = { ...floors };

  if (weekType === "recovery") {
    // Total -30% arrondi inférieur ; retirer 1 qualité bike puis 1 qualité run.
    const totMinR = Math.floor(base.totalSessions.min * 0.7);
    const totMaxR = Math.floor(base.totalSessions.max * 0.7);
    const bikeMin = Math.max(0, base.bike.min - 1);
    const bikeMax = Math.max(bikeMin, base.bike.max - 1);
    const runMin = Math.max(0, base.run.min - 1);
    const runMax = Math.max(runMin, base.run.max - 1);
    quota = {
      ...base,
      bike: { min: bikeMin, max: bikeMax },
      run: { min: runMin, max: runMax },
      // swim jamais sous minSwim (floor tri) / sous plancher CAP (0)
      swim: {
        min: Math.max(base.swim.min, localFloors.minSwimPerWeek ?? 0),
        max: base.swim.max,
      },
      strength: { min: localFloors.minStrengthPerWeek, max: localFloors.minStrengthPerWeek },
      totalSessions: { min: Math.max(0, totMinR), max: Math.max(0, totMaxR) },
      source: { tier: "elite_practice", ref: "pratique standard cycles 3:1" },
    };
    // Recovery : SL maintenues mais durée plancher × 0.7 (arrondi 5min)
    const round5 = (v: number) => Math.round((v * 0.7) / 5) * 5;
    if (typeof localFloors.slLongRideMin === "number") localFloors.slLongRideMin = round5(localFloors.slLongRideMin);
    if (typeof localFloors.slLongRunMin === "number") localFloors.slLongRunMin = round5(localFloors.slLongRunMin);
  } else if (weekType === "taper") {
    // Fréquence quasi intacte : total -1 à -2 séances max, floors maintenus
    // sauf longRideWeekly / longRunWeekly désactivés.
    quota = {
      ...base,
      totalSessions: {
        min: Math.max(0, base.totalSessions.min - 2),
        max: Math.max(0, base.totalSessions.max - 1),
      },
      source: {
        tier: "peer_reviewed",
        ref: "Mujika 2003, Bosquet 2007 — réduire volume 40-60%, MAINTENIR fréquence et intensité",
      },
    };
    localFloors.longRideWeekly = false;
    localFloors.longRunWeekly = false;
    localFloors.slLongRideMin = undefined;
    localFloors.slLongRunMin = undefined;
  } else if (weekType === "race") {
    // Floors uniquement (swim min, strength 0 autorisé), reste libre.
    quota = {
      ...base,
      strength: { min: 0, max: base.strength.max },
      source: { tier: "elite_practice", ref: "Race week — floors seuls, logique race-week existante prime" },
    };
    localFloors.minStrengthPerWeek = 0;
    localFloors.longRideWeekly = false;
    localFloors.longRunWeekly = false;
    localFloors.slLongRideMin = undefined;
    localFloors.slLongRunMin = undefined;
  }

  return { quota, floors: localFloors, downgraded, downgradeReason };
}

/**
 * Mapping simple weekType depuis la position dans le plan.
 * Aligne l'heuristique de phase serveur (inferPhaseFromWeek).
 *
 * - race    : dernière semaine si en zone taper (pct > 0.92)
 * - taper   : pct > 0.92 (hors race)
 * - recovery: toutes les 4 semaines (cycle 3:1), hors taper/race
 * - load    : autrement
 */
export function inferWeekType(weekNumber: number, totalWeeks: number): WeekType {
  const pct = weekNumber / Math.max(totalWeeks, 1);
  if (pct > 0.92 && weekNumber === totalWeeks) return "race";
  if (pct > 0.92) return "taper";
  if (weekNumber % 4 === 0) return "recovery";
  return "load";
}

/** Formatte une plage min-max en texte "N" (si min=max) ou "min à max". */
function fmtRange(r: QuotaRange): string {
  if (r.min === r.max) return `exactement ${r.min}`;
  return `${r.min} à ${r.max}`;
}

/**
 * Construit le bloc CONTRAINTES injecté dans le userPrompt (chunk-scoped).
 * `weeksScope` = numéros de semaines du chunk (ex: [1,2,3,4,5]).
 */
export function buildQuotaPromptBlock(
  weeksScope: number[],
  quotasByWeek: Record<number, { quota: WeeklyQuota; floors: SizingFloors; weekType: WeekType; downgraded: boolean; downgradeReason?: string }>,
): string {
  const lines: string[] = [];
  lines.push("🧮 CONTRAINTES DE DIMENSIONNEMENT (NON NÉGOCIABLES, calculées par le moteur) :");
  for (const w of weeksScope) {
    const entry = quotasByWeek[w];
    if (!entry) continue;
    const q = entry.quota;
    const parts = [
      `natation ${fmtRange(q.swim)}`,
      `vélo ${fmtRange(q.bike)}`,
      `CAP ${fmtRange(q.run)}`,
      `brick ${fmtRange(q.brick)}`,
      `renfo ${fmtRange(q.strength)}`,
      `max ${q.maxSessionsPerDay} séances/jour`,
      q.minFullRestDays > 0 ? `≥${q.minFullRestDays} jour${q.minFullRestDays > 1 ? "s" : ""} repos complet` : "repos ajustable",
    ];
    lines.push(`Semaine ${w} (${entry.weekType}) : ${parts.join(" · ")}`);
    if (entry.downgraded && entry.downgradeReason) {
      lines.push(`  ↳ ambition ajustée : ${entry.downgradeReason}`);
    }
  }
  lines.push("");
  lines.push("→ Le nombre de séances par sport ci-dessus est FERME. Tu places et sélectionnes les séances (dans le catalogue prioritairement) ; tu ne modifies JAMAIS ces compteurs.");
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECALAGE SUR LA DEMANDE UTILISATEUR (séances/semaine saisies)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Réajuste un quota hebdo déterministe pour respecter EXACTEMENT le nombre de
 * séances cardio/semaine demandé par le coach (formulaire ou démarrage guidé).
 *
 * Sans ce recalage, la matrice ambition×objectif imposait son propre total et le
 * squelette jour-par-jour (buildWeeklySlotLayout) injecté dans le prompt écrasait
 * la demande utilisateur.
 *
 * Règles :
 *  - Le renfo n'est PAS compté dans la cible (aligné sur le prompt "séances cardio hors renfo").
 *  - Les floors physiologiques restent prioritaires (nat mini tri, 1 SL vélo, 1 SL CAP)
 *    tant que la cible le permet ; si la cible est plus basse que la somme des floors,
 *    les floors non-essentiels sont relâchés dans l'ordre brick → nat → vélo.
 *  - Modulation weekType conservée : recovery ≈ −30 %, taper −1.
 */
export function applySessionsPerWeekTarget(
  input: { quota: WeeklyQuota; floors: SizingFloors },
  targetCardioPerWeek: number,
  weekType: WeekType,
): { quota: WeeklyQuota; floors: SizingFloors } {
  const target0 = Math.round(targetCardioPerWeek);
  if (!Number.isFinite(target0) || target0 <= 0) return input;

  const quota = {
    ...input.quota,
    swim: { ...input.quota.swim }, bike: { ...input.quota.bike },
    run: { ...input.quota.run }, brick: { ...input.quota.brick },
    strength: { ...input.quota.strength }, totalSessions: { ...input.quota.totalSessions },
  };
  const floors: SizingFloors = { ...input.floors };

  // Modulation weekType sur la cible utilisateur.
  let target = target0;
  if (weekType === "recovery") target = Math.max(2, Math.round(target0 * 0.7));
  else if (weekType === "taper") target = Math.max(2, target0 - 1);

  type CardioSport = "swim" | "bike" | "run" | "brick";
  const sports: CardioSport[] = ["swim", "bike", "run", "brick"];
  const mid = (r: QuotaRange) => (r.min + r.max) / 2;
  const allowed: Record<CardioSport, boolean> = {
    swim: quota.swim.max > 0, bike: quota.bike.max > 0,
    run: quota.run.max > 0, brick: quota.brick.max > 0,
  };

  // Planchers physiologiques (relâchés si la cible est trop basse).
  const mins: Record<CardioSport, number> = {
    swim: allowed.swim ? Math.min(floors.minSwimPerWeek ?? 0, quota.swim.max) : 0,
    bike: allowed.bike && floors.longRideWeekly ? 1 : 0,
    run: allowed.run && floors.longRunWeekly ? 1 : 0,
    brick: 0,
  };
  const relaxOrder: CardioSport[] = ["brick", "swim", "bike"];
  let sumMins = sports.reduce((a, s) => a + mins[s], 0);
  for (const s of relaxOrder) {
    while (sumMins > target && mins[s] > 0) { mins[s]--; sumMins--; }
  }
  if (sumMins > target) target = sumMins; // jamais sous les floors essentiels (SL CAP)
  if (mins.swim < (floors.minSwimPerWeek ?? 0)) floors.minSwimPerWeek = mins.swim;
  if (mins.bike === 0) floors.longRideWeekly = false;

  // Répartition du reliquat au prorata des poids de la matrice (plus grand reste).
  const weights: Record<CardioSport, number> = {
    swim: allowed.swim ? Math.max(mid(quota.swim), 0.01) : 0,
    bike: allowed.bike ? Math.max(mid(quota.bike), 0.01) : 0,
    run: allowed.run ? Math.max(mid(quota.run), 0.01) : 0,
    brick: allowed.brick ? Math.max(mid(quota.brick), 0.01) : 0,
  };
  const totalWeight = sports.reduce((a, s) => a + weights[s], 0) || 1;
  let rest = target - sumMins;
  const alloc: Record<CardioSport, number> = { ...mins };
  const fracs: Array<{ s: CardioSport; f: number }> = [];
  for (const s of sports) {
    if (weights[s] === 0) continue;
    const exact = (rest * weights[s]) / totalWeight;
    const whole = Math.floor(exact);
    alloc[s] += whole;
    fracs.push({ s, f: exact - whole });
  }
  let placed = sports.reduce((a, s) => a + alloc[s], 0);
  const TIE_PRIORITY: Record<CardioSport, number> = { run: 0, bike: 1, swim: 2, brick: 3 };
  fracs.sort((a, b) => (b.f - a.f) || (TIE_PRIORITY[a.s] - TIE_PRIORITY[b.s]));
  let i = 0;
  while (placed < target && fracs.length > 0) {
    alloc[fracs[i % fracs.length].s]++; placed++; i++;
  }
  while (placed > target) {
    // Retire d'abord sur le sport le plus dosé au-dessus de son plancher.
    const s = sports
      .filter(x => alloc[x] > mins[x])
      .sort((a, b) => (alloc[b] - mins[b]) - (alloc[a] - mins[a]))[0];
    if (!s) break;
    alloc[s]--; placed--;
  }

  for (const s of sports) quota[s] = { min: alloc[s], max: alloc[s] };

  const strengthTotal = quota.strength;
  quota.totalSessions = {
    min: target + strengthTotal.min,
    max: target + strengthTotal.max,
  };

  // Capacité calendaire : autoriser assez de séances/jour pour loger la demande.
  const restDays = quota.minFullRestDays;
  const trainingDays = Math.max(1, 7 - restDays);
  const needPerDay = Math.ceil(quota.totalSessions.max / trainingDays);
  if (needPerDay > quota.maxSessionsPerDay) {
    quota.maxSessionsPerDay = Math.min(3, needPerDay);
    if (needPerDay > 3 && quota.minFullRestDays > 0) quota.minFullRestDays = 0;
  }

  quota.source = {
    ...quota.source,
    ref: `${quota.source.ref} — recalé sur ${target0} séances/sem (saisie coach)`,
  };
  return { quota, floors };
}
