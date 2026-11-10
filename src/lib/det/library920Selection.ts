import {library920SourceMetadata,library920EngineeringEligible} from '../../../scripts/library-v3/library920Catalogue';
import type {V3Workout} from '../../../scripts/library-v3/catalogueRuntime';
import {coachFamilyFor,coachObjectiveKey} from '../../../experimental/det-engine/v401-coach-inputs-core';
import {resolveV3IntensityTargets,type V3AthleteAnchors,type V3IntensityResolution} from '../../../scripts/library-v3/resolveV3Intensity';

const levels=['untrained','light','trained','highly_trained'];
const goalForFamily:Record<string,string>={'10k':'10k',semi_marathon:'semi',marathon:'marathon',
 triathlon_sprint:'sprint',triathlon_olympic:'olympic',triathlon_703:'half',triathlon_ironman:'ironman',
 trail_short:'trail_short',trail_mountain:'trail_mountain',trail_ultra:'trail_ultra'};
export function library920ContextProblems(w:V3Workout,objective:string,level:string|undefined):string[]{
 const m=library920SourceMetadata(w.id);if(!m)return [];
 const problems:string[]=[];
 if(!library920EngineeringEligible(w))problems.push('source_engineering_blocked');
 const levelIndex=levels.indexOf(level??'');
 if(levelIndex<0)problems.push('athlete_level_unknown');
 else if(levelIndex<levels.indexOf(w.minimumLevel))problems.push('athlete_level_insufficient');
 const family=coachFamilyFor(objective)?.key,goal=coachObjectiveKey(objective)==='5k'?'5k':family?goalForFamily[family]:undefined;
 // A generic single-sport session may support the matching single-sport
 // programme. Event-specific recipes keep their declared event scope.
 const programme=family==='cycling_ftp'&&w.sport==='bike'||family==='swimming_css'&&w.sport==='swim';
 if(!(goal&&m.goals.includes(goal))&&!(programme&&w.primaryIntent!=='race_specific'))problems.push('source_goal_incompatible');
 const eventDomain=({'703_pace':'half',im_pace:'ironman',marathon_pace:'marathon',semi_pace:'semi'} as Record<string,string>)[w.primaryDomain??''];
 if(w.primaryIntent==='race_specific'&&eventDomain&&goal!==eventDomain)problems.push('race_specific_domain_incompatible');
 if(w.primaryIntent==='test')problems.push('assessment_requires_explicit_test_workflow');
 return problems;
}
/** Time is calculated only with a pace valid for the actual sport/technique.
 * The legacy runtime calls every pace map "swimPaces"; it is never shared
 * between sports here and never inferred from FTP, threshold or CSS. */
export function library920TimingPaces(w:V3Workout,swimPaces:Record<string,number>):Record<string,number>{
 const m=library920SourceMetadata(w.id);
 if(!m)return swimPaces;
 return w.sport==='swim'&&!m.techniqueSpecificSwimPaceRequired?swimPaces:{};
}
export function resolveLibrary920Targets(w:V3Workout,anchors:V3AthleteAnchors):V3IntensityResolution{
 const m=library920SourceMetadata(w.id);
 if(m&&(w.sport==='run'&&m.terrainEffortRequired||w.sport==='swim'&&m.techniqueSpecificSwimPaceRequired))return {
  status:'unresolved',targets:[],missing:[w.sport==='run'?'run_terrain_effort_review.'+w.id:'swim_technique_specific_paces.'+w.id],
  candidateOnly:true,notScientificValidation:true};
 return resolveV3IntensityTargets(w,anchors);
}
