import {useState} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {AuthGate} from '../AuthGate';
import {OnboardingGate} from '../OnboardingGate';
const state=vi.hoisted(()=>({user:{id:'coach-a'},read:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user,loading:false})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select:()=>({eq:(_key:string,id:string)=>({maybeSingle:()=>state.read(id)})})})}}));
const profile=(id:string)=>({data:{user_id:id,onboarding_completed:true,logo_url:null},error:null});
function PlanningScreen(){
 const [plan,setPlan]=useState(false);
 return <><button onClick={()=>setPlan(true)}>Charger le plan sauvegardé</button>{plan?<div>Plan QA_DET_A ouvert · confirmation Nolio en attente</div>:<div>Configurer puis Générer</div>}</>;
}
function Page(){return <MemoryRouter><AuthGate><OnboardingGate><PlanningScreen/></OnboardingGate></AuthGate></MemoryRouter>;}
beforeEach(()=>{cleanup();state.user={id:'coach-a'};state.read.mockReset();state.read.mockImplementation(async(id:string)=>profile(id));});
describe('actual auth and onboarding gates around the planning screen',()=>{
 it('keeps the whole loaded screen mounted when focus supplies a fresh User object for the same coach',async()=>{
  const page=render(<Page/>);await screen.findByRole('button',{name:'Charger le plan sauvegardé'});
  fireEvent.click(screen.getByRole('button',{name:'Charger le plan sauvegardé'}));
  state.read.mockImplementation(()=>new Promise(()=>{}));
  state.user={id:'coach-a'};
  await act(async()=>{page.rerender(<Page/>);});
  expect(screen.getByText('Plan QA_DET_A ouvert · confirmation Nolio en attente')).toBeInTheDocument();
  expect(state.read).toHaveBeenCalledTimes(1);
 });
 it('does unmount the loaded screen for a different coach, and never carries the plan to that account',async()=>{
  const page=render(<Page/>);await screen.findByRole('button',{name:'Charger le plan sauvegardé'});
  fireEvent.click(screen.getByRole('button',{name:'Charger le plan sauvegardé'}));
  let resolve!:(v:ReturnType<typeof profile>)=>void;
  state.read.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));state.user={id:'coach-b'};
  await act(async()=>{page.rerender(<Page/>);});
  expect(screen.queryByText('Plan QA_DET_A ouvert · confirmation Nolio en attente')).not.toBeInTheDocument();
  await act(async()=>{resolve(profile('coach-b'));});
  await waitFor(()=>expect(screen.getByText('Configurer puis Générer')).toBeInTheDocument());
  expect(state.read).toHaveBeenLastCalledWith('coach-b');
 });
});
