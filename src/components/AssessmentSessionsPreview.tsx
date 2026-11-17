import { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildSportTestingNolioSessions, type NolioStepLike } from '@/lib/diagnostic/testingWeekNolioSessions';
import { buildCriticalSpeedNolioSessions } from '@/lib/diagnostic/criticalSpeedAssessment';

export function AssessmentSessionsPreview({ sport }: { sport: 'bike' | 'run' }) {
  const [start, setStart] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [mode, setMode] = useState('days');
  const sessions = useMemo(() => mode === 'critical' ? buildCriticalSpeedNolioSessions() : buildSportTestingNolioSessions(sport), [mode, sport]);
  const [selection, setSelection] = useState('0');
  const current = sessions[Number(selection)] ?? sessions[0];
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(start) && !Number.isNaN(new Date(`${start}T12:00:00`).getTime());
  const steps = current.structuredWorkout.flatMap(s => s.type === 'repetition' ? Array.from({ length: s.value }, () => s.steps).flat() : [s]);
  const duration = (s: NolioStepLike) => s.step_duration_type === 'distance' ? `${s.step_duration_value} m` : `${Math.floor(s.step_duration_value / 60)} min ${s.step_duration_value % 60 ? `${s.step_duration_value % 60} s` : ''}`;
  return <section aria-label="Séances de tests Nolio" className="space-y-4 border-y border-border py-5">
    <h2 className="text-lg font-semibold">Séances de tests · Nolio</h2>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Date du premier jour<Input aria-label="Date du premier jour de tests" type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
      {sport === 'run' && <Select value={mode} onValueChange={v => { setMode(v); setSelection('0'); }}><SelectTrigger aria-label="Parcours de tests"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="days">Days course</SelectItem><SelectItem value="critical">Vitesse critique · 3 efforts</SelectItem></SelectContent></Select>}
      <Select value={String(sessions.indexOf(current))} onValueChange={setSelection}><SelectTrigger aria-label="Séance de test"><SelectValue /></SelectTrigger><SelectContent>{sessions.map((s, i) => <SelectItem key={i} value={String(i)}>{s.title}</SelectItem>)}</SelectContent></Select>
    </div>
    <p className="text-sm font-medium">{current.title} · {validDate ? format(addDays(new Date(`${start}T12:00:00`), (current.weekNumber - 1) * 7 + current.dayIndex), 'dd/MM/yyyy') : 'Date à renseigner'}</p>
    <ol className="divide-y divide-border">{steps.map((s, i) => <li key={i} className="flex gap-3 py-2 text-sm"><span className="w-20 shrink-0 tabular-nums">{duration(s)}</span><span className="min-w-0 break-words">{s.notes}</span></li>)}</ol>
    {!steps.length && <p className="text-sm text-muted-foreground">Jour de repos et de vérification : aucune étape d’effort.</p>}
    <p className="text-sm text-muted-foreground">Préparation uniquement · l’envoi Nolio sécurisé et la récupération des tests réalisés restent à finaliser.</p>
  </section>;
}