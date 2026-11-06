import { afterEach,describe,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { V3PlanGeneration } from './V3PlanGeneration';
import type { FrozenAppPlanningInput } from '@/lib/det/appPlanningInput';
const boundary=vi.hoisted(()=>({generate:vi.fn()}));
vi.mock('@/lib/det/appPlanningV3Proposal',()=>({generateAppPlanningV3Proposal:boundary.generate}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const app={athleteId:'SYNTH_A',fingerprint:'a'.repeat(64)} as FrozenAppPlanningInput;
const plan={kind:'v3_plan_proposal',objective:'70.3',weeks:[],limiterOrder:['VLamax'],checks:[],prescriptionAllowed:false};
const owner={userId:'SYNTH_COACH',athleteId:'SYNTH_A'};
describe('V3 plan generation action',()=>{
 it('generates a selected V3 proposal without the athlete review form and rechecks ownership',async()=>{
  boundary.generate.mockResolvedValue(plan);const guard=vi.fn(async()=>owner);
  render(<V3PlanGeneration app={app} athleteId="SYNTH_A" coachId="SYNTH_COACH" guard={guard} options={{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Générer le plan V3 à revoir'}));
  await waitFor(()=>expect(screen.getByRole('dialog')).toBeInTheDocument());
  expect(boundary.generate).toHaveBeenCalledWith(app,'SYNTH_A',{});expect(guard).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('status')).toHaveTextContent('non approuvée');
  expect(screen.queryByRole('button',{name:/Nolio|sauvegarder|exporter/i})).toBeNull();
 });
 it('does not expose a result after the authenticated coach changes',async()=>{
  boundary.generate.mockResolvedValue(plan);const guard=vi.fn().mockResolvedValueOnce(owner).mockResolvedValueOnce({userId:'OTHER',athleteId:'SYNTH_A'});
  render(<V3PlanGeneration app={app} athleteId="SYNTH_A" coachId="SYNTH_COACH" guard={guard} options={{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Générer le plan V3 à revoir'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Connexion modifiée'));
  expect(screen.queryByRole('dialog')).toBeNull();
 });
 it('discards an in-flight result when the shared input changes',async()=>{
  let done:(value:unknown)=>void=()=>{};boundary.generate.mockImplementation(()=>new Promise(resolve=>{done=resolve;}));
  const guard=async()=>owner;
  const view=render(<V3PlanGeneration app={app} athleteId="SYNTH_A" coachId="SYNTH_COACH" guard={guard} options={{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Générer le plan V3 à revoir'}));
  await waitFor(()=>expect(boundary.generate).toHaveBeenCalledTimes(1));
  view.rerender(<V3PlanGeneration app={{...app,fingerprint:'b'.repeat(64)}} athleteId="SYNTH_A" coachId="SYNTH_COACH" guard={guard} options={{}}/>);
  done(plan);await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 });
});
