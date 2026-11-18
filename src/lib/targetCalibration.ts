/** Scientific validity and demographic coverage are distinct from measurement completeness. */
export interface TargetCalibrationContext {
  age: number | null;
  sex: 'M' | 'F' | null;
  status: 'uncalibrated';
  evidence: 'coaching_reference';
  ageAdjustment: 'coaching_heuristic' | 'not_applied';
  sexAdjustment: 'not_validated';
  canInferPercentile: false;
  canCertifyAmbition: false;
  note: string;
}

export function getTargetCalibration(age?: number | null, sex?: string | null): TargetCalibrationContext {
  const validAge = age != null && Number.isFinite(age) && age >= 18 && age <= 100 ? age : null;
  const validSex = sex === 'M' || sex === 'F' ? sex : null;
  return {
    age: validAge,
    sex: validSex,
    status: 'uncalibrated',
    evidence: 'coaching_reference',
    ageAdjustment: validAge != null && validAge >= 30 ? 'coaching_heuristic' : 'not_applied',
    sexAdjustment: 'not_validated',
    canInferPercentile: false,
    canCertifyAmbition: false,
    note: `Repères de coaching, non validés pour ${validSex === 'F' ? 'les femmes' : validSex === 'M' ? 'les hommes' : 'un sexe non renseigné'}${validAge == null ? ' (âge absent ou hors population adulte)' : ` de ${validAge} ans`}. Les coefficients d’âge sont des hypothèses de coaching, pas des normes. Un écart suggère un point à examiner ; il ne prouve ni un limiteur ni une impossibilité de réussir. Un chrono visé reste identique quel que soit l’âge ou le sexe.`,
  };
}
