import { z } from 'npm:zod@3';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { classifyCycles, overlapping, sameCycle, type Cycle } from './cycleContract.ts';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s);
const schema = z.object({ action: z.literal('cycles'), athlete_id: z.string().uuid(), confirm: z.boolean().default(false),
  cycles: z.array(z.object({ name: z.string().trim().min(1).max(255), description: z.string().max(12000), date_start: date, date_end: date })
    .refine(c => c.date_start <= c.date_end)).min(1).max(104),
}).superRefine((body, ctx) => {
  if (body.cycles.some((c, i) => body.cycles.slice(i + 1).some(other => overlapping(c, other)))) ctx.addIssue({ code: 'custom', message: 'Les cycles proposés se chevauchent.' });
});
export async function handleCycles(body: unknown, client: SupabaseClient, userId: string, token: string, fetcher: typeof fetch = fetch) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: 'invalid_cycles', detail: parsed.error.issues.map(i => i.message).join(' · '), status: 400 };
  const input = parsed.data;
  const { data: athlete, error } = await client.from('athletes').select('id,nolio_id,coach_id').eq('id', input.athlete_id).eq('coach_id', userId).maybeSingle();
  if (error || !athlete || !Number.isSafeInteger(athlete.nolio_id) || athlete.nolio_id <= 0) return { error: 'athlete_access_denied', status: 403 };
  const request = async (path: string, init?: RequestInit) => {
    const res = await fetcher('https://www.nolio.io/api/v2/' + path, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } });
    const value = await res.json().catch(() => null);
    if (!res.ok) throw new Error(JSON.stringify({ status: res.status, code: value?.error?.code ?? 'nolio_error', message: value?.error?.message ?? 'Nolio a refusé la demande.' }));
    return value;
  };
  const ids = await request(`migration/ids/?type=user&ids=${athlete.nolio_id}`);
  const ref = ids?.data?.find((r: { v1_id: number; id: string }) => r.v1_id === athlete.nolio_id)?.id;
  if (typeof ref !== 'string' || !/^usr_[A-Za-z0-9_-]+$/.test(ref)) return { error: 'athlete_not_found', status: 403 };
  const sorted = [...input.cycles].sort((a, b) => a.date_start.localeCompare(b.date_start));
  const query = `athlete=${encodeURIComponent(ref)}&date_from=${sorted[0].date_start}&date_to=${sorted[sorted.length - 1].date_end}`;
  const existing: Cycle[] = [];
  let complete = false;
  for (let page = 0; page < 100; page++) {
    const last = existing.at(-1)?.id;
    const result = await request(`planned/cycles/?${query}&limit=100${last ? '&starting_after=' + encodeURIComponent(last) : ''}`);
    if (!Array.isArray(result?.data) || typeof result.has_more !== 'boolean') return { error: 'incomplete_cycle_read', status: 502 };
    existing.push(...result.data);
    if (!result.has_more) { complete = true; break; }
    if (!result.data.length || !existing.at(-1)?.id) break;
  }
  if (!complete) return { error: 'incomplete_cycle_read', status: 502 };
  // Stable ownership marker permits safe repeated sends, not replacement of manually edited banners.
  const drafts = input.cycles.map(c => ({ ...c, description: `${c.description}\n\n[TFCL cycle ${input.athlete_id} ${c.date_start} ${c.date_end}]` }));
  const entries = classifyCycles(drafts, existing);
  if (!input.confirm || entries.some(e => e.state === 'conflict')) return { entries, confirmed: false };
  const results: Array<{ name: string; state: string; id?: string }> = [];
  for (const entry of entries) {
    if (entry.state === 'existing') { results.push({ name: entry.cycle.name, state: 'existing', id: entry.id }); continue; }
    try {
      const created = await request('planned/cycles/', { method: 'POST', body: JSON.stringify({ ...entry.cycle, athletes: [ref] }) });
      if (typeof created?.id !== 'string' || !/^pcyc_[A-Za-z0-9_-]+$/.test(created.id)) throw new Error('Création non confirmée par Nolio.');
      const read = await request(`planned/cycles/${encodeURIComponent(created.id)}/?athlete=${encodeURIComponent(ref)}`);
      if (!sameCycle(entry.cycle, read)) throw new Error('Le cycle relu dans Nolio diffère du cycle envoyé.');
      results.push({ name: entry.cycle.name, state: 'created', id: created.id });
    } catch (e) { return { results, error: e instanceof Error ? e.message : 'Envoi interrompu.', confirmed: false }; }
  }
  return { results, confirmed: true };
}