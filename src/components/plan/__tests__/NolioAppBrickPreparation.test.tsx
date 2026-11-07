import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import type {PlanVersionRow} from '@/lib/plan/appendOnlyPlanVersionSave';
const db=vi.hoisted(()=>({rows:new Map<string,PlanVersionRow>(),insert:vi.fn(),prepare:vi.fn(),invoke:vi.fn(),actor:'COACH'}));
vi.mock('@/lib/nolio/appBrickPreparation',()=>({prepareAppBrickExport:db.prepare}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:db.actor}},error:null})},functions:{invoke:db.invoke},from:()=>{
 const f:Record<string,unknown>={};const q={select:()=>q,eq:(k:string,v:unknown)=>{f[k]=v;return q;},maybeSingle:async()=>({data:[...db.rows.values()].find(r=>Object.entries(f).every(([k,v])=>r[k as keyof PlanVersionRow]===v))??null,error:null}),insert:async(row:PlanVersionRow)=>{db.insert(row);db.rows.set(row.id,structuredClone(row));return {error:null};}};return q;
}}}));
import {NolioAppBrickPreparation} from '../NolioAppBrickPreparation';
const id='22222222-2222-4222-8222-222222222222';
const fixture=()=>({title:'Fictif',totalWeeks:1,phases:[],weeks:[{weekNumber:1,sessions:[{weekNumber:1,dayIndex:5,dayName:'Samedi',sport:'brick',title:'Vélo + course',details:'Blocs exacts',detSourceComponents:[{sourceId:'SYNTH_BIKE'},{sourceId:'SYNTH_RUN'}]}]}],_provenance:{prescriptionAllowed:false}} as unknown as ParsedPlan);
beforeEach(()=>{cleanup();vi.clearAllMocks();db.actor='COACH';db.rows.clear();db.prepare.mockImplementation(async(p)=>({...p,_nolioV2MultisportSplits:{S1:{syntheticTestOnly:true}}}));});
function setup(owner='COACH'){
 const plan=fixture(),saved=vi.fn();db.rows.set(id,{id,coach_id:owner,athlete_id:'ATHLETE',plan_json:plan,objective:'70.3',weeks_count:1,sessions_count:1,validator_grade:null,validator_score:null,validator_summary:null});
 const view=render(<NolioAppBrickPreparation plan={plan} planVersionId={id} athleteId="ATHLETE" onSaved={saved}/>);return {plan,saved,view};
}
function fill(){
 fireEvent.change(screen.getByLabelText('Fuseau des enchaînements'),{target:{value:'Europe/Brussels'}});
 fireEvent.change(screen.getByLabelText('Départ vélo des enchaînements'),{target:{value:'09:00'}});
 fireEvent.change(screen.getByLabelText('Transition des enchaînements'),{target:{value:'5'}});
 fireEvent.click(screen.getByLabelText(/Appliquer ces horaires/));fireEvent.click(screen.getByLabelText(/Je confirme les blocs/));
}
describe('normal-app brick export preparation',()=>{
 it('requires deliberate inputs, saves and rereads a new owned version, preserves the parent and never sends',async()=>{
  const {plan,saved}=setup();const button=screen.getByRole('button',{name:'Enregistrer la version préparée pour Nolio'});expect(button).toBeDisabled();fill();expect(button).toBeEnabled();fireEvent.click(button);
  await waitFor(()=>expect(saved).toHaveBeenCalledOnce());const [nextId,next]=saved.mock.calls[0];expect(nextId).not.toBe(id);expect(db.rows.get(id)?.plan_json).toEqual(plan);expect(db.rows.get(nextId)?.plan_json).toEqual(next);expect(db.insert).toHaveBeenCalledOnce();expect(db.invoke).not.toHaveBeenCalled();
  expect(db.prepare).toHaveBeenCalledWith(plan,{keys:['S1-J5-0'],timeZone:'Europe/Brussels',time:'09:00',transitionMinutes:5,confirmed:true});
 });
 it('clears positive confirmation after an input change and refuses another owner',async()=>{
  setup('OTHER');fill();fireEvent.change(screen.getByLabelText('Transition des enchaînements'),{target:{value:'6'}});expect(screen.getByLabelText(/Je confirme les blocs/)).not.toBeChecked();fireEvent.click(screen.getByLabelText(/Je confirme les blocs/));fireEvent.click(screen.getByRole('button'));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Version possédée introuvable'));expect(db.prepare).not.toHaveBeenCalled();expect(db.insert).not.toHaveBeenCalled();
 });
 it('rechecks authentication after preparation before any write',async()=>{
  const {saved}=setup();db.prepare.mockImplementationOnce(async p=>{db.actor='OTHER';return p;});fill();fireEvent.click(screen.getByRole('button'));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Identité ou sélection modifiée'));expect(db.insert).not.toHaveBeenCalled();expect(saved).not.toHaveBeenCalled();
 });
});
