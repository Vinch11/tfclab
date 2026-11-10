import { useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { detectPeriodTests, type DetectedTest, type DetectionSession } from '@/lib/periodTestDetection';
import type { SnapshotRecordFields } from '@/lib/nolioV2Records';

type Props = { athlete: string; from: string; to: string; onApply?: (fields: SnapshotRecordFields, notes: string) => void };
type ListedSession = { id: string; name: string; date: string; sportBase: 'cycling' | 'running' };

async function call(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke('nolio-v2-oauth', { body });
  if (error) throw new Error('Lecture Nolio impossible.');
  return data;
}

export function NolioPeriodTestFinder({ athlete, from, to, onApply }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<DetectedTest[] | null>(null);
  const [missing, setMissing] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const run = async () => {
    setBusy(true); setError(null); setTests(null);
    try {
      const list = await call({ action: 'test_sessions', athlete, from, to });
      if (!list?.complete) throw new Error('Liste des séances incomplète : recherche suspendue.');
      const sessions: ListedSession[] = list.sessions;
      const out: DetectionSession[] = []; let failed = 0; let done = 0;
      const queue = [...sessions];
      const worker = async () => {
        for (let s = queue.shift(); s; s = queue.shift()) {
          try {
            if (s.sportBase === 'running') {
              const r = await call({ action: 'test_session', athlete, training: s.id, from, to });
              out.push({ ...s, laps: r?.laps ?? [] });
            } else {
              const r = await call({ action: 'protocol_session', athlete, training: s.id, from, to });
              const l = await call({ action: 'test_session', athlete, training: s.id, from, to }).catch(() => null);
              const bikeLaps = (l?.laps ?? []).map((x: { duration?: number; stats?: { watts_avg?: { value?: number } } }) => ({ duration: x.duration, watts: x.stats?.watts_avg?.value }));
              out.push({ ...s, bikeLaps, time: r?.streams?.stream_time, watts: r?.streams?.stream_watts ?? r?.streams?.stream_power });
            }
          } catch { failed++; }
          setProgress(`${++done}/${sessions.length} séances analysées`);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      const found = detectPeriodTests(out);
      setMissing(failed); setTests(found); setSelected(new Set(found.filter(t => t.fillable).map(t => t.field)));
    } catch (e) { setError(e instanceof Error ? e.message : 'Lecture Nolio impossible.'); }
    finally { setBusy(false); }
  };

  const apply = () => {
    if (!tests || !onApply) return;
    const chosen = tests.filter(t => t.fillable && selected.has(t.field));
    const fields = Object.fromEntries(chosen.map(t => [t.field, String(t.value)])) as SnapshotRecordFields;
    const notes = `Tests trouvés dans Nolio (${from} → ${to}), meilleur résultat validé par le coach : ` +
      chosen.map(t => `${t.label} ${t.display} — ${t.sessionName} du ${t.date.slice(0, 10)}`).join(' ; ');
    onApply(fields, notes);
  };

  return <section className="space-y-3 rounded-md border border-border p-4">
    <div>
      <h3 className="font-semibold">Trouver les tests de la période</h3>
      <p className="text-sm text-muted-foreground">Analyse toutes les séances vélo et course. Pour chaque test, le meilleur résultat mesuré est proposé ; tu valides avant de remplir le snapshot.</p>
    </div>
    <Button onClick={run} disabled={busy || !athlete || !from || !to || from > to}><Search className="mr-2 h-4 w-4" />{busy ? progress || 'Lecture…' : 'Trouver les tests de la période'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {tests && <>
      {missing > 0 && <p role="alert" className="text-sm text-destructive">{missing} séance(s) illisibles : un meilleur résultat peut manquer.</p>}
      {tests.length === 0 && <p className="text-sm">Données insuffisantes : aucun test reconnu sur cette période.</p>}
      <ul className="divide-y divide-border">
        {tests.map(t => <li key={t.field} className="flex gap-3 py-3">
          <Checkbox aria-label={t.label} className="mt-1" disabled={!t.fillable} checked={selected.has(t.field)} onCheckedChange={c => setSelected(prev => { const n = new Set(prev); if (c === true) n.add(t.field); else n.delete(t.field); return n; })} />
          <div className="min-w-0 text-sm">
            <p className="font-medium">{t.label} : {t.display}</p>
            <p className="text-muted-foreground">{t.sessionName} · {t.date.slice(0, 10)} · {t.evidence}</p>
            {!t.fillable && <p className="text-muted-foreground">{t.field === 'test20min_w' ? 'Information : la FTP reste à saisir par le coach à partir de ce test.' : 'Information : à comparer dans le temps pour cet athlète et ce capteur ; pas converti en score d’économie.'}</p>}
            {t.alternatives.length > 0 && <p className="text-muted-foreground">Autres : {t.alternatives.map(a => `${a.display} (${a.date.slice(0, 10)})`).join(', ')}</p>}
          </div>
        </li>)}
      </ul>
      <p className="text-sm text-muted-foreground">Non remplis automatiquement : FTP, allure seuil, durée tenue au seuil et CSS — à saisir ou à confirmer par protocole.</p>
      {onApply && tests.length > 0 && <Button onClick={apply} disabled={!selected.size}>Remplir le snapshot avec les tests cochés</Button>}
    </>}
  </section>;
}
