import {describe,expect,it} from 'vitest';
import type {ParsedSession} from '@/lib/aiPlanParser';
import {violatesNativeNormalPeak,hasSourceVisibleRaceSpecificity}
  from './v316-native-peak-candidate';
const session=(title:string,details:string):ParsedSession=>({
  weekNumber:13,weekTheme:'peak',phase:'peak',dayIndex:2,
  dayName:'mercredi',sport:'bike',title,details,isRest:false,
  durationMin:70,zones:['Z2'],custom:false,
});
describe('DET V316 — native normal peak candidate audit',()=>{
  it('refuses generic adaptation content in race-specific peak',()=>{
    expect(violatesNativeNormalPeak(
      session('Respiration bilatérale','adaptation eau libre / vagues'))).toBe(true);
    expect(violatesNativeNormalPeak(
      session('Force maximale','force max 3x5'))).toBe(true);
  });
  it('does not refuse actual race-specific workouts',()=>{
    const race=session('Race pace IM','Vélo Z2 puis 3x10 min allure course');
    expect(violatesNativeNormalPeak(race)).toBe(false);
    expect(hasSourceVisibleRaceSpecificity(race)).toBe(true);
  });
  it('does not manufacture race-specific proof from only generic Z2',()=>{
    expect(hasSourceVisibleRaceSpecificity(
      session('Endurance Z2','3x20 min Z2 facile'))).toBe(false);
  });
  it('ignores mere percentage-of-FTP reference, which is not a session label',()=>{
    expect(violatesNativeNormalPeak(
      session('Endurance facile','3x8 min à 65% de la FTP'))).toBe(false);
  });
});
