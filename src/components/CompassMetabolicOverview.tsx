import { useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bike, Footprints, Info } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { metabolicOverview } from '@/lib/coachingCompass/metabolicOverview';
import { profileCurveDiscipline } from '@/lib/coachingCompass/profileCurves';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';

const format = (v: number) => v.toLocaleString('fr-BE', { maximumFractionDigits: 1 });
const ink = { fat: 'hsl(var(--success))', carbs: 'hsl(var(--warning))', oxygen: 'hsl(var(--primary))', grid: 'hsl(var(--border))', muted: 'hsl(var(--muted-foreground))' };

export function CompassMetabolicOverview({ input }: { input: CoachingCompassInput }) {
  const [selection, setSelection] = useState<'bike' | 'run'>('bike');
  const [view, setView] = useState('energy');
  const sport = input.sportFocus === 'triathlon' ? selection : input.sportFocus === 'run' ? 'run' : 'bike';
  const model = useMemo(() => metabolicOverview(input, sport), [input, sport]);
  const profile = useMemo(() => profileCurveDiscipline(input, sport), [input, sport]);
  const unit = sport === 'run' ? 'km/h' : 'W';
  const threshold = profile.reference;
  const axis = { tick: { fill: ink.muted, fontSize: 11 }, axisLine: false, tickLine: false };
  return <section aria-label="Lecture métabolique" className="border-t border-border py-5 space-y-5 min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-lg font-semibold">Signature métabolique</h3><p className="text-xs text-muted-foreground mt-1">{sport === 'run' ? 'Course à pied' : 'Vélo'} · Modèle exploratoire</p></div>
      {input.sportFocus === 'triathlon' && <Tabs value={sport} onValueChange={v => { if (v === 'bike' || v === 'run') setSelection(v); }}><TabsList className="h-11"><TabsTrigger value="bike" className="min-h-10 gap-1.5"><Bike className="h-4 w-4" />Vélo</TabsTrigger><TabsTrigger value="run" className="min-h-10 gap-1.5"><Footprints className="h-4 w-4" />Course</TabsTrigger></TabsList></Tabs>}
    </div>
    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
      {[{ label: 'Pic lipidique estimé', value: model.peak ? `${format(model.peak.fat)} g/h` : '—', note: model.peak ? `${format(model.peak.output)} ${unit}` : 'Données insuffisantes' }, { label: 'Transition énergétique', value: model.crossover ? `${format(model.crossover.output)} ${unit}` : '—', note: model.crossover ? 'Énergie graisses = glucides' : 'Non évaluée' }, { label: sport === 'run' ? 'Seuil course enregistré' : 'FTP enregistrée', value: threshold ? `${format(threshold)} ${unit}` : '—', note: threshold ? 'Protocole à vérifier' : 'Données insuffisantes' }, { label: 'LT1 / LT2', value: sport === 'bike' && profile.thresholds ? `${Math.round(profile.thresholds.lt1Power)} / ${Math.round(profile.thresholds.lt2Power)} W` : '—', note: sport === 'bike' && profile.thresholds ? 'Modélisés · distincts de la FTP' : 'Mesures spécifiques requises' }].map(item => <div key={item.label} className="min-w-0 border-l-2 border-border pl-3"><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="text-lg sm:text-xl font-semibold tabular-nums mt-1 break-words">{item.value}</dd><p className="text-xs text-muted-foreground mt-1">{item.note}</p></div>)}
    </dl>
    <Tabs value={view} onValueChange={setView}><TabsList className="grid grid-cols-2 w-full sm:w-auto h-11"><TabsTrigger value="energy" className="min-h-10">Graisses & glucides</TabsTrigger><TabsTrigger value="oxygen" className="min-h-10">Demande en oxygène</TabsTrigger></TabsList></Tabs>
    <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{view === 'energy' ? 'Oxydation estimée · g/h' : 'O₂ estimé · ml/kg/min'}</span><span>{sport === 'run' ? 'Vitesse' : 'Puissance'} · {unit}</span></div>
    <div className="h-[280px] sm:h-[320px] w-full min-w-0" role="img" aria-label={view === 'energy' ? `Courbes exploratoires graisses et glucides ${sport === 'run' ? 'course' : 'vélo'}` : 'Courbe exploratoire de demande en oxygène'}>
      {(view === 'energy' ? model.points.length : profile.oxygen.length) > 0 ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={view === 'energy' ? model.points : profile.oxygen} margin={{ top: 14, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={ink.grid} vertical={false} strokeDasharray="3 5" />
        <XAxis {...axis} dataKey={view === 'energy' ? 'output' : 'intensity'} type="number" domain={['dataMin', 'dataMax']} tickFormatter={v => format(Number(v))} minTickGap={28} />
        <YAxis {...axis} width={44} tickFormatter={v => format(Number(v))} />
        <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="bg-popover text-popover-foreground border border-border rounded-lg p-3 text-xs shadow-md"><p className="font-semibold mb-2">{format(Number(label))} {unit}</p>{payload.map(p => <p key={String(p.dataKey)}>{p.name} : {format(Number(p.value))} {view === 'energy' ? 'g/h' : 'ml/kg/min'}</p>)}<p className="text-muted-foreground mt-2">Estimation · pas une mesure</p></div> : null} />
        {view === 'energy' ? <><Area type="monotone" dataKey="fat" name="Graisses" stroke={ink.fat} fill={ink.fat} fillOpacity={.08} strokeWidth={3} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="carbs" name="Glucides" stroke={ink.carbs} strokeWidth={3} dot={false} isAnimationActive={false} />{model.peak && <ReferenceLine x={model.peak.output} stroke={ink.fat} strokeDasharray="4 4" />}</> : <Line dataKey="oxygen" name="O₂" stroke={ink.oxygen} strokeWidth={3} strokeDasharray="6 3" dot={false} isAnimationActive={false} />}
        {view === 'oxygen' && input.vo2max != null && input.vo2max > 0 && <ReferenceLine y={input.vo2max} stroke={ink.muted} strokeDasharray="4 4" />}
      </ComposedChart></ResponsiveContainer> : <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground gap-2"><p>Données insuffisantes</p><p className="text-xs">{view === 'energy' ? model.missing.join(' · ') : sport === 'run' ? 'VO₂max, VMA et économie de course requises' : 'VO₂max, poids et FTP requis'}</p></div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-5 text-xs">{view === 'energy' ? <><span className="flex items-center gap-2"><span className="w-5 border-t-[3px] border-success" />Graisses</span><span className="flex items-center gap-2"><span className="w-5 border-t-[3px] border-warning" />Glucides</span></> : <span className="flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-primary" />Demande en O₂ estimée</span>}</div><Popover><PopoverTrigger asChild><Button variant="ghost" size="sm" className="min-h-11 text-xs text-muted-foreground gap-2" aria-label="Hypothèses du profil métabolique"><Info className="h-4 w-4" />Hypothèses</Button></PopoverTrigger><PopoverContent className="text-xs space-y-3 max-w-[calc(100vw-32px)]"><p>Courbes issues des modèles TFCL existants, sans prélèvements lactate ni calorimétrie inventés. Équivalence scientifique INSCYD non démontrée.</p><p>{sport === 'run' ? 'Vitesse liée à la VMA ; extrapolation exploratoire, non validée comme mesure métabolique course. Aucun watt ni seuil vélo transféré.' : 'Rendement mécanique hypothétique de 23 %. LT1/LT2 modélisés, FTP et MLSS non interchangeables.'}</p><p>Oxydation des glucides ≠ quantité à ingérer. Tolérance digestive et réserves non mesurées.</p></PopoverContent></Popover></div>
    <p className="text-xs text-muted-foreground">Courbes modélisées, pas mesurées. Oxydation des glucides ≠ apports alimentaires.</p>
  </section>;
}