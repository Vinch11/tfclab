export interface NolioV2Record {
  value: number | null; unit: string; date: string | null; cat: string; record_type: string;
  inner_val?: number; training_id?: string; training_name?: string | null; sport_id?: string;
  sport_name?: string; source?: string;
}
export type SnapshotRecordFields = Partial<Record<'pmax_5s' | 'p30s_w' | 'p60s_w' | 'map5min_w' | 'run_power_1s' | 'run_power_5s' | 'run_power_30s' | 'run_power_60s' | 'run_power_5min' | 'fc_max' | 'sprint_15s' | 'vma' | 'tte_observed_min' | 'tte_observed_min_run', string>>;
export type ReviewedRecord = NolioV2Record & { sportBase: string };

export interface NolioRecordSport { id: string; name: string; sport_base: string | null }

export function recordQueries(sport: NolioRecordSport, catalogue: NolioRecordSport[]) {
  const base=catalogue.find(s=>s.name==='Vélo - Route')?.sport_base;
  return sport.sport_base && sport.sport_base===base
    ? [{cat:'ppr',axis:'time'}, {cat:'phrr',axis:'time'}]
    : [{cat:'par',axis:'time'}, {cat:'par',axis:'distance'}, {cat:'phrr',axis:'time'}];
}

/** Convert only explicitly described pace/speed units, never a guessed sport unit. */
export function speedMetresPerSecond(record: NolioV2Record): number | null {
  const value=record.value;
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0)return null;
  const unit=record.unit;
  if(unit==='m/s')return value;
  if(unit==='km/h')return value/3.6;
  if(unit==='s/km')return 1000/value;
  if(unit==='min/km')return 1000/(value*60);
  if(unit==='s/100m')return 100/value;
  return null;
}

export interface TestProposal {
  id: string; label: string; value: string; unit: string; record: ReviewedRecord;
  field?: keyof SnapshotRecordFields; requiresProtocol: boolean;
}

export function testProposals(records: ReviewedRecord[]): TestProposal[] {
  const proposals:TestProposal[]=[];
  for(const [i,r] of records.entries()) {
    if(typeof r.value!=='number'||!Number.isFinite(r.value)||r.value<=0||r.record_type!=='time')continue;
    if(r.sportBase==='cycling'&&r.cat==='ppr'&&r.unit==='W') {
      const definition=({5:['D1 vélo · Sprint 5 s','pmax_5s'],30:['D1 vélo · Puissance 30 s','p30s_w'],60:['D1 vélo · Puissance 60 s','p60s_w'],300:['D3 vélo · Puissance 5 min','map5min_w']} as const)[r.inner_val as 5];
      if(definition)proposals.push({id:String(i),label:definition[0],field:definition[1],value:String(Math.round(r.value)),unit:'W',record:r,requiresProtocol:false});
      if(r.inner_val===1200)proposals.push({id:String(i),label:'D5 vélo · Puissance 20 min — pas une FTP',value:String(Math.round(r.value)),unit:'W',record:r,requiresProtocol:true});
    }
    if(r.sportBase==='running'&&r.cat==='par'&&(r.inner_val===15||r.inner_val===360)) {
      const speed=speedMetresPerSecond(r);
      if(speed===null)continue;
      const sprint=r.inner_val===15;
      proposals.push({id:String(i),label:sprint?'D1 course · Distance sprint 15 s':'D3 course · VMA du test 6 min',field:sprint?'sprint_15s':'vma',value:String(Math.round((sprint?speed*15:speed*3.6)*10)/10),unit:sprint?'m':'km/h',record:r,requiresProtocol:true});
    }
  }
  return proposals;
}

export function proposalFields(proposals: TestProposal[], accepted: Set<string>, verified: Set<string>, mode:'quick'|'verified'): SnapshotRecordFields {
  const fields:SnapshotRecordFields={};
  for(const p of proposals) {
    if(!p.field||!accepted.has(p.id)||(p.requiresProtocol||mode==='verified')&&!verified.has(p.id))continue;
    fields[p.field]=String(Math.max(Number(fields[p.field]??0),Number(p.value)));
  }
  return fields;
}

/** Every selected variant is queried separately; a failed read never becomes an empty successful result. */
export async function readSportsRecords(
  sports: NolioRecordSport[],
  catalogue: NolioRecordSport[],
  readSport: (sport: string) => Promise<{ records: NolioV2Record[]; complete: boolean }>,
): Promise<{ records: ReviewedRecord[]; complete: boolean }> {
  const bikeBase = catalogue.find(s => s.name === 'Vélo - Route')?.sport_base;
  const runBase = catalogue.find(s => s.name === 'Course à pied')?.sport_base;
  const results = await Promise.all(sports.map(async sport => {
    const data = await readSport(sport.id);
    const sportBase = sport.sport_base && sport.sport_base === bikeBase ? 'cycling'
      : sport.sport_base && sport.sport_base === runBase ? 'running' : 'other';
    return { complete: data.complete, records: data.records.map(r => ({
      ...r, sport_id: sport.id, sport_name: r.sport_name ?? sport.name, sportBase,
    })) };
  }));
  return { records: results.flatMap(result => result.records), complete: results.every(result => result.complete) };
}

export function selectableRecordIndices(records: NolioV2Record[]): number[] {
  return records.flatMap((r, i) => typeof r.value === 'number' && Number.isFinite(r.value) && r.value > 0 ? [i] : []);
}

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