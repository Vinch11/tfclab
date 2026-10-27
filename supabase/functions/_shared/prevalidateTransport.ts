import {prevalidatePlanWeeks,prevalidateDeclaredCalendar,withPrevalidationIssues,type PrevalidationInputWeek,type PrevalidationCalendar} from './planPrevalidation.ts';
/** Validate transported individualized quotas; never recompute nominal quotas. */
export function prevalidateTransport(config:{_weeklyQuotas?:Record<number,Partial<PrevalidationInputWeek>>;globalWeekOffset?:number;windowWeekPhases?:Record<number,string>;objective?:string;catalogObjective?:string;weeksAvailable?:number;globalTotalWeeks?:number}&PrevalidationCalendar={}) {
 const report=prevalidatePlanWeeks(Object.entries(config._weeklyQuotas??{}).map(([key,entry])=>({
  ...entry,expectedPhase:config.windowWeekPhases?.[Number(key)]??entry.expectedPhase,week:Number(key),globalWeek:Number(key)+(config.globalWeekOffset??0),
  objective:config.catalogObjective??config.objective,catalog:[],
 })));
 return config.globalTotalWeeks===undefined?withPrevalidationIssues(report,prevalidateDeclaredCalendar(config,config.weeksAvailable??0)):report;
}
