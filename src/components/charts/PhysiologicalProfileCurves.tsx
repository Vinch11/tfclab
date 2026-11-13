import { useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { Activity, Gauge, Waves, Wind } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import type { DbSnapshot } from '@/hooks/useCloudData';
import { CURVE_STATUS_LABELS, curveStatus, profileCurveDiscipline, profileCurveHistory, type ProfileCurveMetric } from '@/lib/coachingCompass/profileCurves';
import { BEVEL_CHART_COLORS as colors, bevelAxisProps, bevelGridProps } from './bevelChartTheme';

const metrics: { key: ProfileCurveMetric; title: string; icon: typeof Wind; note: string }[] = [
  { key: 'vo2max', title: 'VO₂max', icon: Wind, note: 'Capacité aérobie enregistrée. En triathlon, la valeur commune ne prouve pas deux tests spécifiques.' },
  { key: 'vlamax', title: 'VLamax', icon: Waves, note: 'Débit glycolytique maximal : une valeur par bilan, pas une courbe de lactate mesurée.' },
  { key: 'threshold', title: 'Seuils', icon: Gauge, note: 'FTP, seuil course, LT1 et LT2 restent des repères distincts. Les seuils modélisés ne sont pas des prélèvements.' },
  { key: 'economy', title: 'Économie', icon: Activity, note: 'Indice de course /100, pas une consommation d’oxygène directement mesurée. Rendement vélo non mesuré.' },
];
const dateLabel = (date: string) => date.split('-').reverse().slice(0, 2).join('/');
const format = (value: number) => new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 2 }).format(value);

export function PhysiologicalProfileCurves({ input, snapshots, snapshot }: { input: CoachingCompassInput; snapshots: DbSnapshot[]; snapshot: DbSnapshot | null }) {
  const [selection, setSelection] = useState<'bike' | 'run'>('bike');
  const tri = input.sportFocus === 'triathlon';
  const sport = tri ? selection : input.sportFocus === 'run' ? 'run' : 'bike';
  const model = useMemo(() => profileCurveDiscipline(input, sport), [input, sport]);
  const history = useMemo(() => metrics.map(m => ({ ...m, points: profileCurveHistory(snapshots, input.athleteId ?? '', sport, m.key, input.snapshotDate) })), [snapshots, input.athleteId, input.snapshotDate, sport]);
  const unit = sport === 'run' ? 'km/h' : 'W';

  return <section data-testid="physiological-profile-curves" className="space-y-6 py-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h3 className="text-xl font-semibold">Profil métabolique · {sport === 'run' ? 'Course à pied' : 'Vélo'}</h3><p className="text-sm text-muted-foreground mt-1">Bilans, repères et modèles · {input.snapshotDate ?? 'Date non renseignée'}</p></div>
      {tri && <Tabs value={sport} onValueChange={v => { if (v === 'bike' || v === 'run') setSelection(v); }}><TabsList className="min-h-11"><TabsTrigger value="bike" className="min-h-10">Vélo</TabsTrigger><TabsTrigger value="run" className="min-h-10">Course à pied</TabsTrigger></TabsList></Tabs>}
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" />Mesure documentée</span>
      <span className="flex items-center gap-2"><span className="h-2 w-5 border-t-2 border-dashed border-primary" />Estimation</span>
      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning" />Enregistrée · à vérifier</span>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {history.map(m => {
        const key = m.key === 'threshold' ? sport === 'run' ? 'threshold' : 'ftp' : m.key;
        const indicator = model.discipline?.indicators.find(i => i.key === key);
        const current = indicator?.value ?? null;
        const displayValue = current != null && m.key === 'threshold' && sport === 'run' ? 3600 / current : current;
        const metricUnit = m.key === 'vo2max' ? 'ml/kg/min' : m.key === 'vlamax' ? 'mmol/L/s' : m.key === 'threshold' ? unit : '/100';
        const usable = m.points.filter(p => p.value != null);
        const field = m.key === 'threshold' ? sport === 'run' ? 'pace_threshold_sec_per_km' : 'ftp' : m.key === 'vlamax' && sport === 'run' ? 'vlamax_run' : m.key === 'economy' ? 'run_economy_score' : m.key;
        const source = m.key === 'vlamax' ? sport === 'run' ? input.vlamaxRunReference?.source : input.vlamaxEffectif?.source : indicator?.source;
        const isEstimate = source != null && /estimat|model|calcul|terrain/i.test(source);
        const currentStatus = isEstimate ? 'estimated' : snapshot ? curveStatus(snapshot, field) : 'recorded';
        return <article key={m.key} className="rounded-lg border border-border bg-card p-4 md:p-5 min-w-0">
          <div className="flex justify-between gap-3 items-start"><h4 className="flex items-center gap-2 font-semibold"><m.icon className="h-4 w-4 text-muted-foreground" />{m.title}</h4><div className="text-right"><div className="text-xl font-semibold tabular-nums">{displayValue == null ? '—' : format(displayValue)} <span className="text-xs font-normal text-muted-foreground">{displayValue == null ? '' : metricUnit}</span></div><p className="text-xs text-muted-foreground">{displayValue == null ? 'Données insuffisantes' : CURVE_STATUS_LABELS[currentStatus]}</p></div></div>
          <div className="h-48 mt-4">
            {usable.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={m.points} margin={{ top: 12, right: 14, bottom: 4, left: 0 }}>
              <CartesianGrid {...bevelGridProps} /><XAxis dataKey="date" tickFormatter={dateLabel} {...bevelAxisProps} minTickGap={25} /><YAxis {...bevelAxisProps} width={42} domain={['auto', 'auto']} tickFormatter={format} />
              <Tooltip labelFormatter={v => `Bilan ${v}`} formatter={(v: number, name: string) => [`${format(v)} ${metricUnit}`, name]} />
              <Line dataKey="estimated" name={CURVE_STATUS_LABELS.estimated} stroke={colors.periwinkle} strokeDasharray="5 5" strokeWidth={2} connectNulls={false} dot={{ r: 4 }} isAnimationActive={false} />
              <Scatter dataKey="measured" name={CURVE_STATUS_LABELS.measured} fill={colors.mint} isAnimationActive={false} />
              <Scatter dataKey="recorded" name={CURVE_STATUS_LABELS.recorded} fill={colors.amber} isAnimationActive={false} />
            </ComposedChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-5">{displayValue != null ? 'Estimation du bilan actuel · aucun historique comparable' : 'Aucun résultat exploitable pour ce sport'}</div>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mt-3">{m.note}{usable.length === 1 ? ' Un seul bilan : point isolé, évolution non évaluable.' : ''}</p>
          {m.key === 'threshold' && <dl className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs">{model.discipline?.indicators.filter(i => ['lt1', 'lt2', 'threshold', 'ftp'].includes(i.key)).map(i => {
            const value = i.value ?? (i.key === 'lt1' ? model.thresholds?.lt1Power : i.key === 'lt2' ? model.thresholds?.lt2Power : null);
            return <div key={i.key}><dt className="text-muted-foreground">{i.label}</dt><dd className="font-medium">{value == null ? 'Non renseigné' : `${format(value)} ${i.unit}`} {value != null ? i.key.startsWith('lt') ? '· estimé' : '· enregistré' : ''}</dd></div>;
          })}</dl>}
        </article>;
      })}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="min-w-0 border-t border-border pt-5"><h4 className="font-semibold">Demande en oxygène et économie</h4><p className="text-xs text-muted-foreground mt-1">Estimation · {sport === 'run' ? 'Coût dérivé de l’indice de course, relation linéaire sur terrain plat' : 'Rendement mécanique hypothétique de 23 %, pas une économie vélo mesurée'}</p>
        <div className="h-64 mt-4">{model.oxygen.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={model.oxygen} margin={{ top: 10, right: 12, bottom: 18, left: 0 }}><CartesianGrid {...bevelGridProps} /><XAxis dataKey="intensity" type="number" domain={['dataMin', 'dataMax']} {...bevelAxisProps} tickFormatter={v => sport === 'run' ? format(Number(v)) : String(Math.round(Number(v)))} label={{ value: unit, position: 'insideBottom', offset: -10 }} /><YAxis width={42} {...bevelAxisProps} /><Tooltip formatter={(v: number) => [`${format(v)} ml/kg/min`, 'O₂ estimé']} labelFormatter={v => `${format(Number(v))} ${unit}`} /><Line dataKey="oxygen" stroke={colors.periwinkle} strokeDasharray="5 5" dot={false} isAnimationActive={false} />{input.vo2max != null && <ReferenceLine y={input.vo2max} stroke={colors.muted} label={{ value: 'VO₂max enregistrée', position: 'insideTopRight', fontSize: 10 }} />}{model.reference != null && <ReferenceLine x={model.reference} stroke={colors.amber} strokeDasharray="3 3" />}{model.thresholds && <ReferenceLine x={model.thresholds.lt1Power} stroke={colors.sky} strokeDasharray="3 3" label={{ value: 'LT1 estimé', position: 'insideTopLeft', fontSize: 10 }} />}{model.thresholds && <ReferenceLine x={model.thresholds.lt2Power} stroke={colors.periwinkle} strokeDasharray="3 3" label={{ value: 'LT2 estimé', position: 'insideBottomLeft', fontSize: 10 }} />}</ComposedChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Données insuffisantes · {sport === 'run' ? 'VO₂max, VMA et économie requis' : 'VO₂max, poids et FTP requis'}</div>}</div>
      </section>
      <section className="min-w-0 border-t border-border pt-5"><h4 className="font-semibold">Zones physiologiques</h4><p className="text-xs text-muted-foreground mt-1">{model.zones.source === 'derived' ? 'Bornes dérivées des repères disponibles' : 'Grille standard · pas de seuils métaboliques mesurés'} · {sport === 'run' ? 'référence vitesse seuil' : 'référence FTP'}</p>
        <div className="h-64 mt-4">{model.reference != null ? <ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={model.zones.zones.map(z => ({ zone: z.id, start: z.pctRef.min * (model.reference ?? 0) / 100, width: (z.pctRef.max - z.pctRef.min) * (model.reference ?? 0) / 100, label: z.label }))} margin={{ top: 10, right: 12, bottom: 18, left: 0 }}><CartesianGrid {...bevelGridProps} /><XAxis type="number" {...bevelAxisProps} label={{ value: unit, position: 'insideBottom', offset: -10 }} /><YAxis type="category" dataKey="zone" width={35} {...bevelAxisProps} /><Tooltip formatter={(v: number, name: string) => [`${format(v)} ${unit}`, name === 'width' ? 'Largeur de zone' : 'Début de zone']} /><Bar dataKey="start" stackId="range" fill="transparent" /><Bar dataKey="width" stackId="range" fill={colors.sky} radius={[0, 4, 4, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{sport === 'run' ? 'Allure seuil course requise' : 'FTP vélo requise'}</div>}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">{model.zones.zones.map(z => <div key={z.id}><span className="font-semibold">{z.id} </span>{z.label}<p className="text-muted-foreground">{model.reference == null ? 'Données insuffisantes' : z.absolute}</p></div>)}</div>
      </section>
    </div>
    <details className="border-t border-border text-sm"><summary className="min-h-11 flex items-center cursor-pointer font-medium">Sources et limites scientifiques</summary><div className="space-y-2 text-muted-foreground pb-4"><p>Mesure documentée : provenance explicite, protocole et capteur renseignés. Une saisie, un record Nolio ou un niveau de fiabilité ne certifient pas une mesure.</p><p>Les points correspondent aux bilans enregistrés jusqu’au bilan de référence. Les changements de capteur, de protocole ou de méthode limitent la comparaison. La demande en oxygène est modélisée ; aucun point de calorimétrie ou prélèvement lactate n’est inventé.</p><p>Bilan : {snapshot?.date ?? 'non renseigné'}. Les domaines et zones suivent la doctrine TFCL ; FTP, CP et MLSS ne sont pas interchangeables. Équivalence scientifique INSCYD non démontrée.</p></div></details>
  </section>;
}