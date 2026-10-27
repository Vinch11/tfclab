import { describe,it,expect } from 'vitest';
import { getCatalogSportFilter,getCatalogExclusions } from '../useAITrainingPlan';
describe('all supported triathlon objective spellings retain their disciplines',()=>{
 it.each(['IM','703','Sprint','Olympic','Triathlon Sprint','Triathlon Olympique'])('%s',objective=>{
  const sports=getCatalogSportFilter(objective)!;
  expect(sports).toContain('natation');expect(sports).toContain('cyclisme');expect(sports).toContain('brick');
  expect(getCatalogExclusions(objective).excludeTags).toContain('trail');
 });
 it.each(['5K','10K','Semi','Marathon','TrailShort','TrailMountain','TrailUltra'])('%s does not silently gain compulsory cross-training',objective=>{
  const sports=getCatalogSportFilter(objective)!;
  expect(sports).not.toContain('natation');expect(sports).not.toContain('cyclisme');
 });
});
