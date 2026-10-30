import { afterEach, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { compileBrickBase703, brickBaseSourceUnchanged, type BrickBase703Context, type BrickBase703Parameters } from './brickBase703';
const evidence = { source: 'SYNTHETIC COACH INPUT — template acceptance only, absent from unchanged D1 profiles', asOf:'2026-10-26' };
const params = (): BrickBase703Parameters => ({
  bike:{warmupSeconds:600,mainSeconds:2400,cooldownSeconds:600},
  run:{warmupSeconds:300,mainSeconds:600,cooldownSeconds:300},
  transition:{seconds:120,source:evidence.source,instructions:'Descendre du vélo à l’arrêt ; poser le vélo ; changer de chaussures et retirer le casque ; démarrer la course sans accélérer. Fenêtre déclarée de 120 s, aucun sprint de transition.'},
  anchors:{ftpWatts:265,runThresholdSecPerKm:240,evidence},
  capacity:{bikeSeconds:3600,runSeconds:1200,brickElapsedSeconds:4920,evidence},
  prescription:evidence,
});
const context = (): BrickBase703Context => ({objective:'703',phase:'base',trainingLevel:'trained',ambition:'age_group',
  evaluationDate:'2026-10-26',sessionDate:'2026-10-26',minimumBikeSeconds:0,minimumElapsedSeconds:3600,availableSeconds:5400,
  limiters:['TTE'],readiness:'favourable',disciplineAvailable:{bike:true,run:true},
  monitoringInstructions:'Revue coach datée : récupération favorable, pas de douleur. Arrêter en cas de douleur ou d’intolérance et demander réévaluation, sans compensation.'});
afterEach(()=>vi.restoreAllMocks());
it('compiles explicit bounded inputs into seven complete segments, exactly 82 minutes, without LLM',()=>{
  const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
  expect(brickBaseSourceUnchanged()).toBe(true);
  const input=params(), before=structuredClone(input), c=context(), result=compileBrickBase703(input,c);
  expect(result.status).toBe('compiled_for_review');
  if(!result.session)throw Error('missing structured session');
  expect(result.session.elapsedSeconds).toBe(4920);
  expect(result.session.exerciseSeconds).toBe(4800);
  expect(result.session.segments.reduce((n,s)=>n+s.seconds,0)).toBe(4920);
  expect(result.session.segments).toHaveLength(7);
  expect(result.session.individualPrescriptionApproved).toBe(false);
  expect(result.session.segments.filter(s=>s.discipline==='bike').every(s=>s.intensity?.domain==='moderate_lt1')).toBe(true);
  expect(result.session.segments.filter(s=>s.discipline==='run').every(s=>s.intensity?.domain==='recovery')).toBe(true);
  for(let i=0;i<20;i++)expect(compileBrickBase703(input,c)).toEqual(result);
  expect(input).toEqual(before);expect(network).not.toHaveBeenCalled();
  writeFileSync('docs/d1.1/evidence/template-example.json',JSON.stringify({scope:'ADDITIONAL SYNTHETIC TEMPLATE TEST; NOT A D1 PROFILE OR GENERATED CALENDAR',parameters:input,context:c,result},null,2));
});
it.each([
  ['100-minute slot',()=>params(),()=>({...context(),minimumElapsedSeconds:6000}), 'slot_floor_exceeds_source_envelope'],
  ['90-minute aggregate cannot replace 70 minutes bike',()=>params(),()=>({...context(),minimumElapsedSeconds:5400,minimumBikeSeconds:4200}), 'bike_floor_exceeds_source_bounds'],
  ['bike extension',()=>({...params(),bike:{warmupSeconds:600,mainSeconds:3600,cooldownSeconds:600}}),context,'bike_outside_source_bounds'],
  ['missing transition',()=>({...params(),transition:{seconds:NaN,instructions:'',source:''}}),context,'transition_not_fully_declared'],
  ['unknown warmup',()=>({...params(),bike:{...params().bike,warmupSeconds:NaN}}),context,'invalid_or_missing_segment_duration'],
  ['unknown reference',()=>({...params(),anchors:{...params().anchors,ftpWatts:NaN}}),context,'individual_anchors_missing'],
  ['unknown recovery',params,()=>({...context(),readiness:'unknown' as const}),'current_recovery_not_favourable'],
  ['adverse recovery',params,()=>({...context(),readiness:'adverse' as const}),'current_recovery_not_favourable'],
  ['capacity exceeded',()=>({...params(),capacity:{...params().capacity,bikeSeconds:2700}}),context,'current_capacity_exceeded'],
  ['availability exceeded',params,()=>({...context(),availableSeconds:4800}),'availability_exceeded'],
  ['unavailable discipline',params,()=>({...context(),disciplineAvailable:{bike:true,run:false}}),'discipline_unavailable'],
  ['future evidence',params,()=>({...context(),evaluationDate:'2026-10-25'}),'current_capacity_evidence_missing'],
  ['stale review',()=>({...params(),prescription:{...evidence,asOf:'2026-10-25'}}),context,'session_date_review_missing'],
  ['unreviewed progression',()=>({...params(),previous:{bikeSeconds:2700,runSeconds:900,evidence}}),context,'progression_not_explicitly_reviewed'],
  ['race-specific relabel',params,()=>({...context(),phase:'peak'}),'unsupported_sporting_scope'],
] as const)('refuses %s, no invented seconds or dose',(_label,p,c,reason)=>{
  const result=compileBrickBase703(p(),c());expect(result.status).toBe('refused');expect(result.session).toBeNull();expect(result.reasons).toContain(reason);
});
it('keeps unknown parameters unknown and a same-source progression requires explicit review',()=>{
  expect(compileBrickBase703(null,context()).reasons).toContain('explicit_parameters_missing');
  const p={...params(),previous:{bikeSeconds:2700,runSeconds:900,evidence},progressionApproval:evidence};
  expect(compileBrickBase703(p,context()).status).toBe('compiled_for_review');
});
