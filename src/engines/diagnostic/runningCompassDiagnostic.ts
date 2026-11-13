import type { RadarAxis } from '@/lib/coachingCompass/types';
import { getTTETargetByAmbition, getVLamaxRange, getVmaTargetByAmbition } from '@/lib/physiologicalTargets';
import { getPerformanceAgeFactor, getVo2maxTarget } from '@/lib/v2/unifiedLimiterDetection';
import type { AmbitionLevel } from '@/types/ambitionLevel';

/** No cycling fields, load-derived TTE, or plan policy can enter this diagnostic. */
export interface RunningCompassDiagnosticInput {
  objectif: string;
  ambition: AmbitionLevel;
  age: number | null;
  vma: number | null;
  vo2max: number | null;
  vo2Source: string;
  paceThresholdSecPerKm: number | null;
  vlamax: { value: number | null; source: string } | null;
  tte: { tte_min: number; source: string } | null;
  economy: number | null;
  drift: number | null;
}

export interface RunningCompassDiagnostic {
  axes: RadarAxis[];
  priorities: Array<{ key: string; label: string; gapPercent: number; explanation: string; lever: string; provisional: boolean }>;
  observations: string[];
  limitations: string[];
  summary: string;
}

const positive = (value: number | null | undefined) => value != null && Number.isFinite(value) && value > 0 ? value : null;
const supportedTte = new Set(['observed', 'records', 'test_labo', 'test_terrain', 'test']);
const documented = (source: string) => source === 'test_labo' || source === 'observed';

export function computeRunningCompassDiagnostic(input: RunningCompassDiagnosticInput): RunningCompassDiagnostic {
  const vmaBase = getVmaTargetByAmbition(input.objectif, input.ambition);
  const vmaTarget = vmaBase ? Math.round(vmaBase * getPerformanceAgeFactor(input.age) * 100) / 100 : null;
  const tteTarget = getTTETargetByAmbition(input.objectif, input.ambition, input.age);
  const vlaTarget = getVLamaxRange(input.objectif, input.ambition, 'run').optimal;
  const tteValue = input.tte && supportedTte.has(input.tte.source) ? positive(input.tte.tte_min) : null;
  const make = (key: string, label: string, value: number | null, target: number | null, unit: string, source: string): RadarAxis => {
    const ratio = value != null && target != null && target > 0 ? value / target : null;
    const score = ratio == null ? 0 : Math.round(Math.max(0, Math.min(100, key === 'vlamax' ? 100 * (2 - ratio) : 100 * ratio)));
    return { key, label, shortLabel: key === 'vo2max' ? 'VO₂ bilan' : key === 'vlamax' ? 'VLamax' : key.toUpperCase(), value, target, unit, source: value == null ? 'unknown' : source, score, color: 'hsl(var(--primary))', icon: key === 'tte' ? '⏱️' : '🏃' };
  };
  const axes = [
    make('vo2max', 'VO₂max · modalité du test à préciser', positive(input.vo2max), getVo2maxTarget(input.objectif, input.ambition, input.age), 'ml/kg/min', input.vo2Source),
    make('vlamax', 'VLamax course', positive(input.vlamax?.value), vlaTarget, 'mmol/L/s', input.vlamax?.source ?? 'unknown'),
    make('vma', 'Vitesse maximale aérobie course', positive(input.vma), vmaTarget, 'km/h', 'snapshot'),
    make('tte', 'Endurance au seuil course — TTE', tteValue, tteTarget, 'min', input.tte?.source ?? 'unknown'),
  ];
  const details: Record<string, { explanation: string; lever: string }> = {
    vo2max: { explanation: 'Le moteur aérobie course reste sous sa cible interne. VO₂max et VMA partagent un stimulus aérobie : ce ne sont pas deux doses de travail à additionner.', lever: 'Développer le moteur aérobie, avec récupération adaptée.' },
    vma: { explanation: 'La réserve de vitesse aérobie est inférieure à la cible course disponible ; cela ne détermine pas seul le chrono de compétition.', lever: 'Développer la vitesse aérobie sans doubler le travail VO₂max.' },
    vlamax: { explanation: 'Le repère glycolytique course dépasse la cible interne de cette épreuve ; une estimation doit être confrontée aux tests course avant prescription.', lever: 'Consolider l’endurance aérobie et le travail sous-seuil course.' },
    tte: { explanation: 'La durée tenue au seuil course est sous la cible interne. Un arrêt volontaire indique seulement un minimum ; cet écart ne prouve pas une perte de performance après effort prolongé.', lever: 'Consolider progressivement le temps de travail au seuil course ; vérifier le protocole avant de conclure.' },
  };
  const priorities = axes.flatMap(axis => {
    // A common VO₂max observation is not a sport-specific running diagnosis.
    if (axis.key === 'vo2max' && input.vo2Source === 'shared') return [];
    if (axis.value == null || axis.target == null || axis.target <= 0) return [];
    const gapPercent = Math.max(0, (axis.key === 'vlamax' ? axis.value / axis.target - 1 : 1 - axis.value / axis.target) * 100);
    if (gapPercent <= 0) return [];
    return [{ key: axis.key, label: axis.label, gapPercent, ...details[axis.key], provisional: !documented(axis.source ?? 'unknown') }];
  }).sort((a, b) => b.gapPercent - a.gapPercent);
  const pace = positive(input.paceThresholdSecPerKm);
  const observations = axes.map(axis => `${axis.label} : ${axis.value == null ? 'données insuffisantes' : `${axis.value.toFixed(axis.key === 'vlamax' ? 2 : 1)} ${axis.unit}`}${axis.value != null && axis.target == null ? ' — comparaison non définie pour cet objectif' : ''}.`);
  if (pace) observations.push(`Allure au seuil course enregistrée : ${Math.floor(pace / 60)}:${String(Math.round(pace % 60)).padStart(2, '0')}/km (${(3600 / pace).toFixed(1)} km/h). Ce seuil ne certifie pas l’allure de compétition pour l’objectif ${input.objectif}.`);
  if (input.economy != null && Number.isFinite(input.economy)) observations.push(`Économie course : ${input.economy}/100, modulateur d’efficience, pas un limiteur prioritaire.`);
  if (input.drift != null && Number.isFinite(input.drift)) observations.push(`Découplage course : ${input.drift} %, indice de séance à interpréter avec sa durée, l’intensité et les conditions.`);
  const limitations = [
    'Priorités descriptives classées par écart relatif aux cibles internes, pas par impact causal démontré ni par probabilité de réussir l’épreuve. Elles ne remplacent pas les priorités du plan.',
    input.vo2Source === 'shared' ? 'Durabilité après effort prolongé et capacité de course après vélo non évaluées : des efforts spécifiques documentés sont nécessaires.' : 'Durabilité après effort prolongé non évaluée : un protocole frais/après charge et des efforts spécifiques documentés sont nécessaires.',
    'FatMax course non mesurée ; CP/W′ et VC/D′ restent des repères complémentaires spécifiques aux efforts et au capteur.',
  ];
  if (input.vo2Source === 'shared') limitations.push('VO₂max commune au bilan : modalité course non documentée, exclue du classement course ; aucune estimation à partir des watts vélo.');
  if (!vmaTarget) limitations.push('VMA renseignée conservée, mais aucune cible VMA propre à cet objectif triathlon : elle ne vaut pas zéro et aucun déficit VMA ne peut être conclu.');
  if (!tteValue) limitations.push('TTE course absent ou issu d’une charge non spécifique : aucun remplacement par le TTE vélo ni par le TSS global.');
  else limitations.push(`TTE course : ${input.tte?.source === 'records' ? 'estimation par records, pas un test jusqu’à épuisement' : 'test déclaré, continuité, seuil préalable et épuisement à vérifier'}.`);
  if (!pace) limitations.push('Allure au seuil course manquante : positionnement du seuil et calibrage de ses allures non évaluables.');
  return { axes, priorities, observations, limitations, summary: priorities.length ? 'Écarts course identifiés ; interprétation et protocoles à valider avant prescription.' : 'Aucun déficit course démontré sur les comparaisons disponibles ; cela ne signifie pas que le profil est complet ni prêt pour la course.' };
}