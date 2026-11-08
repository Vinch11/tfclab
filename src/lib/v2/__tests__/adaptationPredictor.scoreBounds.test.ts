import {describe,expect,it} from 'vitest';
import {computeAdaptationPrediction} from '../adaptationPredictor';
describe('predictor respects the documented score scale',()=>{
 it.each([0,1,2])('keeps durability and economy within 100 for drift %s',drift=>{
  const result=computeAdaptationPrediction({snapshot:{vo2max:58,ftp:300,weight_kg:72,run_hr_drift_pct:drift,run_economy_score:99},limiterId:'specific_endurance',limiterLabel:'Durabilité',objectif:'marathon',sportMain:'run',weeksAvailable:16});
  for(const scenario of result.scenarios)for(const metric of scenario.metrics.filter(m=>m.available&&['durability','economy'].includes(m.id))){
   expect(metric.projected).toBeLessThanOrEqual(100);expect(metric.projected).toBeGreaterThanOrEqual(0);
   if(metric.current!==null&&metric.current>0)expect(metric.deltaMidPct).toBeCloseTo((metric.projected!/metric.current-1)*100,0);
   if(metric.projected===100&&metric.current===100){expect(metric.deltaMidPct).toBe(0);expect(metric.direction).toBe('stable');}
  }
 });
});
