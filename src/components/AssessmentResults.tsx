import type { DbSnapshot } from '@/hooks/useCloudData';
import { assessmentResults } from '@/lib/diagnostic/assessmentContract';
import { CheckCircle2, Circle } from 'lucide-react';

export function AssessmentResults({ snapshot, sport }: { snapshot: DbSnapshot; sport: 'bike' | 'run' }) {
  const results = assessmentResults(snapshot, sport);
  return <section aria-label="Résultats de l’évaluation" className="space-y-3 border-y border-border py-5">
    <h2 className="text-lg font-semibold">Votre évaluation · résultats disponibles</h2>
    <ul className="grid gap-x-6 sm:grid-cols-2">{results.map(r => <li key={r.key} className="flex gap-3 border-b border-border py-3">
      {r.available ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" /> : <Circle className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
      <div><p className="text-sm font-medium">{r.label}</p><p className="text-xs text-muted-foreground">{r.available ? `Disponible · ${r.kind === 'stored' ? 'bilan enregistré' : r.kind === 'tfcl' ? 'valeur TFCL' : 'repère complémentaire enregistré'}` : r.need}</p></div>
    </li>)}</ul>
  </section>;
}