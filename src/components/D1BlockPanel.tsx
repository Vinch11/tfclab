import { useState } from 'react';
import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
import { generateD1Block } from '@/lib/plan/d1/generateBlock';
import { Button } from '@/components/ui/button';

type Result = ReturnType<typeof generateD1Block>;
export default function D1BlockPanel({ athlete, config }: { athlete: PlanAthleteData; config: PlanConfig }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  return <section className="rounded-lg border p-4 space-y-3" aria-label="Bloc déterministe D1">
    <h2>Bloc déterministe D1 · 4 semaines</h2>
    <p>70.3 confirmé / age_group. Revue coach requise. Aucune séance autorisée à la prescription individuelle.</p>
    <Button onClick={() => {
      setError(''); setResult(null); setNotes('');
      try { setResult(generateD1Block(athlete, config)); }
      catch (e) { setError(e instanceof Error ? e.message : 'D1_GENERATION_FAILED'); }
    }}>Générer le bloc sans IA</Button>
    {error && <p role="alert">Refus : {error}</p>}
    {result && <>
      <p role="status">{result.status === 'refused' ? `Refus : ${result.reason}` :
        result.constraintsSatisfied ? 'Candidat assemblé · prescription non attestée' : 'Candidat bloqué par les contrôles existants'}</p>
      <p>Limiteurs : {result.limiterPriorities.join(', ') || 'inconnus'}</p>
      <ul>{result.issues.map((issue, index) => <li key={index}>{issue.severity} · {issue.code} · {issue.message}</li>)}</ul>
      {result.candidate?.weeks.map(week => <section key={week.weekNumber}>
        <h3>Semaine {week.weekNumber} · {week.phase}</h3>
        {Array.from({ length: 7 }, (_, dayIndex) => <div key={dayIndex} data-testid="d1-day" className="border p-2">
          <strong>Jour {(week.weekNumber - 1) * 7 + dayIndex + 1}</strong>
          {week.sessions.filter(s => s.dayIndex === dayIndex).map((s, index) => <article key={index}>
            <p>{s.title} · {s.durationMin ?? 'durée inconnue'} min · {s.zones?.join(', ')}</p>
            <pre className="whitespace-pre-wrap">{s.details}</pre>
            <p>{result.trace.find(t => t.week === week.weekNumber && t.id === s.catalogId)?.reason}</p>
          </article>)}
          {!week.sessions.some(s => s.dayIndex === dayIndex) && <p role="alert">Jour absent du moteur · bloc incomplet</p>}
        </div>)}
      </section>)}
      <label className="block">Notes de revue coach
        <textarea aria-label="Notes de revue coach" className="block w-full border" value={notes} onChange={e => setNotes(e.target.value)} />
      </label>
      <Button disabled>Sauvegarde indisponible : environnement de test autorisé non configuré</Button>
      <p>Persistance et réouverture indépendante : NON TESTÉES. Les notes sont locales à cette vue.</p>
    </>}
  </section>;
}
