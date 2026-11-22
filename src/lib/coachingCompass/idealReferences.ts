/**
 * Idéal de référence par facteur, objectif et ambition — AFFICHAGE SEUL.
 *
 * Chaque valeur porte son niveau de preuve :
 *  - `measured` : moyenne ± écart-type d'une cohorte publiée dont le niveau
 *    correspond à l'ambition (correspondance proposée au coach, à valider) ;
 *  - `derived`  : calculée par une règle écrite ci-dessous à partir de
 *    cohortes publiées, quand aucune cohorte ne couvre la cellule.
 * Aucune valeur n'est un percentile ni un seuil de réussite validé.
 *
 * Isolation : ce module n'est jamais importé par la prescription, le moteur de
 * limiteurs ou la génération de plan (test `prescriptionIsolation`). Les cibles
 * du moteur restent inchangées ; l'écran montre les deux quand elles diffèrent.
 *
 * Zone idéale = point ± 0,5 écart-type de la cohorte (écart-type propagé pour
 * les valeurs dérivées). C'est une largeur de lecture, pas une plage optimale.
 */
import type { AmbitionLevel } from '@/types/ambitionLevel';
import { isKnownPhysiologicalObjective, normalizeObjective } from '@/lib/physiologicalTargets';
import { objectiveDemands } from './objectiveDemands';

export type IdealFactor = 'vo2max' | 'vma' | 'ftpkg';
export type IdealSport = 'run' | 'bike';
export type IdealTier = 'measured' | 'derived';

export interface IdealReference {
  factor: IdealFactor;
  sport: IdealSport;
  unit: string;
  point: number;
  low: number;
  high: number;
  tier: IdealTier;
  evidenceIds: readonly string[];
  /** Phrase lisible par le coach : d'où vient la valeur. */
  basis: string;
  /** Ajustement au sexe et à l'âge de l'athlète, ou la raison pour laquelle il n'a pas eu lieu. */
  adjustment: string | null;
}

export const IDEAL_AMBITIONS: readonly AmbitionLevel[] = ['finisher', 'age_group', 'competitor', 'elite', 'world_class'];
const ZONE_SD = 0.5;

/** `age` : âge moyen de la cohorte ; `menShare` : part d'hommes (1 = cohorte masculine). */
type Anchor = { point: number; sd: number; age: number; menShare: number; tier: IdealTier; evidenceIds: readonly string[]; basis: string };

// ── Course à pied : VO₂max (ml/kg/min) ─────────────────────────────────────
// Échelle de niveau de performance, indépendante de la distance : un 5 000 m en
// moins de 20 min (63,2 ± 4,5, Quittmann) retombe sur la tranche 2 h 30–3 h du
// marathon (63,3 ± 7,7, Gordon). L'ambition est lue comme un niveau de chrono.
const RUN_VO2MAX: Record<AmbitionLevel, Anchor> = {
  finisher: { point: 46.5, sd: 5.2, age: 42.1, menShare: 0.29, tier: 'measured', evidenceIds: ['gordon-2017'],
    basis: 'Marathoniens récréatifs de plus de 4 h 30 (n = 17), VO₂max 46,5 ± 5,2.' },
  age_group: { point: 53.1, sd: 6.6, age: 43, menShare: 0.65, tier: 'measured', evidenceIds: ['gordon-2017'],
    basis: 'Marathoniens de 3 h 30 à 4 h 30 : 53,2 (3,5–4 h) et 53,0 (4–4,5 h).' },
  competitor: { point: 59.5, sd: 6.3, age: 41.8, menShare: 0.85, tier: 'measured', evidenceIds: ['gordon-2017', 'quittmann-2022'],
    basis: 'Marathoniens de 2 h 30 à 3 h 30 : 63,3 (2,5–3 h) et 55,7 (3–3,5 h) ; hommes à moins de 20 min au 5 000 m : 63,2 ± 4,5.' },
  elite: { point: 67, sd: 4.5, age: 30, menShare: 0.5, tier: 'derived', evidenceIds: ['gordon-2017', 'casado-2022'],
    basis: 'Entre le haut de la tranche 2 h 30–3 h (63,3) et le bas de la plage publiée pour les élites (67–85 ; marathonienne au record du monde ≈ 70).' },
  world_class: { point: 75, sd: 5, age: 30, menShare: 0.5, tier: 'derived', evidenceIds: ['gordon-2017', 'casado-2022'],
    basis: 'Plage publiée pour les coureurs élites (67–85 ml/kg/min) ; point placé dans le tiers inférieur de la plage, sans cohorte chiffrée.' },
};

// Triathlète amateur compétitif préparant un 70.3 ou un Ironman : VO₂max course
// 56,3 ± 5,56 (n = 13), soit 5,4 % sous l'échelle du coureur pur (59,5).
const TRI_RUN_FACTOR = 56.3 / 59.5;
const TRI_COMPETITOR_RUN: Anchor = { point: 56.3, sd: 5.56, age: 42, menShare: 0.54, tier: 'measured', evidenceIds: ['assis-2024'],
  basis: 'Triathlètes amateurs compétitifs préparant un 70.3 ou un Ironman (n = 13) : VO₂max sur tapis 56,3 ± 5,56.' };

// Ultra-trail, hommes : régionaux 57,3 ± 7,7 (n = 25) ; nationaux 63,4 ± 4,3 (n = 19).
const ULTRA_TRAIL: Partial<Record<AmbitionLevel, Anchor>> = {
  age_group: { point: 57.33, sd: 7.66, age: 38.8, menShare: 1, tier: 'measured', evidenceIds: ['trail-2020'],
    basis: 'Ultra-traileurs hommes de niveau régional (n = 25) : VO₂peak 57,3 ± 7,7.' },
  competitor: { point: 63.39, sd: 4.26, age: 33.5, menShare: 1, tier: 'measured', evidenceIds: ['trail-2020'],
    basis: 'Ultra-traileurs hommes de niveau national (n = 19) : VO₂peak 63,4 ± 4,3.' },
};

// ── Vélo : VO₂max (ml/kg/min) ──────────────────────────────────────────────
const BIKE_VO2MAX: Record<AmbitionLevel, Anchor> = {
  finisher: { point: 46.5, sd: 5.2, age: 42.1, menShare: 0.29, tier: 'derived', evidenceIds: ['gordon-2017'],
    basis: 'Aucune cohorte cycliste de ce niveau lue : valeur de l’échelle course du même niveau (46,5).' },
  age_group: { point: 56.2, sd: 9.6, age: 42.1, menShare: 1, tier: 'measured', evidenceIds: ['cyclists-age-2007'],
    basis: 'Cyclistes d’endurance entraînés, hommes (n = 36, 17–64 ans) : VO₂max 56,2 ± 9,6.' },
  competitor: { point: 65.35, sd: 6.6, age: 30, menShare: 1, tier: 'derived', evidenceIds: ['cyclists-age-2007', 'pro-u23-junior-2022'],
    basis: 'Milieu entre les cyclistes entraînés (56,2) et le niveau juniors compétitifs (74,5) ; aucune cohorte intermédiaire lue.' },
  elite: { point: 74.54, sd: 3.55, age: 16.4, menShare: 1, tier: 'measured', evidenceIds: ['pro-u23-junior-2022'],
    basis: 'Cyclistes juniors de compétition (n = 13) : VO₂max 74,5 ± 3,6. Correspondance à valider.' },
  world_class: { point: 82.64, sd: 3.54, age: 26.1, menShare: 1, tier: 'measured', evidenceIds: ['pro-u23-junior-2022'],
    basis: 'Cyclistes professionnels d’équipe UCI Pro-Team (n = 14) : VO₂max 82,6 ± 3,5.' },
};

// ── Règles de dérivation ───────────────────────────────────────────────────
// Coût énergétique de la course (ml/kg/km) : vVO₂max = VO₂max × 60 / coût.
//   >4,5 h : 214,3 · 3,5–4,5 h : 206 (moyenne 208,0 et 204,4) · 2,5–3,5 h : 204,7
//   (moyenne 204,2 et 205,2), tous Gordon 2017 au seuil LT2 ;
//   5 000 m < 20 min : 196,5 (Quittmann : 63,2 ml/kg/min pour 5,36 m/s).
//   Classe mondiale : 190, extrapolation sans cohorte (économie meilleure que 196,5).
const RUN_COST: Record<AmbitionLevel, { cost: number; tier: IdealTier }> = {
  finisher: { cost: 214.3, tier: 'derived' },
  age_group: { cost: 206, tier: 'derived' },
  competitor: { cost: 204.7, tier: 'derived' },
  elite: { cost: 196.5, tier: 'derived' },
  world_class: { cost: 190, tier: 'derived' },
};
const TRI_COMPETITOR_VMA = { point: 16.69, sd: 1.65, age: 42, menShare: 0.54 } as const; // Assis 2024, mesuré
// Coût énergétique implicite de la cohorte Assis (56,3 ml/kg/min pour 16,69 km/h).
const TRI_COMPETITOR_COST = 56.3 * 60 / 16.69;

// Puissance au VO₂max (W/kg) = (VO₂max − 7) / 10,8 : vérifiée contre les quatre
// cohortes lues (pros 7,00 calculé / 7,31 mesuré ; U23 6,74 / 6,94 ; juniors
// 6,25 / 6,64 ; cyclistes entraînés 4,56 / 4,4).
// Seuil = 0,84 × puissance au VO₂max : fraction du seuil LT2 mesurée à 84 % de la
// VO₂max chez les coureurs récréatifs (Gordon, toutes tranches) et RCP/PPO de
// 0,84 à 0,88 chez les cyclistes juniors, U23 et professionnels.
const POWER_PER_KG = (vo2: number) => (vo2 - 7) / 10.8;
const THRESHOLD_FRACTION = 0.84;

// ── Ajustement à l'athlète : sexe et âge ───────────────────────────────────
// Les cohortes sont masculines ou mixtes et d'âge moyen 16 à 44 ans. Un idéal non
// ajusté serait trop haut pour une femme ou pour un athlète plus âgé.
//  - Rapport femmes / hommes de la VO₂max à niveau de performance comparable :
//    course 0,877 (Quittmann : 55,4 contre 63,2 pour 22 contre 20 min au 5 000 m),
//    vélo 0,913 (cyclistes entraînés : 51,3 contre 56,2), VMA 0,896 (4,80 contre
//    5,36 m/s). Pour une cohorte mixte, on retire d'abord l'effet de sa part d'hommes.
//  - Baisse avec l'âge : 0,65 ml/kg/min par an (hommes), 0,39 (femmes), mesurée
//    chez des cyclistes d'endurance de 17 à 64 ans (étude transversale), appliquée
//    par extension à la course. Elle ne joue qu'au-delà de 35 ans, de part et
//    d'autre de l'âge de la cohorte de référence (plancher 35 ans).
const SEX_RATIO = { run: 0.877, bike: 0.913, vma: 0.896 } as const;
const AGE_SLOPE = { M: 0.65, F: 0.39 } as const;
const AGE_FLOOR = 35;
const NO_PROFILE = 'Âge ou sexe non renseigné : idéal du groupe de référence, non ajusté à l’athlète.';

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const fr = (n: number) => String(n).replace('.', ',');

interface Who { age?: number | null; sex?: string | null }
function personalise(point: number, sd: number, a: Pick<Anchor, 'age' | 'menShare'>, ratio: number,
  slope: { M: number; F: number }, who: Who, unit: string) {
  const sex = who.sex === 'M' || who.sex === 'F' ? who.sex : null;
  const age = who.age != null && Number.isFinite(who.age) && who.age >= 18 && who.age <= 100 ? who.age : null;
  if (!sex || age == null) return { point, sd, adjusted: false, note: NO_PROFILE };
  const denominator = a.menShare + (1 - a.menShare) * ratio;
  const multiplier = sex === 'M' ? 1 / denominator : ratio / denominator;
  const reference = Math.max(a.age, AGE_FLOOR);
  const shift = -slope[sex] * (Math.max(age, AGE_FLOOR) - reference);
  const adjusted = Math.abs(multiplier - 1) > 0.001 || Math.abs(shift) > 0.001;
  return {
    point: round(point * multiplier + shift, 2), sd: sd * multiplier, adjusted,
    note: adjusted ? `Ajusté à l’athlète (${sex === 'F' ? 'femme' : 'homme'}, ${age} ans) : ×${fr(round(multiplier, 2))} pour le sexe, ${shift >= 0 ? '+' : '−'}${fr(round(Math.abs(shift), 1))} ${unit} pour l’âge par rapport à un groupe de ${fr(round(reference, 0))} ans (pente de ${fr(slope[sex])} par an, mesurée chez des cyclistes d’endurance).` : null,
  };
}

function zone(point: number, sd: number) {
  return { low: round(point - ZONE_SD * sd, 2), high: round(point + ZONE_SD * sd, 2) };
}

function canonical(objective: string) {
  if (!isKnownPhysiologicalObjective(objective)) return null;
  const key = normalizeObjective(objective);
  // `normalizeObjective` renomme certains objectifs (10K → 10km, TrailUltra → Ultra) ;
  // les exigences de l'épreuve sont indexées par la clé de l'application.
  const kind = objectiveDemands(objective)?.kind ?? objectiveDemands(key)?.kind
    ?? (key === '10km' ? 'road' : key === 'Ultra' ? 'trail' : undefined);
  return kind && kind !== 'beginner' ? { key, kind } : null;
}

function runVo2Anchor(key: string, kind: string, ambition: AmbitionLevel): Anchor {
  if (key === 'Ultra' && ULTRA_TRAIL[ambition]) return ULTRA_TRAIL[ambition]!;
  const road = RUN_VO2MAX[ambition];
  if (kind !== 'tri') return road;
  if (ambition === 'competitor') return TRI_COMPETITOR_RUN;
  return {
    point: round(road.point * TRI_RUN_FACTOR, 1), sd: road.sd, age: road.age, menShare: road.menShare, tier: 'derived',
    evidenceIds: [...new Set([...road.evidenceIds, 'assis-2024'])],
    basis: `Échelle course du même niveau (${road.point}) réduite de 5,4 % : rapport 56,3 / 59,5 entre triathlètes compétitifs et coureurs du même niveau.`,
  };
}

/** Idéal d'un facteur pour un objectif, une ambition et une discipline ; `null` hors référentiel. */
export function idealReference(
  factor: IdealFactor,
  ctx: { objective: string; ambition: string; sport: IdealSport; age?: number | null; sex?: string | null },
): IdealReference | null {
  const obj = canonical(ctx.objective);
  const ambition = ctx.ambition as AmbitionLevel;
  if (!obj || !IDEAL_AMBITIONS.includes(ambition)) return null;
  const isTri = obj.kind === 'tri';
  // Une course pure n'a pas de volet vélo.
  if (ctx.sport === 'bike' && !isTri) return null;
  const who: Who = { age: ctx.age, sex: ctx.sex };
  const personalEvidence = (sport: IdealSport) => sport === 'run' ? ['quittmann-2022', 'cyclists-age-2007'] : ['cyclists-age-2007'];

  const build = (base: Omit<IdealReference, 'point' | 'low' | 'high' | 'tier' | 'adjustment' | 'evidenceIds'> & { evidenceIds: readonly string[]; tier: IdealTier },
    p: ReturnType<typeof personalise>): IdealReference => ({
    ...base, point: p.point, ...zone(p.point, p.sd),
    tier: p.adjusted ? 'derived' : base.tier,
    evidenceIds: p.adjusted ? [...new Set([...base.evidenceIds, ...personalEvidence(base.sport)])] : base.evidenceIds,
    adjustment: p.note,
  });

  if (factor === 'vo2max') {
    const a = ctx.sport === 'run' ? runVo2Anchor(obj.key, obj.kind, ambition) : BIKE_VO2MAX[ambition];
    const p = personalise(a.point, a.sd, a, ctx.sport === 'run' ? SEX_RATIO.run : SEX_RATIO.bike, AGE_SLOPE, who, 'ml/kg/min');
    return build({ factor, sport: ctx.sport, unit: 'ml/kg/min', tier: a.tier, evidenceIds: a.evidenceIds, basis: a.basis }, p);
  }
  if (factor === 'vma') {
    if (ctx.sport !== 'run') return null;
    if (isTri && ambition === 'competitor') {
      const slopeVma = { M: AGE_SLOPE.M * 60 / TRI_COMPETITOR_COST, F: AGE_SLOPE.F * 60 / TRI_COMPETITOR_COST };
      const p = personalise(TRI_COMPETITOR_VMA.point, TRI_COMPETITOR_VMA.sd, TRI_COMPETITOR_VMA, SEX_RATIO.vma, slopeVma, who, 'km/h');
      return build({ factor, sport: 'run', unit: 'km/h', tier: 'measured', evidenceIds: ['assis-2024'],
        basis: 'Triathlètes amateurs compétitifs (n = 13) : vitesse maximale aérobie sur tapis 16,69 ± 1,65 km/h.' }, p);
    }
    const vo2 = runVo2Anchor(obj.key, obj.kind, ambition);
    const adjusted = personalise(vo2.point, vo2.sd, vo2, SEX_RATIO.run, AGE_SLOPE, who, 'ml/kg/min');
    const { cost } = RUN_COST[ambition];
    const point = round(adjusted.point * 60 / cost, 1);
    return build({ factor, sport: 'run', unit: 'km/h', tier: 'derived',
      evidenceIds: [...new Set([...vo2.evidenceIds, 'gordon-2017', 'quittmann-2022'])],
      basis: `VO₂max de référence (${vo2.point}) × 60 / coût énergétique de ${cost} ml/kg/km, mesuré à ce niveau chez des coureurs.` },
    { point, sd: adjusted.sd * 60 / cost, adjusted: adjusted.adjusted, note: adjusted.note });
  }
  if (ctx.sport !== 'bike') return null;
  const vo2 = BIKE_VO2MAX[ambition];
  const adjusted = personalise(vo2.point, vo2.sd, vo2, SEX_RATIO.bike, AGE_SLOPE, who, 'ml/kg/min');
  const point = round(THRESHOLD_FRACTION * POWER_PER_KG(adjusted.point), 2);
  return build({ factor, sport: 'bike', unit: 'W/kg', tier: 'derived',
    evidenceIds: [...new Set([...vo2.evidenceIds, 'gordon-2017', 'pro-u23-junior-2022'])],
    basis: `0,84 × puissance au VO₂max (${round(POWER_PER_KG(vo2.point), 2)} W/kg pour ${vo2.point} ml/kg/min) ; fraction mesurée chez des coureurs et des cyclistes.` },
  { point, sd: THRESHOLD_FRACTION * adjusted.sd / 10.8, adjusted: adjusted.adjusted, note: adjusted.note });
}

export type IdealState = 'below' | 'inside' | 'above';
export function idealState(value: number, ref: Pick<IdealReference, 'low' | 'high'>): IdealState {
  return value < ref.low ? 'below' : value > ref.high ? 'above' : 'inside';
}
