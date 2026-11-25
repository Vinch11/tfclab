/**
 * Provenance du seuil saisi dans le bilan (FTP vélo, allure seuil course).
 *
 * Stockée dans `snapshots.field_sources[<champ>]` sous la forme
 * `{ source: <ThresholdOrigin>, protocol: <libellé> }`, à côté des autres
 * provenances de champs (cf. profileCurves.curveStatus, staffEvidence).
 * Pourquoi : la grille de zones ne peut pas distinguer un seuil mesuré d'une
 * estimation de montre ou du calculateur pré-test sans cette information.
 */
import type { Json } from '@/integrations/supabase/types';

export type ThresholdField = 'ftp' | 'pace_threshold_sec_per_km' | 'vma';
export type ThresholdOrigin = 'test_20min' | 'cp_test' | 'track_day_cs' | 'vma_test' | 'calculator' | 'watch' | 'entered';

export const THRESHOLD_ORIGIN_OPTIONS: Record<ThresholdField, { value: ThresholdOrigin; label: string }[]> = {
  ftp: [
    { value: 'cp_test', label: 'Bike Day : puissance critique 12/5/3 min (FTP = CP × 0,965)' },
    { value: 'test_20min', label: 'Test 20 min réalisé (× 0,95)' },
    { value: 'watch', label: 'Montre ou plateforme (Garmin, Zwift…)' },
    { value: 'entered', label: 'Autre / saisie libre' },
  ],
  pace_threshold_sec_per_km: [
    { value: 'test_20min', label: 'Test seuil 20 min TFCL réalisé (× 0,95)' },
    { value: 'track_day_cs', label: 'Track Day : 1 500 m + 3 000 m maximaux (vitesse critique)' },
    { value: 'calculator', label: 'Calculateur TFCL (estimation avant test)' },
    { value: 'watch', label: 'Montre (Garmin…)' },
    { value: 'entered', label: 'Autre / saisie libre' },
  ],
  // VMA : même mécanisme de provenance ; elle n'ancre jamais la grille de zones (isMeasuredOrigin l'ignore).
  vma: [
    { value: 'vma_test', label: 'Test VMA réalisé (Track Day, demi-Cooper, VAMEVAL…)' },
    { value: 'calculator', label: 'Estimation (records, calculateur TFCL)' },
    { value: 'watch', label: 'Montre (Garmin…)' },
    { value: 'entered', label: 'Autre / saisie libre' },
  ],
};

const ORIGINS = new Set<ThresholdOrigin>(['test_20min', 'cp_test', 'track_day_cs', 'vma_test', 'calculator', 'watch', 'entered']);
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** Provenance déclarée, ou null si le champ n'en a pas (bilans antérieurs). */
export function readThresholdOrigin(fieldSources: unknown, field: ThresholdField): ThresholdOrigin | null {
  const raw = object(fieldSources)[field];
  const source = typeof raw === 'string' ? raw : object(raw).source;
  return typeof source === 'string' && ORIGINS.has(source as ThresholdOrigin) ? source as ThresholdOrigin : null;
}

/** Nouvelle carte `field_sources` ; `origin` vide laisse la provenance existante intacte. */
export function withThresholdOrigin(fieldSources: unknown, field: ThresholdField, origin: ThresholdOrigin | '' | null | undefined): { [key: string]: Json | undefined } {
  const next = { ...object(fieldSources) } as { [key: string]: Json | undefined };
  if (!origin) return next;
  const label = THRESHOLD_ORIGIN_OPTIONS[field].find(o => o.value === origin)?.label ?? origin;
  next[field] = { source: origin, protocol: label };
  return next;
}

/** Un seuil issu d'un test réalisé peut ancrer les zones ; les autres sont des estimations. */
export const isMeasuredOrigin = (origin: ThresholdOrigin | null) => origin === 'test_20min' || origin === 'cp_test' || origin === 'track_day_cs';

/**
 * Provenance déclarée → source affichée dans le Compass et les rapports (lecture seule) :
 * test réalisé = « Test terrain déclaré », montre, estimation ou saisie coach.
 */
export function originDisplaySource(origin: ThresholdOrigin | null | undefined): string | null {
  if (!origin) return null;
  if (origin === 'test_20min' || origin === 'cp_test' || origin === 'track_day_cs' || origin === 'vma_test') return 'observed';
  if (origin === 'watch') return 'watch';
  if (origin === 'calculator') return 'estimation';
  return 'coach';
}
