import { criticalGuide, separateDay } from "./durabilityDay";
import type { NolioStepLike, NolioRepStepLike, TestingWeekNolioSession } from './testingWeekNolioSessions';

/** Structured Track Day / Bike Day sessions, step-by-step from the printed protocols. Maximal efforts carry no target. */
const st = (intensity_type: NolioStepLike['intensity_type'], sec: number, notes: string): NolioStepLike =>
  ({ type: 'step', intensity_type, step_duration_type: 'duration', step_duration_value: sec, target_type: 'no_target', notes });
const dist = (intensity_type: NolioStepLike['intensity_type'], m: number, notes: string): NolioStepLike =>
  ({ type: 'step', intensity_type, step_duration_type: 'distance', step_duration_value: m, target_type: 'no_target', notes });
const rep = (value: number, steps: NolioStepLike[]): NolioRepStepLike => ({ type: 'repetition', intensity_type: 'repetition', value, steps });

const session = (sport: string, title: string, objectif: string, structuredWorkout: (NolioStepLike | NolioRepStepLike)[]): TestingWeekNolioSession =>
  ({ weekNumber: 1, dayIndex: 0, sessionIndex: 0, sport, title, objectif, details: objectif, isRest: false, structuredWorkout });

export function buildTrackDayNolioSession(): TestingWeekNolioSession {
  return session('run', 'TFCL Track Day™ · VMA, VLamax, seuil', 'Piste 400 m. Noter chaque temps et distance demandés. Efforts maximaux sans cible.' + ' ' + criticalGuide.run + ' ' + separateDay, [
    st('warmup', 900, 'Échauffement progressif : footing + gammes'),
    rep(3, [dist('active', 80, 'Ligne droite accélérée'), st('rest', 60, 'Retour en marchant')]),
    rep(2, [dist('active', 30, 'Sprint maximal 30 m départ arrêté — noter le temps'), st('rest', 180, 'Récupération complète')]),
    st('rest', 300, 'Récupération marche'),
    st('active', 15, 'Effort maximal 15 s lancé — noter la distance exacte'),
    st('rest', 480, 'Récupération complète'),
    dist('active', 1500, 'Test 1500 m à allure maximale stable — noter le temps et chaque tour'),
    st('rest', 600, 'Récupération active'),
    dist('active', 5000, '5 km allure seuil soutenable (RPE 8/10) — noter les temps au km'),
    st('cooldown', 900, 'Retour au calme Z1 obligatoire'),
  ]);
}

export function buildBikeDayNolioSession(): TestingWeekNolioSession {
  return session('bike', 'TFCL Bike Day™ · FTP, VLamax, PMA', 'Capteur de puissance. Noter les puissances demandées. Efforts maximaux sans cible.' + ' ' + criticalGuide.bike + ' ' + separateDay, [
    st('warmup', 900, 'Échauffement progressif Z2 → ouvertures'),
    rep(3, [st('active', 10, 'Sprint maximal 10 s départ arrêté — noter puissance pic et moyenne'), st('rest', 180, 'Récupération')]),
    st('rest', 480, 'Récupération Z1'),
    st('active', 30, 'Effort maximal 30 s (Wingate adapté) — noter puissance moyenne et pic'),
    st('rest', 600, 'Récupération complète Z1'),
    st('active', 300, 'Test 5 min à la puissance maximale soutenable — noter puissance moyenne'),
    st('rest', 600, 'Récupération active Z1-Z2'),
    st('active', 1200, 'Test 20 min à puissance maximale stable — noter puissance moyenne'),
    st('cooldown', 600, 'Retour au calme Z1'),
  ]);
}
