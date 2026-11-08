/** Candidate composition only: two existing, individually admitted V3 doses.
 * No source is approved here and no Ironman/70.3 equivalence is assumed. */
import { isCompleteRepairWorkoutMetadata, normalizeRepairGoal, type RepairWorkoutMetadata } from '../../supabase/functions/_shared/repairSportingEquivalence';

export const IM_TAPER_BRICK = {
  id: 'V3B_IM_TAPER_096', bikeId: 'V3P_BIKE_180', runId: 'V3P_RUN_110',
  bikeMin: 57, runMin: 34, transitionSeconds: 300, totalMin: 96,
} as const;
export interface ImTaperBrickReview {
  id: typeof IM_TAPER_BRICK.id; objective: string; individualCoachApproval: true;
  transitionSeconds: number; preferReviewedV3?: true;
}
export function composeReviewedImTaperBrick(sources: readonly RepairWorkoutMetadata[], reviews: readonly ImTaperBrickReview[]) {
  const accepted: RepairWorkoutMetadata[] = [], rejected: { id: string; reason: string }[] = [];
  const seen = new Set<string>(), byId = new Map(sources.map(s => [s.id, s]));
  for (const r of reviews) {
    const reject = (reason: string) => rejected.push({ id: r.id, reason });
    if (seen.has(r.id)) { reject('im_brick_duplicate_review'); continue; }
    seen.add(r.id);
    if (r.id !== IM_TAPER_BRICK.id || r.individualCoachApproval !== true || normalizeRepairGoal(r.objective) !== 'ironman') {
      reject('im_brick_objective_or_individual_review_missing'); continue;
    }
    if (r.transitionSeconds !== IM_TAPER_BRICK.transitionSeconds) { reject('im_brick_transition_differs_from_review'); continue; }
    const bike = byId.get(IM_TAPER_BRICK.bikeId), run = byId.get(IM_TAPER_BRICK.runId);
    if (!isCompleteRepairWorkoutMetadata(bike) || !isCompleteRepairWorkoutMetadata(run)) { reject('im_brick_both_components_must_be_admitted'); continue; }
    if (bike.sport !== 'bike' || run.sport !== 'run' || !bike.goals.includes('ironman') || !run.goals.includes('ironman') ||
        !bike.tags.includes('v3-primary-domain:im_pace') || run.intentFamily !== 'recuperation' || run.mainZoneMax > 2 || bike.mainZoneMax > 3 ||
        ![bike, run].every(s => s.phases.includes('taper') && s.phases.includes('peak') &&
          s.tags.includes('v3-sporting-source-individually-reviewed-candidate') && s.tags.includes('individual-coach-approval-recorded'))) {
      reject('im_brick_goal_phase_or_taper_dose_unproven'); continue;
    }
    if (bike.durationMin.some(n => n !== IM_TAPER_BRICK.bikeMin) || run.durationMin.some(n => n !== IM_TAPER_BRICK.runMin)) {
      reject('im_brick_exact_component_dose_changed'); continue;
    }
    const total = bike.durationMin[0] + run.durationMin[0] + r.transitionSeconds / 60;
    if (total !== IM_TAPER_BRICK.totalMin) { reject('im_brick_total_not_conserved'); continue; }
    const card: RepairWorkoutMetadata = {
      metadataVersion: 1, complete: true, id: r.id, sport: 'brick',
      title: 'Ironman — rappel spécifique vélo puis course de récupération',
      objective: 'Conserver les deux doses V3 allégées et leur transition individuellement revue',
      intentFamily: 'brick', goals: ['ironman'], objectiveSpecific: true, phases: ['peak', 'taper'],
      durationMin: [total, total], mainZoneMax: Math.max(bike.mainZoneMax, run.mainZoneMax),
      specialContext: null, prerequisiteKeys: [], necessity: 'Optionnel',
      when: 'Affûtage uniquement ; charge et récupération individuelles à vérifier', avoid: bike.avoid + ' · ' + run.avoid,
      tags: ['v404-im-taper-composition', 'two-reviewed-components', 'bike-source:' + bike.id, 'run-source:' + run.id],
      structure: `Vélo ${bike.durationMin[0]} min : ${bike.structure} | Transition ${r.transitionSeconds / 60} min, hors exercice, confirmée par le coach | Course ${run.durationMin[0]} min : ${run.structure} | Total exact ${total} min ; aucune dose ni récupération modifiée.`,
      zones: [...new Set([...bike.zones, ...run.zones])], variants: {},
    };
    if (!isCompleteRepairWorkoutMetadata(card)) { reject('im_brick_metadata_invalid'); continue; }
    accepted.push(card);
  }
  return { accepted, rejected };
}
