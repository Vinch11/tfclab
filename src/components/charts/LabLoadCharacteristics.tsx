import { useMemo } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DbSnapshot } from '@/hooks/useCloudData';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import { labEnergyContribution, labLoadCharacteristics, labObservedPoints, type LabSport } from '@/lib/lab/loadCharacteristics';
import { BEVEL_CHART_COLORS as c, bevelAxisProps, bevelGridProps } from './bevelChartTheme';

type Series = { key: string; label: string; color: string; area?: boolean; stack?: string };
interface Props { input: CoachingCompassInput; snapshot: DbSnapshot; sport: LabSport; compare?: { input: CoachingCompassInput; date: string } | null }

export function LabLoadCharacteristics({ input, snapshot, sport, compare }: Props) {
  const model = useMemo(() => labLoadCharacteristics(input, sport), [input, sport]);
  const cmp = useMemo(() => compare ? labLoadCharacteristics(compare.input, sport) : null, [compare, sport]);
  const observed = useMemo(() => labObservedPoints(snapshot, input, sport), [snapshot, input, sport]);
  const contribution = useMemo(() => labEnergyContribution(input, sport), [input, sport]);
  const cmpContribution = useMemo(() => compare ? labEnergyContribution(compare.input, sport) : [], [compare, sport]);
  const rows = useMemo(() => model.rows.map((r, i) => ({ ...r, ...(cmp?.rows[i] ? { cmpOxygen: cmp.rows[i].oxygen, cmpLactate: cmp.rows[i].lactate, cmpFat: cmp.rows[i].fat, cmpCarbs: cmp.rows[i].carbs, cmpProduction: cmp.rows[i].production, cmpFatShare: cmp.rows[i].fatShare } : {}) })), [model, cmp]);
  const contrib = useMemo(() => contribution.map((r, i) => ({ ...r, cmpAerobic: cmpContribution[i]?.aerobic })), [contribution, cmpContribution]);
  const m = model.markers;
  const axisUnit = (i: number) => { const r = rows.find(x => x.intensity === i); return r?.watts ? `${r.watts} W` : r?.speed ? `${r.speed.toFixed(1)} km/h` : ''; };
  const markerLines = m ? [m.lt1 && ['LT1', m.lt1], m.lt2 && ['MLSS', m.lt2], m.fatmax && ['FatMax', m.fatmax]].filter(Boolean) as [string, number][] : [];
  const cards: { id: string; title: string; unit: string; series: Series[]; cmpKey?: string; note: string; dots?: 'oxygen' | 'lactate'; unavailable?: string }[] = [
    { id: 'o2', title: 'Demande métabolique et VO₂', unit: 'ml/kg/min', series: [{ key: 'oxygen', label: 'VO₂ TFCL', color: c.sky }], cmpKey: 'cmpOxygen', dots: 'oxygen', note: 'Besoin en oxygène à chaque intensité, plafonné par votre VO₂max. Courbe calculée depuis vos records Nolio ; aucun point d’oxygène mesuré n’est ajouté.' },
    { id: 'kin', title: 'Production et élimination du lactate', unit: 'débit relatif', series: [{ key: 'production', label: 'Production', color: c.rose }, { key: 'clearance', label: 'Élimination', color: c.mint }], cmpKey: 'cmpProduction', unavailable: sport === 'run' ? 'Cinétique lactate course non validée : rien n’est transposé du vélo.' : undefined, note: 'Quand la production rattrape la capacité d’élimination, le lactate ne se stabilise plus : c’est la zone du MLSS, marquée en pointillé.' },
    { id: 'lac', title: 'Lactate à l’état stable', unit: 'mmol/L', series: [{ key: 'lactate', label: 'Lactate TFCL', color: c.periwinkle }], cmpKey: 'cmpLactate', dots: 'lactate', unavailable: sport === 'run' ? 'Lactate course non validé : rien n’est transposé du vélo.' : undefined, note: 'Lactate attendu à intensité constante ; LT1 et MLSS sont marqués sur tous les graphiques.' },
    { id: 'sub', title: 'Graisses et glucides', unit: 'g/h', series: [{ key: 'fat', label: 'Lipides', color: c.mint }, { key: 'carbs', label: 'Glucides', color: c.amber }], cmpKey: 'cmpFat', note: 'Débits d’oxydation ; la bande FatMax indique où les lipides contribuent le plus. Pas une tolérance digestive.' },
    { id: 'share', title: 'Glucides et lipides en énergie', unit: '% énergie', series: [{ key: 'fatShare', label: 'Lipides', color: c.mint, area: true, stack: 's' }, { key: 'carbShare', label: 'Glucides', color: c.amber, area: true, stack: 's' }], cmpKey: 'cmpFatShare', note: 'Part de chaque carburant dans l’énergie produite, de l’endurance facile jusqu’à VO₂max.' },
  ];
  const empty = (t: string) => <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground px-6">{t}</div>;
  const tip = (unit: string) => ({ labelFormatter: (v: number) => `${v} % VO₂max${axisUnit(v) ? ' · ' + axisUnit(v) : ''}`, formatter: (v: number, name: string) => [`${Number(v).toFixed(1)} ${unit}`, name] });

  return <section className="space-y-5" aria-label="Load Characteristics TFCL">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold text-primary">LOAD CHARACTERISTICS</p><h3 className="text-xl font-semibold">Profil de charge · {sport === 'run' ? 'Course à pied' : 'Vélo'}</h3></div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><svg width="18" height="4" aria-hidden><path d="M0 2H18" stroke="currentColor" strokeWidth="3" /></svg>Courbe TFCL personnalisée · {snapshot.date}</span>{compare && <span className="flex items-center gap-2"><svg width="18" height="4" aria-hidden><path d="M0 2H18" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" /></svg>Comparé : {compare.date}</span>}<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-foreground" />Repères enregistrés du bilan</span></div></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map(card => <article key={card.id} className="min-w-0 rounded-lg border border-border bg-card p-4">
        <h4 className="font-semibold text-sm">{card.title}</h4><p className="text-xs text-muted-foreground">{card.unit} · axe % VO₂max</p>
        <div className="h-56 mt-3">{card.unavailable ? empty(card.unavailable) : !rows.length ? empty(`Données insuffisantes : ${model.missing.join(', ')}.`) :
          <ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} syncId="lab-load" margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid {...bevelGridProps} /><XAxis dataKey="intensity" type="number" domain={[20, 100]} {...bevelAxisProps} /><YAxis {...bevelAxisProps} width={44} domain={card.id === 'share' ? [0, 100] : ['auto', 'auto']} {...(card.id === 'share' ? { ticks: [0, 25, 50, 75, 100], allowDataOverflow: true } : {})} />
            <Tooltip {...tip(card.unit)} />
            {card.id === 'sub' && m?.fatmax && <ReferenceLine x={m.fatmax} stroke={c.mint} strokeWidth={14} strokeOpacity={0.15} />}
            {markerLines.map(([l, x]) => <ReferenceLine key={l} x={x} stroke={c.muted} strokeDasharray="3 4" label={{ value: l, position: 'insideTop', fontSize: 10 }} />)}
            {card.series.map(s => s.area ? <Area key={s.key} dataKey={s.key} name={s.label} stackId={s.stack} stroke={s.color} fill={s.color} fillOpacity={0.55} isAnimationActive={false} /> : <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} dot={false} isAnimationActive={false} />)}
            {compare && card.cmpKey && <Line dataKey={card.cmpKey} name={`Bilan ${compare.date}`} stroke={c.muted} strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />}
          </ComposedChart></ResponsiveContainer>}</div>
        <div className="flex flex-wrap gap-3 text-xs mt-2">{card.series.map(s => <span key={s.key} className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}</div>
        <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Lire ce graphique</summary><p className="mt-1 leading-relaxed">{card.note}</p></details>
      </article>)}
      <article className="min-w-0 rounded-lg border border-border bg-card p-4">
        <h4 className="font-semibold text-sm">Part aérobie / anaérobie</h4><p className="text-xs text-muted-foreground">% énergie · selon la durée d’effort</p>
        <div className="h-56 mt-3">{!contrib.length ? empty(sport === 'run' ? 'Modèle puissance–durée course non disponible : rien n’est transposé du vélo.' : 'Données insuffisantes.') :
          <ResponsiveContainer width="100%" height="100%"><ComposedChart data={contrib} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}><CartesianGrid {...bevelGridProps} /><XAxis dataKey="label" {...bevelAxisProps} interval={2} /><YAxis {...bevelAxisProps} width={44} domain={[0, 100]} /><Tooltip formatter={(v: number, n: string) => [`${Number(v).toFixed(0)} %`, n]} />
            <Area dataKey="aerobic" name="Aérobie" stackId="e" stroke={c.periwinkle} fill={c.periwinkle} fillOpacity={0.55} isAnimationActive={false} /><Area dataKey="anaerobic" name="Anaérobie" stackId="e" stroke={c.rose} fill={c.rose} fillOpacity={0.55} isAnimationActive={false} />
            {compare && <Line dataKey="cmpAerobic" name={`Aérobie ${compare.date}`} stroke={c.muted} strokeDasharray="4 4" dot={false} isAnimationActive={false} />}
          </ComposedChart></ResponsiveContainer>}</div>
        <div className="flex flex-wrap gap-3 text-xs mt-2"><span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: c.periwinkle }} />Aérobie</span><span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: c.rose }} />Anaérobie</span></div>
        <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Lire ce graphique</summary><p className="mt-1 leading-relaxed">Plus l’effort est court, plus la part anaérobie est grande. Calculé depuis votre courbe puissance–durée TFCL.</p></details>
      </article>
    </div>
    <div className="rounded-lg border border-border bg-card p-4"><h4 className="font-semibold text-sm">Vos valeurs réelles face au modèle TFCL</h4>
      {!observed.length ? <p className="text-sm text-muted-foreground mt-2">Aucun record ou repère enregistré dans ce bilan pour ce sport.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm mt-2"><thead><tr className="text-xs text-muted-foreground text-left"><th className="py-1.5 pr-3 font-normal">Repère</th><th className="pr-3 font-normal">Valeur</th><th className="pr-3 font-normal">% VO₂max</th><th className="pr-3 font-normal">Modèle TFCL</th><th className="pr-3 font-normal">Écart</th><th className="font-normal">Source</th></tr></thead>
        <tbody>{observed.map(o => <tr key={o.key} className="border-t border-border"><td className="py-1.5 pr-3">{o.label}</td><td className="pr-3 tabular-nums">{o.value}</td><td className="pr-3 tabular-nums">{o.intensity}</td><td className="pr-3 tabular-nums">{o.modelWatts ? `${o.modelWatts} W` : '—'}</td><td className="pr-3 tabular-nums">{o.gapPct == null ? '—' : `${o.gapPct > 0 ? '+' : ''}${o.gapPct} %`}</td><td className="text-xs text-muted-foreground">{o.source}</td></tr>)}</tbody></table></div>}
    </div>
  </section>;
}
