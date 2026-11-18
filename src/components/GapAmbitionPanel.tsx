import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deriveRaceTargets, mapObjectiveToSport } from '@/lib/deriveRaceTargets';
import { formatPace, formatTime } from '@/lib/raceAnalysis';
import { normalizeObjective } from '@/lib/physiologicalTargets';

// Legacy mirror retained for plan compatibility. These are coaching scenarios,
// NOT age/sex-stratified population standards and are no longer diagnostic targets.
export const REFERENCE_STANDARDS_FRONT: Record<string, Record<string, string>> = {
  "5K":       { finish: "28-35", perf: "22-26", sub: "18-21", elite: "16-18", world_class: "sub15" },
  "10K":      { finish: "55-1h10", perf: "45-52", sub: "38-44", elite: "33-37", world_class: "sub31" },
  "Semi":     { finish: "2h00-2h30", perf: "1h35-1h55", sub: "1h20-1h35", elite: "1h12-1h20", world_class: "sub1h08" },
  "Marathon": { finish: "4h30-5h00", perf: "3h30-4h15", sub: "3h00-3h30", elite: "2h45-3h00", world_class: "sub2h35" },
};

export interface GapAmbitionPanelProps {
  vmaKmh?: number | null;
  thresholdPaceSecPerKm?: number | null;
  ambition?: string | null;
  ambitionEffective?: string | null;
  objective?: string | null;
  weeklyHours?: number | null;
  /** Explicit coach-entered time, never a physiological prediction. */
  targetTimeMinutes?: number | null;
}

export function GapAmbitionPanel({ vmaKmh, thresholdPaceSecPerKm, ambition, objective, weeklyHours, targetTimeMinutes }: GapAmbitionPanelProps) {
  const distances: Record<string, number> = { '5K': 5, '10km': 10, Semi: 21.0975, Marathon: 42.195 };
  const distance = distances[normalizeObjective(objective ?? '')];
  const requested = targetTimeMinutes != null && Number.isFinite(targetTimeMinutes) && targetTimeMinutes > 0 ? targetTimeMinutes * 60 : null;
  // Keep prediction separate from the request; do not feed the request back into it.
  const prediction = deriveRaceTargets({
    vmaKmh: vmaKmh ?? null,
    thresholdPaceSecPerKm: thresholdPaceSecPerKm ?? null,
    objective: objective ?? '', ambition: ambition ?? '', weeklyHours: weeklyHours ?? null,
    sport: mapObjectiveToSport(objective ?? ''),
  });
  const speed = requested && distance ? distance / requested * 3600 : null;
  const vmaFraction = speed && vmaKmh && Number.isFinite(vmaKmh) && vmaKmh > 0 ? speed / vmaKmh * 100 : null;
  const gap = requested && prediction.raceTimeSec ? (prediction.raceTimeSec - requested) / requested * 100 : null;
  return <Card className="border-primary/40">
    <CardHeader><CardTitle className="text-sm">Ambition et profil — objectif chronométrique explicite</CardTitle></CardHeader>
    <CardContent className="space-y-3 text-xs">
      {!requested && <p>Chrono visé non renseigné : le niveau d’ambition seul ne définit pas un temps, une VMA requise ou un volume minimal. Le classement par âge et sexe doit être établi sur les résultats de l’épreuve.</p>}
      <table className="w-full text-left"><tbody>
        <tr><th>Chrono demandé</th><td>{requested ? formatTime(requested) : 'Non renseigné'}</td></tr>
        <tr><th>Allure correspondante</th><td>{requested && distance ? formatPace(requested / distance) : 'Non calculable pour ce format'}</td></tr>
        <tr><th>Projection du modèle à partir du profil</th><td>{distance && prediction.raceTimeSec ? formatTime(prediction.raceTimeSec) : 'Non disponible'}</td></tr>
        <tr><th>Écart projection / demande</th><td>{distance && gap != null ? `${gap > 0 ? '+' : ''}${gap.toFixed(1)} % de temps` : 'Non calculable'}</td></tr>
        <tr><th>Vitesse demandée / VMA observée</th><td>{vmaFraction != null ? `${vmaFraction.toFixed(1)} %` : 'Non calculable'}</td></tr>
        <tr><th>Volume déclaré</th><td>{weeklyHours != null ? `${weeklyHours} h/semaine` : 'Non renseigné'}</td></tr>
      </tbody></table>
      <p className="text-muted-foreground">La projection est une estimation, pas une preuve de faisabilité. Vérifier seuil, endurance spécifique, entraînement toléré, délai et conditions de course. Un même chrono impose la même vitesse à tout âge et pour les deux sexes ; sa difficulté relative dépend de la catégorie. Aucun volume minimal ni pourcentage de VMA soutenable individuel n’est déduit du seul libellé d’ambition.</p>
    </CardContent>
  </Card>;
}
