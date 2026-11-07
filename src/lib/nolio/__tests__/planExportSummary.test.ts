import {describe,it,expect} from 'vitest';
import {planExportSummary} from '../planExportSummary';
const plan={_planStartDate:'2026-11-09',weeks:[{weekNumber:1,sessions:[{weekNumber:1,dayIndex:0,isRest:true},{weekNumber:1,dayIndex:1,title:'Vélo',sport:'bike'}]},{weekNumber:4,sessions:[{weekNumber:4,dayIndex:6,title:'Course',sport:'run'}]}]};
describe('coach export calendar summary',()=>{
 it('shows the full range including weeks after week three and excludes rest',()=>{expect(planExportSummary(plan,{kind:'all'})).toMatchObject({count:2,weeks:2,firstDate:'2026-11-10',lastDate:'2026-12-06',problems:[]});});
 it('uses the selected transport calendar and exact original scope keys',()=>{expect(planExportSummary(plan,{kind:'sessions',keys:['S1-J1-1']},'2026-11-16')).toMatchObject({count:1,weeks:1,firstDate:'2026-11-17',lastDate:'2026-11-17',problems:[]});});
});
