import {beforeAll, expect, it, vi} from 'vitest';
import {inputFor} from '../../../../scripts/quality/det/form-fixture';
import {generateDetPlanFromPageInput} from '@/lib/plan/detEngineRun';
import {parseV3PlanProposal} from '../v3ProposalLocalSave';
import {previewDetGuidance} from '../nolioPreview';
import type {V3PlanProposal} from '../appPlanningV3Proposal';

vi.mock('@/integrations/supabase/client', () => ({supabase:{}}));
beforeAll(() => {
  vi.spyOn(console,'log').mockImplementation(()=>{});
  vi.spyOn(console,'warn').mockImplementation(()=>{});
});

const scenario = {objective:'Marathon',weeks:16,hours:8};
const weekly = {recentWeeklyHours:'4',recentWeeksCount:'4'};

it.each(['finisher','age_group','competitor','elite','world_class'])('asks exclusively for the missing return history (%s)', async ambition => {
  const input = inputFor(scenario,'untrained',ambition);
  await expect(generateDetPlanFromPageInput(input)).rejects.toMatchObject({
    decision:{kind:'missing_data',fields:['loadHistory.recentWeeklyHours','marathonRecentLongRunMinutes']},
  });
});

it('uses both observations and retains the measured cap, based on the actual weekly prescriptions',async()=>{
  const input = inputFor(scenario,'untrained','finisher',[],weekly);
  await expect(generateDetPlanFromPageInput(input)).rejects.toMatchObject({
    decision:{kind:'missing_data',fields:['marathonRecentLongRunMinutes']},
  });
  const onlyLong = inputFor(scenario,'untrained','finisher');
  await expect(generateDetPlanFromPageInput({...onlyLong, marathonRecentLongRunMinutes:65})).rejects.toMatchObject({
    decision:{kind:'missing_data',fields:['loadHistory.recentWeeklyHours']},
  });
  const plan = await generateDetPlanFromPageInput({...input,marathonRecentLongRunMinutes:65});
  const proposal = parseV3PlanProposal((plan as typeof plan & {_detSourceProposal:V3PlanProposal})._detSourceProposal);
  expect(proposal.weeks).toHaveLength(16);
  expect(proposal.marathonRecentLongRunMinutes).toBe(65);
  expect(proposal.weeks[0].knownMinutes).toBeLessThanOrEqual(240);
  const loads = proposal.weeks.filter(w=>w.weekType==='load').map(w=>
    w.days.flatMap(d=>d.sessions).find(s=>s.sport==='run' && s.role==='long')!.knownMinutes);
  expect(loads[0]).toBeLessThanOrEqual(65);
  for(let i=1;i<loads.length;i++)expect(loads[i]).toBeLessThanOrEqual(loads[i-1]*(1+input.config.volumeRamp!.weeklyIncreasePctMax)+1e-7);
  expect(plan.weeks[0].coachNotes).toMatch(/dont \d+ min courues et \d+ min marchées/);
  const simulation=await previewDetGuidance(plan);
  expect(simulation.precheck.complete).toBe(true);
},120000);

it('separates an unreachable DET calendar from a search exhausted with adequate theoretical headroom',async()=>{
  const input = inputFor(scenario,'untrained','finisher',[],weekly);
  await expect(generateDetPlanFromPageInput({...input,marathonRecentLongRunMinutes:35})).rejects.toMatchObject({
    decision:{kind:'engine_limit'},message:expect.stringMatching(/35 min.+calendrier marathon retenu par DET/),
  });
  await expect(generateDetPlanFromPageInput({...input,marathonRecentLongRunMinutes:60})).rejects.toMatchObject({
    decision:{kind:'engine_limit'},message:expect.stringMatching(/S9.+sortie longue de référence.+fiches de reprise/),
  });
},120000);

it('does not claim a time-targeted marathon when the available return sessions prescribe no work at that pace',async()=>{
  const input=inputFor(scenario,'untrained','finisher',[],weekly);
  const declaration={...input,marathonRecentLongRunMinutes:75};
  function withTarget(minutes:number) {
    return {...declaration,config:{...input.config,raceGoals:input.config.raceGoals?.map(event=>({...event,targetTimeMinutes:minutes}))}};
  }
  await expect(generateDetPlanFromPageInput(withTarget(187))).rejects.toMatchObject({
    decision:{kind:'engine_limit'},message:expect.stringMatching(/chrono marathon demandé.+aucune fiche V3/),
  });
  const finish=await generateDetPlanFromPageInput(withTarget(330));
  expect(finish.weeks).toHaveLength(16);
  expect(finish.weeks[0].coachNotes).toContain('cible de fin de course');
},120000);
