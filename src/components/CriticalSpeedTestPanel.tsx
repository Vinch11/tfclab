import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import type { DbSnapshot } from '@/hooks/useCloudData';
import type { CriticalEffort } from '@/lib/criticalEfforts';
import { criticalEnvelope, parseStoredCriticalMetrics } from '@/lib/criticalMetrics';
import { criticalSpeedRecords, criticalSpeedTestRows, reviewCriticalSpeed } from '@/lib/diagnostic/criticalSpeedResults';
import type { NolioRecordRow } from '@/lib/lab/nolioCalibration';

export function CriticalSpeedTestPanel({ snapshot, updateSnapshot }: { snapshot: DbSnapshot; updateSnapshot: (id: string, updates: Partial<DbSnapshot>) => Promise<boolean> }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const existing = parseStoredCriticalMetrics(snapshot.critical_metrics).running;
  const [start, setStart] = useState(today);
  const [efforts, setEfforts] = useState<CriticalEffort[]>(existing?.efforts ?? []);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(format(subDays(new Date(), 42), 'yyyy-MM-dd'));
  const [to, setTo] = useState(today);
  const [message, setMessage] = useState('');
  const { fit, stored } = reviewCriticalSpeed(efforts, approved, today);
  const change = (index: number, values: Partial<CriticalEffort>) => { setApproved(false); setMessage(''); setEfforts(rows => rows.map((e, i) => i === index ? { ...e, ...values } : e)); };
  const readRecords = async () => {
    setBusy(true); setMessage(''); setApproved(false);
    try {
      const rows: NolioRecordRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('nolio_records').select('cat,record_type,sport_id,item_seconds,value,date_recorded').eq('athlete_id', snapshot.athlete_id).order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data ?? []) as NolioRecordRow[]);
        if (!data || data.length < 500) break;
      }
      const candidates = criticalSpeedRecords(rows, from, to);
      if (!candidates.length) { setMessage('Aucun record course admissible dans la période ; vos résultats saisis sont conservés.'); return; }
      setEfforts(candidates); setMessage('Records chargés comme estimation : vérifiez les efforts, conditions et séances avant de confirmer un protocole.');
    } catch { setMessage('Lecture Nolio échouée : aucun résultat remplacé.'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!stored) return;
    setBusy(true); setMessage('');
    try {
      const { data: latest, error } = await supabase.from('snapshots').select('critical_metrics').eq('id', snapshot.id).eq('athlete_id', snapshot.athlete_id).single();
      if (error) throw error;
      const metrics = { ...criticalEnvelope(latest.critical_metrics), running: stored };
      const raw = JSON.parse(JSON.stringify(metrics));
      if (!await updateSnapshot(snapshot.id, { critical_metrics: raw })) throw new Error('save');
      const { data, error: readError } = await supabase.from('snapshots').select('critical_metrics').eq('id', snapshot.id).single();
      const saved = parseStoredCriticalMetrics(data?.critical_metrics).running;
      // Postgres JSONB reorders object keys: compare values, not serialization order.
      if (readError || !saved || saved.critical !== stored.critical || saved.reserve !== stored.reserve || saved.status !== stored.status || saved.savedAt !== stored.savedAt || saved.efforts.length !== stored.efforts.length || saved.efforts.some((e, i) => {
        const expected = stored.efforts[i];
        return !expected || e.id !== expected.id || e.durationSec !== expected.durationSec || e.value !== expected.value || e.date !== expected.date || e.confirmed !== expected.confirmed || e.conditions !== expected.conditions || e.session !== expected.session;
      })) throw new Error('readback');
      setMessage('Vitesse critique enregistrée et relue dans le bilan.'); toast.success('Vitesse critique enregistrée');
    } catch { setMessage('Enregistrement ou relecture non confirmé : vérifiez le bilan avant toute utilisation.'); }
    finally { setBusy(false); }
  };
  return <section aria-label="Test vitesse critique" className="space-y-4 border-y border-border py-5">
    <h2 className="text-lg font-semibold">Vitesse critique · résultats des tests</h2>
    <p className="text-sm text-muted-foreground">Trois efforts maximaux continus de 3, 7 et 12 minutes, reposé, sur parcours plat mesuré. D′ est une réserve de distance ; ni la VMA ni le seuil lactate ne sont remplacés.</p>
    {existing && <p className="text-sm">Dans le bilan : VC {(existing.critical * 3.6).toFixed(2)} km/h · D′ {existing.reserve.toFixed(0)} m · {existing.status === 'confirmed' ? 'Validé coach' : 'Estimation'}</p>}
    <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Premier test<Input aria-label="Premier test VC" type="date" value={start} onChange={e => setStart(e.target.value)} /></label><Button variant="outline" disabled={busy || !/^\d{4}-\d{2}-\d{2}$/.test(start)} onClick={() => { setEfforts(criticalSpeedTestRows(start)); setApproved(false); setMessage(''); }}>Préparer les 3 tests</Button></div>
    <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Records depuis<Input aria-label="Records VC depuis" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label className="text-sm">Jusqu’au<Input aria-label="Records VC jusqu’au" type="date" value={to} max={today} onChange={e => setTo(e.target.value)} /></label><Button variant="outline" disabled={busy || !from || !to || from > to || to > today} onClick={readRecords}>Charger les records course Nolio</Button></div>
    <div className="divide-y divide-border">{efforts.map((e, i) => <fieldset key={e.id} className="space-y-3 py-4"><legend className="text-sm font-medium">Effort {i + 1} · {e.source === 'nolio' ? 'Record Nolio' : 'Test saisi'}</legend><div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Durée (s)<Input aria-label={`VC durée ${i + 1}`} type="number" value={e.durationSec} onChange={v => change(i, { durationSec: Number(v.target.value), confirmed: false })} /></label>
      <label className="text-sm">Distance mesurée (m)<Input aria-label={`VC distance ${i + 1}`} type="number" value={e.value || ''} onChange={v => change(i, { value: Number(v.target.value), confirmed: false })} /></label>
      <label className="text-sm">Date<Input aria-label={`VC date ${i + 1}`} type="date" value={e.date} onChange={v => change(i, { date: v.target.value, confirmed: false })} /></label>
      <label className="text-sm sm:col-span-2">Séance / référence<Input aria-label={`VC séance ${i + 1}`} value={e.session} onChange={v => change(i, { session: v.target.value, confirmed: false })} /></label>
      <label className="text-sm">Conditions et capteur<Input aria-label={`VC conditions ${i + 1}`} value={e.conditions} onChange={v => change(i, { conditions: v.target.value, confirmed: false })} /></label>
    </div><label className="flex min-h-11 gap-3 items-start text-sm"><Checkbox aria-label={`VC confirmer test ${i + 1}`} checked={e.confirmed} onCheckedChange={v => change(i, { confirmed: v === true })} />Je confirme l’effort maximal continu, sans repos, les mesures, l’athlète, les conditions comparables et une récupération suffisante.</label><Button variant="outline" size="sm" disabled={busy} onClick={() => { setApproved(false); setEfforts(rows => rows.filter((_, n) => n !== i)); }}>Retirer cet effort</Button></fieldset>)}</div>
    {fit.critical > 0 && <dl className="grid grid-cols-2 gap-4"><div><dt className="text-sm">Vitesse critique</dt><dd className="text-2xl font-semibold">{(fit.critical * 3.6).toFixed(2)} km/h</dd></div><div><dt className="text-sm">D′</dt><dd className="text-2xl font-semibold">{fit.reserve.toFixed(0)} m</dd></div></dl>}
    {efforts.length > 0 && [...fit.errors, ...fit.warnings].map(m => <p key={m} className="text-sm text-destructive">{m}</p>)}
    <label className="flex min-h-11 items-start gap-3 text-sm"><Checkbox aria-label="Valider VC pour les plans" checked={approved} disabled={fit.status !== 'eligible' || busy} onCheckedChange={v => setApproved(v === true)} />Je valide ces repères pour les propositions du plan. Chaque ajustement restera soumis à mon accord ; aucun classement de limiteurs ne change.</label>
    <Button disabled={!stored || busy} onClick={save}>{busy ? 'Vérification…' : stored?.status === 'confirmed' ? 'Enregistrer VC validée coach' : 'Enregistrer VC comme estimation'}</Button>
    <p className="text-xs text-muted-foreground">Tests récents : 42 jours maximum pour les propositions. Records non confirmés : indicateurs uniquement. Enregistrer remplace uniquement VC/D′ course de ce bilan, pas CP/W′ vélo ou les autres mesures.</p>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}