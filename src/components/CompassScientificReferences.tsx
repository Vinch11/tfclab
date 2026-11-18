import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import { friendReference, FRIEND_SOURCE, FRIEND_TABLE_SOURCE } from '@/lib/coachingCompass/friendReference';
import { contextualTriathlonCohort } from '@/lib/coachingCompass/referenceRegistry';
import { thresholdObservation } from '@/lib/coachingCompass/scientificComparison';

export function CompassScientificReferences({ input }: { input: CoachingCompassInput }) {
  const sports: Array<'bike' | 'run'> = input.sportFocus === 'triathlon' ? ['bike', 'run'] : [input.sportFocus === 'bike' ? 'bike' : 'run'];
  const threshold = thresholdObservation(input);
  const cohort = /^(IM|Ironman|703|70[.,]3|Half)$/i.test(input.objectif) ? contextualTriathlonCohort : null;
  return <section className="mt-4 border-t border-border pt-3 space-y-3" aria-label="Références scientifiques du profil">
    <h3 className="text-sm font-semibold">Références scientifiques · population et sportifs</h3>
    {cohort && <div className="border-l-2 border-primary pl-3 text-xs space-y-1" data-testid="compass-sport-cohort">
      <p className="font-medium">Triathlètes amateurs compétitifs · Assis 2024 · 13 athlètes</p>
      <p>VMA sur tapis : <strong>16,69 ± 1,65 km/h</strong> · Bilan : <strong>{input.vma?.toFixed(1) ?? '—'} km/h</strong></p>
      <p>VO₂max : <strong>56,3 ± 5,56 ml/kg/min</strong> · Bilan : <strong>{input.vo2max?.toFixed(1) ?? '—'} ml/kg/min</strong></p>
      <p className="text-muted-foreground">Moyenne ± écart-type, pas une fourchette optimale : 7 hommes et 6 femmes, préparation IM/70.3, sans groupe féminin 50–54 ans ni percentile compétiteur.</p>
      <a className="text-primary underline" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10950087/" target="_blank" rel="noreferrer">Étude et protocole</a>
    </div>}
    {threshold && <p className="text-xs" data-testid="compass-threshold-observation">Seuil course enregistré : <strong>{threshold.speed.toFixed(1)} km/h</strong>{threshold.fractionVma != null && <> · <strong>{(threshold.fractionVma * 100).toFixed(0)} % de la VMA</strong></>} · positionnement individuel, pas une allure Ironman validée.</p>}
    <details className="text-xs">
      <summary className="min-h-11 flex items-center cursor-pointer font-medium">VO₂peak · percentiles par âge et sexe · FRIEND 2022</summary>
      <div className="space-y-3 pb-2">
        <p>22 379 tests d’adultes apparemment sains, 34 laboratoires américains. Tables RER ≥ 1,10, tapis et vélo séparés ; ce ne sont pas des catégories de compétiteurs.</p>
        {sports.map(sport => {
          const ref = friendReference(input.athleteAge, input.athleteSex, sport);
          return <div key={sport}><p className="font-medium">{sport === 'bike' ? 'Vélo' : 'Tapis'} · {input.athleteSex === 'F' ? 'Femmes' : input.athleteSex === 'M' ? 'Hommes' : 'Sexe non renseigné'}{ref && ` · ${ref.ageLow}–${ref.ageHigh} ans`}</p>
            {ref ? <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">{ref.values.map((value, i) => <div key={ref.percentiles[i]} className="border-b border-border pb-1"><p className="text-muted-foreground">P{ref.percentiles[i]}</p><p className="font-semibold tabular-nums">{value.toFixed(1)}</p></div>)}</div> : <p className="text-muted-foreground">Référence indisponible : âge entre 20 et 89 ans et sexe documenté requis.</p>}
          </div>;
        })}
        <p className="text-muted-foreground">Valeurs en ml/kg/min. Aucun percentile attribué au bilan : modalité du test, mesure des échanges gazeux et RER maximal non documentés ici. Une estimation ne devient pas une mesure de laboratoire.</p>
        <p><a href={FRIEND_SOURCE} className="text-primary underline" target="_blank" rel="noreferrer">Publication FRIEND</a> · <a href={FRIEND_TABLE_SOURCE} className="text-primary underline" target="_blank" rel="noreferrer">Tables originales</a></p>
      </div>
    </details>
    <details className="text-xs">
      <summary className="min-h-11 flex items-center cursor-pointer font-medium">Ambition, catégorie d’âge et résultats d’épreuves</summary>
      <div className="space-y-2 pb-2 text-muted-foreground">
        <p>Un top 10 % de résultats se calcule parmi les arrivants de même sexe et catégorie d’âge, sur des épreuves comparables. « Compétiteur » n’est pas automatiquement un percentile.</p>
        <p>Aucune distribution d’épreuve comparable n’est chargée pour ce bilan : aucun chrono de podium ni percentile de course n’est inventé. Le chrono projeté ne remplace pas une ambition saisie par le coach.</p>
        <p>Ironman : Knechtle 2024 analyse 687 696 résultats entre 2002 et 2022, par groupes de cinq ans ; ces résultats ne contiennent pas les tests physiologiques des mêmes athlètes.</p>
        <a className="text-primary underline" href="https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0311202" target="_blank" rel="noreferrer">Résultats Ironman · étude</a>
      </div>
    </details>
  </section>;
}