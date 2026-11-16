import { useState } from 'react';
import { Bike, Footprints, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AMBITION_DEFINITIONS, type AmbitionLevel } from '@/types/ambitionLevel';
import type { CoachingCompassInput, TFCLCoachingCompassResult } from '@/lib/coachingCompass/types';
import { buildProfileComparisons, contextualCohortFor, type ProfileComparison } from '@/lib/coachingCompass/profileComparison';
import { compassEvidence, COMPASS_REFERENCE_VERSION } from '@/lib/coachingCompass/referenceRegistry';
import { cn } from '@/lib/utils';
import { CompassSignatureRadar } from './CompassSignatureRadar';

const descriptions: Record<string, string> = {
  vo2max: 'Capacité maximale à utiliser l’oxygène. Elle ne suffit pas à prédire la performance ; une valeur commune au bilan ne vaut pas deux tests spécifiques.',
  vma: 'Vitesse à forte sollicitation aérobie, dépendante du protocole. Ce n’est pas une allure soutenable pendant toute la course.',
  vlamax: 'Repère glycolytique, mesuré ou estimé selon la source. La plage dépend du sport et de l’épreuve : plus bas n’est pas toujours mieux.',
  ftpkg: 'Puissance au seuil vélo rapportée au poids. FTP et MLSS sont des repères liés mais pas des protocoles identiques.',
  tte: 'Temps tenu au seuil. Un arrêt volontaire donne un minimum ; une estimation n’est pas un test jusqu’à épuisement. Ce n’est pas la durabilité après plusieurs heures.',
  fatmax: 'Intensité d’oxydation lipidique maximale estimée ou mesurée. Ne décrit pas à elle seule le débit de graisses oxydées.',
  threshold: 'Allure au seuil enregistrée, sans conversion automatique en allure de compétition.',
};
const fmt = (n: number) => n.toLocaleString('fr-BE', { maximumFractionDigits: n < 10 ? 2 : 1 });
const valueLabel = (m: ProfileComparison) => m.value == null ? '—' : m.key === 'threshold'
  ? `${Math.floor(Math.round(m.value) / 60)}:${String(Math.round(m.value) % 60).padStart(2, '0')}` : fmt(m.value);
const sourceLabel = (s: string) => s === 'test_labo' ? 'Labo' : s === 'observed' ? 'Terrain déclaré' : s === 'shared' ? 'Bilan commun' : s === 'snapshot' || s === 'unknown' ? 'Origine non documentée' : s === 'test' || s === 'test_terrain' ? 'Terrain à confirmer' : 'Estimation';
const statusLabel = (m: ProfileComparison) => ({ below: 'Sous la cible', inside: 'Dans la cible', above: m.reference?.low === m.reference?.high ? 'Au-dessus de la cible' : 'Au-dessus de la plage', unavailable: 'Référence non établie', missing: 'Données insuffisantes' })[m.status];

export function CompassProfileComparison({ input, compass, athleteName }: { input: CoachingCompassInput; compass: TFCLCoachingCompassResult; athleteName?: string }) {
  const groups = buildProfileComparisons(input, compass);
  const [selectedSport, setSelectedSport] = useState<'run' | 'bike'>(groups[0]?.sport ?? 'run');
  const [opened, setOpened] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const ambition = AMBITION_DEFINITIONS[input.ambition as AmbitionLevel]?.label ?? input.ambition;
  return <section aria-label="Profil physiologique comparé" className="space-y-5" data-testid="compass-profile-comparison">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
      <div><h3 className="text-lg font-semibold">{athleteName ? `${athleteName} · Profil physiologique` : 'Profil physiologique'}</h3><p className="text-sm text-muted-foreground">{input.objectif} · {ambition}</p></div>
      {input.snapshotDate && <p className="text-xs text-muted-foreground">Bilan · {input.snapshotDate.slice(0, 10).split('-').reverse().join('/')}</p>}
    </div>
    {groups.length > 1 && <div className="flex gap-2 md:hidden" aria-label="Discipline">{groups.map(g => <Button key={g.sport} variant={selectedSport === g.sport ? 'secondary' : 'ghost'} className="min-h-11 flex-1" onClick={() => setSelectedSport(g.sport)} aria-pressed={selectedSport === g.sport}>{g.sport === 'bike' ? <Bike className="mr-2 h-4 w-4" /> : <Footprints className="mr-2 h-4 w-4" />}{g.sport === 'bike' ? 'Vélo' : 'Course'}</Button>)}</div>}
    <div className={cn('grid gap-8', groups.length > 1 && 'md:grid-cols-2')}>
      {groups.map(g => <section key={g.sport} aria-label={`Profil ${g.sport === 'bike' ? 'vélo' : 'course'}`} className={cn('min-w-0', selectedSport !== g.sport && 'hidden md:block')}>
        <h4 className="mb-2 flex items-center gap-2 text-base font-semibold">{g.sport === 'bike' ? <Bike className="h-5 w-5 text-primary" /> : <Footprints className="h-5 w-5 text-primary" />}{g.sport === 'bike' ? 'Vélo' : 'Course à pied'}</h4>
        <CompassSignatureRadar axes={compass.presentation?.disciplineAxes?.[g.sport] ?? (g.sport === 'run' ? compass.presentation?.runningDiagnostic?.axes : undefined) ?? compass.presentation?.axes ?? compass.radarAxes} size={400} />
        <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Profil</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" />Proche de la cible</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning" />À développer</span></div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Repères /100 par rapport aux cibles de coaching, pas une probabilité de réussite.</p>
        <Accordion type="single" defaultValue="values" collapsible className="mt-3"><AccordionItem value="values"><AccordionTrigger>Valeurs et comparaisons</AccordionTrigger><AccordionContent>
        {g.metrics.map(m => <div key={m.key} className="border-b border-border py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><Button variant="ghost" className="min-h-11 h-auto px-0 text-sm font-medium whitespace-normal text-left justify-start" onClick={() => { setSelectedMetric(m.key); setOpened(prev => [...new Set([...prev, 'reading'])]); }}>{m.label}<Info className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" /></Button><p className="text-xs text-muted-foreground">{m.value == null ? 'Non renseigné' : sourceLabel(m.source)}</p></div>
            <p className="shrink-0 text-right text-2xl font-semibold tabular-nums">{valueLabel(m)}<span className="mt-1 block text-xs font-normal text-muted-foreground">{m.key === 'threshold' ? '/km' : m.unit}</span></p>
          </div>
          {m.reference && <div className="mt-4 space-y-2">
            <div className="relative h-4 rounded-sm bg-muted" aria-label={`${m.label} : ${valueLabel(m)} ; cible TFCL ${fmt(m.reference.low)}${m.reference.high !== m.reference.low ? ` à ${fmt(m.reference.high)}` : ''} ${m.unit}`}>
              <span className="absolute inset-y-0 rounded-sm border border-primary/40 bg-primary/20" style={{ left: `${m.lowPosition ?? 0}%`, width: `${Math.max((m.highPosition ?? 0) - (m.lowPosition ?? 0), .8)}%` }} />
              {m.position != null && <span className="absolute -top-1 h-6 w-1 rounded-sm bg-foreground ring-2 ring-background" style={{ left: `${m.position}%` }} />}
            </div>
            <div className="flex justify-between gap-2 text-xs tabular-nums text-muted-foreground"><span>{fmt(m.scaleMin)}</span><span>Cible TFCL · {fmt(m.reference.low)}{m.reference.high !== m.reference.low ? `–${fmt(m.reference.high)}` : ''}</span><span>{fmt(m.scaleMax)}</span></div>
          </div>}
          <p className={cn('mt-3 text-xs', m.status === 'missing' || m.status === 'unavailable' ? 'text-muted-foreground' : 'text-foreground')}>{statusLabel(m)}</p>
        </div>)}
        </AccordionContent></AccordionItem></Accordion>
      </section>)}
    </div>
    <p className="text-xs text-muted-foreground">Cibles TFCL : repères de coaching, pas des normes statistiques validées. Les données manquantes ne sont pas dessinées.</p>
    <Accordion type="multiple" value={opened} onValueChange={setOpened}>
      <AccordionItem value="reading"><AccordionTrigger>Comprendre mes repères</AccordionTrigger><AccordionContent><div className="space-y-4">{Object.entries(descriptions).filter(([key]) => groups.some(g => g.metrics.some(m => m.key === key))).filter(([key]) => !selectedMetric || key === selectedMetric).map(([key, text]) => <div key={key}><h5 className="font-semibold">{groups.flatMap(g => g.metrics).find(m => m.key === key)?.label}</h5><p className="mt-1 text-muted-foreground">{text}</p></div>)}{selectedMetric && <Button variant="ghost" onClick={() => setSelectedMetric(null)}>Tous les repères</Button>}</div></AccordionContent></AccordionItem>
      <AccordionItem value="science"><AccordionTrigger>Sources scientifiques</AccordionTrigger><AccordionContent><div className="space-y-5">
        <p className="text-muted-foreground">Aucune des publications ci-dessous ne valide l’ensemble de la matrice objectif × ambition. Les cibles existantes restent des extrapolations de coaching ; aucune plage scientifique manquante n’est inventée.</p>
        {groups.some(g => contextualCohortFor(g.sport, input.objectif)) && <div className="space-y-3 border-l-2 border-primary pl-4"><h5 className="font-semibold">Cohorte publiée · contexte course uniquement</h5><p className="text-muted-foreground">Assis 2024 · n = 13 · moyenne ± écart-type. Illustration de la dispersion, pas une zone optimale ni une cible pour votre ambition.</p>{Object.entries(contextualCohortFor('run', input.objectif)?.metrics ?? {}).map(([key, c]) => <div key={key}><p className="text-sm font-medium">{key === 'vma' ? 'MAS sur tapis' : 'VO₂max'} · {fmt(c.mean)} ± {fmt(c.sd)} {c.unit}</p><div className="my-2 flex h-3 items-center bg-muted"><span className="ml-[20%] h-3 w-[60%] bg-muted-foreground/20" /><span className="-ml-[30%] h-5 w-0.5 bg-muted-foreground" /></div><p className="text-xs text-muted-foreground">{fmt(c.mean - c.sd)} — {fmt(c.mean)} — {fmt(c.mean + c.sd)} · ± 1 écart-type ; rapprochement indirect</p></div>)}</div>}
        {compassEvidence.map(e => <div key={e.id}><a href={e.url} target="_blank" rel="noreferrer" className="font-semibold text-primary underline underline-offset-4">{e.title}</a><p className="mt-1">{e.population}</p><p className="mt-1 text-muted-foreground">{e.protocol}</p><p className="mt-1 text-muted-foreground">{e.limitation}</p></div>)}<p className="text-xs text-muted-foreground">Registre · {COMPASS_REFERENCE_VERSION}</p>
      </div></AccordionContent></AccordionItem>
    </Accordion>
  </section>;
}