import {describe,it,expect} from 'vitest';
import {previewAppBrickSplit,expandReviewedMultisport,type AppBrickSplitChoice} from '../../../../supabase/functions/_shared/nolioV2/multisportSplit';
import type {DetWorkout,PlanSessionInput} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
const component=(sport:'bike'|'run',minutes:number):DetWorkout=>({schema:'det-structured-workout-v1',sourceId:'SYNTH_'+sport,sport,chosenDurationMin:minutes,exactSeconds:minutes*60,nodes:[{kind:'step',role:'main',label:sport,domain:null,target:null,dose:{seconds:minutes*60}}]});
const fixture=():PlanSessionInput=>({sessionKey:'S1-J5-0',date:'2026-11-07',title:'Enchaînement fictif',sport:'brick',catalogId:null,detStructureRefusal:{reason:'multisport_composition_and_transition_unreviewed'},detStructuredComponents:{schema:'det-brick-components-preview-v1',bike:component('bike',60),run:component('run',20)}});
const start={provenance:'coach_confirmed' as const,localDate:'2026-11-07',timeZone:'Europe/Brussels',minuteOfDay:23*60+30,utcOffsetMinutes:60};
async function choice(s:PlanSessionInput):Promise<AppBrickSplitChoice>{const p=await previewAppBrickSplit(s,{transitionSeconds:300,bikeStart:start});if('reason' in p)throw Error(p.reason);return {schema:'nolio-app-brick-split-v1',parentSha256:p.preview.parentSha256,coachConfirmed:true,transitionSeconds:300,bikeStart:start};}
describe('app-profile export-only brick representation',()=>{
 it('conserves exact component doses and a neutral transition across midnight without altering the parent',async()=>{
  const s=fixture(),before=structuredClone(s),c=await choice(s),r=await expandReviewedMultisport([s],{[s.sessionKey]:c});expect(r.problems).toEqual([]);expect(s).toEqual(before);expect(r.sessions).toHaveLength(2);
  expect(r.sessions.map(x=>x.durationMin)).toEqual([60,20]);expect(r.sessions[1].coachStart).toMatchObject({localDate:'2026-11-08',minuteOfDay:35,utcOffsetMinutes:60});
  expect(r.sessions.map(x=>x.detStructuredWorkout)).toEqual([s.detStructuredComponents!.bike,s.detStructuredComponents!.run]);expect(r.sessions.every(x=>!x.detStructureRefusal)).toBe(true);
 });
 it('rejects changed parent, confirmation, transition, component structure and invalid or ambiguous clocks',async()=>{
  const s=fixture(),c=await choice(s);
  for(const bad of [{...c,parentSha256:'0'.repeat(64)},{...c,coachConfirmed:false},{...c,transitionSeconds:0},{...c,bikeStart:{...start,minuteOfDay:1500}},{...c,bikeStart:{...start,utcOffsetMinutes:0}}]){
   const r=await expandReviewedMultisport([s],{[s.sessionKey]:bad});expect(r.problems.length).toBeGreaterThan(0);expect(r.sessions).toEqual([]);
  }
  const changed=structuredClone(s);changed.detStructuredComponents!.bike.nodes=[];expect((await expandReviewedMultisport([changed],{[s.sessionKey]:c})).problems.length).toBeGreaterThan(0);
  const fold={...s,date:'2026-10-25'};const r=await previewAppBrickSplit(fold,{transitionSeconds:300,bikeStart:{...start,localDate:fold.date,minuteOfDay:150,utcOffsetMinutes:120}});expect(r).toEqual({reason:'split_provider_time_ambiguous'});
 });
});
