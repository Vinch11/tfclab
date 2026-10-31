import {describe,it,expect} from 'vitest';
import {v3FullCatalogue} from '../../scripts/library-v3/catalogueRuntime';
import {buildDetV3ContractFromCatalogue, type V3ReviewedSettings} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {checkSessionCatalogue,catalogueEligibility} from '../../supabase/functions/_shared/sessionCatalogueContract';
import {normalizeRepairSport} from '../../supabase/functions/_shared/repairSportingEquivalence';
import {isRaceDaySession} from '../../supabase/functions/_shared/raceDayIdentity';
import type {DaySlot} from '@/engines/plan/weeklySlotLayout';
const goal=(domain:string|null)=>{
 if(domain==='703_pace')return '703';
 if(domain==='semi_pace')return 'semi';
 if(domain==='marathon_pace')return 'marathon';
 return 'IM';
};
const reviews=():V3ReviewedSettings[]=>
 v3FullCatalogue.workouts.map(w=>({
  id:w.id,objective:goal(w.primaryDomain),
  athleteLevel:'highly_trained' as const,athleteLevelSource:'manual' as const,
  individualCoachApproval:true as const,allPrerequisitesChecked:true as const,
  athleteAnchors:syntheticV3ReviewAnchors(),
  ...syntheticV3SportingContext(w.id),
 }));
describe('DET V37 — per-source real slot eligibility for all 800 V3 recipes',()=>{
 it('passes sporting-equivalence AND the actual session-catalogue validator for a valid slot, while rejecting sport substitutions',()=>{
  const {report,contract}=buildDetV3ContractFromCatalogue(reviews());
  expect(report.accepted).toHaveLength(800);
  const byId=new Map(v3FullCatalogue.workouts.map(w=>[w.id,w]));
  const reasons:Record<string,number>={}, failures:Array<{id:string;errors:string[];unknown:string[]}>=[];
  let passed=0, rejectedWrongSport=0, phaseRejected=0;
  for(const card of report.accepted){
   const source=byId.get(card.id)!;
   const ctx={objective:card.goals[0],phase:source.phase[0],weekType:'load'};
   const countOnly=card.tags.includes('v3-strength-frequency-only-unknown-duration');
   const strength=normalizeRepairSport(card.sport)==='strength';
   const slot={sport:card.sport,isKeySession:false,isLongSession:false} as DaySlot;
   const selectorCtx={week:1,phase:ctx.phase,weekType:ctx.weekType,slot,dayIndex:2};
   const eligible=catalogueEligibility(card,{...ctx,operation:'insertion'});
   const reviewed=contract.filterCandidate?.(card,selectorCtx)??true;
   const session={
    catalogId:card.id,sport:card.sport,title:card.title,details:card.structure,
    custom:false,...(countOnly?{}:{durationMin:card.durationMin[0]}),
    zones:strength?[]:(card.mainZoneMax?[ 'Z'+card.mainZoneMax ]:card.zones),
   };
   const checked=checkSessionCatalogue(session,{...ctx,catalog:[card]});
   const unknown=checked.unknown.filter(code=>!(
      strength&&['intensity_not_declared',...(countOnly?['duration_not_preserved']:[])].includes(code)));
   const errors=[...eligible,...checked.errors];
   if(!reviewed)errors.push('reviewed_source_rejected_in_own_phase');
   if(errors.length||unknown.length){
     failures.push({id:card.id,errors,unknown});
     for(const code of [...errors,...unknown])reasons[code]=(reasons[code]??0)+1;
   } else passed++;
   const changedSport=card.sport==='bike'?'run':'bike';
   if(checkSessionCatalogue({...session,sport:changedSport},{...ctx,catalog:[card]}).errors.includes('catalogue_sport'))
    rejectedWrongSport++;
   const foreignPhase=['base','build','peak','taper','race','recovery'].find(p=>!source.phase.includes(p));
   if(foreignPhase&&contract.filterCandidate?.(card,{...selectorCtx,phase:foreignPhase})===false)
    phaseRejected++;
  }
  console.info('DET_V37_800_SLOT_ELIGIBILITY',JSON.stringify({
   admitted:report.accepted.length,checked:passed,wrongSportRejected:rejectedWrongSport,
   foreignPhaseRejected:phaseRejected,failureCounts:reasons,examples:failures.slice(0,20),
  }));
  expect(failures).toEqual([]);
  expect(passed).toBe(800);
  expect(rejectedWrongSport).toBe(800);
  expect(phaseRejected).toBeGreaterThan(500);
 });
 it('keeps marathon negative-split TRAINING separate from the actual day-J event',()=>{
  const original=v3FullCatalogue.workouts.find(w=>w.id==='V3P_RUN_083')!;
  expect(original.title).toBe('Marathon : négative split de compétition');
  const review=reviews().find(r=>r.id===original.id)!;
  const result=buildDetV3ContractFromCatalogue([review]);
  expect(result.report.accepted).toHaveLength(1);
  const selected=result.report.accepted[0];
  expect(selected.tags).toContain('v3-verified-training-not-race-event');
  expect(selected.structure).toContain('TITRE SOURCE CONSERVÉ: '+original.title);
  expect(isRaceDaySession({title:selected.title,details:selected.structure})).toBe(false);
  // Do not relax the application's strong day-J identity.
  expect(isRaceDaySession({title:'🏁 COURSE : Marathon objectif'})).toBe(true);
  expect(v3FullCatalogue.workouts.find(w=>w.id===original.id)?.title).toBe(original.title);
 });
 it('refuses sources with no individual proof and cannot silently substitute a different phase',()=>{
  const noReview=buildDetV3ContractFromCatalogue([]);
  expect(noReview.report.accepted).toHaveLength(0);
  expect(noReview.report.rejected).toHaveLength(800);
  const one=buildDetV3ContractFromCatalogue(reviews().filter(r=>r.id==='V3P_BIKE_009'));
  expect(one.report.accepted).toHaveLength(1);
  const card=one.report.accepted[0];
  expect(one.contract.filterCandidate?.(card,{
   week:1,phase:'base',weekType:'load',
   slot:{sport:'bike'} as DaySlot,dayIndex:0,
  })).toBe(false);
  expect(catalogueEligibility(card,{
   objective:'IM',phase:'build',weekType:'recovery',operation:'insertion',
  })).toContain('recovery_intent:mixed_intensity');
 });
});
