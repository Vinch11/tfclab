import {describe,expect,it} from 'vitest';
import {alternateKeyDay,shorterSourceSettings} from '../adaptiveSearch';
import {developmentIntervalSources} from '../../../../scripts/library-v3/developmentIntervalSources';
import {auditV3Catalogue,v3FullCatalogue} from '../../../../scripts/library-v3/catalogueRuntime';
import {previewV3SourceDose} from '../../../../experimental/det-engine/v31-v3-catalogue';
import type {AppPlanningDetDraft} from '../appPlanningDetDraft';

describe('DET adaptation limits',()=>{
 it('checks every offered variant against the actual V3 blocks and preserves recovery and intensity',()=>{
   let variants=0;const sports=new Set<string>();
   for(const source of v3FullCatalogue.workouts){
     const base=JSON.stringify(source.blocks);
     for(const option of shorterSourceSettings(source)){
       const configured=previewV3SourceDose(source,option);
       expect(Object.keys(option.overrides)).toHaveLength(1);
       const [path,value]=Object.entries(option.overrides)[0];
       const p=source.prescription.parameters.find(p=>p.path===path)!;
       expect(value).toBeGreaterThanOrEqual(p.min);expect(value).toBeLessThan(p.base);
       const i=Number(path.split('.')[0]),b=structuredClone(configured.blocks);
       const entry=b[i],original=source.blocks[i];
       if(entry.kind==='repeat'&&original.kind==='repeat')entry.count.base=original.count.base;
       else if(entry.kind==='time'&&original.kind==='time'&&entry.seconds&&original.seconds)entry.seconds.base=original.seconds.base;
       else throw Error('Unexpected altered block');
       expect(b).toEqual(source.blocks);
       sports.add(source.sport);variants++;
     }
     expect(JSON.stringify(source.blocks)).toBe(base);
   }
   expect(variants).toBeGreaterThan(0);expect([...sports].sort()).toEqual(['bike','run','swim']);
 });
 it('checks the development cards and each repeat count against the actual block duration',()=>{
   const workouts=developmentIntervalSources;
   expect(new Set(workouts.map(s=>s.id)).size).toEqual(workouts.length);
   expect(auditV3Catalogue({...v3FullCatalogue,workouts,count:workouts.length,
     counts:{run:workouts.filter(s=>s.sport==='run').length,bike:workouts.filter(s=>s.sport==='bike').length,swim:0,strength:0}})).toEqual([]);
   for(const source of workouts){
     const repeat=source.blocks[1];
     if(repeat.kind!=='repeat')throw Error('Interval card needs a repeat');
     for(let count=repeat.count.min;count<=repeat.count.max;count++){
       const configured=previewV3SourceDose(source,{overrides:{'1.count':count},allowWorksetChange:true});
       expect(configured.blocks[1]).toEqual({...repeat,count:{...repeat.count,base:count}});
       expect(configured.blocks[0]).toEqual(source.blocks[0]);
       expect(configured.blocks[2]).toEqual(source.blocks[2]);
     }
   }
 });
 it('preserves occupied days and does not relocate races, long sessions or coach constraints',()=>{
   const slot=(role:'long'|'key'|'support'|'race',min:number|null=null)=>({sport:'run',role,minimumMinutes:min,candidates:[]});
   const slots=[slot('race'),slot('support',50),slot('key'),slot('long'),slot('support')];
   const week={weekType:'load',days:slots.map((s,i)=>({day:String(i),rest:false,slots:[s]}))} as AppPlanningDetDraft['weeks'][number];
   expect(alternateKeyDay(week,true)).toBeNull();
   expect(alternateKeyDay({...week,weekType:'recovery'},false)).toBeNull();
   expect(alternateKeyDay(week,false)?.days.map(d=>d.slots[0].role)).toEqual(['race','support','support','long','key']);
   expect(week.days[2].slots[0].role).toBe('key');
 });
});
