import type { RunningCompassDiagnostic } from '@/engines/diagnostic';

export function RunningCompassDiagnosis({ diagnostic, sport = 'run' }: { diagnostic: RunningCompassDiagnostic; sport?: 'run' | 'bike' }) {
  const label = sport === 'bike' ? 'vélo' : 'course';
  return <div className="mt-4 border-t border-border pt-3 space-y-3 text-xs" data-testid={`${sport === 'bike' ? 'cycling' : 'running'}-compass-diagnostic`}>
    <h4 className="text-sm font-semibold">Diagnostic {label}</h4>
    <p>{diagnostic.summary}</p>
    <section className="space-y-2">
      <h5 className="font-semibold">Priorités {label} — écarts aux cibles</h5>
      {diagnostic.priorities.length ? <ol className="space-y-3">{diagnostic.priorities.map((priority, index) => <li key={priority.key}>
        <p className="font-medium">{index + 1}. {priority.label} · écart {priority.gapPercent.toFixed(0)} %{priority.provisional ? ' · à confirmer' : ' · test déclaré'}</p>
        <p className="mt-1 text-muted-foreground leading-relaxed">{priority.explanation}</p>
        <p className="mt-1">Piste de travail : {priority.lever}</p>
      </li>)}</ol> : <p className="text-muted-foreground">Classement non établi sur les données disponibles.</p>}
    </section>
    <section className="space-y-1"><h5 className="font-semibold">Observations {label}</h5>{diagnostic.observations.map(text => <p key={text} className="text-muted-foreground leading-relaxed">{text}</p>)}</section>
    <section className="space-y-1"><h5 className="font-semibold">Limites du diagnostic</h5>{diagnostic.limitations.map(text => <p key={text} className="text-muted-foreground leading-relaxed">{text}</p>)}</section>
  </div>;
}