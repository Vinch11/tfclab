import { speedMetresPerSecond, type NolioV2Record, type NolioRecordSport } from '@/lib/nolioV2Records';
import type { NolioRecordRow } from './nolioCalibration';

/** Query period-specific maxima upstream; never filter lifetime maxima as a substitute. */
export async function readLabPeriodRecords(
  athlete: string, sport: 'bike' | 'run', from: string, to: string,
  call: (body: Record<string, string>) => Promise<any>,
): Promise<NolioRecordRow[]> {
  if (!from || !to || from > to) throw new Error('Période invalide.');
  const catalogue = await call({ action: 'catalogues' });
  if (!catalogue.complete) throw new Error('Liste Nolio incomplète.');
  if (!catalogue.athletes.some((a: { id: string; has_api_access: boolean }) => a.id === athlete && a.has_api_access)) throw new Error('Athlète Nolio inaccessible.');
  const sessions = await call({ action: 'test_sessions', athlete, from, to });
  if (!sessions.complete || !Array.isArray(sessions.sessions)) throw new Error('Liste des séances incomplète.');
  const sports = catalogue.sports as NolioRecordSport[];
  const base = sports.find(s => s.name === (sport === 'bike' ? 'Vélo - Route' : 'Course à pied'))?.sport_base;
  if (!base) throw new Error('Sport Nolio introuvable.');
  const active = new Set(sessions.sessions.map((s: { sport: string }) => s.sport));
  const variants = sports.filter(s => s.sport_base === base && active.has(s.id));
  const results = await Promise.all(variants.map(async variant => {
    const result = await call({ action: 'records', athlete, sport: variant.id, from, to, cat: sport === 'bike' ? 'ppr' : 'par', record_type: 'time' });
    if (!result.complete || !Array.isArray(result.records)) throw new Error('Records Nolio incomplets.');
    return (result.records as NolioV2Record[]).flatMap(r => {
      const date = r.date?.slice(0, 10);
      const value = sport === 'run' ? speedMetresPerSecond(r) : r.unit === 'W' ? r.value : null;
      if (!date || date < from || date > to || !r.inner_val || !value || !Number.isFinite(value) || value <= 0 || r.record_type !== 'time' || r.cat !== (sport === 'bike' ? 'ppr' : 'par')) return [];
      return [{ cat: r.cat, record_type: 'time', sport_id: sport === 'bike' ? 14 : 2, item_seconds: r.inner_val, value, date_recorded: date }];
    });
  }));
  return results.flat();
}