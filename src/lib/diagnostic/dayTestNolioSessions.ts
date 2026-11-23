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

/**
 * Days dédiés à la vitesse et à la puissance critiques. Chaque Day fournit deux efforts maximaux ;
 * le troisième point vient du Day existant (1500 m du Track Day, 5 min du Bike Day), ce qui donne
 * trois durées d'au moins 2 min et d'un rapport ≥ 3, conditions de la politique TFCL (voir criticalEfforts).
 */
export const CRITICAL_DAYS = {
  run: { version: 'tfcl-cs-day-v1', distancesM: [1000, 3000], restMin: 30, thirdPoint: 'le 1500 m du Track Day', maxSec: 900 },
  bike: { version: 'tfcl-cp-day-v1', durationsSec: [180, 720], restMin: 30, thirdPoint: 'le test 5 min du Bike Day', maxSec: 900 },
} as const;

export function buildCriticalTrackDayNolioSession(): TestingWeekNolioSession {
  const [d1, d2] = CRITICAL_DAYS.run.distancesM;
  return session('run', 'TFCL Track Day™ · Vitesse critique (1000 m + 3000 m)', [
    'Piste 400 m. Deux efforts maximaux continus, 30 min de récupération entre les deux. Noter le temps de chaque effort au dixième de seconde.',
    'Ces deux points servent à la vitesse critique (CS) et à D′. Le troisième point est ' + CRITICAL_DAYS.run.thirdPoint + ' (même période de 28 jours) ; avec deux points seulement, la CS reste une estimation.',
    'Validité : parcours plat mesuré, aucun arrêt dans l’effort, même piste et mêmes conditions pour les trois efforts, reposé. Si le 3000 m dépasse 15 min, le remplacer par un 2000 m.',
    'Les deux efforts sont dans la même séance : le second peut être un peu pénalisé par le premier. Si possible, répéter un autre jour pour confirmer.',
    'Version du protocole : ' + CRITICAL_DAYS.run.version + '.',
  ].join('\n\n'), [
    st('warmup', 900, 'Échauffement à ton aise : footing calme + éducatifs + 1 à 2 accélérations de 15 s, récupération 1 min'),
    dist('active', d1, '2,5 tours de piste à effort maximal. Essaie de garder un effort constant et lissé au maximum. Noter le temps.'),
    st('rest', CRITICAL_DAYS.run.restMin * 60, 'Tu as maintenant 30 min de repos : tu peux courir, marcher ou alterner. Objectif : récupérer au mieux.'),
    dist('active', d2, '7,5 tours de piste à effort maximal. Essaie de garder un effort constant et de lisser ton effort au mieux. Noter le temps.'),
    st('cooldown', 600, 'Tu peux trottiner à ton aise pour récupérer.'),
  ]);
}

export function buildCriticalBikeDayNolioSession(): TestingWeekNolioSession {
  const [t1, t2] = CRITICAL_DAYS.bike.durationsSec;
  return session('bike', 'TFCL Bike Day™ · Puissance critique (3 min + 12 min)', [
    'Capteur de puissance, même vélo et même parcours plat ou home-trainer pour les efforts. Deux efforts maximaux continus, 30 min de récupération entre les deux. Noter la puissance moyenne de chaque effort.',
    'Ces deux points servent à la puissance critique (CP) et à W′. Le troisième point est ' + CRITICAL_DAYS.bike.thirdPoint + ' (même période de 28 jours) ; avec deux points seulement, la CP reste une estimation.',
    'Validité : puissance mesurée sans interruption, effort régulier et maximal, reposé, mêmes conditions pour les trois efforts. Ne pas partir trop fort : le dosage régulier compte plus que le pic.',
    'Les deux efforts sont dans la même séance : le second peut être un peu pénalisé par le premier. Si possible, répéter un autre jour pour confirmer.',
    'Version du protocole : ' + CRITICAL_DAYS.bike.version + '.',
  ].join('\n\n'), [
    st('warmup', 900, 'Échauffement progressif Z2, puis 2 ouvertures de 1 min à allure soutenue'),
    st('active', t1, 'Effort maximal 3 min, puissance la plus régulière possible. Noter la puissance moyenne.'),
    st('rest', CRITICAL_DAYS.bike.restMin * 60, 'Récupération très facile complète (Z1). Tu peux pédaler très léger ou t’arrêter.'),
    st('active', t2, 'Effort maximal 12 min, puissance régulière, ne pars pas trop fort. Noter la puissance moyenne.'),
    st('cooldown', 600, 'Retour au calme Z1.'),
  ]);
}
