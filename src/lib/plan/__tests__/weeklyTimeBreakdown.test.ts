import {it,expect} from 'vitest';
import {weeklyTimeBreakdown} from '../weeklyTimeBreakdown';
it('17.5 hours plus two 45-minute renforts remains 19 hours of total scheduled activity',()=>{
 const sessions=[{sport:'bike',durationMin:1050},{sport:'strength',durationMin:45},{sport:'strength',durationMin:45}];
 expect(weeklyTimeBreakdown(sessions as never)).toEqual({endurance:1050,strength:90,total:1140,missing:0});
});
it('a missing strength duration cannot be presented as a complete total',()=>{
 expect(weeklyTimeBreakdown([{sport:'strength',title:'Renforcement',details:''}] as never)).toEqual({endurance:0,strength:0,total:0,missing:1});
});