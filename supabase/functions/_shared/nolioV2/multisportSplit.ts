/** Explicit export representation: two linked activities and a timed transition gap.
 * The saved prescription remains a single brick. No network or approval defaults. */
import { canonicalJson, detWorkoutProblems, type DetWorkout, type PlanSessionInput } from './plannedMapper.ts';
import { startProblems, utcOffsetMinutesAt, resolveLocalInstant, type CoachSessionStart } from './localTime.ts';

export type SplitChoice = { schema: 'nolio-reviewed-split-v1'; parentSha256: string; coachConfirmed: true; runStart: CoachSessionStart };
type Composition = { schema: 'det-reviewed-brick-v1'; bike: DetWorkout; run: DetWorkout; transitionSeconds: number };
export type SplitPreview = { parentKey: string; parentSha256: string; bikeSeconds: number; runSeconds: number; transitionSeconds: number; runStart: CoachSessionStart; sessions: PlanSessionInput[] };
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');
const instant = (s: CoachSessionStart) => Date.parse(s.localDate + 'T00:00:00Z') + (s.minuteOfDay - s.utcOffsetMinutes) * 60000;

export async function previewMultisportSplit(s: PlanSessionInput): Promise<{ preview: SplitPreview } | { reason: string }> {
  const no = (reason: string) => ({ reason });
  const w = s.detStructuredWorkout as (DetWorkout & { composition?: Composition }) | undefined;
  const c = w?.composition;
  if (!w || w.sport !== 'brick' || w.sourceId !== s.catalogId || w.schema !== 'det-structured-workout-v1' ||
      !c || c.schema !== 'det-reviewed-brick-v1' || c.bike?.sport !== 'bike' || c.run?.sport !== 'run') return no('split_composition_identity_invalid');
  if ('composition' in c.bike || 'composition' in c.run || c.bike.sourceId === c.run.sourceId ||
      c.bike.sourceId === w.sourceId || c.run.sourceId === w.sourceId) return no('split_component_identity_invalid');
  if (detWorkoutProblems(c.bike).length || detWorkoutProblems(c.run).length) return no('split_component_structure_invalid');
  if (!Number.isSafeInteger(c.transitionSeconds) || c.transitionSeconds < 180 || c.transitionSeconds > 600 || c.transitionSeconds % 60) return no('split_transition_invalid');
  const bs = c.bike.exactSeconds, rs = c.run.exactSeconds;
  if (bs === null || rs === null || bs % 60 || rs % 60 || bs !== c.bike.chosenDurationMin * 60 || rs !== c.run.chosenDurationMin * 60 ||
      w.exactSeconds !== bs + rs + c.transitionSeconds || w.chosenDurationMin * 60 !== w.exactSeconds || s.durationMin !== w.chosenDurationMin) return no('split_total_duration_not_conserved');
  const expectedNodes = [...c.bike.nodes, { kind: 'step', role: 'main', label: 'Transition confirmée par le coach — hors exercice', domain: null, target: null, dose: { seconds: c.transitionSeconds } }, ...c.run.nodes];
  if (canonicalJson(w.nodes) !== canonicalJson(expectedNodes)) return no('split_parent_components_differ');
  if (!s.coachStart || startProblems(s.coachStart, s.date).length) return no('split_start_requires_coach_confirmation');
  // The provider body carries local date/time, not the chosen UTC offset.
  // An explicit offset in our archive cannot select the provider's DST fold.
  if (resolveLocalInstant(s.coachStart.timeZone,s.date,s.coachStart.minuteOfDay).status === 'ambiguous') return no('split_provider_time_ambiguous');
  const at = new Date(instant(s.coachStart) + (bs + c.transitionSeconds) * 1000);
  const offset = utcOffsetMinutesAt(s.coachStart.timeZone, at);
  if (offset === null) return no('split_run_timezone_invalid');
  const wall = new Date(at.getTime() + offset * 60000);
  const runStart: CoachSessionStart = { provenance: 'coach_confirmed', localDate: wall.toISOString().slice(0, 10),
    minuteOfDay: wall.getUTCHours() * 60 + wall.getUTCMinutes(), timeZone: s.coachStart.timeZone, utcOffsetMinutes: offset };
  if (resolveLocalInstant(runStart.timeZone,runStart.localDate,runStart.minuteOfDay).status === 'ambiguous') return no('split_provider_time_ambiguous');
  const parentSha256 = await hash(canonicalJson(s));
  const shared = `Enchaînement TFCLab ${s.sessionKey} (${parentSha256}). Vélo puis transition de ${c.transitionSeconds} s hors activité, puis course. Deux activités liées ; transition conservée comme intervalle horaire, pas comme exercice.\n${s.details ?? ''}`;
  const child = (part: 'bike' | 'run', source: DetWorkout, start: CoachSessionStart, order: number): PlanSessionInput => ({
    sessionKey: `${s.sessionKey}~${part}`, date: start.localDate, title: `${s.title} — ${order}/2 ${part === 'bike' ? 'Vélo' : 'Course'}`,
    details: `${shared}\nComposant ${order}/2 : ${source.sourceId}.`, sport: part, catalogId: source.sourceId,
    durationMin: source.chosenDurationMin, detStructuredWorkout: structuredClone(source), coachStart: { ...start },
  });
  return { preview: { parentKey: s.sessionKey, parentSha256, bikeSeconds: bs, runSeconds: rs, transitionSeconds: c.transitionSeconds, runStart,
    sessions: [child('bike', c.bike, s.coachStart, 1), child('run', c.run, runStart, 2)] } };
}

export async function expandReviewedMultisport(sessions: PlanSessionInput[], choices: unknown): Promise<{ sessions: PlanSessionInput[]; problems: string[] }> {
  if (choices === undefined) return { sessions, problems: [] };
  if (!choices || typeof choices !== 'object' || Array.isArray(choices)) return { sessions: [], problems: ['split_choices_invalid'] };
  const out: PlanSessionInput[] = [], problems: string[] = [];
  const supplied = choices as Record<string, SplitChoice>;
  const keys = new Set(sessions.map(s => s.sessionKey));
  for (const k of Object.keys(supplied)) if (!keys.has(k)) problems.push(`split_unknown_parent:${k}`);
  for (const s of sessions) {
    if (!Object.prototype.hasOwnProperty.call(supplied, s.sessionKey)) { out.push(s); continue; }
    const choice = supplied[s.sessionKey], r = await previewMultisportSplit(s);
    if ('reason' in r) { problems.push(`${s.sessionKey}:${r.reason}`); continue; }
    if (!choice || choice.schema !== 'nolio-reviewed-split-v1' || choice.coachConfirmed !== true || choice.parentSha256 !== r.preview.parentSha256 ||
        canonicalJson(choice.runStart) !== canonicalJson(r.preview.runStart)) { problems.push(`${s.sessionKey}:split_choice_missing_or_stale`); continue; }
    out.push(...r.preview.sessions);
  }
  if (new Set(out.map(s => s.sessionKey)).size !== out.length) problems.push('split_session_key_collision');
  return { sessions: problems.length ? [] : out, problems };
}
