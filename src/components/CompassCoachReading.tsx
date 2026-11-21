import { Target, Layers, ClipboardList } from 'lucide-react';
import type { CoachingCompassInput, TFCLCoachingCompassResult } from '@/lib/coachingCompass/types';
import { compassDisplaySport } from '@/lib/coachingCompass/sportPresentation';
import { metricSourceLabel } from '@/lib/coachingCompass/presentation';

const positive = (value: number | null | undefined) => value != null && Number.isFinite(value) && value > 0;

/** Read-only grouping of existing evidence; no new scores or prescription inputs. */
export function CompassCoachReading({ input, compass, coachOrder }: {
  input: CoachingCompassInput;
  compass: TFCLCoachingCompassResult;
  coachOrder?: string[];
}) {
  const presentation = compass.presentation;
  const sport = compassDisplaySport(input);
  const references = presentation?.sportReferences ?? [];
  const axes = presentation?.disciplineAxes
    ? [...(sport !== 'run' ? presentation.disciplineAxes.bike : []), ...(sport !== 'bike' ? presentation.disciplineAxes.run : [])]
    : presentation?.axes ?? compass.radarAxes;
  const missing = axes.filter(axis => !positive(axis.value));
  const noTarget = axes.filter(axis => positive(axis.value) && !positive(axis.target));
  const missingReferences = references.filter(reference => !positive(reference.value));

  return <section aria-label="Lecture du coach" className="mt-6 space-y-5 border-y border-border py-5">
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold"><Target className="h-4 w-4 text-primary" />Priorités de travail</h3>
      <p className="mt-2 text-sm">{compass.limiter.icon} {compass.limiter.label}</p>
      {!!presentation?.priorityMetrics.length && <p className="mt-1 text-sm text-muted-foreground">{presentation.priorityMetrics.join(' → ')}</p>}
      {coachOrder && <p className="mt-2 text-sm">Ordre coach enregistré pour le plan : {coachOrder.join(' → ')}</p>}
      <p className="mt-2 text-sm text-muted-foreground">Ces priorités sont celles du diagnostic utilisé pour le plan. Un écart sur le graphique n’est pas automatiquement une priorité de séance. VO₂max et VMA partagent un stimulus aérobie, sans addition automatique des séances.</p>
    </div>
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold"><Layers className="h-4 w-4 text-primary" />Repères complémentaires</h3>
      {sport !== 'bike' && <p className="mt-2 text-sm">Économie de course : {positive(input.runEconomyScore) ? `${input.runEconomyScore}/100` : 'Données insuffisantes'} · modulateur d’efficience, hors classement des priorités.</p>}
      {sport !== 'run' && <p className="mt-2 text-sm">FatMax vélo : repère lipidique, hors classement du diagnostic vélo du Compass ; une valeur estimée n’est pas une mesure.</p>}
      {references.filter(reference => positive(reference.value)).map(reference => <p key={`${reference.sport}-${reference.label}`} className="mt-2 text-sm">
        {reference.label} : {reference.value?.toLocaleString('fr-BE', { maximumFractionDigits: 1 })} {reference.unit}
        <span className="block text-xs text-muted-foreground">{metricSourceLabel(reference.source)}{reference.conditions && ` · ${reference.conditions}`}</span>
      </p>)}
      <p className="mt-2 text-sm text-muted-foreground">CP/W′ et vitesse critique/D′ restent propres au sport et au capteur. Une grande réserve n’est pas automatiquement meilleure ; ces repères ne reçoivent pas de note sur le radar.</p>
    </div>
    <div>
      <h3 className="flex items-center gap-2 text-base font-semibold"><ClipboardList className="h-4 w-4 text-warning" />Données à mesurer ou à préciser</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {missing.map((axis, index) => <li key={`missing-${axis.key}-${index}`}>{axis.label} : données insuffisantes.</li>)}
        {noTarget.map((axis, index) => <li key={`target-${axis.key}-${index}`}>{axis.label} : valeur disponible, cible non définie ; aucun déficit conclu.</li>)}
        {missingReferences.map(reference => <li key={`${reference.sport}-${reference.label}`}>{reference.label} : données insuffisantes.</li>)}
        {sport !== 'bike' && !positive(input.runEconomyScore) && <li>Économie de course : donnée absente.</li>}
        <li>Robustesse après effort prolongé : non évaluée par ce diagnostic ; comparer des efforts frais et après charge dans des conditions documentées.</li>
        <li>Protocoles, capteurs et modalité du test VO₂max : vérifier les informations enregistrées avant de conclure.</li>
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Le TTE décrit le temps tenu au seuil, pas la durabilité après plusieurs heures. Une donnée absente ne signifie pas une faiblesse.</p>
    </div>
  </section>;
}