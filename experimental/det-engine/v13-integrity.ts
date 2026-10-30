import{WorkoutLibrary}from'@/lib/workoutLibrary';
import{buildRepairWorkoutMetadata}from'@/lib/plan/repairCatalogMetadata';
import type{RepairWorkoutMetadata}from'../../supabase/functions/_shared/repairSportingEquivalence';
import{checkSessionCatalogue}from'../../supabase/functions/_shared/sessionCatalogueContract';
import{literalDose}from'./v10-source-dose';
import{digest}from'./v9-prospective';
/** Literal source-specific components. Transitions are explicitly not assigned zero minutes. */
export function explicitBrickComponents(card:RepairWorkoutMetadata){
 if(card.id!=='C_BRICK_TRANSITION_DRILL')return null;
 const source=WorkoutLibrary.find(w=>w.id===card.id)!;
 const warm=source.structure.find(p=>/warm/i.test(p.part))?.text.match(/^(\d+)\s*min\s+vélo/i);
 const main=source.structure.find(p=>/main/i.test(p.part))?.text.match(/(\d+)\s*[×x]\s*transition drill:\s*Vélo\s*(\d+)min.*?course\s*(\d+)min/i);
 const cool=source.structure.find(p=>/cool/i.test(p.part))?.text.match(/^(\d+)\s*min\s+jogging/i);
 if(!warm||!main||!cool)return null;
 const bike=+warm[1]+(+main[1])*(+main[2]),run=+cool[1]+(+main[1])*(+main[3]);
 return{bike,run,knownActiveMinutes:bike+run,transitionMinutes:null,fullElapsedMinutes:null,formula:`${warm[1]} + ${main[1]}×(${main[2]}+${main[3]}) + ${cool[1]}`,source:'literal named warm-up, explicit five bike/run cycles and named cool-down; transition time absent'};
}
/** Conservative coverage guard around the legacy parser: unknown prose never becomes a full-session upper bound. */
export function auditRecipe(card:RepairWorkoutMetadata){
 const raw=WorkoutLibrary.find(w=>w.id===card.id)!,legacy=literalDose(card),brick=explicitBrickComponents(card),parts=raw.structure;
 const main=parts.find(p=>/main/i.test(p.part))?.text??'';
 const timeTokens=(text:string)=>[...text.matchAll(/\d+\s*(?:min\b|['’]|h\d*)/gi)].length;
 const other=parts.filter(p=>!/main/i.test(p.part));
 const supportedOther=other.every(p=>timeTokens(p.text)<=1||timeTokens(p.text)===2&&/optionnel/i.test(p.text));
 const reps=/\b\d+\s*[x×]\s*\d+\s*['’].*\br\s*=\s*\d+\s*['’]/i.test(main);
 const progressive=/progressif:/i.test(main)&&/→/.test(main);
 const variable=/^\d+\s*[-–]\s*\d+\s*(?:min|'|’)/.test(main)||/^\d+h\d+\s*[-–]\s*\d+h\d+/.test(main);
 const supported=!!legacy.range&&supportedOther&&(reps?timeTokens(main)===2:progressive?timeTokens(main)===3:variable?timeTokens(main)<=2:false);
 let timedBlocksRange:supportedRange= supported?legacy.range:null;
 let customProof:string|null=null;
 // Verified composed opener: previous parser ignored its30min prefix and10min cool-down.
 if(card.id==='D_TAPER_BIKE_OPENER'){
  const m=main.match(/^(\d+)'[^+]+\+\s*(\d+)x(\d+)'[^=]*r=(\d+)'[^+]+\+\s*(\d+)'/);
  if(m){const n=+m[2],fixed=+m[1]+n*(+m[3])+(+m[5]),rest=+m[4];timedBlocksRange=[fixed+(n-1)*rest,fixed+n*rest];customProof='literal prefix30 +4x1 +3or4 rests3 +cool10; no block omitted';}
 }
 if(brick){timedBlocksRange=[brick.knownActiveMinutes,brick.knownActiveMinutes];customProof=brick.formula+'; transitions unknown';}
 const knownMandatoryLowerMin=timedBlocksRange?.[0]??null;
 const namedFullParts=parts.some(p=>/warm/i.test(p.part))&&parts.some(p=>/cool/i.test(p.part))&&parts.every(p=>/main|warm|cool/i.test(p.part));
 const fullRecipeTimeRange=supported&&namedFullParts&&!brick?timedBlocksRange:null;
 const min=Math.max(card.durationMin[0],knownMandatoryLowerMin??0),max=Math.min(card.durationMin[1],fullRecipeTimeRange?.[1]??Infinity);
 const fatalDurationConflict=knownMandatoryLowerMin!==null&&knownMandatoryLowerMin>card.durationMin[1]||!!fullRecipeTimeRange&&fullRecipeTimeRange[1]<card.durationMin[0];
 const belowMandatory=knownMandatoryLowerMin!==null&&card.durationMin[0]<knownMandatoryLowerMin;
 const outsideUpper=!!fullRecipeTimeRange&&card.durationMin[1]>fullRecipeTimeRange[1];
 const unattributed=timedBlocksRange&&!fullRecipeTimeRange&&!brick&&timedBlocksRange[1]<card.durationMin[0]?{minimum:card.durationMin[0]-timedBlocksRange[1],maximum:card.durationMin[1]-timedBlocksRange[0],notInventedAsWarmup:true}:null;
 const status=fatalDurationConflict?'mandatory_components_conflict_with_advertised_total':belowMandatory||outsideUpper?'advertised_range_partly_outside_demonstrated_recipe':unattributed?'unattributed_advertised_session_time':fullRecipeTimeRange?'complete_literal_temporal_bounds_compatible':timedBlocksRange?'partial_timing_bounds_only':'temporal_coverage_unknown';
 return{id:card.id,sport:card.sport,title:card.title,originalRange:card.durationMin,legacyLiteralProjection:legacy,legacyProjectionTrustedForFullSession:supported&&namedFullParts&&!brick,knownTimedBlocksRange:timedBlocksRange,knownMandatoryLowerMin,fullRecipeTimeRange,necessaryUsableSourceRange:fatalDurationConflict?null:[min,max],fatalDurationConflict,belowMandatory,outsideDemonstratedFullUpper:outsideUpper,unattributed,status,brick,customProof,originalPhases:raw.phase??[],effectivePhases:card.phases,mainZoneMax:card.mainZoneMax,zones:card.zones,prerequisites:card.prerequisiteKeys,specialContext:card.specialContext,sourceMetadataHash:digest(card),fullSessionTimingAttested:!!fullRecipeTimeRange&&!fatalDurationConflict,notes:['no unstated warm-up, cool-down, transition or stroke pace assigned','a Main-only recipe lower bound is not a full-session upper bound','unsupported composite grammar remains unknown; old parser projection preserved']};
}
type supportedRange=[number,number]|null;
/** Experimental view only: no renamed/counterfeit production workout and no hidden duration correction. */
export function brickOverlay(){
 const original=buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id==='C_BRICK_TRANSITION_DRILL')!),before=digest(original),components=explicitBrickComponents(original)!;
 const activeMetadata={...original,durationMin:[components.knownActiveMinutes,components.knownActiveMinutes]as[number,number]};
 const session={sport:original.sport,catalogId:original.id,title:original.title,details:original.structure,durationMin:components.knownActiveMinutes,zones:original.zones};
 const context={objective:'IM',phase:'peak',weekType:'load'};
 const originalCheck=checkSessionCatalogue(session,{...context,catalog:[original]}),activePortionCheck=checkSessionCatalogue(session,{...context,catalog:[activeMetadata]});
 return{version:'det-v13-brick-overlay-1',sourceId:original.id,sourceHash:before,originalMetadata:original,originalAdvertisedRange:original.durationMin,activeMetadata,components,fullElapsedContract:{minimumMinutes:components.knownActiveMinutes,maximumMinutes:null,unattributedTransitionMinutes:null},originalCheck,activePortionCheck,fullSessionExecutable:false,enduranceLongEvidence:{autonomousLongCreditMinutes:0,knownBikeMinutes:components.bike,knownRunMinutes:components.run,full55NotABikeDose:true},reason:'full_transition_duration_and_applicability_not_established; active-component correction is not a full-session prescription',phaseRestrictionsUnchanged:JSON.stringify(activeMetadata.phases)===JSON.stringify(original.phases),sourceUnchanged:before===digest(buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id===original.id)!)),notPromoted:true};
}
