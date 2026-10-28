import{relativeCalendarContext,needsPreviousTrainingDay}from'./v14-relative-context';
import type{ParsedPlan,ParsedSession}from'@/lib/aiPlanParser';
import type{RepairWorkoutMetadata}from'../../supabase/functions/_shared/repairSportingEquivalence';
import{catalogueTrainingMinimaForWeek,declaredRaceSlotsForWeek}from'../../supabase/functions/_shared/catalogueTrainingMinima';
import{checkSessionCatalogue,catalogueEligibility}from'../../supabase/functions/_shared/sessionCatalogueContract';
import{isLevelPrerequisiteIncompatible}from'@/lib/plan/levelPrerequisiteCompatibility';
import{getDoctrineDomain}from'@/lib/zones/tfclDoctrine';
import type{V10Profile}from'./v10-profiles';import{V14_SPEC,type ProgressionModel}from'./v14-contract';
import{assessConditional,type Condition,type DecisionInput}from'./v14-state';
import{prospectivePool,targetedTiming,explicitDose,sourceSport}from'./v14-sources';
import{sourceContext}from'./v13-source-context';
export const DAY_NAMES=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
export interface ProspectiveRole{key:string;sport:string;index:number;kind:'long'|'endurance'|'technical'|'support';floor:number;currentCapacity:number;target:number;purpose:string;}
export interface ProspectiveSlot{key:string;week:number;day:number;role:ProspectiveRole;card:RepairWorkoutMetadata;minutes:number;timing:ReturnType<typeof targetedTiming>;recipe:ReturnType<typeof explicitDose>;input:DecisionInput;decision:ReturnType<typeof assessConditional>;originalCatalogue:ReturnType<typeof checkSessionCatalogue>;fallback:{status:'candidate_only';targetMax:number;action:string;preservesObjective:false;mustRevalidateWholeWeek:true;};}
export function rolesForWeek(p:V10Profile,week:number,model:ProgressionModel){
 const q=p.prep.weeklyQuotas[week],minima=catalogueTrainingMinimaForWeek(q.quota,p.config,week),low=['recovery','taper','race'].includes(q.weekType),roles:ProspectiveRole[]=[];
 for(const sport of['swim','bike','run','strength'])for(let index=0;index<(minima[sport as'run']?.min??0);index++){
  const long=index===0&&(sport==='bike'?q.floors.longRideWeekly:sport==='run'?q.floors.longRunWeekly:false);
  const floor=long?(sport==='bike'?q.floors.slLongRideMin??0:q.floors.slLongRunMin??0):0;
  const cap=long?p.longCaps[sport as'bike'|'run']:p.normalCaps[sport as keyof typeof p.normalCaps];
  const kind=long?'long':sport==='strength'?'support':sport==='bike'&&!low?'technical':'endurance';
  let target=sport==='swim'?(low?(index?35:30):q.phase==='base'?(index?50:55):(index?50:50)):sport==='strength'?(low?30:25):sport==='bike'?(long?(low?floor:cap):low?(q.phase==='taper'?30:45):80):long?(low?floor:Math.max(floor,p.focusSport==='run'?cap:floor)):low?25:45;
  if(long&&sport==='run'&&model==='blockwise_reassessment'&&!low){const from=week<=4?1:week<=8?5:9,to=Math.min(from+2,12);target=Math.max(target,...Array.from({length:to-from+1},(_,n)=>p.prep.weeklyQuotas[from+n].floors.slLongRunMin??0));}
  if(long&&model==='hold_current_envelope')target=Math.min(target,cap);
  roles.push({key:`${p.id}:${model}:S${week}:${sport}:${index}`,sport,index,kind,floor,currentCapacity:cap,target,purpose:sport==='strength'?(low?'movement support; not maximal strength or proven economy gain':'conditional trunk stability practice; no inferred strength capacity'):long?'discipline-specific sustained aerobic exposure; durability response must be assessed':kind==='technical'?'aero posture skill/endurance; not autonomous long endurance':sport==='swim'&&index?'technique practice; not a high-intensity quota':'maintain discipline-specific exposure in the existing doctrine domain'});
 }
 return roles;
}
function preferences(role:ProspectiveRole,p:V10Profile,week:number){const q=p.prep.weeklyQuotas[week],low=['recovery','taper','race'].includes(q.weekType);
 if(role.sport==='swim')return low?(role.index?['D_SWIM_TECHNIQUE_LIGHT','D_SWIM_REGEN','D_SWIM_EASY_PRO','D_RECOVERY_VAR_4_PRO','D_SWIM_TRI_REGEN_1000']:['D_SWIM_RECOVERY_EASY','D_SWIM_REGEN']):role.index?['C_SWIM_CATCH_FOCUS','C_SWIM_TRI_CATCH_PULL']:q.phase==='base'?['A_SWIM_CONTINUOUS_2K','A_SWIM_AEROBIC_MULTI_NAGES']:['A_SWIM_TRI_END_2500','A_SWIM_CONTINUOUS_2K'];
 if(role.sport==='strength')return low?['ENR_RECUP_MOBILITE_YOGA','V3_RECUP_YOGA_ATHLETE']:['A_STR_STABILITY_CORE','ENR_RECUP_MOBILITE_YOGA'];
 if(role.sport==='bike')return role.kind==='long'?['SEILER_BIKE_Z1_LONG','A_IM_BIKE_STEADY_LONG','V3_BIKE_Z2_ENDURANCE_LONG']:low?['D_BIKE_RECOVERY','D_BIKE_REGEN_60_PRO','D_RECOVERY_VAR_9_PRO','D_RECOVERY_VAR_6_PRO','V2_RECUP_VELO_REGENERATION','V3_BIKE_RECOVERY_SPIN','D_RECOVERY_VAR_3_PRO']:['C_IM_AERO_HOLD','C_BIKE_AERO_POSITION_DRILLS','C_BIKE_CADENCE'];
 return role.kind==='long'?(q.phase==='base'||q.weekType==='recovery'?['A_RUN_Z2_EASY','SEILER_RUN_Z1_EASY_LONG']:['A_IM_RUN_PACE','A_RUN_Z2_EASY','A_RUN_DURABILITY_LONG']):low?['D_RUN_REGEN','A_RUN_EASY_45_PRO','A_RUN_Z2_EASY','D_RUN_RECOVERY_30_PRO','D_MAR_REGEN','D_RECOVERY_VAR_2_PRO']:['A_RUN_EASY_45_PRO','A_RUN_Z2_EASY'];
}
function conditionsFor(p:V10Profile,week:number,role:ProspectiveRole,card:RepairWorkoutMetadata,timing:ReturnType<typeof targetedTiming>,original:ReturnType<typeof checkSessionCatalogue>){const cs:Condition[]=[];const add=(id:string,kind:Condition['kind'],requiredEvidence:string[],fallback:string)=>cs.push({id,kind,beforeWeek:week,requiredEvidence,fallback});
 if(!timing.timingCompleteForDeclaredRecipe)add('protocol_time','protocol_time',['complete original source including all repetitions, rests and peripheral elements timed within the reserved slot','individual stroke/technique times when needed; crawl CSS is not a backstroke/breaststroke time'],'use an independently timed compatible source or keep the slot pending; never truncate');
 for(const k of card.prerequisiteKeys)add('prerequisite:'+k,'prerequisite',['explicit evidence for source prerequisite '+k],'select a compatible source with established prerequisites or hold');
 if(/lendemain|apr[eè]s|post[- ]s[eé]ance/i.test(card.when))add('relative_source_context','prerequisite',['literal relative source context documented: '+card.when,'previous exposure and recovery actually compatible, not inferred from an empty previous day'],'keep context pending or select a genuinely applicable source');
 if(card.specialContext)add('context:'+card.specialContext,'prerequisite',['explicit confirmation of '+card.specialContext],'no contextual assumption; select another eligible source or hold');
 if(original.unknown.length)add('catalogue_unknown','prerequisite',original.unknown.map(x=>'resolve original catalogue unknown '+x),'keep the original unknown visible; no automatic approval');
 if(role.sport==='swim')add('swim_execution','competence',['complete required strokes/technique demonstrated under intended effort and within whole protocol time','shoulder symptoms, individual technique and recovery reviewed'],'conditional slot or source-specific conservative alternative; no fabricated distance capacity');
 if(role.sport==='strength')add('movement_competence','competence',['technique and exercise familiarity documented','individual loading and recovery compatible with endurance sessions'],'hold unestablished force prescription; movement support is not a force-dose substitute');
 if(role.kind==='technical')add('posture_response','competence',['stable posture during the complete unchanged bouts','no cervical/lumbar symptoms; recovery assessed'],'retain previously demonstrated shorter bouts/source if fully admissible; otherwise hold');
 if(week>1)add('recovery','recovery',['dated response to prior comparable exposure and whole preceding microcycle','no adverse symptoms or unresolved fatigue before this session'],'do not release on elapsed time; evaluate a conservative whole-week alternative or hold');
 if(role.kind==='long'||role.kind==='technical'||role.sport==='strength')add('whole_week_interaction','interaction',['combined swim/bike/run/muscle exposures and spacing reviewed','nutrition and hydration for prolonged work reviewed from individual history, no quantity or GI tolerance imputed'],'hold the affected exposure and revalidate the whole microcycle; disclose specificity loss');
 return cs;
}
export function buildProspectiveCalendar(p:V10Profile,model:ProgressionModel){
 if(p.family!=='ironman'||p.config.objective!=='IM'||p.config.weeksAvailable!==16)throw Error('IRONMAN_16_WEEK_CONTEXT_REQUIRED');
 if(!V14_SPEC.models.includes(model))throw Error('UNKNOWN_PROGRESSION_MODEL');
 const weeks:Array<{week:number;phase:string;type:string;budget:number;reservedMinutes:number;roles:ProspectiveRole[];slots:ProspectiveSlot[];unassigned:Array<{role:ProspectiveRole;reasons:unknown[]}>;events:Array<{day:number;sport:string;durationMin:null;title:string}>;days:Array<{day:number;kind:'training'|'rest'|'event';slotKeys:string[]}>;placement:{complete:boolean;nodes:number;reason:string|null};}> =[];
 let lastLongDays:number[]=[];
 for(let week=1;week<=16;week++){
  const q=p.prep.weeklyQuotas[week],roles=rolesForWeek(p,week,model),pool=prospectivePool(p,week),slots:ProspectiveSlot[]=[],unassigned:Array<{role:ProspectiveRole;reasons:unknown[]}>=[];
  for(const role of roles){const reasons:unknown[]=[];let chosen:ProspectiveSlot|null=null;
   for(const id of preferences(role,p,week)){if(slots.some(s=>s.card.id===id)){reasons.push({source:id,reason:'distinct_source_required_by_existing_final_validation'});continue;}const card=pool.find(c=>c.id===id&&sourceSport(c)===role.sport);if(!card){reasons.push({source:id,reason:'not_in_original_eligible_context_pool'});continue;}
    const timing=targetedTiming(card);let minutes=Math.max(role.target,timing.necessaryRange[0]);
    if(model==='hold_current_envelope')minutes=Math.max(Math.min(minutes,role.currentCapacity),timing.necessaryRange[0]);
    const eligibility=catalogueEligibility(card,{objective:p.config.objective,phase:q.phase,weekType:q.weekType}),domain=role.sport==='strength'?null:getDoctrineDomain('moderate_lt1');
    const hard=[...eligibility];if(timing.previousV13.fatalDurationConflict)hard.push('documented_source_recipe_conflict');if(minutes>timing.necessaryRange[1])hard.push('complete_declared_recipe_or_catalogue_max_exceeded');
    if(domain&&(card.mainZoneMax<1||card.mainZoneMax>Number(domain.zone.slice(1))))hard.push('outside_current_evidenced_domain_scope');
    if(isLevelPrerequisiteIncompatible(card.id,{trainingLevel:p.config.ambitionMeta!.trainingLevel,trainingLevelSource:p.config.ambitionMeta!.trainingLevelSource}))hard.push('declared_training_level_incompatible');
    const allowed=p.availableDays.filter(day=>sourceContext(card,p,week,day,q.weekType).compatible);if(!allowed.length)hard.push('literal_source_placement_impossible');
    if(hard.length){reasons.push({source:id,hard});continue;}
    const original=checkSessionCatalogue({sport:role.sport,catalogId:card.id,title:card.title,details:card.structure,durationMin:minutes,zones:card.zones},{objective:p.config.objective,phase:q.phase,weekType:q.weekType,catalog:[card]});if(original.errors.length){reasons.push({source:id,original});continue;}
    const profileFailures=[...(!p.config.identifiedLimitersRaw?.length||!p.config.physiologicalTrace?['limiter_or_uncertainty_evidence_missing']:[]),...(!p.config.loadHistory?['training_history_missing']:[])];
    const input:DecisionInput={week,assessedWeek:1,minutes,currentCapacity:role.currentCapacity,hardFailures:profileFailures,conditions:conditionsFor(p,week,role,card,timing,original)};
    chosen={key:role.key,week,day:-1,role,card,minutes,timing,recipe:explicitDose(card,minutes),input,decision:assessConditional(input),originalCatalogue:original,fallback:{status:'candidate_only',targetMax:role.currentCapacity,action:'retain a complete source-compatible dose inside the last demonstrated envelope, then rerun the entire week; if native floor/specificity no longer satisfied, preserve that non-conformity and hold the Ironman claim',preservesObjective:false,mustRevalidateWholeWeek:true}};break;
   }
   if(chosen)slots.push(chosen);else unassigned.push({role,reasons});
  }
  const events=declaredRaceSlotsForWeek(p.config,week).map(e=>({day:DAY_NAMES.indexOf(e.dayName),sport:e.sport,durationMin:null,title:'🏁 Jour J — compétition Ironman déclarée, durée inconnue'}));
  const days=Array.from({length:7},(_,day)=>({day,slots:[]as ProspectiveSlot[]}));let nodes=0;const ordered=[...slots].sort((a,b)=>Number(b.role.kind==='long')-Number(a.role.kind==='long')||a.key.localeCompare(b.key));
  function visit(k:number):boolean{if(++nodes>V14_SPEC.nodeBudget)return false;if(k===ordered.length)return days.filter(d=>!d.slots.length&&!events.some(e=>e.day===d.day)).length>=p.minRest&&slots.every(s=>relativeCalendarContext(s.card,week,s.day,q.weekType,slots,weeks.flatMap(w=>w.slots)).status!=='fail');
   const slot=ordered[k];for(const day of [...p.availableDays].sort((a,b)=>days[a].slots.length-days[b].slots.length||a-b)){
    if(days[day].slots.length>=p.maxDaily||days[day].slots.some(s=>s.role.sport===slot.role.sport)||events.some(e=>e.day===day)||!sourceContext(slot.card,p,week,day,q.weekType).compatible)continue;
    if(needsPreviousTrainingDay(slot.card.when,q.weekType)&&day>0&&!p.availableDays.some(available=>available===day-1))continue;
    const absolute=(week-1)*7+day;if(slot.role.kind==='long'&&(lastLongDays.some(d=>Math.abs(absolute-d)<=1)||days.some(d=>Math.abs(d.day-day)<=1&&d.slots.some(s=>s.role.kind==='long'))))continue;
    days[day].slots.push(slot);slot.day=day;if(visit(k+1))return true;days[day].slots.pop();slot.day=-1;
   }return false;
  }
  const placed=visit(0);if(placed)lastLongDays=slots.filter(s=>s.role.kind==='long').map(s=>(week-1)*7+s.day);else for(const s of slots){s.input.hardFailures.push('whole_week_placement_not_demonstrated');s.decision=assessConditional(s.input);}
  const budget=Math.min((p.config.weeklyHours??0)*60,q.volumeBudget?.maxMinutes??Infinity);let excess=Math.max(0,slots.reduce((n,s)=>n+s.minutes,0)-budget);
  // Reduce only a genuinely flexible, completely described timed recipe. Never shrink an unknown swim protocol to make it fit.
  const donors=slots.filter(s=>s.timing.timingCompleteForDeclaredRecipe).sort((a,b)=>Number(a.role.sport===p.focusSport)-Number(b.role.sport===p.focusSport)||a.key.localeCompare(b.key));
  for(const s of donors){const lower=Math.max(s.timing.necessaryRange[0],model==='hold_current_envelope'?Math.min(s.role.floor,s.role.currentCapacity):s.role.floor),take=Math.min(excess,Math.max(0,s.minutes-lower));if(!take)continue;s.minutes-=take;s.input.minutes=s.minutes;s.recipe=explicitDose(s.card,s.minutes);s.decision=assessConditional(s.input);excess-=take;if(excess<=0)break;}
  const reservedMinutes=slots.reduce((n,s)=>n+s.minutes,0);
  if(reservedMinutes>budget)for(const s of slots){s.input.hardFailures.push('whole_week_budget_exceeded');s.decision=assessConditional(s.input);}
  weeks.push({week,phase:q.phase??'unknown',type:q.weekType,budget,reservedMinutes,roles,slots,unassigned,events,days:days.map(d=>({day:d.day,kind:events.some(e=>e.day===d.day)?'event':d.slots.length?'training':'rest',slotKeys:d.slots.map(s=>s.key)})),placement:{complete:placed,nodes,reason:placed?null:nodes>V14_SPEC.nodeBudget?'bounded_placement_inconclusive':'calendar_constraints_conflict'}});
 }
 const all=weeks.flatMap(w=>w.slots),complete=weeks.every(w=>!w.unassigned.length&&w.placement.complete&&w.reservedMinutes<=w.budget&&w.days.length===7)&&!all.some(s=>s.decision.state==='not_admissible');
 const plan:ParsedPlan={title:`Plan TFCL™ — IM Synthétique V14 ${p.id} (${model}, conditionnel NON APPROUVÉ) — 16 semaines`,totalWeeks:16,weeklyQuotas:p.prep.weeklyQuotas,phases:[...new Set(weeks.map(w=>w.phase))].map(phase=>({name:phase,weeks:weeks.filter(w=>w.phase===phase).map(w=>w.week).join(','),objective:'candidate phase from native generation context; actual adaptation unknown'})),weeks:weeks.map(w=>({weekNumber:w.week,phase:w.phase,theme:w.type,sessions:w.days.flatMap<ParsedSession>(d=>{const active:ParsedSession[]=w.slots.filter(s=>s.day===d.day).map(s=>({weekNumber:w.week,weekTheme:w.type,phase:w.phase,dayName:DAY_NAMES[d.day],dayIndex:d.day,sport:s.role.sport,title:s.card.title,details:s.card.structure,catalogId:s.card.id,durationMin:s.minutes,zones:s.card.zones,isRest:false,custom:false,isKeySession:s.role.kind==='long'}));const event=w.events.find(e=>e.day===d.day);if(event)active.push({weekNumber:w.week,weekTheme:w.type,phase:w.phase,dayName:DAY_NAMES[d.day],dayIndex:d.day,sport:event.sport,title:event.title,details:'Événement déclaré uniquement ; durée et charge de compétition inconnues.',catalogId:null,zones:[],isRest:false,custom:true,isKeySession:false});return active.length?active:[{weekNumber:w.week,weekTheme:w.type,phase:w.phase,dayName:DAY_NAMES[d.day],dayIndex:d.day,sport:'rest',title:'Repos prévu',details:'Absence de séance planifiée ; récupération réelle non attestée.',durationMin:0,isRest:true}];})}))};
 return{version:'det-v14-1',profile:p.id,model,weeks,calendar:plan,prospectiveCalendarComplete:complete,currentlyAdmissibleSlots:all.filter(s=>s.decision.state==='currently_admissible').length,conditionalSlots:all.filter(s=>s.decision.state==='conditional_pending_reassessment').length,notAdmissibleSlots:all.filter(s=>s.decision.state==='not_admissible').length,unassignedRoles:weeks.flatMap(w=>w.unassigned.map(x=>({week:w.week,...x}))),actualApprovedPlan:null,sportinglyConformantClaimed:false,expertReviewed:false,plannedAdaptationObtained:false,scope:'prospective reservations and conditional decisions, not an executable or sportingly compliant prescription'};
}
export type ProspectiveCalendar=ReturnType<typeof buildProspectiveCalendar>;
