import {it,expect} from 'vitest';
import {weeklyTimeBreakdown} from '../weeklyTimeBreakdown';
it('weekly working time remains 17.5 hours with two 45-minute renforts',()=>{
 const sessions=[{sport:'bike',durationMin:1050},{sport:'strength',durationMin:45},{sport:'strength',durationMin:45}];
 expect(weeklyTimeBreakdown(sessions as never)).toEqual({endurance:1050,strengthSessions:2,missing:0});
});
it('unknown strength duration does not make weekly working time incomplete',()=>{
 expect(weeklyTimeBreakdown([{sport:'strength',title:'Renforcement',details:''}] as never)).toEqual({endurance:0,strengthSessions:1,missing:0});
});
it('unknown endurance duration still makes weekly working time incomplete',()=>{
 expect(weeklyTimeBreakdown([{sport:'bike',title:'Endurance',details:''}] as never)).toEqual({endurance:0,strengthSessions:0,missing:1});
});