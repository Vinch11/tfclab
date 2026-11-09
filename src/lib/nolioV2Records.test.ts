import { describe, expect, it } from 'vitest';
import { observedFields, mergeEmptyFields, type ReviewedRecord } from './nolioV2Records';
import { ownsPersonalConnection, validPeriod } from '../../supabase/functions/nolio-v2-oauth/recordContract';
const record = (patch: Partial<ReviewedRecord>): ReviewedRecord => ({value: 450, unit:'W', date:'2026-10-15', cat:'ppr', record_type:'time', inner_val:5, sportBase:'cycling', ...patch});
describe('Nolio period snapshot', () => {
  it('keeps cycling and running power separate', () => expect(observedFields([record({}), record({sportBase:'running',value:600})])).toEqual({pmax_5s:'450',run_power_5s:'600'}));
  it('never replaces a manual or laboratory field', () => expect(mergeEmptyFields({pmax_5s:'700',p30s_w:''},{pmax_5s:'450',p30s_w:'500'})).toEqual({pmax_5s:'700',p30s_w:'500'}));
  it('does not invent missing values or derive thresholds', () => expect(observedFields([record({value:null}),record({inner_val:1200}),record({unit:'s/km',cat:'par'})])).toEqual({}));
  it('does not treat average heart rate as maximum', () => expect(observedFields([record({cat:'phrr',unit:'bpm',inner_val:300,value:180}),record({cat:'phrr',unit:'bpm',inner_val:1,value:190})])).toEqual({fc_max:'190'}));
  it('requires personal key owner identity', () => {expect(ownsPersonalConnection('coach@example.org','other@example.org')).toBe(false);expect(ownsPersonalConnection(null,null)).toBe(false);expect(ownsPersonalConnection('Coach@example.org','coach@example.org')).toBe(true);});
  it('accepts October 1 through November 1 and rejects inverted or invalid dates', () => {expect(validPeriod('2026-10-01','2026-11-01')).toBe(true);expect(validPeriod('2026-11-01','2026-10-01')).toBe(false);expect(validPeriod('2026-02-30','2026-03-01')).toBe(false);});
});