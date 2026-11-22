import { useState } from 'react';
import { Bike, Footprints, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AMBITION_DEFINITIONS, type AmbitionLevel } from '@/types/ambitionLevel';
import type { CoachingCompassInput, TFCLCoachingCompassResult } from '@/lib/coachingCompass/types';
import { buildProfileComparisons, contextualCohortFor, type ProfileComparison } from '@/lib/coachingCompass/profileComparison';
import { compassEvidence, COMPASS_REFERENCE_VERSION } from '@/lib/coachingCompass/referenceRegistry';
import { cn } from '@/lib/utils';
import { CompassProfileRadar } from './CompassProfileRadar';
import { CompassDurability } from './CompassDurability';
import { comparePerformance, goalDistance, PERFORMANCE_SOURCES, readPerformanceGoal } from '@/lib/coachingCompass/performanceComparison';
import { publishedRaceStatistics } from '@/lib/coachingCompass/raceStatistics';
import { formatTime } from '@/lib/raceAnalysis';
import { fieldIntensity } from '@/lib/diagnostic/fieldHold';
import { getObjectifLabel, type ObjectifType } from '@/types/athlete';

const descriptions: Record<string, string> = {
  raceSpeed: 'Vitesse moyenne sur la distance officielle, comparée à celle demandée par le chrono visé.',
  vo2max: 'Capacité maximale à utiliser l’oxygène. Elle ne suffit pas à prédire la performance ; une valeur commune au bilan ne vaut pas deux tests spécifiques.',
  vma: 'Vitesse à forte sollicitation aérobie, dépendante du protocole. Ce n’est pas une allure soutenable pendant toute la course.',
  vlamax: 'Repère glycolytique, mesuré ou estimé selon la source. La plage dépend du sport et de l’épreuve : plus bas n’est pas toujours mieux.',
  ftpkg: 'Puissance au seuil vélo rapportée au poids. FTP et MLSS sont des repères liés mais pas des protocoles identiques.',
  tte: 'Temps tenu au seuil. Un arrêt volontaire donne un minimum ; une estimation n’est pas un test jusqu’à épuisement. Ce n’est pas la durabilité après plusieurs heures.',
  fatmax: 'Intensité d’oxydation lipidique maximale estimée ou mesurée. Ne décrit pas à elle seule le débit de graisses oxydées.',
  threshold: 'Allure au seuil enregistrée, sans conversion automatique en allure de compétition.',
};
const fmt = (n: number) => n.toLocaleString('fr-BE', { maximumFractionDigits: n < 10 ? 2 : 1 });
const valueLabel = (m: ProfileComparison) => m.observationLabel ?? (m.value == null ? '—' : m.key === 'threshold'
  ? `${Math.floor(Math.round(m.value) / 60)}:${String(Math.round(m.value) % 60).padStart(2, '0')}` : fmt(m.value));
const sourceLabel = (s: string) => s === 'test_labo' ? 'Labo' : s === 'observed' ? 'Terrain déclaré' : s === 'records' ? 'Estimation par chronos' : s === 'shared' ? 'Bilan commun' : s === 'snapshot' || s === 'unknown' ? 'Origine non documentée' : s === 'test' || s === 'test_terrain' ? 'Terrain à confirmer' : 'Estimation';
const statusLabel = (m: ProfileComparison) => ({ below: 'Sous la cible', inside: 'Dans la cible', above: m.reference?.low === m.reference?.high ? 'Au-dessus de la cible' : 'Au-dessus de la plage', unavailable: 'Référence non établie', missing: 'Données insuffisantes' })[m.status];

function RaceStatisticsSummary({ input }: { input: CoachingCompassInput }) {
  const stats = publishedRaceStatistics(input);
  if (!stats) return null;
  const observation = goalDistance(input.objectif)?.tri ? null : input.performanceObservation;
  const observed = observation && Number.isFinite(observation.seconds) && observation.seconds > 0 ? observation : null;
  return <details className="rounded-lg border px-3 text-sm">
    <summary className="cursor-pointer py-3 font-medium">Résultats publiés · {stats.category}{stats.scenario && <> · {stats.scenario.label} {formatTime(Math.round(stats.scenario.minutes * 60))}</>}</summary>
    <div className="space-y-2 pb-3">
      <p>{stats.population} <a className="underline" href={stats.url}>Voir le tableau publié</a></p>
      {stats.rows.map(row => {
        const seconds = Math.round(row.minutes * 60);
        const delta = observed ? observed.seconds - seconds : null;
        return <p key={row.label}>{row.label} · <strong>{formatTime(seconds)}</strong>{delta != null && <> · {delta === 0 ? 'Même temps' : formatTime(Math.abs(delta)) + (delta > 0 ? ' de plus' : ' de moins')} sur le résultat enregistré{observed?.date ? ' du ' + observed.date : ''}</>}</p>;
      })}
      <p className="text-xs text-muted-foreground">{stats.scenario ? 'TFCL propose ce rang comme point de comparaison pour l’ambition choisie.' : 'Ces résultats situent le niveau du peloton pour cette catégorie.'} Un podium ou une qualification dépend du classement de l’épreuve visée.</p>
    </div>
  </details>;
}

export function CompassProfileComparison({ input, compass, athleteName, detailsOnly = false }: { input: CoachingCompassInput; compass: TFCLCoachingCompassResult; athleteName?: string; detailsOnly?: boolean }) {
  const groups = buildProfileComparisons(input, compass);
  const [selectedSport, setSelectedSport] = useState<'run' | 'bike'>(groups[0]?.sport ?? 'run');
  const [opened, setOpened] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const ambition = AMBITION_DEFINITIONS[input.ambition as AmbitionLevel]?.label ?? input.ambition;
  const goal = readPerformanceGoal(input.performanceGoal);
  const totalSeconds = Math.round((goal?.minutes ?? 0) * 60);
  const goalTime = totalSeconds < 3600 ? fmt(totalSeconds / 60) + ' min'
    : Math.floor(totalSeconds / 3600) + ' h ' + String(Math.floor(totalSeconds % 3600 / 60)).padStart(2, '0') +
      (totalSeconds % 60 ? ' min ' + totalSeconds % 60 + ' s' : '');
  const performance = comparePerformance(input, goal);
  const source = PERFORMANCE_SOURCES.find(row => row.name === performance.cohortSource);
  return <section aria-label="Profil physiologique comparé" className="space-y-5" data-testid="compass-profile-comparison">
    {!detailsOnly && <><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
      <div><h3 className="text-lg font-semibold">{athleteName ? `${athleteName} · Profil physiologique` : 'Profil physiologique'}</h3><p className="text-sm text-muted-foreground">{getObjectifLabel(input.objectif as ObjectifType) || input.objectif} · {ambition}{goal && ' · ' + goalTime}</p></div>
      {input.snapshotDate && <p className="text-xs text-muted-foreground">Bilan · {input.snapshotDate.slice(0, 10).split('-').reverse().join('/')}</p>}
    </div>
    <RaceStatisticsSummary input={input} />
    {groups.length > 1 && <div className="flex gap-2 md:hidden" aria-label="Discipline">{groups.map(g => <Button key={g.sport} variant={selectedSport === g.sport ? 'secondary' : 'ghost'} className="min-h-11 flex-1" onClick={() => setSelectedSport(g.sport)} aria-pressed={selectedSport === g.sport}>{g.sport === 'bike' ? <Bike className="mr-2 h-4 w-4" /> : <Footprints className="mr-2 h-4 w-4" />}{g.sport === 'bike' ? 'Vélo' : 'Course'}</Button>)}</div>}
    <div className={cn('grid gap-8', groups.length > 1 && 'md:grid-cols-2')}>
      {groups.map(g => <section key={g.sport} aria-label={`Profil ${g.sport === 'bike' ? 'vélo' : 'course'}`} className={cn('min-w-0', selectedSport !== g.sport && 'hidden md:block')}>
        <h4 className="mb-2 flex items-center gap-2 text-base font-semibold">{g.sport === 'bike' ? <Bike className="h-5 w-5 text-primary" /> : <Footprints className="h-5 w-5 text-primary" />}{g.sport === 'bike' ? 'Vélo' : 'Course à pied'}</h4>
        <CompassProfileRadar metrics={g.metrics} athleteName={athleteName} />
        {g.sport === 'run' && performance.pace && <p className="my-2 text-sm">Allure demandée par {performance.distance?.tri ? 'le split course' : 'le chrono'} · <strong>{fieldIntensity('run', performance.pace)}</strong></p>}
        {g.sport === 'bike' && goal?.bikeWatts && <p className="my-2 text-sm">Puissance de course visée par le coach · <strong>{goal.bikeWatts} W</strong></p>}
        {g.sport === 'run' && performance.cohort && source && <p className="text-xs text-muted-foreground">Groupe {performance.cohort.label} · VO₂max observée {fmt(performance.cohort.vo2)} ± {fmt(performance.cohort.vo2Sd)} ml/kg/min (moyenne ± écart-type). <a className="underline" href={source.url}>{source.name}</a></p>}
        <CompassDurability sport={g.sport} input={input} />
      </section>)}
    </div></>}
    {detailsOnly && <>
    <h4 className="text-sm font-semibold">Valeurs et comparaisons</h4>
    {groups.map(g => <section key={g.sport}><h5 className="text-sm font-medium">{g.sport === 'run' ? 'Course' : 'Vélo'}</h5>
        {g.metrics.map(m => <div key={m.key} className="border-b border-border py-3">
          <div className="flex items-center justify-between gap-3"><Button variant="ghost" className="min-h-11 px-0" onClick={() => { setSelectedMetric(m.key); setOpened(['reading']); }}>{m.label}<Info className="ml-2 h-4 w-4" /></Button><span className="text-lg font-semibold tabular-nums">{valueLabel(m)} {m.observationLabel ? '' : m.key === 'threshold' ? '/km' : m.unit}</span></div>
          <p className="text-xs text-muted-foreground">{m.observationLabel ? 'Test de tenue au seuil' : sourceLabel(m.source) + (m.reference?.kind === 'cohort' ? ' · comparaison descriptive' : ' · ' + statusLabel(m))}{m.reference && ` · ${m.reference.kind === 'cohort' ? 'Moyenne publiée' : m.reference.kind === 'goal' ? 'Objectif personnel' : 'Repère TFCL'} · ${fmt(m.reference.low)}${m.reference.high !== m.reference.low ? `–${fmt(m.reference.high)}` : ''} ${m.unit}`}</p>
        </div>)}
      </section>)}
    {input.runEconomyScore != null && compass.presentation?.sport !== 'bike' && <p className="text-sm">Économie de course · indice du bilan {input.runEconomyScore}/100</p>}
    {compass.presentation?.sportReferences.filter(r => r.value != null).map(r => <p key={r.label} className="text-sm">{r.label} · {fmt(r.value!)} {r.unit} · {sourceLabel(r.source)}</p>)}
    <p className="text-xs text-muted-foreground">W′ est le travail disponible au-dessus de la puissance critique. D′ est la distance correspondante en course. FatMax décrit une intensité d’oxydation lipidique. Ces repères complémentaires ont une lecture propre au protocole.</p>
    <p className="text-xs text-muted-foreground">Cibles TFCL : repères de coaching, pas des normes statistiques validées. Les données manquantes ne sont pas dessinées.</p>
    <Accordion type="multiple" value={opened} onValueChange={setOpened}>
      <AccordionItem value="reading"><AccordionTrigger>Comprendre mes repères</AccordionTrigger><AccordionContent><div className="space-y-4">{Object.entries(descriptions).filter(([key]) => groups.some(g => g.metrics.some(m => m.key === key))).filter(([key]) => !selectedMetric || key === selectedMetric).map(([key, text]) => <div key={key}><h5 className="font-semibold">{groups.flatMap(g => g.metrics).find(m => m.key === key)?.label}</h5><p className="mt-1 text-muted-foreground">{text}</p></div>)}{selectedMetric && <Button variant="ghost" onClick={() => setSelectedMetric(null)}>Tous les repères</Button>}</div></AccordionContent></AccordionItem>
      <AccordionItem value="science"><AccordionTrigger>Sources scientifiques</AccordionTrigger><AccordionContent><div className="space-y-5">
        <p className="text-muted-foreground">Aucune des publications ci-dessous ne valide l’ensemble de la matrice objectif × ambition. Les cibles existantes restent des extrapolations de coaching ; aucune plage scientifique manquante n’est inventée.</p>
        {groups.some(g => contextualCohortFor(g.sport, input.objectif)) && <div className="space-y-3 border-l-2 border-primary pl-4"><h5 className="font-semibold">Cohorte publiée · contexte course uniquement</h5><p className="text-muted-foreground">Assis 2024 · n = 13 · moyenne ± écart-type. Illustration de la dispersion, pas une zone optimale ni une cible pour votre ambition.</p>{Object.entries(contextualCohortFor('run', input.objectif)?.metrics ?? {}).map(([key, c]) => <div key={key}><p className="text-sm font-medium">{key === 'vma' ? 'MAS sur tapis' : 'VO₂max'} · {fmt(c.mean)} ± {fmt(c.sd)} {c.unit}</p><div className="my-2 flex h-3 items-center bg-muted"><span className="ml-[20%] h-3 w-[60%] bg-muted-foreground/20" /><span className="-ml-[30%] h-5 w-0.5 bg-muted-foreground" /></div><p className="text-xs text-muted-foreground">{fmt(c.mean - c.sd)} — {fmt(c.mean)} — {fmt(c.mean + c.sd)} · ± 1 écart-type ; rapprochement indirect</p></div>)}</div>}
        {compassEvidence.map(e => <div key={e.id}><a href={e.url} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-4">{e.title}</a><p className="mt-1">{e.population}</p><p className="mt-1 text-muted-foreground">{e.protocol}</p><p className="mt-1 text-muted-foreground">{e.limitation}</p></div>)}<p className="text-xs text-muted-foreground">Registre · {COMPASS_REFERENCE_VERSION}</p>
      </div></AccordionContent></AccordionItem>
    </Accordion></>}
  </section>;
}