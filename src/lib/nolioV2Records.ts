export interface NolioV2Record {
  value: number | null; unit: string; date: string | null; cat: string; record_type: string;
  inner_val?: number; training_id?: string; training_name?: string | null; sport_id?: string;
  sport_name?: string; source?: string;
}
export type SnapshotRecordFields = Partial<Record<'pmax_5s' | 'p30s_w' | 'p60s_w' | 'map5min_w' | 'run_power_1s' | 'run_power_5s' | 'run_power_30s' | 'run_power_60s' | 'run_power_5min' | 'fc_max', string>>;
export type ReviewedRecord = NolioV2Record & { sportBase: string };

/** Only observed, unit-checked values. No FTP, VMA, CSS, TTE or lactate inferred from a best effort. */
export function observedFields(records: ReviewedRecord[]): SnapshotRecordFields {
  const fields: SnapshotRecordFields = {};
  for (const r of records) {
    if (typeof r.value !== 'number' || !Number.isFinite(r.value) || r.value <= 0 || r.record_type !== 'time') continue;
    let key: keyof SnapshotRecordFields | undefined;
    if (r.cat === 'ppr' && r.unit === 'W') {
      if (r.sportBase === 'cycling') key = ({5:'pmax_5s',30:'p30s_w',60:'p60s_w',300:'map5min_w'} as const)[r.inner_val as 5];
      if (r.sportBase === 'running') key = ({1:'run_power_1s',5:'run_power_5s',30:'run_power_30s',60:'run_power_60s',300:'run_power_5min'} as const)[r.inner_val as 1];
    }
    if (r.cat === 'phrr' && r.unit === 'bpm' && r.inner_val === 1) key = 'fc_max';
    if (key) fields[key] = String(Math.max(Number(fields[key] ?? 0), Math.round(r.value)));
  }
  return fields;
}

export function mergeEmptyFields<T extends Record<string, string>>(current: T, incoming: SnapshotRecordFields): T {
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (key in merged && !merged[key]?.trim() && value) (merged as Record<string, string>)[key] = value;
  }
  return merged;
}

export function recordNotes(records: ReviewedRecord[], from: string, to: string): string {
  return [`Nolio v2 — période ${from} → ${to} — records revus par le coach (efforts, pas tests confirmés).`, ...records.map(r =>
    `${r.sport_name ?? r.sportBase} | ${r.cat} ${r.inner_val ?? '?'} ${r.record_type === 'distance' ? 'm' : 's'} : ${r.value ?? 'indisponible'} ${r.unit} | ${r.date ?? 'date inconnue'} | ${r.training_name ?? 'séance non fournie'}${r.training_id ? ` (${r.training_id})` : ''}`
  )].join('\n');
}