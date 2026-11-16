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
    const d = Math.round((race-date)/DAY_MS), baseWindow = WINDOWS[key];
    const window = baseWindow && { ...baseWindow,
      before: goal.priority && goal.priority !== 'A' ? Math.min(baseWindow.before, 7) : baseWindow.before,
      after: key === 'marathon' ? 21 : baseWindow.after };
    if (d !== 0 && (!window || d > window.before || -d > window.after)) continue;
    const stage = d === 0 ? 'race' : d > 0 ? 'taper' : 'recovery';
    const restOnly = stage === 'recovery' && -d <= (['marathon','ironman'].includes(key) ? 2 : 1);
    const easyOnly = stage === 'recovery' && (key !== 'marathon' || -d <= 14);
    const maxMinutes = stage === 'race' ? {} : stage === 'recovery'
      ? key === 'marathon' && -d > 14 ? {run:75,bike:180,swim:60,brick:0,strength:0}
      : key === 'marathon' && -d > 7 ? {run:45,bike:120,swim:60,brick:0,strength:0}
      : { run:30, bike:90, swim:50, brick:0, strength:0 }
      : d <= 2 ? {run:25,bike:40,swim:30,brick:0,strength:0}
      : d <= 7 ? {run:45,bike:90,swim:50,brick:0,strength:0}
      : {run:key === 'ironman' ? 75 : 60,bike:key === 'ironman' ? 150 : 90,swim:60,brick:0,strength:0};
    candidates.push({stage,daysToRace:d,objective:key,raceDate:goal.raceDate,label:goal.raceName ?? goal.objective ?? key,easyOnly,restOnly,maxMinutes});
  }
  // A competition cannot silently override another competition's recovery window.
  return candidates.find(p => p.stage === 'race') ?? candidates.find(p => p.stage === 'recovery') ?? candidates[0];
}
export function protectedRaceWeekType(config: RaceCalendarConfig, week: number, fallback: 'load'|'recovery'|'taper'|'race') {
  const protections = RACE_DAYS.map(d => raceProtectionForDay(config,week,d)).filter(p => p !== undefined);
  if (protections.some(p => p.stage === 'race')) return 'race' as const;
  if (protections.some(p => p.stage === 'recovery' && p.daysToRace >= -14)) return 'recovery' as const;
  if (protections.some(p => p.stage === 'taper')) return 'taper' as const;
  return fallback;
}
export function raceProtectionPrompt(config: RaceCalendarConfig, week: number): string {
  const start=strictRaceDate(config.planStartDate);
  const weekly=datedRaceGoals(config).flatMap(goal=>{
    const date=strictRaceDate(goal.raceDate);
    if(start===undefined || date===undefined)return [];
    const raceWeek=Math.floor((date-start)/604800000)+1-(config.globalWeekOffset??0);
    const key=normalizeRepairGoal(goal.objective);
    if(key==='marathon' && week===raceWeek-1)return ['CONTRAT ALLURE MARATHON : 1–2 rappels chiffrés totalisant au moins 15 min à allure marathon, jamais des accélérations de 30 s seules. Réduire le volume autour, conserver vélo/natation faciles ; course B ≠ pic A.'];
    if(key==='ironman' && week===raceWeek-2)return ['CONTRAT AFFÛTAGE IRONMAN : conserver un vélo autonome de 120–150 min avec rappels à effort Ironman et une course de 60–75 min ; réduire le volume ailleurs, ne pas supprimer tous les efforts longs.'];
    if(key==='marathon' && week>raceWeek && week<=raceWeek+3)return ['CONTRAT REPRISE MARATHON : comparer à la dernière charge pré-course, pas au plafond théorique : au plus 45 %, 70 %, 90 % en S+1, S+2, S+3. Aucun minimum à remplir en récupération ; douleurs/foulée anormale = pas de reprise course. S+3 : au plus deux séances clés non maximales, sans Z5/VO₂max ni brick exigeant. Repères de coaching, pas preuve de récupération individuelle.'];
    return [];
  });
  return [...weekly,...RACE_DAYS.flatMap(day => {
    const p = raceProtectionForDay(config,week,day);
    if (!p) return [];
    if (p.stage === 'race') return [`${day}: COURSE ${p.label} le ${p.raceDate}, seule activité ; aucune séance ajoutée.`];
    return [`${day}: ${p.stage === 'recovery' ? 'récupération après' : 'affûtage avant'} ${p.label} (${p.daysToRace < 0 ? 'J+' : 'J−'}${Math.abs(p.daysToRace)}). ${p.restOnly ? 'Repos complet.' : `${p.easyOnly ? 'Facile uniquement, aucun seuil/tempo/VO₂max/sprint. Reprise course seulement sans douleur, foulée normale ; jamais de quota obligatoire à remplir.' : 'Rappels spécifiques non fatigants ; pas de VO₂max ni de séance de développement. Avant marathon : conserver 1–2 rappels chiffrés à allure marathon ; après J+14 : au plus deux séances clés dans la semaine, sans brick exigeant.'} Plafonds par séance: ${Object.entries(p.maxMinutes).map(([s,m])=>`${s} ${m} min`).join(', ')}.`} Ces protections priment sur volume, sorties longues, maintien et renforcement.`];
  })].join('\n');
}