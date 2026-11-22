/** Display-only goal comparison. No readiness percentage or prescription. */
export interface PerformanceGoal { minutes: number; runMinutes?: number; swimMinutes?: number; bikeMinutes?: number; bikeWatts?: number; distanceKm?: number; elevationM?: number }
export interface PublishedGroup {
  label: string; from: number; to: number; vo2: number; vo2Sd: number;
  lt2?: number; lt2Sd?: number; cost?: number; costSd?: number;
}
/** Gordon 2017, Table 1; subgroup n not reported here. Mixed-sex cohort, NOT age/sex norms. */
export const MARATHON_GROUPS: readonly PublishedGroup[] = [
  { label: '2 h 30–3 h', from: 150, to: 180, vo2: 63.3, vo2Sd: 7.7, lt2: 15.5, lt2Sd: .7, cost: 204.2, costSd: 17.3 },
  { label: '3 h–3 h 30', from: 180, to: 210, vo2: 55.7, vo2Sd: 4.8, lt2: 13.8, lt2Sd: .7, cost: 205.2, costSd: 10 },
  { label: '3 h 30–4 h', from: 210, to: 240, vo2: 53.2, vo2Sd: 4.6, lt2: 13.1, lt2Sd: 1.6, cost: 208, costSd: 14 },
  { label: '4 h–4 h 30', from: 240, to: 270, vo2: 53, vo2Sd: 8.6, lt2: 12.7, lt2Sd: 2.1, cost: 204.4, costSd: 7.7 },
  { label: '>4 h 30', from: 270, to: Infinity, vo2: 46.5, vo2Sd: 5.2, lt2: 10.9, lt2Sd: 1.2, cost: 214.3, costSd: 13.7 },
];
/** Nikolaidis & Knechtle 2023, Table 1. Only men; intervals exactly as published. */
export const HALF_GROUPS: readonly PublishedGroup[] = [
  { label: '73–92 min (n=27)', from: 73, to: 92, vo2: 54.5, vo2Sd: 7.5 },
  { label: '93–99 min (n=27)', from: 93, to: 99, vo2: 51.9, vo2Sd: 5.8 },
  { label: '100–107 min (n=27)', from: 100, to: 107, vo2: 48.1, vo2Sd: 7 },
  { label: '108–117 min (n=27)', from: 108, to: 117, vo2: 45.7, vo2Sd: 6.3 },
  { label: '118–160 min (n=26)', from: 118, to: 160, vo2: 41.3, vo2Sd: 7 },
];
export const PERFORMANCE_SOURCES = [
  { name: 'Barbosa et al., 2023', url: 'https://www.mdpi.com/2227-9032/11/4/622', population: '40 triathlètes olympiques : 20 femmes et 20 hommes.', protocol: 'Test maximal sur tapis avec échanges gazeux et résultats en triathlon olympique ; tableaux 1 et 2.', limitation: 'Cohortes descriptives par sexe, sans stratification par ambition. Aucun transfert vers un podium Ironman.' },
  { name: 'Biomechanical Adaptations and Performance Indicators in Short Trail Running, 2019', url: 'https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.00506/full', population: '17 coureurs entraînés (13 hommes, 4 femmes).', protocol: 'Tests en laboratoire et contre-la-montre sur trail ; étude des montées et descentes.', limitation: 'Le terrain et les capacités spécifiques comptent ; aucune table universelle de VMA exigée par chrono trail.' },
  { name: 'Gordon et al., 2017', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5703178/', population: '97 marathoniens (63 hommes, 34 femmes), 42,4 ± 9,9 ans.', protocol: 'Test incrémental sur tapis : échanges gazeux, lactate et coût de course au LT2.', limitation: 'Groupes par chrono, sexes regroupés ; aucune norme par catégorie d’âge. Moyenne ± écart-type, pas une plage optimale.' },
  { name: 'Assis et al., 2024', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10950087/', population: '13 triathlètes (7 hommes, 6 femmes), 26–60 ans ; 7 préparant un 70.3, 6 un Ironman.', protocol: 'Tapis à 1 %, +1 km/h/min : VO₂max initial 56,3 ± 5,56 ml/kg/min ; vitesse aérobie maximale 16,69 ± 1,65 km/h.', limitation: 'Mesures de course à pied, sans groupes par chrono ni podium. Aucun seuil Ironman compétiteur ne peut en être déduit.' },
  { name: 'Hunter & Muniz-Pumares, 2025', url: 'https://onlinelibrary.wiley.com/doi/10.1002/ejsc.70073', population: '18 marathoniens (11 hommes, 7 femmes), 41 ± 12 ans ; chrono 3 h 17 ± 32 min.', protocol: 'Comparaison avant/après 90 minutes : vitesse au seuil lactique 12,8 ± 2,0 puis 12,1 ± 2,2 km/h.', limitation: 'La dégradation après fatigue apporte une information distincte du profil frais ; pas de seuil individuel universel.' },
  { name: 'Nikolaidis & Knechtle, 2023', url: 'https://www.excli.de/vol22/2023-6198/2023-6198.htm', population: '134 hommes, 44,2 ± 8,7 ans, ayant déjà terminé un marathon ; meilleur semi-marathon 104,6 ± 16,2 min.', protocol: 'Test incrémental maximal sur tapis avec analyse des gaz. Tableau 1 : cinq groupes selon leur meilleur chrono au semi.', limitation: 'Aucune extrapolation aux femmes ou aux primo-finishers ; ni seuil requis, ni prescription de volume ou de poids.' },
] as const;

export function goalDistance(objective: string): { km: number; tri: boolean } | null {
  const key = objective.trim().toLowerCase().replace(/[\s_-]/g, '');
  if (['im', 'ironman'].includes(key)) return { km: 42.195, tri: true };
  if (['703', '70.3', '70,3', 'half', 'halfironman'].includes(key)) return { km: 21.0975, tri: true };
  if (key === 'sprint') return { km: 5, tri: true };
  if (['olympic', 'olympique'].includes(key)) return { km: 10, tri: true };
  if (key === 'marathon') return { km: 42.195, tri: false };
  if (['semi', 'semimarathon'].includes(key)) return { km: 21.0975, tri: false };
  if (['5k', '5km'].includes(key)) return { km: 5, tri: false };
  if (['10k', '10km'].includes(key)) return { km: 10, tri: false };
  return null;
}
export function positive(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
export function readPerformanceGoal(value: unknown): PerformanceGoal | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (!positive(v.minutes) || v.minutes > 10080) return null;
  if (v.runMinutes != null && (!positive(v.runMinutes) || v.runMinutes >= v.minutes)) return null;
  const result: PerformanceGoal = { minutes: v.minutes };
  for (const key of ['runMinutes', 'swimMinutes', 'bikeMinutes', 'bikeWatts', 'distanceKm'] as const) {
    if (v[key] != null) { if (!positive(v[key])) return null; result[key] = v[key]; }
  }
  if (v.elevationM != null) { if (typeof v.elevationM !== 'number' || !Number.isFinite(v.elevationM) || v.elevationM < 0) return null; result.elevationM = v.elevationM; }
  const splitSum = (result.runMinutes ?? 0) + (result.swimMinutes ?? 0) + (result.bikeMinutes ?? 0);
  if (splitSum > result.minutes) return null;
  return result;
}
export interface ComparisonInput {
  objectif: string; vma: number | null; paceThresholdSecPerKm: number | null;
  performanceObservation?: { seconds: number; date: string | null } | null;
  vo2max: number | null; athleteAge?: number | null; athleteSex?: string | null;
}
export function publishedRunningGroup(input: ComparisonInput, minutes: number | undefined) {
  const distance = goalDistance(input.objectif);
  // No transfer from fresh marathon groups to an Ironman split or another distance.
  const adult = positive(input.athleteAge) && input.athleteAge >= 18;
  const cohort = adult && distance && !distance.tri && positive(minutes)
    ? distance.km === 42.195 ? MARATHON_GROUPS.find(g => minutes >= g.from && minutes < g.to) ?? null
      : distance.km === 21.0975 && input.athleteSex === 'M' ? HALF_GROUPS.find(g => minutes >= g.from && minutes <= g.to) ?? null : null
    : null;
  const cohortSource = cohort ? (distance?.km === 42.195 ? 'Gordon et al., 2017' : 'Nikolaidis & Knechtle, 2023') : null;
  return { cohort, cohortSource };
}

export function comparePerformance(input: ComparisonInput, goal: PerformanceGoal | null) {
  const distance = goalDistance(input.objectif);
  const validGoal = readPerformanceGoal(goal);
  const minutes = distance?.tri ? validGoal?.runMinutes : validGoal?.minutes;
  const speed = distance && positive(minutes) ? distance.km * 60 / minutes : null;
  const { cohort, cohortSource } = publishedRunningGroup(input, minutes);
  const threshold = positive(input.paceThresholdSecPerKm) ? 3600 / input.paceThresholdSecPerKm : null;
  const vma = positive(input.vma) ? input.vma : null;
  const warnings: string[] = [];
  if (speed && vma && speed >= vma) warnings.push('L’allure visée atteint ou dépasse la VMA renseignée : vérifier le chrono, le test et le plafond aérobie.');
  if (speed && threshold && distance && distance.km >= 21 && speed >= threshold) warnings.push('L’allure visée atteint ou dépasse le seuil renseigné : écart à confirmer avec un test récent et son protocole.');
  if (vma && threshold && threshold > vma) warnings.push('Le seuil dépasse la VMA : données ou protocoles incohérents, diagnostic à suspendre.');
  return {
    distance, speed, cohort, cohortSource, warnings,
    pace: speed ? 3600 / speed : null,
    vmaFraction: speed && vma ? speed / vma : null,
    thresholdGap: speed && threshold ? speed - threshold : null,
    vo2Difference: cohort && positive(input.vo2max) ? input.vo2max - cohort.vo2 : null,
    // Oxygen demand sensitivity, NOT required VO2max: utilisation fraction is unknown.
    oxygenDemand: cohort && positive(cohort.cost) && positive(cohort.costSd) && speed ? [(cohort.cost - cohort.costSd) * speed / 60, (cohort.cost + cohort.costSd) * speed / 60] : null,
    category: positive(input.athleteAge) ? `${Math.floor(input.athleteAge / 5) * 5}–${Math.floor(input.athleteAge / 5) * 5 + 4} ans` : 'âge non renseigné',
  };
}

/** Stored same-distance performances only; never interpret a fresh marathon as an IM split. */
export function storedPerformance(objective: string, snapshot: object): { seconds: number; date: string | null } | null {
  const distance = goalDistance(objective);
  if (!distance || distance.tri) return null;
  const prefix = ({ 5: 'time_5k', 10: 'time_10k', 21.0975: 'time_half', 42.195: 'time_marathon' } as Record<number, string>)[distance.km];
  const fields = snapshot as Record<string, unknown>;
  const seconds = fields[`${prefix}_sec`];
  const date = fields[`${prefix}_date`];
  return positive(seconds) ? { seconds, date: typeof date === 'string' ? date : null } : null;
}

export function comparisonGoals(refs: unknown): Record<string, unknown> {
  if (!refs || typeof refs !== 'object') return {};
  const value = (refs as Record<string, unknown>).compassPerformance;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
