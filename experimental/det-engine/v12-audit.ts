import type{V10Profile}from'./v10-profiles';
import type{ParsedPlan}from'@/lib/aiPlanParser';
import{auditSportsContinuity}from'./v2-sports-validation';
import{literalDose}from'./v10-source-dose';
import type{Offer}from'./v10-allocation';
import{buildMesocycle}from'./v11-mesocycle';
export function intervalEvidence(o:Offer) {
 const m=o.card.structure.match(/\b(\d+)\s*[x×]\s*(\d+)\s*['’].*\br\s*=\s*(\d+)\s*['’]/i);
 if(!m)return{source:o.card.id,workMinutes:null,uninterruptedBout:null,betweenRestMinutes:null,workFractionBounds:null,actualMetabolicDose:null};
 const count=+m[1],bout=+m[2],rest=+m[3],literal=literalDose(o.card);
 return{source:o.card.id,count,uninterruptedBout:bout,workMinutes:count*bout,perIntervalRest:rest,betweenRestMinutes:(count-1)*rest,lastRest:'bounded_source_ambiguity',literalTotalRange:literal.range,workFractionBounds:literal.range?[count*bout/literal.range[1],count*bout/literal.range[0]]:null,actualMetabolicDose:null};
}
export function baselineAudit(p:V10Profile,b=buildMesocycle(p)) {
 const occurrence=new Map<string,number>();
 const weeks=b.weeks.map(w=>{
  const total=w.offers.reduce((n,o)=>n+o.minutes,0);
  const bySport=Object.fromEntries(['swim','bike','run','strength'].map(s=>[s,w.offers.filter(o=>o.role.sport===s).reduce((n,o)=>n+o.minutes,0)]));
  const repeated=w.offers.filter(o=>occurrence.has(o.card.id)).map(o=>({source:o.card.id,priorOccurrences:occurrence.get(o.card.id)}));
  for(const o of w.offers)occurrence.set(o.card.id,(occurrence.get(o.card.id)??0)+1);
  return{week:w.context.week,type:w.context.weekType,total,bySport,repeated,frequencies:Object.fromEntries(['swim','bike','run','strength'].map(s=>[s,w.offers.filter(o=>o.role.sport===s).length])),longs:w.offers.filter(o=>o.role.kind==='long').map(o=>({sport:o.role.sport,source:o.card.id,minutes:o.minutes})),position:w.offers.filter(o=>o.role.kind==='technical').map(intervalEvidence),fullRestDays:w.validation.week.sessions.filter(s=>s.isRest).length,unknowns:w.validation.unknowns};
 });
 const last=weeks[2],recovery=weeks[3];
 return{profile:p.id,weeks,sourceOccurrences:Object.fromEntries(occurrence),recovery:{referenceWeek:last.week,reference:last.total,prescribed:recovery.total,observedPrescriptionRatio:recovery.total/last.total,notATargetPercentage:true,disciplineRatios:Object.fromEntries(Object.keys(last.bySport).map(s=>[s,recovery.bySport[s]/last.bySport[s]]))},missingStimuli:[{role:'dedicated_swim_technique',status:'not_demonstrated',reason:'multi-nages variation is not a stroke diagnosis, measured technical progression or targeted correction'},{role:'actual_strength',status:'absent',reason:'mobility/yoga is not high-load strength, strength-endurance or measured economy improvement'},{role:'race_nutrition',status:'not_executable',reason:'long-source prose may mention feeding but no individualized protocol or tolerance evidence'},{role:'brick',status:'absent_in_base_block',reason:'not inserted to satisfy optional label; later components and post-bike ability must be established'},{role:'late_IM_long_dose',status:'outside_covered_preparation',reason:'early individualized floors passed; later long-dose continuity not demonstrated'}],adaptationObserved:false};
}
/** Categorize original diagnostics with witnesses; never changes severity or conformity. */
export function issueWitnesses(p:V10Profile,plan:ParsedPlan,issues:ReturnType<typeof buildMesocycle>['legacy']) {
 const audit=auditSportsContinuity({...plan,totalWeeks:p.config.weeksAvailable??16},p.config);
 return(issues??[]).map(issue=>{
  let classification='sporting_or_methodological_incompatibility',reason='Original diagnostic retained; not dismissed by a candidate pass';let witness:unknown=null;
  if(issue.code==='calendar_coverage'||issue.code==='race_day'){classification='scope';reason='four-week base block is not a complete16-week race preparation';witness={observedWeeks:plan.weeks.length,expected:p.config.weeksAvailable,blockRace:false};}
  if(['triathlon_discipline_continuity','triathlon_training_frequency'].includes(issue.code)){
   const c=audit.controls.find(c=>c.id===issue.code),e=c?.evidence as{frequencyDeficits?:unknown[];violations?:unknown[];missingContracts?:number[]}|undefined;
   const actualDeficits=e?.frequencyDeficits??e?.violations??[];
   classification=actualDeficits.length?'sporting_or_methodological_incompatibility':'scope';reason=actualDeficits.length?'actual covered-week deficit exists; incomplete preparation alone does not explain it':'original source explicitly also fails on incomplete full calendar; actual covered-week deficits are empty';witness=e;
  }
  if(issue.code==='title_format'){classification='technical_format_scope';reason='block label intentionally is not full-race-plan H1; no general serialization failure inferred';}
  if(['catalogue_contract','coach_load_violation','quota_floor_violation','prohibition_compliance','injury_risk_compliance'].includes(issue.code)){classification='technical_or_sporting_blocker';reason='real applicable guard; never exempt by scope';}
  if(issue.code==='anti_repetition'||issue.code==='layout_drift'){classification='programming_warning';reason='real source reuse or deviation from native expected layout, not physiological failure proved by itself';}
  return{original:issue,classification,reason,witness};
 });
}
