import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {NolioV2ExportProvider,NolioV2ScopeButton} from '../NolioV2PlanExport';
import type {ParsedPlan} from '@/lib/aiPlanParser';
const mock=vi.hoisted(()=>({invoke:vi.fn(),getUser:vi.fn(),row:null as any}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:mock.getUser},from:()=>{const q:any={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:mock.row,error:null})};return q;},functions:{invoke:mock.invoke}}}));
const plan={title:'Test DET',totalWeeks:1,phases:[],weeks:[],_planStartDate:'2026-11-02',_provenance:{engine:'det',prescriptionAllowed:false}} as unknown as ParsedPlan;
const version='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{cleanup();vi.clearAllMocks();mock.row={id:version,athlete_id:'athlete',coach_id:'coach',plan_json:plan};mock.getUser.mockResolvedValue({data:{user:{id:'coach'}},error:null});mock.invoke.mockResolvedValue({data:{status:'BLOCKED',code:'connection_absent',precheck:null,progress:null},error:null});});
function setup(versionId:string|null=version,current=plan){return render(<NolioV2ExportProvider plan={current} athleteId="athlete" planVersionId={versionId} enabled><NolioV2ScopeButton label="Plan" scope={{kind:'all'}}/><NolioV2ScopeButton label="Semaine" scope={{kind:'weeks',from:2,to:2}}/><NolioV2ScopeButton label="Séance" scope={{kind:'sessions',keys:['S2-J1-0']}}/></NolioV2ExportProvider>);}
describe('common viewer Nolio V2 scopes',()=>{
 it.each([['Plan',undefined],['Semaine',{kind:'weeks',from:2,to:2}],['Séance',{kind:'sessions',keys:['S2-J1-0']}]] as const)('prepares %s only after a deliberate action with no client workout body',async(label,scope)=>{
  setup();expect(mock.invoke).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:label}));expect(mock.invoke).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Contrôler cette sélection'}));
  await waitFor(()=>expect(mock.invoke).toHaveBeenCalledTimes(1));
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
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Le service doit prendre en charge cette sélection'));
  expect(mock.invoke).toHaveBeenCalledTimes(1);expect(mock.invoke.mock.calls[0][0]).toBe('nolio-v2-plan-dry-run');
 });
});
