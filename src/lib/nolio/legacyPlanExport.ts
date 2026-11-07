import type {ParsedPlan} from '@/lib/aiPlanParser';
import {blocksLegacyNolioExport} from './legacyExportGuard';
import {findLibraryWorkoutForSession} from '@/lib/aiPlanWorkoutEnricher';
import {getTrailSessionAlternatives} from '@/lib/trailSessionAlternatives';
import type {NolioExportScope} from '../../../supabase/functions/_shared/nolioV2/exportScope';
import {selectExportScope} from '../../../supabase/functions/_shared/nolioV2/exportScope';

/** Compatibility adapter for existing IA archives and the existing V1 endpoint.
 * Selection keys and within-day dedup slots are computed BEFORE filtering.
 * Native prescriptions never enter the catalogue enrichment adapter. */
export function legacyPlanExportSessions(plan:ParsedPlan,scope:NolioExportScope){
 if(blocksLegacyNolioExport(plan))throw Error('Les prescriptions structurées exigent le transport Nolio V2.');
 const rows=plan.weeks.flatMap(w=>{const slots=new Map<number,number>();return w.sessions.map((s,i)=>{
  const sessionIndex=slots.get(s.dayIndex)??0;if(!s.isRest&&s.dayIndex>=0)slots.set(s.dayIndex,sessionIndex+1);
  return {sessionKey:`S${s.weekNumber}-J${s.dayIndex}-${i}`,sport:s.sport,title:s.title,isRest:s.isRest,session:s,sessionIndex};
 });});
 const selected=selectExportScope(rows,scope);if(selected.problems.length)throw Error('Sélection Nolio invalide ou vide.');
 const keys=new Set(selected.sessions.map(s=>s.sessionKey));
 return rows.filter(r=>keys.has(r.sessionKey)&&!r.isRest&&r.session.dayIndex>=0).map(({session:s,sessionIndex})=>{
  const lib=findLibraryWorkoutForSession({title:s.title,details:s.details});
  const alternatives=getTrailSessionAlternatives({sport:s.sport??lib?.sport??'',title:s.title,details:s.details}).map(a=>({icon:a.icon,label:a.label,hint:a.hint}));
  return {weekNumber:s.weekNumber,dayIndex:s.dayIndex,sessionIndex,sport:s.sport??lib?.sport??null,title:s.title,id:lib?.id??null,details:s.details,isRest:false,structure:lib?.structure??null,wbalProfile:lib?.wbalProfile??null,avoid:lib?.avoid??undefined,notes:lib?.notes??undefined,objectif:lib?.objectif??undefined,alternatives:alternatives.length?alternatives:undefined};
 });
}
export type LegacyExportContext={nolioId:number|null;startDate:string;refs:{ftp?:number|null;vma?:number|null;css?:number|null;fcMax?:number|null}};
export async function exportLegacyPlan(a:{plan:ParsedPlan;scope:NolioExportScope;athleteId:string;context:LegacyExportContext;invoke:(name:string,body:Record<string,unknown>)=>Promise<unknown>;progress:(s:string)=>void;current:()=>boolean}){
 if(!Number.isSafeInteger(a.context.nolioId)||Number(a.context.nolioId)<=0)throw Error('Athlète non lié à Nolio : vérifiez la connexion.');
 const d=new Date(a.context.startDate+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(a.context.startDate)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==a.context.startDate||d.getUTCDay()!==1)throw Error('La date de début sauvegardée doit être un lundi valide.');
 const sessions=legacyPlanExportSessions(a.plan,a.scope);if(!sessions.length)throw Error('Sélection vide.');
 let accepted=0;
 for(let i=0;i<sessions.length;i+=8){
  if(!a.current())throw Error(`Export interrompu : ${accepted}/${sessions.length} séances acceptées par Nolio.`);
  const batch=sessions.slice(i,i+8);a.progress(`Export vers Nolio : ${accepted}/${sessions.length} séances acceptées.`);
  const value=await a.invoke('nolio-send-plan',{athlete_id:a.athleteId,nolio_athlete_id:a.context.nolioId,planStartDate:a.context.startDate,sessions:batch,refs:a.context.refs});
  if(!a.current())throw Error('Contexte modifié : résultat du lot à vérifier dans Nolio.');
  const r=value as {sent?:unknown;errors?:unknown;total?:unknown}|null;
  if(!r||r.sent!==batch.length||!Array.isArray(r.errors)||r.errors.length||r.total!==batch.length)throw Error(`Export partiel ou non confirmé après ${accepted}/${sessions.length} séances. Vérifiez le dernier lot dans Nolio avant de reprendre.`);
  accepted+=batch.length;
 }
 return {accepted,total:sessions.length};
}
