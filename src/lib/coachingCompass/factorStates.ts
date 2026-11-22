import type { CoachingCompassInput, TFCLCoachingCompassResult } from "./types";
import { buildProfileComparisons, type ProfileComparison } from "./profileComparison";
import { idealReference, idealState, type IdealFactor, type IdealReference } from "./idealReferences";
import { parseStoredCriticalMetrics } from "@/lib/criticalMetrics";
import { parseStoredDurability } from "@/lib/durability/longSessionDurability";
import { normalizeObjective } from "@/lib/physiologicalTargets";

/**
 * État de chaque facteur face à l'idéal, et classement des écarts. Affichage seul :
 * lit les mêmes valeurs que le Compass, ne touche ni le classement du moteur ni les plans.
 */
export const fmt = (n: number) => n.toLocaleString("fr-BE", { maximumFractionDigits: n < 10 ? 2 : 1 });
const SHOWN = new Set(["vo2max", "vma", "ftpkg", "vlamax", "tte", "fatmax"]);
const IDEAL_FACTORS = new Set<string>(["vo2max", "vma", "ftpkg"]);

/**
 * Intensité de course soutenue par des coureurs de classe mondiale, en % de la
 * VO₂max (Casado et al., Sports Med Open 2022, échelle d'intensité) : seule
 * donnée lue qui dépend de la distance. Approximation : en course, la VO₂ varie
 * presque linéairement avec la vitesse, donc % VO₂max ≈ % vVO₂max (VMA).
 */
const RACE_INTENSITY: Record<string, { low: number; high: number }> = {
  "5K": { low: 90, high: 99 }, "10K": { low: 85, high: 89 }, "10km": { low: 85, high: 89 },
  Semi: { low: 80, high: 84 }, Marathon: { low: 80, high: 84 },
};

export type FactorRow = {
  key: string; label: string; unit: string; value: number | null; observation?: string;
  zone: { low: number; high: number; point: number | null } | null;
  tier: "measured" | "derived" | "coaching" | "cohort" | "observed"; state: "below" | "inside" | "above" | "missing" | "none";
  basis: string | null; evidence: readonly string[]; engineNote: string | null; adjustment?: string | null;
  stateText?: Partial<Record<"below" | "inside" | "above", string>>;
  /** Ligne de statut sous le niveau de preuve (ex. « Estimation non confirmée »). */
  caption?: string;
};

/** Ce que l'objectif chronométré exige de la VMA, face à ce que soutiennent les élites sur cette distance. */
function demandRow(metrics: ProfileComparison[], objective: string): FactorRow | null {
  const band = RACE_INTENSITY[objective];
  const speed = metrics.find(m => m.key === "raceSpeed")?.reference;
  const vma = metrics.find(m => m.key === "vma")?.value;
  if (!band || !speed || speed.kind !== "goal" || !vma || vma <= 0) return null;
  const demand = Math.round(speed.low / vma * 1000) / 10;
  return {
    key: "demand", label: "Exigence du chrono visé (% de la VMA)", unit: "%", value: demand,
    zone: { low: band.low, high: band.high, point: null }, tier: "measured",
    state: demand < band.low ? "below" : demand > band.high ? "above" : "inside",
    stateText: { below: "Marge", inside: "Comme les élites", above: "Plus que les élites" },
    basis: `Le chrono visé demande ${demand} % de la VMA enregistrée. Sur cette distance, des coureurs de classe mondiale courent à ${band.low}–${band.high} % de leur VO₂max. Au-dessus de cette fourchette, la VMA est probablement le facteur limitant (ou le chrono est trop ambitieux). Approximation : % VO₂max ≈ % de la VMA.`,
    evidence: ["casado-2022"], engineNote: null,
  };
}


function row(metric: ProfileComparison, ideal: IdealReference | null): FactorRow {
  const base = { key: metric.key, label: metric.label, unit: ideal?.unit ?? metric.unit, value: metric.value, observation: metric.observationLabel };
  if (ideal) {
    const engine = metric.reference && metric.reference.kind === "coaching"
      ? `Le radar utilise le repère TFCL : ${fmt(metric.reference.low)}${metric.reference.high !== metric.reference.low ? "–" + fmt(metric.reference.high) : ""} ${metric.unit}, la cible interne du moteur de plans.` : null;
    return { ...base, zone: { low: ideal.low, high: ideal.high, point: ideal.point }, tier: ideal.tier,
      state: metric.value == null ? "missing" : idealState(metric.value, ideal), basis: ideal.basis, evidence: ideal.evidenceIds, engineNote: engine,
      adjustment: ideal.adjustment };
  }
  const ref = metric.reference;
  return { ...base, zone: ref ? { low: ref.low, high: ref.high, point: ref.low === ref.high ? ref.low : null } : null,
    tier: ref?.kind === "cohort" ? "cohort" : "coaching",
    state: metric.value == null && !metric.observationLabel ? "missing" : !ref ? "none" : metric.status === "unavailable" || metric.status === "missing" ? "missing" : metric.status,
    basis: ref?.note ?? null, evidence: [], engineNote: null };
}


/**
 * Écart à la zone idéale, en % de la borne franchie. Un facteur n'est « en écart » que dans
 * le sens qui pénalise : sous la zone pour une capacité, des deux côtés pour le VLamax
 * (plus bas n'est pas toujours mieux), au-dessus pour l'exigence du chrono visé.
 */
export function gapPercent(r: FactorRow): number {
  if (r.value == null || !r.zone || r.zone.low <= 0) return 0;
  if (r.key !== "demand" && r.state === "below") return (r.zone.low - r.value) / r.zone.low * 100;
  if ((r.key === "vlamax" || r.key === "demand") && r.state === "above") return (r.value - r.zone.high) / r.zone.high * 100;
  return 0;
}


/**
 * Facteurs propres à l'athlète, sans cible publiée : allure ou puissance critique, réserve
 * anaérobie, durabilité des sorties longues. Ils sont affichés avec leur niveau de preuve mais
 * jamais classés : aucun idéal sourcé par objectif ou ambition n'existe (voir
 * docs/etude-cp-cs-durabilite-tte-2026-11-22.md). Affichage seul.
 */
const LONG_OBJECTIVES = new Set(["Marathon", "IM", "703", "Ultra"]);
const isLongObjective = (objective: string) => LONG_OBJECTIVES.has(normalizeObjective(objective)) || /ultra|trail/i.test(objective);

const CP_BASIS = "Ajustement de 3 efforts maximaux de 2 à 15 min (Nolio ou saisie). La CP n'est pas une allure ou une puissance tenable une heure : elle se situe en moyenne ≈ 12 W au-dessus du MLSS, avec un écart individuel de −19 à +44 W (méta-analyse 2025). Ne sert pas à classer les limiteurs.";
const CS_BASIS = "Ajustement d'efforts maximaux de 2 à 15 min (Nolio ou saisie). Chez des coureurs bien entraînés, la CS dépasse l'allure du MLSS (16,4 contre 15,2 km/h, 10 coureurs) : à lire comme la frontière du seuil sévère, pas comme une allure tenable une heure. Ne sert pas à classer les limiteurs.";
const RESERVE_BASIS = "Travail réalisable au-dessus du seuil critique. Utile pour doser les intervalles. Les preuves ne permettent pas d'en faire une mesure de la VLamax : facteur distinct, jamais classé.";

export function observedRows(input: CoachingCompassInput, sport: FactorSport): FactorRow[] {
  const rows: FactorRow[] = [];
  const critical = parseStoredCriticalMetrics(input.criticalMetrics)[sport === "bike" ? "cycling" : "running"];
  const status = (c: NonNullable<typeof critical>) => (c.coachReview?.verdict === "reject" ? "Écarté par l'avis du coach : n'ajuste aucune séance"
    : c.status === "confirmed" ? "Confirmé par le coach" : "Estimation non confirmée : affichée, n'ajuste aucune séance")
    + (c.latestEffortDate ? " · efforts jusqu'au " + c.latestEffortDate.split("-").reverse().join("/") : "");
  const make = (key: string, label: string, unit: string, value: number, basis: string, evidence: string[], caption: string): FactorRow =>
    ({ key, label, unit, value, zone: null, tier: "observed", state: "none", basis, evidence, engineNote: null, caption });
  if (critical) {
    if (sport === "bike") {
      rows.push(make("cp", "Puissance critique (CP)", "W", Math.round(critical.critical), CP_BASIS, ["poole-2016", "cp-mlss-2025"], status(critical)));
      rows.push(make("wprime", "Réserve anaérobie (W′)", "kJ", Math.round(critical.reserve / 100) / 10, RESERVE_BASIS, ["poole-2016"], status(critical)));
    } else {
      rows.push(make("cs", "Vitesse critique (CS)", "km/h", Math.round(critical.critical * 36) / 10, CS_BASIS, ["cs-mlss-2021", "cs-marathon-2020"], status(critical)));
      rows.push(make("dprime", "Réserve anaérobie (D′)", "m", Math.round(critical.reserve), RESERVE_BASIS, ["cs-mlss-2021"], status(critical)));
    }
  }
  const durability = parseStoredDurability(input.criticalMetrics)[sport];
  const longObjective = isLongObjective(input.objectif);
  if (durability) {
    const d = durability;
    rows.push({ key: "durability", label: "Durabilité (sorties longues)", unit: "%", value: d.meanChangePct, zone: null, tier: "observed", state: "none",
      basis: `Meilleur effort de 20 min au début contre le dernier tiers de ${d.sessions.length} sorties longues Nolio (${sport === "bike" ? "≥ 2 h" : "≥ 1 h 30"}), moyenne ${d.meanChangePct.toLocaleString("fr-BE")} %. `
        + (sport === "bike" ? "Repère d'observation, pas une cible : −10,8 ± 7,8 % (5 min) et −10,1 ± 6,5 % (20 min) après 1 000 kJ chez 20 cyclistes amateurs. " : "Repère d'observation, pas une cible : −5,5 % de vitesse au seuil après 90 min chez 18 marathoniens. ")
        + "Dépend de ce que l'athlète a réellement poussé en fin de séance : à confirmer avec le coach.",
      evidence: sport === "bike" ? ["durability-cycling-2025", "durability-hunter-2025"] : ["durability-running-2025", "durability-hunter-2025"], engineNote: null,
      caption: "Estimation depuis les sorties enregistrées · du " + d.from.split("-").reverse().join("/") + " au " + d.to.split("-").reverse().join("/") });
  } else if (longObjective) {
    rows.push({ key: "durability", label: "Durabilité (sorties longues)", unit: "%", value: null, zone: null, tier: "observed", state: "missing",
      basis: "Pertinente pour les objectifs longs. Se mesure à partir d'au moins 2 sorties longues Nolio (vélo ≥ 2 h, course ≥ 1 h 30) ou d'un test avant/après charge.",
      evidence: ["durability-hunter-2025"], engineNote: null });
  }
  return rows;
}

export type FactorSport = "run" | "bike";
export interface FactorStates {
  sections: { sport: FactorSport; rows: FactorRow[] }[];
  /** Écarts mesurés, du plus grand au plus petit. */
  ranked: { r: FactorRow; sport: FactorSport; gap: number }[];
  /** Facteurs sans valeur : listés à part, jamais classés. */
  unmeasured: { r: FactorRow; sport: FactorSport }[];
  /** Mesures propres à l'athlète, sans cible publiée : affichées, jamais classées. */
  observed: { r: FactorRow; sport: FactorSport }[];
}

export function buildFactorStates(input: CoachingCompassInput, compass: TFCLCoachingCompassResult): FactorStates {
  const sections = buildProfileComparisons(input, compass).map(g => {
    const rows = g.metrics.filter(m => SHOWN.has(m.key)).map(m => row(m, IDEAL_FACTORS.has(m.key)
      ? idealReference(m.key as IdealFactor, { objective: input.objectif, ambition: input.ambition, sport: g.sport, age: input.athleteAge, sex: input.athleteSex }) : null));
    const demand = g.sport === "run" ? demandRow(g.metrics, input.objectif) : null;
    const sport = g.sport as FactorSport;
    return { sport, rows: [...rows, ...(demand ? [demand] : []), ...observedRows(input, sport)] };
  }).filter(s => s.rows.length > 0);
  const all = sections.flatMap(s => s.rows.map(r => ({ r, sport: s.sport })));
  return {
    sections,
    ranked: all.map(x => ({ ...x, gap: gapPercent(x.r) })).filter(x => x.gap > 0.05).sort((a, b) => b.gap - a.gap),
    unmeasured: all.filter(x => x.r.state === "missing"),
    observed: all.filter(x => x.r.tier === "observed" && x.r.value != null),
  };
}

/**
 * Hypothèse glycolytique : le Compass voit un VLamax dont la plage d'incertitude, ou une
 * observation datée, dépasse le haut de la plage de référence alors que la valeur retenue
 * est dedans. Ce n'est pas un écart mesuré : il est présenté à part, comme « à vérifier ».
 */
export interface GlycolyticHypothesis {
  sport: FactorSport; current: number; ceiling: number; modelHigh: number;
  observed: number | null; observedDate: string | null;
  /** Dépassement du haut de la plage, en %, selon la plus haute observation connue. */
  excess: number;
}
export function glycolyticHypothesis(overlap: {
  sport: FactorSport; current: number; ceiling: number; range: { high: number };
  previousValue: number | null; previousDate: string | null;
} | null | undefined): GlycolyticHypothesis | null {
  if (!overlap || !(overlap.ceiling > 0)) return null;
  const top = Math.max(overlap.range.high, overlap.previousValue ?? 0);
  if (!(top > overlap.ceiling)) return null;
  return { sport: overlap.sport, current: overlap.current, ceiling: overlap.ceiling, modelHigh: overlap.range.high,
    observed: overlap.previousValue, observedDate: overlap.previousDate, excess: (top - overlap.ceiling) / overlap.ceiling * 100 };
}


/** Un écart classé ; `verify` signale une valeur que le Compass juge à confirmer par un test. */
export interface RankedGap { r: FactorRow; sport: FactorSport; gap: number; verify?: GlycolyticHypothesis }

/**
 * Place l'hypothèse glycolytique dans la hiérarchie, au rang que lui donne son écart, avec
 * un message « à vérifier ». Si la VLamax est déjà classée, elle est simplement annotée ;
 * sinon (valeur retenue dans la zone, mais incertitude ou observation au-dessus) elle entre
 * avec l'écart de la plus haute observation connue.
 */
export function rankWithHypothesis(states: FactorStates, hypothesis: GlycolyticHypothesis | null): RankedGap[] {
  if (!hypothesis) return states.ranked;
  const own = states.ranked.some(x => x.r.key === "vlamax" && x.sport === hypothesis.sport);
  if (own) return states.ranked.map(x => x.r.key === "vlamax" && x.sport === hypothesis.sport ? { ...x, verify: hypothesis } : x);
  const section = states.sections.find(s => s.sport === hypothesis.sport)?.rows.find(r => r.key === "vlamax");
  if (!section?.zone || section.zone.high <= 0) return states.ranked;
  const top = Math.max(hypothesis.modelHigh, hypothesis.observed ?? 0);
  const gap = (top - section.zone.high) / section.zone.high * 100;
  if (!(gap > 0.05)) return states.ranked;
  return [...states.ranked, { r: section, sport: hypothesis.sport, gap, verify: hypothesis }].sort((a, b) => b.gap - a.gap);
}
