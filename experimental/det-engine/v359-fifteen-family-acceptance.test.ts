import {afterEach,describe,expect,it,vi} from 'vitest';
import {familyCases,runFamily} from './v359-family-fixture';
import {constrainedRunningCases} from './v359-constrained-running-fixture';
import {multiGoalCase} from './v359-multi-goal-fixture';
import {runScenario} from './v332-running-long-horizon-fixture';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V359 — remaining families require complete sporting acceptance',()=>{
  it.each(familyCases)('$id: refuses any false family GO',s=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V359_NETWORK_FORBIDDEN');});
    const {out}=runFamily(s);
    expect(out.technicallyConstructed).toBe(true);
    expect(out.constraintsSatisfied).toBe(true);
    expect(out.candidate?.weeks).toHaveLength(s.weeks);
    expect(out.issues.filter(i=>['critical','blocking','error'].includes(i.severity))).toEqual([]);
    expect(out.issues.filter(i=>['quota_floor_violation','quota_range_drift'].includes(i.code))).toEqual([]);
    expect(out.humanReviewRequired).toBe(true);
    expect(out.sportingRelevance).toBe('not_attested');
  },60000);
  it('multi-objective: the B 10K and A half both bind to the exact declared date',()=>{
    const out=runScenario(multiGoalCase);
    expect(out.constraintsSatisfied).toBe(true);
    expect(out.candidate?.weeks).toHaveLength(16);
    const events=out.candidate!.weeks.flatMap(w=>w.sessions.filter(s=>s.title.startsWith('COURSE : '))
      .map(s=>({week:w.weekNumber,day:s.dayIndex,title:s.title,minutes:s.durationMin})));
    expect(events).toEqual([{week:8,day:5,title:'COURSE : 10K',minutes:40},
      {week:16,day:6,title:'COURSE : Semi',minutes:95}]);
    expect(out.candidate!.weeklyQuotas![9].weekType).toBe('recovery');
    expect(out.candidate!.weeks.flatMap(w=>w.sessions).some(s=>s.catalogId==='V3P_RUN_202')).toBe(true);
    console.info('DET_V359_CONSTRAINED_ACCEPTED',JSON.stringify({family:13,id:multiGoalCase.id,
      constraintsSatisfied:out.constraintsSatisfied,weeks:16,events,
      syntheticOnly:true,prescriptionAllowed:false}));
  },60000);
  it('missing exact V3 proof cannot validate a dedicated sport',()=>{
    const {out}=runFamily({...familyCases.find(s=>s.family===11)!,id:'cycling-ftp-missing-exact-proof'},true);
    expect(out.constraintsSatisfied).toBe(false);
  },60000);
  it('the multi-goal schedule still refuses the original source cohort without the short recovery dose',()=>{
    const out=runScenario({...multiGoalCase,id:multiGoalCase.id+'-without-short-dose',omitSupplementalRecovery:true});
    expect(out.constraintsSatisfied).toBe(false);
  },60000);
  it.each(constrainedRunningCases)('$id: individual constraints survive actual complete selection',s=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V359_NETWORK_FORBIDDEN');});
    const out=runScenario(s);
    expect(out.constraintsSatisfied).toBe(true);
    expect(out.candidate?.weeks).toHaveLength(s.weeks);
    const weeks=out.candidate!.weeks;
    if(s.family===14){
      const banned=new Set(['lundi','jeudi','samedi']);
      expect(weeks.flatMap(w=>w.sessions).filter(s=>!s.isRest).every(s=>!banned.has(s.dayName))).toBe(true);
      for(const week of weeks){
        const minutes=week.sessions.filter(s=>!s.isRest&&!s.title.startsWith('COURSE : '))
          .reduce((n,s)=>n+(s.durationMin??0),0);
        expect(minutes).toBeLessThanOrEqual(390);
      }
    }else{
      for(const n of [3,6,9]){
        expect(out.candidate?.weeklyQuotas?.[n]?.weekType).toBe('recovery');
        const now=weeks[n-1].sessions.filter(s=>!s.isRest).reduce((v,s)=>v+(s.durationMin??0),0);
        const previous=weeks[n-2].sessions.filter(s=>!s.isRest).reduce((v,s)=>v+(s.durationMin??0),0);
        expect(now).toBeLessThanOrEqual(previous*.7+1e-7);
      }
    }
    console.info('DET_V359_CONSTRAINED_ACCEPTED',JSON.stringify({family:s.family,id:s.id,
      constraintsSatisfied:out.constraintsSatisfied,weeks:weeks.length,
      syntheticOnly:true,prescriptionAllowed:false}));
  },60000);
});
