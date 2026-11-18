import { assessVmaReference, getVmaReference } from '@/lib/coachingCompass/vmaReference';
import { buildVmaEvidence, computeFactorVerdict } from '@/lib/coachingCompass/factorVerdict';

export function CompassVmaReference({ objective, ambition, value, paceThresholdSecPerKm = null }: { objective: string; ambition: string; value: number | null; paceThresholdSecPerKm?: number | null }) {
  const reference = getVmaReference(objective, ambition);
  if (!reference) return null;
  const assessment = assessVmaReference(value, reference);
  const verdict = computeFactorVerdict(buildVmaEvidence({ vma: value, paceThresholdSecPerKm, reference, isTriathlon: /IM|Ironman|70|703|tri/i.test(objective) }));
  return (
    <div className="mt-2 space-y-1" data-testid="compass-vma-reference">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
        <p><span className="text-muted-foreground">Actuel </span><strong>{value != null && Number.isFinite(value) && value > 0 ? `${value.toFixed(1)} km/h` : 'Données insuffisantes'}</strong></p>
        <p><span className="text-muted-foreground">Repère ambition </span><strong>{reference.low.toFixed(1)}–{reference.high.toFixed(1)} km/h</strong></p>
      </div>
      {assessment.status === 'below' && <p className="text-xs text-warning">Écart au repère : <strong>{assessment.gapKmh?.toFixed(1)} km/h à développer</strong>.</p>}
      {assessment.status === 'inside' && <p className="text-[10px] text-muted-foreground">VMA dans le repère choisi : pas de déficit de vitesse aérobie apparent. Examiner le seuil et l’endurance spécifique avant de choisir le chantier de préparation.</p>}
      {assessment.status === 'above' && <p className="text-[10px] text-muted-foreground">VMA au-dessus du repère choisi : la vitesse aérobie ne ressort pas comme frein dans cette comparaison. Cela ne garantit pas la performance visée.</p>}
      <details className="text-xs" data-testid="compass-vma-verdict">
        <summary className="min-h-11 flex items-center cursor-pointer"><span className="text-muted-foreground mr-1">Verdict croisé :</span><strong className={verdict.kind === 'probable_limiter' ? 'text-warning' : ''}>{verdict.label}</strong></summary>
        <ul className="space-y-1 pb-2 text-[10px] text-muted-foreground">
          {verdict.evidence.map(e => <li key={e.key}><span className="font-medium text-foreground">{e.status === 'deficit' ? '▲' : e.status === 'ok' ? '✓' : '?'} {e.label}</span> — {e.detail}</li>)}
          <li>« Limitant probable » exige au moins deux indices concordants ; un seul indice reste à confirmer.</li>
        </ul>
      </details>
      <details className="text-[10px] text-muted-foreground">
        <summary className="min-h-11 flex items-center cursor-pointer font-medium">Méthode et sources · extrapolation documentée</summary>
        <div className="space-y-2 pb-2">
          <p>Signal de coaching à confirmer : la fourchette est extrapolée, pas un seuil validé de réussite. Vérifier le test avant de réexaminer l’ambition ou la préparation.</p>
          <p>{reference.context}</p>
          <p>{reference.method}</p>
          <p>{reference.limitation}</p>
          {reference.sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{source.title}</a> — {source.detail}</p>)}
        </div>
      </details>
    </div>
  );
}