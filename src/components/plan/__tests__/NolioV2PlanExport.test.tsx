import {exportCapabilities} from '../../../../supabase/functions/_shared/nolioV2/exportCapabilities';
import {CHECKED_IN_PLAN_RELEASE_INFO} from '../../../../supabase/functions/_shared/planReleaseManifest';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {NolioV2ExportProvider,NolioV2ScopeButton} from '../NolioV2PlanExport';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import type {CoachFlowPorts} from '@/lib/nolio/coachExportFlow';
const mock=vi.hoisted(()=>({invoke:vi.fn(),getUser:vi.fn(),flow:vi.fn(),row:null as null|{id:string;athlete_id:string;coach_id:string;plan_json:unknown}}));
vi.mock('@/lib/nolio/coachExportFlow',()=>({runCoachExport:mock.flow}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:mock.getUser},from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:mock.row,error:null})};return q;},functions:{invoke:mock.invoke}}}));
const plan={title:'Test DET',totalWeeks:1,phases:[],weeks:[],_planStartDate:'2026-11-02',_provenance:{engine:'det',prescriptionAllowed:false}} as unknown as ParsedPlan;
const version='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{cleanup();vi.clearAllMocks();mock.row={id:version,athlete_id:'athlete',coach_id:'coach',plan_json:plan};mock.getUser.mockResolvedValue({data:{user:{id:'coach'}},error:null});mock.invoke.mockImplementation(async(name)=>({data:exportCapabilities(name,CHECKED_IN_PLAN_RELEASE_INFO.releaseId),error:null}));mock.flow.mockResolvedValue({verified:2,total:2});});
function setup(id:string|null=version,current=plan,ensureSaved?:()=>Promise<string|null>){return render(<NolioV2ExportProvider plan={current} athleteId="athlete" planVersionId={id} ensureSaved={ensureSaved} legacy={{nolioId:42,startDate:"2026-11-09",refs:{}}} enabled><NolioV2ScopeButton label="Plan" scope={{kind:'all'}}/><NolioV2ScopeButton label="Semaine" scope={{kind:'weeks',from:2,to:2}}/><NolioV2ScopeButton label="Séance" scope={{kind:'sessions',keys:['S2-J1-0']}}/></NolioV2ExportProvider>);}
function exportNow(label='Plan'){fireEvent.click(screen.getByRole('button',{name:label}));fireEvent.click(screen.getByRole('button',{name:/^Exporter vers Nolio$/}));}
describe('normal coach Nolio journey',()=>{
 it('offers read-only verification immediately after opening a saved plan, without exporting first',async()=>{
  setup();fireEvent.click(screen.getByRole('button',{name:'Plan'}));fireEvent.click(screen.getByRole('button',{name:'Vérifier dans Nolio sans renvoyer'}));await waitFor(()=>expect(mock.flow).toHaveBeenCalledOnce());expect(mock.flow.mock.calls[0][1]).toBe(true);
 });
 it('read-only verification never archives changed content',async()=>{
  const save=vi.fn();setup(version,{...plan,title:'Changed'},save);fireEvent.click(screen.getByRole('button',{name:'Plan'}));fireEvent.click(screen.getByRole('button',{name:'Vérifier dans Nolio sans renvoyer'}));await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('version sauvegardée'));expect(save).not.toHaveBeenCalled();expect(mock.flow).not.toHaveBeenCalled();
 });

 it('uses the same modal and saver for IA, with its existing transport and no V2 fallback',async()=>{
  const ai={...plan,_provenance:{engine:'ai'},weeks:[{weekNumber:1,sessions:[{weekNumber:1,dayIndex:1,sport:'run',title:'Séance IA',details:'Prescription existante',isRest:false}]}]} as unknown as ParsedPlan;
  mock.row={...mock.row!,plan_json:ai};mock.invoke.mockResolvedValue({data:{sent:1,total:1,errors:[]},error:null});setup(version,ai);exportNow();
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('1/1 séances acceptées par Nolio. Export terminé.'));
  expect(mock.flow).not.toHaveBeenCalled();expect(mock.invoke).toHaveBeenCalledOnce();expect(mock.invoke.mock.calls[0][0]).toBe('nolio-send-plan');
 });

 it.each([['Plan',{kind:'all'}],['Semaine',{kind:'weeks',from:2,to:2}],['Séance',{kind:'sessions',keys:['S2-J1-0']}]] as const)('exports %s with one deliberate action and automatic technical checks',async(label,scope)=>{
  setup();expect(mock.invoke).not.toHaveBeenCalled();exportNow(label);
  await waitFor(()=>expect(mock.flow).toHaveBeenCalledOnce());const p=mock.flow.mock.calls[0][0] as CoachFlowPorts;expect(p.scope).toEqual(scope);expect(p.planVersionId).toBe(version);expect(mock.invoke).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('status')).toHaveTextContent('2/2 activités confirmées dans Nolio. Export terminé.');
  expect(screen.queryByText(/validation sportive signée|Préparer les enchaînements|Relire ma revue coach|Simuler le prochain lot/)).not.toBeInTheDocument();
 });
 it('automatically saves and reads the exact resulting version before exporting a newly generated plan',async()=>{
  const next='33333333-3333-4333-8333-333333333333';const save=vi.fn(async()=>{mock.row={id:next,athlete_id:'athlete',coach_id:'coach',plan_json:plan};return next;});mock.row=null;setup(null,plan,save);exportNow();
  await waitFor(()=>expect(mock.flow).toHaveBeenCalledOnce());expect(save).toHaveBeenCalledOnce();expect((mock.flow.mock.calls[0][0] as CoachFlowPorts).planVersionId).toBe(next);
 });
 it('refreshes official sports automatically for a declared triathlon before checking export',async()=>{
  const racePlan={...plan,weeks:[{weekNumber:1,sessions:[{weekNumber:1,dayIndex:6,sport:'brick',title:'COURSE : 70.3',details:'Épreuve déclarée'}]}]} as unknown as ParsedPlan;
  mock.row={...mock.row!,plan_json:racePlan};mock.invoke.mockImplementation(async(name)=>({data:name==='nolio-v2-oauth'?{status:'REFS_LOADED'}:exportCapabilities(name,CHECKED_IN_PLAN_RELEASE_INFO.releaseId),error:null}));
  setup(version,racePlan);exportNow();await waitFor(()=>expect(mock.flow).toHaveBeenCalledOnce());expect(mock.invoke.mock.calls[0]).toEqual(['nolio-v2-oauth',{body:{action:'load_refs',athleteId:'athlete'}}]);expect(mock.invoke.mock.calls.every(([,a])=>!['activate','update_refs','send'].includes(a.body.action))).toBe(true);
 });
 it('refuses altered visible content without substituting a saved recipe',async()=>{
  setup(version,{...plan,title:'Different'});exportNow();await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Enregistrez ce plan'));expect(mock.flow).not.toHaveBeenCalled();expect(mock.invoke).not.toHaveBeenCalled();
 });
 it('requires the updated server workflow and never falls back to V1',async()=>{
  mock.invoke.mockImplementation(async(name)=>({data:{...exportCapabilities(name,CHECKED_IN_PLAN_RELEASE_INFO.releaseId),coachWorkflow:undefined},error:null}));setup();exportNow();await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('doit être synchronisé'));expect(mock.flow).not.toHaveBeenCalled();expect(mock.invoke.mock.calls.every(c=>c[1].body.action==='capabilities')).toBe(true);
 });
 it('does not claim success when provider readback is uncertain',async()=>{
  mock.flow.mockRejectedValueOnce(Error('Présence exacte non confirmée'));setup();exportNow();await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Présence exacte non confirmée'));expect(screen.getByRole('status')).not.toHaveTextContent('Export terminé');
 });
 it('rejects another owner before any server operation',async()=>{
  mock.row={...mock.row!,coach_id:'OTHER'};setup();exportNow();await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Version sauvegardée différente'));expect(mock.invoke).not.toHaveBeenCalled();expect(mock.flow).not.toHaveBeenCalled();
 });
 it('ignores late success after changing athlete/plan context',async()=>{
  let resolve!:(r:{verified:number;total:number})=>void;mock.flow.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const v=setup();exportNow();await waitFor(()=>expect(mock.flow).toHaveBeenCalledOnce());
  v.rerender(<NolioV2ExportProvider plan={{...plan,title:'Other'}} athleteId="other" planVersionId={null} enabled><NolioV2ScopeButton label="Other plan" scope={{kind:'all'}}/></NolioV2ExportProvider>);resolve({verified:2,total:2});await waitFor(()=>expect(screen.queryByText('Export terminé.')).not.toBeInTheDocument());
 });
});
