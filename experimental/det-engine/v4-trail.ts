/** Complete experimental trail calendar from explicit synthetic coach contracts and real catalogue cards. */
import type{ParsedPlan,ParsedSession}from'@/lib/aiPlanParser';import type{PlanAthleteData,PlanConfig}from'@/hooks/useAITrainingPlan';
import{prepareGenerationContracts}from'@/lib/plan/prepareGenerationContracts';import{buildPeriodizationCalendar}from'@/lib/plan/periodizationCalendar';
import{inferWeekType,buildCoachVolumeBudget,type WeeklyQuota}from'@/engines/plan/sessionSizingMatrix';import{derivePhasesFromWeeks}from'@/engines/plan/planValidator';
import{WorkoutLibrary}from'@/lib/workoutLibrary';import{LIMITER_SESSION_PATTERNS,resolveLimiterKey}from'@/lib/limiterSessionPatterns';
import{checkSessionCatalogue}from'../../supabase/functions/_shared/sessionCatalogueContract';import{evaluateRepairSportingEquivalence,normalizeRepairSport}from'../../supabase/functions/_shared/repairSportingEquivalence';
import{validateExperimentalCandidate}from'./v2-validation';import{auditTechnicalPlan}from'./v2-technical-validation';import{auditGlobalProgression,type ExposureDose}from'./v4-progression';import type{TrailFixture}from'./v4-trail-fixtures';
import{generationEligibility}from'./v4-generation-eligibility';
import{minimumDistinctDose}from'./v4-distinct-dose';
export type TrailCalendarModel='separated_exposure'|'specific_back_to_back'|'conservative_taper';export const TRAIL_CALENDAR_MODELS:TrailCalendarModel[]=['separated_exposure','specific_back_to_back','conservative_taper'];
const DAYS=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
export function generateTrailPlan(athlete:PlanAthleteData,config:PlanConfig,f:TrailFixture,model:TrailCalendarModel){
 const common={version:'det-v4-trail-calendar-3',fixtureId:f.id,model,synthetic:true,humanReviewRequired:true,sportingRelevance:'not_attested'};
 const refuse=(reason:string,evidence:unknown)=>({...common,status:'refused' as const,technicallyConstructed:false,reason,evidence});
 if(!Number.isFinite(f.event.distanceKm)||f.event.distanceKm<=0||!Number.isFinite(f.event.elevationGainM)||f.event.elevationGainM<0||f.event.elevationLossM!=null&&(!Number.isFinite(f.event.elevationLossM)||f.event.elevationLossM<0))return refuse('explicit_event_geometry_invalid',f.event);
 if(model==='specific_back_to_back'&&!f.coach.backToBack)return refuse('synthetic_coach_has_not_authorized_back_to_back',f.coach);
 if(new Set([...f.coach.runDays,f.coach.strengthDay]).size!==f.coach.runDays.length+1||!f.coach.runDays.includes(5)||f.coach.runDays.some(d=>d<0||d>6))return refuse('contradictory_synthetic_calendar',f.coach);
 const prep=prepareGenerationContracts(athlete,config,{rotationSeed:0}),calendar=buildPeriodizationCalendar(config),byId=new Map(WorkoutLibrary.map(w=>[w.id,w]));
 const metadata=[...new Map([...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()].map(m=>[m.id,m])).values()];
 const plan:ParsedPlan={title:`Plan TFCL™ — ${f.objective} QA offline — ${f.weeks} semaines`,phases:[],totalWeeks:f.weeks,weeks:[],weeklyQuotas:{}};
 const ledger:ExposureDose[]=[],selection=[];const usage=new Map<string,number>();
 const limiterKeys=(config.identifiedLimitersRaw??[]).map(resolveLimiterKey).filter((k):k is string=>!!k);
 let loadIndex=0,previousLoad:number|undefined;
 for(let week=1;week<=f.weeks;week++){
  const phase=calendar?.[week]??'base',type=inferWeekType(week,f.weeks,f.objective,athlete.age,config.deloadCadenceWeeks),race=week===f.weeks;
  if(type==='load')loadIndex++;
  const context={objective:f.objective,phase,weekType:type,operation:'insertion' as const};
  const eligible=metadata.filter(m=>generationEligibility(m,context,f.confirmedPrerequisites).compatible)
   .filter(m=>/trail|TR_|URBAN_|sentier|montée|descente|proprio/i.test(`${m.id} ${m.title} ${m.tags.join(' ')}`))
   .filter(m=>f.eccentricFamiliarization==='documented_synthetic'||!/descente rapide|DESCENTE_RAPIDE|pliom|plyo/i.test(`${m.id} ${m.title}`));
  const activeDays=race?[1,3,4]:type==='taper'?[1,3,5]:type==='recovery'?[1,3,5]:f.coach.runDays;
  const roles=activeDays.map(day=>({day,role:race&&day===4&&f.coach.maxMainZone>=3&&model!=='conservative_taper'?'activation':type==='recovery'||type==='taper'||race?'easy':day===5?'long':day===6&&model==='specific_back_to_back'?'b2b_second':day===1&&f.coach.maxMainZone>=3&&phase!=='base'?'ascent':'easy',sport:'run'}));
  roles.push({day:f.coach.strengthDay,role:type==='load'?'muscle':'mobility',sport:'strength'});
  if(race)roles.push({day:6,role:'race',sport:'run'});
  roles.sort((a,b)=>a.day-b.day);
  const nRun=roles.filter(r=>r.sport==='run').length,nStrength=roles.filter(r=>r.sport==='strength').length;
  const range=(n:number)=>({min:n,max:n});const quota:WeeklyQuota={swim:range(0),bike:range(0),run:range(nRun),brick:range(0),strength:range(nStrength),totalSessions:range(roles.length),maxSessionsPerDay:1,minFullRestDays:7-roles.length,source:{tier:'elite_practice',ref:'EXPERIMENTAL explicit synthetic coach calendar; not a validated TFCL trail quota'}};
  const inheritedBudget=buildCoachVolumeBudget(config.volumeRamp,week,type,config.weeklyHoursSource);
  const maxMinutes=Math.min(f.coach.weeklyMinutes,inheritedBudget?.maxMinutes??Infinity,previousLoad!==undefined&&type==='recovery'?previousLoad*.7:Infinity);
  const inheritedRate=inheritedBudget?.weeklyIncreasePctMax??config.volumeRamp?.weeklyIncreasePctMax;
  plan.weeklyQuotas![week]={quota,floors:{minStrengthPerWeek:nStrength,longRunWeekly:type==='load'},weekType:type,downgraded:false,phase,
   volumeBudget:inheritedRate===undefined?undefined:{globalWeek:week,maxMinutes,weeklyIncreasePctMax:inheritedRate,referenceSource:'coach'}};
  const sessions:ParsedSession[]=[],used=new Set<string>();let total=0;
  for(const role of roles){
   if(role.role==='race'){sessions.push({weekNumber:week,weekTheme:phase,phase,dayName:DAYS[role.day],dayIndex:role.day,sport:'run',title:`COURSE : ${f.objective}`,details:`Épreuve synthétique déclarée : ${f.event.distanceKm}km ; ${f.event.elevationGainM}m D+ ; D− ${f.event.elevationLossM??'inconnu'} ; durée cible fournie ${f.event.targetTimeMinutes}min, non prédite.`,durationMin:f.event.targetTimeMinutes,isRest:false,isKeySession:true,custom:true,zones:[]});continue;}
   const targetLong=Math.min(f.coach.longPeak,f.coach.longStart+(f.coach.longPeak-f.coach.longStart)*Math.min(1,(loadIndex-1)/Math.max(1,f.weeks-5)));
   const target=role.role==='long'?targetLong:role.role==='b2b_second'?targetLong*.7:role.sport==='strength'?30:type==='recovery'?30:type==='taper'||race?35:60;
   const domainFor=(role:typeof roles[number])=>eligible.filter(m=>normalizeRepairSport(m.sport)===role.sport&&!used.has(m.id)&&m.mainZoneMax<=f.coach.maxMainZone)
    .filter(m=>!(role.day<5&&/montagne|mountain|EXPE_HORS_VILLE/i.test(`${m.id} ${m.title}`)&&f.terrain!=='montagne'))
    .filter(m=>role.role==='activation'?m.id==='D_TR_TAPER_ACTIVATION':m.id!=='D_TR_TAPER_ACTIVATION')
    .filter(m=>{
     const text=`${m.id} ${m.title} ${m.tags.join(' ')}`;
     if(role.role==='long')return m.intentFamily!=='recuperation'&&!/^D_/i.test(m.id)&&m.mainZoneMax<=2&&/long|SL_|marche.course|rando/i.test(text)&&(f.objective!=='TrailUltra'||(phase==='base'?m.id==='A_TR_SL_MONTAGNE_BASE':['A_TR_SL_ULTRA_BUILD','A_TR_SL_PEAK','A_TR_MARCHE_COURSE_ULTRA','A_TR_B2B_SAM'].includes(m.id)))&&!(f.objective==='TrailUltra'&&phase!=='base'&&loadIndex%2===0&&!/marche.course/i.test(text));
     if(role.role==='b2b_second')return m.id==='A_TR_B2B_DIM';
     if(role.role==='ascent')return /montée|côte|ascen/i.test(text)&&m.mainZoneMax>=3;
     if(role.role==='muscle')return /force|excentri|proprio/i.test(text);
     if(role.role==='mobility')return /mobilité|mobilite|proprio/i.test(text);
     return m.mainZoneMax<=2&&!/B2B|back.to.back|EXPE_|activation|nocturn/i.test(text);
    })
;
   const remainingRoles=roles.slice(roles.indexOf(role)+1).filter(r=>r.role!=='race');
   const remainingDomains=remainingRoles.map(next=>domainFor(next).flatMap(m=>{
    const min=Math.ceil(m.durationMin[0]);if(next.role==='long'&&min>f.coach.longPeak)return[];
    const check=checkSessionCatalogue({catalogId:m.id,title:m.title,details:m.structure,sport:next.sport,durationMin:min,zones:m.zones},{...context,catalog:metadata});
    return check.errors.length||check.unknown.length?[]:[{id:m.id,min}];
   }));
   const pool=domainFor(role)
    .flatMap(m=>{
     const remainingMinimum=minimumDistinctDose(remainingDomains.map(domain=>domain.filter(c=>c.id!==m.id)));
     const maximumCurrent=Math.floor(maxMinutes-total-remainingMinimum);
     const dose=Math.max(Math.ceil(m.durationMin[0]),Math.min(Math.floor(m.durationMin[1]),Math.round(target),maximumCurrent));
     if(dose>maximumCurrent||role.role==='long'&&dose>f.coach.longPeak||total+dose>maxMinutes)return[];
     const route=f.routeEvidence[m.id],vertical=byId.get(m.id)?.dPlusTargetM,dplus=typeof vertical==='number'?{min:vertical,max:vertical}:vertical;
     if(route&&dplus&&(route.dPlusM<dplus.min||route.dPlusM>dplus.max))return[];
     const s:ParsedSession={weekNumber:week,weekTheme:phase,phase,dayName:DAYS[role.day],dayIndex:role.day,sport:role.sport,title:m.title,details:m.structure,catalogId:m.id,durationMin:dose,isRest:false,custom:false,isKeySession:m.mainZoneMax>=3,zones:m.zones};
     const contract=checkSessionCatalogue(s,{...context,catalog:metadata});if(contract.errors.length||contract.unknown.length)return[];
     const limiterRank=limiterKeys.findIndex(k=>LIMITER_SESSION_PATTERNS[k]?.test(textFor(m)));
     return[{m,s,dose,score:Math.abs(dose-target)+(usage.get(m.id)??0)*2+(limiterRank<0?5:limiterRank),route,dplus}];
    }).sort((a,b)=>a.score-b.score||a.m.id.localeCompare(b.m.id));
   if(!pool.length)return refuse('trail_role_has_no_catalogue_dose_within_candidate_contract',{week,phase,type,role,remainingMinutes:maxMinutes-total,maxMinutes,partialWeeks:plan.weeks.length,
    requestedActivation:role.role==='activation'?metadata.filter(m=>m.id==='D_TR_TAPER_ACTIVATION').map(m=>({id:m.id,eligibility:generationEligibility(m,context,f.confirmedPrerequisites)})):undefined});
   const {m,s,dose,route,dplus}=pool[0];used.add(m.id);usage.set(m.id,(usage.get(m.id)??0)+1);total+=dose;
   const text=textFor(m);ledger.push({week,session:sessions.length,dPlusM:role.sport==='strength'?0:route?.dPlusM??dplus?.min??null,dMinusM:role.sport==='strength'?0:route?.dMinusM??null,eccentric:/excentri|eccentric|descente/i.test(text),runWalk:/marche|rando|hike/i.test(text),source:route?.source??(dplus?'structured_catalogue_dplus_lower_endpoint':'unknown_vertical_dose')});
   sessions.push(s);selection.push({week,day:role.day,role:role.role,id:m.id,duration:dose,source:'existing_phase_goal_level_catalogue',generationEligibility:generationEligibility(m,context,f.confirmedPrerequisites),limiterPriorities:config.identifiedLimitersRaw??[]});
  }
  for(let day=0;day<7;day++)if(!sessions.some(s=>s.dayIndex===day))sessions.push({weekNumber:week,weekTheme:phase,phase,dayIndex:day,dayName:DAYS[day],sport:'rest',title:'Repos',details:'Repos du calendrier trail candidat.',durationMin:0,isRest:true,custom:true,zones:[]});
  // Keep session indices stable for the exposure ledger; calendar order is not a schema requirement.
  plan.weeks.push({weekNumber:week,phase,theme:phase,sessions});if(type==='load')previousLoad=total;
 }
 plan.phases=derivePhasesFromWeeks(plan);
 const issues=validateExperimentalCandidate(plan,athlete,config),technical=auditTechnicalPlan(plan),global=auditGlobalProgression(plan,ledger,['run']);
 return{...common,status:'candidate' as const,technicallyConstructed:technical.valid===true,candidate:plan,technical,issues,ledger,selection,global,
  controls:{existingSports:'executed',candidateTrailQuota:'executed_experimental',referenceTrailQuota:'not_implemented',verticalProgression:'known_doses_only',eccentricAdaptation:'not_attested'},
  candidateSportConformant:!issues.some(i=>['error','critical','blocking'].includes(i.severity))&&global.contractPassed,
  event:f.event,coachContract:f.coach,uncertainties:['Synthetic recent history is a test input, not inferred real athlete data','D− per session remains unknown unless a route observation is explicitly supplied','Scheduled eccentric work does not prove tolerance','Catalogue primary and component duration consistency still requires review'],
 };
}
function textFor(m:{id:string;title:string;tags:string[]}){return`${m.id} ${m.title} ${m.tags.join(' ')}`;}
