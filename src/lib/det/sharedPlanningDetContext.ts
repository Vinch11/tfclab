import type { FrozenAppPlanningInput } from './appPlanningInput';
import type { AthleteRecordView, CoachAnswers, PlanFormView } from './athleteDetBridge';

/** Reuse the effective shared configuration, including Auto resolution and
 * ambition adjustment. Never infer a measured value, recent load, session
 * clock, injury clearance or human approval from these planning settings. */
export function sharedPlanningDetContext(
  record: AthleteRecordView, form: PlanFormView,
  app: FrozenAppPlanningInput | null, answers: CoachAnswers,
): { form: PlanFormView; answers: CoachAnswers; inheritedLevel: boolean; shared: boolean } {
  if (!app || app.athleteId !== record.athleteId) return { form, answers, inheritedLevel: false, shared: false };
  const c = app.config;
  const meta = c.ambitionMeta;
  const inheritedLevel = !!meta && ['manual', 'auto-tss'].includes(meta.trainingLevelSource)
    && ['untrained', 'light', 'trained', 'highly_trained'].includes(meta.trainingLevel);
  const number = (value: number | undefined, fallback: number) => value === undefined ? fallback : value;
  return {
    shared: true, inheritedLevel,
    form: {
      objective: c.objective, planStartDate: c.planStartDate ?? form.planStartDate,
      raceDate: c.raceDate ?? form.raceDate,
      weeksAvailable: number(c.weeksAvailable, form.weeksAvailable),
      weeklyHours: number(c.weeklyHours, form.weeklyHours),
      sessionsPerWeek: number(c.sessionsPerWeek, form.sessionsPerWeek),
      strengthSessionsPerWeek: number(c.strengthSessionsPerWeek, form.strengthSessionsPerWeek),
      maxSessionsPerDay: number(c.maxSessionsPerDay, form.maxSessionsPerDay),
      ambition: c.ambition ?? form.ambition,
      ...(c.raceGoals?.length ? { raceGoals: structuredClone(c.raceGoals) } : {}),
    },
    answers: inheritedLevel ? { ...answers, athleteLevel: meta!.trainingLevel } : answers,
  };
}
