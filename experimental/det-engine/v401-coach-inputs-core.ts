import {EXTENDED_RUNNING_PRIMARIES,primaryRunningInputProblems} from './v408-primary-limiter-evidence';
import { reviewedTrailContract, type TrailPlanningDeclaration } from './v407-reviewed-trail-contract';
import { multiGoalProblems } from './v406-multi-goal-contract';
import { prepareMultiGoalMilestones } from './v359-declared-event';
/**
 * V401 — exécution DET sur des ENTRÉES COACH (aucune fixture synthétique).
 *
 * N'importe aucun helper synthétique (`v3-test-anchor-fixtures`, `v332-*`,
 * `prevalidationFixtures`) : les revues de source, ancres et horaires viennent
 * uniquement de l'appelant. Les contrôles stricts du moteur restent actifs ;
 * rien n'est rendu facultatif pour obtenir un résultat.
 */
import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
import { constructDeterministicPlan } from './engine';
import { detPrimaryLimiterKey } from './v403-limiter-semantics';
import { buildDetV3ContractFromCatalogue, type V3ReviewedSettings } from './v31-v3-catalogue';
import { constructDeterministicPlanWithBoundedReplays, type ReplayEvidence } from './v315-bounded-multiweek-replay';
import { V3_BASE_BRICK_ID } from './v31-v3-brick';
import { V32_703_BRICK_BLUEPRINTS } from './v32-v3-specific-bricks';
import { V34_SAFE_RUN_BRICKS } from './v34-v3-low-run-bricks';
import { IM_TAPER_BRICK } from './v404-im-taper-brick';

export interface CoachConfirmedClock {
  /** Fuseau IANA déclaré par le coach ; l'offset est calculé à l'instant réel de la séance. */
  timeZone: string;
  /** minuteOfDay par sport puis jour (0 = lundi). null = aucun créneau confirmé ce jour-là. */
  minutesBySport: Record<string, ReadonlyArray<number | null>>;
  /**
   * Choix EXPLICITE du coach pour une heure locale ambiguë (retour à l'heure
   * d'hiver) : clé `AAAA-MM-JJ`, "first" = première occurrence (heure d'été),
   * "second" = seconde occurrence. Absent ⇒ refus, jamais de choix implicite.
   */
  ambiguousChoices?: Record<string, 'first' | 'second'>;
}

/** Offset UTC (minutes) du fuseau à un INSTANT donné. */
export function utcOffsetMinutesAt(timeZone: string, instant: Date): number | null {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(instant).find((p) => p.type === 'timeZoneName')?.value ?? '';
    if (part === 'GMT') return 0;
    const m = /^GMT([+-])(\d{2}):(\d{2})$/.exec(part);
    if (!m) return null;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
  } catch { return null; }
}

export function isRealYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export type LocalInstantResolution =
  | { status: 'ok'; utcOffsetMinutes: number; utcIso: string }
  | { status: 'nonexistent' }
  | { status: 'ambiguous'; utcOffsetsMinutes: [number, number] }
  | { status: 'invalid' };

/**
 * Résout une heure locale murale (date + minute) en instant réel. Aucun
 * décalage silencieux : une heure inexistante (passage à l'heure d'été) ou
 * ambiguë (retour à l'heure d'hiver) est signalée comme telle.
 */
export function resolveLocalInstant(timeZone: string, ymd: string, minuteOfDay: number): LocalInstantResolution {
  if (!isRealYmd(ymd) || !Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay >= 1440) return { status: 'invalid' };
  const [y, m, d] = ymd.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d, 0, minuteOfDay);
  const around = [utcOffsetMinutesAt(timeZone, new Date(wall - 86400000)), utcOffsetMinutesAt(timeZone, new Date(wall + 86400000))];
  if (around.some((o) => o === null)) return { status: 'invalid' };
  const valid = [...new Set(around as number[])]
    .filter((o) => utcOffsetMinutesAt(timeZone, new Date(wall - o * 60000)) === o)
    .sort((a, b) => b - a); // première occurrence = offset le plus grand
  if (valid.length === 0) return { status: 'nonexistent' };
  if (valid.length > 1) return { status: 'ambiguous', utcOffsetsMinutes: [valid[0], valid[1]] };
  return { status: 'ok', utcOffsetMinutes: valid[0], utcIso: new Date(wall - valid[0] * 60000).toISOString() };
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function offsetForSlot(clock: CoachConfirmedClock, ymd: string, minute: number): number | null {
  const r = resolveLocalInstant(clock.timeZone, ymd, minute);
  if (r.status === 'ok') return r.utcOffsetMinutes;
  if (r.status === 'ambiguous') {
    const c = clock.ambiguousChoices?.[ymd];
    return c === 'first' ? r.utcOffsetsMinutes[0] : c === 'second' ? r.utcOffsetsMinutes[1] : null;
  }
  return null;
}

/** Tous les créneaux confirmés inutilisables (heure inexistante/ambiguë sans choix, fuseau invalide). */
export function clockProblems(clock: CoachConfirmedClock, planStartDate: string, weeks: number): string[] {
  const out: string[] = [];
  if (!isRealYmd(planStartDate)) return ['date de début invalide'];
  if (utcOffsetMinutesAt(clock.timeZone, new Date(Date.UTC(2026, 0, 1))) === null) return [`fuseau horaire invalide « ${clock.timeZone} »`];
  for (const [sport, row] of Object.entries(clock.minutesBySport)) {
    for (let w = 0; w < weeks; w++) for (let d = 0; d < 7; d++) {
      const minute = row?.[d];
      if (typeof minute !== 'number') continue;
      const ymd = addDays(planStartDate, w * 7 + d);
      const r = resolveLocalInstant(clock.timeZone, ymd, minute);
      const hhmm = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      if (r.status === 'nonexistent') out.push(`${sport} ${ymd} ${hhmm} : heure inexistante (changement d'heure) — choisir un autre horaire`);
      else if (r.status === 'ambiguous' && !clock.ambiguousChoices?.[ymd]) out.push(`${sport} ${ymd} ${hhmm} : heure ambiguë (changement d'heure) — préciser la première ou la seconde occurrence`);
      else if (r.status === 'invalid') out.push(`${sport} ${ymd} ${hhmm} : horaire invalide`);
    }
  }
  return out;
}

export function clockFor(clock: CoachConfirmedClock, planStartDate: string) {
  return (slot: { week: number; dayIndex: number; sport: string }) => {
    const minute = clock.minutesBySport[slot.sport]?.[slot.dayIndex];
    if (typeof minute !== 'number' || !Number.isInteger(minute) || minute < 0 || minute >= 1440) return null;
    const off = offsetForSlot(clock, addDays(planStartDate, (slot.week - 1) * 7 + slot.dayIndex), minute);
    if (off === null) return null;
    return { provenance: 'coach_confirmed' as const, minuteOfDay: minute, utcOffsetMinutes: off };
  };
}

/**
 * Familles d'objectifs du mode « entrées coach ». Chaque famille reprend
 * EXACTEMENT le jeu d'options moteur d'un scénario CI déjà prouvé
 * (aucune option assouplie, aucune valeur physiologique par défaut) :
 *  - marathon      ← V351–V357 (v332/v356, 16–40 sem., 7–9 h)
 *  - semi_marathon ← V332 (8–30 sem., 6 h)
 *  - triathlon_703 ← V320 (12 sem., 9–10 h, ratios minutes tri finaux)
 *  - triathlon_ironman ← V320 (16 sem., 13–14 h, ratios minutes tri finaux)
 * L'enveloppe testée (semaines, heures) est une borne de preuve : hors
 * enveloppe ⇒ refus explicite, jamais une extrapolation silencieuse.
 * Une preuve synthétique CI n'est PAS une preuve pour un athlète réel.
 */
export type CoachFamilyKey = '10k' | 'marathon' | 'semi_marathon' | 'triathlon_703' | 'triathlon_ironman' | 'trail_short' | 'trail_mountain' | 'trail_ultra';
export interface CoachFamily {
  key: CoachFamilyKey;
  label: string;
  /** Chaîne d'objectif transmise au moteur (celle des scénarios CI). */
  engineObjective: '10K' | 'Marathon' | 'Semi' | '703' | 'IM' | 'TrailShort' | 'TrailMountain' | 'TrailUltra';
  sportFocus: 'run' | 'tri' | 'trail';
  /** Ancres V3 que le coach doit fournir (mesure ou estimation identifiée). */
  requiredAnchors: readonly string[];
  /** Sports dont un créneau horaire confirmé est obligatoire. */
  requiredClockSports: readonly string[];
  testedEnvelope: { weeks: readonly [number, number]; weeklyHours: readonly [number, number] };
  ciEvidence: string;
}
export const COACH_FAMILIES: Readonly<Record<CoachFamilyKey, CoachFamily>> = {
  trail_short: {key:'trail_short',label:'Trail court',engineObjective:'TrailShort',sportFocus:'trail',requiredAnchors:['bikeFtpWatts'],requiredClockSports:['run','bike','strength'],testedEnvelope:{weeks:[12,12],weeklyHours:[7,7]},ciEvidence:'V360 trail court 12 semaines 7 h'},
  trail_mountain: {key:'trail_mountain',label:'Trail montagne',engineObjective:'TrailMountain',sportFocus:'trail',requiredAnchors:['bikeFtpWatts'],requiredClockSports:['run','bike','strength'],testedEnvelope:{weeks:[16,16],weeklyHours:[9,9]},ciEvidence:'V360 trail montagne 16 semaines 9 h'},
  trail_ultra: {key:'trail_ultra',label:'Ultra trail',engineObjective:'TrailUltra',sportFocus:'trail',requiredAnchors:['bikeFtpWatts'],requiredClockSports:['run','bike','strength'],testedEnvelope:{weeks:[20,20],weeklyHours:[12,12]},ciEvidence:'V360 ultra trail 20 semaines 12 h'},
  '10k': { key: '10k', label: '10 km route', engineObjective: '10K', sportFocus: 'run',
    requiredAnchors: ['runThresholdPaceSecPerKm', 'runVvo2SpeedMps'], requiredClockSports: ['run', 'bike'],
    testedEnvelope: { weeks: [8, 12], weeklyHours: [7, 7] }, ciEvidence: 'v358 strict 10 km (8/10/12 sem., 7 h)' },
  marathon: { key: 'marathon', label: 'Marathon route', engineObjective: 'Marathon', sportFocus: 'run',
    requiredAnchors: ['runThresholdPaceSecPerKm', 'runVvo2SpeedMps'], requiredClockSports: ['run'],
    testedEnvelope: { weeks: [16, 40], weeklyHours: [7, 9] }, ciEvidence: 'v332/v351–v357 (16/40 sem., 7/9 h)' },
  semi_marathon: { key: 'semi_marathon', label: 'Semi-marathon route', engineObjective: 'Semi', sportFocus: 'run',
    // Le gabarit semi V332 place un créneau vélo (cross-training) : son horaire
    // doit être confirmé par le coach, jamais supposé.
    requiredAnchors: ['runThresholdPaceSecPerKm', 'runVvo2SpeedMps'], requiredClockSports: ['run', 'bike'],
    testedEnvelope: { weeks: [8, 30], weeklyHours: [6, 6] }, ciEvidence: 'v332 certified-peak (8/30 sem., 6 h)' },
  triathlon_703: { key: 'triathlon_703', label: 'Triathlon 70.3', engineObjective: '703', sportFocus: 'tri',
    requiredAnchors: ['runThresholdPaceSecPerKm', 'runVvo2SpeedMps', 'bikeFtpWatts', 'cssSecPer100m'],
    requiredClockSports: ['swim', 'bike', 'run'],
    testedEnvelope: { weeks: [12, 12], weeklyHours: [9, 10] }, ciEvidence: 'v320 (12 sem., 9/9,5/10 h)' },
  triathlon_ironman: { key: 'triathlon_ironman', label: 'Triathlon Ironman', engineObjective: 'IM', sportFocus: 'tri',
    requiredAnchors: ['runThresholdPaceSecPerKm', 'runVvo2SpeedMps', 'bikeFtpWatts', 'cssSecPer100m'],
    requiredClockSports: ['swim', 'bike', 'run'],
    testedEnvelope: { weeks: [16, 16], weeklyHours: [13, 14] }, ciEvidence: 'v320 (16 sem., 13/14 h)' },
};
/** Objectifs reconnus mais NON raccordés, avec la raison exacte. */
export const COACH_BLOCKED_OBJECTIVES: Readonly<Record<string, string>> = {
  '5k': '5 km : aucun scénario CI du moteur V3 avec acceptation stricte — non raccordé',
  trail: 'Préciser trail court, montagne ou ultra et compléter la revue terrain.',
  tri_short: 'triathlon sprint/olympique : aucun scénario CI V3 avec acceptation stricte — non raccordé',
};
export const COACH_QUALIFIED_OBJECTIVES = Object.keys(COACH_FAMILIES) as CoachFamilyKey[];
export type CoachObjectiveKey = CoachFamilyKey | 'unsupported' | '5k' | 'trail' | 'tri_short';
/**
 * Clé d'objectif canonique EXACTE : le nom libre d'événement (« Marathon de
 * Paris », « Marathon de trail »…) n'est jamais une clé d'objectif.
 */
export function coachObjectiveKey(objective: string): CoachObjectiveKey {
  const t = String(objective ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[\s_-]+/g, ' ');
  if (['semi', 'semi marathon', 'demi marathon', 'half marathon', 'semi marathon route'].includes(t)) return 'semi_marathon';
  if (t === 'marathon' || t === 'marathon route') return 'marathon';
  if (['703', '70.3', 'ironman 70.3', 'half ironman', 'triathlon 70.3'].includes(t)) return 'triathlon_703';
  if (['im', 'ironman', 'triathlon ironman', 'full ironman'].includes(t)) return 'triathlon_ironman';
  if (['10k', '10 km', '10km', '10 km route'].includes(t)) return '10k';
  if (['5k', '5 km', '5km'].includes(t)) return '5k';
  if (['trailshort','trail short','trail court','trail court (20 40 km)'].includes(t)) return 'trail_short';
  if (['trailmountain','trail mountain','trail montagne','trail long','trail montagne (40 80 km)'].includes(t)) return 'trail_mountain';
  if (['trailultra','trail ultra','ultra trail','ultra trail (80 km+)'].includes(t)) return 'trail_ultra';
  if (/^trail( (court|short|long|montagne|mountain|ultra))?$/.test(t) || t === 'trailshort' || t === 'ultra trail') return 'trail';
  if (['sprint', 'olympic', 'olympique', 'triathlon sprint', 'triathlon olympique'].includes(t)) return 'tri_short';
  return 'unsupported';
}
export function coachFamilyFor(objective: string): CoachFamily | null {
  const k = coachObjectiveKey(objective);
  return (COACH_QUALIFIED_OBJECTIVES as string[]).includes(k) ? COACH_FAMILIES[k as CoachFamilyKey] : null;
}

/** Validations de bricks déclarées individuellement par le coach (triathlon 70.3 uniquement). */
export interface CoachBrickApproval { id: string; transitionSeconds: number }
export const COACH_703_BRICK_IDS: readonly string[] = [
  V3_BASE_BRICK_ID, ...V32_703_BRICK_BLUEPRINTS.map((b) => b.id), ...V34_SAFE_RUN_BRICKS.map((b) => b.id),
];
export const COACH_IM_BRICK_IDS: readonly string[] = [IM_TAPER_BRICK.id];
export const coachBrickIdsFor = (family: string): readonly string[] => family === 'triathlon_703' ? COACH_703_BRICK_IDS : family === 'triathlon_ironman' ? COACH_IM_BRICK_IDS : [];

export function runCoachInputsDet(input: {
  athlete: PlanAthleteData;
  config: PlanConfig & { planStartDate: string };
  reviews: readonly V3ReviewedSettings[];
  clock: CoachConfirmedClock;
  brickApprovals?: readonly CoachBrickApproval[];
  trail?: TrailPlanningDeclaration;
  limits?: { maxNodes: number; maxMilliseconds: number };
}) {
  const objectiveKey = coachObjectiveKey(String(input.config.objective));
  // Fail-closed : aucun objectif hors périmètre qualifié n'atteint le moteur.
  const family = coachFamilyFor(String(input.config.objective));
  if (!family) throw new Error(`coach_inputs_objective_not_qualified:${objectiveKey}`);
  const bricks = input.brickApprovals ?? [];
  if (bricks.length && !coachBrickIdsFor(family.key).length) throw new Error('coach_inputs_bricks_not_qualified_for_family');
  for (const b of bricks) if (!coachBrickIdsFor(family.key).includes(b.id)) throw new Error(`coach_inputs_unknown_brick:${b.id}`);
  const obj = family.engineObjective;
  const primaryKey=detPrimaryLimiterKey(input.config);
  const extendedPrimary=family.sportFocus==='run'&&primaryKey&&EXTENDED_RUNNING_PRIMARIES.includes(primaryKey);
  if(primaryRunningInputProblems(input.config).length)throw Error('coach_inputs_vlamax_reduction_direction_not_declared_by_app');
  const multi = (input.config.raceGoals?.length ?? 0) > 1;
  const multiProblems = multiGoalProblems(input.config);
  if (multi && (family.sportFocus === 'trail' || multiProblems.length)) throw new Error('coach_inputs_multi_goal_invalid:'+multiProblems.join(','));
  const mk = (b: CoachBrickApproval) => ({ id: b.id, objective: obj, individualCoachApproval: true as const, transitionSeconds: b.transitionSeconds, preferReviewedV3: true as const });
  const { contract, report, allBricks, imBrickReport, structuredWorkoutForId } = buildDetV3ContractFromCatalogue(
    input.reviews.map((r) => ({ ...r, objective: obj })),
    bricks.filter((b) => b.id === V3_BASE_BRICK_ID).map(mk) as never,
    bricks.filter((b) => V32_703_BRICK_BLUEPRINTS.some((x) => x.id === b.id)).map(mk) as never,
    bricks.filter((b) => V34_SAFE_RUN_BRICKS.some((x) => x.id === b.id)).map(mk) as never,
    bricks.filter((b) => b.id === IM_TAPER_BRICK.id).map(mk) as never);
  // Seules les sources V3 admises et les bricks validés un par un par le coach.
  const accepted = new Set([...report.accepted.map((c) => c.id), ...allBricks.map((b) => b.id)]);
  const contextProblems = contract.validateReviewedAthleteContext?.(input.athlete) ?? [];
  const slotClock = clockFor(input.clock, input.config.planStartDate);
  const baseFilter = contract.filterCandidate;
  const common = {
    ...contract,
    requireReviewedAthleteContext: true as const,
    ...(multi ? {useDeclaredEventDurationEstimates:true as const,excludeNativeBaseBuildPhaseConflicts:true as const,
      adapt:(p:Parameters<typeof contract.adapt>[0],c:PlanConfig)=>prepareMultiGoalMilestones(p,c,contract)} : {}),
    requireReviewedHorizonSourceCoverage: true as const,
    filterCandidate: (card: Parameters<NonNullable<typeof baseFilter>>[0], ctx: Parameters<NonNullable<typeof baseFilter>>[1]) => accepted.has(card.id) && (baseFilter?.(card, ctx) ?? true),
    enforceWeeklyHoursCap: true as const,
    enforceCalendarSafeV3Recovery: true as const,
    coachSlotStart: slotClock,
    coachSessionStart: (s: { weekNumber: number; dayIndex: number; sport: string }) =>
      slotClock({ week: s.weekNumber, dayIndex: s.dayIndex, sport: s.sport }),
    enforceConfirmedNoSameDayOverlap: true as const,
    improveV3RecoveryLayout: true as const,
    requireRealQualityOnLoadWeeks: true as const,
    filterDeclaredSprintBanCandidates: true as const,
    excludeNativeForbiddenTaperCandidates: true as const,
    requireStructuredPolarizationOnLoadWeeks: true as const,
    auditStructuredPolarizationSources: true as const,
  };
  // Use the bounded full-horizon triathlon budget already exercised by the
  // family bench. The former running budget was divided across eight IM
  // targets and stopped before a complete admissible chronology was tested.
  // This changes search resources only; every sporting gate stays mandatory.
  const limits = input.limits ?? (family.sportFocus === 'tri'
    ? { maxNodes: 200000, maxMilliseconds: 120000 }
    : { maxNodes: 25000, maxMilliseconds: 15000 });
  let out: ReturnType<typeof constructDeterministicPlan>;
  let replayEvidence: ReplayEvidence | undefined;
  if (family.sportFocus === 'trail') {
    if (!input.trail) throw Error('coach_inputs_trail_review_required');
    for (const card of report.accepted) { const r=input.trail.routes.find(r=>r.sourceId===card.id); if(r) card.structure+=' | PARCOURS APPROUVÉ '+r.routeId+' : D+ '+r.dPlusM+' m ; D− '+r.dMinusM+' m ; descente '+r.descentMinutes+' min. Réévaluer douleur, technique et disponibilité avant la séance suivante.'; }
    const trailConfig={...input.config,objective:obj};
    const trailContract=reviewedTrailContract(contract,input.trail,trailConfig,accepted,slotClock);
    out=constructDeterministicPlan(input.athlete,trailConfig,input.limits??{maxNodes:60000,maxMilliseconds:15000},trailContract);
  } else if (family.sportFocus === 'tri') {
    // Jeu d'options EXACT de V320 (ratios minutes tri finaux, quotas course
    // officielle, pic spécifique revu, décharges mesurées).
    const triOptions = {
      ...common,
      ...(family.key === 'triathlon_ironman' ? { exploreTriathlonTargetsBeforeLookback: true as const, requireSourceVerifiedTriathlonPeak: true as const } : {}),
      requireReviewedRaceSpecificPeak: true as const,
      rankCandidate: (card: { id: string }, context: { phase: string; slot: { isKeySession?: boolean } }) => {
        const proven = contract.reviewedRaceSpecificForId?.(card.id);
        if (context.phase === 'peak' && context.slot.isKeySession && proven?.objective === obj) return -4;
        return (contract.rankCandidate as ((c: unknown, x: unknown) => number) | undefined)?.(card, context) ?? 0;
      },
      requireMeasuredDeloadSelection: true as const, annotateVerifiedDeloads: true as const,
      preferSourceBackedMultisportBalance: 'triathlon_targets' as const,
      requireFinalTriathlonMinuteRatios: true as const,
      reconcileReviewedSourcePolarization: true as const,
      auditVerifiedMultisportMinutes: true as const,
      auditGlobalSourceSportRatioBounds: true as const,
      applyReviewedMinuteSportRatio: true as const,
      verifyOfficialRaceQuotaProjection: true as const,
      ...(family.key === 'triathlon_703' && Number(input.config.weeklyHours) < 10 ? {
        requireLorangQualityBeforeFinalValidation: true as const,
        requireSourceVerifiedTaperQuality: true as const,
      } : {}),
    };
    const replay = constructDeterministicPlanWithBoundedReplays(input.athlete, input.config, limits, triOptions as never);
    replayEvidence = replay.evidence;
    out = replay.result ?? ({ candidate: null, constraintsSatisfied: false, technicallyConstructed: false, issues: [], trace: [], nodes: replay.evidence.totalNodes, reason: `bounded_replay_${replay.evidence.verdict}` } as unknown as ReturnType<typeof constructDeterministicPlan>);
  } else {
    out = constructDeterministicPlan(input.athlete, input.config, limits, {
      ...common,
      ...(extendedPrimary?{prioritizeSourceVerifiedPrimaryRunning:true as const}:{}),
      requireStrictPeriodizationEvidence: true,
      reconcileReviewedSourcePolarization:true as const,
      // Exigences du chemin marathon prouvé en CI (V351–V357) : preuves plus
      // strictes et classements, jamais un assouplissement.
      ...(family.key === '10k' ? {
        requireMeasuredDeloadSelection: true as const, annotateVerifiedDeloads: true as const,
        requireReviewedRunningKeyQualityOnLoadWeeks: true as const,
        prioritizeVerifiedRunningQualitySlot: true as const, auditRunningQualitySourceMatching: true as const,
        prioritizeVerifiedRunningQualityCandidate: true as const, prioritizeRunningStructuredEasyMargin: true as const,
        prioritizeRunningQualitySlotByMargin: true as const, prioritizeSourceVerifiedTteOnKeySlots: true as const,
        prioritizeSourceVerifiedRaceDurabilityOnKeySlots: true as const,
        requireVerifiedRunningPhaseEvidence: true as const, reconcileReviewedSourcePolarization: true as const,
        enableV333ForwardCheck: true as const, enableV335SourceRunningPeak: true as const,
      } : family.key === 'marathon' ? {
        requireMeasuredDeloadSelection: true as const, annotateVerifiedDeloads: true as const,
        requireReviewedRunningKeyQualityOnLoadWeeks: true as const,
        prioritizeVerifiedRunningQualitySlot: true as const, auditRunningQualitySourceMatching: true as const,
        prioritizeVerifiedRunningQualityCandidate: true as const, prioritizeRunningStructuredEasyMargin: true as const,
        prioritizeRunningQualitySlotByMargin: true as const, auditMarathonHorizonEvidence: true as const,
        enableVerifiedMarathonMesocycles: true as const, prioritizeSourceVerifiedTteOnKeySlots: true as const,
        // V403 : primaire « Durabilité » (relative à l'épreuve) — même mécanisme d'ordre, preuve distincte.
        prioritizeSourceVerifiedRaceDurabilityOnKeySlots: true as const,
        reconcileReviewedMarathonSpecificityLexicalWarning: true as const,
        enableV333ForwardCheck: true as const, enableV335SourceRunningPeak: true as const,
      } : {
        ...(multi||extendedPrimary ? { requireReviewedRunningKeyQualityOnLoadWeeks:true as const,
          prioritizeVerifiedRunningQualitySlot:true as const, auditRunningQualitySourceMatching:true as const,
          prioritizeVerifiedRunningQualityCandidate:true as const, prioritizeRunningStructuredEasyMargin:true as const,
          prioritizeRunningQualitySlotByMargin:true as const,
          requireVerifiedRunningPhaseEvidence: true as const, reconcileReviewedSourcePolarization:true as const,
          prioritizeSourceVerifiedTteOnKeySlots:true as const, prioritizeSourceVerifiedRaceDurabilityOnKeySlots:true as const } : {}),
        // Semi: use the existing V358 measured phase/taper evidence, as in
        // the accepted long-horizon bench. No relabeling without dose proof.
        ...(Number(input.config.weeksAvailable) > 12 ? {
          requireMeasuredRunningPeriodization: true as const,
        } : {}),
        ...(Number(input.config.weeksAvailable) > 12 && detPrimaryLimiterKey(input.config) === 'tte' ? {
          requireVerifiedRunningPhaseEvidence: true as const,
          reconcileReviewedSourcePolarization: true as const,
          prioritizeSourceVerifiedTteOnKeySlots: true as const,
        } : {}),
        // Semi (V332) : décharges mesurées + contrôle avant/pic source.
        requireMeasuredDeloadSelection: true as const, annotateVerifiedDeloads: true as const,
        enableV333ForwardCheck: true as const, enableV335SourceRunningPeak: true as const,
        // V402 : la spécificité semi du bloc pic est prouvée par les blocs V3
        // revus (semi_pace, dose Z4 exacte), pas par le titre de la séance.
        reconcileReviewedSemiSpecificityLexicalWarning: true as const,
      }),
    } as never);
  }
  return {
    out,
    family: family.key,
    admittedSourceIds: [...accepted],
    admittedBrickIds: allBricks.map((b) => b.id),
    rejectedSources: [...report.rejected,...imBrickReport.rejected].map((r) => ({ id: r.id, reason: r.reason })),
    contextProblems: [...contextProblems],
    structuredWorkoutForId,
    replayEvidence,
  };
}
