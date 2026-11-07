import {describe,it,expect,vi} from 'vitest';
import {legacyPlanExportSessions,exportLegacyPlan} from '../legacyPlanExport';
import type {ParsedPlan} from '@/lib/aiPlanParser';
vi.mock('@/lib/aiPlanWorkoutEnricher',()=>({findLibraryWorkoutForSession:()=>null}));
vi.mock('@/lib/trailSessionAlternatives',()=>({getTrailSessionAlternatives:()=>[]}));
const plan=(n=2):ParsedPlan=>({title:'AI',totalWeeks:1,phases:[],weeks:[{weekNumber:1,theme:'base',phase:'base',sessions:Array.from({length:n},(_,i)=>({weekNumber:1,weekTheme:'base',phase:'base',dayName:'Mardi',dayIndex:1,sport:'run',title:`Séance ${i}`,details:`Prescription ${i}`,isRest:false}))}]});
const context={nolioId:42,startDate:'2026-11-09',refs:{ftp:300}};
describe('common export legacy compatibility adapter',()=>{
 it('keeps original dedup slot for one selected session or a whole week',()=>{const p=plan();const full=legacyPlanExportSessions(p,{kind:'all'});const one=legacyPlanExportSessions(p,{kind:'sessions',keys:['S1-J1-1']});expect(one).toEqual([full[1]]);expect(one[0].sessionIndex).toBe(1);expect(one[0].details).toBe('Prescription 1');expect(legacyPlanExportSessions(p,{kind:'weeks',from:1,to:1})).toEqual(full);});
 it('refuses every native plan rather than rebuilding its source blocks',()=>{const p=plan();Object.assign(p,{_provenance:{engine:'det'}});expect(()=>legacyPlanExportSessions(p,{kind:'all'})).toThrow('V2');});
 it('rejects empty or unknown selections before sending',()=>{expect(()=>legacyPlanExportSessions(plan(),{kind:'sessions',keys:['S1-J1-99']})).toThrow('invalide');});
 it('sends 101 existing AI sessions over 13 bounded batches using the same V1 endpoint',async()=>{const invoke=vi.fn(async(_name,body)=>({sent:body.sessions.length,total:body.sessions.length,errors:[]}));expect(await exportLegacyPlan({plan:plan(101),scope:{kind:'all'},athleteId:'ath',context,invoke,progress:vi.fn(),current:()=>true})).toEqual({accepted:101,total:101});expect(invoke).toHaveBeenCalledTimes(13);expect(invoke.mock.calls.every(([name,b])=>name==='nolio-send-plan'&&b.sessions.length<=8&&b.planStartDate==='2026-11-09')).toBe(true);});
 it('stops immediately on partial acknowledgement and never invents completion',async()=>{const invoke=vi.fn(async()=>({sent:3,total:8,errors:[{status:429}]}));await expect(exportLegacyPlan({plan:plan(25),scope:{kind:'all'},athleteId:'ath',context,invoke,progress:vi.fn(),current:()=>true})).rejects.toThrow('partiel');expect(invoke).toHaveBeenCalledOnce();});
 it('never retries a lost response',async()=>{const invoke=vi.fn(async()=>{throw Error('timeout');});await expect(exportLegacyPlan({plan:plan(25),scope:{kind:'all'},athleteId:'ath',context,invoke,progress:vi.fn(),current:()=>true})).rejects.toThrow('timeout');expect(invoke).toHaveBeenCalledOnce();});
});
