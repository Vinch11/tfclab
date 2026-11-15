import {assert,assertEquals} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {applySLFloorEnforcement} from './jsonPlanHandler.ts';
import fixture from '../_shared/fixtures/currentRepairCatalog.json' with {type:'json'};
import type {RepairWorkoutMetadata} from '../_shared/repairSportingEquivalence.ts';
import type {PlanChunk} from './planSchema.ts';

Deno.test('a 400-minute brick never certifies a required standalone 120-minute ride',()=>{
 const chunk={weeks:[{weekNumber:9,phase:'base',sessions:[
  {day:'mardi',sport:'bike',title:'Endurance',details:'Endurance Z2',durationMin:60,zones:['Z2'],custom:true,catalogId:null},
  {day:'samedi',sport:'brick',title:'Brick',details:'Vélo puis course',durationMin:400,zones:['Z2'],custom:true,catalogId:null},
 ]}]} as PlanChunk;
 const result=applySLFloorEnforcement([chunk],{9:{weekType:'load',floors:{longRideWeekly:true,slLongRideMin:120,dedicatedLongRide:true}}},[fixture.tables.standard],[fixture.entries as unknown as RepairWorkoutMetadata[]],'703');
 assert(!result.traces.some(t=>t.includes('none_brick_satisfies_SL')));
 assertEquals(chunk.weeks[0].sessions.find(s=>s.sport==='brick')?.durationMin,400);
 assert(result.repairs.some(r=>r.code==='sl_upgraded'||r.code==='sl_upgrade_unresolved'));
});