import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CriticalEffortsPanel } from '@/components/CriticalEffortsPanel';
import { readCriticalPeriodRecords } from '@/lib/nolioCriticalRecords';
import type { NolioRecordSport, ReviewedRecord } from '@/lib/nolioV2Records';
import type { CriticalMetricKey, StoredCriticalMetrics, StoredCriticalSport } from '@/lib/criticalMetrics';

type Catalogues = { complete: boolean; athletes: { id: string; name: string; has_api_access: boolean }[]; sports: NolioRecordSport[] };
async function call(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke('nolio-v2-oauth', { body });
  if (error) throw new Error('Lecture Nolio indisponible ou limitée : aucun import effectué, réessayez plus tard.');
  return data;
}

export function NolioCriticalRecordsImporter({ athleteName, stored, onSave }: { athleteName?: string; stored: StoredCriticalMetrics; onSave: (sport: CriticalMetricKey, value: StoredCriticalSport | null) => void }) {
  const [catalogues, setCatalogues] = useState<Catalogues | null>(null);
  const [athlete, setAthlete] = useState('');
  const [from, setFrom] = useState(new Date(Date.now() - 42 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<ReviewedRecord[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [identity, setIdentity] = useState(false);
  const [sensor, setSensor] = useState('');
  const [sameSensor, setSameSensor] = useState(false);
  useEffect(() => {
    let active = true;
    call({ action: 'catalogues' }).then((d: Catalogues) => {
      if (!active) return;
      if (!d.complete) throw new Error('Liste Nolio incomplète.');
      setCatalogues(d);
      // No fuzzy identity match: coach explicitly selects and confirms the athlete.
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  const reset = () => { setRecords(null); setIdentity(false); setSameSensor(false); };
  const search = async () => {
    if (!catalogues || !athlete || !from || !to || from > to) return;
    setBusy(true); setError(''); reset();
    try {
      const sessions = await call({ action: 'test_sessions', athlete, from, to });
      if (!sessions?.complete || !Array.isArray(sessions.sessions)) throw new Error('Liste des séances incomplète : import suspendu.');
      const activeSports = new Set<string>(sessions.sessions.map((s: { sport: string }) => s.sport));
      const result = await readCriticalPeriodRecords(catalogues.sports, id => call({ action: 'records', athlete, sport: id, from, to, cat: 'ppr', record_type: 'time' }), activeSports);
      setRecords(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Lecture impossible.'); }
    finally { setBusy(false); }
  };
  return <section className="min-w-0 space-y-4 border-b border-border py-4">
    <h3 className="font-semibold">Records de puissance Nolio · course et vélo</h3>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>div]:min-w-0">
      <div className="sm:col-span-2"><Label htmlFor="critical-nolio-athlete">Athlète Nolio</Label><select id="critical-nolio-athlete" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={athlete} disabled={busy || !catalogues} onChange={e => { setAthlete(e.target.value); reset(); }}><option value="">Choisir un athlète</option>{catalogues?.athletes.map(a => <option key={a.id} value={a.id} disabled={!a.has_api_access}>{a.name}</option>)}</select></div>
      <div><Label htmlFor="critical-nolio-from">Du</Label><Input id="critical-nolio-from" type="date" value={from} max={to} disabled={busy} onChange={e => { setFrom(e.target.value); reset(); }} /></div>
      <div><Label htmlFor="critical-nolio-to">Au (inclus)</Label><Input id="critical-nolio-to" type="date" value={to} min={from} disabled={busy} onChange={e => { setTo(e.target.value); reset(); }} /></div>
    </div>
    <Button className="h-auto min-h-11 max-w-full whitespace-normal text-left" onClick={search} disabled={busy || !catalogues || !athlete || !from || !to || from > to}><Search className="mr-2 h-4 w-4 shrink-0" />{busy ? 'Lecture des records…' : 'Trouver les records de la période'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {records && <>
      <p className="text-sm text-muted-foreground">{records.filter(r => r.sportBase === 'running').length} records course · {records.filter(r => r.sportBase === 'cycling').length} records vélo · {from} → {to}</p>
      {records.length === 0 && <p className="text-sm">Données insuffisantes : aucun record de puissance sur cette période.</p>}
      <label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={identity} onCheckedChange={v => setIdentity(v === true)} />Je confirme que l’athlète Nolio correspond à {athleteName ?? 'ce bilan'}.</label>
      <div><Label htmlFor="critical-nolio-sensor">Capteur course et capteur vélo</Label><Input id="critical-nolio-sensor" placeholder="Course : Stryd… · Vélo : capteur…" value={sensor} onChange={e => { setSensor(e.target.value); setSameSensor(false); }} /></div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={sameSensor} disabled={!sensor.trim()} onCheckedChange={v => setSameSensor(v === true)} />Les efforts que je retiens proviennent du même capteur pour chaque sport, dans des conditions comparables.</label>
      <CriticalEffortsPanel recordsOnly key={`${athlete}-${from}-${to}`} records={records} athleteLabel={`Nolio : ${catalogues?.athletes.find(a => a.id === athlete)?.name ?? 'athlète sélectionné'} · Bilan : ${athleteName ?? 'en cours'} · ${from} → ${to}`} stored={stored} onSave={identity && sameSensor ? (sport, value) => {
        if (stored[sport]) return;
        onSave(sport, value ? { ...value, status: 'estimate', efforts: value.efforts.map(e => ({ ...e, confirmed: false, conditions: `${e.conditions} · ${sensor.trim()}` })), warnings: [...value.warnings, 'Import de records : estimation, pas test confirmé.'] } : null);
      } : undefined} />
      {Object.keys(stored).length > 0 && <p className="text-sm text-muted-foreground">Les repères déjà enregistrés sont conservés ; aucun remplacement automatique.</p>}
    </>}
  </section>;
}