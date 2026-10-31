import {describe,it,expect} from 'vitest';
import type {ParsedSession} from '@/lib/aiPlanParser';
import {candidateViolatesNativeTaperPhase} from './v315-taper-phase-prefilter';
const s=(title:string,details='25min Z1-Z2',add:Partial<ParsedSession>={}):ParsedSession=>({
  weekNumber:11,weekTheme:'taper',phase:'taper',dayName:'jeudi',
  dayIndex:3,sport:'run',title,details,
  catalogId:'V3P_RUN_001',durationMin:30,zones:['Z2'],isRest:false,
  ...add,
});
describe('V315 — pre-DFS taper exclusions mirror the existing native rule',()=>{
  it('refuses genuinely forbidden BUILD and threshold/VO2 source structures',()=>{
    expect(candidateViolatesNativeTaperPhase(s('BUILD — long VO2 max repeats'))).toBe(true);
    expect(candidateViolatesNativeTaperPhase(s('Taper easy','Séance seuil 4x6min'))).toBe(true);
    expect(candidateViolatesNativeTaperPhase(s('Affûtage technique','Force max'))) .toBe(true);
  });
  it('preserves eligible short easy and non-demanding race openers',()=>{
    expect(candidateViolatesNativeTaperPhase(s('Activation légère','20min Z1-Z2'))).toBe(false);
    expect(candidateViolatesNativeTaperPhase(s('Run easy 85% VMA',
      'Référence de vitesse 85% VMA, pas de fractionné'))).toBe(true); // explicit fractionné, forbidden
    expect(candidateViolatesNativeTaperPhase(s('Run easy 85% VMA',
      'Référence uniquement: 85% VMA'))).toBe(false); // same normalization as native
  });
  it('keeps only the independently declared race event outside training filter',()=>{
    const official=s('COURSE : 70.3',
      'Épreuve déclarée ; durée à confirmer par le coach.',
      {catalogId:undefined,custom:true,durationMin:0,sport:'brick'});
    expect(candidateViolatesNativeTaperPhase(official)).toBe(false);
    expect(candidateViolatesNativeTaperPhase(s('Simulation COURSE : 70.3',
      'Seuil race simulation',{sport:'brick'}))).toBe(true);
  });
});