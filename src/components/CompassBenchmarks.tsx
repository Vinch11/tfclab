import { BENCHMARK_LIMITATION, type CompassBenchmark } from '@/lib/coachingCompass/benchmarks';

export function CompassBenchmarks({ rows }: { rows: CompassBenchmark[] }) {
  return <section className="mt-4 border-t border-border pt-4" data-testid="compass-benchmarks">
    <h3 className="text-sm font-semibold">Références externes — hors score</h3>
    <p className="mt-1 text-xs text-muted-foreground">Cohortes sportives et normes âge/sexe ne certifient ni un niveau ni une performance en course.</p>
    {(['sport', 'population'] as const).map(kind => <div key={kind} className="mt-3">
      <h4 className="text-xs font-semibold">{kind === 'sport' ? 'Cohortes sportives' : 'Normes âge et sexe'}</h4>
      {rows.filter(r => r.kind === kind).map(r => <div key={r.sport} className="border-b border-border py-3 text-xs space-y-1">
        <p className="font-medium">{r.sport === 'run' ? 'Course' : 'Vélo'} · {r.label}</p>
        <div className="grid grid-cols-2 gap-2"><p>Valeur : {r.value ?? 'Données insuffisantes'}{r.value != null && ' ml/kg/min'}</p><p>Cible TFCL : {r.target ?? 'Non disponible'}{r.target != null && ' ml/kg/min'}</p></div>
        <p className="font-medium">{r.reference}</p><p>{r.context}</p>
        <p className="text-muted-foreground">{r.limitation}</p>
        <a className="inline-block min-h-11 py-3 text-primary underline break-words" href={r.url} target="_blank" rel="noopener noreferrer">{r.source}</a>
      </div>)}
    </div>)}
    <p className="mt-3 text-xs text-muted-foreground">{BENCHMARK_LIMITATION}</p>
  </section>;
}