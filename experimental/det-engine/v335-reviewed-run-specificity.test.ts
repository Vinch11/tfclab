import {describe,expect,it} from 'vitest';
import type {ParsedSession} from '@/lib/aiPlanParser';
import type {StructuredZoneDose} from './v310-structured-zone-dose';
import {verifyReviewedRunningRaceSpecific} from './v335-reviewed-run-specificity';

const s=(id:string,patch:Partial<ParsedSession>={}):ParsedSession=>({
  weekNumber:7,weekTheme:'peak',phase:'peak',dayIndex:3,
  dayName:'Jeudi',sport:'run',title:'Titre quelconque non probant',
  details:'Exécution approuvée',catalogId:id,isRest:false,
  custom:false,isKeySession:true,durationMin:25,zones:['Z2'],...patch,
});
const d=(id:string,patch:Partial<StructuredZoneDose>={}):StructuredZoneDose=>({
  sourceIds:[id],durationMin:25,low:18,mid:0,high:5,unknown:2,
  provenance:'v3_individually_configured_blocks_only',...patch,
});
const reviewed=(id:string,objective:'semi'|'marathon'='semi')=>({
  sourceId:id,objective,
});

describe('DET V335 — evidence of actual semi/marathon specific running dose',()=>{
  it('admits a reviewed semi source despite a non-keyword title',()=>{
    const id='V3P_RUN_160';
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      ()=>reviewed(id),()=>d(id))).toMatchObject({
        verified:true,sourceId:id,durationMin:25,highMin:5,
        scientificAttestation:false,
      });
  });
  it('admits a reviewed marathon source only for marathon',()=>{
    const id='V3P_RUN_155';
    expect(verifyReviewedRunningRaceSpecific(s(id),'marathon',
      ()=>reviewed(id,'marathon'),()=>d(id)).verified).toBe(true);
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      ()=>reviewed(id,'marathon'),()=>d(id)).verified).toBe(false);
  });
  it('rejects an impressive name when source is generic or unapproved',()=>{
    const id='V3P_RUN_130';
    const named=s(id,{title:'SIMULATION ALLURE MARATHON 90 min'});
    expect(verifyReviewedRunningRaceSpecific(named,'marathon',
      ()=>null,()=>d(id)).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(named,'marathon',
      ()=>reviewed(id,'semi'),()=>d(id)).verified).toBe(false);
  });
  it('rejects cross-sport, unrelated event, source substitution and unknown dose',()=>{
    const id='V3P_RUN_160';
    const approve=()=>reviewed(id);
    expect(verifyReviewedRunningRaceSpecific(s(id,{sport:'bike'}),'semi',
      approve,()=>d(id)).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(s(id,{catalogId:null}),'semi',
      approve,()=>d(id)).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(s(id,{durationMin:0}),'semi',
      approve,()=>d(id)).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      approve,()=>d(id,{sourceIds:['V3P_RUN_155']})).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      approve,()=>d(id,{unknown:10})).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      approve,()=>null).verified).toBe(false);
  });
  it('cannot turn easy or invalid intensity into specific work',()=>{
    const id='V3P_RUN_160';
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      ()=>reviewed(id),()=>d(id,{low:23,high:0})).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      ()=>reviewed(id),()=>d(id,{high:NaN})).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      ()=>reviewed(id),()=>d(id,{provenance:'unverified' as StructuredZoneDose['provenance']})).verified).toBe(false);
  });
  it('fails closed when either evidence provider fails or is absent',()=>{
    const id='V3P_RUN_160';
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',undefined,()=>d(id)).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      ()=>{throw Error('review offline');},()=>d(id)).verified).toBe(false);
    expect(verifyReviewedRunningRaceSpecific(s(id),'semi',
      ()=>reviewed(id),()=>{throw Error('dose offline');}).verified).toBe(false);
  });
});
