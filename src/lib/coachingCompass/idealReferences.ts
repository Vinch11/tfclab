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
}

export const IDEAL_AMBITIONS: readonly AmbitionLevel[] = ['finisher', 'age_group', 'competitor', 'elite', 'world_class'];
const ZONE_SD = 0.5;

type Anchor = { point: number; sd: number; tier: IdealTier; evidenceIds: readonly string[]; basis: string };

// ── Course à pied : VO₂max (ml/kg/min) ─────────────────────────────────────
// Échelle de niveau de performance, indépendante de la distance : un 5 000 m en
// moins de 20 min (63,2 ± 4,5, Quittmann) retombe sur la tranche 2 h 30–3 h du
// marathon (63,3 ± 7,7, Gordon). L'ambition est lue comme un niveau de chrono.
const RUN_VO2MAX: Record<AmbitionLevel, Anchor> = {
  finisher: { point: 46.5, sd: 5.2, tier: 'measured', evidenceIds: ['gordon-2017'],
    basis: 'Marathoniens récréatifs de plus de 4 h 30 (n = 17), VO₂max 46,5 ± 5,2.' },
  age_group: { point: 53.1, sd: 6.6, tier: 'measured', evidenceIds: ['gordon-2017'],
    basis: 'Marathoniens de 3 h 30 à 4 h 30 : 53,2 (3,5–4 h) et 53,0 (4–4,5 h).' },
  competitor: { point: 59.5, sd: 6.3, tier: 'measured', evidenceIds: ['gordon-2017', 'quittmann-2022'],
    basis: 'Marathoniens de 2 h 30 à 3 h 30 : 63,3 (2,5–3 h) et 55,7 (3–3,5 h) ; hommes à moins de 20 min au 5 000 m : 63,2 ± 4,5.' },
  elite: { point: 67, sd: 4.5, tier: 'derived', evidenceIds: ['gordon-2017', 'casado-2022'],
    basis: 'Entre le haut de la tranche 2 h 30–3 h (63,3) et le bas de la plage publiée pour les élites (67–85 ; marathonienne au record du monde ≈ 70).' },
  world_class: { point: 75, sd: 5, tier: 'derived', evidenceIds: ['gordon-2017', 'casado-2022'],
    basis: 'Plage publiée pour les coureurs élites (67–85 ml/kg/min) ; point placé dans le tiers inférieur de la plage, sans cohorte chiffrée.' },
};

// Triathlète amateur compétitif préparant un 70.3 ou un Ironman : VO₂max course
// 56,3 ± 5,56 (n = 13), soit 5,4 % sous l'échelle du coureur pur (59,5).
const TRI_RUN_FACTOR = 56.3 / 59.5;
const TRI_COMPETITOR_RUN: Anchor = { point: 56.3, sd: 5.56, tier: 'measured', evidenceIds: ['assis-2024'],
  basis: 'Triathlètes amateurs compétitifs préparant un 70.3 ou un Ironman (n = 13) : VO₂max sur tapis 56,3 ± 5,56.' };

// Ultra-trail, hommes : régionaux 57,3 ± 7,7 (n = 25) ; nationaux 63,4 ± 4,3 (n = 19).
const ULTRA_TRAIL: Partial<Record<AmbitionLevel, Anchor>> = {
  age_group: { point: 57.33, sd: 7.66, tier: 'measured', evidenceIds: ['trail-2020'],
    basis: 'Ultra-traileurs hommes de niveau régional (n = 25) : VO₂peak 57,3 ± 7,7.' },
  competitor: { point: 63.39, sd: 4.26, tier: 'measured', evidenceIds: ['trail-2020'],
    basis: 'Ultra-traileurs hommes de niveau national (n = 19) : VO₂peak 63,4 ± 4,3.' },
};

// ── Vélo : VO₂max (ml/kg/min) ──────────────────────────────────────────────
const BIKE_VO2MAX: Record<AmbitionLevel, Anchor> = {
  finisher: { point: 46.5, sd: 5.2, tier: 'derived', evidenceIds: ['gordon-2017'],
    basis: 'Aucune cohorte cycliste de ce niveau lue : valeur de l’échelle course du même niveau (46,5).' },
  age_group: { point: 56.2, sd: 9.6, tier: 'measured', evidenceIds: ['cyclists-age-2007'],
    basis: 'Cyclistes d’endurance entraînés, hommes (n = 36, 17–64 ans) : VO₂max 56,2 ± 9,6.' },
  competitor: { point: 65.35, sd: 6.6, tier: 'derived', evidenceIds: ['cyclists-age-2007', 'pro-u23-junior-2022'],
    basis: 'Milieu entre les cyclistes entraînés (56,2) et le niveau juniors compétitifs (74,5) ; aucune cohorte intermédiaire lue.' },
  elite: { point: 74.54, sd: 3.55, tier: 'measured', evidenceIds: ['pro-u23-junior-2022'],
    basis: 'Cyclistes juniors de compétition (n = 13) : VO₂max 74,5 ± 3,6. Correspondance à valider.' },
  world_class: { point: 82.64, sd: 3.54, tier: 'measured', evidenceIds: ['pro-u23-junior-2022'],
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
const TRI_COMPETITOR_VMA = { point: 16.69, sd: 1.65 } as const; // Assis 2024, mesuré

// Puissance au VO₂max (W/kg) = (VO₂max − 7) / 10,8 : vérifiée contre les quatre
// cohortes lues (pros 7,00 calculé / 7,31 mesuré ; U23 6,74 / 6,94 ; juniors
// 6,25 / 6,64 ; cyclistes entraînés 4,56 / 4,4).
// Seuil = 0,84 × puissance au VO₂max : fraction du seuil LT2 mesurée à 84 % de la
// VO₂max chez les coureurs récréatifs (Gordon, toutes tranches) et RCP/PPO de
// 0,84 à 0,88 chez les cyclistes juniors, U23 et professionnels.
const POWER_PER_KG = (vo2: number) => (vo2 - 7) / 10.8;
const THRESHOLD_FRACTION = 0.84;

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

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
    point: round(road.point * TRI_RUN_FACTOR, 1), sd: road.sd, tier: 'derived',
    evidenceIds: [...new Set([...road.evidenceIds, 'assis-2024'])],
    basis: `Échelle course du même niveau (${road.point}) réduite de 5,4 % : rapport 56,3 / 59,5 entre triathlètes compétitifs et coureurs du même niveau.`,
  };
}

/** Idéal d'un facteur pour un objectif, une ambition et une discipline ; `null` hors référentiel. */
export function idealReference(
  factor: IdealFactor,
  ctx: { objective: string; ambition: string; sport: IdealSport },
): IdealReference | null {
  const obj = canonical(ctx.objective);
  const ambition = ctx.ambition as AmbitionLevel;
  if (!obj || !IDEAL_AMBITIONS.includes(ambition)) return null;
  const isTri = obj.kind === 'tri';
  // Une course pure n'a pas de volet vélo.
  if (ctx.sport === 'bike' && !isTri) return null;

  if (factor === 'vo2max') {
    const a = ctx.sport === 'run' ? runVo2Anchor(obj.key, obj.kind, ambition) : BIKE_VO2MAX[ambition];
    return { factor, sport: ctx.sport, unit: 'ml/kg/min', point: a.point, ...zone(a.point, a.sd),
      tier: a.tier, evidenceIds: a.evidenceIds, basis: a.basis };
  }
  if (factor === 'vma') {
    if (ctx.sport !== 'run') return null;
    if (isTri && ambition === 'competitor') {
      return { factor, sport: 'run', unit: 'km/h', point: TRI_COMPETITOR_VMA.point, ...zone(TRI_COMPETITOR_VMA.point, TRI_COMPETITOR_VMA.sd),
        tier: 'measured', evidenceIds: ['assis-2024'], basis: 'Triathlètes amateurs compétitifs (n = 13) : vitesse maximale aérobie sur tapis 16,69 ± 1,65 km/h.' };
    }
    const vo2 = runVo2Anchor(obj.key, obj.kind, ambition);
    const { cost } = RUN_COST[ambition];
    const point = round(vo2.point * 60 / cost, 1);
    const sd = vo2.sd * 60 / cost;
    return { factor, sport: 'run', unit: 'km/h', point, ...zone(point, sd), tier: 'derived',
      evidenceIds: [...new Set([...vo2.evidenceIds, 'gordon-2017', 'quittmann-2022'])],
      basis: `VO₂max de référence (${vo2.point}) × 60 / coût énergétique de ${cost} ml/kg/km, mesuré à ce niveau chez des coureurs.` };
  }
  if (ctx.sport !== 'bike') return null;
  const vo2 = BIKE_VO2MAX[ambition];
  const point = round(THRESHOLD_FRACTION * POWER_PER_KG(vo2.point), 2);
  const sd = THRESHOLD_FRACTION * vo2.sd / 10.8;
  return { factor, sport: 'bike', unit: 'W/kg', point, ...zone(point, sd), tier: 'derived',
    evidenceIds: [...new Set([...vo2.evidenceIds, 'gordon-2017', 'pro-u23-junior-2022'])],
    basis: `0,84 × puissance au VO₂max (${round(POWER_PER_KG(vo2.point), 2)} W/kg pour ${vo2.point} ml/kg/min) ; fraction mesurée chez des coureurs et des cyclistes.` };
}

export type IdealState = 'below' | 'inside' | 'above';
export function idealState(value: number, ref: Pick<IdealReference, 'low' | 'high'>): IdealState {
  return value < ref.low ? 'below' : value > ref.high ? 'above' : 'inside';
}
