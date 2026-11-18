import type { AmbitionLevel } from '@/types/ambitionLevel';
import { AMBITION_DEFINITIONS } from '@/types/ambitionLevel';

/** Presentation only: never a prescription, readiness threshold or measured VMA. */
export interface VmaReference {
  low: number;
  high: number;
  context: string;
  method: string;
  limitation: string;
  sources: Array<{ title: string; url: string; detail: string }>;
}

/** Coaching signal against this scenario, not a causal or clinical diagnosis. */
export function assessVmaReference(value: number | null, reference: VmaReference | null) {
  const valid = value != null && Number.isFinite(value) && value > 0;
  if (!valid || !reference) return { status: 'unavailable' as const, gapKmh: null, label: 'Comparaison indisponible' };
  if (value < reference.low) return {
    status: 'below' as const,
    gapKmh: Math.round((reference.low - value) * 10) / 10,
    label: 'VMA potentiellement limitante',
  };
  return {
    status: value > reference.high ? 'above' as const : 'inside' as const,
    gapKmh: 0,
    label: 'Pas de déficit VMA apparent',
  };
}

/** Local geometry shared by the radar overlay and mini gauge; never mutates axes. */
export function vmaReferencePosition(value: number | null, reference: VmaReference | null): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0 || !reference) return null;
  return Math.max(0, Math.min(100, value / reference.low * 100));
}

// Gordon et al. 2017, table 1: VO₂max and gross oxygen cost at LT2.
// These are paired group means, not individually measured vVO₂max.
const marathonGroups = {
  finisher: { time: '> 4 h 30', vo2: 46.5, cost: 214.3, costSd: 13.7 },
  age_group: { time: '4 h–4 h 30', vo2: 53.0, cost: 204.4, costSd: 7.7 },
  competitor: { time: '3 h 30–4 h', vo2: 53.2, cost: 208.0, costSd: 14.0 },
  elite: { time: '3 h–3 h 30', vo2: 55.7, cost: 205.2, costSd: 10.0 },
  world_class: { time: '2 h 30–3 h', vo2: 63.3, cost: 204.2, costSd: 17.3 },
} satisfies Record<AmbitionLevel, { time: string; vo2: number; cost: number; costSd: number }>;

export function getVmaReference(objective: string, ambition: string): VmaReference | null {
  // No flat-running comparison for cycling, trail, or unknown formats.
  const tri = /^(im|ironman|703|70[.,]3|half|half[- ]?ironman|triathlon.*)$/i.test(objective.trim());
  const running = /^(marathon|semi(?:[- ]marathon)?|5k|5\s?km|10k|10\s?km)$/i.test(objective.trim());
  if (!tri && !running) return null;
  if (!Object.prototype.hasOwnProperty.call(marathonGroups, ambition)) return null;
  const level = ambition as AmbitionLevel;
  const group = marathonGroups[level];
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    low: round(60 * group.vo2 / (group.cost + group.costSd)),
    high: round(60 * group.vo2 / (group.cost - group.costSd)),
    context: `${objective} · ${AMBITION_DEFINITIONS[level].label} · scénario de capacité marathon frais ${group.time}`,
    method: 'VMA ≈ 60 × VO₂max / coût énergétique. Fourchette de sensibilité au coût moyen ± un écart-type, VO₂max moyenne fixe ; pas un intervalle optimal ni un intervalle de confiance.',
    limitation: `${tri ? 'La référence porte sur une capacité de course à pied à frais, pas sur le split après vélo ni sur le classement triathlon. ' : 'La référence marathon frais est un scénario de moteur aérobie, pas une prédiction du chrono de cette épreuve. '}Le choix du groupe par ambition est une correspondance de coaching TFCL, non une norme scientifique ou un percentile validé. Le coût sous-maximal est extrapolé à VO₂max ; protocole VMA, seuil et endurance doivent être confrontés au bilan individuel.`,
    sources: [
      { title: 'Gordon et al. · 2017', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5703178/', detail: `97 marathoniens, 63 hommes et 34 femmes ; groupe ${group.time}, tableau 1 : VO₂max ${group.vo2} ml/kg/min, coût au LT2 ${group.cost} ± ${group.costSd} ml/kg/km. La VMA n’est pas directement publiée dans ce tableau.` },
      { title: 'Billat & Koralsztein · 1996', url: 'https://pubmed.ncbi.nlm.nih.gov/8857705/', detail: 'La vitesse à VO₂max dépend de la consommation maximale et de l’économie ; les protocoles ne sont pas interchangeables.' },
      { title: 'Statistiques de résultats · RunRepeat', url: 'https://runrepeat.com/how-do-you-masure-up-the-runners-percentile-calculator', detail: '35 millions de résultats, 28 000 épreuves, 20 ans ; distributions de chronos, pas mesures VMA. Aucune conversion automatique des percentiles globaux en catégories d’âge TFCL.' },
      ...(tri ? [{ title: 'Assis et al. · 2024', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10950087/', detail: '13 triathlètes amateurs compétitifs préparant 70.3/IM : MAS sur tapis 16,69 ± 1,65 km/h à la première évaluation. Contexte seulement : ni cible par ambition ni bande optimale.' }] : []),
    ],
  };
}