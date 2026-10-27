import {prevalidatePlanWeeks,prevalidateDeclaredCalendar,prevalidatePhysiologicalContext,type PrevalidationPhysiology,withPrevalidationIssues,type PrevalidationInputWeek,type PrevalidationCalendar} from './planPrevalidation.ts';
/** Validate transported individualized quotas; never recompute nominal quotas. */
export function prevalidateTransport(config:{_weeklyQuotas?:Record<number,Partial<PrevalidationInputWeek>>;globalWeekOffset?:number;windowWeekPhases?:Record<number,string>;objective?:string;catalogObjective?:string;weeksAvailable?:number;globalTotalWeeks?:number}&PrevalidationCalendar&PrevalidationPhysiology={}) {
 const mechanical=prevalidatePlanWeeks(Object.entries(config._weeklyQuotas??{}).map(([key,entry])=>({
  ...entry,expectedPhase:config.windowWeekPhases?.[Number(key)]??entry.expectedPhase,week:Number(key),globalWeek:Number(key)+(config.globalWeekOffset??0),
  objective:config.catalogObjective??config.objective,catalog:[],
 })));
 const report=withPrevalidationIssues(mechanical,prevalidatePhysiologicalContext(config));
 return config.globalTotalWeeks===undefined?withPrevalidationIssues(report,prevalidateDeclaredCalendar(config,config.weeksAvailable??0)):report;
}
