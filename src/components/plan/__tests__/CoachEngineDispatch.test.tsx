// @vitest-environment jsdom
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {CoachDetInputsPanel} from '@/pages/__qa/CoachDetInputsPanel';
const mocks=vi.hoisted(()=>({run:vi.fn((_input:unknown)=>({kind:'refused',refusals:['unsupported inputs']})),from:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:mocks.from}}));
vi.mock('@/lib/det/coachDetRun',async importOriginal=>({...await importOriginal<typeof import('@/lib/det/coachDetRun')>(),runCoachDetPlan:mocks.run}));
const shared={objective:'Marathon',planStartDate:'2026-11-09',raceDate:'2027-02-28',weeksAvailable:16,weeklyHours:7,sessionsPerWeek:4,strengthSessionsPerWeek:0,maxSessionsPerDay:1,ambition:'age_group'};
const guard=async()=>({userId:'SYNTH_A',athleteId:'SYNTH_ATH'});
beforeEach(()=>{cleanup();vi.clearAllMocks();});
describe('actual coach engine panel dispatch',()=>{
 it('IA button uses shared input callback, never invokes DET',async()=>{const ai=vi.fn(async(_inputs:{config:{objective:string}})=>{});render(<CoachDetInputsPanel shared={shared} guard={guard} engine="ai" onAI={ai} sourcesVersion={'a'.repeat(64)} engineVersion={'a'.repeat(64)} releaseId={null} onOutcome={vi.fn()}/>);fireEvent.click(screen.getByText('Générer avec l’IA (entrées partagées)'));await waitFor(()=>expect(ai).toHaveBeenCalledTimes(1));expect(ai.mock.calls[0]?.[0]?.config.objective).toBe('Marathon');expect(mocks.run).not.toHaveBeenCalled();expect(mocks.from).not.toHaveBeenCalled();});
 it('DET refusal never calls IA or produces a fixture; same inputs survive switching',async()=>{const ai=vi.fn(async(_inputs:{config:{objective:string}})=>{}),outcome=vi.fn();const chain={select:()=>chain,eq:()=>chain,order:()=>chain,limit:()=>chain,maybeSingle:async()=>({data:null,error:null})};mocks.from.mockReturnValue(chain);const props={shared,guard,onAI:ai,sourcesVersion:'a'.repeat(64),engineVersion:'a'.repeat(64),releaseId:null,onOutcome:outcome};const view=render(<CoachDetInputsPanel {...props} engine="ai"/>);view.rerender(<CoachDetInputsPanel {...props} engine="det"/>);fireEvent.click(screen.getByText('Générer avec DET Engine (entrées coach)'));await waitFor(()=>expect(mocks.run).toHaveBeenCalledTimes(1));expect(ai).not.toHaveBeenCalled();expect((mocks.run.mock.calls[0]?.[0] as {snapshot:{objective:string}})?.snapshot.objective).toBe('Marathon');expect(outcome).toHaveBeenLastCalledWith({kind:'refused',refusals:['unsupported inputs']});});
});
