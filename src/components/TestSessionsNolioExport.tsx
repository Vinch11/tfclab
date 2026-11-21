import { DurabilityObservation } from "./DurabilityObservation";
import { durabilitySession, separateDay } from "@/lib/diagnostic/durabilityDay";
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

import { openPrintableHTML } from "@/lib/openPrintableHTML";
import { compactSessions, type FieldModule } from "@/lib/diagnostic/compactFieldAssessment";

export type TestRoute = FieldModule | 'durability-run' | 'durability-bike' | 'track-day' | 'bike-day' | 'week-run' | 'week-bike' | 'critical';
const ROUTES: Record<TestRoute, { label: string; build: () => TestingWeekNolioSession[] }> = {
  'durability-run': {label:'Durabilité course', build: () => []},
  'durability-bike': {label:'Durabilité vélo', build: () => []},
  'cp-bike': {label:'Puissance critique vélo', build: () => compactSessions('cp-bike')},
  'cs-run': {label:'Vitesse critique course', build: () => compactSessions('cs-run')},
  'hold-bike': {label:'Tenue à puissance constante', build: () => compactSessions('hold-bike')},
  'hold-run': {label:'Tenue à allure constante', build: () => compactSessions('hold-run')},
  'trail-repeat': {label:'Montée de référence', build: () => compactSessions('trail-repeat')},
  'easy-run': {label:'Course continue confortable', build: () => compactSessions('easy-run')},
  'track-day': { label: 'TFCL Track Day™', build: () => [buildTrackDayNolioSession()] },
  'bike-day': { label: 'TFCL Bike Day™', build: () => [buildBikeDayNolioSession()] },
  'week-run': { label: 'Semaine de tests course', build: () => buildSportTestingNolioSessions('run') },
  'week-bike': { label: 'Semaine de tests vélo', build: () => buildSportTestingNolioSessions('bike') },
  critical: { label: 'Vitesse critique · 3 efforts', build: buildCriticalSpeedNolioSessions },
};
const offset = (s: TestingWeekNolioSession) => (s.weekNumber - 1) * 7 + s.dayIndex;

export function TestSessionsNolioExport({ routes, ftp, pace }: { routes: TestRoute[]; ftp?: number | null; pace?: number | null }) {
  const { currentAthlete } = useAthletes();
  const [route, setRoute] = useState<TestRoute>(routes[0]);
  const [start, setStart] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [holdMinutes, setHoldMinutes] = useState('20');
  const isHold = route === 'hold-bike' || route === 'hold-run';
  const [between, setBetween] = useState('45');
  const [targets, setTargets] = useState({bike:'', run:''});
  const sport = route === 'durability-bike' ? 'bike' : route === 'durability-run' ? 'run' : null;
  const sessions = useMemo(() => (sport ? durabilitySession(sport, Number(between), targets[sport]) : route === 'hold-bike' || route === 'hold-run'
    ? compactSessions(route, Number(holdMinutes), route === 'hold-bike' ? ftp : pace)
    : ROUTES[route].build()).filter(s => s.structuredWorkout.length > 0), [route, holdMinutes, ftp, pace, sport, between, targets]);
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

  function printSelected() {
    const doc = document.implementation.createHTMLDocument('Protocoles de terrain TFCL');
    const add = (parent: HTMLElement, tag: string, value: string) => {
      const element = doc.createElement(tag);
      element.textContent = value;
      parent.append(element);
      return element;
    };
    for (const [i, session] of sessions.entries()) {
      if (!picked.has(i)) continue;
      add(doc.body, 'h2', session.title + ' · ' + dateOf(session));
      add(doc.body, 'p', session.objectif);
      const list = add(doc.body, 'ol', '');
      flat(session).forEach(step => add(list, 'li', step.notes));
    }
    openPrintableHTML('<!doctype html>' + doc.documentElement.outerHTML, { filenameHint: 'Protocoles de terrain TFCL' });
  }

  return <section aria-label="Séances de tests Nolio" className="space-y-4 border-y border-border py-5">
    <h2 className="text-lg font-semibold">Séances structurées · Nolio</h2>
    <button type="button" disabled={!picked.size} onClick={printSelected} className="text-sm underline print:hidden">Imprimer les fiches sélectionnées</button>
    <div className="grid gap-3 sm:grid-cols-2 print:hidden">
      {routes.length > 1 && <Select value={route} onValueChange={v => setRoute(v as TestRoute)}><SelectTrigger aria-label="Parcours de tests" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{routes.map(r => <SelectItem key={r} value={r}>{ROUTES[r].label}</SelectItem>)}</SelectContent></Select>}
      {sport && <><p className="sm:col-span-2 text-sm">{separateDay} Choisir une cible facile déjà tolérée et la durée entre les deux blocs. Durée totale prévue : {40 + Number(between)} min.</p>
        <label>Cible des deux blocs ({sport === 'run' ? 'min/km' : 'W'})<Input value={targets[sport]} placeholder={sport === 'run' ? '5:30' : '180'} onChange={e=>setTargets({...targets,[sport]:e.target.value})} /></label>
        <label>Endurance entre les blocs (min)<Input type="number" min="1" max="300" value={between} onChange={e=>setBetween(e.target.value)} /></label></>}
      {isHold && <label className="text-sm">Durée prévisible et tolérée du bloc (min)<Input type="number" min="1" max="120" value={holdMinutes} onChange={e => setHoldMinutes(e.target.value)} /></label>}
      <label className="text-sm">{sessions.length > 1 ? 'Date du premier jour' : 'Date du test'}<Input aria-label="Date du premier jour de tests" type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
    </div>
    {sport && currentAthlete && <DurabilityObservation key={currentAthlete.id+sport} athleteId={currentAthlete.id} sport={sport} between={Number(between)} target={targets[sport]} />}
    <ul className="divide-y divide-border">{sessions.map((s, i) => <li key={i} className={picked.has(i) ? "py-2" : "py-2 print:hidden"}>
      <div className="flex items-center gap-3"><Checkbox aria-label={`Inclure ${s.title}`} checked={picked.has(i)} onCheckedChange={v => setPicked(p => { const n = new Set(p); v ? n.add(i) : n.delete(i); return n; })} />
        <button type="button" className="flex-1 text-left text-sm min-h-11" onClick={() => setOpen(open === i ? null : i)}><span className="font-medium">{s.title}</span> <span className="text-muted-foreground">· {dateOf(s)}{flat(s).every(x=>x.step_duration_type === 'duration') && ' · ' + Math.round(flat(s).reduce((n,x)=>n+x.step_duration_value,0)/60) + ' min'}</span></button></div>
      <div className={open === i ? "" : "hidden print:block"}><p className="mt-2 text-sm whitespace-pre-line">{s.objectif}</p><ol className="ml-3 mt-4 space-y-3 border-l-2 border-primary/25 pl-4">{flat(s).map((x, k) => <li key={k} className="grid gap-1 rounded-xl bg-muted/50 p-3 text-sm sm:grid-cols-[5rem_1fr]"><span className="font-semibold tabular-nums text-foreground">{dur(x)}</span><span>{x.notes}</span></li>)}</ol></div>
    </li>)}</ul>
    {!nolioId && currentAthlete && <p className="text-sm text-muted-foreground">{currentAthlete.nom} n’est pas relié à un compte Nolio : envoi indisponible.</p>}
    <Button onClick={send} disabled={!nolioId || !validDate || !picked.size || sending} className="min-h-11 gap-2">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Envoyer {picked.size} séance(s) vers Nolio</Button>
  </section>;
}
