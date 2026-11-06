import { describe, expect, it } from 'vitest';
import { buildAthleteRecordView } from '../appRecordView';
import { buildAthleteDetInputs, type CoachAnswers, type PlanFormView } from '../athleteDetBridge';
import { appRecordReferenceProblems } from '../appRecordReference';
import { anchorsFromSnapshot, snapshotProblems, type CoachDetInputSnapshot } from '../coachDetContext';
import type { FrozenAppPlanningInput } from '../appPlanningInput';
import { findSource } from '../coachDetContext';
import { resolveV3IntensityTargets } from '../../../../scripts/library-v3/resolveV3Intensity';

const FP='a'.repeat(64);
const athlete={id:'SYNTH_A',coach_id:'SYNTH_COACH',birth_date:'1990-01-01',sex:'F',active_snapshot_id:'SYNTH_SNAPSHOT',refs:{}};
const row={id:'SYNTH_SNAPSHOT',athlete_id:athlete.id,coach_id:athlete.coach_id,date:'2026-11-04',source:'manual',ftp:300,vma:18,css:95,pace_threshold_sec_per_km:240,vo2max:58,weight_kg:72,fc_max:188};
const record=()=>buildAthleteRecordView(athlete,[row],athlete.coach_id,null);
const form:PlanFormView={objective:'70.3',planStartDate:'2026-11-09',raceDate:'2027-01-31',weeksAvailable:12,weeklyHours:10,sessionsPerWeek:8,strengthSessionsPerWeek:1,maxSessionsPerDay:2,ambition:'age_group'};
const answers=():CoachAnswers=>({provenance:{},entered:{},swimPaces:{},athleteLevel:'trained',recentLoad:'',fatigue:'',injuryScreen:'',general:{},prerequisitesAllMet:false,unmetPrerequisites:[],contraindicationsAllAbsent:false,presentContraindications:[],strengthLoadAndRpeConfirmed:false,clock:{timeZone:'Europe/Brussels',bySport:{}},bricksConfirmed:false,coachLimiterOrder:null});
const app=():FrozenAppPlanningInput=>({source:'app_planning_pipeline',athleteId:athlete.id,fingerprint:FP,athlete:{ftp:300,vma:18,css:95,paceThresholdSecPerKm:240},config:{objective:'70.3',identifiedLimitersRaw:[]},limiters:{appAutomatic:[],coachOverride:null,applied:[],origin:'app_automatic'}});
function snapshot():CoachDetInputSnapshot {
 const result=buildAthleteDetInputs(record(),form,answers(),null,FP);
 // Incomplete human reviews correctly prevent a snapshot. Inspect the same
 // entry constructor separately, without inventing approval flags.
 expect(result.snapshot).toBeNull();
 return {schema:'tfcl.det.coach-inputs.v1',athleteId:athlete.id,coachId:athlete.coach_id,...form,planningInputFingerprint:FP,athleteLevel:'trained',age:36,sex:'F',anchors:{},coachValidatedStrengthLoadAndRpe:false};
}
import { appRecordReference } from '../appRecordReference';
import { prefillFromRecord } from '../athleteDetBridge';
function references(){const s=snapshot();for(const p of prefillFromRecord(record()))if(['runThresholdPaceSecPerKm','runVvo2SpeedMps','bikeFtpWatts','cssSecPer100m'].includes(p.key))s.anchors[p.key as keyof typeof s.anchors]=appRecordReference(record(),p,FP)!;return s;}

describe('record → shared planning reference, without measurement upgrade',()=>{
 it('retains source/date and reuses all four recorded numbers without asking their nature again',()=>{
  expect(record().snapshot?.source).toBe('manual');
  const b=buildAthleteDetInputs(record(),form,answers(),null,FP);
  expect(b.missing.some(m=>m.key.startsWith('prov:'))).toBe(false);
  expect(b.missing.some(m=>m.key.startsWith('unc:'))).toBe(false);
  expect(b.missing.filter(m=>m.key.startsWith('swim:'))).toHaveLength(4);
  expect(b.missing.some(m=>m.key==='injuryScreen')).toBe(true);
  expect(b.missing.some(m=>m.key.startsWith('clock:'))).toBe(true);
  const s=references();expect(s.anchors.bikeFtpWatts).toMatchObject({value:300,kind:'app_reference',measuredOn:null,recordReference:{origin:'snapshot',source:'manual',recordId:'SYNTH_SNAPSHOT',recordedOn:'2026-11-04',declaredNature:'undocumented',planningInputFingerprint:FP}});
  expect(s.anchors.bikeFtpWatts?.uncertainty).toContain('non documentées');
  expect(appRecordReferenceProblems(s,app())).toEqual([]);
 });
 it('keeps the manual path asking for missing provenance and never invents a missing value',()=>{
  const b=buildAthleteDetInputs(record(),form,answers());expect(b.missing.some(m=>m.key==='prov:bikeFtpWatts')).toBe(true);
  const without=buildAthleteRecordView(athlete,[{...row,ftp:null}],athlete.coach_id,null);
  expect(buildAthleteDetInputs(without,form,answers(),null,FP).missing.some(m=>m.key==='val:bikeFtpWatts')).toBe(true);
 });
 it('refuses references without the shared app, another athlete/fingerprint, changed values or a forged field',()=>{
  const s=references();expect(appRecordReferenceProblems(s,null).length).toBeGreaterThan(0);
  expect(appRecordReferenceProblems(s,{...app(),athleteId:'OTHER'}).length).toBeGreaterThan(0);
  expect(appRecordReferenceProblems(s,{...app(),fingerprint:'b'.repeat(64)}).length).toBeGreaterThan(0);
  expect(appRecordReferenceProblems(s,{...app(),athlete:{...app().athlete,ftp:310}}).length).toBeGreaterThan(0);
  s.anchors.bikeFtpWatts!.recordReference!.field='cssSecPer100m';expect(appRecordReferenceProblems(s,app()).length).toBeGreaterThan(0);
 });
 it('rejects malformed provenance in the snapshot contract itself',()=>{
  const s=references();s.anchors.bikeFtpWatts!.recordReference!.coachId='OTHER';
  expect(snapshotProblems(s).some(p=>p.includes('référence de l’app'))).toBe(true);
 });
 it('retains the exact same bike target bounds and marks their input as a reference, not a measurement',()=>{
  const s=references();const w=findSource('V3P_BIKE_013')!;
  const old=resolveV3IntensityTargets(w,{bikeFtpWatts:300});const next=resolveV3IntensityTargets(w,anchorsFromSnapshot(s));
  expect(next.status).toBe(old.status);expect(next.targets.map(t=>[t.domain,t.min,t.max,t.metric])).toEqual(old.targets.map(t=>[t.domain,t.min,t.max,t.metric]));
  expect(next.targets.some(t=>t.source==='athlete_reference_with_doctrine_model')).toBe(true);
  expect(next.targets.every(t=>t.confidence==='model')).toBe(true);
 });
});
