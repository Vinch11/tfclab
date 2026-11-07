import {describe,it,expect} from 'vitest';
import {timedSwimSources,completeStrengthSources} from '../../../../scripts/library-v3/completeSessionSources';
import {evaluateV3Workout,type V3Block,type V3Workout} from '../../../../scripts/library-v3/catalogueRuntime';
import {fingerprintV3SportingSource} from '../../../../scripts/library-v3/sportingQualification800';
import {resolveV3IntensityTargets} from '../../../../scripts/library-v3/resolveV3Intensity';
import {componentMinutes} from '../appPlanningV3Audit';
import type {ProposedV3Workout} from '../appPlanningV3Proposal';
import {renderV3Prescription} from '../v3PrescriptionText';
import {checkV3SessionCatalogue} from '../v3SessionCatalogue';
/** JSONB preserves array order, but object property order is not a contract. */
function jsonb<T>(value:T):T{
 const order=(x:unknown):unknown=>Array.isArray(x)?x.map(order):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,order(v)])):x;
 return JSON.parse(JSON.stringify(order(value))) as T;
}
function proposal(w:V3Workout):ProposedV3Workout{
 return {sourceId:w.id,sourceFingerprint:fingerprintV3SportingSource(w),title:w.title,sport:w.sport,sourceDomain:w.primaryDomain,blocks:structuredClone(w.blocks),durationMinutes:evaluateV3Workout(w).minutes,distanceM:0,targets:resolveV3IntensityTargets(w,{}),limiterMatches:[],zoneMinutes:null,review:{minimumLevel:w.minimumLevel,minimumRecoveryHours:w.minimumRecoveryHours,prerequisites:[...w.prerequisites],contraindications:[...w.contraindications],stopRule:w.stopRule}};
}
const swim=()=>jsonb(proposal(timedSwimSources.find(w=>w.id==='V3P_SWIM_211')!));
const opening=(c:ProposedV3Workout)=>{const b=c.blocks[0];if(b.kind==='repeat')throw Error('Expected opening leaf');return b;};
describe('saved V3 catalogue integrity across JSONB object-key reordering',()=>{
 it.each([...timedSwimSources,...completeStrengthSources])('$id retains its exact source-bound duration after database roundtrip',w=>{
  const input=proposal(w),saved=jsonb(input);
  expect(componentMinutes(saved)).toBe(input.durationMinutes);
  expect(componentMinutes(saved)).not.toBe('invalid');
  expect(w.automaticSelection).toBe(false);
 });
 it('reopens the reported 34 min 30 s swim with no false source/dose warning or mutation',()=>{
  const c=swim(),before=JSON.stringify(c);expect(opening(c).rpeRange).toEqual({max:2,min:1});
  expect(componentMinutes(c)).toBe(34.5);
  expect(checkV3SessionCatalogue({catalogId:c.sourceId,title:c.title,sport:c.sport,durationMin:34.5,details:renderV3Prescription([c],true),detSourceComponents:[c]})).toEqual({errors:[],unknown:[]});
  expect(JSON.stringify(c)).toBe(before);
 });
 it.each(['min','max','extra','absent','null'] as const)('still refuses changed RPE (%s)',change=>{
  const c=swim(),b=opening(c);
  if(change==='absent')delete b.rpeRange;
  else if(change==='null')Object.assign(b,{rpeRange:null});
  else if(change==='extra')Object.assign(b.rpeRange!,{unexpected:1});
  else b.rpeRange![change]+=1;
  expect(componentMinutes(c)).toBe('invalid');
 });
 it.each(['dose','label','count','rest','fingerprint','review'] as const)('retains the %s source guard after roundtrip',change=>{
  const c=swim();const repeat=c.blocks.find(b=>b.kind==='repeat')!;
  if(repeat.kind!=='repeat')throw Error('fixture');
  if(change==='dose')opening(c).seconds!.base+=1;
  if(change==='label')c.blocks[0].label='Changed';
  if(change==='count')repeat.count.base+=1;
  if(change==='rest')repeat.betweenSec+=1;
  if(change==='fingerprint')c.sourceFingerprint='00000000';
  if(change==='review')c.review.minimumRecoveryHours=0;
  expect(componentMinutes(c)).toBe('invalid');
 });
 it('preserves source block and prerequisite array order',()=>{
  const c=swim();c.blocks.reverse();expect(componentMinutes(c)).toBe('invalid');
  const strength=jsonb(proposal(completeStrengthSources[0]));
  const repeat=strength.blocks.find(b=>b.kind==='repeat');if(repeat?.kind!=='repeat')throw Error('fixture');
  repeat.steps.reverse();expect(componentMinutes(strength)).toBe('invalid');
 });
 it('keeps absent-RPE source leaves distinct from a supplied empty object',()=>{
  const c=jsonb(proposal(completeStrengthSources[0]));
  const firstWithoutRpe=(bs:V3Block[]):V3Block|undefined=>bs.flatMap(b=>b.kind==='repeat'?b.steps:[b]).find(b=>b.kind!=='repeat'&&b.rpeRange===undefined);
  const b=firstWithoutRpe(c.blocks);expect(b).toBeDefined();Object.assign(b!,{rpeRange:{}});
  expect(componentMinutes(c)).toBe('invalid');
 });
});
