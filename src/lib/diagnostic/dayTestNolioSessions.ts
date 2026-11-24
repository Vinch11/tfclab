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
  return session('run', 'TFCL Track Day™ · VMA, VLamax, vitesse critique', 'Piste 400 m. Noter chaque temps et distance demandés. Efforts maximaux sans cible.' + ' ' + criticalGuide.run + ' ' + separateDay, [
    st('warmup', 900, 'Échauffement progressif : footing + gammes'),
    rep(3, [dist('active', 80, 'Ligne droite accélérée'), st('rest', 60, 'Retour en marchant')]),
    rep(2, [dist('active', 30, 'Sprint maximal 30 m départ arrêté — noter le temps'), st('rest', 180, 'Récupération complète')]),
    st('rest', 300, 'Récupération marche'),
    st('active', 15, 'Effort maximal 15 s lancé — noter la distance exacte'),
    st('rest', 480, 'Récupération complète'),
    dist('active', 1500, 'Test 1500 m à allure maximale stable — noter le temps et chaque tour'),
    st('rest', 1800, 'Récupération 30 min : marche, puis footing très lent les 10 dernières minutes'),
    dist('active', 3000, 'Test 3000 m à allure maximale régulière — noter le temps et chaque tour'),
    st('cooldown', 900, 'Retour au calme Z1 obligatoire'),
  ]);
}

export function buildBikeDayNolioSession(): TestingWeekNolioSession {
  // Sprints seulement : les efforts de 5 et 20 min, faits ici après 8 à 10 min de récupération,
  // partaient avec une réserve W′ entamée (≈ 65–86 % reconstituée après 6–15 min, Ferguson 2010).
  // La puissance 5 min et la CP se mesurent dans le « Bike Day · Puissance critique », un autre jour.
  return session('bike', 'TFCL Bike Day™ · Sprints et 30 s', 'Capteur de puissance. Noter les puissances demandées. Efforts maximaux sans cible.' + ' ' + criticalGuide.bike, [
    st('warmup', 900, 'Échauffement progressif Z2 → ouvertures'),
    rep(3, [st('active', 10, 'Sprint maximal 10 s départ arrêté — noter puissance pic et moyenne'), st('rest', 180, 'Récupération')]),
    st('rest', 480, 'Récupération Z1'),
    st('active', 30, 'Effort maximal 30 s (Wingate adapté) — noter puissance moyenne et pic'),
    st('cooldown', 900, 'Retour au calme Z1'),
  ]);
}

/**
 * Days dédiés à la vitesse et à la puissance critiques.
 * Course : 1000 m + 3000 m ; le 1500 m du Track Day donne le troisième point.
 * Vélo : 12, 5 et 3 min dans la même séance, 30 min de récupération entre chaque — trois durées de
 * 2 à 15 min, rapport 4 (politique TFCL, voir criticalEfforts) ; 30 min de récupération donnent une
 * CP valide (Karsten 2017). Le 5 min sert aussi de PMA mesurée.
 */
export const CRITICAL_DAYS = {
  run: { version: 'tfcl-cs-day-v1', distancesM: [1000, 3000], restMin: 30, thirdPoint: 'le 1500 m du Track Day', maxSec: 900 },
  bike: { version: 'tfcl-cp-day-v2', durationsSec: [720, 300, 180], restMin: 30, maxSec: 900 },
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
  const [t1, t2, t3] = CRITICAL_DAYS.bike.durationsSec;
  const rest = st('rest', CRITICAL_DAYS.bike.restMin * 60, 'Récupération très facile complète (Z1), 30 min. Tu peux pédaler très léger ou t’arrêter.');
  return session('bike', 'TFCL Bike Day™ · Puissance critique (12, 5 et 3 min)', [
    'Capteur de puissance, même vélo, home-trainer de préférence (mode résistance fixe, ERG désactivé). Trois efforts maximaux continus, 30 min de récupération entre chacun. Noter la puissance moyenne de chaque effort.',
    'Les trois points donnent la puissance critique (CP) et W′. Le 5 min donne aussi la PMA. La FTP du bilan en découle (CP × 0,965) : le test 20 min n’est plus nécessaire.',
    'Validité : reposé (pas d’intensité la veille), puissance mesurée sans interruption, effort régulier et maximal, mêmes conditions pour les trois efforts. Ne pas partir trop fort : le dosage régulier compte plus que le pic.',
    'Faire les sprints (10 s et 30 s) un autre jour, ou après ce protocole seulement s’il reste du temps : jamais avant.',
    'Version du protocole : ' + CRITICAL_DAYS.bike.version + '.',
  ].join('\n\n'), [
    st('warmup', 900, 'Échauffement progressif Z2, puis 2 ouvertures de 1 min à allure soutenue'),
    st('active', t1, 'Effort maximal 12 min, puissance régulière, ne pars pas trop fort. Noter la puissance moyenne.'),
    rest,
    st('active', t2, 'Effort maximal 5 min, puissance la plus régulière possible. Noter la puissance moyenne.'),
    { ...rest },
    st('active', t3, 'Effort maximal 3 min, puissance la plus régulière possible. Noter la puissance moyenne.'),
    st('cooldown', 600, 'Retour au calme Z1.'),
  ]);
}
