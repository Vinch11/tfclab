// @vitest-environment jsdom
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {HumanCoachReview} from '../HumanCoachReview';
import {canonical,sha256Hex} from '../../../../supabase/functions/_shared/nolioV2/dryRun';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),auth:vi.fn(async()=>({data:{user:{id:'SYNTH_A'}},error:null})),cb:null as null|(()=>void)}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:mocks.auth,onAuthStateChange:(cb:()=>void)=>{mocks.cb=cb;return {data:{subscription:{unsubscribe:vi.fn()}}};}},functions:{invoke:mocks.invoke}}}));
const plan={title:'SYNTH PLAN',weeks:[{weekNumber:1,sessions:[{title:'SYNTH run',durationMin:10,sport:'run',details:'no target'}]}]};
const binding=async()=>({coachId:'SYNTH_A',athleteId:'SYNTH_ATH',planVersionId:'SYNTH_PV',planSha256:await sha256Hex(canonical(plan)),refsSha256:'b'.repeat(64),opsSha256:'c'.repeat(64)});
beforeEach(()=>{cleanup();vi.clearAllMocks();});
describe('coach review component',()=>{
 it('no automatic call; load verifies current coach and exact inspected plan',async()=>{mocks.invoke.mockResolvedValue({data:{status:'EMPTY',binding:await binding()},error:null});render(<HumanCoachReview planVersionId="SYNTH_PV" plan={plan}/>);expect(mocks.invoke).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Relire la revue et les empreintes'));await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledTimes(1));await screen.findByText('Aucune revue concordante : décisions à confirmer.');expect(mocks.invoke.mock.calls[0][1].body.action).toBe('load');});
 it('cross coach and stale content never enable saving',async()=>{mocks.invoke.mockResolvedValue({data:{status:'CONFIRMED',binding:{...await binding(),coachId:'SYNTH_B'}},error:null});render(<HumanCoachReview planVersionId="SYNTH_PV" plan={plan}/>);fireEvent.click(screen.getByText('Relire la revue et les empreintes'));await screen.findByText('Relecture divergente');expect(screen.getByText('Enregistrer ma revue, sans consentement d’envoi').hasAttribute('disabled')).toBe(true);});
 it('identity change ignores late result',async()=>{let resolve:(v:unknown)=>void=()=>{};mocks.invoke.mockReturnValue(new Promise(r=>{resolve=r;}));render(<HumanCoachReview planVersionId="SYNTH_PV" plan={plan}/>);fireEvent.click(screen.getByText('Relire la revue et les empreintes'));await waitFor(()=>expect(mocks.invoke).toHaveBeenCalled());mocks.cb?.();resolve({data:{status:'EMPTY',binding:await binding()},error:null});await screen.findByText('Identité changée : revue à relire');expect(screen.getByText('Enregistrer ma revue, sans consentement d’envoi').hasAttribute('disabled')).toBe(true);});
});
