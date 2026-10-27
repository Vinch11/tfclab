/** New synthetic coach specifications. Never fills missing data in the historical 600. */
import type{PlanConfig}from'@/hooks/useAITrainingPlan';
import{planningCases,preparePlanningCaseContext}from'@/qa/sports-plan-lab/planningMatrix';
export interface TrailFixture{
 id:string;objective:'TrailShort'|'TrailMountain'|'TrailUltra';level:'untrained'|'light'|'trained'|'highly_trained';weeks:number;
 event:{distanceKm:number;elevationGainM:number;elevationLossM:number|null;targetTimeMinutes:number;technicality:'easy'|'rocky'};
 coach:{weeklyMinutes:number;longStart:number;longPeak:number;runDays:number[];strengthDay:number;maxMainZone:number;backToBack:boolean};
 terrain:'vallonne'|'montagne';eccentricFamiliarization:'unknown'|'documented_synthetic';
 history:{recentWeeklyMinutes:number;chronicWeeklyMinutes:number;weeksHeld:number};
 confirmedPrerequisites:string[];
 routeEvidence:Record<string,{dPlusM:number;dMinusM:number;source:string}>;
}
const levels=['untrained','light','trained','highly_trained']as const;
export const TRAIL_FIXTURES:TrailFixture[]=(['TrailShort','TrailMountain','TrailUltra']as const).flatMap((objective,o)=>levels.map((level,l)=>({
 id:`synthetic-v4:${objective}:${level}`,objective,level,weeks:[12,16,20][o],
 event:{distanceKm:[25,55,100][o],elevationGainM:[800,3000,6000][o],elevationLossM:o===0?null:[0,2800,6500][o],targetTimeMinutes:[210,540,1200][o],technicality:o===0?'easy':'rocky'},
 coach:{weeklyMinutes:[240,360,600,840][l],longStart:[60,80,120,150][l],longPeak:[90,150,240,330][l],runDays:l<2?[1,3,5]:[1,3,5,6],strengthDay:2,maxMainZone:l<2?2:4,backToBack:l>=2&&o>0},
 terrain:o===0?'vallonne':'montagne',eccentricFamiliarization:l===3?'documented_synthetic':'unknown',
 history:{recentWeeklyMinutes:[150,250,420,600][l],chronicWeeklyMinutes:[150,250,420,600][l],weeksHeld:8},
 confirmedPrerequisites:l>=2?['ravitaillement']:[],
 routeEvidence:{A_TR_EF_SENTIER:{dPlusM:200,dMinusM:180,source:'explicit_synthetic_route_observation'},A_TR_SL_MONTAGNE_BASE:{dPlusM:850,dMinusM:780,source:'explicit_synthetic_route_observation'},A_TR_SL_ULTRA_BUILD:{dPlusM:1600,dMinusM:1450,source:'explicit_synthetic_route_observation'},A_TR_MARCHE_COURSE_ULTRA:{dPlusM:1200,dMinusM:1100,source:'explicit_synthetic_route_observation'}}
})));
export function prepareTrailFixture(f:TrailFixture){
 const ambition=f.level==='untrained'?'finisher':f.level==='light'?'age_group':f.level==='trained'?'competitor':'elite';
 const seed=planningCases().find(c=>c.objective===f.objective&&c.level===f.level&&c.ambition===ambition)!;
 const {prepared}=preparePlanningCaseContext({...seed,physiology:'balanced_typical',constraints:'unrestricted',intermediate:false,duration:'native',load:'known_synthetic'});
 const end=new Date(Date.UTC(2026,9,26+f.weeks*7-1)).toISOString().slice(0,10);
 const config:PlanConfig={...prepared.planConfig,objective:f.objective,weeksAvailable:f.weeks,planStartDate:'2026-10-26',terrainAvailability:f.terrain,
  constraints:'Fixture synthétique V4 ; calendrier et disponibilité explicitement fournis.',weeklyHours:f.coach.weeklyMinutes/60,weeklyHoursSource:'coach',
  sessionsPerWeek:f.coach.runDays.length+1,maxSessionsPerDay:1,strengthSessionsPerWeek:1,
  raceGoals:[{objective:f.objective,priority:'A',raceDate:end,...f.event}],
  // Explicit synthetic recent-history fixture, not inferred from availability or training level.
  loadHistory:{recentWeeklyHours:f.history.recentWeeklyMinutes/60,chronicWeeklyHours:f.history.chronicWeeklyMinutes/60,recentWeeksCount:f.history.weeksHeld},
 };
 return{athlete:prepared.athleteData,config};
}
