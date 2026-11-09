/** Shared organizational intent, NOT a physiological dose or adaptation model.
 * Block boundaries come exclusively from the existing load/recovery/phase
 * calendar. Raw priorities are never rediagnosed, truncated or replaced. */
export interface LimiterWeekFocus {
  week: number; globalWeek: number; block: number | null;
  mode: 'development' | 'maintenance' | 'race_integration';
  focus: string | null;
  primary: string | null;
  maintenance: string[];
}
export interface LimiterMesocycleSchedule {
  priorities: string[];
  blocks: Array<{ index: number; startWeek: number; endWeek: number; focus: string; phase: string | null }>;
  byWeek: Record<number, LimiterWeekFocus>;
  withoutDedicatedBlock: string[];
}
export function buildLimiterMesocycles(priorities: readonly string[], calendar: Record<number, { weekType: string; phase?: string }>): LimiterMesocycleSchedule {
  const raw = [...priorities], blocks: LimiterMesocycleSchedule['blocks'] = [], byWeek: LimiterMesocycleSchedule['byWeek'] = {};
  let current: LimiterMesocycleSchedule['blocks'][number] | null = null;
  let previousWasLoad = false;
  for (const week of Object.keys(calendar).map(Number).sort((a,b)=>a-b)) {
    const row = calendar[week];
    if (!raw.length) { byWeek[week] = { week, globalWeek:week, block:null,mode:row.weekType==='load'?'development':row.weekType==='recovery'?'maintenance':'race_integration',focus:null,primary:null,maintenance:[] }; continue; }
    const load = row.weekType === 'load';
    if (load && (!previousWasLoad || !current)) {
      current = { index:blocks.length + 1,startWeek:week,endWeek:week,focus:raw[blocks.length % raw.length],phase:row.phase ?? null };
      blocks.push(current);
    }
    if (load && current) current.endWeek = week;
    const mode = load ? 'development' : row.weekType==='recovery' ? 'maintenance' : 'race_integration';
    const focus = mode==='development' ? current?.focus ?? null : null;
    byWeek[week] = {week,globalWeek:week,block:load?current?.index??null:null,mode,focus,primary:raw[0],maintenance:raw.filter(label=>label!==focus)};
    previousWasLoad = load;
  }
  return { priorities:raw,blocks,byWeek,withoutDedicatedBlock:raw.filter(label=>!blocks.some(block=>block.focus===label)) };
}
export function limiterMesocyclePrompt(schedule: LimiterMesocycleSchedule, weeks: readonly number[]): string {
  if (!schedule.priorities.length) return '';
  const rows = weeks.map(week=>schedule.byWeek[week]).filter(Boolean);
  if (!rows.length) return '';
  const label = (text:string)=>text.replace(/\s+/g,' ').trim();
  return ['CALENDRIER COMMUN DES LIMITEURS — intention de construction, à vérifier sur les séances réelles.',
    'Le classement du profil reste inchangé. Le focus complémentaire tourne entre les blocs existants ; le primaire reste prioritaire et les autres restent en maintien. Ne pas ajouter de charge pour rattraper un focus impossible.',
    'Une décharge ne devient pas un bloc de développement. Affûtage/course : intégration spécifique, sans nouveau chantier. Une réévaluation nécessite de nouvelles données ; aucune amélioration physiologique n’est présumée.',
    ...rows.map(row=>`S${row.week} : ${row.mode}; bloc ${row.block??'—'}; focus ${row.focus?label(row.focus):'aucun développement nouveau'}; primaire ${row.primary?label(row.primary):'—'}; maintien ${row.maintenance.map(label).join(', ')||'—'}.`),
    schedule.withoutDedicatedBlock.length ? `Horizon insuffisant pour un bloc dédié à chaque priorité : ${schedule.withoutDedicatedBlock.map(label).join(', ')}. Ne pas les déclarer travaillées sans preuve dans les séances.` : '',
  ].filter(Boolean).join('\n');
}

/** A regenerated window keeps the full preparation's block sequence. */
export function limiterScheduleWindow(schedule: LimiterMesocycleSchedule, offset: number, length: number): LimiterMesocycleSchedule {
  const byWeek: LimiterMesocycleSchedule['byWeek'] = {};
  for (let local = 1; local <= length; local++) {
    const row = schedule.byWeek[local + offset];
    if (row) byWeek[local] = { ...row, week:local, maintenance:[...row.maintenance] };
  }
  return { ...schedule, priorities:[...schedule.priorities],blocks:schedule.blocks.map(block=>({...block})),byWeek,withoutDedicatedBlock:[...schedule.withoutDedicatedBlock] };
}

/** Goal-specific DET adapters may adjust the native calendar before search.
 * Rebind intent to that actual calendar, never to the pre-adapter layout. */
export function synchronizeLimiterMesocycles(preparation: {
  limiterCalendar:Record<number,{weekType:string;phase?:string}>;
  limiterMesocycles:LimiterMesocycleSchedule;
  weeklyQuotas:Record<number,{weekType:string;phase?:string;limiterFocus?:LimiterWeekFocus}>;
}, priorities:readonly string[], offset:number, length:number):void {
  const calendar={...preparation.limiterCalendar};
  for(const [local,row] of Object.entries(preparation.weeklyQuotas)) calendar[Number(local)+offset]={weekType:row.weekType,phase:row.phase};
  const schedule=limiterScheduleWindow(buildLimiterMesocycles(priorities,calendar),offset,length);
  preparation.limiterCalendar=calendar; preparation.limiterMesocycles=schedule;
  for(const [local,row] of Object.entries(preparation.weeklyQuotas)) row.limiterFocus=schedule.byWeek[Number(local)];
}
