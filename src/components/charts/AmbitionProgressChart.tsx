import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { AMBITION_LEVELS_ORDERED, DEFAULT_AMBITION, getAmbitionDefinition, type AmbitionLevel } from '@/types/ambitionLevel';
import type { DbSnapshot } from '@/hooks/useCloudData';
import { ambitionProgressMetrics } from '@/lib/ambitionProgress';
import { getTargetCalibration } from '@/lib/targetCalibration';
import { cn } from '@/lib/utils';

interface Props {
  snapshots: DbSnapshot[];
  objectif: string;
  ambition?: AmbitionLevel;
  weightKg?: number | null;
  age?: number | null;
  sex?: string | null;
  className?: string;
}
const colors = ['#64748b', '#0284c7', '#d97706', '#ea580c', '#9333ea'];

export function AmbitionProgressChart({ snapshots, objectif, ambition = DEFAULT_AMBITION, weightKg, age = null, sex = null, className }: Props) {
  const [metric, setMetric] = useState<'expression' | 'tte' | 'vlamax'>('expression');
  const [compare, setCompare] = useState(false);
  const sorted = useMemo(() => [...snapshots].filter(s => s.date).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).slice(-12), [snapshots]);
  const current = ambitionProgressMetrics(sorted.at(-1) ?? {}, objectif, ambition, age, weightKg);
  const data = sorted.map(snapshot => ({
    date: snapshot.date,
    ...Object.fromEntries(AMBITION_LEVELS_ORDERED.map(level => [level, ambitionProgressMetrics(snapshot, objectif, level, age, weightKg)[metric].progress])),
  }));
  const levels = compare ? AMBITION_LEVELS_ORDERED : [ambition];
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader><CardTitle className="text-base">Évolution par rapport aux repères de coaching</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <label>Métrique{' '}
            <select className="bg-background border rounded p-1" value={metric} onChange={e => setMetric(e.target.value as typeof metric)}>
              {Object.entries(current).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} /> Comparer les ambitions</label>
        </div>
        {sorted.length < 2 ? <p className="text-sm text-muted-foreground">Deux bilans sont nécessaires pour suivre une évolution.</p> : (
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis unit="%" domain={[0, 'auto']} /><Tooltip formatter={(value: number) => `${value.toFixed(1)} % du repère`} /><Legend />
              <ReferenceLine y={100} stroke="#64748b" strokeDasharray="4 4" />
              {levels.map(level => <Line key={level} dataKey={level} name={getAmbitionDefinition(level).label} stroke={colors[AMBITION_LEVELS_ORDERED.indexOf(level)]} connectNulls={false} />)}
            </LineChart>
          </ResponsiveContainer></div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {Object.entries(current).map(([key, item]) => <div key={key} className="rounded bg-muted/30 p-2">
            <p>{item.label}</p><p className="font-semibold">{item.value?.toFixed(key === 'vlamax' ? 2 : 1) ?? 'Non renseigné'} {item.unit}</p>
            <p>Repère : {key === 'vlamax' ? `${current.vlamax.range.min.toFixed(2)}–${current.vlamax.range.max.toFixed(2)}` : item.target?.toFixed(1) ?? 'Non défini'} {item.unit}</p>
          </div>)}
        </div>
        <p className="text-xs text-muted-foreground">{getTargetCalibration(age, sex).note}</p>
        <p className="text-xs text-muted-foreground">Comparaison métrique par métrique, sans score global ni date prédite de réussite. 100 % signifie atteindre le repère, pas valider l’ambition. VLamax : position dans une fourchette, une valeur plus basse n’est pas toujours meilleure. Pour un triathlon, ces séries décrivent le vélo uniquement. Les protocoles doivent rester comparables entre bilans.</p>
      </CardContent>
    </Card>
  );
}
