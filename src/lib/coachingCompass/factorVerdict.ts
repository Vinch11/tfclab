/**
 * Display-only cross-evidence verdict for one Compass factor.
 * A factor is called "probably limiting" only when ≥2 independent observations agree.
 * Never feeds limiter ranking, IA/DET contracts or prescriptions.
 */
import { assessVmaReference, type VmaReference } from './vmaReference';

export type EvidenceStatus = 'deficit' | 'ok' | 'unknown';
export interface FactorEvidence { key: string; label: string; status: EvidenceStatus; detail: string; independenceGroup?: string; extrapolated?: boolean }
export type FactorVerdictKind = 'probable_limiter' | 'gap_to_confirm' | 'no_apparent_deficit' | 'to_measure';
export interface FactorVerdict { kind: FactorVerdictKind; label: string; evidence: FactorEvidence[] }

const LABELS: Record<FactorVerdictKind, string> = {
  probable_limiter: 'Limitant probable',
  gap_to_confirm: 'Écart au scénario, à confirmer',
  no_apparent_deficit: 'Pas de déficit apparent',
  to_measure: 'À mesurer',
};

export function computeFactorVerdict(evidence: FactorEvidence[]): FactorVerdict {
  const deficits = evidence.filter(e => e.status === 'deficit').length;
  const independentDeficits = new Set(evidence.filter(e => e.status === 'deficit' && !e.extrapolated).map(e => e.independenceGroup ?? e.key)).size;
  const known = evidence.filter(e => e.status !== 'unknown').length;
  const kind: FactorVerdictKind = independentDeficits >= 2 ? 'probable_limiter'
    : deficits >= 1 ? 'gap_to_confirm'
    : known > 0 ? 'no_apparent_deficit'
    : 'to_measure';
  return { kind, label: LABELS[kind], evidence };
}

/** Coaching convention (not a validated norm): threshold usually sits ~80–90 % of VMA in trained runners. */
export const THRESHOLD_FRACTION_HIGH = 0.88;
export const THRESHOLD_FRACTION_LOW = 0.80;

export function buildVmaEvidence(input: {
  vma: number | null;
  paceThresholdSecPerKm: number | null;
  reference: VmaReference | null;
  isTriathlon?: boolean;
}): FactorEvidence[] {
  const vmaOk = input.vma != null && Number.isFinite(input.vma) && input.vma > 0;
  const evidence: FactorEvidence[] = [];

  const a = input.reference ? assessVmaReference(input.vma, input.reference) : null;
  evidence.push({
    key: 'vma_vs_scenario', independenceGroup: 'vma', extrapolated: true, label: 'VMA face au repère d’ambition',
    status: !a || a.status === 'unavailable' ? 'unknown' : a.status === 'below' ? 'deficit' : 'ok',
    detail: !a || a.status === 'unavailable' ? 'VMA ou repère indisponible.'
      : a.status === 'below' ? `${a.gapKmh?.toFixed(1)} km/h sous le repère (extrapolé).` : 'Dans ou au-dessus du repère (extrapolé).',
  });

  const pace = input.paceThresholdSecPerKm;
  if (vmaOk && pace != null && Number.isFinite(pace) && pace > 0) {
    const fraction = 3600 / pace / (input.vma as number);
    const pct = Math.round(fraction * 100);
    evidence.push({
      key: 'threshold_fraction', independenceGroup: 'vma', extrapolated: true, label: 'Seuil en % de VMA',
      status: fraction >= THRESHOLD_FRACTION_HIGH ? 'deficit' : 'ok',
      detail: fraction >= THRESHOLD_FRACTION_HIGH
        ? `Seuil à ${pct} % de VMA : seuil déjà proche du plafond, hypothèse à confirmer, sans preuve indépendante de limitation.`
        : fraction < THRESHOLD_FRACTION_LOW
          ? `Seuil à ${pct} % de VMA : interprétation dépendante des protocoles, à confirmer.`
          : `Seuil à ${pct} % de VMA : pas d’indice que la VMA soit le frein principal.`,
    });
  } else {
    evidence.push({ key: 'threshold_fraction', independenceGroup: 'vma', extrapolated: true, label: 'Seuil en % de VMA', status: 'unknown', detail: 'Allure seuil ou VMA manquante.' });
  }

  evidence.push({ key: 'recent_performance', label: 'Performances récentes', status: 'unknown', detail: 'Non croisées automatiquement : à vérifier avec les records Nolio.' });
  if (input.isTriathlon) {
    evidence.push({ key: 'run_off_bike', label: 'Course après vélo', status: 'unknown', detail: 'À mesurer (enchaînement), non déduit d’une course fraîche.' });
  }
  return evidence;
}
