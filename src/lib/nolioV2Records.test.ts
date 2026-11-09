import { describe, expect, it } from 'vitest';
import { observedFields, mergeEmptyFields, readSportsRecords, selectableRecordIndices, recordQueries, testProposals, proposalFields, speedMetresPerSecond, type ReviewedRecord } from './nolioV2Records';
import { ownsPersonalConnection, validPeriod, canReadTestSession } from '../../supabase/functions/nolio-v2-oauth/recordContract';
const record = (patch: Partial<ReviewedRecord>): ReviewedRecord => ({value: 450, unit:'W', date:'2026-10-15', cat:'ppr', record_type:'time', inner_val:5, sportBase:'cycling', ...patch});
describe('Nolio period snapshot', () => {
  it('reads only an accessible athletes session from a complete period list',()=>{
    const athletes=[{id:'usr_owner',has_api_access:true}],sessions=[{id:'trn_test'}];
    expect(canReadTestSession('usr_owner','trn_test',athletes,sessions,true)).toBe(true);
    expect(canReadTestSession('usr_other','trn_test',athletes,sessions,true)).toBe(false);
    expect(canReadTestSession('usr_owner','trn_other',athletes,sessions,true)).toBe(false);
    expect(canReadTestSession('usr_owner','trn_test',athletes,sessions,false)).toBe(false);
    expect(canReadTestSession('usr_owner','trn_test',[{id:'usr_owner',has_api_access:false}],sessions,true)).toBe(false);
  });
  it('routes bike to power and running to pace with distance windows',()=>{
    const bike={id:'b',name:'Vélo - Route',sport_base:'b'};
    const run={id:'r',name:'Course à pied',sport_base:'r'};
    expect(recordQueries(bike,[bike,run])).toEqual([{cat:'ppr',axis:'time'},{cat:'phrr',axis:'time'}]);
    expect(recordQueries(run,[bike,run])).toEqual([{cat:'par',axis:'time'},{cat:'par',axis:'distance'},{cat:'phrr',axis:'time'}]);
  });
  it('keeps P20 as an observation and never imports it as FTP',()=>{
    const proposals=testProposals([record({inner_val:1200,value:300})]);
    expect(proposals[0].value).toBe('300');
    expect(proposalFields(proposals,new Set(['0']),new Set(['0']),'verified')).toEqual({});
  });
  it('requires protocol confirmation for sprint 15s distance and VMA 6min',()=>{
    const proposals=testProposals([record({cat:'par',sportBase:'running',unit:'m/s',value:6,inner_val:15}),record({cat:'par',sportBase:'running',unit:'s/km',value:240,inner_val:360})]);
    expect(proposalFields(proposals,new Set(['0','1']),new Set(),'quick')).toEqual({});
    expect(proposalFields(proposals,new Set(['0','1']),new Set(['0','1']),'verified')).toEqual({sprint_15s:'90',vma:'15'});
  });
  it('requires confirmation even for bike power in verified mode',()=>{
    const proposals=testProposals([record({inner_val:300,value:350})]);
    expect(proposalFields(proposals,new Set(['0']),new Set(),'verified')).toEqual({});
    expect(proposalFields(proposals,new Set(['0']),new Set(['0']),'verified')).toEqual({map5min_w:'350'});
  });
  it('does not guess unsupported pace units',()=>{
    expect(speedMetresPerSecond(record({unit:'/km'}))).toBe(null);
    expect(testProposals([record({cat:'par',sportBase:'running',unit:'/km',inner_val:15})])).toEqual([]);
  });
  const sports = [
    {id:'route',name:'Vélo - Route',sport_base:'bike'},
    {id:'indoor',name:'Vélo - Home trainer',sport_base:'bike'},
    {id:'track',name:'Vélo - Piste',sport_base:'bike'},
    {id:'run',name:'Course à pied',sport_base:'run'},
    {id:'swim',name:'Natation',sport_base:'swim'},
  ];
  it('reads all selected triathlon and cycling variants with separate observed powers', async () => {
    const calls:string[]=[];
    const result=await readSportsRecords(sports,sports,async id=>{calls.push(id);return {complete:true,records:[record({value:id==='run'?600:id==='indoor'?500:450})]};});
    expect(calls).toEqual(['route','indoor','track','run','swim']);
    expect(result.records.map(r=>r.sportBase)).toEqual(['cycling','cycling','cycling','running','other']);
    expect(observedFields(result.records)).toEqual({pmax_5s:'500',run_power_5s:'600'});
  });
  it('selects every valid record at once, excluding unavailable values', () => {
    expect(selectableRecordIndices([record({}),record({sportBase:'running'}),record({value:null}),record({value:0}),record({value:NaN})])).toEqual([0,1]);
  });
  it('suspends prefill if one selected sport is incomplete', async () => {
    const result=await readSportsRecords(sports,sports,async id=>({complete:id!=='indoor',records:[]}));
    expect(result.complete).toBe(false);
  });
  it('does not hide a failed sport read behind the successful ones', async () => {
    await expect(readSportsRecords(sports,sports,async id=>{if(id==='run')throw new Error('read failed');return {complete:true,records:[]};})).rejects.toThrow('read failed');
  });
  it('keeps cycling and running power separate', () => expect(observedFields([record({}), record({sportBase:'running',value:600})])).toEqual({pmax_5s:'450',run_power_5s:'600'}));
  it('never replaces a manual or laboratory field', () => expect(mergeEmptyFields({pmax_5s:'700',p30s_w:''},{pmax_5s:'450',p30s_w:'500'})).toEqual({pmax_5s:'700',p30s_w:'500'}));
  it('does not invent missing values or derive thresholds', () => expect(observedFields([record({value:null}),record({inner_val:1200}),record({unit:'s/km',cat:'par'})])).toEqual({}));
  it('does not treat average heart rate as maximum', () => expect(observedFields([record({cat:'phrr',unit:'bpm',inner_val:300,value:180}),record({cat:'phrr',unit:'bpm',inner_val:1,value:190})])).toEqual({fc_max:'190'}));
  it('requires personal key owner identity', () => {expect(ownsPersonalConnection('coach@example.org','other@example.org')).toBe(false);expect(ownsPersonalConnection(null,null)).toBe(false);expect(ownsPersonalConnection('Coach@example.org','coach@example.org')).toBe(true);});
  it('accepts October 1 through November 1 and rejects inverted or invalid dates', () => {expect(validPeriod('2026-10-01','2026-11-01')).toBe(true);expect(validPeriod('2026-11-01','2026-10-01')).toBe(false);expect(validPeriod('2026-02-30','2026-03-01')).toBe(false);});
});