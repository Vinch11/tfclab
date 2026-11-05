import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AthleteProvider, useAthletes } from '@/contexts/AthleteContext';
import AITrainingPlanPage from '@/pages/AITrainingPlanPage';

const m=vi.hoisted(()=>{
 const coach='SYNTH_COACH', rows=[{id:'SYNTH_ATH',coach_id:'SYNTH_COACH',name:'Athlete synthetic',goal:'703',refs:{},vo2max:null,active_snapshot_id:null,birth_date:'1990-05-01',is_hidden:false,sex:'F'}];
 const empty:never[]=[];const no=()=>null;
 const cloud={athletes:rows,snapshots:empty,tests:empty,getSnapshotsForAthlete:()=>empty,getTestsForAthlete:()=>empty,getCheckinsForAthlete:()=>empty,getPlan:no,addSnapshot:vi.fn(),updateSnapshot:vi.fn(),addAthlete:vi.fn(),updateAthlete:vi.fn(),deleteAthlete:vi.fn(),loadData:vi.fn()};
 const generation=vi.fn(),reset=vi.fn(),setResponse=vi.fn();
 const hook={prevalidation:null,prevalidateTrainingPlan:vi.fn(),response:'',isLoading:false,chunkProgress:null,generatePlanWindowed:generation,reset,setResponse,parsedPlan:null,sportObjectiveIssues:empty,mergedPlan:null,weeklyQuotaIssues:empty,catalogIdIssues:empty,lastAllowedCatalogIdsRef:{current:null},lastWeeklyQuotasRef:{current:null},lastResponseRef:{current:''}};
 return {coach,cloud,hook,generation};
});
vi.mock('@/contexts/CloudDataContext',()=>({useCloudDataContext:()=>m.cloud}));
vi.mock('@/components/AppLayout',()=>({AppLayout:({children}:{children:React.ReactNode})=><main><Link to="/dashboard">Dashboard de test</Link>{children}</main>}));
vi.mock('@/hooks/useAITrainingPlan',async original=>({...await original<typeof import('@/hooks/useAITrainingPlan')>(),useAITrainingPlan:()=>m.hook}));
vi.mock('@/hooks/useAthleteRaceGoals',()=>({useAthleteRaceGoals:()=>({raceGoals:[]})}));
vi.mock('@/hooks/usePlanSnapshotSync',()=>({usePlanSnapshotSync:()=>({archiveCurrentPlan:vi.fn()})}));
vi.mock('@/lib/plan/appPlanningPipeline',async original=>({...await original<typeof import('@/lib/plan/appPlanningPipeline')>(),computeAppDiagnosticForAthlete:()=>null}));
vi.mock('@/integrations/supabase/client',()=>{ const chain:Record<string,unknown>={}; for(const k of ['select','eq','is','order','limit','in'])chain[k]=()=>chain; chain.maybeSingle=async()=>({data:null,error:null}); chain.then=(resolve:(v:unknown)=>unknown)=>resolve({data:[],error:null}); return {supabase:{from:()=>chain,auth:{getUser:async()=>({data:{user:{id:m.coach,role:'authenticated'}},error:null}),getSession:async()=>({data:{session:{user:{id:m.coach}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})}}};});
vi.mock('@/components/PlanHistoryCard',()=>({PlanHistoryCard:()=>null}));
vi.mock('@/components/CoachProfileForm',()=>({CoachProfileForm:()=>null}));
vi.mock('@/components/QuickStartWizard',()=>({QuickStartWizard:()=>null}));
vi.mock('@/components/FinisherQuickStartDialog',()=>({FinisherQuickStartDialog:()=>null}));
vi.mock('@/components/ProfilExpressDialog',()=>({ProfilExpressDialog:()=>null}));
vi.mock('@/components/AIPlanBenchmark',()=>({AIPlanBenchmark:()=>null}));
vi.mock('@/components/plan/PlanAdaptationDialog',()=>({PlanAdaptationDialog:()=>null}));

function Owner(){const {currentAthlete}=useAthletes();return <output data-testid="mapped-owner" data-birth={currentAthlete?.birth_date??''} data-sex={currentAthlete?.sex??''}>{currentAthlete?.coach_id??'absent'}</output>;}
function Page(){return <MemoryRouter initialEntries={['/plan']}><TooltipProvider><AthleteProvider><Owner/><Routes><Route path="/plan" element={<AITrainingPlanPage/>}/><Route path="/dashboard" element={<Link to="/plan">Revenir au plan</Link>}/></Routes></AthleteProvider></TooltipProvider></MemoryRouter>;}
function field(label:string){const node=screen.getByText(label);const input=node.parentElement?.querySelector('input');if(!input)throw Error('Champ absent: '+label);return input;}
function hours(){return field('Heures/sem');}
function weeks(){const node=screen.getByText('semaines',{selector:'span'});return node.parentElement!.querySelector('input')!;}
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.clearAllMocks();});
afterEach(cleanup);
describe('actual athlete provider and planning page navigation',()=>{
 it('retains the database coach identity at the UI boundary',()=>{render(<MemoryRouter><AthleteProvider><Owner/></AthleteProvider></MemoryRouter>);expect(screen.getByTestId('mapped-owner')).toHaveTextContent(m.coach);expect(screen.getByTestId('mapped-owner')).toHaveAttribute('data-birth','1990-05-01');expect(screen.getByTestId('mapped-owner')).toHaveAttribute('data-sex','F');});
 it('keeps an ungenerated configuration across Dashboard navigation and a full remount',async()=>{
  const view=render(<Page/>);
  await waitFor(()=>expect(screen.getByText('Brouillon de configuration conservé dans ce navigateur.')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button',{name:'Configuration'}));
  fireEvent.change(hours(),{target:{value:'10'}});
  fireEvent.change(field('Séances/sem'),{target:{value:'8'}});
  fireEvent.change(field('Date de début du plan'),{target:{value:'2026-11-09'}});
  fireEvent.click(screen.getByRole('button',{name:'Durée'}));
  fireEvent.change(weeks(),{target:{value:'12'}});
  fireEvent.click(screen.getByText('Dashboard de test'));
  fireEvent.click(screen.getByText('Revenir au plan'));
  await waitFor(()=>expect(hours()).toHaveValue(10));
  expect(field('Séances/sem')).toHaveValue(8);expect(weeks()).toHaveValue(12);expect(field('Date de début du plan')).toHaveValue('2026-11-09');
  view.unmount();render(<Page/>);
  await waitFor(()=>expect(hours()).toHaveValue(10));
  expect(field('Séances/sem')).toHaveValue(8);expect(weeks()).toHaveValue(12);expect(field('Date de début du plan')).toHaveValue('2026-11-09');
  expect(m.generation).not.toHaveBeenCalled();
 });
});
