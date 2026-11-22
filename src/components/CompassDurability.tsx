import type { CoachingCompassInput } from '@/lib/coachingCompass';
import { pairedDecoupling, type EnduranceSport } from '@/lib/diagnostic/durabilityDay';
import { durabilityReading, parseStoredDurability } from '@/lib/durability/longSessionDurability';

export function CompassDurability({ input, sport }: { input: CoachingCompassInput; sport: EnduranceSport }) {
  const pair = input.durabilityPairs?.find(row => row.sport === sport);
  const change = pair ? pairedDecoupling(pair) : null;
  const longSessions = parseStoredDurability(input.criticalMetrics)[sport];
  const unit = sport === 'run' ? 'min/km' : 'W';
  return <div className="mt-3 rounded-xl border px-3 py-2">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h4 className="text-sm font-semibold">Durabilité après effort prolongé</h4>
      <span className="text-sm font-medium">{change != null
        ? (change > 0 ? '+' : '') + change.toLocaleString('fr-BE', { maximumFractionDigits: 1 }) + ' % de découplage'
        : longSessions ? 'Indice de sorties longues' : 'À mesurer'}</span>
    </div>
    {pair && change != null && <p className="mt-1 text-xs">{pair.day} · {pair.between} min entre les blocs · {pair.early} → {pair.late} {unit} · {pair.hr1} → {pair.hr2} bpm · ressenti {pair.rpe1} → {pair.rpe2}/10. {pair.context}</p>}
    <details className="text-xs"><summary className="cursor-pointer py-2">Comment la mesurer</summary>
      <p>Comparer deux blocs de 10 min à la même cible, au début et vers la fin d’une sortie habituelle. Une valeur positive indique une baisse de {sport === 'bike' ? 'puissance' : 'vitesse'} par battement. Répéter à charge préalable, terrain, température et ravitaillement comparables.</p>
      {longSessions && <p className="mt-2">{durabilityReading(sport, longSessions)}</p>}
      <p className="mt-2"><a className="underline" href={'/diagnostic/tests?module=durability-' + sport}>Ouvrir le protocole {sport === 'run' ? 'course' : 'vélo'}</a> · <a className="underline" href="https://doi.org/10.1113/EP092120" target="_blank" rel="noreferrer">Hunter et al., 2025</a></p>
    </details>
  </div>;
}
