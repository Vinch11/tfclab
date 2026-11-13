/** Availability is not scientific validation. Inputs must remain sport-specific. */
export function metabolicCurveReview(input: { vo2max?: number | null; vlamax?: number | null; weight?: number | null; ftp?: number | null; vma?: number | null; sport: 'velo' | 'cap' | 'triathlon' }) {
  const valid = (v: number | null | undefined) => v != null && Number.isFinite(v) && v > 0;
  const missing = [['VO₂max', input.vo2max], ['VLamax', input.vlamax], ['Poids', input.weight]].filter(([, value]) => !valid(value as number | null | undefined)).map(([label]) => String(label));
  const running = input.sport === 'cap';
  const reference = running ? input.vma : input.ftp;
  return { missing, metabolic: !missing.length, oxidation: !missing.length && valid(reference), cycling: !running && !missing.length && valid(input.ftp), reference: running ? 'VMA' : 'FTP', sport: running ? 'Course à pied' : 'Vélo', validation: 'Modèle exploratoire · équivalence INSCYD non démontrée' };
}