/**
 * V3.9 — never call a week "deload" solely because its quota says recovery.
 * Native validators rely on the week THEME to recognize a deliberate deload.
 * Emit that semantic label only after a real >=30% reduction in known session
 * minutes versus the immediately preceding week has been measured.
 *
 * It changes no sports, sessions, dose, clocks, quota or validation threshold.
 */
import type {ParsedPlan,ParsedWeek} from '@/lib/aiPlanParser';
export type VerifiedDeloadEvidence={
  week:number;scheduledRecovery:boolean;previousMinutes:number|null;
  currentMinutes:number|null;reductionPct:number|null;verified:boolean;
};
const sumKnownMinutes=(week:ParsedWeek):number|null=>{
  const sessions=week.sessions.filter(s=>!s.isRest);
  if(!sessions.length || sessions.some(s=>typeof s.durationMin!=='number'||
    !Number.isFinite(s.durationMin)||s.durationMin<=0))return null;
  return sessions.reduce((sum,s)=>sum+s.durationMin!,0);
};
export function annotateOnlyMeasuredDeloads(plan:ParsedPlan):VerifiedDeloadEvidence[]{
  return plan.weeks.map((week,index)=>{
    const previous=index>0?sumKnownMinutes(plan.weeks[index-1]):null;
    const current=sumKnownMinutes(week);
    const scheduledRecovery=plan.weeklyQuotas?.[week.weekNumber]?.weekType==='recovery';
    const reductionPct=previous!==null && previous>0 && current!==null
      ? (previous-current)/previous*100:null;
    const verified=scheduledRecovery&&reductionPct!==null&&reductionPct>=30;
    if(verified){
      // A validator must never exempt a nominally scheduled recovery with
      // 0%, 10% or unknown actual load reduction.
      week.theme='Décharge vérifiée — '+week.theme;
    }
    return {week:week.weekNumber,scheduledRecovery,previousMinutes:previous,
      currentMinutes:current,reductionPct,verified};
  });
}
