import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { durabilityReading, sessionDurability, summarizeDurability, type DurabilitySession, type DurabilitySport, type StoredDurability, type StoredDurabilitySport } from '@/lib/durability/longSessionDurability';

async function call(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke('nolio-v2-oauth', { body });
  if (error || data?.error) throw new Error('Lecture Nolio impossible.');
  return data;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const LABEL: Record<DurabilitySport, string> = { bike: 'Vélo', run: 'Course à pied' };
const MAX_READS = 15;

export function NolioDurabilityFinder({ athleteName, stored, onSave }: { athleteName?: string; stored: StoredDurability; onSave: (sport: DurabilitySport, value: StoredDurabilitySport) => void }) {
  const [athletes, setAthletes] = useState<Array<{ id: string; name: string; has_api_access: boolean }>>([]);
  const [athlete, setAthlete] = useState('');
  const [from, setFrom] = useState(iso(new Date(Date.now() - 90 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Partial<Record<DurabilitySport, DurabilitySession[]>> | null>(null);

  useEffect(() => {
    call({ action: 'catalogues' }).then(d => {
      const list = (d?.athletes ?? []) as typeof athletes;
      setAthletes(list);
      if (athleteName) { const m = list.find(a => a.has_api_access && norm(a.name) === norm(athleteName)); if (m) setAthlete(m.id); }
    }).catch(() => setError('Connexion Nolio indisponible.'));
  }, [athleteName]);

  const run = async () => {
    setBusy(true); setError(null); setFound(null);
    try {
      const list = await call({ action: 'test_sessions', athlete, from, to });
      const sessions = (list.sessions ?? []) as Array<{ id: string; name: string; date: string; sportBase: 'cycling' | 'running' }>;
      const out: Partial<Record<DurabilitySport, DurabilitySession[]>> = {};
      for (const sport of ['bike', 'run'] as const) {
        const pick = sessions.filter(s => s.sportBase === (sport === 'bike' ? 'cycling' : 'running')).sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_READS);
        const res: DurabilitySession[] = [];
        for (const [i, s] of pick.entries()) {
          setProgress(`${LABEL[sport]} : séance ${i + 1}/${pick.length}`);
          const r = await call({ action: 'protocol_session', athlete, training: s.id, from, to });
          const st = r?.streams ?? {};
          const value = sport === 'bike' ? (st.stream_watts ?? st.stream_power) : (st.stream_speed ?? st.stream_velocity);
          const d = sessionDurability(sport, { id: s.id, date: s.date.slice(0, 10), name: s.name }, st.stream_time, value);
          if (d) res.push(d);
        }
        out[sport] = res;
      }
      setFound(out);
    } catch { setError('Lecture Nolio interrompue : rien n’a été calculé.'); }
    finally { setBusy(false); setProgress(''); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2"><Timer className="h-4 w-4 shrink-0 text-primary" /><h3 className="font-semibold">Durabilité sur sorties longues</h3><Badge variant="secondary">À vérifier</Badge></div>
      <p className="text-sm text-muted-foreground">Compare ton meilleur effort de 20 min en début de séance et dans le dernier tiers, sur les sorties d’au moins 2 h à vélo ou 1 h 30 en course. Moyenne sur au moins 2 séances. Ne change ni les limiteurs ni les plans.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 [&>div]:min-w-0">
        <div className="sm:col-span-2"><Label>Athlète Nolio</Label><select className="w-full h-11 rounded-md border border-input bg-background px-2 text-sm" value={athlete} onChange={e => setAthlete(e.target.value)}><option value="">Choisir…</option>{athletes.filter(a => a.has_api_access).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div><Label>Du</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>Au</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>
      <Button className="h-auto min-h-11 max-w-full whitespace-normal" onClick={run} disabled={!athlete || busy}>{busy ? progress || 'Lecture…' : 'Calculer la durabilité'}</Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {found && (['bike', 'run'] as const).map(sport => {
        const list = found[sport] ?? [];
        const summary = summarizeDurability(sport, list, from, to, new Date().toISOString());
        return (
          <div key={sport} className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
            <div className="font-medium">{LABEL[sport]} — {list.length} sortie(s) longue(s) exploitable(s)</div>
            {list.map(s => <div key={s.id} className="text-muted-foreground">{s.date} · {s.name} · {s.durationMin} min · {s.changePct > 0 ? '+' : ''}{s.changePct.toLocaleString('fr-FR')} %</div>)}
            {summary ? <>
              <p>{durabilityReading(sport, summary)}</p>
              <Button size="sm" variant="outline" disabled={Boolean(stored[sport] && stored[sport]!.savedAt === summary.savedAt)} onClick={() => onSave(sport, summary)}>Enregistrer dans le bilan (à vérifier)</Button>
            </> : <p className="text-muted-foreground">Données insuffisantes : il faut au moins 2 sorties longues avec relevés seconde par seconde.</p>}
          </div>
        );
      })}
      {(['bike', 'run'] as const).map(sp => stored[sp] && <p key={sp} className="text-xs text-muted-foreground">Déjà enregistré · {LABEL[sp]} : {stored[sp]!.meanChangePct.toLocaleString('fr-FR')} % sur {stored[sp]!.sessions.length} séances ({stored[sp]!.from} → {stored[sp]!.to}).</p>)}
    </div>
  );
}
