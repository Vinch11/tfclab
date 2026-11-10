import { describe, expect, it } from 'vitest';
import { evaluateThresholdProtocol, type ThresholdReview } from './nolioThresholdProtocol';
import { mergeEmptyFields, observedFields } from './nolioV2Records';
const fixture = (sport: 'cycling' | 'running' = 'cycling'): ThresholdReview => ({
  sport, session: { id:'trn_tte', name:'TTE', date:'2026-10-08', sport }, reference:{ id:'trn_seuil', name:'Seuil', date:'2026-10-06', sport },
  target: sport === 'cycling' ? 200 : 300, start:60, end:1860,
  streams:{ time:Array.from({length:2001},(_,i)=>i), watts:Array(2001).fill(200), speed:Array(2001).fill(1000/300) },
  athleteConfirmed:true, referenceConfirmed:true, continuousConfirmed:true, exhaustionConfirmed:true,
});
describe('Nolio threshold-to-exhaustion protocol',()=>{
  it('fills only bike duration from selected timestamps, excluding warmup',()=>expect(evaluateThresholdProtocol(fixture()).fields).toEqual({tte_observed_min:'30'}));
  it('fills only running duration',()=>expect(evaluateThresholdProtocol(fixture('running')).fields).toEqual({tte_observed_min_run:'30'}));
  it('never obtains TTE from a best record',()=>expect(observedFields([{value:200,unit:'W',date:'2026-10-08',cat:'ppr',record_type:'time',inner_val:1800,sportBase:'cycling'}])).toEqual({}));
  it('requires every coach confirmation',()=>{for(const key of ['athleteConfirmed','referenceConfirmed','continuousConfirmed','exhaustionConfirmed'] as const)expect(evaluateThresholdProtocol({...fixture(),[key]:false}).fields).toEqual({});});
  it('requires a separate prior threshold test',()=>expect(evaluateThresholdProtocol({...fixture(),reference:fixture().session}).fields).toEqual({}));
  it('rejects mixing reference sport variants',()=>expect(evaluateThresholdProtocol({...fixture(),reference:{...fixture().reference,sport:'running'}}).fields).toEqual({}));
  it('does not turn a capped running test into measured TTE',()=>{const f=fixture('running');f.streams={time:Array.from({length:2701},(_,i)=>i),watts:[],speed:Array(2701).fill(1000/300)};const r=evaluateThresholdProtocol({...f,start:0,end:2700});expect(r.errors).toContain('Plafond de 45 minutes du protocole course atteint : durée minimale seulement, pas une TTE mesurée.');expect(r.fields).toEqual({});});
  it('rejects missing samples',()=>{const f=fixture();f.streams.watts[90]=null;expect(evaluateThresholdProtocol(f).fields).toEqual({});});
  it('rejects prolonged power below 97% of the validated threshold',()=>{const f=fixture();f.streams.watts.fill(193,100,140);expect(evaluateThresholdProtocol(f).fields).toEqual({});});
  it('rejects prolonged running pace deviation over 5 s/km',()=>{const f=fixture('running');f.streams.speed.fill(1000/306,100,140);expect(evaluateThresholdProtocol(f).fields).toEqual({});});
  it('preserves existing manual duration',()=>expect(mergeEmptyFields({tte_observed_min:'50'},evaluateThresholdProtocol(fixture()).fields)).toEqual({tte_observed_min:'50'}));
});