import {it,expect} from 'vitest';
import {getTrailSessionAlternatives} from '../trailSessionAlternatives';
it('never proposes running hills for strength even with stairs and descents in instructions',()=>{
 expect(getTrailSessionAlternatives({sport:'strength',title:'Dos bas blindé',details:'Descente lente, montée explosive, 3×30s'})).toEqual([]);
});
it('never replaces a regeneration run with a hill threshold session',()=>{
 expect(getTrailSessionAlternatives({sport:'run',title:'Footing de régénération',details:'25min sur sentier plat'})).toEqual([]);
});
it('retains trail-specific alternatives for a prescribed climbing session',()=>{
 expect(getTrailSessionAlternatives({sport:'trail',title:'Seuil côte',details:'3×6min montée'}).length).toBeGreaterThan(0);
});