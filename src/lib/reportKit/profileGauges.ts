/**
 * « Ton profil en un regard » : phrases pédagogiques et cadrans complémentaires.
 * Chaque cadran ajouté vient d'une valeur des Days (ou de Nolio) et d'un repère lié à l'objectif.
 * Repères « coaching » = repères internes TFCL (fourchettes de pratique), affichés comme tels côté coach.
 */
import type { FactorRow } from '../coachingCompass/factorStates';
import { isKnownPhysiologicalObjective, normalizeObjective } from '@/lib/physiologicalTargets';
import { latestPairs, pairedDecoupling } from '../diagnostic/durabilityDay';
import { reportFieldEvidence } from './fieldEvidence';
import { reportSportZoneSets, reportTargetTable } from './sportDiagramData';
import { pace } from './visualFigures';

type Sport = 'bike' | 'run';
export interface ExtraGauge { row: FactorRow; display?: (v: number) => string; sentence: string }
export interface PendingGauge { label: string; need: string; sentence: string }

/** Une phrase par repère : ce qu'il mesure, et pourquoi il compte pour la course. */
export function gaugeSentence(key: string, sport: Sport | 'swim', athlete: boolean): string {
  const t = (you: string, coach: string) => (athlete ? you : coach);
  const s: Record<string, string> = {
    vo2max: t('Ton plafond d’oxygène : plus il est haut, plus ton moteur aérobie a de la marge pour tenir une allure soutenue.', 'Plafond d’utilisation de l’oxygène : la marge du moteur aérobie.'),
    vlamax: t('La vitesse à laquelle ton corps fabrique du lactate. Plus elle est basse, plus tu économises tes sucres sur une longue distance.', 'Débit glycolytique : bas = économie de glucides sur épreuve longue, haut = explosivité.'),
    tte: t('Combien de minutes tu tiens à ton seuil. Plus c’est long, plus tu peux répéter et prolonger des efforts soutenus.', 'Durée tenue au seuil : capacité à prolonger les efforts soutenus.'),
    ftpkg: t('Ta puissance au seuil divisée par ton poids. C’est le meilleur repère pour la partie vélo, surtout quand ça monte.', 'Puissance au seuil rapportée au poids : premier prédicteur de la partie vélo.'),
    vma: t('La vitesse que tu tiens environ 5 à 7 minutes à fond : c’est le plafond de ta course.', 'Vitesse maximale aérobie : plafond de vitesse en course.'),
    fatmax: t('L’intensité où tu brûles le plus de graisses : utile pour régler les longues sorties et ta nutrition.', 'Intensité d’oxydation lipidique maximale (modèle).'),
    racePct: t('La part de ta puissance critique que ton plan vise le jour de course. Trop haute, tu le paies dans la course à pied qui suit.', 'Intensité de course visée par le plan, en % de la CP : à comparer à la fourchette tenable sur la durée de l’épreuve.'),
    durability: sport === 'bike'
      ? t('Ce que tu gardes de ta puissance après des heures de vélo. Plus c’est proche de 100 %, mieux tu résistes à la fatigue.', 'Puissance (ou efficacité cardiaque) conservée en fin de sortie longue.')
      : t('Ce que tu gardes de ta vitesse en fin de sortie longue. Plus c’est proche de 100 %, mieux tu résistes à la fatigue.', 'Vitesse (ou efficacité cardiaque) conservée en fin de sortie longue.'),
    thresholdSpeed: t('La vitesse que tu peux tenir longtemps sans exploser. C’est elle qui règle tes allures de course.', 'Vitesse critique (ou seuil) : base des zones et des allures de course.'),
    thresholdPctVma: t('La part de ta VMA que tu tiens longtemps. Plus elle est haute, plus ton endurance tire parti de ton moteur.', 'Seuil en % de la VMA : fraction utilisable du moteur aérobie.'),
    css: t('Ton allure de nage tenable longtemps, mesurée au Pool Day : elle règle tes séries et ton allure de course.', 'Vitesse critique de nage (CSS) : base des allures natation.'),
  };
  return s[key] ?? '';
}

const RACE_PCT_CP: Record<string, [number, number]> = { IM: [63, 73], '703': [73, 83], Olympic: [82, 91], Sprint: [88, 97] };
/** CSS de référence (s/100 m) par ambition : fourchettes de pratique TFCL. */
const CSS_REF: Record<string, [number, number]> = { finisher: [125, 140], age_group: [110, 125], competitor: [95, 110], elite: [82, 95], world_class: [72, 82] };
const THRESHOLD_PCT_VMA: [number, number] = [84, 92];
const DURABILITY_KEPT: [number, number] = [95, 100];

const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const row = (key: string, label: string, unit: string, value: number, low: number, high: number, tier: FactorRow['tier']): FactorRow => ({
  key, label, unit, value, zone: { low, high, point: null }, tier,
  state: value < low ? 'below' : value > high ? 'above' : 'inside', basis: null, evidence: [], engineNote: null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extraGauges(d: any, sport: Sport, rows: FactorRow[], athlete: boolean): { gauges: ExtraGauge[]; pending: PendingGauge[] } {
  const gauges: ExtraGauge[] = [], pending: PendingGauge[] = [];
  const snap = d?.effectiveSnapshot && (!d?.athlete?.id || d.effectiveSnapshot.athlete_id === d.athlete.id) ? d.effectiveSnapshot : null;
  if (!snap) return { gauges, pending };
  const goal = String(d?.athlete?.goal ?? '');
  const objective = goal && isKnownPhysiologicalObjective(goal) ? normalizeObjective(goal) : null;
  const sets = reportSportZoneSets(d);
  const set = sets.find(z => (sport === 'bike' ? /vélo/i : /course/i).test(z.sportLabel));
  const { critical, durability } = reportFieldEvidence(snap);
  const pairs = latestPairs(d?.tests ?? [], d?.athlete?.id ?? snap.athlete_id, snap.date);
  const has = (key: string) => rows.some(r => r.key === key && positive(r.value));
  const pct = (v: number) => `${Math.round(v)} %`;

  // Durabilité : Durability Day (efficacité cardiaque gardée) en priorité, sinon sorties longues Nolio.
  const pair = pairs.find(p => p.sport === sport);
  const decoupling = pair ? pairedDecoupling(pair) : null;
  const kept = decoupling != null ? 100 - Math.abs(decoupling) : durability[sport] ? 100 + durability[sport]!.meanChangePct : null;
  const durabilityLabel = decoupling != null ? 'Durabilité · Durability Day' : 'Durabilité · sorties longues';
  const durabilityNeed = `Durability Day ${sport === 'bike' ? 'vélo' : 'course'}, ou 2 sorties longues dans Nolio`;

  if (sport === 'bike') {
    if (!has('ftpkg')) pending.push({ label: 'Puissance au seuil par kilo', need: positive(snap.weight_kg) || positive(d?.effectiveRefs?.weightKg) ? 'FTP ou puissance critique (Bike Day)' : 'Poids dans la fiche athlète', sentence: gaugeSentence('ftpkg', 'bike', athlete) });
    const table = reportTargetTable(d);
    const cp = set?.critical ?? (positive(table?.ftpW) ? table!.ftpW! / 0.965 : null);
    const race = table?.racePowerRange;
    const ref = objective ? RACE_PCT_CP[objective] : undefined;
    if (cp && race && ref) {
      const v = ((race[0] + race[1]) / 2) / cp * 100;
      gauges.push({ row: row('racePct', 'Intensité de course visée', '% CP', v, ref[0], ref[1], 'coaching'), display: pct, sentence: gaugeSentence('racePct', 'bike', athlete) });
    }
  } else {
    const vma = positive(snap.vma) ? snap.vma : positive(d?.effectiveRefs?.vma) ? d.effectiveRefs.vma : null;
    const csKmh = critical.running ? critical.running.critical * 3.6 : null;
    const thrKmh = csKmh ?? (positive(snap.pace_threshold_sec_per_km) ? 3600 / snap.pace_threshold_sec_per_km : null);
    const vmaRef = rows.find(r => r.key === 'vma')?.zone;
    if (thrKmh && vmaRef && positive(vmaRef.low)) {
      gauges.push({ row: row('thresholdSpeed', csKmh ? 'Vitesse critique (CS)' : 'Allure au seuil', 'km/h', thrKmh, vmaRef.low * 0.88, vmaRef.high * 0.88, 'derived'),
        display: v => `${pace(3600 / v)}/km`, sentence: gaugeSentence('thresholdSpeed', 'run', athlete) });
    } else if (!thrKmh) pending.push({ label: 'Vitesse critique (CS)', need: 'Track Day : 1 500 m, 3 000 m et 1 000 m maximaux', sentence: gaugeSentence('thresholdSpeed', 'run', athlete) });
    if (thrKmh && vma) gauges.push({ row: row('thresholdPctVma', 'Seuil en % de la VMA', '%', thrKmh / vma * 100, THRESHOLD_PCT_VMA[0], THRESHOLD_PCT_VMA[1], 'coaching'), display: pct, sentence: gaugeSentence('thresholdPctVma', 'run', athlete) });
  }
  if (kept != null && kept > 0) gauges.push({ row: row('durability', durabilityLabel, '%', kept, DURABILITY_KEPT[0], DURABILITY_KEPT[1], 'coaching'), display: v => `${(Math.round(v * 10) / 10).toLocaleString('fr-FR')} % gardés`, sentence: gaugeSentence('durability', sport, athlete) });
  else pending.push({ label: 'Durabilité', need: durabilityNeed, sentence: gaugeSentence('durability', sport, athlete) });
  return { gauges, pending };
}

/** Cadran natation : CSS du bilan comparée à la fourchette de l'ambition. Vitesse (m/min) pour que « plus haut = mieux ». */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function swimGauge(d: any, athlete: boolean): ExtraGauge | null {
  const snap = d?.effectiveSnapshot;
  const css = positive(snap?.css) ? snap.css : positive(d?.effectiveRefs?.css) ? d.effectiveRefs.css : null;
  const ref = CSS_REF[String(d?.ambition?.current ?? 'age_group')] ?? CSS_REF.age_group;
  if (!css) return null;
  const speed = (sec: number) => 6000 / sec;
  return { row: row('css', 'Allure critique de nage (CSS)', 'm/min', speed(css), speed(ref[1]), speed(ref[0]), 'coaching'),
    display: v => `${pace(6000 / v)}/100 m`, sentence: gaugeSentence('css', 'swim', athlete) };
}
