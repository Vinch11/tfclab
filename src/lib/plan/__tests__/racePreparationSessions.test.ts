import {describe,it,expect} from 'vitest';
import {EnrichedWorkoutsRacePreparation} from '../../enrichedWorkoutsRacePreparation';
import {WorkoutLibrary} from '../../workoutLibrary';
import {nolioStructureForSession} from '../nolioSessionStructure';
import {getDoctrineDomain} from '../../zones/tfclDoctrine';

describe('séances structurées de préparation et affûtage',()=>{
  it('3×8 marathon : 60 minutes, 24 spécifiques dans le domaine canonique',()=>{
    const w=EnrichedWorkoutsRacePreparation.find(w=>w.id==='B_RUN_MARATHON_CONTROLLED_3X8');
    expect(w?.durationMin).toEqual([60,60]);
    expect(15+3*8+2*3+5+10).toBe(w?.durationMin[0]);
    expect(w?.structure[1].zones).toEqual([getDoctrineDomain('marathon_pace').zone]);
    expect(w?.goals).toEqual(['marathon','ironman']);
  });
  it('rappel 2×8 : 45 min, pas une séance VO₂max',()=>{
    const w=EnrichedWorkoutsRacePreparation.find(w=>w.id==='B_RUN_MARATHON_TAPER_2X8');
    expect(12+2*8+3+4+10).toBe(w?.durationMin[0]);
    expect(w?.physiology?.primary).toBe('race_specific');
    expect(w?.structure.flatMap(p=>p.zones).some(z=>/Z[56]/.test(z))).toBe(false);
  });
  it('vélo secondaire 60min présent dans le catalogue réel et structurable pour Nolio',()=>{
    const w=WorkoutLibrary.find(w=>w.id==='A_IM_TAPER_BIKE_EASY_60');
    expect(w?.durationMin).toEqual([60,60]);
    expect(w?.phase).toContain('taper');
    expect(nolioStructureForSession({sport:'bike',durationMin:60},w?.structure)).toHaveLength(3);
  });
});