import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import type { BikeFit, CoherenceCheck, RunFit } from '@/lib/lab/nolioCalibration';
import { BEVEL_CHART_COLORS as c, bevelAxisProps, bevelGridProps } from './bevelChartTheme';
import { cn } from '@/lib/utils';

const dur = (s: number) => s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.round(s / 360) / 10} h`;
const badge: Record<CoherenceCheck['level'], string> = { ok: 'bg-success/15 text-foreground', warn: 'bg-warning/20 text-foreground', alert: 'bg-destructive/15 text-destructive' };
const badgeLabel: Record<CoherenceCheck['level'], string> = { ok: 'Cohérent', warn: 'À vérifier', alert: 'Contradiction' };

interface Props { sport: 'bike' | 'run'; bike: BikeFit | null; run: RunFit | null; checks: CoherenceCheck[]; loading: boolean; recordCount: number; windowMonths: number; range: string | null }

export function LabNolioCalibration({ sport, bike, run, checks, loading, recordCount, windowMonths, range }: Props) {
  const fit = sport === 'bike' ? bike : null;
  return <section className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5" aria-label="Recalage Nolio">
    <div><p className="text-xs font-semibold text-primary">RECALAGE NOLIO</p><h3 className="text-xl font-semibold">Vos records Nolio face au modèle TFCL</h3>
      <p className="text-sm text-muted-foreground mt-1">{loading ? 'Lecture des records Nolio…' : `${recordCount} records Nolio sur ${windowMonths} mois avant le bilan${range ? ` (${range})` : ''}.`} {sport === 'bike' ? (fit ? 'VO₂max et VLamax sont ajustées pour reproduire vos meilleurs efforts de 30 s à 20 min ; les graphiques ci-dessous utilisent ces valeurs recalées.' : '') : 'En course, la vitesse critique est tirée de vos meilleures allures de 3 à 20 min ; rien n’est repris du vélo.'}</p></div>
    {sport === 'bike' && (fit ? <>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['VO₂max recalée', `${fit.vo2max}`, 'ml/kg/min'], ['VLamax recalée', fit.vlamax.toFixed(2), 'mmol/L/s'], ['MLSS recalé', `${fit.mlssW}`, `W · ${Math.round(fit.mlssPct)} % VO₂max`], ['Écart modèle ↔ records', `${fit.errorPct}`, `% · ${fit.n} durées`]].map(([l, v, u]) => <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-xl font-semibold tabular-nums">{v} <span className="text-xs font-normal text-muted-foreground">{u}</span></dd></div>)}
      </dl>
      {fit.atBound && <p className="text-xs text-destructive">Le recalage touche une limite (VO₂max ±15 % du bilan ou VLamax 0,15–0,90) : le bilan et les records Nolio se contredisent fortement.</p>}
      <div className="h-64"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={fit.points} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid {...bevelGridProps} /><XAxis dataKey="durationSec" type="number" scale="log" domain={['dataMin', 'dataMax']} tickFormatter={dur} {...bevelAxisProps} /><YAxis {...bevelAxisProps} width={56} domain={["auto", "auto"]} unit=" W" />
        <Tooltip labelFormatter={(v: number) => dur(v)} formatter={(v: number, n: string) => [`${v} W`, n]} />
        <Line dataKey="bilan" name="Modèle du bilan" stroke={c.muted} strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        <Line dataKey="fitted" name="Modèle recalé Nolio" stroke={c.periwinkle} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Scatter dataKey="observed" name="Record Nolio" fill={c.amber} isAnimationActive={false} />
      </ComposedChart></ResponsiveContainer></div>
      <p className="text-xs text-muted-foreground">Points : records Nolio (vélo route et home-trainer). Trait plein : modèle recalé. Pointillé : modèle du bilan. Les efforts de moins de 30 s (force neuromusculaire) ne servent pas au recalage.</p>
    </> : !loading && <p className="text-sm text-muted-foreground">Pas assez de records vélo sur cette période : au moins quatre durées, dont un effort ≤ 2 min et un ≥ 5 min, sont nécessaires. Aucune courbe de remplacement n’est inventée.</p>)}
    {sport === 'run' && (run ? <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {[['Vitesse critique', `${run.csKmh}`, 'km/h'], ['D′', `${run.dPrimeM}`, 'm'], ['Meilleur 6 min', run.vma6Kmh ? `${run.vma6Kmh}` : '—', 'km/h']].map(([l, v, u]) => <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-xl font-semibold tabular-nums">{v} <span className="text-xs font-normal text-muted-foreground">{u}</span></dd></div>)}
    </dl> : !loading && <p className="text-sm text-muted-foreground">Pas assez d’allures Nolio entre 3 et 20 min pour la course.</p>)}
    {checks.filter(k => k.sport === sport || k.sport === 'both').length > 0 && <div className="space-y-2"><h4 className="text-sm font-semibold">Contrôle de cohérence bilan ↔ Nolio</h4>
      <ul className="divide-y divide-border">{checks.filter(k => k.sport === sport || k.sport === 'both').map(k => <li key={k.key} className="py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-medium min-w-40">{k.label}</span><span className="tabular-nums">Bilan {k.bilan}</span><span className="tabular-nums">Nolio {k.nolio}</span>{k.gapPct != null && <span className="tabular-nums text-muted-foreground">{k.gapPct > 0 ? '+' : ''}{k.gapPct} %</span>}
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge[k.level])}>{badgeLabel[k.level]}</span><span className="basis-full text-xs text-muted-foreground">{k.note}</span></li>)}</ul></div>}
  </section>;
}
