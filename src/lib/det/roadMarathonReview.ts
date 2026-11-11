import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import {getDoctrineDomain} from '@/lib/zones/tfclDoctrine';
import {formatPace} from '@/lib/raceAnalysis';
import {resolveCoachHoursReference} from '@/engines/plan/sessionSizingMatrix';
import type {AppPlanningDetDraft} from './appPlanningDetDraft';
import type {V3PlanProposal} from './appPlanningV3Proposal';
import {engineLimit, incompatible, missingData} from './coachDecision';
import {detObjectiveGoal} from './ordinaryObjective';
import {domainMinutes} from './v3SportingPrescription';
import {roadReturnSources} from '../../../scripts/library-v3/roadReturnSources';
import {evaluateV3Workout} from '../../../scripts/library-v3/catalogueRuntime';
import {previewV3SourceDose} from '../../../experimental/det-engine/v31-v3-catalogue';

const marathonKm = 42.195;
const minutes = (value: number) => Number(value.toFixed(1)).toLocaleString('fr-FR');
const pace = (seconds: number) => formatPace(Math.round(seconds));

function marathonTarget(config: PlanConfig) {
  return config.raceGoals?.find(event => event.priority === 'A' && detObjectiveGoal(event.objective) === 'marathon')?.targetTimeMinutes;
}

/** Check the same domain that the V3 target resolver applies to each marathon block.
 * A conservative finishing target need not generate any work at marathon intensity. */
export function checkMarathonTarget(config: PlanConfig, threshold: number | null | undefined, prescribeSpecificWork: boolean) {
  const goals = config.raceGoals?.filter(event => event.priority === 'A' && detObjectiveGoal(event.objective) === 'marathon') ?? [];
  const target = goals[0]?.targetTimeMinutes;
  if (goals.some(event => event.targetTimeMinutes == null) && goals.some(event => event.targetTimeMinutes != null)) {
    throw engineLimit('Le calendrier réunit des marathons de priorité A avec et sans chrono. DET ne peut pas attribuer les blocs à une seule de ces courses. Désigner le marathon qui pilote les allures de cette préparation.');
  }
  if (goals.some(event => (event.targetTimeMinutes ?? null) !== (target ?? null))) {
    throw engineLimit('Les marathons de priorité A demandent des prescriptions chronométriques différentes. DET utilise une allure spécifique pour ce calendrier. Désigner le marathon qui pilote ce plan ou préparer ces échéances séparément.');
  }
  if (target == null) return;
  if (!Number.isFinite(target) || target <= 0) {
    throw missingData('Renseigner un chrono marathon positif, en minutes, pour la course A.', 'raceGoals.targetTimeMinutes');
  }
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold <= 0) {
    throw missingData('Renseigner l’allure au seuil en course à pied (min/km) pour comparer le chrono marathon aux repères de ce coureur.', 'athlete.paceThresholdSecPerKm');
  }
  const targetPace = target * 60 / marathonKm;
  const domain = getDoctrineDomain('marathon_pace').run!;
  const fraction = threshold / targetPace;
  if (fraction >= domain.min && fraction <= domain.max) return targetPace;
  const reference = 'Le chrono visé correspond à ' + pace(targetPace) + '. Avec un seuil à ' + pace(threshold) +
    ', le domaine marathon de TFCLab va de ' + pace(threshold / domain.max) + ' à ' + pace(threshold / domain.min) + '.';
  if (fraction > domain.max) {
    throw incompatible(reference + ' Vérifier l’allure seuil actuelle ou choisir un chrono compatible pour prescrire les blocs spécifiques.',
      'raceGoals.targetTimeMinutes', 'athlete.paceThresholdSecPerKm');
  }
  if (prescribeSpecificWork) {
    throw engineLimit(reference + ' Cette cible plus lente peut convenir pour finir la course. DET ne sait pas encore composer des blocs spécifiques à ce chrono dans un autre domaine. Le coach peut garder cette échéance et travailler aux allures du profil en retirant la cible de temps.');
  }
}

/** The first-week ceiling is a coach observation, never the athlete's time
 * available. Estimating the volume does not establish the longest tolerated
 * outing, and a short outing can remain an engine limit on this calendar. */
export function marathonReturnHistory(config: PlanConfig, recentLong: number | undefined, weeks: AppPlanningDetDraft['weeks']) {
  const recentHours = config.loadHistory?.recentWeeklyHours;
  if (recentHours===0||recentLong===0) {
    const known=[recentHours===0?'0 h d’entraînement hebdomadaire récent':null,
      recentLong===0?'0 min de sortie longue récemment tolérée':null].filter(Boolean).join(' et ');
    throw engineLimit('Reprise marathon. Le coach a déclaré '+known+'. DET ne dispose pas d’une progression marathon partant de cette absence de pratique. Prévoir une première période de reprise, puis réévaluer le volume et la sortie effectivement tolérés.');
  }
  const absent: Array<[string, string]> = [];
  if (!Number.isFinite(recentHours) || (recentHours ?? 0) <= 0) {
    absent.push(['loadHistory.recentWeeklyHours','le volume hebdomadaire récemment réalisé (heures/semaine)']);
  }
  if (!Number.isFinite(recentLong) || (recentLong ?? 0) <= 0) {
    absent.push(['marathonRecentLongRunMinutes','la durée d’une sortie longue à pied récemment tolérée, marche comprise (minutes)']);
  }
  if (absent.length) throw missingData('Pour dimensionner la reprise marathon, renseigner ' +
    absent.map(([,label]) => label).join(' et ') + '.', ...absent.map(([field]) => field));
  const result = recentLong!;
  const ramp = config.volumeRamp?.weeklyIncreasePctMax;
  if (ramp !== undefined && Number.isFinite(ramp) && ramp >= 0) {
    const slots = weeks.filter(week => week.weekType === 'load').flatMap(week => {
      const slot = week.days.flatMap(day => day.slots).find(s => s.sport === 'run' && s.role === 'long');
      return slot ? [{week:week.week, minimum:slot.minimumMinutes ?? 0}] : [];
    });
    const last = slots.at(-1);
    const attainable = result * (1 + ramp) ** Math.max(0, slots.length - 1);
    if (last && attainable < last.minimum - 1e-7) throw engineLimit(
      'La sortie longue récemment tolérée dure ' + minutes(result) + ' min. Même avec une première sortie de cette durée et une hausse de ' +
      minutes(100*ramp) + ' % à chaque semaine de charge, la trajectoire atteint au plus ' + minutes(attainable) +
      ' min en S' + last.week + '. Le calendrier marathon retenu par DET y prévoit ' + minutes(last.minimum) +
      ' min. Allonger la préparation ou revoir la progression avec le coach.');
  }
  return result;
}

/** Starting with the final long-run slots, find the dose the previous loading
 * week needs to reach them at the profile's existing progression cap. Recovery
 * weeks do not earn an extra increase. The solver still verifies the chosen
 * V3 duration, full weekly volume and recovery against the actual last load. */
export function marathonLongRunFloors(weeks: AppPlanningDetDraft['weeks'], weeklyIncrease: number) {
  const floors = new Map<number, number>();
  let next = 0;
  for (const week of [...weeks].reverse()) {
    if (week.weekType !== 'load') continue;
    const slot = week.days.flatMap(day => day.slots).find(slot => slot.sport === 'run' && slot.role === 'long');
    if (!slot) continue;
    const minimum = Math.ceil(Math.max(slot.minimumMinutes ?? 0, next / (1 + weeklyIncrease)) - 1e-7);
    floors.set(week.week, minimum);
    next = minimum;
  }
  return floors;
}

/** Coach-declared time on foot and the actual run/walk content of the longest selected session. */
export function marathonReturnExposure(weeks:V3PlanProposal['weeks'], recentLong:number, recentHours:number) {
  const sessions=weeks.flatMap(week=>week.days.flatMap(day=>day.sessions.filter(s=>s.role==='long'&&s.sport==='run')
    .map(s=>({week:week.week,session:s}))));
  const longest=sessions.reduce<typeof sessions[number]|undefined>((best,row)=>
    !best||row.session.knownMinutes>best.session.knownMinutes?row:best,undefined);
  const prescription=longest?.session.components[0];
  const recipe=roadReturnSources.find(s=>s.id===prescription?.sourceId);
  const history='Le coach a renseigné '+minutes(recentHours)+' h/semaine et une sortie longue de '+minutes(recentLong)+' min, marche comprise.';
  let detail='';
  if(longest&&prescription&&recipe){
    const total=longest.session.knownMinutes,run=domainMinutes(prescription.blocks,'moderate_lt1');
    detail=' En S'+longest.week+', la plus longue séance ('+recipe.id+') dure '+minutes(total)+' min, dont '+minutes(run)+' min courues et '+minutes(total-run)+' min marchées.';
    const count=recipe.blocks[1];
    if(count?.kind==='repeat'){
      const max=previewV3SourceDose(recipe,{overrides:{'1.count':count.count.max},allowWorksetChange:true});
      const duration=evaluateV3Workout(max);
      if(duration.status==='confirmed'){
        const maxRun=domainMinutes(max.blocks,'moderate_lt1');
        detail+=duration.minutes===total?' Cette séance atteint le maximum de la fiche.':
          ' À sa dose maximale, cette fiche prévoit '+minutes(duration.minutes)+' min, dont '+minutes(maxRun)+' min courues.';
      }
    }
  }
  const exposure=(detail+' Pour les 42,195 km, vérifier le temps sur les pieds, la part réellement courue lors des sorties tolérées et la stratégie course-marche prévue le jour de l’épreuve. La préparation de la distance reste à évaluer avec le coach.').trim();
  return {history,exposure};
}

/** Work already prescribed in this plan, excluding competition. Unknown exercise
 * durations leave the totals unresolved rather than contributing zero minutes. */
export function marathonProgressionNotes(proposal: V3PlanProposal, config: PlanConfig): Map<number, string> {
  const notes = new Map<number, string>();
  if (detObjectiveGoal(proposal.objective) !== 'marathon') return notes;
  const rows = proposal.weeks.map(week => {
    const sessions = week.days.flatMap(day => day.sessions).filter(s => s.role !== 'race');
    const runs = sessions.flatMap(s => s.components).filter(c => c.sport === 'run');
    const timed = sessions.every(s => s.durationMinutes !== null);
    return {
      week: week.week, type: week.weekType,
      total: timed ? sessions.reduce((sum, s) => sum + s.durationMinutes!, 0) : null,
      run: runs.every(c => c.durationMinutes !== null) ? runs.reduce((sum, c) => sum + c.durationMinutes!, 0) : null,
      long: sessions.find(s => s.role === 'long' && s.sport === 'run')?.durationMinutes,
      specific: runs.reduce((sum, c) => sum + domainMinutes(c.blocks, 'marathon_pace'), 0),
    };
  });
  const history = config.loadHistory;
  const reference = config.ambition ? resolveCoachHoursReference(config.objective, config.ambition) : undefined;
  const hours = config.weeklyHours;
  const peak = rows.filter(row => row.type === 'load' && row.total !== null)
    .reduce<(typeof rows)[number] | undefined>((best, row) => !best || row.total! > best.total! ? row : best, undefined);
  const target = marathonTarget(config);
  for (const row of rows) {
    const lines: string[] = [];
    if (row.week === 1) {
      if (target != null) {
        lines.push('Objectif de ' + minutes(target) + ' min sur marathon (' + pace(target * 60 / marathonKm) + ').');
        if (!rows.some(w => w.specific > 0)) lines.push('Le chrono est une cible de fin de course. Les blocs préparent la durée d’effort dans les domaines du profil. À vérifier sur une sortie représentative avant de retenir la stratégie de course.');
      }
      if (proposal.marathonRecentLongRunMinutes) {
        lines.push('La durée maximale en S1 est bornée par la sortie longue récemment tolérée de ' + minutes(proposal.marathonRecentLongRunMinutes) + ' min.');
      }
      if (config.ambitionMeta?.downgraded) {
        lines.push('Avec ce niveau, l’application ajuste l’ambition de « ' + config.ambitionMeta.saisieLabel + ' » à « ' + config.ambitionMeta.effectiveLabel + ' ».');
      }
      if (history?.recentWeeklyHours) {
        const period = history.recentWeeksCount ? ' sur ' + history.recentWeeksCount + ' semaines' : '';
        lines.push('Volume hebdomadaire récent déclaré de ' + minutes(history.recentWeeklyHours * 60) + ' min' + period + '.');
      } else {
        lines.push('La première semaine repose sur le niveau du profil. Le volume hebdomadaire récemment réalisé reste à confirmer.');
      }
      if (hours && config.weeklyHoursSource === 'coach') {
        lines.push('Disponibilité déclarée de ' + minutes(hours * 60) + ' min/semaine.');
        if (reference && hours < reference.hours) {
          lines.push('L’ambition retenue a un repère de planification de ' + minutes(reference.hours * 60) + ' min/semaine. Le coach peut comparer le volume accessible et les séances spécifiques avant de retenir le chrono.');
        }
      }
      if (peak && history?.recentWeeklyHours && peak.total! < history.recentWeeklyHours * 60) {
        lines.push('Le pic du plan reste inférieur au volume hebdomadaire récent déclaré. Vérifier la dose spécifique et la fréquence retenue au regard de cet objectif.');
      }
      if (peak) lines.push('Le pic prescrit, tous sports réunis, atteint ' + minutes(peak.total!) + ' min en S' + peak.week + '.');
    }
    if (row.run !== null) lines.push(minutes(row.run) + ' min de séances à pied hors compétition.');
    if (row.long != null) lines.push('Sortie longue de ' + minutes(row.long) + ' min.');
    lines.push(minutes(row.specific) + ' min de blocs à allure marathon.');
    if (row.type === 'taper' || row.type === 'race') {
      const loads = rows.filter(other => other.week < row.week && other.type === 'load' && other.run !== null).slice(-3);
      const baseline = loads.reduce((sum, load) => sum + load.run!, 0) / loads.length;
      if (baseline > 0 && row.run !== null) lines.push('Le volume à pied hors compétition représente ' + Math.round(row.run / baseline * 100) +
        ' % de la moyenne des dernières semaines de charge (' + loads.map(load => 'S' + load.week).join(', ') + ').');
    }
    notes.set(row.week, lines.join(' '));
  }
  return notes;
}
