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
        <p><span className="text-muted-foreground">Scénario ambition · extrapolé </span><strong>{reference.low.toFixed(1)}–{reference.high.toFixed(1)} km/h</strong></p>
      </div>
      {assessment.status === 'below' && <p className="text-xs text-warning">Écart au bas du scénario : <strong>−{assessment.gapKmh?.toFixed(1)} km/h</strong> · hypothèse à vérifier, pas une dose à prescrire.</p>}
      {assessment.status === 'inside' && <p className="text-[10px] text-muted-foreground">VMA dans le repère choisi : pas de déficit de vitesse aérobie apparent. Examiner le seuil et l’endurance spécifique avant de choisir le chantier de préparation.</p>}
      {assessment.status === 'above' && <p className="text-[10px] text-muted-foreground">VMA au-dessus du repère choisi : la vitesse aérobie ne ressort pas comme frein dans cette comparaison. Cela ne garantit pas la performance visée.</p>}
      <details className="text-xs" data-testid="compass-vma-verdict">
        <summary className="min-h-11 flex flex-wrap items-center gap-x-1 cursor-pointer"><span className="text-muted-foreground">Hypothèse de lecture :</span><strong className={verdict.kind === 'probable_limiter' ? 'text-warning' : ''}>{verdict.kind === 'probable_limiter' ? 'VMA à examiner en priorité — non confirmée' : verdict.label}</strong></summary>
        <ul className="space-y-1 pb-2 text-[10px] text-muted-foreground">
          {verdict.evidence.map(e => <li key={e.key} className="border-l border-border pl-2 py-1">
            <span className="font-medium text-foreground">{e.status === 'deficit' ? '△' : e.status === 'ok' ? '○' : '?'} {e.label}</span>
            <p>{e.key === 'threshold_fraction' && e.status !== 'unknown'
              ? 'Ratio calculé depuis la VMA et l’allure seuil du bilan. Le repère de 88 % est une convention de lecture, pas un seuil validé de limitation.'
              : e.detail}</p>
            <p className="mt-0.5">{e.key === 'vma_vs_scenario' ? 'Extrapolation de groupe · correspondance ambition choisie par coaching.'
              : e.key === 'threshold_fraction' ? 'Calcul dépendant de la même VMA · ce n’est pas une seconde preuve indépendante.'
              : 'Observation spécifique non croisée · aucune conclusion automatique.'}</p>
          </li>)}
          <li className="pt-1">Deux signaux calculés ne suffisent pas à confirmer une cause. Confronter le scénario au protocole du test, aux performances récentes et à l’endurance spécifique avant de retenir un limiteur.</li>
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