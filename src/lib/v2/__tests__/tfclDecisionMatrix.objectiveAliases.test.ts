import { describe, it, expect } from 'vitest';
import { computeTFCLDecisionMatrix, type TFCLDecisionInput } from '../tfclDecisionMatrix';
const source = (value: number | null) => ({value, source:'snapshot' as const, sourceLabel:'Fixture synthétique'});
export function matrixInput(objective: string): TFCLDecisionInput {
 return {objective:objective as TFCLDecisionInput['objective'], ambition:'age_group', age:35, discipline:'cap',
 vo2max:source(50),vlamax:source(.5),tte:source(40),fatMaxPctVO2:source(55),fatOxidationMax:source(null),crossoverPctVO2:source(null),freshnessScore:source(80),tss7d:source(null),tss28d:source(null),subjectiveFatigue:source(null),confidenceScore:60};
}
describe('decision matrix receives actual form objective names',()=>{
 it.each(['10K','10 KM','10k'])('%s uses the existing 10km targets and ranking, not a triathlon fallback',alias=>{
  const input=matrixInput(alias),before=structuredClone(input);
  expect(computeTFCLDecisionMatrix(input)).toEqual(computeTFCLDecisionMatrix(matrixInput('10km')));
  expect(input).toEqual(before);
 });
 it.each([['70.3','703'],['IRONMAN 70.3','703'],['Triathlon Sprint','Sprint'],['Triathlon Olympique','Olympic'],['SEMI-MARATHON','Semi'],['Marathon','Marathon']] as const)('%s preserves its existing matrix', (alias,canonical)=>{
  expect(computeTFCLDecisionMatrix(matrixInput(alias))).toEqual(computeTFCLDecisionMatrix(matrixInput(canonical)));
 });
 it.each(['5K','TrailMountain','TrailLong','StartToRun','objectif inexistant'])('%s has no invented matrix targets',objective=>{
  expect(()=>computeTFCLDecisionMatrix(matrixInput(objective))).toThrow('TFCL_MATRIX_OBJECTIVE_UNSUPPORTED');
 });
});
