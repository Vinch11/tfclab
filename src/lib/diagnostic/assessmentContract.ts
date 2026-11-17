import type { DbSnapshot } from '@/hooks/useCloudData';
import { labProfile, positive } from '@/lib/lab/labProfile';
import { parseStoredCriticalMetrics } from '@/lib/criticalMetrics';

export interface AssessmentResult { key: string; label: string; available: boolean; need: string; kind: 'stored' | 'tfcl' | 'additional' }

/** Read-only completeness, not certification that an athlete followed a protocol. */
export function assessmentResults(snapshot: DbSnapshot, sport: 'bike' | 'run'): AssessmentResult[] {
  const input = labProfile(snapshot, [], sport === 'run' ? '10K' : 'bike', 'finisher');
  const vla = sport === 'run' ? input.vlamaxRunReference?.value : input.vlamaxEffectif.value;
  const metabolic = positive(input.vo2max) && positive(input.poids) && positive(vla);
  const critical = parseStoredCriticalMetrics(snapshot.critical_metrics)[sport === 'run' ? 'running' : 'cycling'];
  const threshold = sport === 'run' ? snapshot.pace_threshold_sec_per_km : snapshot.ftp;
  return [
    { key: 'vo2', label: 'VO₂max', available: positive(input.vo2max), need: 'VO₂max enregistrée dans le bilan', kind: 'stored' },
    { key: 'vla', label: `VLamax ${sport === 'run' ? 'course' : 'vélo'}`, available: positive(vla), need: 'Données permettant le calcul TFCL de ce sport ou mesure directe documentée', kind: 'tfcl' },
    { key: 'fatmax', label: 'FatMax', available: metabolic, need: 'VO₂max, poids et VLamax de ce sport', kind: 'tfcl' },
    { key: 'fuel', label: 'Utilisation des graisses et glucides', available: metabolic, need: 'VO₂max, poids et VLamax de ce sport ; tolérance digestive distincte', kind: 'tfcl' },
    { key: 'threshold', label: sport === 'run' ? 'Allure seuil' : 'FTP', available: positive(threshold), need: 'Résultat du protocole seuil enregistré', kind: 'stored' },
    { key: 'zones', label: 'Repère pour les zones', available: positive(threshold), need: 'Seuil de ce sport ; zones déterminées par la doctrine TFCL', kind: 'tfcl' },
    { key: 'critical', label: sport === 'run' ? 'Vitesse critique / D′' : 'CP / W′', available: !!critical, need: 'Efforts critiques admissibles enregistrés ; validation coach distincte pour les plans', kind: 'additional' },
    { key: 'tte', label: 'Endurance au seuil · TTE', available: positive(threshold) && positive(sport === 'run' ? snapshot.tte_observed_min_run : snapshot.tte_observed_min), need: 'Test continu dédié, au seuil préalablement validé, jusqu’à épuisement', kind: 'stored' },
  ];
}