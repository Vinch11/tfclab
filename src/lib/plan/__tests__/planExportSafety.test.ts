import {it,expect} from 'vitest';
import {planExportSafetyProblems} from '../../../../supabase/functions/_shared/planExportSafety';
it('remote export rejects additional training on the marathon date',()=>{
 const plan={_planStartDate:'2026-11-16',_objective:'marathon',_raceDate:'2027-02-21',weeks:[{weekNumber:14,sessions:[{sport:'run',dayName:'dimanche',title:'🏁 COURSE Marathon',durationMin:210},{sport:'bike',dayName:'dimanche',title:'Vélo',durationMin:250}]}]};
 expect(planExportSafetyProblems(plan)).toContain('race_calendar_extra_training:S14');
});
it('remote export refuses unverifiable full-plan dates',()=>{
 expect(planExportSafetyProblems({weeks:[{weekNumber:1,sessions:[]}]})).toEqual(['plan_calendar_unverifiable']);
});