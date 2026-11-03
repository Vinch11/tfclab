/** Pure, explicitly synthetic probes for the six remaining acceptance families. */
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {prepareDedicatedSport} from './v359-dedicated-sport-preparation';
import {preserveTriathlonTaperFrequency} from './v359-triathlon-layout';
import {composeReviewedBrickZoneDose} from './v310-structured-zone-dose';
import type {ParsedSession} from '@/lib/aiPlanParser';
import {SHORT_TRI_BRICKS} from './v31-v3-brick';
import type {PlanConfig} from '@/hooks/useAITrainingPlan';

export interface FamilyCase {
  id:string;family:10|11|12|13|14|15;objective:string;weeks:number;weeklyHours:number;
  fixture?:string;ambition?:'age_group'|'competitor'|'finisher';sessionsPerWeek?:number;
  strengthSessionsPerWeek?:number;maxSessionsPerDay?:number;age?:number;
  constraints?:string;limiter?:string;deloadCadenceWeeks?:3|4;
  raceGoals?:PlanConfig['raceGoals'];prohibitions?:string[];
}
const starts:Record<string,number[]>={
  swim:[360,360,360,360,360,1020,480],bike:[600,660,600,480,600,420,540],
  run:[1080,540,720,900,1080,1260,1140],strength:[1140,1140,1140,1140,1140,1140,1140],
  brick:[360,360,360,360,360,360,360],
};
export const familyCases:readonly FamilyCase[]=[
  {id:'sprint-8w-reference',family:10,objective:'Sprint',weeks:8,weeklyHours:8,fixture:'B-SPRINT',limiter:'vo2max',sessionsPerWeek:8,strengthSessionsPerWeek:1},
  {id:'olympic-12w-reference',family:10,objective:'Olympic',weeks:12,weeklyHours:10,fixture:'B-OLYMPIC',limiter:'tte',sessionsPerWeek:9,strengthSessionsPerWeek:1},
  {id:'cycling-ftp-8w-reference',family:11,objective:'Cyclisme FTP',weeks:8,weeklyHours:7,limiter:'ftp',sessionsPerWeek:4,strengthSessionsPerWeek:1},
  {id:'swim-css-8w-reference',family:12,objective:'Natation 1500m',weeks:8,weeklyHours:4,limiter:'tte',sessionsPerWeek:4,strengthSessionsPerWeek:1,
    constraints:'Mercredi indisponible. Samedi indisponible.'},

];
export function runFamily(s:FamilyCase,missingProof=false){
  const raceDate=new Date(Date.UTC(2026,9,26+s.weeks*7-1)).toISOString().slice(0,10);
  const f=preparePrevalidationFixture(s.fixture??'B-10K',{
    objective:s.objective,weeksAvailable:s.weeks,weeklyHours:s.weeklyHours,
    ambition:s.ambition??'age_group',sessionsPerWeek:s.sessionsPerWeek??4,
    strengthSessionsPerWeek:s.strengthSessionsPerWeek??1,maxSessionsPerDay:s.maxSessionsPerDay??2,
    constraints:s.constraints,raceGoals:s.raceGoals,planStartDate:'2026-10-26',raceDate,
    ...(s.deloadCadenceWeeks?{deloadCadenceWeeks:s.deloadCadenceWeeks}:{}),
  });
  const athleteId='synthetic-v359-'+s.id;
  const athlete={...f.athleteData,nom:athleteId,ftp:300,paceThresholdSecPerKm:240,css:95,vma:18,
    ...(s.age?{age:s.age}:{})};
  const dedicated=/cyclisme|natation/i.test(s.objective);
  const config:PlanConfig={...(dedicated?{
    ambition:s.ambition??'age_group',sessionsPerWeek:s.sessionsPerWeek??4,
    strengthSessionsPerWeek:s.strengthSessionsPerWeek??1,maxSessionsPerDay:s.maxSessionsPerDay??2,
    fondationDurationWeeks:2,
  }:f.planConfig),objective:s.objective,weeksAvailable:s.weeks,weeklyHours:s.weeklyHours,
    planStartDate:'2026-10-26',raceDate,raceGoals:s.raceGoals??[{objective:s.objective,raceDate,priority:'A' as const}],
    identifiedLimitersRaw:[s.limiter??'tte'],prohibitions:s.prohibitions,
    ...(s.constraints?{constraints:s.constraints}:{}),
    _outputFormat:'json' as const};
  const sports=/cyclisme/i.test(s.objective)?['bike','strength']:
    /natation/i.test(s.objective)?['swim','strength']:
    /sprint|olympic/i.test(s.objective)?['bike','run','swim','strength']:['run','strength'];
  const reviews=v3FullCatalogue.workouts.filter(w=>sports.includes(w.sport)&&
    (w.sport!=='strength'||Number(w.id.slice(-3))>=101)).map(w=>{
    const context=syntheticV3SportingContext(w.id);
    if(!('sportingReview' in context))throw Error('missing_synthetic_context:'+w.id);
    return {id:w.id,objective:s.objective,athleteLevel:'trained' as const,
      athleteLevelSource:'manual' as const,allPrerequisitesChecked:true as const,
      individualCoachApproval:true as const,preferReviewedV3:true as const,
      expectedAthleteId:athleteId,sportingReview:{...context.sportingReview,athleteId},
      athleteAnchors:syntheticV3ReviewAnchors(),
      ...(w.sport==='strength'?{verifiedStrengthLoadAndRpe:true as const}:{}),
    } satisfies V3ReviewedSettings;
  });
  const short=SHORT_TRI_BRICKS.filter(b=>s.objective.toLowerCase()===b.goal);
  const hasShort=short.length>0;
  const {contract,report}=buildDetV3ContractFromCatalogue(reviews,short.map(b=>({id:b.id,
    objective:s.objective,individualCoachApproval:true,transitionSeconds:180,preferReviewedV3:true})));
  const clock=(slot:{week:number;dayIndex:number;sport:string})=>{
    const time=s.family===12&&slot.sport==='swim'&&slot.dayIndex===3?720:
      starts[slot.sport]?.[slot.dayIndex];
    return time===undefined?null:{provenance:'coach_confirmed' as const,minuteOfDay:time,
      utcOffsetMinutes:Date.UTC(2026,9,26+(slot.week-1)*7+slot.dayIndex)>=Date.UTC(2027,2,28)?120:60};
  };
  const accepted=new Set(report.accepted.map(w=>w.id));
  const baseFilter=contract.filterCandidate;
  const out=constructDeterministicPlan(athlete,config,{maxNodes:60000,maxMilliseconds:12000},{
    ...contract,requireReviewedAthleteContext:true,
    ...(missingProof?{sourceFullStructuredDoseForId:()=>null,sourceStructuredZoneForId:()=>null}:{}),
    ...(hasShort?{preferSourceBackedMultisportBalance:'triathlon_targets' as const,
      requireFinalTriathlonMinuteRatios:true as const,auditVerifiedMultisportMinutes:true as const,
      auditGlobalSourceSportRatioBounds:true as const,applyReviewedMinuteSportRatio:true as const,
      adapt:(p:Parameters<typeof contract.adapt>[0],c:PlanConfig)=>preserveTriathlonTaperFrequency(p,c,athlete,contract)}:{}),
    ...(dedicated?{adapt:(p:Parameters<typeof contract.adapt>[0],c:PlanConfig)=>prepareDedicatedSport(p,c,contract,/cyclisme/i.test(s.objective)?'bike':'swim')}:{}),
    ...(!dedicated?{verifyOfficialRaceQuotaProjection:true as const}:{}),
    requireReviewedEnduranceKeyQualityOnLoadWeeks:true,
    ...(s.objective==='Olympic'?{qualitySportPreference:'swim' as const}:{}),
    requireReviewedRaceSpecificPeak:true,
    ...(!hasShort?{prioritizeRunningStructuredEasyMargin:true as const}:{}),
    prioritizeVerifiedRunningQualitySlot:true,
    prioritizeVerifiedRunningQualityCandidate:true,
    prioritizeRunningQualitySlotByMargin:true,
    filterCandidate:(card,ctx)=>(accepted.has(card.id)||short.some(b=>b.id===card.id))&&
      (!['base','build'].includes(ctx.phase)||!/taper|affûtage|supercomp|activation\s*j-?2/i.test(card.title+' '+card.structure))&&
      (baseFilter?.(card,ctx)??true),
    enforceWeeklyHoursCap:true,enforceCalendarSafeV3Recovery:true,enforceConfirmedNoSameDayOverlap:true,
    coachSlotStart:clock,coachSessionStart:session=>clock({week:session.weekNumber,dayIndex:session.dayIndex,sport:session.sport}),
    improveV3RecoveryLayout:true,requireMeasuredDeloadSelection:true,annotateVerifiedDeloads:true,
    requireRealQualityOnLoadWeeks:true,requireReviewedRunningKeyQualityOnLoadWeeks:true,
    requireStructuredPolarizationOnLoadWeeks:true,reconcileReviewedSourcePolarization:true,
    excludeNativeForbiddenTaperCandidates:true,filterDeclaredSprintBanCandidates:true,
    auditStructuredPolarizationSources:true,requireStrictPeriodizationEvidence:true,
    enableV333ForwardCheck:true,
  });
  const reviewDose=(session:ParsedSession)=>{
    if(!session.catalogId||typeof session.durationMin!=='number')return null;
    const recipe=SHORT_TRI_BRICKS.find(b=>b.id===session.catalogId);
    if(!recipe)return contract.sourceFullStructuredDoseForId?.(session.catalogId,session.durationMin)??null;
    const doses=[recipe.bikeId,recipe.runId].map(id=>{
      const card=report.accepted.find(c=>c.id===id);
      return card?contract.sourceFullStructuredDoseForId?.(id,card.durationMin[0])??null:null;
    });
    return composeReviewedBrickZoneDose(doses[0],doses[1],180,session.durationMin);
  };
  const hard=out.issues.filter(i=>['critical','blocking','error'].includes(i.severity));
  console.info('DET_V359_FAMILY',JSON.stringify({scenario:s.id,family:s.family,objective:s.objective,
    weeksRequested:s.weeks,weeksConstructed:out.candidate?.weeks.length??0,
    technicallyConstructed:out.technicallyConstructed,constraintsSatisfied:out.constraintsSatisfied,
    admitted:report.accepted.length,rejectedExamples:report.rejected.filter(x=>reviews.some(r=>r.id===x.id)).slice(0,3),
    nodes:out.nodes,reason:out.reason??null,blockingCodes:[...new Set(hard.map(i=>i.code))],
    examples:hard.slice(0,8),
    selectedWeeks:out.issues.filter(i=>i.code==='det_v359_week_source_selection').map(i=>({week:i.week,sources:JSON.parse(i.message!)})),
    weeklyHours:s.weeklyHours,primaryLimiter:s.limiter,
    reviewCalendar:out.constraintsSatisfied?{syntheticOnly:true,prescriptionAllowed:false,
      weeks:out.candidate!.weeks.map(w=>({week:w.weekNumber,phase:w.phase,theme:w.theme,
        weekType:out.candidate!.weeklyQuotas![w.weekNumber].weekType,
        quota:out.candidate!.weeklyQuotas![w.weekNumber].quota,
        sessions:w.sessions.map(session=>({day:session.dayName,sport:session.sport,sourceId:session.catalogId??null,
          durationMin:session.durationMin??null,isKeySession:!!session.isKeySession,isRest:!!session.isRest,
          title:session.title,details:session.details,
          confirmedStart:session.isRest?null:clock({week:w.weekNumber,dayIndex:session.dayIndex,sport:session.sport}),
          exactDose:reviewDose(session),
          sourceRecoveryRequirements:session.catalogId?contract.sourceRecoveryForId?.(session.catalogId)??[]:[],
          consumedSourceIds:session.catalogId?contract.consumedSourceIds?.(
            [...report.accepted,...(contract.verifiedBrickCompositions??[])].find(c=>c.id===session.catalogId)!)??[]:[],
        })),
      }))}:null,syntheticOnly:true,prescriptionAllowed:false,
  }));
  return {out,contract,report,config,athlete};
}
