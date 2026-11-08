import {exportCapabilities} from '../../../../supabase/functions/_shared/nolioV2/exportCapabilities';
import {CHECKED_IN_PLAN_RELEASE_INFO} from '../../../../supabase/functions/_shared/planReleaseManifest';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import {NolioV2ExportProvider,NolioV2ScopeButton} from '../NolioV2PlanExport';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import type {CoachFlowPorts} from '@/lib/nolio/coachExportFlow';
import {pendingRecreation,writeExportResume} from '@/lib/nolio/exportResume';
import {canonical,sha256Hex} from '../../../../supabase/functions/_shared/nolioV2/dryRun';
const mock=vi.hoisted(()=>({invoke:vi.fn(),getUser:vi.fn(),flow:vi.fn(),authListener:null as null|((event:string,session:{user:{id:string}}|null)=>void),row:null as null|{id:string;athlete_id:string;coach_id:string;plan_json:unknown}}));
vi.mock('@/lib/nolio/coachExportFlow',async importOriginal=>({...await importOriginal<typeof import('@/lib/nolio/coachExportFlow')>(),runCoachExport:mock.flow}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:mock.getUser,onAuthStateChange:(callback:typeof mock.authListener)=>{mock.authListener=callback;return {data:{subscription:{unsubscribe:()=>{if(mock.authListener===callback)mock.authListener=null;}}}};}},from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:mock.row,error:null})};return q;},functions:{invoke:mock.invoke}}}));
const plan={title:'Test DET',totalWeeks:1,phases:[],weeks:[],_planStartDate:'2026-11-02',_provenance:{engine:'det',prescriptionAllowed:false}} as unknown as ParsedPlan;
const version='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{cleanup();sessionStorage.clear();window.history.replaceState({},'','/ai-plan');vi.clearAllMocks();mock.row={id:version,athlete_id:'athlete',coach_id:'coach',plan_json:plan};mock.getUser.mockResolvedValue({data:{user:{id:'coach'}},error:null});mock.invoke.mockImplementation(async(name)=>({data:exportCapabilities(name,CHECKED_IN_PLAN_RELEASE_INFO.releaseId),error:null}));mock.flow.mockResolvedValue({verified:2,total:2});});
function setup(id:string|null=version,current=plan,ensureSaved?:()=>Promise<string|null>){return render(<NolioV2ExportProvider plan={current} athleteId="athlete" planVersionId={id} ensureSaved={ensureSaved} legacy={{nolioId:42,startDate:"2026-11-09",refs:{}}} enabled><NolioV2ScopeButton label="Plan" scope={{kind:'all'}}/><NolioV2ScopeButton label="Semaine" scope={{kind:'weeks',from:2,to:2}}/><NolioV2ScopeButton label="Séance" scope={{kind:'sessions',keys:['S2-J1-0']}}/></NolioV2ExportProvider>);}
function openAdvanced(){fireEvent.click(screen.getByRole('button',{name:'Options avancées'}));}
function exportNow(label='Plan'){fireEvent.click(screen.getByRole('button',{name:label}));fireEvent.click(screen.getByRole('button',{name:/^Exporter vers Nolio$/}));}
describe('normal coach Nolio journey',()=>{
 it('offers an explicit saved-plan diagnostic without starting the normal export',async()=>{
  mock.flow.mockImplementationOnce(async(p:CoachFlowPorts)=>{expect(p.diagnoseOnly).toBe(true);throw Error('Diagnostic comparatif — simulations uniquement');});
  setup();fireEvent.click(screen.getByRole('button',{name:'Plan'}));fireEvent.click(screen.getByRole('button',{name:'Options avancées'}));
  fireEvent.click(screen.getByRole('button',{name:'Analyser le refus sans envoyer'}));
  await waitFor(()=>expect(screen.getByText('Diagnostic comparatif — simulations uniquement')).toBeInTheDocument());
  expect(mock.flow).toHaveBeenCalledTimes(1);expect(screen.queryByText(/Export terminé/)).not.toBeInTheDocument();
 });
 it('keeps the pending question when focus recovery emits SIGNED_IN for the same verified coach',async()=>{
  const posted=vi.fn(),rows=[{opIndex:0,sessionKey:'S1-J1-1',date:'2026-11-10',title:'Test',binding:'d'.repeat(64)}];
  mock.flow.mockImplementationOnce(async(p:CoachFlowPorts)=>{if(!await p.confirmRecreation!(rows))throw Error('Export annulé');posted();return {verified:2,total:2};});
  setup();exportNow();await waitFor(()=>expect(screen.getByRole('button',{name:'Recréer et continuer'})).toBeInTheDocument());
  act(()=>mock.authListener!('SIGNED_IN',{user:{id:'coach'}}));
  expect(screen.getByRole('button',{name:'Recréer et continuer'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Recréer et continuer'}));await waitFor(()=>expect(posted).toHaveBeenCalledOnce());expect(mock.flow).toHaveBeenCalledOnce();
 });
 it('keeps a pending question across an equivalent parent rerender without repeating the inspection',async()=>{
  const posted=vi.fn(),rows=[{opIndex:0,sessionKey:'S1-J1-1',date:'2026-11-10',title:'Test',binding:'d'.repeat(64)}];
  mock.flow.mockImplementationOnce(async(p:CoachFlowPorts)=>{if(!await p.confirmRecreation!(rows))throw Error('Export annulé');posted();return {verified:2,total:2};});
  const v=setup();exportNow();await waitFor(()=>expect(screen.getByRole('button',{name:'Recréer et continuer'})).toBeInTheDocument());
  v.rerender(<NolioV2ExportProvider plan={structuredClone(plan)} athleteId="athlete" planVersionId={version} legacy={{nolioId:42,startDate:'2026-11-09',refs:{}}} enabled><NolioV2ScopeButton label="Plan" scope={{kind:'all'}}/></NolioV2ExportProvider>);
  expect(screen.getByRole('button',{name:'Recréer et continuer'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Recréer et continuer'}));await waitFor(()=>expect(posted).toHaveBeenCalledOnce());expect(mock.flow).toHaveBeenCalledOnce();
 });
 it.each([['SIGNED_OUT',null],['SIGNED_IN',{user:{id:'other'}}],['TOKEN_REFRESHED',{user:{id:'other'}}]] as const)('cancels pending creation on a real identity change: %s',async(event,session)=>{
  const posted=vi.fn(),rows=[{opIndex:0,sessionKey:'S1-J1-1',date:'2026-11-10',title:'Test',binding:'d'.repeat(64)}];
  mock.flow.mockImplementationOnce(async(p:CoachFlowPorts)=>{if(!await p.confirmRecreation!(rows))throw Error('Export annulé');posted();return {verified:2,total:2};});
  setup();exportNow();await waitFor(()=>expect(screen.getByRole('button',{name:'Recréer et continuer'})).toBeInTheDocument());
  act(()=>mock.authListener!(event,session));
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Recréer et continuer'})).not.toBeInTheDocument());expect(posted).not.toHaveBeenCalled();
 });
 it('reopens the exact export scope after remount and restores a pending question without automatic export',async()=>{
  const athlete='11111111-1111-4111-8111-111111111111';
  mock.row={...mock.row!,athlete_id:athlete};
  writeExportResume({athleteId:athlete,versionId:version,scope:{kind:'weeks',from:2,to:3}});
  const hash=await sha256Hex(canonical(plan));
  const decision={planSha256:hash,refsSha256:'b'.repeat(64),opsSha256:'c'.repeat(64),rows:[{opIndex:0,sessionKey:'S1-J1-0',date:'2026-11-10',title:'Test',binding:'d'.repeat(64)}]};
  pendingRecreation('coach',version,hash,decision);
  render(<NolioV2ExportProvider plan={plan} athleteId={athlete} planVersionId={version} enabled>Plan</NolioV2ExportProvider>);
  await waitFor(()=>expect(screen.getByRole('dialog')).toBeInTheDocument());
  expect(screen.getByLabelText('Première semaine Nolio')).toHaveValue(2);expect(screen.getByLabelText('Dernière semaine Nolio')).toHaveValue(3);
  expect(mock.flow).not.toHaveBeenCalled();expect(mock.invoke).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Exporter vers Nolio'}));
  await waitFor(()=>expect(mock.flow).toHaveBeenCalledOnce());expect(mock.flow.mock.calls[0][3]).toEqual({kind:'resume',decision});
 });
 it('does not reopen an export for another athlete',()=>{
  writeExportResume({athleteId:'11111111-1111-4111-8111-111111111111',versionId:version,scope:{kind:'all'}});
  setup();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(mock.invoke).not.toHaveBeenCalled();
 });
 it('shows one export action with technical tools hidden by default',()=>{
  setup();fireEvent.click(screen.getByRole('button',{name:'Plan'}));
  expect(screen.getByRole('button',{name:'Exporter vers Nolio'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Options avancées'})).toHaveAttribute('aria-expanded','false');
  for(const name of ['Vérifier dans Nolio sans renvoyer','Rapprocher les anciens exports sans envoyer','Lire les zones de travail Nolio','Contrôler les activités manquantes'])expect(screen.queryByRole('button',{name})).not.toBeInTheDocument();
 });
 it('asks only a contextual deletion decision inside the ordinary Export flow',async()=>{
  const posted=vi.fn(),rows=[{opIndex:0,sessionKey:'S1-J1-1',date:'2026-11-10',title:'Synthetic deleted session',binding:'d'.repeat(64)}];
  mock.flow.mockImplementationOnce(async(p:CoachFlowPorts)=>{if(!await p.confirmRecreation!(rows))throw Error('Export annulé');posted();return {verified:2,total:2};});
  const save=vi.fn();setup(version,plan,save);exportNow();await waitFor(()=>expect(screen.getByRole('button',{name:'Recréer et continuer'})).toBeInTheDocument());
  expect(mock.flow).toHaveBeenCalledOnce();expect(posted).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Recréer et continuer'}));await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('2/2 activités confirmées'));expect(posted).toHaveBeenCalledOnce();expect(mock.flow).toHaveBeenCalledOnce();expect(save).not.toHaveBeenCalled();
 });
 it('cancels the contextual recreation without any creation',async()=>{
  const posted=vi.fn(),rows=[{opIndex:0,sessionKey:'S1-J1-1',date:'2026-11-10',title:'Deleted',binding:'d'.repeat(64)}];
  mock.flow.mockImplementationOnce(async(p:CoachFlowPorts)=>{if(!await p.confirmRecreation!(rows))throw Error('Export annulé');posted();return {verified:2,total:2};});
  setup();exportNow();await waitFor(()=>expect(screen.getByRole('button',{name:'Annuler l’export'})).toBeInTheDocument());fireEvent.click(screen.getByRole('button',{name:'Annuler l’export'}));await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Export annulé'));expect(posted).not.toHaveBeenCalled();
 });
 it('invalidates a pending recreation decision when athlete/plan context changes',async()=>{
  const posted=vi.fn(),rows=[{opIndex:0,sessionKey:'S1-J1-1',date:'2026-11-10',title:'Deleted',binding:'d'.repeat(64)}];
  mock.flow.mockImplementationOnce(async(p:CoachFlowPorts)=>{if(!await p.confirmRecreation!(rows))throw Error('Export annulé');posted();return {verified:2,total:2};});
  const v=setup();exportNow();await waitFor(()=>expect(screen.getByRole('button',{name:'Recréer et continuer'})).toBeInTheDocument());
  v.rerender(<NolioV2ExportProvider plan={{...plan,title:'Other'}} athleteId="other" planVersionId={null} enabled><NolioV2ScopeButton label="Other plan" scope={{kind:'all'}}/></NolioV2ExportProvider>);
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Recréer et continuer'})).not.toBeInTheDocument());expect(posted).not.toHaveBeenCalled();
 });
 it('offers standalone read-only reconciliation without archiving or claiming delivery',async()=>{
  const save=vi.fn();setup(version,plan,save);fireEvent.click(screen.getByRole('button',{name:'Plan'}));openAdvanced();fireEvent.click(screen.getByRole('button',{name:'Rapprocher les anciens exports sans envoyer'}));
  await waitFor(()=>expect(mock.flow).toHaveBeenCalledOnce());expect(mock.flow.mock.calls[0].slice(1)).toEqual([false,true]);expect(save).not.toHaveBeenCalled();expect(screen.getByRole('status')).toHaveTextContent('Aucun envoi effectué');expect(screen.getByRole('status')).not.toHaveTextContent('Export terminé');
 });
 it('does not archive a changed visible plan during standalone reconciliation',async()=>{
  const save=vi.fn();setup(version,{...plan,title:'Changed'},save);fireEvent.click(screen.getByRole('button',{name:'Plan'}));openAdvanced();fireEvent.click(screen.getByRole('button',{name:'Rapprocher les anciens exports sans envoyer'}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('version sauvegardée'));expect(save).not.toHaveBeenCalled();expect(mock.flow).not.toHaveBeenCalled();expect(mock.invoke).not.toHaveBeenCalled();
 });
 it('never sends or rewrites an old zero-ceiling archive as if it had new guided prescriptions',async()=>{
  const old={...plan,weeks:[{weekNumber:1,sessions:[{weekNumber:1,dayIndex:1,sport:'bike',title:'Old',detStructuredWorkout:{nodes:[{kind:'step',domain:'recovery',target:{metric:'watts',min:0,max:165,confidence:'model',source:'athlete_measurement_with_doctrine_model'}}]}}]}]} as unknown as ParsedPlan;
  mock.row={...mock.row!,plan_json:old};setup(version,old);exportNow();await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('anciens plafonds'));
  expect(mock.invoke).not.toHaveBeenCalled();expect(mock.flow).not.toHaveBeenCalled();
 });
 it('reads owned athlete zones without running export, saving or granting consent',async()=>{
  const save=vi.fn();mock.invoke.mockResolvedValue({data:{status:'ZONES_READ',summary:'Recovery : 0–165 W. Aucune séance modifiée.'},error:null});
  setup(version,plan,save);fireEvent.click(screen.getByRole('button',{name:'Plan'}));openAdvanced();fireEvent.click(screen.getByRole('button',{name:'Lire les zones de travail Nolio'}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Recovery : 0–165 W'));
  expect(mock.invoke).toHaveBeenCalledOnce();expect(mock.invoke).toHaveBeenCalledWith('nolio-v2-send-plan',{body:{workflow:'coach',action:'zones',planVersionId:version}});expect(mock.flow).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();
 });
 it('refuses zone inspection of a different saved owner before any provider operation',async()=>{
  mock.row={...mock.row!,coach_id:'OTHER'};setup();fireEvent.click(screen.getByRole('button',{name:'Plan'}));openAdvanced();fireEvent.click(screen.getByRole('button',{name:'Lire les zones de travail Nolio'}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('lecture annulée'));expect(mock.invoke).not.toHaveBeenCalled();
 });
 it('offers read-only verification immediately after opening a saved plan, without exporting first',async()=>{
  setup();fireEvent.click(screen.getByRole('button',{name:'Plan'}));openAdvanced();fireEvent.click(screen.getByRole('button',{name:'Vérifier dans Nolio sans renvoyer'}));await waitFor(()=>expect(mock.flow).toHaveBeenCalledOnce());expect(mock.flow.mock.calls[0][1]).toBe(true);
 });
 it('read-only verification never archives changed content',async()=>{
  const save=vi.fn();setup(version,{...plan,title:'Changed'},save);fireEvent.click(screen.getByRole('button',{name:'Plan'}));openAdvanced();fireEvent.click(screen.getByRole('button',{name:'Vérifier dans Nolio sans renvoyer'}));await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('version sauvegardée'));expect(save).not.toHaveBeenCalled();expect(mock.flow).not.toHaveBeenCalled();
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
 it('lets the server precheck decide whether a declared triathlon needs another sports read',async()=>{
  const racePlan={...plan,weeks:[{weekNumber:1,sessions:[{weekNumber:1,dayIndex:6,sport:'brick',title:'COURSE : 70.3',details:'Épreuve déclarée'}]}]} as unknown as ParsedPlan;
  mock.row={...mock.row!,plan_json:racePlan};mock.invoke.mockImplementation(async(name)=>({data:name==='nolio-v2-oauth'?{status:'REFS_LOADED'}:exportCapabilities(name,CHECKED_IN_PLAN_RELEASE_INFO.releaseId),error:null}));
  setup(version,racePlan);exportNow();await waitFor(()=>expect(mock.flow).toHaveBeenCalledOnce());expect(mock.invoke.mock.calls.some(([name])=>name==='nolio-v2-oauth')).toBe(false);expect(mock.flow.mock.calls[0][0].refreshCompetitionRefs).toBeTypeOf('function');expect(mock.invoke.mock.calls.every(([,a])=>!['activate','update_refs','send'].includes(a.body.action))).toBe(true);
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
