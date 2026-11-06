import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDetStructuredBrick, type DetStructuredWorkout } from '../../../../experimental/det-engine/v400-structured-workout';
import type { PlanVersionRow } from '@/lib/plan/appendOnlyPlanVersionSave';
const db=vi.hoisted(()=>({rows:new Map<string,PlanVersionRow>(),insert:vi.fn(),invoke:vi.fn()}));
const coach='00000000-0000-4000-8000-0000000000c1',athlete='00000000-0000-4000-8000-0000000000a1',version='00000000-0000-4000-8000-000000000001';
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:'00000000-0000-4000-8000-0000000000c1'}},error:null})},functions:{invoke:db.invoke},from:()=>{
  const filters:Record<string,unknown>={};const query={select:()=>query,eq:(key:string,value:unknown)=>{filters[key]=value;return query;},maybeSingle:async()=>({data:[...db.rows.values()].find(r=>Object.entries(filters).every(([k,v])=>r[k as keyof PlanVersionRow]===v))??null,error:null}),
    insert:async(row:PlanVersionRow)=>{db.insert(row);db.rows.set(row.id,structuredClone(row));return {error:null};}};return query;
}}}));
import { NolioMultisportPreparation } from '../NolioMultisportPreparation';
function fixture(){
  const c=(sport:string,min:number):DetStructuredWorkout=>({schema:'det-structured-workout-v1',sourceId:'SYNTH_'+sport,sport,chosenDurationMin:min,exactSeconds:min*60,nodes:[{kind:'step',role:'main',label:sport,domain:'LT1',dose:{seconds:min*60},target:null}]});
  const r=buildDetStructuredBrick({sourceId:'SYNTH_BRICK',bike:{status:'structured',workout:c('bike',57)},run:{status:'structured',workout:c('run',34)},transitionSeconds:300,chosenDurationMin:96});
  if(r.status!=='structured')throw Error(r.reason);
  return {_planStartDate:'2026-11-09',weeks:[{weekNumber:1,sessions:[{weekNumber:1,dayIndex:0,title:'Enchaînement fictif',sport:'brick',durationMin:96,catalogId:'SYNTH_BRICK',detStructuredWorkout:r.workout,coachStart:{provenance:'coach_confirmed',localDate:'2026-11-09',minuteOfDay:480,timeZone:'Europe/Brussels',utcOffsetMinutes:60}}]}]};
}
beforeEach(()=>{db.rows.clear();db.insert.mockClear();db.invoke.mockClear();});
describe('coach export representation choice',()=>{
  it('requires both deliberate choices, creates and reads a new archive, preserves original, never sends',async()=>{
    const plan=fixture(),before=structuredClone(plan),saved=vi.fn();
    db.rows.set(version,{id:version,coach_id:coach,athlete_id:athlete,plan_json:plan,objective:'IM',weeks_count:1,sessions_count:1,validator_score:null,validator_grade:null,validator_summary:null});
    render(<NolioMultisportPreparation planVersionId={version} plan={plan} onSaved={saved}/>);
    const button=await screen.findByRole('button',{name:'Enregistrer une nouvelle version pour préparer Nolio'});
    expect(button).toBeDisabled();const boxes=screen.getAllByRole('checkbox');
    fireEvent.click(boxes[0]);expect(button).toBeDisabled();fireEvent.click(boxes[1]);expect(button).toBeEnabled();fireEvent.click(button);
    await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
    const [newId,newPlan]=saved.mock.calls[0];expect(newId).not.toBe(version);
    expect(newPlan.weeks).toEqual(before.weeks);expect(db.rows.get(version)?.plan_json).toEqual(before);
    expect(newPlan._nolioV2MultisportSplits['S1-J0-0']).toMatchObject({schema:'nolio-reviewed-split-v1',coachConfirmed:true});
    expect(db.invoke).not.toHaveBeenCalled();expect(db.insert).toHaveBeenCalledOnce();
  });
  it('clears selections and confirmation when the displayed version changes',async()=>{
    const p=fixture(),saved=vi.fn(),v=render(<NolioMultisportPreparation planVersionId={version} plan={p} onSaved={saved}/>);
    await screen.findByRole('button');fireEvent.click(screen.getAllByRole('checkbox')[0]);fireEvent.click(screen.getAllByRole('checkbox')[1]);
    v.rerender(<NolioMultisportPreparation planVersionId="new-version" plan={structuredClone(p)} onSaved={saved}/>);
    await waitFor(()=>expect(screen.getAllByRole('checkbox')).toHaveLength(2));
    for(const c of screen.getAllByRole('checkbox'))expect(c).not.toBeChecked();
    expect(screen.getByRole('button')).toBeDisabled();expect(db.insert).not.toHaveBeenCalled();
  });
});
