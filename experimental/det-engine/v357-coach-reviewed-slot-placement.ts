/**
 * DET V3.57 — project an explicit, athlete-scoped coach placement review.
 * Copies EXISTING slots only: no frequency, dose, key flag or source changes.
 * No appointment may move solely because clock callbacks happen to exist.
 */
import type {WeeklyQuota} from '@/engines/plan/sessionSizingMatrix';
import type {WeeklySlotLayout} from '@/engines/plan/weeklySlotLayout';
import {planningFeasibility} from '../../supabase/functions/_shared/planningFeasibility';

export interface CoachReviewedSlotPlacement {
  provenance:'coach_confirmed_slot_placement';
  athleteContextId:string;
  week:number;
  originalLayoutSnapshot:string;
  assignments:readonly {fromDayIndex:number;fromSlotIndex:number;toDayIndex:number}[];
  fullRestDayIndices:readonly number[];
}
export const slotPlacementSnapshot=(layout:WeeklySlotLayout):string=>
  JSON.stringify(layout);
export function projectCoachReviewedSlotPlacement(args:{
  layout:WeeklySlotLayout;quota:WeeklyQuota;week:number;expectedAthleteContextId:string;
  review:CoachReviewedSlotPlacement|null|undefined;
  dayBans:readonly {day:string;sport:string}[];
}):{verified:boolean;layout:WeeklySlotLayout|null;refusals:string[];
  movedSlots:number;keySlotsPreserved:boolean;originalSlotCount:number} {
  const refusals:string[]=[];
  const refuse=(reason:string)=>({verified:false,layout:null,
    refusals:[...refusals,reason],movedSlots:0,keySlotsPreserved:false,
    originalSlotCount:args.layout.days.flatMap(d=>d.slots).length});
  const r=args.review;
  if(!r||r.provenance!=='coach_confirmed_slot_placement')
    return refuse('explicit_coach_slot_placement_review_missing');
  if(typeof args.expectedAthleteContextId!=='string'||!args.expectedAthleteContextId.trim()||
     r.athleteContextId!==args.expectedAthleteContextId||r.week!==args.week)
    return refuse('coach_slot_placement_context_mismatch');
  if(r.originalLayoutSnapshot!==slotPlacementSnapshot(args.layout))
    return refuse('coach_slot_placement_snapshot_stale');
  const names=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  if(args.layout.days.length!==7||
     args.layout.days.some((d,i)=>d.dayName!==names[i]))
    return refuse('original_layout_calendar_invalid');
  const isDay=(v:number)=>Number.isSafeInteger(v)&&v>=0&&v<7;
  if(!Array.isArray(r.assignments)||!Array.isArray(r.fullRestDayIndices)||
     r.fullRestDayIndices.some(v=>!isDay(v))||
     new Set(r.fullRestDayIndices).size!==r.fullRestDayIndices.length)
    return refuse('coach_slot_placement_assignments_invalid');
  const originals=args.layout.days.flatMap((d,di)=>
    d.slots.map((s,si)=>({s,di,si})));
  if(r.assignments.length!==originals.length)
    return refuse('coach_slot_placement_must_preserve_all_slots');
  const byIdentity=new Map(originals.map(x=>[x.di+':'+x.si,x]));
  const seen=new Set<string>();
  const projected:WeeklySlotLayout={...args.layout,
    days:args.layout.days.map((d,i)=>({...d,
      isRest:r.fullRestDayIndices.includes(i),slots:[]}))};
  let movedSlots=0;
  for(const a of r.assignments){
    if(!a||typeof a!=='object'||!isDay(a.fromDayIndex)||!isDay(a.toDayIndex)||
       !Number.isSafeInteger(a.fromSlotIndex)||a.fromSlotIndex<0)
      return refuse('coach_slot_placement_assignment_position_invalid');
    const key=a.fromDayIndex+':'+a.fromSlotIndex,original=byIdentity.get(key);
    if(!original||seen.has(key))
      return refuse('coach_slot_placement_slot_missing_or_duplicated');
    seen.add(key);
    if(a.toDayIndex!==a.fromDayIndex){
      if(original.s.isRaceEvent||original.s.isLongSession)
        return refuse('coach_slot_placement_cannot_move_race_or_long_anchor');
      movedSlots++;
    }
    // Never trust replacement slot fields in a review: original flags,
    // sport and duration bounds are the ONLY projected prescription.
    projected.days[a.toDayIndex].slots.push({...original.s});
  }
  for(let i=0;i<7;i++){
    const day=projected.days[i],slots=day.slots;
    if(day.isRest&&slots.length)return refuse('coach_slot_placement_on_rest_day');
    if(new Set(slots.map(s=>s.sport)).size!==slots.length)
      return refuse('coach_slot_placement_duplicate_same_day_sport');
    for(const slot of slots){
      if(args.dayBans.some(b=>b.day===day.dayName&&
        (b.sport==='any'||b.sport===slot.sport||
         (slot.sport==='brick'&&(b.sport==='bike'||b.sport==='run')))))
        return refuse('coach_slot_placement_violates_day_ban');
      if(slot.sport==='brick'&&slots.some(s=>
        ['run','bike','strength'].includes(s.sport)))
        return refuse('coach_slot_placement_brick_day_conflict');
      if(slot.sport==='strength'&&
        (day.dayName==='vendredi'||projected.days[(i+1)%7].slots.some(s=>
          s.isLongSession&&(s.sport==='bike'||s.sport==='brick'))))
        return refuse('coach_slot_placement_strength_before_long_bike');
    }
  }
  if(projected.days.filter(d=>d.slots.length===0).length<
     args.layout.days.filter(d=>d.slots.length===0).length)
    return refuse('coach_slot_placement_reduces_full_rest_days');
  const mechanical=planningFeasibility(args.quota,projected);
  if(mechanical.length)return {...refuse('coach_slot_placement_native_feasibility'),
    refusals:mechanical};
  return {verified:true,layout:projected,refusals:[],movedSlots,
    keySlotsPreserved:true,originalSlotCount:originals.length};
}
