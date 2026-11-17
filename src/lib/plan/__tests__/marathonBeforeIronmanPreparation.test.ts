import {it,expect} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {prepareGenerationContracts} from '../prepareGenerationContracts';
import {catalogueEligibility} from '../../../../supabase/functions/_shared/sessionCatalogueContract';

it('prépare Séville B avant IM sans changer les priorités ou ajouter un second pic',()=>{
  const raceGoals=[{objective:'Marathon',raceDate:'2027-02-21',priority:'B' as const},{objective:'IRONMAN',raceDate:'2027-06-27',priority:'A' as const}];
  const x=preparePrevalidationFixture('B-10K',{objective:'IRONMAN',planStartDate:'2026-11-16',weeksAvailable:32,trainingLevel:'trained',weeklyHours:15,raceGoals});
  const c=prepareGenerationContracts(x.athleteData,{...x.planConfig,objective:'IRONMAN',raceDate:'2027-06-27',fondationDurationWeeks:4,deloadCadenceWeeks:4});
  expect(c.weeklyQuotas[1].raceProtection).toContain('PRÉPARATION MARATHON B');
  expect(c.weeklyQuotas[18].raceProtection).not.toContain('PRÉPARATION MARATHON B');
  expect(c.weeklyQuotas[15].weekType).toBe('recovery');
  const card=c.chunkRepairCatalogs[0].find(m=>m.id==='B_RUN_MARATHON_CONTROLLED_3X8');
  expect(card).toBeDefined();
  if(!card)throw new Error('Fiche marathon non injectée');
  expect(catalogueEligibility(card,{phase:'base',objective:'IRONMAN',weekType:'load'})).toEqual([]);
  expect(x.planConfig.raceGoals).toEqual(raceGoals);
  const taperRide=c.chunkRepairCatalogs[5].find(m=>m.id==='A_IM_TAPER_BIKE_ENDURANCE_120');
  expect(taperRide?.durationMin).toEqual([120,150]);
  if(!taperRide)throw new Error('Repère long absent après rotation');
  expect(catalogueEligibility(taperRide,{phase:'taper',objective:'IRONMAN',weekType:'taper'})).toEqual([]);
});