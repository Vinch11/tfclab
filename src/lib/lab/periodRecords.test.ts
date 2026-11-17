import { describe, expect, it } from 'vitest';
import { readLabPeriodRecords } from './periodRecords';
describe('period-specific Nolio records', () => {
  const setup = (incomplete = false) => {
    const calls: Record<string, string>[] = [];
    const call = async (body: Record<string, string>) => {
      calls.push(body);
      if (body.action === 'catalogues') return { complete: true, athletes: [{ id: 'usr_a', has_api_access: true }], sports: [{ id: 'spt_b', name: 'Vélo - Route', sport_base: 'bike' }, { id: 'spt_i', name: 'Indoor', sport_base: 'bike' }] };
      if (body.action === 'test_sessions') return { complete: true, sessions: [{ sport: 'spt_b' }, { sport: 'spt_i' }] };
      return { complete: !incomplete, records: [{ cat: 'ppr', record_type: 'time', inner_val: 300, value: 220, unit: 'W', date: '2026-11-01' }, { cat: 'ppr', record_type: 'time', inner_val: 300, value: 350, unit: 'W', date: '2025-01-01' }] };
    };
    return { calls, call };
  };
  it('asks each variant for maxima inside the chosen bounds, excludes lifetime records', async () => {
    const { calls, call } = setup();
    const rows = await readLabPeriodRecords('usr_a', 'bike', '2026-10-01', '2026-11-12', call);
    expect(calls.filter(c => c.action === 'records')).toEqual(['spt_b', 'spt_i'].map(sport => ({ action: 'records', athlete: 'usr_a', sport, from: '2026-10-01', to: '2026-11-12', cat: 'ppr', record_type: 'time' })));
    expect(rows.map(r => r.value)).toEqual([220, 220]);
  });
  it('suspends the whole read when a variant is incomplete', async () => {
    await expect(readLabPeriodRecords('usr_a', 'bike', '2026-10-01', '2026-11-12', setup(true).call)).rejects.toThrow('incomplets');
  });
});