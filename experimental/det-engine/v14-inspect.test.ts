import {it,vi} from 'vitest';
import {writeFileSync} from 'node:fs';
import {WorkoutLibrary} from '@/lib/workoutLibrary';
import {buildRepairWorkoutMetadata} from '@/lib/plan/repairCatalogMetadata';
import {v10Profiles} from './v10-profiles';
import {reconcileExperimentalBudget} from './v13-budget';
import {poolForWeek} from './v13-feasibility';
it.skipIf(!process.env.TFCL_DET_V14_INSPECT)('archives relevant original source recipes without network access',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{const ps=v10Profiles().slice(0,2).map(p=>reconcileExperimentalBudget(p).candidate);const ids=new Set(ps.flatMap(p=>Array.from({length:16},(_,i)=>poolForWeek(p,i+1)).flat().map(c=>c.id)));writeFileSync('docs/det-engine/v14/evidence/inspection.json',JSON.stringify({profiles:ps.map(p=>({id:p.id,config:p.config,physiology:p.athlete,quotas:p.prep.weeklyQuotas})),cards:WorkoutLibrary.filter(w=>ids.has(w.id)||['swim','strength','brick'].includes(w.sport)).map(w=>({raw:w,meta:buildRepairWorkoutMetadata(w),offered:ids.has(w.id)}))}));}finally{vi.restoreAllMocks();vi.useRealTimers();}
},30000);
