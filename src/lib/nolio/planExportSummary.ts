import {sessionsFromPlanJson} from '../../../supabase/functions/_shared/nolioV2/planSessions';
import {selectExportScope,type NolioExportScope} from '../../../supabase/functions/_shared/nolioV2/exportScope';
/** The summary uses the exact calendar passed to the selected transport. */
export function planExportSummary(plan:unknown,scope:NolioExportScope,startDate?:string){
 const p=plan as Record<string,unknown>;
 const extracted=sessionsFromPlanJson(startDate?{...p,_planStartDate:startDate}:plan);
 const selected=selectExportScope(extracted.sessions,scope);
 const active=selected.sessions.filter(s=>!s.isRest),dates=active.map(s=>s.date).sort();
 return {count:active.length,weeks:new Set(active.map(s=>/^S(\d+)-/.exec(s.sessionKey)?.[1])).size,firstDate:dates[0]??null,lastDate:dates.at(-1)??null,problems:[...extracted.problems,...selected.problems]};
}
export function coachCalendarDate(ymd:string){return new Intl.DateTimeFormat('fr-BE',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(ymd+'T12:00:00Z'));}
