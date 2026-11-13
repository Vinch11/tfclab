import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { detectPeriodTests, TEST_DAY_GROUPS, type DetectedTest, type DetectionSession } from '@/lib/periodTestDetection';
import type { SnapshotRecordFields } from '@/lib/nolioV2Records';

type Props = {
  /** Athlète Nolio imposé (ancien écran) ; sinon choisi ici, présélectionné par nom. */
  athlete?: string; from?: string; to?: string; athleteName?: string;
  /** Valeurs déjà saisies : jamais remplacées automatiquement. */
  current?: Record<string, unknown>;
  onApply?: (fields: SnapshotRecordFields, notes: string) => void;
};
type ListedSession = { id: string; name: string; date: string; sportBase: 'cycling' | 'running' };
type Lap = { duration?: number; stats?: { watts_avg?: { value?: number }; heartrate_max?: { value?: number } } };

async function call(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke('nolio-v2-oauth', { body });
  if (error) throw new Error('Lecture Nolio impossible.');
  return data;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const BADGE: Record<DetectedTest['confidence'], [string, 'default' | 'secondary' | 'outline']> = {
  measured: ['Test retrouvé', 'default'], check: ['À vérifier', 'secondary'], info: ['Information', 'outline'],
};

export function NolioPeriodTestFinder({ athlete: fixedAthlete, from: fixedFrom, to: fixedTo, athleteName, current = {}, onApply }: Props) {
  const [athletes, setAthletes] = useState<Array<{ id: string; name: string; has_api_access: boolean }> | null>(null);
  const [athlete, setAthlete] = useState(fixedAthlete ?? '');
  const [from, setFrom] = useState(fixedFrom ?? iso(new Date(Date.now() - 35 * 864e5)));
  const [to, setTo] = useState(fixedTo ?? iso(new Date()));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<DetectedTest[] | null>(null);
  const [missing, setMissing] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (fixedAthlete) return;
    call({ action: 'catalogues' }).then(d => {
      const list = (d?.athletes ?? []) as Array<{ id: string; name: string; has_api_access: boolean }>;
      setAthletes(list);
      if (athleteName) {
        const match = list.find(a => a.has_api_access && norm(a.name) === norm(athleteName))
          ?? list.find(a => a.has_api_access && norm(a.name).includes(norm(athleteName).split(' ')[0]));
        if (match) setAthlete(match.id);
      }
    }).catch(() => setError('Connexion Nolio indisponible.'));
  }, [fixedAthlete, athleteName]);

  const hasValue = (field: string) => String(current[field] ?? '').trim() !== '';

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
            const laps = await call({ action: 'test_session', athlete, training: s.id, from, to }).catch(() => null);
            if (s.sportBase === 'running') out.push({ ...s, laps: laps?.laps ?? [] });
            else {
              const r = await call({ action: 'protocol_session', athlete, training: s.id, from, to });
              const bikeLaps = ((laps?.laps ?? []) as Lap[]).map(x => ({ duration: x.duration, watts: x.stats?.watts_avg?.value, hrMax: x.stats?.heartrate_max?.value }));
              out.push({ ...s, bikeLaps, time: r?.streams?.stream_time, watts: r?.streams?.stream_watts ?? r?.streams?.stream_power });
            }
          } catch { failed++; }
          setProgress(`${++done}/${sessions.length} séances analysées…`);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      const ftpW = Number(String(current.ftp ?? '').replace(',', '.'));
      const pace = String(current.pace_threshold ?? '').match(/^(\d+):(\d{1,2})/);
      const thresholdKmh = pace ? 3600 / (Number(pace[1]) * 60 + Number(pace[2])) : null;
      const found = detectPeriodTests(out, { ftpW: ftpW > 0 ? ftpW : null, thresholdKmh });
      setMissing(failed); setTests(found);
      setValues(Object.fromEntries(found.map(t => [t.field, String(t.value)])));
      setSelected(new Set(found.filter(t => t.fillable && !hasValue(t.field)).map(t => t.field)));
    } catch (e) { setError(e instanceof Error ? e.message : 'Lecture Nolio impossible.'); }
    finally { setBusy(false); }
  };

  const apply = () => {
    if (!tests || !onApply) return;
    const chosen = tests.filter(t => t.fillable && selected.has(t.field) && values[t.field]?.trim());
    const fields = Object.fromEntries(chosen.map(t => [t.field, values[t.field].trim()])) as SnapshotRecordFields;
    const notes = `Nolio ${from} → ${to}, validé par le coach : ` + chosen.map(t => {
      const edited = values[t.field].trim() !== String(t.value);
      return `${t.label} ${values[t.field]} ${t.unit}${edited ? ' (corrigé par le coach)' : ''}${t.confidence === 'check' ? ' [à vérifier]' : ''} — ${t.sessionName} du ${t.date.slice(0, 10)}`;
    }).join(' ; ');
    onApply(fields, notes);
  };

  const byField = new Map((tests ?? []).map(t => [t.field, t]));
  const count = [...selected].length;

  return <section className="space-y-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
    <div>
      <h3 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" />Remplir depuis Nolio</h3>
      <p className="text-sm text-muted-foreground">Choisis la période des tests : toutes les séances vélo et course sont analysées, le meilleur résultat est proposé pour chaque test.</p>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>div]:min-w-0">
      {!fixedAthlete && <div className="sm:col-span-2"><Label htmlFor="fill-athlete">Athlète Nolio</Label>
        <select id="fill-athlete" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={athlete} disabled={busy || !athletes} onChange={e => { setAthlete(e.target.value); setTests(null); }}>
          <option value="">{athletes ? 'Choisir un athlète' : 'Chargement…'}</option>
          {athletes?.map(a => <option key={a.id} value={a.id} disabled={!a.has_api_access}>{a.name}</option>)}
        </select></div>}
      {!fixedFrom && <div><Label htmlFor="fill-from">Du</Label><Input id="fill-from" type="date" value={from} max={to} disabled={busy} onChange={e => { setFrom(e.target.value); setTests(null); }} /></div>}
      {!fixedTo && <div><Label htmlFor="fill-to">Au (inclus)</Label><Input id="fill-to" type="date" value={to} min={from} disabled={busy} onChange={e => { setTo(e.target.value); setTests(null); }} /></div>}
    </div>
    <Button className="h-auto min-h-11 max-w-full whitespace-normal" onClick={run} disabled={busy || !athlete || !from || !to || from > to}>{busy ? progress || 'Lecture…' : 'Trouver les tests de la période'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

    {tests && <div className="space-y-4">
      {missing > 0 && <p role="alert" className="text-sm text-destructive">{missing} séance(s) illisibles : un meilleur résultat peut manquer.</p>}
      {tests.length === 0 && <p className="text-sm">Données insuffisantes : aucun test reconnu sur cette période.</p>}
      {TEST_DAY_GROUPS.map(group => {
        const rows = group.fields.map(f => byField.get(f)).filter((t): t is DetectedTest => !!t);
        const absent = group.fields.filter(f => !byField.has(f) && f !== 'run_power_cost' && f !== 'test20min_w');
        return <div key={group.title} className="rounded-md border border-border bg-background">
          <p className="border-b border-border px-3 py-2 text-sm font-semibold">{group.title}</p>
          <ul className="divide-y divide-border">
            {rows.map(t => {
              const filled = hasValue(t.field);
              return <li key={t.field} className="flex gap-3 p-3">
                {t.fillable ? <Checkbox aria-label={t.label} className="mt-3" checked={selected.has(t.field)} disabled={filled}
                  onCheckedChange={c => setSelected(prev => { const n = new Set(prev); if (c === true) n.add(t.field); else n.delete(t.field); return n; })} /> : <span className="w-4" />}
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{t.label}</span><Badge variant={BADGE[t.confidence][1]}>{BADGE[t.confidence][0]}</Badge></div>
                  {t.fillable
                    ? <div className="flex items-center gap-2"><Input aria-label={`Valeur ${t.label}`} className="h-11 w-28" inputMode="decimal" value={values[t.field] ?? ''} disabled={filled} onChange={e => setValues(v => ({ ...v, [t.field]: e.target.value }))} /><span className="text-muted-foreground">{t.unit}</span></div>
                    : <p className="font-medium">{t.display}</p>}
                  <p className="text-muted-foreground">{t.sessionName} · {t.date.slice(0, 10)} · {t.evidence}</p>
                  {filled && <p className="text-muted-foreground">Déjà rempli dans le snapshot ({String(current[t.field])}) : non remplacé.</p>}
                  {t.alternatives.length > 0 && t.fillable && !filled && <div className="flex flex-wrap gap-2">
                    <span className="text-muted-foreground">Autres séances :</span>
                    {t.alternatives.map(a => <button key={a.date + a.display} type="button" className="min-h-8 rounded-md border border-input px-2 text-xs hover:bg-accent" onClick={() => setValues(v => ({ ...v, [t.field]: String(a.value) }))}>{a.display} · {a.date.slice(5, 10)}</button>)}
                  </div>}
                </div>
              </li>;
            })}
            {absent.map(f => <li key={f} className="p-3 text-sm text-muted-foreground">{({ pmax_5s: 'Sprint vélo 5 s', p30s_w: 'Vélo 30 s', p60s_w: 'Vélo 60 s', sprint_15s: 'Sprint course 15 s (faire un tour de montre par sprint)', map5min_w: 'Vélo 5 min', vma: 'VMA (effort continu de 5 à 7 min)', ftp: 'FTP (aucun test de 20 min trouvé)', run_hr_drift_pct: 'Dérive cardiaque (aucune sortie régulière de 40 min et plus)', fc_max: 'FC max' } as Record<string, string>)[f]} : non trouvé sur la période.</li>)}
          </ul>
        </div>;
      })}
      <p className="text-sm text-muted-foreground">Toujours à saisir : allure seuil, durée tenue au seuil et natation (CSS).</p>
      {onApply && tests.length > 0 && <Button className="min-h-11" onClick={apply} disabled={!count}>Remplir le snapshot ({count} valeur{count > 1 ? 's' : ''})</Button>}
    </div>}
  </section>;
}
