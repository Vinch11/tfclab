import { getDoctrineDomain } from '@/lib/zones/tfclDoctrine';
import { WorkoutLibrary } from '@/lib/workoutLibrary';

/** First structured model. This compiles explicit inputs; it never chooses a training dose. */
export const BRICK_BASE_703_V2 = {
  id: 'brick-base-703-v2', version: '1.0.0',
  sourceId: 'BRICK_STAGE1_INTRO',
  sourcePath: 'src/lib/workoutLibrary.ts',
  sourceReference: 'e31ffaba7d1fcefff8a60910713fd1fe9f18f89b',
  purpose: 'Adaptation vélo-course et sensations de transition en phase base',
  bikeSeconds: [45 * 60, 60 * 60], runSeconds: [15 * 60, 20 * 60],
  sourceEnvelopeSeconds: [60 * 60, 90 * 60],
  bikeDomain: 'moderate_lt1', runDomain: 'recovery',
  progression: 'explicit_coach_parameters_with_current_evidence_only',
} as const;

export interface ModelEvidence { source: string; asOf: string; }
export interface ContinuousDose {
  warmupSeconds: number; mainSeconds: number; cooldownSeconds: number;
}
export interface BrickBase703Parameters {
  bike: ContinuousDose;
  run: ContinuousDose;
  transition: { seconds: number; instructions: string; source: string };
  anchors: { ftpWatts: number; runThresholdSecPerKm: number; evidence: ModelEvidence };
  capacity: { bikeSeconds: number; runSeconds: number; brickElapsedSeconds: number; evidence: ModelEvidence };
  prescription: ModelEvidence;
  previous?: { bikeSeconds: number; runSeconds: number; evidence: ModelEvidence };
  progressionApproval?: ModelEvidence;
}
export interface BrickBase703Context {
  objective: string; phase: string; trainingLevel: string; ambition: string;
  evaluationDate: string; sessionDate: string; minimumBikeSeconds: number; minimumElapsedSeconds: number; availableSeconds: number;
  limiters: readonly string[];
  /** Mandatory external decisions, never inferred from diagnostic scores or elapsed weeks. */
  readiness: 'favourable' | 'adverse' | 'unknown';
  disciplineAvailable: { bike: boolean; run: boolean };
  monitoringInstructions: string;
}
export interface StructuredSegment {
  discipline: 'bike' | 'run' | 'transition';
  role: 'warmup' | 'main' | 'cooldown' | 'transition';
  seconds: number; repetitions: 1; recoveryBetweenRepetitionsSeconds: 0;
  intensity: { domain: 'moderate_lt1' | 'recovery'; zone: string; reference: number; unit: 'W' | 'km/h'; ceiling: number; minimum: number | null; semantics: 'range' | 'ceiling'; source: ModelEvidence } | null;
  instructions: string;
}
const date = (v: string) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
const positive = (n: number) => Number.isFinite(n) && n > 0;
const seconds = (n: number) => Number.isSafeInteger(n) && n > 0;
const total = (d: ContinuousDose) => d.warmupSeconds + d.mainSeconds + d.cooldownSeconds;
const completeDose = (d: ContinuousDose) => [d.warmupSeconds,d.mainSeconds,d.cooldownSeconds].every(seconds);
const evidence = (e: ModelEvidence | undefined, sessionDate: string) => !!e && typeof e.source === 'string' && !!e.source.trim() && date(e.asOf) && e.asOf <= sessionDate;

/** Exact source snapshot: a changed source must undergo a new review, never silently inherit this model. */
export function brickBaseSourceUnchanged() {
  const source = WorkoutLibrary.find(w => w.id === BRICK_BASE_703_V2.sourceId);
  return !!source && source.sport === 'brick' && JSON.stringify(source.phase) === '["base"]' &&
    JSON.stringify(source.durationMin) === '[60,90]' && source.variants?.half === 'Base' &&
    JSON.stringify(source.structure) === JSON.stringify([
      { part: 'Bike', text: "45–60' Z2 facile", zones: ['Z2'] },
      { part: 'Run', text: "15–20' Z1 très facile (focus sensation transition)", zones: ['Z1'] },
    ]);
}

export function compileBrickBase703(parameters: unknown, c: BrickBase703Context) {
  const reasons: string[] = [];
  const refuse = () => ({ status: 'refused' as const, reasons: [...new Set(reasons)], session: null });
  if (!brickBaseSourceUnchanged()) reasons.push('source_snapshot_changed');
  if (c.objective !== '703' || c.phase !== 'base' || c.trainingLevel !== 'trained' || c.ambition !== 'age_group') reasons.push('unsupported_sporting_scope');
  if (!date(c.sessionDate) || !date(c.evaluationDate)) reasons.push('invalid_session_date');
  const evidenceCutoff = c.evaluationDate < c.sessionDate ? c.evaluationDate : c.sessionDate;
  if (!seconds(c.availableSeconds) || !Number.isSafeInteger(c.minimumElapsedSeconds) || c.minimumElapsedSeconds < 0) reasons.push('invalid_slot');
  // This is a genuine empty intersection; no parameter choice or transition can repair it.
  if (!Number.isSafeInteger(c.minimumBikeSeconds) || c.minimumBikeSeconds < 0) reasons.push('invalid_bike_floor');
  if (c.minimumBikeSeconds > BRICK_BASE_703_V2.bikeSeconds[1]) reasons.push('bike_floor_exceeds_source_bounds');
  if (c.minimumElapsedSeconds > BRICK_BASE_703_V2.sourceEnvelopeSeconds[1]) reasons.push('slot_floor_exceeds_source_envelope');
  if (c.readiness !== 'favourable') reasons.push('current_recovery_not_favourable');
  if (!c.disciplineAvailable.bike || !c.disciplineAvailable.run) reasons.push('discipline_unavailable');
  if (!c.monitoringInstructions.trim()) reasons.push('monitoring_instructions_missing');
  // Runtime input is checked before reading any duration. Unknown never becomes zero or a guessed duration.
  const p = parameters as Partial<BrickBase703Parameters> | null;
  if (!p || !p.bike || !p.run || !p.transition || !p.anchors || !p.capacity || !p.prescription) {
    reasons.push('explicit_parameters_missing'); return refuse();
  }
  if (!completeDose(p.bike) || !completeDose(p.run)) reasons.push('invalid_or_missing_segment_duration');
  const bikeSeconds = total(p.bike), runSeconds = total(p.run);
  if (bikeSeconds < 2700 || bikeSeconds > 3600) reasons.push('bike_outside_source_bounds');
  if (bikeSeconds < c.minimumBikeSeconds) reasons.push('long_bike_component_floor_not_met');
  if (runSeconds < 900 || runSeconds > 1200) reasons.push('run_outside_source_bounds');
  if (!seconds(p.transition.seconds) || typeof p.transition.instructions !== 'string' || !p.transition.instructions.trim() || typeof p.transition.source !== 'string' || !p.transition.source.trim()) reasons.push('transition_not_fully_declared');
  const exerciseSeconds = bikeSeconds + runSeconds;
  const elapsedSeconds = exerciseSeconds + p.transition.seconds;
  if (!Number.isSafeInteger(elapsedSeconds) || elapsedSeconds < 3600 || elapsedSeconds > 5400) reasons.push('elapsed_outside_source_envelope');
  if (elapsedSeconds < c.minimumElapsedSeconds) reasons.push('slot_floor_not_met');
  if (elapsedSeconds > c.availableSeconds) reasons.push('availability_exceeded');
  if (!positive(p.anchors.ftpWatts) || !positive(p.anchors.runThresholdSecPerKm) || !evidence(p.anchors.evidence,evidenceCutoff)) reasons.push('individual_anchors_missing');
  const capacity = p.capacity;
  if (![capacity.bikeSeconds,capacity.runSeconds,capacity.brickElapsedSeconds].every(seconds) ||
      !evidence(capacity.evidence,evidenceCutoff)) reasons.push('current_capacity_evidence_missing');
  else if (bikeSeconds > capacity.bikeSeconds || runSeconds > capacity.runSeconds || elapsedSeconds > capacity.brickElapsedSeconds) reasons.push('current_capacity_exceeded');
  if (!evidence(p.prescription,evidenceCutoff)) reasons.push('explicit_coach_prescription_missing');
  // Evidence recency is a coach decision: require the session-date review, do not invent a universal freshness window.
  if (capacity.evidence?.asOf !== c.sessionDate || p.prescription.asOf !== c.sessionDate) reasons.push('session_date_review_missing');
  if (p.previous) {
    if (![p.previous.bikeSeconds,p.previous.runSeconds].every(seconds) || !evidence(p.previous.evidence,evidenceCutoff)) reasons.push('invalid_previous_exposure');
    if ((bikeSeconds > p.previous.bikeSeconds || runSeconds > p.previous.runSeconds) &&
        (!evidence(p.progressionApproval,evidenceCutoff) || p.progressionApproval?.asOf !== c.sessionDate)) reasons.push('progression_not_explicitly_reviewed');
  }
  if (reasons.length) return refuse();
  const segments: StructuredSegment[] = [];
  for (const sport of ['bike','run'] as const) {
    if (sport === 'run') segments.push({discipline:'transition',role:'transition',seconds:p.transition.seconds,
      repetitions:1,recoveryBetweenRepetitionsSeconds:0,intensity:null,instructions:p.transition.instructions});
    const domain = getDoctrineDomain(sport === 'bike' ? 'moderate_lt1' : 'recovery');
    const reference = sport === 'bike' ? p.anchors.ftpWatts : 3600 / p.anchors.runThresholdSecPerKm;
    const fraction = (sport === 'bike' ? domain.bike : domain.run)!;
    for (const role of ['warmup','main','cooldown'] as const) segments.push({
      discipline:sport,role,seconds:p[sport][`${role}Seconds`],repetitions:1,recoveryBetweenRepetitionsSeconds:0,
      intensity:{domain:domain.id as 'moderate_lt1'|'recovery',zone:domain.zone,reference,
        unit:sport==='bike'?'W':'km/h',ceiling:reference*fraction.max,
        minimum:sport==='bike'?reference*fraction.min:null,semantics:sport==='bike'?'range':'ceiling',source:{...p.anchors.evidence}},
      instructions:sport==='bike'?'Z2 facile, domaine modéré ≤ LT1 ; effort continu, sans accélération.':
        'Z1 très facile ; adaptation aux sensations de transition, sans recherche d’allure de compétition.',
    });
  }
  return {status:'compiled_for_review' as const,reasons:[],session:{
    modelId:BRICK_BASE_703_V2.id,version:BRICK_BASE_703_V2.version,sourceId:BRICK_BASE_703_V2.sourceId,
    sourceReference:BRICK_BASE_703_V2.sourceReference,objective:BRICK_BASE_703_V2.purpose,
    target:'703',phase:'base',discipline:'brick',segments,exerciseSeconds,transitionSeconds:p.transition.seconds,
    elapsedSeconds,parameters:structuredClone(p),context:structuredClone(c),
    limiterDecision:'Source de base facile inchangée ; aucune conversion limiteur → durée démontrée. Dose explicitement prescrite par le coach.',
    technicallyExecutable:true,individualPrescriptionApproved:false,scientificallyValidated:false,
  }};
}
