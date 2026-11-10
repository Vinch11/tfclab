import type {V3RunTerrainReview} from '../../../scripts/library-v3/resolveV3Intensity';
import {resolveV3IntensityTargets} from '../../../scripts/library-v3/resolveV3Intensity';
import {fingerprintV3SportingSource} from '../../../scripts/library-v3/sportingQualification800';
import type {DetStructuredNode} from '../../../experimental/det-engine/v400-structured-workout';
import {getDoctrineDomain} from '@/lib/zones/tfclDoctrine';
import {findSource} from './coachDetContext';
import {incompatible,missingData} from './coachDecision';
import type {V3PlanProposal} from './appPlanningV3Proposal';

export interface TrailGuidanceReview {
  planningInputFingerprint: string;
  entries: Array<V3RunTerrainReview & {sourceFingerprint:string}>;
}

/** Apply an independent field-effort review only to the sources chosen for this athlete's plan. */
export function applyTrailGuidance(plan: V3PlanProposal, review: TrailGuidanceReview) {
  if (!plan.checks.some(c=>c.code==='trail_route_review') || review.planningInputFingerprint !== plan.planningInputFingerprint)
    throw incompatible('La revue terrain appartient à une autre préparation. Rouvrez les séances du plan actuel.', 'trailGuidanceReview');
  const components=plan.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)));
  const seen=new Set<string>();
  for (const entry of review.entries) {
    const source=findSource(entry.sourceId);
    const chosen=components.filter(c=>c.sourceId===entry.sourceId);
    if (entry.athleteId!==plan.athleteId || !source || source.sport!=='run' || !chosen.length ||
      fingerprintV3SportingSource(source)!==entry.sourceFingerprint || chosen.some(c=>c.sourceFingerprint!==entry.sourceFingerprint) || seen.has(entry.sourceId))
      throw incompatible('Vérifiez l’athlète, la version et la fiche de la séance relue sur le terrain.', 'trailGuidanceReview.entries');
    if (!entry.terrainContextId?.trim() || !entry.fieldReviewReference?.trim() || entry.coachConfirmsFieldEffortReview!==true)
      throw missingData('Indiquez le terrain et l’observation ayant servi à vérifier les RPE de '+source.title+'.','terrainContextId','fieldReviewReference');
    for (const component of chosen) {
      const resolved=resolveV3IntensityTargets({...source,blocks:component.blocks},{runTerrainReview:entry});
      if (resolved.status!=='resolved') throw missingData('Renseignez un RPE terrain pour '+source.title+' dans les domaines suivants : '+
        resolved.missing.map(m=>m.split('.').at(-1)).join(', ')+'.',...resolved.missing);
      for (const target of resolved.targets) if (target.metric!=='coach_field_effort' || !Number.isInteger(target.min) || !Number.isInteger(target.max))
        throw incompatible('Le guidage RPE de '+source.title+' demande des bornes entières de 1 à 10.', 'domainRpe');
      component.targets=resolved;
    }
    seen.add(entry.sourceId);
    plan.checks.push({code:'trail_guidance_review',status:'passed',
      message:source.title+' · terrain '+entry.terrainContextId+' · observation '+entry.fieldReviewReference+' · '+
        chosen[0].targets.targets.map(t=>getDoctrineDomain(t.domain!).label+' RPE '+t.min+'–'+t.max+'/10').join(', ')+'.'});
  }
  const remaining=[...new Set(components.flatMap(c=>c.targets.missing))];
  plan.checks=plan.checks.filter(c=>c.code!=='individual_targets');
  if(remaining.length) plan.checks.push({code:'individual_targets',status:'pending',message:'Repères à préciser : '+remaining.join(', ')});
}

/** Nolio represents field effort as a leaf RPE; the measured domain and review stay in the saved component. */
export function terrainWatchNodes(nodes: DetStructuredNode[]): DetStructuredNode[] {
  return nodes.map(node=>{
    if(node.kind==='repeat') return {...node,steps:terrainWatchNodes(node.steps)};
    if(node.target?.metric!=='coach_field_effort') return node;
    const {min,max,source,confidence}=node.target;
    if(source!=='coach_reviewed_terrain_effort'||confidence!=='coach_confirmed'||min===null||max===null||
      !Number.isInteger(min)||!Number.isInteger(max)||min<1||max>10||max<min||
      node.rpe && (min<node.rpe.min || max>node.rpe.max))
      throw incompatible('Le RPE revu pour « '+node.label+' » sort des bornes de la fiche. Corrigez le RPE de ce domaine.','domainRpe');
    return {...node,target:null,rpe:{min,max}};
  });
}
