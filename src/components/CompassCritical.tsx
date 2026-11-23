import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import { fmt, observedRows } from '@/lib/coachingCompass/factorStates';
import { MeasureStatus } from './ObservedFactors';

type Sport = 'run' | 'bike';
const KEYS = ['cp', 'wprime', 'cs', 'dprime'];

/** Seuil critique et réserve anaérobie dans le profil détaillé : valeurs de l'athlète, sans cible ni classement. */
export function CompassCritical({ input, sport }: { input: CoachingCompassInput; sport: Sport }) {
  const rows = observedRows(input, sport).filter(r => KEYS.includes(r.key));
  if (!rows.length) return null;
  return <div className="mt-3 rounded-xl border px-3 py-2" aria-label={'Seuil critique · ' + (sport === 'run' ? 'course' : 'vélo')}>
    <h4 className="text-sm font-semibold">Seuil critique</h4>
    <ul className="mt-1 space-y-2">
      {rows.map(r => <li key={r.key} className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm">{r.label}</span>
          <span className="text-sm font-medium tabular-nums">{r.value == null ? 'À mesurer' : fmt(r.value) + ' ' + r.unit}</span>
        </div>
        {r.caption && <p className="text-xs text-muted-foreground">{r.caption}</p>}
        <MeasureStatus r={r} />
      </li>)}
    </ul>
    <details className="text-xs"><summary className="cursor-pointer py-2">Comment lire</summary>
      <p>{rows[0].basis}</p>
    </details>
  </div>;
}
