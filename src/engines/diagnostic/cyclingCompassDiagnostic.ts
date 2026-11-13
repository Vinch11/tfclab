import type { RadarAxis } from '@/lib/coachingCompass/types';
import type { RunningCompassDiagnostic } from './runningCompassDiagnostic';

/** Read-only bike observations and existing targets, never a plan-ranking input. */
export function computeCyclingCompassDiagnostic(input: {
  axes: RadarAxis[];
  ftp: number | null;
  vo2Shared: boolean;
}): RunningCompassDiagnostic {
  const axes = input.axes.map(axis => ({ ...axis }));
  const details: Record<string, { explanation: string; lever: string }> = {
    vo2max: { explanation: 'Le moteur aérobie reste sous la cible interne vélo ; la modalité du test doit être vérifiée avant de conclure.', lever: 'Développer la puissance aérobie vélo avec une récupération adaptée.' },
    ftpkg: { explanation: 'La puissance au seuil rapportée au poids est sous la cible interne vélo. Le parcours, la puissance absolue et l’aérodynamique restent déterminants ; cet écart ne justifie pas à lui seul une perte de poids.', lever: 'Consolider la puissance soutenable vélo ; vérifier le seuil et les conditions de mesure.' },
    vlamax: { explanation: 'Le repère glycolytique vélo dépasse la cible interne de l’épreuve. Une estimation ne suffit pas à établir un excès de glycolyse mesuré.', lever: 'Consolider l’endurance aérobie et le travail sous-seuil vélo après validation du repère.' },
    tte: { explanation: 'La durée tenue au seuil vélo est sous la cible interne. Un arrêt volontaire donne seulement un minimum ; le TTE ne mesure pas la tenue après plusieurs heures.', lever: 'Consolider progressivement le temps de travail au seuil vélo ; vérifier continuité, seuil préalable et épuisement.' },
  };
  const supportedTte = new Set(['observed', 'records', 'test_labo', 'test_terrain', 'test']);
  const priorities = axes.flatMap(axis => {
    const detail = details[axis.key];
    if (!detail || (axis.key === 'vo2max' && input.vo2Shared)) return [];
    if (axis.key === 'tte' && !supportedTte.has(axis.source ?? 'unknown')) return [];
    if (axis.value == null || !Number.isFinite(axis.value) || axis.value <= 0 || axis.target == null || !Number.isFinite(axis.target) || axis.target <= 0) return [];
    const gapPercent = Math.max(0, (axis.key === 'vlamax' ? axis.value / axis.target - 1 : 1 - axis.value / axis.target) * 100);
    if (gapPercent <= 0) return [];
    return [{ key: axis.key, label: axis.label, gapPercent, ...detail, provisional: !['observed', 'test_labo'].includes(axis.source ?? 'unknown') }];
  }).sort((a, b) => b.gapPercent - a.gapPercent);
  const observations = axes.map(axis => `${axis.label} : ${axis.value != null && Number.isFinite(axis.value) && axis.value > 0 ? `${axis.value.toFixed(axis.key === 'vlamax' ? 2 : 1)} ${axis.unit}` : 'données insuffisantes'}${axis.value != null && axis.target == null ? ' — comparaison non définie pour cet objectif' : ''}.`);
  if (input.ftp != null && Number.isFinite(input.ftp) && input.ftp > 0) observations.push(`FTP vélo enregistrée : ${input.ftp.toFixed(0)} W. Repère de seuil à vérifier avec le protocole ; FTP, CP et MLSS ne sont pas des mesures interchangeables.`);
  const tte = axes.find(axis => axis.key === 'tte');
  const limitations = [
    'Priorités descriptives classées par écart relatif aux cibles internes, pas par impact causal démontré ni par probabilité de réussir l’épreuve. Elles ne remplacent pas les priorités du plan.',
    'Durabilité après effort prolongé non évaluée : comparer des efforts frais et après charge, avec intensité, durée, alimentation et conditions documentées.',
    'FatMax reste une zone lipidique modélisée, hors classement ; W′ reste un repère complémentaire au-dessus de CP, pas un limiteur général ni une mesure de VLamax.',
    'Capteur, étalonnage, protocole du seuil et conditions non certifiés par ce diagnostic. Aucune donnée course ne remplace une mesure vélo.',
  ];
  if (input.vo2Shared) limitations.push('VO₂max commune au bilan : modalité vélo non documentée, exclue du classement vélo ; ce n’est pas un deuxième test spécifique.');
  if (!tte || tte.value == null || tte.value <= 0) limitations.push('TTE vélo absent : aucun remplacement par le TTE course.');
  else if (!supportedTte.has(tte.source ?? 'unknown')) limitations.push('TTE vélo estimé à partir de charge ou de modèle : repère affiché, exclu des priorités ; aucun test jusqu’à épuisement démontré.');
  else limitations.push(tte.source === 'records' ? 'TTE vélo estimé par records : minimum ou proxy, pas un test jusqu’à épuisement.' : 'TTE vélo déclaré : continuité, seuil préalable et épuisement restent à vérifier.');
  return { axes, priorities, observations, limitations, summary: priorities.length ? 'Écarts vélo identifiés ; interprétation et protocoles à valider avant prescription.' : 'Aucun déficit vélo démontré sur les comparaisons disponibles ; cela ne signifie pas que le profil est complet ni prêt pour l’épreuve.' };
}