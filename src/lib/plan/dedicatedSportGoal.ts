/** Programme target comparison. Never a new physiological measurement or causal diagnosis. */
import type {AthleteDiagnostic} from '@/engines/diagnostic';
import type {UnifiedGapAnalysis} from '@/lib/v2/unifiedLimiterDetection';
export type DedicatedGoalMetric='FTP'|'CSS';
export interface DedicatedSportGoalAnalysis {
 origin:'explicit_coach_programme_target';
 objective:string;metric:DedicatedGoalMetric;units:'watts'|'sec_per_100m';
 current:number|null;target:number|null;profileObjective:string;
 profilePriorities:string[];gaps:UnifiedGapAnalysis[];
 scientificAttestation:false;causalLimiterDiagnosis:false;
}
export function dedicatedGoalMetric(objective:string):DedicatedGoalMetric|null{
 const t=objective.trim().toLowerCase();
 if(['cyclisme ftp','cycling ftp'].includes(t))return 'FTP';
 if(['natation 1500m','natation css','swimming css'].includes(t))return 'CSS';
 return null;
}
export function compareDedicatedProgrammeGoal(objective:string,diagnostic:AthleteDiagnostic,target:number|null):DedicatedSportGoalAnalysis|null{
 const metric=dedicatedGoalMetric(objective);if(!metric)return null;
 const raw=metric==='FTP'?diagnostic._rawInput.ftp:diagnostic._rawInput.css;
 const current=typeof raw==='number'&&Number.isFinite(raw)&&raw>0?raw:null;
 const validTarget=typeof target==='number'&&Number.isFinite(target)&&target>0?target:null;
 const gap=current!==null&&validTarget!==null?(metric==='FTP'?current-validTarget:validTarget-current):0;
 const percentage=validTarget?gap/validTarget*100:0;
 return {origin:'explicit_coach_programme_target',objective,metric,units:metric==='FTP'?'watts':'sec_per_100m',current,target:validTarget,profileObjective:diagnostic.objectif,profilePriorities:diagnostic.limiter.gapAnalysis.filter(g=>g.weightedImpact>0).sort((a,b)=>b.weightedImpact-a.weightedImpact).map(g=>g.metric),
  gaps:[{metric,value:current,target:validTarget,gap,gapPercent:percentage,status:current===null||validTarget===null?'unknown':gap<0?'limiting':'optimal',weight:1,weightedImpact:percentage<0?-percentage:0}],scientificAttestation:false,causalLimiterDiagnosis:false};
}
export function appPlanningPriorityGaps(d:AthleteDiagnostic){return d.planningGoalAnalysis?.gaps??d.limiter.gapAnalysis;}

/** Integrity of the explicit programme comparison before either engine/write. */
export function dedicatedProgrammeProblems(config:import('@/hooks/useAITrainingPlan').PlanConfig,athlete:Readonly<import('@/hooks/useAITrainingPlan').PlanAthleteData>):string[]{
 const metric=dedicatedGoalMetric(String(config.objective));if(!metric)return [];
 const g=config.planningGoalContext,current=metric==='FTP'?athlete.ftp:athlete.css;
 const invalid=['Programme dédié : référence FTP/CSS existante et cible d’amélioration explicite du coach requises.'];
 if(!g||g.origin!=='explicit_coach_programme_target'||g.objective!==config.objective||g.metric!==metric||g.units!==(metric==='FTP'?'watts':'sec_per_100m')||g.causalLimiterDiagnosis!==false||g.scientificAttestation!==false)return invalid;
 if(typeof current!=='number'||!Number.isFinite(current)||current<=0||g.current!==current||typeof g.target!=='number'||!Number.isFinite(g.target)||g.target<=0||!(metric==='FTP'?g.target>current:g.target<current))return invalid;
 const gap=metric==='FTP'?current-g.target:g.target-current;
 const row=g.gaps[0];
 if(g.gaps.length!==1||!row||row.metric!==metric||row.value!==current||row.target!==g.target||row.gap!==gap||row.gapPercent!==gap/g.target*100||row.weightedImpact!==-(gap/g.target*100)||row.status!=='limiting'||row.weight!==1||config.identifiedLimitersRaw?.length!==1||config.identifiedLimitersRaw[0]!==metric)return invalid;
 return [];
}
