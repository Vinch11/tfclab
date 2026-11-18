import { getVmaReference } from '@/lib/coachingCompass/vmaReference';

export function CompassVmaReference({ objective, ambition, value }: { objective: string; ambition: string; value: number | null }) {
  const reference = getVmaReference(objective, ambition);
  if (!reference) return null;
  return (
    <div className="mt-2 space-y-1" data-testid="compass-vma-reference">
      <p className="text-xs font-semibold">Fourchette VMA de référence · {reference.low.toFixed(1)}–{reference.high.toFixed(1)} km/h</p>
      <p className="text-[10px] text-muted-foreground">{reference.context}</p>
      {value != null && value > 0 && <p className="text-[10px] text-muted-foreground">VMA du bilan : {value.toFixed(1)} km/h · comparaison indicative, aucun déficit conclu automatiquement.</p>}
      <details className="text-[10px] text-muted-foreground">
        <summary className="min-h-11 flex items-center cursor-pointer font-medium">Méthode et sources · extrapolation documentée</summary>
        <div className="space-y-2 pb-2">
          <p>{reference.method}</p>
          <p>{reference.limitation}</p>
          {reference.sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{source.title}</a> — {source.detail}</p>)}
        </div>
      </details>
    </div>
  );
}