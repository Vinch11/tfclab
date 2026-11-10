import type { SnapshotRecordFields } from './nolioV2Records';

export interface NolioTestSession { id: string; name: string; date: string; sport: string }
export interface ThresholdStreams { time: number[]; watts: (number | null)[]; speed: (number | null)[] }
export interface ThresholdReview {
  sport: 'cycling' | 'running'; session: NolioTestSession; reference: NolioTestSession;
  target: number; start: number; end: number; streams: ThresholdStreams;
  athleteConfirmed: boolean; referenceConfirmed: boolean; continuousConfirmed: boolean; exhaustionConfirmed: boolean;
}

/** Selected measured timestamps, never record windows or total session duration. */
export function evaluateThresholdProtocol(review: ThresholdReview): { fields: SnapshotRecordFields; errors: string[]; minutes: number | null; notes: string } {
  const errors: string[] = [];
  const { session, reference, start, end, target, sport, streams } = review;
  if (!review.athleteConfirmed) errors.push('Correspondance de l’athlète à confirmer.');
  if (!review.referenceConfirmed) errors.push('Seuil mesuré lors du test préalable à confirmer.');
  if (!review.continuousConfirmed) errors.push('Effort continu, sans récupération ni interruption, à confirmer.');
  if (!review.exhaustionConfirmed) errors.push('Arrêt par épuisement à confirmer ; un arrêt programmé ne mesure pas la TTE.');
  if (!session.id || !reference.id || session.id === reference.id || !reference.date || !session.date || reference.date >= session.date) errors.push('Le test du seuil doit précéder le test de durée, dans une autre séance.');
  if (reference.sport !== session.sport) errors.push('Le test préalable et le test de durée doivent appartenir au même sport sélectionné.');
  if (!Number.isFinite(target) || target <= 0) errors.push('Seuil préalable manquant.');
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) errors.push('Début et fin du segment invalides.');
  const values = sport === 'cycling' ? streams.watts : streams.speed;
  const first = streams.time.indexOf(start), last = streams.time.indexOf(end);
  if (first < 0 || last <= first || values.length !== streams.time.length) errors.push('Données insuffisantes : bornes ou mesures du segment absentes.');
  else {
    let belowSince: number | null = null;
    for (let i = first; i <= last; i++) {
      const t = streams.time[i], v = values[i];
      if (!Number.isFinite(t) || (i > first && (t <= streams.time[i - 1] || t - streams.time[i - 1] > 5)) || v === null || !Number.isFinite(v) || v <= 0) {
        errors.push('Données insuffisantes : interruption, valeur absente ou échantillonnage supérieur à 5 secondes.'); break;
      }
      const outside = sport === 'cycling' ? v < target * 0.97 : Math.abs(1000 / v - target) > 5;
      if (outside) {
        belowSince ??= t;
        if (t - belowSince > 30) { errors.push('Le segment ne respecte pas le maintien du seuil : écart prolongé au-delà de 30 secondes.'); break; }
      } else belowSince = null;
    }
  }
  const minutes = Number.isFinite(end - start) ? (end - start) / 60 : null;
  if (minutes === null || minutes < 1 || minutes > 120) errors.push('Durée hors des bornes du bilan (1 à 120 minutes).');
  // The CAP reference protocol is capped at 45 min: reaching the cap is censored, not exhaustion.
  if (sport === 'running' && minutes !== null && minutes >= 45) errors.push('Plafond de 45 minutes du protocole course atteint : durée minimale seulement, pas une TTE mesurée.');
  const fields: SnapshotRecordFields = {};
  if (!errors.length && minutes !== null) fields[sport === 'cycling' ? 'tte_observed_min' : 'tte_observed_min_run'] = String(Math.round(minutes * 100) / 100);
  const notes = `Nolio — protocole TTE ${sport === 'cycling' ? 'D7 vélo' : 'D6 course'} confirmé par le coach | ${session.date} | ${session.id} | segment ${start}–${end} s | seuil préalable ${target} ${sport === 'cycling' ? 'W' : 's/km'} | ${reference.date} | ${reference.id} | durée ${minutes === null ? '?' : Math.round(minutes * 100) / 100} min | effort continu jusqu’à épuisement ; ni record ni validation automatique du MLSS.`;
  return { fields, errors: [...new Set(errors)], minutes, notes };
}