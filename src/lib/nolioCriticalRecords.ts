import { readSportsRecords, type NolioRecordSport, type NolioV2Record } from './nolioV2Records';

/** Each variant stays separate; no partial response is usable for import. */
export async function readCriticalPeriodRecords(sports: NolioRecordSport[], read: (sport: string) => Promise<{ records: NolioV2Record[]; complete: boolean }>, activeSports?: Set<string>) {
  const bases = new Set(sports.filter(s => s.name === 'Course à pied' || s.name === 'Vélo - Route').map(s => s.sport_base).filter(Boolean));
  const variants = sports.filter(s => s.sport_base && bases.has(s.sport_base) && (!activeSports || activeSports.has(s.id)));
  if (activeSports && !variants.length) return [];
  if (!variants.length) throw new Error('Sports course/vélo indisponibles.');
  // Sequential reads prevent a catalogue with many variants from flooding Nolio.
  const result = await readSportsRecords(variants, sports, (() => {
    let queue: Promise<unknown> = Promise.resolve();
    return (sport: string) => {
      const task = queue.then(() => read(sport));
      queue = task;
      return task;
    };
  })());
  if (!result.complete) throw new Error('Lecture incomplète : import suspendu.');
  return result.records.filter(r => r.cat === 'ppr' && r.unit === 'W' && r.record_type === 'time' && typeof r.value === 'number' && Number.isFinite(r.value) && r.value > 0);
}