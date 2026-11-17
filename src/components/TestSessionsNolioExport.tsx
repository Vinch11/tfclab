import { useEffect, useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAthletes } from '@/contexts/AthleteContext';
import { buildSportTestingNolioSessions, type NolioStepLike, type TestingWeekNolioSession } from '@/lib/diagnostic/testingWeekNolioSessions';
import { buildCriticalSpeedNolioSessions } from '@/lib/diagnostic/criticalSpeedAssessment';
import { buildTrackDayNolioSession, buildBikeDayNolioSession } from '@/lib/diagnostic/dayTestNolioSessions';

export type TestRoute = 'track-day' | 'bike-day' | 'week-run' | 'week-bike' | 'critical';
const ROUTES: Record<TestRoute, { label: string; build: () => TestingWeekNolioSession[] }> = {
  'track-day': { label: 'TFCL Track Day™', build: () => [buildTrackDayNolioSession()] },
  'bike-day': { label: 'TFCL Bike Day™', build: () => [buildBikeDayNolioSession()] },
  'week-run': { label: 'Semaine de tests course', build: () => buildSportTestingNolioSessions('run') },
  'week-bike': { label: 'Semaine de tests vélo', build: () => buildSportTestingNolioSessions('bike') },
  critical: { label: 'Vitesse critique · 3 efforts', build: buildCriticalSpeedNolioSessions },
};
const offset = (s: TestingWeekNolioSession) => (s.weekNumber - 1) * 7 + s.dayIndex;

export function TestSessionsNolioExport({ routes }: { routes: TestRoute[] }) {
  const { currentAthlete } = useAthletes();
  const [route, setRoute] = useState<TestRoute>(routes[0]);
  const [start, setStart] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const sessions = useMemo(() => ROUTES[route].build().filter(s => s.structuredWorkout.length > 0), [route]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const [nolioId, setNolioId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  useEffect(() => { setPicked(new Set(sessions.map((_, i) => i))); setOpen(sessions.length === 1 ? 0 : null); }, [sessions]);
  useEffect(() => {
    setNolioId(null);
    if (!currentAthlete?.id) return;
    let alive = true;
    supabase.from('athletes').select('nolio_id').eq('id', currentAthlete.id).maybeSingle().then(({ data }) => {
      if (alive) setNolioId(typeof data?.nolio_id === 'number' ? data.nolio_id : null);
    });
    return () => { alive = false; };
  }, [currentAthlete?.id]);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(start);
  const dateOf = (s: TestingWeekNolioSession) => validDate ? format(addDays(new Date(`${start}T12:00:00`), offset(s)), 'dd/MM/yyyy') : '—';
  const flat = (s: TestingWeekNolioSession) => s.structuredWorkout.flatMap(x => x.type === 'repetition' ? Array.from({ length: x.value }, () => x.steps).flat() : [x]);
  const dur = (s: NolioStepLike) => s.step_duration_type === 'distance' ? `${s.step_duration_value} m` : s.step_duration_value < 60 ? `${s.step_duration_value} s` : `${Math.round(s.step_duration_value / 60)} min`;

  async function send() {
    if (!currentAthlete || !nolioId || !validDate) return;
    const chosen = sessions.filter((_, i) => picked.has(i));
    if (!window.confirm(`Envoyer ${chosen.length} séance(s) de tests vers Nolio pour ${currentAthlete.nom}, à partir du ${dateOf(chosen[0])} ? Les séances de plan déjà présentes ne sont pas touchées.`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('nolio-send-plan', { body: { kind: 'test', athlete_id: currentAthlete.id, nolio_athlete_id: nolioId, planStartDate: start, sessions: chosen } });
      if (error) throw error;
      const sent = data?.sent ?? 0, errs = (data?.errors ?? []) as { status: number; detail?: string }[];
      if (sent && !errs.length) toast.success(`${sent} séance(s) de tests envoyée(s) vers Nolio`);
      else if (sent) toast.warning(`${sent} envoyée(s), ${errs.length} échec(s)`);
      else toast.error(`Aucune séance envoyée${errs[0] ? ` — ${errs[0].status} ${errs[0].detail ?? ''}` : ''}`.slice(0, 200));
    } catch (e) { toast.error(`Erreur Nolio : ${(e as Error).message}`); } finally { setSending(false); }
  }

  return <section aria-label="Séances de tests Nolio" className="space-y-4 border-y border-border py-5">
    <h2 className="text-lg font-semibold">Séances structurées · Nolio</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      {routes.length > 1 && <Select value={route} onValueChange={v => setRoute(v as TestRoute)}><SelectTrigger aria-label="Parcours de tests" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{routes.map(r => <SelectItem key={r} value={r}>{ROUTES[r].label}</SelectItem>)}</SelectContent></Select>}
      <label className="text-sm">{sessions.length > 1 ? 'Date du premier jour' : 'Date du test'}<Input aria-label="Date du premier jour de tests" type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
    </div>
    <ul className="divide-y divide-border">{sessions.map((s, i) => <li key={i} className="py-2">
      <div className="flex items-center gap-3"><Checkbox aria-label={`Inclure ${s.title}`} checked={picked.has(i)} onCheckedChange={v => setPicked(p => { const n = new Set(p); v ? n.add(i) : n.delete(i); return n; })} />
        <button type="button" className="flex-1 text-left text-sm min-h-11" onClick={() => setOpen(open === i ? null : i)}><span className="font-medium">{s.title}</span> <span className="text-muted-foreground">· {dateOf(s)}</span></button></div>
      {open === i && <ol className="ml-8 mt-1 space-y-1">{flat(s).map((x, k) => <li key={k} className="flex gap-3 text-sm"><span className="w-16 shrink-0 tabular-nums text-muted-foreground">{dur(x)}</span><span>{x.notes}</span></li>)}</ol>}
    </li>)}</ul>
    {!nolioId && currentAthlete && <p className="text-sm text-muted-foreground">{currentAthlete.nom} n’est pas relié à un compte Nolio : envoi indisponible.</p>}
    <Button onClick={send} disabled={!nolioId || !validDate || !picked.size || sending} className="min-h-11 gap-2">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Envoyer {picked.size} séance(s) vers Nolio</Button>
  </section>;
}
