import {describe,it,expect} from 'vitest';
import {readableV3Prescription} from '../readableV3Prescription';
describe('stored V3 prescription presentation',()=>{
  it('shows exact human durations, preserves numeric targets and does not mutate the archive',()=>{
    const session={catalogId:'V3P_RUN_084',details:'0: 600s Échauffement | 1: 6600s Endurance | 2: 2220.5s Récupération | DURÉE CALCULÉE : 9420.5 secondes exactes (sans arrondi) | CIBLES INDIVIDUALISÉES: moderate_lt1 292.7 320 sec_per_km source=athlete_measurement_with_doctrine_model confiance=model'};
    const before=structuredClone(session),text=readableV3Prescription(session);
    expect(text).toContain('10 min Échauffement\n1: 1 h 50 min Endurance');
    expect(text).toContain('37 min 0,5 s Récupération');
    expect(text).toContain('2 h 37 min 0,5 s exactes');
    expect(text).toContain('moderate_lt1 292.7 320 sec_per_km source=athlete_measurement_with_doctrine_model confiance=model');
    expect(session).toEqual(before);
  });
  it('leaves historical and free-text AI prescriptions untouched',()=>{
    for(const s of [{details:'600s | repos 30s'},{catalogId:'A_RUN',details:'600s | DURÉE CALCULÉE : 630 secondes'},{catalogId:'V3P_RUN_084',details:'600s | repos 30s'}])expect(readableV3Prescription(s)).toBe(s.details);
  });
});
