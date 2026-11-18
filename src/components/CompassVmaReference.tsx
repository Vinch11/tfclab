import { assessVmaReference, getVmaReference, type VmaReference } from '@/lib/coachingCompass/vmaReference';

export function CompassVmaGauge({ reference, value }: { reference: VmaReference; value: number | null }) {
  const assessment = assessVmaReference(value, reference);
  const valid = value != null && Number.isFinite(value) && value > 0;
  const min = Math.max(0, Math.min(valid ? value : reference.low, reference.low) - 2);
  const max = Math.max(valid ? value : reference.high, reference.high) + 2;
  const x = (n: number) => 10 + 180 * (n - min) / (max - min);
  const tone = assessment.status === 'below' ? 'text-warning' : assessment.status === 'unavailable' ? 'text-muted-foreground' : 'text-success';
  return <svg viewBox="0 0 200 42" className={`w-full h-12 ${tone}`} role="img" aria-label={`Position VMA : ${valid ? `${value.toFixed(1)} km/h` : 'valeur manquante'}, repère ${reference.low.toFixed(1)} à ${reference.high.toFixed(1)} km/h. ${assessment.label}`}>
    <title>Position de la VMA du bilan face au scénario d’ambition ; pas un score de confiance</title>
    <path d="M 10 16 H 190" className="stroke-border" strokeWidth="6" strokeLinecap="round" />
    <path d={`M ${x(reference.low)} 16 H ${x(reference.high)}`} className="stroke-primary" strokeWidth="6" strokeLinecap="round" />
    {valid && <circle cx={x(value)} cy="16" r="5" fill="currentColor" className="stroke-background" strokeWidth="2" />}
    <text x={x(reference.low)} y="36" textAnchor="middle" className="fill-muted-foreground" fontSize="10">{reference.low.toFixed(1)}</text>
    <text x={x(reference.high)} y="36" textAnchor="middle" className="fill-muted-foreground" fontSize="10">{reference.high.toFixed(1)}</text>
  </svg>;
}

export function CompassVmaReference({ objective, ambition, value }: { objective: string; ambition: string; value: number | null }) {
  const reference = getVmaReference(objective, ambition);
  if (!reference) return null;
  const assessment = assessVmaReference(value, reference);
  return (
    <div className="mt-2 space-y-1" data-testid="compass-vma-reference">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <p><span className="text-muted-foreground">Actuel </span><strong>{value != null && Number.isFinite(value) && value > 0 ? `${value.toFixed(1)} km/h` : 'Données insuffisantes'}</strong></p>
        <p><span className="text-muted-foreground">Repère ambition </span><strong>{reference.low.toFixed(1)}–{reference.high.toFixed(1)} km/h</strong></p>
      </div>
      <CompassVmaGauge reference={reference} value={value} />
      <p className={`text-xs font-semibold ${assessment.status === 'below' ? 'text-warning' : assessment.status === 'unavailable' ? 'text-muted-foreground' : 'text-success'}`}>{assessment.label}</p>
      {assessment.status === 'below' && <p className="text-xs">Écart au bas du repère : <strong>{assessment.gapKmh?.toFixed(1)} km/h</strong>. Réserve de vitesse aérobie à développer ou ambition à réexaminer avec le coach, après vérification du test.</p>}
      {assessment.status === 'inside' && <p className="text-[10px] text-muted-foreground">VMA dans le repère choisi : pas de déficit de vitesse aérobie apparent. Examiner le seuil et l’endurance spécifique avant de choisir le chantier de préparation.</p>}
      {assessment.status === 'above' && <p className="text-[10px] text-muted-foreground">VMA au-dessus du repère choisi : la vitesse aérobie ne ressort pas comme frein dans cette comparaison. Cela ne garantit pas la performance visée.</p>}
      <p className="text-[10px] text-muted-foreground">Signal de coaching à confirmer : la fourchette est extrapolée, pas un seuil validé de réussite.</p>
      <details className="text-[10px] text-muted-foreground">
        <summary className="min-h-11 flex items-center cursor-pointer font-medium">Méthode et sources · extrapolation documentée</summary>
        <div className="space-y-2 pb-2">
          <p>{reference.context}</p>
          <p>{reference.method}</p>
          <p>{reference.limitation}</p>
          {reference.sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{source.title}</a> — {source.detail}</p>)}
        </div>
      </details>
    </div>
  );
}