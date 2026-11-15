import { normalizeRepairGoal } from './repairSportingEquivalence.ts';

export interface RaceCalendarConfig {
  planStartDate?: string; objective?: string; raceDate?: string; raceFormat?: string | null;
  globalWeekOffset?: number;
  raceGoals?: Array<{ objective?: string; raceDate?: string; raceName?: string; priority?: string; raceFormat?: string | null }>;
}
export interface RaceProtection {
  stage: 'race' | 'taper' | 'recovery'; daysToRace: number; objective: string;
  raceDate: string; label: string; easyOnly: boolean; restOnly: boolean;
  maxMinutes: Partial<Record<string, number>>;
}
export const RACE_DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'] as const;
const DAY_MS = 86400000;
export function strictRaceDate(value?: string): number | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0,10) === value ? ms : undefined;
}
export function datedRaceGoals(config: RaceCalendarConfig) {
  const goals = [...(config.raceGoals ?? [])];
  if (config.raceDate && config.objective && !goals.some(g => g.raceDate === config.raceDate && normalizeRepairGoal(g.objective) === normalizeRepairGoal(config.objective)))
    goals.push({ objective: config.objective, raceDate: config.raceDate, priority: 'A', raceFormat: config.raceFormat ?? undefined });
  return goals.filter(g => strictRaceDate(g.raceDate) !== undefined && (!g.raceFormat || g.raceFormat === 'continuous'));
}
// Conservative coaching protection windows, not claims of complete individual recovery.
// Unknown trail duration and multi-day events retain dedicated contracts; never borrow a marathon dose.
const WINDOWS: Record<string, { before: number; after: number }> = {
  '5k': {before:3,after:2}, '10k': {before:5,after:3}, semi:{before:7,after:7},
  marathon:{before:14,after:10}, sprint:{before:5,after:3}, olympic:{before:7,after:5},
  half:{before:10,after:7}, ironman:{before:14,after:14},
};
export function raceProtectionForDay(config: RaceCalendarConfig, localWeek: number, day: string): RaceProtection | undefined {
  const start = strictRaceDate(config.planStartDate), index = RACE_DAYS.indexOf(day.toLowerCase() as typeof RACE_DAYS[number]);
  if (start === undefined || index < 0) return undefined;
  // Day labels refer to the actual weekday, including a non-Monday plan start.
  const mondayIndex = (new Date(start).getUTCDay() + 6) % 7;
  const date = start + ((localWeek + (config.globalWeekOffset ?? 0) - 1) * 7 + index - mondayIndex) * DAY_MS;
  const candidates: RaceProtection[] = [];
  for (const goal of datedRaceGoals(config)) {
    const race = strictRaceDate(goal.raceDate), key = normalizeRepairGoal(goal.objective);
    if (race === undefined || !key || !goal.raceDate) continue;
    const d = Math.round((race-date)/DAY_MS), window = WINDOWS[key];
    if (d !== 0 && (!window || d > window.before || -d > window.after)) continue;
    const stage = d === 0 ? 'race' : d > 0 ? 'taper' : 'recovery';
    const restOnly = stage === 'recovery' && -d <= (['marathon','ironman'].includes(key) ? 2 : 1);
    const easyOnly = stage === 'recovery' || (stage === 'taper' && key === 'marathon');
    const maxMinutes = stage === 'race' ? {} : stage === 'recovery'
      ? { run:30, bike:60, swim:40, brick:0, strength:0 }
      : d <= 2 ? {run:25,bike:40,swim:30,brick:0,strength:0}
      : d <= 7 ? {run:45,bike:90,swim:50,brick:0,strength:0}
      : {run:60,bike:key === 'ironman' ? 180 : 90,swim:60,brick:0,strength:0};
    candidates.push({stage,daysToRace:d,objective:key,raceDate:goal.raceDate,label:goal.raceName ?? goal.objective ?? key,easyOnly,restOnly,maxMinutes});
  }
  // A competition cannot silently override another competition's recovery window.
  return candidates.find(p => p.stage === 'race') ?? candidates.find(p => p.stage === 'recovery') ?? candidates[0];
}
export function protectedRaceWeekType(config: RaceCalendarConfig, week: number, fallback: 'load'|'recovery'|'taper'|'race') {
  const protections = RACE_DAYS.map(d => raceProtectionForDay(config,week,d)).filter(p => p !== undefined);
  if (protections.some(p => p.stage === 'race')) return 'race' as const;
  if (protections.some(p => p.stage === 'recovery')) return 'recovery' as const;
  if (protections.some(p => p.stage === 'taper')) return 'taper' as const;
  return fallback;
}
export function raceProtectionPrompt(config: RaceCalendarConfig, week: number): string {
  return RACE_DAYS.flatMap(day => {
    const p = raceProtectionForDay(config,week,day);
    if (!p) return [];
    if (p.stage === 'race') return [`${day}: COURSE ${p.label} le ${p.raceDate}, seule activité ; aucune séance ajoutée.`];
    return [`${day}: ${p.stage === 'recovery' ? 'récupération après' : 'affûtage avant'} ${p.label} (${p.daysToRace < 0 ? 'J+' : 'J−'}${Math.abs(p.daysToRace)}). ${p.restOnly ? 'Repos complet.' : `${p.easyOnly ? 'Facile uniquement, aucun seuil/tempo/VO₂max/sprint.' : 'Rappels courts non fatigants ; pas de séance de développement.'} Plafonds par séance: ${Object.entries(p.maxMinutes).map(([s,m])=>`${s} ${m} min`).join(', ')}.`} Ces protections priment sur volume, sorties longues, maintien et renforcement.`];
  }).join('\n');
}