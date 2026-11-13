import { describe, expect, it } from 'vitest';
import { buildCompassBenchmarks } from '../benchmarks';
import { computeCoachingCompass, type CoachingCompassInput } from '..';
import type { RadarAxis } from '../types';

const input: CoachingCompassInput = {
  ftp:188, poids:52, vo2max:50, tss7d:null, snapshotDate:'2026-11-12', snapshotUpdatedAt:null,
  pmax5s:null, p30sW:null, p60sW:null, map5minW:null, runEconomyScore:null,
  hrDriftPct:null, vma:14.2, paceThresholdSecPerKm:315, fatmax:null,
  vlamaxEffectif:{value:.2,confidence:.7,source:'estimation'}, tteEffectif:{tte_min:35,confidence:.5,source:'estimated'},
  fatigueEffectif:null, limiterResult:null, potentielPhysiologique:null, strategyResult:null, lactateThresholds:null,
  wprimeKj:null, objectif:'IM', ambition:'competitor', sportFocus:'triathlon', athleteAge:51, athleteSex:'F',
};
const axes: RadarAxis[] = [{ key:'vo2max',label:'VO₂max',shortLabel:'VO₂max',score:91,icon:'',color:'',value:50,target:49.3,unit:'ml/kg/min' }];

describe('External references, not prescription thresholds', () => {
  it('uses distinct FRIEND female 50–59 medians for treadmill and cycle', () => {
    const rows = buildCompassBenchmarks(input, axes, 'triathlon').filter(r => r.kind === 'population');
    expect(rows).toHaveLength(2);
    expect(rows[0].reference).toBe('Médiane 23.4 · intervalle central 19.9–27.6 ml/kg/min');
    expect(rows[1].reference).toBe('Médiane 17.3 · intervalle central 15.3–20.1 ml/kg/min');
    expect(rows.every(r => r.target === 49.3 && r.value === 50)).toBe(true);
  });
  it('does not invent sex or extrapolate outside published age bands', () => {
    for (const context of [{athleteSex:null}, {athleteAge:19}, {athleteAge:80}, {athleteAge:null}]) {
      expect(buildCompassBenchmarks({...input,...context},axes,'run').find(r=>r.kind==='population')?.reference).toBe('Comparaison indisponible');
    }
  });
  it('uses male 40–49 treadmill norms and exact trained running cohort values', () => {
    const rows = buildCompassBenchmarks({...input,athleteSex:'M',athleteAge:42},axes,'run');
    expect(rows[0].reference).toBe('59.3 ± 5.9 ml/kg/min (moyenne ± écart-type)');
    expect(rows[1].reference).toBe('Médiane 37.8 · intervalle central 31.9–45 ml/kg/min');
  });
  it('does not treat athlete ambition as an invented bike elite cohort', () => {
    const rows = buildCompassBenchmarks({...input,ambition:'elite'},axes,'bike');
    expect(rows[0].reference).toBe('59.4 ± 10 ml/kg/min (moyenne ± écart-type)');
  });
  it.each(['5K','10K','Semi','Marathon','Trail','703','IM'])('keeps all diagnostic contracts unchanged by sex norms for %s', objectif => {
    const before = structuredClone(input);
    const a = computeCoachingCompass({...input,objectif,athleteSex:'M'});
    const b = computeCoachingCompass({...input,objectif,athleteSex:'F'});
    expect({...a,presentation:null,meta:null}).toEqual({...b,presentation:null,meta:null});
    expect(input).toEqual(before);
  });
});