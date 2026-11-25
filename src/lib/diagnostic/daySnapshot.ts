/**
 * Bilan unique de campagne pour les Days (Track Day, Bike Day, Pool Day, Tri Test Day).
 *
 * Avant (audit nov. 2026) : chaque Day créait son propre bilan, partiel, et l'app n'utilise qu'un
 * bilan de référence (l'actif, sinon le plus récent). Le Pool Day « effaçait » ainsi la FTP, la CP,
 * la VMA et la vitesse critique des Days précédents jusqu'à une fusion manuelle.
 *
 * Maintenant : un Day complète le bilan de référence s'il date de moins de CAMPAIGN_DAYS jours
 * (même campagne de tests). Les valeurs du Day gagnent ; les autres sont reprises ; les métriques
 * critiques (CP, CS, durabilité, données brutes des Days) et les provenances de champs sont fusionnées
 * clé par clé. Le bilan créé devient le bilan actif (à faire par l'appelant, voir saveDaySnapshot).
 */
import type { DbSnapshot } from '@/hooks/useCloudData';
import { pickReferenceSnapshot } from '@/lib/referenceSnapshot';
import { criticalEnvelope } from '@/lib/criticalMetrics';

/** Fenêtre d'une campagne de tests : au-delà, les valeurs du bilan précédent ne sont pas reprises. */
export const CAMPAIGN_DAYS = 42;

/** Champs mesurés repris d'un Day à l'autre dans une même campagne. */
export const DAY_CARRIED_FIELDS = [
  'weight_kg', 'fat_pct', 'fc_max', 'fc_repos', 'vo2max', 'css', 'pmax_5s', 'p30s_w', 'p60s_w', 'map5min_w', 'ftp',
  'tte_observed_min', 'vma', 'pace_threshold_sec_per_km', 'sprint_15s_distance', 'tte_observed_min_run',
  'vlamax', 'vlamax_source', 'vlamax_protocol', 'vlamax_is_reference', 'vlamax_run', 'run_hr_drift_pct', 'bike_hr_drift_flag', 'bike_cadence_rpm',
  'run_pace_ref_sec_per_km', 'run_hr_ref_bpm', 'run_duration_min', 'run_economy_score', 'run_economy_label',
  'running_power_max', 'running_power_threshold', 'running_power_1s', 'running_power_5s', 'running_power_30s', 'running_power_60s', 'running_power_5min',
  'time_5k_sec', 'time_5k_date', 'time_10k_sec', 'time_10k_date', 'time_20k_sec', 'time_20k_date', 'time_half_sec', 'time_half_date', 'time_marathon_sec', 'time_marathon_date',
] as const satisfies readonly (keyof DbSnapshot)[];

/** Métadonnées qui ne voyagent qu'avec leur valeur : si le Day mesure la VLamax, on ne reprend pas la source de l'ancienne. */
const VALUE_METADATA: Partial<Record<string, string>> = { vlamax_source: 'vlamax', vlamax_protocol: 'vlamax', vlamax_is_reference: 'vlamax' };

type DayPayload = Omit<DbSnapshot, 'id' | 'created_at' | 'updated_at' | 'coach_id'> & { coach_id?: string };
type Snap = Pick<DbSnapshot, 'id' | 'athlete_id' | 'date' | 'source'> & Partial<DbSnapshot> & { created_at?: string | null };

const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? { ...v as Record<string, unknown> } : {};
const present = (v: unknown) => v !== null && v !== undefined;
const daysBetween = (a: string, b: string) => (Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000;

/** Bilan de la campagne en cours à compléter, ou null (premier Day, ou bilan trop ancien / postérieur). */
export function campaignBase<T extends Snap>(snapshots: readonly T[], athleteId: string, activeSnapshotId: string | null | undefined, dayDate: string): T | null {
  const ref = pickReferenceSnapshot(snapshots as T[], athleteId, activeSnapshotId);
  if (!ref || !ref.date) return null;
  const age = daysBetween(ref.date, dayDate);
  return Number.isFinite(age) && age >= 0 && age <= CAMPAIGN_DAYS ? ref : null;
}

/** Payload final : valeurs du Day + valeurs reprises du bilan de campagne, métriques fusionnées. */
export function completeDaySnapshot(day: DayPayload, base: Snap | null): { payload: DayPayload; carried: string[] } {
  if (!base) return { payload: day, carried: [] };
  const payload: Record<string, unknown> = { ...day };
  const carried: string[] = [];
  for (const field of DAY_CARRIED_FIELDS) {
    const owner = VALUE_METADATA[field];
    if (owner && present((day as Record<string, unknown>)[owner])) continue;
    if (!present(payload[field]) && present(base[field])) { payload[field] = base[field]; carried.push(field); }
  }
  // Métriques critiques : enveloppe JSON partagée (cycling, running, durability, trackDay, poolDay…).
  const critical = { ...criticalEnvelope(base.critical_metrics), ...criticalEnvelope(day.critical_metrics) };
  if (Object.keys(critical).length) payload.critical_metrics = critical;
  // Provenance de champ : celle du bilan précédent ne reste attachée qu'aux valeurs reprises
  // (une FTP saisie dans le Day sans provenance ne doit pas hériter de « Bike Day : puissance critique »).
  const baseSources = object(base.field_sources);
  for (const key of Object.keys(baseSources)) if (present((day as Record<string, unknown>)[key])) delete baseSources[key];
  const sources = { ...baseSources, ...object(day.field_sources) };
  if (Object.keys(sources).length) payload.field_sources = sources;
  // Une TTE reprise n'a de sens qu'au seuil auquel elle a été tenue : si le Day change ce seuil
  // de plus de 5 % (FTP recalibrée, nouvelle allure seuil), elle sort des calculs et reste gardée à part.
  const sourcesOut = object(payload.field_sources);
  for (const [column, threshold, refKey, record] of [
    ['tte_observed_min', 'ftp', 'refW', 'tte_observed_min_record'],
    ['tte_observed_min_run', 'pace_threshold_sec_per_km', 'refPaceSec', 'tte_observed_min_run_record'],
  ] as const) {
    if (!carried.includes(column) || !present((day as Record<string, unknown>)[threshold])) continue;
    const meta = object(sourcesOut[column]);
    const ref = typeof meta[refKey] === 'number' ? meta[refKey] as number : (base as Record<string, unknown>)[threshold] as number | null;
    const now = (day as Record<string, unknown>)[threshold] as number;
    if (typeof ref !== 'number' || !(ref > 0) || !(now > 0) || Math.abs(ref - now) / now <= 0.05) continue;
    sourcesOut[record] = { value: payload[column], date: base.date, [refKey]: Math.round(ref), threshold: Math.round(now), note: 'Tenue à un autre seuil : hors calculs, à refaire.' };
    delete sourcesOut[column];
    payload[column] = null;
    carried.splice(carried.indexOf(column), 1);
  }
  if (Object.keys(sourcesOut).length) payload.field_sources = sourcesOut;
  if (!present(payload.sport_main) && present(base.sport_main)) payload.sport_main = base.sport_main;
  if (carried.length) {
    const note = `Complète le bilan du ${base.date} (${base.source}) : ${carried.length} valeur(s) reprise(s).`;
    payload.coach_notes = [day.coach_notes, note].filter(Boolean).join(' — ').slice(0, 2000);
  }
  return { payload: payload as DayPayload, carried };
}

/**
 * Enregistre le Day dans le bilan de campagne et l'active. Retourne le bilan créé (ou null).
 * `addSnapshot` et `setActiveSnapshot` viennent de CloudDataContext.
 */
export async function saveDaySnapshot<T extends Snap>(opts: {
  day: DayPayload;
  snapshots: readonly T[];
  activeSnapshotId: string | null | undefined;
  addSnapshot: (s: DayPayload) => Promise<{ id: string } | null>;
  setActiveSnapshot?: (athleteId: string, snapshotId: string | null) => Promise<boolean>;
}): Promise<{ snapshot: { id: string } | null; carried: string[]; activated: boolean }> {
  const base = campaignBase(opts.snapshots, opts.day.athlete_id, opts.activeSnapshotId, opts.day.date);
  const { payload, carried } = completeDaySnapshot(opts.day, base);
  const snapshot = await opts.addSnapshot(payload);
  const activated = !!snapshot && !!opts.setActiveSnapshot && await opts.setActiveSnapshot(opts.day.athlete_id, snapshot.id);
  return { snapshot, carried, activated };
}
