export type Admissibility='currently_admissible'|'conditional_pending_reassessment'|'not_admissible';
export type ConditionKind='capacity'|'protocol_time'|'prerequisite'|'recovery'|'competence'|'interaction';
export interface Condition{id:string;kind:ConditionKind;beforeWeek:number;requiredEvidence:string[];fallback:string;}
export interface DecisionInput{week:number;assessedWeek:number;minutes:number;currentCapacity:number|null;hardFailures:string[];conditions:Condition[];}
/** Eligibility at the stated evidence scope; never an operational prescription approval. */
export function assessConditional(i:DecisionInput){
 const hard=[...i.hardFailures];if(!Number.isInteger(i.week)||i.week<1||!Number.isInteger(i.assessedWeek)||i.assessedWeek<1||i.assessedWeek>i.week)hard.push('invalid_assessment_time_scope');if(i.currentCapacity!==null&&(!Number.isFinite(i.currentCapacity)||i.currentCapacity<0))hard.push('invalid_capacity_evidence');if(new Set(i.conditions.map(c=>c.id)).size!==i.conditions.length||i.conditions.some(c=>c.beforeWeek!==i.week||!c.requiredEvidence.length||!c.fallback))hard.push('invalid_condition_frame');if(!Number.isFinite(i.minutes)||i.minutes<=0)hard.push('invalid_dose');
 const over=i.currentCapacity!==null&&i.minutes>i.currentCapacity;
 if(over&&i.week<=i.assessedWeek)hard.push('present_dose_exceeds_documented_envelope');
 const conditions=[...i.conditions];
 if(i.currentCapacity===null||over)conditions.push({id:'capacity',kind:'capacity',beforeWeek:i.week,requiredEvidence:['dated source-specific coach reassessment of admissible envelope','completed comparable effort and subsequent recovery; not predicted adaptation','whole-microcycle interactions reviewed'],fallback:'retain a source-compatible dose within the last demonstrated envelope, revalidate the whole week and disclose any programming shortfall; otherwise hold'});
 const state:Admissibility=hard.length?'not_admissible':conditions.length?'conditional_pending_reassessment':'currently_admissible';
 return{state,hardFailures:[...new Set(hard)],conditions,currentlyDocumentedCapacity:i.currentCapacity,proposedMinutes:i.minutes,capacityAlreadyAcquired:!over&&i.currentCapacity!==null,operationallyApproved:false,expertReviewed:false};
}
export interface EvidenceItem{conditionId:string;sessionKey:string;assessedWeek:number;validThroughWeek:number;sourceId:string;protocolUnchanged:boolean;coachReviewed:boolean;response:'favourable'|'adverse'|'unknown';recovered:boolean|null;symptoms:boolean|null;envelopeMinutes:number|null;protocolElapsedMinutes:number|null;synthetic:boolean;}
/** Simulated evidence is isolated from the immutable prospective calendar and never a real authorization. */
export function resolveInSimulation(input:DecisionInput,sessionKey:string,sourceId:string,evidence:EvidenceItem[]){
 const initial=assessConditional(input),rejected:Array<{id:string;reason:string}>=[],remaining:Condition[]=[];
 for(const c of initial.conditions){const matches=evidence.filter(e=>e.conditionId===c.id&&e.sessionKey===sessionKey&&e.sourceId===sourceId);const e=matches.at(-1);
  if(matches.some(x=>Number.isInteger(x.assessedWeek)&&x.assessedWeek<=input.week&&(x.response==='adverse'||x.symptoms===true||x.recovered===false))){remaining.push(c);rejected.push({id:c.id,reason:'adverse_response_hold'});continue;}
  if(!e||!Number.isInteger(e.assessedWeek)||!Number.isInteger(e.validThroughWeek)||e.assessedWeek<1||e.validThroughWeek<e.assessedWeek||e.assessedWeek>input.week||e.validThroughWeek<input.week||!e.protocolUnchanged||!e.coachReviewed||!e.synthetic){remaining.push(c);rejected.push({id:c.id,reason:'missing_stale_wrong_scope_or_unreviewed_evidence'});continue;}
  if(e.response==='adverse'||e.symptoms===true||e.recovered===false){rejected.push({id:c.id,reason:'adverse_response_hold'});remaining.push(c);continue;}
  const common=e.response==='favourable'&&e.recovered===true&&e.symptoms===false;
  const dose=c.kind!=='capacity'||e.envelopeMinutes!==null&&Number.isFinite(e.envelopeMinutes)&&e.envelopeMinutes>=input.minutes;
  const time=c.kind!=='protocol_time'||e.protocolElapsedMinutes!==null&&Number.isFinite(e.protocolElapsedMinutes)&&e.protocolElapsedMinutes>0&&e.protocolElapsedMinutes<=input.minutes;
  if(common&&c.kind==='capacity'&&e.envelopeMinutes!==null&&Number.isFinite(e.envelopeMinutes)&&e.envelopeMinutes<input.minutes){remaining.push(c);rejected.push({id:c.id,reason:'reassessed_envelope_insufficient'});continue;}
  if(!common||!dose||!time){remaining.push(c);rejected.push({id:c.id,reason:'condition_not_demonstrated'});}
 }
 const adverse=rejected.some(r=>r.reason==='adverse_response_hold');
 const state:Admissibility=initial.hardFailures.length||adverse||rejected.some(r=>r.reason==='reassessed_envelope_insufficient')?'not_admissible':remaining.length?'conditional_pending_reassessment':'currently_admissible';
 return{state,remaining,rejected,simulationOnly:true,actualOperationalApproval:false,actualAdaptationDemonstrated:false,initialState:initial.state};
}
