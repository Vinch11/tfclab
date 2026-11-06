import {exportCapabilities} from '../../../../supabase/functions/_shared/nolioV2/exportCapabilities';
import {CHECKED_IN_PLAN_RELEASE_INFO} from '../../../../supabase/functions/_shared/planReleaseManifest';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {NolioV2ExportProvider,NolioV2ScopeButton} from '../NolioV2PlanExport';
import type {ParsedPlan} from '@/lib/aiPlanParser';
const mock=vi.hoisted(()=>({invoke:vi.fn(),getUser:vi.fn(),row:null as any}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:mock.getUser},from:()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:mock.row,error:null})};return q;},functions:{invoke:mock.invoke}}}));
vi.mock('../NolioAppBrickPreparation',()=>({NolioAppBrickPreparation:({plan,onSaved}:{plan:ParsedPlan;onSaved:(id:string,p:ParsedPlan)=>void})=><button onClick={()=>{const next={...plan,_nolioV2MultisportSplits:{syntheticTestOnly:true}} as ParsedPlan;mock.row={...mock.row,id:'33333333-3333-4333-8333-333333333333',plan_json:next};onSaved(mock.row.id,next);}}>Préparation simulée</button>}));
const plan={title:'Test DET',totalWeeks:1,phases:[],weeks:[],_planStartDate:'2026-11-02',_provenance:{engine:'det',prescriptionAllowed:false}} as unknown as ParsedPlan;
const version='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{cleanup();vi.clearAllMocks();mock.row={id:version,athlete_id:'athlete',coach_id:'coach',plan_json:plan};mock.getUser.mockResolvedValue({data:{user:{id:'coach'}},error:null});mock.invoke.mockImplementation(async(fn,{body})=>body.action==='capabilities'?{data:{...exportCapabilities(fn,CHECKED_IN_PLAN_RELEASE_INFO.releaseId),sportingReleaseAuthorized:false},error:null}:{data:{status:'BLOCKED',code:'connection_absent',precheck:null,progress:null},error:null});});
function setup(versionId:string|null=version,current=plan){return render(<NolioV2ExportProvider plan={current} athleteId="athlete" planVersionId={versionId} enabled><NolioV2ScopeButton label="Plan" scope={{kind:'all'}}/><NolioV2ScopeButton label="Semaine" scope={{kind:'weeks',from:2,to:2}}/><NolioV2ScopeButton label="Séance" scope={{kind:'sessions',keys:['S2-J1-0']}}/></NolioV2ExportProvider>);}
describe('common viewer Nolio V2 scopes',()=>{
 it.each([['Plan',undefined],['Semaine',{kind:'weeks',from:2,to:2}],['Séance',{kind:'sessions',keys:['S2-J1-0']}]] as const)('prepares %s only after a deliberate action with no client workout body',async(label,scope)=>{
  setup();expect(mock.invoke).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:label}));expect(mock.invoke).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Contrôler cette sélection'}));
  await waitFor(()=>expect(mock.invoke).toHaveBeenCalledTimes(3));
  expect(mock.invoke).toHaveBeenCalledWith('nolio-v2-plan-dry-run',{body:{planVersionId:version,action:'precheck',...(scope?{scope}:{})}});
  expect(screen.queryByRole('button',{name:'Envoyer le prochain lot vers Nolio'})).not.toBeInTheDocument();
 });
 it('requires a saved version before even invoking the backend',async()=>{
  setup(null);fireEvent.click(screen.getByRole('button',{name:'Séance'}));fireEvent.click(screen.getByRole('button',{name:'Contrôler cette sélection'}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Enregistrez ce plan'));
  expect(mock.invoke).not.toHaveBeenCalled();
 });
 it('refuses local changes without rewriting or substituting the saved workout',async()=>{
  setup(version,{...plan,title:'Changed plan'});fireEvent.click(screen.getByRole('button',{name:'Plan'}));fireEvent.click(screen.getByRole('button',{name:'Contrôler cette sélection'}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('diffère de la version sauvegardée'));
  expect(mock.invoke).not.toHaveBeenCalled();
 });
 it('does not call V1 when the scoped V2 backend rejects the request',async()=>{
  mock.invoke.mockResolvedValue({data:null,error:Error('unknown_fields')});setup();fireEvent.click(screen.getByRole('button',{name:'Semaine'}));fireEvent.click(screen.getByRole('button',{name:'Contrôler cette sélection'}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('ne sont pas synchronisés'));
  expect(mock.invoke).toHaveBeenCalledTimes(2);expect(mock.invoke.mock.calls.every(c=>c[1].body.action==='capabilities')).toBe(true);
 });
});

it('switches every later export to the exact newly saved preparation version instead of the unchanged parent',async()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'Plan'}));fireEvent.click(screen.getByRole('button',{name:'Préparer la version sauvegardée'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Préparation simulée'})).toBeInTheDocument());expect(mock.invoke).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Préparation simulée'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 fireEvent.click(screen.getByRole('button',{name:'Plan'}));fireEvent.click(screen.getByRole('button',{name:'Contrôler cette sélection'}));
 await waitFor(()=>expect(mock.invoke).toHaveBeenCalledTimes(3));
 expect(mock.invoke).toHaveBeenCalledWith('nolio-v2-plan-dry-run',{body:{planVersionId:'33333333-3333-4333-8333-333333333333',action:'precheck'}});
 expect(mock.invoke.mock.calls.every(([,a])=>a.body.planVersionId!=='22222222-2222-4222-8222-222222222222')).toBe(true);
});
