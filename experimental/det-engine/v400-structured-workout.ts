/**
 * V400 — Structure SÉRIALISABLE d'une séance DET, issue UNIQUEMENT des blocs
 * V3 effectivement configurés (overrides approuvés appliqués) et admis, avec
 * leurs cibles individuelles résolues. Jamais un reparsing du texte `details`,
 * jamais un rechargement des doses par défaut du catalogue.
 *
 * Toute absence / ambiguïté / structure non couverte ⇒ refus explicite.
 * Aucune dose, pause, allure ou cible n'est inventée ni arrondie.
 */
import type { V3Block, V3Workout } from '../../scripts/library-v3/catalogueRuntime';
import type { V3IntensityTarget } from '../../scripts/library-v3/resolveV3Intensity';

export const DET_STRUCTURED_SCHEMA = 'det-structured-workout-v1' as const;

export type DetStructuredTarget = {
  metric: V3IntensityTarget['metric'];
  min: number | null;
  max: number | null;
  source: V3IntensityTarget['source'];
  confidence: V3IntensityTarget['confidence'];
};
export type DetStructuredLeaf = {
  kind: 'step';
  role: 'warmup' | 'main' | 'cooldown';
  label: string;
  domain: string | null;
  /** Exactement un axe de dose, tel que configuré. */
  dose: { seconds: number } | { meters: number } | { reps: number };
  repsTarget?: number;
  sides?: number;
  rpe?: { min: number; max: number };
  /** Cible résolue pour ce domaine ; null seulement pour un domaine nul. */
  target: DetStructuredTarget | null;
};
export type DetStructuredRepeat = {
  kind: 'repeat';
  label: string;
  count: number;
  /** Pause ENTRE répétitions : (count − 1) pauses, aucune après la dernière. */
  betweenSec: number;
  restAfterLast: false;
  steps: DetStructuredNode[];
};
export type DetStructuredNode = DetStructuredLeaf | DetStructuredRepeat;
export interface DetStructuredWorkout {
  schema: typeof DET_STRUCTURED_SCHEMA;
  sourceId: string;
  sport: string;
  chosenDurationMin: number;
  nodes: DetStructuredNode[];
  /** Somme exacte des secondes si toutes les feuilles sont en temps, sinon null. */
  exactSeconds: number | null;
}
export type DetStructureResult =
  | { status: 'structured'; workout: DetStructuredWorkout }
  | { status: 'refused'; sourceId: string; reason: string };

const refused = (sourceId: string, reason: string): DetStructureResult => ({ status: 'refused', sourceId, reason });
const finiteBase = (b: { base: number } | undefined) =>
  b && Number.isFinite(b.base) ? b.base : null;

function convert(blocks: readonly V3Block[], targets: readonly V3IntensityTarget[], path: string): DetStructuredNode[] | string {
  const out: DetStructuredNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]; const p = path ? `${path}.${i}` : String(i);
    if (b.kind === 'repeat') {
      const count = finiteBase(b.count);
      if (count === null || !Number.isSafeInteger(count) || count < 1) return `repeat_count_invalid:${p}`;
      if (!Number.isFinite(b.betweenSec) || b.betweenSec < 0) return `repeat_rest_invalid:${p}`;
      const steps = convert(b.steps, targets, p);
      if (typeof steps === 'string') return steps;
      if (!steps.length) return `repeat_empty:${p}`;
      out.push({ kind: 'repeat', label: b.label, count, betweenSec: b.betweenSec, restAfterLast: false, steps });
      continue;
    }
    const axes = [b.seconds, b.meters, b.reps].filter(Boolean).length;
    let dose: DetStructuredLeaf['dose'];
    if (b.kind === 'time') { const v = finiteBase(b.seconds); if (v === null || v <= 0) return `time_dose_invalid:${p}`; dose = { seconds: v }; }
    else if (b.kind === 'distance') { const v = finiteBase(b.meters); if (v === null || v <= 0) return `distance_dose_invalid:${p}`; dose = { meters: v }; }
    else { const v = finiteBase(b.reps); if (v === null || !Number.isSafeInteger(v) || v <= 0) return `reps_dose_invalid:${p}`; dose = { reps: v }; }
    if (axes !== 1) return `ambiguous_dose_axes:${p}`;
    let target: DetStructuredTarget | null = null;
    if (b.domain !== null) {
      const hits = targets.filter((t) => t.domain === b.domain);
      if (hits.length !== 1) return `${hits.length ? 'ambiguous' : 'missing'}_target_for_domain:${b.domain}:${p}`;
      const t = hits[0];
      target = { metric: t.metric, min: t.min, max: t.max, source: t.source, confidence: t.confidence };
    }
    const leaf: DetStructuredLeaf = { kind: 'step', role: b.role, label: b.label, domain: b.domain, dose, target };
    if (b.repsTarget) { const r = finiteBase(b.repsTarget); if (r === null) return `reps_target_invalid:${p}`; leaf.repsTarget = r; }
    if (typeof b.sides === 'number') leaf.sides = b.sides;
    if (b.rpeRange) leaf.rpe = { min: b.rpeRange.min, max: b.rpeRange.max };
    out.push(leaf);
  }
  return out;
}

function exactSeconds(nodes: readonly DetStructuredNode[]): number | null {
  let s = 0;
  for (const n of nodes) {
    if (n.kind === 'repeat') {
      const inner = exactSeconds(n.steps); if (inner === null) return null;
      s += n.count * inner + (n.count - 1) * n.betweenSec;
    } else if ('seconds' in n.dose) s += n.dose.seconds;
    else return null;
  }
  return s;
}

/**
 * @param configured carte V3 configurée et admise (overrides appliqués).
 * @param targets cibles individuelles résolues pour cette carte.
 * @param chosenDurationMin durée choisie par le moteur pour la séance.
 * @param exactDurationMin durée exacte admise (null si la carte reste une plage).
 */
export function buildDetStructuredWorkout(input: {
  sourceId: string;
  configured: V3Workout | undefined;
  targets: readonly V3IntensityTarget[] | undefined;
  admitted: boolean;
  isBrick: boolean;
  chosenDurationMin: number | undefined;
  exactDurationMin: number | null;
}): DetStructureResult {
  const { sourceId: id } = input;
  if (!input.admitted) return refused(id, 'source_not_admitted');
  if (input.isBrick) return refused(id, 'brick_transition_structure_not_supported');
  if (!input.configured || input.configured.id !== id) return refused(id, 'configured_source_missing');
  if (!input.targets) return refused(id, 'resolved_targets_missing');
  const d = input.chosenDurationMin;
  if (typeof d !== 'number' || !Number.isFinite(d) || d <= 0) return refused(id, 'chosen_duration_missing');
  if (input.exactDurationMin === null || Math.abs(input.exactDurationMin - d) > 1e-9)
    return refused(id, 'chosen_duration_differs_from_configured_blocks');
  const nodes = convert(input.configured.blocks, input.targets, '');
  if (typeof nodes === 'string') return refused(id, nodes);
  const secs = exactSeconds(nodes);
  if (secs !== null && Math.abs(secs - d * 60) > 1e-6) return refused(id, `block_seconds_${secs}_differ_from_duration_${d * 60}`);
  return { status: 'structured', workout: {
    schema: DET_STRUCTURED_SCHEMA, sourceId: id, sport: input.configured.sport,
    chosenDurationMin: d, nodes, exactSeconds: secs,
  } };
}
