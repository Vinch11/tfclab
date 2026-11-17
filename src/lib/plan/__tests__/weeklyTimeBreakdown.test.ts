import {it,expect} from 'vitest';
import {weeklyTimeBreakdown} from '../weeklyTimeBreakdown';
it('weekly working time remains 17.5 hours with two 45-minute renforts',()=>{
 const sessions=[{sport:'bike',durationMin:1050},{sport:'strength',durationMin:45},{sport:'strength',durationMin:45}];
 expect(weeklyTimeBreakdown(sessions as never)).toEqual({endurance:1050,competition:0,competitionSessions:0,strengthSessions:2,missing:0});
});
it('unknown strength duration does not make weekly working time incomplete',()=>{
 expect(weeklyTimeBreakdown([{sport:'strength',title:'Renforcement',details:''}] as never)).toEqual({endurance:0,competition:0,competitionSessions:0,strengthSessions:1,missing:0});
});
it('unknown endurance duration still makes weekly working time incomplete',()=>{
 expect(weeklyTimeBreakdown([{sport:'bike',title:'Endurance',details:''}] as never)).toEqual({endurance:0,competition:0,competitionSessions:0,strengthSessions:0,missing:1});
});
it('separates the Ironman from weekly training without mistaking a simulation for a race',()=>{
 const result=weeklyTimeBreakdown([{sport:'bike',title:'Simulation Ironman',durationMin:320},{sport:'brick',title:'🏁 COURSE OBJECTIF : Ironman',durationMin:720},{sport:'strength',durationMin:60}] as never);
 expect(result.endurance).toBe(320);
 expect(result.competition).toBe(720);
 expect(result.strengthSessions).toBe(1);
});