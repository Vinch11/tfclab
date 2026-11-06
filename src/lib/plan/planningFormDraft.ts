import type { RaceGoal } from '@/hooks/useAITrainingPlan';

export const FORM_DRAFT_STRINGS = ['objective','raceName','raceDate','raceTargetMinutes','programmeTarget','planWeeksInput','weeklyHours','chronicWeeklyHours','recentWeeklyHours','recentWeeksCount','maxDoubleDaysPerWeek','sessionsPerWeek','ambition','constraints','maxSessionsPerDay','strengthSessionsPerWeek','deloadCadence','trainingLevel','trailDistanceKm','trailElevationM','trailTargetTimeH','trailMaxAltitudeM','terrainAvailability','planStartDate'] as const;
export type PlanningFormDraft = Record<typeof FORM_DRAFT_STRINGS[number], string> & {
  raceFormat: 'continuous'|'lcw_3day'; planDurationMode:'date'|'weeks'; planningEngine:'ai'|'det';
  lockAmbition:boolean; crossTrainingVelo:boolean; crossTrainingNatation:boolean; raceGoals:RaceGoal[];
};
export function decodePlanningFormDraft(value:unknown):PlanningFormDraft|null {
  if (!value || typeof value!=='object' || Array.isArray(value)) return null;
  const o=value as Record<string,unknown>;
  if (FORM_DRAFT_STRINGS.some(k=>typeof o[k]!=='string') || !['continuous','lcw_3day'].includes(String(o.raceFormat)) || !['date','weeks'].includes(String(o.planDurationMode)) || !['ai','det'].includes(String(o.planningEngine))) return null;
  if (['lockAmbition','crossTrainingVelo','crossTrainingNatation'].some(k=>typeof o[k]!=='boolean')) return null;
  if (!Array.isArray(o.raceGoals) || o.raceGoals.some(g=>!g || typeof g!=='object' || typeof g.objective!=='string' || !['A','B','C'].includes(g.priority) || Object.entries(g).some(([k,v])=>!['objective','priority','raceName','raceDate','raceFormat','weeksUntilRace','distanceKm','elevationGainM','targetTimeMinutes','maxAltitudeM'].includes(k) || (v!==undefined && v!==null && typeof v!=='string' && (typeof v!=='number'||!Number.isFinite(v)))))) return null;
  // Explicit allowlist: never store plan JSON, responses, source reviews or grants.
  return Object.fromEntries([...FORM_DRAFT_STRINGS,'raceFormat','planDurationMode','planningEngine','lockAmbition','crossTrainingVelo','crossTrainingNatation','raceGoals'].map(k=>[k,structuredClone(o[k])])) as PlanningFormDraft;
}

type Store=Pick<Storage,'getItem'|'setItem'>;
// Access the browser storage getter only inside the guarded read/write call.
export const planningDraftStorage:Store = { getItem:key=>globalThis.localStorage.getItem(key), setItem:(key,value)=>globalThis.localStorage.setItem(key,value) };
export type DraftStatus='pending'|'empty'|'restored'|'saved'|'unavailable'|'invalid'|'conflict';
export function planningDraftKey(coachId:string|null|undefined,athleteId:string|null|undefined,kind:'form'|'det'):string|null {
  return coachId && athleteId ? `tfcl.planning-draft.v1:${encodeURIComponent(coachId)}:${encodeURIComponent(athleteId)}:${kind}` : null;
}
export function readPlanningDraft<T>(storage:Store,key:string|null,signature:string,decode:(value:unknown)=>T|null):{status:DraftStatus;data:T|null;revision:number} {
  if(!key)return {status:'pending',data:null,revision:0};
  try {
    const raw=storage.getItem(key);if(raw===null)return {status:'empty',data:null,revision:0};
    const row=JSON.parse(raw);
    if(row?.schema!==1||row.key!==key||!Number.isSafeInteger(row.revision)||row.revision<1)return {status:'invalid',data:null,revision:0};
    // Keep the revision when the profile changed; the old data is not reused.
    if(row.signature!==signature)return {status:'empty',data:null,revision:row.revision};
    const data=decode(row.data);return {status:data?'restored':'invalid',data,revision:row.revision};
  }catch{return {status:'unavailable',data:null,revision:0};}
}
export function writePlanningDraft<T>(storage:Store,key:string|null,signature:string,data:T,revision:number):{status:DraftStatus;revision:number} {
  if(!key)return {status:'pending',revision};
  try {
    const raw=storage.getItem(key);const old=raw===null?null:JSON.parse(raw);
    if(old && (old.schema!==1 || old.key!==key || !Number.isSafeInteger(old.revision)))return {status:'invalid',revision};
    // Detect a draft updated by another tab instead of overwriting it silently.
    if((old?.revision??0)!==revision)return {status:'conflict',revision};
    const next=revision+1;
    storage.setItem(key,JSON.stringify({schema:1,key,signature,revision:next,data}));
    return {status:'saved',revision:next};
  }catch{return {status:'unavailable',revision};}
}
