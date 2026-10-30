/** Experimental acceptance policy, not a new physiological law or validator threshold. */
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {isRaceDaySession} from '../../supabase/functions/_shared/raceDayIdentity';
import type {V2Issue} from './v2-validation';
export const WARNING_POLICY_VERSION='det-v3-quality-1';
const TAXONOMY:Record<string,{nature:string;reviewPriority:'high'|'medium'|'context';consequence:string}>={
 polarization:{nature:'intensity_distribution',reviewPriority:'high',consequence:'Fatigue et stimulus incompatibles avec la distribution attendue.'},
 lorang_categories:{nature:'intensity_distribution',reviewPriority:'high',consequence:'Répartition des catégories TFCL à revoir ; convention méthodologique.'},
 progression:{nature:'load_progression',reviewPriority:'high',consequence:'Saut, stagnation ou perte de continuité ; risque dépendant du contexte.'},
 load_pattern:{nature:'mesocycle_recovery',reviewPriority:'high',consequence:'Alternance charge/récupération ou affûtage incohérente.'},
 key_sessions:{nature:'stimulus_specificity',reviewPriority:'high',consequence:'Stimuli requis potentiellement absents ou excessifs.'},
 key_session_self_declaration_mismatch:{nature:'stimulus_annotation',reviewPriority:'high',consequence:'Drapeau clé conservé sur séance facile ; peut masquer une sous-prescription.'},
 limiter_coherence:{nature:'individualization',reviewPriority:'high',consequence:'Stimulus incohérent avec les limiteurs identifiés.'},
 phase_coherence:{nature:'periodization',reviewPriority:'high',consequence:'Séance ou phase incompatible avec la préparation.'},
 sport_ratio:{nature:'multisport_balance',reviewPriority:'high',consequence:'Durées des disciplines déséquilibrées ; interprétation des bricks limitée.'},
 strength_sessions_requested:{nature:'coach_constraint',reviewPriority:'high',consequence:'Renforcement demandé par le coach non respecté.'},
 anti_repetition:{nature:'diversity',reviewPriority:'medium',consequence:'Répétition possible ; elle peut aussi être utile, ne démontre pas seule un risque.'},
 minimum_catalogue_dose_exceeds_budget:{nature:'catalogue_load_incompatibility',reviewPriority:'high',consequence:'Dose catalogue incompatible avec la disponibilité ; recherche ou contrat à revoir.'},
 catalogue_slot_duration_unavailable:{nature:'catalogue_dose_gap',reviewPriority:'high',consequence:'Aucune fiche dans la plage du créneau ; pas de dose inventée.'},
 catalogue_diversity_limited:{nature:'catalogue_coverage',reviewPriority:'medium',consequence:'Diversité limitée, sans autorisation de dépasser les capacités des fiches.'},
 deterministic_quota_not_available:{nature:'unsupported_contract',reviewPriority:'high',consequence:'Prescription hebdomadaire dédiée non établie, construction non attestée.'},
 experimental_contract_requires_review:{nature:'experimental_methodology',reviewPriority:'high',consequence:'Contrat candidat à comparer au contrat de référence, sans promotion automatique.'},
 race_duration_unestimated:{nature:'missing_evidence',reviewPriority:'context',consequence:'Charge de compétition et récupération non attestées.'},
 coach_initial_load_unverified:{nature:'missing_evidence',reviewPriority:'context',consequence:'Charge initiale non vérifiée ; revue humaine nécessaire.'},
 ambition_physiology_gap:{nature:'feasibility_uncertainty',reviewPriority:'context',consequence:'Ambition et capacités à revoir, incertitude non résolue.'},
 multiday_event_requires_stage_review:{nature:'event_review',reviewPriority:'context',consequence:'Épreuves LCW à valider séparément.'},
};
export function classifyWarning(issue:V2Issue){return {code:issue.code,emittedSeverity:issue.severity,...(TAXONOMY[issue.code]??{nature:'unclassified',reviewPriority:'high' as const,consequence:'Alerte inconnue : conservation prudente et revue nécessaire.'})};}
export function warningKey(i:V2Issue){
 const week=i.week??Number(i.message?.match(/^S(\d+)\s*:/)?.[1]??0);
 // Preserve subtypes and sport; numeric values and session titles are not distinct rules.
 const subtype=(i.message??'').replace(/^S\d+\s*:\s*/,'').replace(/"[^"]*"/g,'<session>').replace(/\d+(?:[.,]\d+)?/g,'#');
 return JSON.stringify([i.control??'legacy',i.code,week,subtype]);
}
export function warningDeltas(before:V2Issue[],after:V2Issue[]){
 const counts=(issues:V2Issue[])=>{const out=new Map<string,{issue:V2Issue;count:number}>();for(const issue of issues.filter(i=>i.severity==='warning')){const key=warningKey(issue),old=out.get(key);out.set(key,{issue,count:(old?.count??0)+1});}return out;};
 const a=counts(before),b=counts(after);
 return [...new Set([...a.keys(),...b.keys()])].sort().flatMap(key=>{const delta=(b.get(key)?.count??0)-(a.get(key)?.count??0);return delta?[{key,delta,issue:(b.get(key)??a.get(key))!.issue,classification:classifyWarning((b.get(key)??a.get(key))!.issue)}]:[];});
}
/** Descriptive exposure only. Bricks are never silently split into bike/run minutes. */
export function progressionExposure(plan:ParsedPlan){
 return plan.weeks.map(w=>{const q=plan.weeklyQuotas?.[w.weekNumber];const sessions=w.sessions.filter(s=>!s.isRest&&!isRaceDaySession(s));
  const sport=(key:string)=>sessions.filter(s=>s.sport===key).reduce((n,s)=>n+(s.durationMin??0),0);
  return {week:w.weekNumber,phase:w.phase,type:q?.weekType??'unknown',race:w.sessions.some(isRaceDaySession),
   total:sessions.reduce((n,s)=>n+(s.durationMin??0),0),swim:sport('swim'),bike:sport('bike'),run:sport('run'),brick:sport('brick'),
   longestRun:Math.max(0,...sessions.filter(s=>s.sport==='run').map(s=>s.durationMin??0)),longestBike:Math.max(0,...sessions.filter(s=>s.sport==='bike').map(s=>s.durationMin??0))};});
}
export function progressionRisks(plan:ParsedPlan){
 const weeks=progressionExposure(plan),out:Record<string,number>={};
 for(let index=1;index<weeks.length;index++){
  const a=weeks[index-1],b=weeks[index];
  if(b.week!==a.week+1||a.type!=='load'||b.type!=='load'||a.race||b.race||/taper|recovery/i.test(`${a.phase} ${b.phase}`))continue;
  for(const key of ['total','swim','bike','run','brick','longestRun','longestBike'] as const)
   out[`${b.week}:${key}`]=a[key]>0?Math.max(0,b[key]/a[key]-1):b[key]>0?Infinity:0;
 }
 return out;
}
export function assessRepairQuality(before:V2Issue[],after:V2Issue[],beforePlan:ParsedPlan,afterPlan:ParsedPlan){
 const addedWarnings=warningDeltas(before,after).filter(d=>d.delta>0);
 const magnitude=(i:V2Issue)=>{const text=(i.message??'').replace(/^S\d+\s*:\s*/,'');const pct=Number(text.match(/(\d+(?:[.,]\d+)?)\s*%/)?.[1]?.replace(',','.'));
  if(!Number.isFinite(pct))return null;
  if(i.code==='polarization'&&/Z1.Z2/.test(text))return -pct;
  if(i.code==='lorang_categories')return /A\+B/.test(text)?pct:/% C/.test(text)?-pct:null;
  return null;};
 const worsenedWarningMagnitude=after.filter(i=>i.severity==='warning').flatMap(i=>{
  const now=magnitude(i);if(now===null)return [];
  const prior=before.filter(j=>j.severity==='warning'&&warningKey(j)===warningKey(i)).map(magnitude).filter((n):n is number=>n!==null);
  return prior.length&&now>Math.max(...prior)+1e-9?[warningKey(i)]:[];
 });
 const a=progressionRisks(beforePlan),b=progressionRisks(afterPlan);
 const worsenedProgression=Object.keys(b).filter(key=>b[key]>(a[key]??0)+1e-9);
 // All new warnings are protected, including unknown and contextual evidence; no scientific severity is rewritten.
 return {policy:WARNING_POLICY_VERSION,accepted:!addedWarnings.length&&!worsenedProgression.length&&!worsenedWarningMagnitude.length,reason:addedWarnings.length?'v3_rejected_new_warning':worsenedProgression.length?'v3_rejected_worsened_interweek_progression':worsenedWarningMagnitude.length?'v3_rejected_worsened_intensity_warning':'v3_quality_guard_passed',addedWarnings,worsenedProgression,worsenedWarningMagnitude};
}
