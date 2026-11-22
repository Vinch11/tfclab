import { useId, useState } from 'react';
import { fieldIntensity } from '@/lib/diagnostic/fieldHold';
import { Button } from '@/components/ui/button';
import type { ProfileComparison } from '@/lib/coachingCompass/profileComparison';

const format = (value: number) => value.toLocaleString('fr-BE', { maximumFractionDigits: 2 });
const display = (m: ProfileComparison, value: number) => m.key === 'raceSpeed' ? fieldIntensity('run', 3600 / value) : format(value) + ' ' + m.unit;
const formatValue = (m: ProfileComparison) => {
  if (m.observationLabel) return m.observationLabel;
  if (m.value == null) return m.key === 'raceSpeed' ? 'Chrono absent' : 'À mesurer';
  const estimated = m.source === 'records' || m.source.startsWith('estimat') || m.source === 'power_model' || m.source === 'test';
  return (estimated ? '≈ ' : '') + display(m, m.value);
};
const referenceKind = (m: ProfileComparison) => m.reference?.kind === 'cohort' ? 'Moyenne publiée' : m.reference?.kind === 'goal' ? 'Objectif personnel' : 'Repère TFCL';
const referenceLabel = (m: ProfileComparison) => m.reference ? referenceKind(m) + ' · ' + (m.reference.high !== m.reference.low ? format(m.reference.low) + '–' + display(m, m.reference.high) : display(m, m.reference.low)) : 'sans repère chiffré';
const point = (index: number, count: number, radius: number) => {
  const angle = -Math.PI / 2 + index * 2 * Math.PI / count;
  return { x: 240 + Math.cos(angle) * radius, y: 220 + Math.sin(angle) * radius };
};
const coordinates = (points: Array<{ x: number; y: number }>) => points.map(p => `${p.x},${p.y}`).join(' ');

/** Relative geometry is a display comparison, never a diagnostic score. */
export function CompassProfileRadar({ metrics, athleteName }: { metrics: ProfileComparison[]; athleteName?: string }) {
  const id = useId();
  const axes = metrics.filter(m => ['tte', 'vo2max', 'vma', 'ftpkg', 'raceSpeed'].includes(m.key));
  const [selected, setSelected] = useState<string | null>(null);
  const active = axes.find(m => m.key === selected);
  const complete = axes.length >= 3 && axes.every(m => m.reference && m.value != null);
  const targetRadius = 108;
  const targetPoints = axes.map((m, i) => m.reference ? point(i, axes.length, targetRadius) : null);
  const athletePoints = axes.map((m, i) => {
    const target = m.reference?.low;
    return m.value != null && target != null && target > 0 ? point(i, axes.length, Math.min(155, targetRadius * m.value / target)) : null;
  });
  return <div className="compass-radar-stage">
    {axes.length >= 3 ? <>
      <svg viewBox="0 0 480 440" className="compass-radar-plot" role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>Profil physiologique de {athleteName || 'l’athlète'}</title>
        <desc id={`${id}-description`}>Profil comparé aux repères de l’objectif. Chaque axe a sa propre unité. Les valeurs absentes ne sont pas reliées. {axes.map(m => `${m.label} : ${formatValue(m)}, repère ${referenceLabel(m)}`).join('; ')}</desc>
        {[36, 72, 108, 144].map(r => <polygon key={r} points={coordinates(axes.map((_, i) => point(i, axes.length, r)))} className="compass-radar-grid" />)}
        {axes.map((m, i) => { const end = point(i, axes.length, 144); return <line key={m.key} x1="240" y1="220" x2={end.x} y2={end.y} className="compass-radar-axis" />; })}
        {targetPoints.every(p => p != null) ? <polygon points={coordinates(targetPoints.filter((p): p is {x:number;y:number} => p != null))} className="compass-radar-target" /> : targetPoints.map((p, i) => { const next = targetPoints[(i + 1) % targetPoints.length]; return p ? <g key={i}>{next && <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} className="compass-radar-target" />}<circle cx={p.x} cy={p.y} r="3" className="compass-radar-target" /></g> : null; })}
        {complete && <polygon points={coordinates(athletePoints.filter((p): p is { x: number; y: number } => p != null))} className="compass-radar-profile" />}
        {!complete && athletePoints.map((p, i) => {
          const next = athletePoints[(i + 1) % athletePoints.length];
          return p && next ? <line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y} className="compass-radar-segment" /> : null;
        })}
        {axes.map((m, i) => {
          const label = point(i, axes.length, 178);
          const p = athletePoints[i];
          return <g key={m.key}>
            {p && <><circle cx={p.x} cy={p.y} r="7" className="compass-radar-dot-halo" /><circle cx={p.x} cy={p.y} r="3.5" className="compass-radar-dot" /></>}
            <text x={label.x} y={label.y - 9} textAnchor="middle" className="compass-radar-label">{m.label}{m.reference?.kind === 'cohort' ? ' · cohorte' : ''}</text>
            <text x={label.x} y={label.y + 13} textAnchor="middle" className="compass-radar-value">{formatValue(m)}</text>
            {m.reference && <text x={label.x} y={label.y + 31} textAnchor="middle" className="compass-radar-label">{m.reference.kind === 'cohort' ? 'Moy.' : m.reference.kind === 'goal' ? 'Visé' : 'Repère'} {m.key === 'raceSpeed' ? display(m, m.reference.low) : format(m.reference.low)}</text>}
          </g>;
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><span className="compass-legend-athlete" />{athleteName || 'Athlète'}</span>
        <span className="inline-flex items-center gap-2"><span className="compass-legend-target" />Repères pour l’objectif</span>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-1" aria-label="Repères du graphique">
        {axes.map(m => <Button key={m.key} variant={selected === m.key ? 'secondary' : 'ghost'} className="min-h-11 text-xs" onClick={() => setSelected(selected === m.key ? null : m.key)} aria-pressed={selected === m.key}>{m.label}</Button>)}
      </div>
      {active && <div className="mt-3 border-l-2 border-primary pl-4 text-sm" aria-live="polite"><span className="font-semibold">{active.label} · {formatValue(active)}</span><span className="block text-muted-foreground">{active.reference ? `${referenceLabel(active)}` : 'Référence non établie · valeur personnelle uniquement'}{active.observationLabel ? ' · Résultat du protocole de tenue' : active.value == null ? ' · Mesure manquante' : active.reference && active.value > active.reference.low * 155 / targetRadius ? ' · Valeur au-delà du cadre graphique' : ''}</span></div>}
      {active?.key === 'tte' && <p className="mt-1 text-xs text-muted-foreground">Temps tenu en continu au seuil de la discipline. Un arrêt volontaire donne une durée minimale. Les minutes du repère sont une estimation de coaching.</p>}
      {active?.reference?.note && <p className="text-xs text-muted-foreground">{active.reference.note}</p>}
      {!complete && <p className="mt-3 text-center text-xs text-muted-foreground">Un point apparaît quand la mesure et son repère sont disponibles.</p>}
      {axes.some(m => !m.reference) && <p className="mt-2 text-center text-xs text-muted-foreground">{axes.filter(m => !m.reference).map(m => m.label).join(' · ')} : référence non établie, valeur personnelle uniquement.</p>}
    </> : <div className="py-16 text-center"><p className="text-lg font-semibold">Profil à compléter</p><p className="mt-2 text-sm text-muted-foreground">Données insuffisantes pour un profil comparé.</p></div>}
    {metrics.filter(m => m.key === 'vlamax').map(m => <div key={m.key} className="mt-5 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">VLamax <span className="text-xs text-muted-foreground">· repère glycolytique</span></span><span className="text-lg font-semibold tabular-nums">{formatValue(m)}</span></div>
      {m.reference && <><div className="relative mt-3 h-2 rounded-full bg-muted"><span className="absolute inset-y-0 rounded-full bg-primary/25" style={{ left: `${m.lowPosition ?? 0}%`, width: `${Math.max((m.highPosition ?? 0) - (m.lowPosition ?? 0), 1)}%` }} />{m.position != null && <span className="absolute -top-1 h-4 w-1 rounded-full bg-foreground ring-2 ring-background" style={{ left: `${m.position}%` }} />}</div><p className="mt-2 text-xs text-muted-foreground">Plage TFCL · {format(m.reference.low)}–{format(m.reference.high)} {m.unit} · repère de coaching par discipline et distance</p></>}
    </div>)}
  </div>;
}