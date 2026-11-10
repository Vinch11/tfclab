// DET-only policy. Never change domains, recovery intervals, coach clocks, session
// caps, or source level. Optional changes are searched only after a weekly refusal.
import type {V3Workout} from '../../../scripts/library-v3/catalogueRuntime';
import type {AppPlanningDetDraft} from './appPlanningDetDraft';

export function shorterSourceSettings(s:V3Workout){
  // Only one declared parameter at a time. Protect the work/rest ratio of hard
  // intervals by changing the count, never their intensity, duration or rest.
  // Strength is already individually dosed; preserve its load and exercise pairing.
  if(s.sport==='strength')return [];
  const settings=[];
  for(const p of s.prescription.parameters){
    if(!(p.min>0&&p.min<p.base&&p.base<=p.max))continue;
    if(!/^\d+\.count$/.test(p.path)&&!/^\d+\.seconds$/.test(p.path))continue;
    const block=s.blocks[Number(p.path.split('.')[0])];
    if(!block)continue;
    if(p.path.endsWith('.count')){
      if(block.kind!=='repeat'||p.min!==block.count.min||p.base!==block.count.base||!Number.isInteger(p.min))continue;
    }else if(block.kind!=='time'||block.role!=='main'||block.domain!=='moderate_lt1'||p.min!==block.seconds?.min||p.base!==block.seconds.base)continue;
    for(const n of new Set([p.min, Math.max(p.min,p.base-(p.path.endsWith('.count')?1:60))])){
      settings.push({overrides:{[p.path]:n},allowWorksetChange:true});
    }
  }
  return settings;
}

type Week=AppPlanningDetDraft['weeks'][number];
// A day change is a role swap between existing, same-sport, interchangeable
// appointments. Long days, races, bricks, explicit constraints and slot bounds stay fixed.
export function alternateKeyDay(week:Week,hasCoachConstraints:boolean):Week|null{
  if(hasCoachConstraints||week.weekType!=='load')return null;
  const slots=week.days.flatMap((day,d)=>day.slots.map((s,i)=>({s,d,i})));
  for(const key of slots.filter(x=>x.s.role==='key')){
    const support=slots.find(x=>x.d!==key.d&&x.s.sport===key.s.sport&&x.s.role==='support'&&
      ['run','bike','swim'].includes(x.s.sport)&&x.s.minimumMinutes===key.s.minimumMinutes&&x.s.maximumMinutes===key.s.maximumMinutes);
    if(!support)continue;
    return {...week,days:week.days.map((d,index)=>({...d,slots:d.slots.map((s,i)=>
      index===key.d&&i===key.i?{...s,role:'support'}:index===support.d&&i===support.i?{...s,role:'key'}:s)}))};
  }
  return null;
}
