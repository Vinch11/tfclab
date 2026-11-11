import { assertEquals } from 'jsr:@std/assert@1';
import { handleCycles } from './cycles.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
const athleteId = 'a1be75fd-c795-40a3-9153-1d794a3f3539';
const cycle = { name: 'Base', description: 'Chantier VO₂max', date_start: '2026-11-09', date_end: '2026-11-22' };
function client(owned = true) {
  const builder = { select() { return this; }, eq() { return this; }, maybeSingle() { return Promise.resolve({ data: owned ? { nolio_id: 338386 } : null, error: null }); } };
  return { from: () => builder } as unknown as SupabaseClient;
}
Deno.test('Refuse athlète inaccessible sans appeler Nolio', async () => {
  let calls = 0;
  const result = await handleCycles({ action: 'cycles', athlete_id: athleteId, cycles: [cycle] }, client(false), 'coach', 'test', async () => { calls++; return new Response(); });
  assertEquals('error' in result ? result.error : null, 'athlete_access_denied');
  assertEquals(calls, 0);
});
Deno.test('Refuse les cycles qui se chevauchent sans appeler Nolio', async () => {
  let calls = 0;
  const result = await handleCycles({ action: 'cycles', athlete_id: athleteId, cycles: [cycle, cycle] }, client(), 'coach', 'test', async () => { calls++; return new Response(); });
  assertEquals('error' in result ? result.error : null, 'invalid_cycles');
  assertEquals(calls, 0);
});
Deno.test('Aperçu sans écriture puis création confirmée relue et renvoi non dupliqué', async () => {
  let writes = 0, reads = 0;
  const existing: unknown[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    const path = String(url);
    let body: unknown;
    if (path.includes('migration/ids/')) body = { data: [{ v1_id: 338386, id: 'usr_vince' }] };
    else if (init?.method === 'POST') {
      writes++;
      const received = JSON.parse(String(init.body));
      assertEquals(received.athletes, ['usr_vince']);
      body = { ...received, id: 'pcyc_test' }; existing.push(body);
    } else if (path.includes('pcyc_test')) { reads++; body = existing[0]; }
    else body = { data: existing, has_more: false };
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  };
  const input = { action: 'cycles', athlete_id: athleteId, cycles: [cycle] };
  await handleCycles(input, client(), 'coach', 'test', fetcher);
  assertEquals(writes, 0);
  const created = await handleCycles({ ...input, confirm: true }, client(), 'coach', 'test', fetcher);
  assertEquals('confirmed' in created && created.confirmed, true);
  assertEquals(writes, 1); assertEquals(reads, 1);
  await handleCycles({ ...input, confirm: true }, client(), 'coach', 'test', fetcher);
  assertEquals(writes, 1);
});
Deno.test('Lecture incomplète interdit toute création', async () => {
  let writes = 0;
  const fetcher: typeof fetch = async (url, init) => {
    if (init?.method === 'POST') writes++;
    const value = String(url).includes('migration') ? { data: [{ v1_id: 338386, id: 'usr_vince' }] } : { data: [], has_more: true };
    return new Response(JSON.stringify(value));
  };
  const result = await handleCycles({ action: 'cycles', athlete_id: athleteId, cycles: [cycle], confirm: true }, client(), 'coach', 'test', fetcher);
  assertEquals('error' in result ? result.error : null, 'incomplete_cycle_read');
  assertEquals(writes, 0);
});