/** Candidate taper contracts; reference validators are always run separately. */
import type{ParsedPlan}from'@/lib/aiPlanParser';
import{isRaceDaySession}from'../../supabase/functions/_shared/raceDayIdentity';
export const TAPER_MODELS=['easy_only','race_eve_catalogue','maintain_catalogue_intensity']as const;
export type TaperModel=typeof TAPER_MODELS[number];
export interface TaperEvidence{week:number;session:number;raceEveOrTwoDays:boolean;catalogueVerified:boolean;sourceActivation:boolean;explicitIntensityMinutes:number|null;coachIntensityMinutesCap:number|null;}
export function auditTaperContract(plan:ParsedPlan,model:TaperModel,evidence:TaperEvidence[]=[]){
 const issues:Array<{week:number;code:string;severity:'error'|'unknown';evidence:unknown}>=[];
 const rows=plan.weeks.map(w=>{const type=plan.weeklyQuotas?.[w.weekNumber]?.weekType,active=w.sessions.map((s,session)=>({s,session})).filter(({s})=>!s.isRest&&!isRaceDaySession(s));
  const volume=active.reduce((n,{s})=>n+(s.durationMin??0),0);const intensity=active.filter(({s})=>Math.max(0,...(s.zones??[]).flatMap(z=>[...z.matchAll(/Z\s*([1-7])/gi)].map(m=>+m[1])))>2);
  for(const {s,session}of intensity){const e=evidence.find(e=>e.week===w.weekNumber&&e.session===session);let code:string|undefined;
   if(type==='recovery')code='ordinary_recovery_intensity_not_allowed';
   else if(type==='taper'||type==='race'){
    if(model==='easy_only')code='candidate_easy_only_intensity';
    else if(!e?.catalogueVerified)code='activation_catalogue_evidence_missing';
    else if(model==='race_eve_catalogue'&&(!e.sourceActivation||!e.raceEveOrTwoDays))code='activation_role_or_date_unproven';
    else if(e.explicitIntensityMinutes===null||e.coachIntensityMinutesCap===null)code='intensity_fatigue_dose_unknown';
    else if(!Number.isFinite(e.explicitIntensityMinutes)||!Number.isFinite(e.coachIntensityMinutesCap)||e.explicitIntensityMinutes<0||e.coachIntensityMinutesCap<0)code='invalid_explicit_intensity_contract';
    else if(e.explicitIntensityMinutes>e.coachIntensityMinutesCap)code='coach_intensity_cap_exceeded';
   }
   if(code)issues.push({week:w.weekNumber,code,severity:code.includes('unknown')||code.includes('missing')||code.includes('unproven')?'unknown':'error',evidence:{id:s.catalogId,session,e}});
  }
  return{week:w.weekNumber,type,trainingMinutes:volume,intenseSessions:intensity.length,raceMinutesExcluded:w.sessions.filter(isRaceDaySession).reduce((n,s)=>n+(s.durationMin??0),0)};
 });
 for(const r of rows.filter(r=>r.type==='taper'||r.type==='race')){const recent=rows.filter(p=>p.week<r.week&&p.type==='load').slice(-3);if(!recent.length)issues.push({week:r.week,code:'taper_load_reference_unknown',severity:'unknown',evidence:null});else{const mean=recent.reduce((n,r)=>n+r.trainingMinutes,0)/recent.length;if(r.trainingMinutes>=mean)issues.push({week:r.week,code:'taper_volume_not_reduced',severity:'error',evidence:{mean,observed:r.trainingMinutes}});}}
 return{version:'det-v5-taper-1',model,rows,issues,passesExecutedContract:issues.length===0,physiology:'candidate_requires_independent_review',fatigueResponse:'not_attested',referenceValidatorsModified:false};
}
