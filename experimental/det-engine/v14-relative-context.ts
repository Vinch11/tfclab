/** Literal calendar compatibility is separate from unobserved recovery. Known empty predecessors cannot be cleared by feedback. */
interface Footprint{week:number;day:number;role:{sport:string;kind:string};card:{id:string;when:string;mainZoneMax:number};}
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function needsPreviousTrainingDay(when:string,type:string){const text=norm(when);return /lendemain/.test(text)&&!(/taper/.test(text)&&['taper','race'].includes(type));}
export function relativeCalendarContext(card:Footprint['card'],week:number,day:number,type:string,current:Footprint[],previous:Footprint[]){
 const text=norm(card.when),absolute=(week-1)*7+day,all=[...previous,...current];const before=all.filter(s=>(s.week-1)*7+s.day===absolute-1),same=current.filter(s=>s.day===day&&s.card.id!==card.id);
 const endurance=(s:Footprint)=>['bike','run','swim','brick'].includes(s.role.sport),key=(s:Footprint)=>s.role.kind==='long'||s.role.sport==='brick'||s.card.mainZoneMax>=3;
 if(/taper/.test(text)&&['taper','race'].includes(type))return{status:'pass' as const,reason:'explicit_taper_alternative'};
 if(/lendemain/.test(text)){if(absolute-1<0)return{status:'unknown' as const,reason:'dated_previous_exposure_outside_calendar'};const specific=/seance\s*(?:b\b|cle)|brick|long velo/.test(text);return{status:(before.some(s=>specific?key(s):endurance(s))?'pass':'fail')as'pass'|'fail',reason:specific?'literal_previous_key_brick_or_long_required':'literal_previous_training_charge_required'};}
 if(/jour (?:off|de repos)/.test(text)&&/(?:ou|apres|post)/.test(text))return{status:(!same.some(endurance)||[...same,...before].some(key)?'pass':'fail')as'pass'|'fail',reason:'source_off_day_or_post_long_alternative'};
 if(/apres long velo/.test(text))return{status:([...same,...before].some(s=>s.role.sport==='bike'&&s.role.kind==='long')?'pass':'fail')as'pass'|'fail',reason:'literal_after_long_bike_required'};
 if(/apres seance b|apres.*long run/.test(text))return{status:([...same,...before].some(key)?'pass':'fail')as'pass'|'fail',reason:'literal_after_key_or_long_required'};
 return{status:'pass' as const,reason:'no_additional_relative_calendar_constraint_parsed; other_source_and_response_guards_retained'};
}
