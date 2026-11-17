import { dayToNolioSteps, type TestingWeekNolioSession } from './testingWeekNolioSessions';
import type { NormDay } from './buildTestingWeekProtocolHTML';

/** Timed adaptation of multi-trial distance/time testing; not an INSCYD protocol. */
export const CRITICAL_SPEED_ASSESSMENT = {
  version: 'tfcl-cs-timed-v1',
  durationsSec: [180, 420, 720],
  offsetsDays: [0, 2, 4],
  references: [
    'https://doi.org/10.4172/2161-0673.1000101',
    'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1520914/full',
  ],
};

export function buildCriticalSpeedNolioSessions(): TestingWeekNolioSession[] {
  return CRITICAL_SPEED_ASSESSMENT.durationsSec.map((duration, i) => {
    const day: NormDay = {
      dayKey: `VC${i + 1}`, title: `Vitesse critique · effort ${duration / 60} min`,
      goal: 'Mesurer la distance maximale sur un effort continu ; vitesse critique et D′ après trois efforts validés.',
      sessionType: 'TEST', durationEstimateMin: 30 + duration / 60,
      warmup: [{ durationMin: 15, intensityLabel: 'Footing facile progressif' }, { durationMin: 5, intensityLabel: 'Préparation technique et mise en action progressive' }],
      main: [{ durationMin: duration / 60, intensityLabel: 'Effort maximal continu', notes: 'Parcourir la plus grande distance possible ; allure régulière, aucun repos dans cet effort. Marquer début et fin avec un tour manuel.' }],
      recovery: [{ durationMin: 10, intensityLabel: 'Retour au calme très facile' }],
      pacingRules: ['Parcours plat mesuré, idéalement piste ; même dispositif et conditions comparables.', 'Trois jours distincts, espacés ici de 48 h ; reporter si fatigue, douleur ou récupération incomplète.', 'Ce test ne remplace ni la VMA ni le seuil lactate.'],
      validityCriteria: ['Distance et temps réellement mesurés, sans arrêt ni récupération.', 'Effort maximal confirmé par le coach ; pas seulement une meilleure moyenne Nolio.'],
      dataToRecord: ['Distance en mètres, temps en secondes, date, séance Nolio, capteur et conditions.', 'Version du protocole : tfcl-cs-timed-v1.'],
    };
    const offset = CRITICAL_SPEED_ASSESSMENT.offsetsDays[i];
    return { weekNumber: 1 + Math.floor(offset / 7), dayIndex: offset % 7, sessionIndex: 0,
      sport: 'Course à pied', title: day.title, objectif: [day.goal, ...day.pacingRules, ...day.validityCriteria, ...day.dataToRecord].join('\n\n'),
      details: day.goal, isRest: false, structuredWorkout: dayToNolioSteps(day) };
  });
}