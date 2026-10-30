import type{V10Profile}from'./v10-profiles';
import{WorkoutLibrary}from'@/lib/workoutLibrary';import{buildRepairWorkoutMetadata}from'@/lib/plan/repairCatalogMetadata';
import{deriveTrainingZones,getDerivedZone}from'@/lib/zones/deriveTrainingZones';import{getDoctrineDomain}from'@/lib/zones/tfclDoctrine';
import{checkSessionCatalogue}from'../../supabase/functions/_shared/sessionCatalogueContract';
/** Partial arithmetic only: a crawl CSS is never transferred to backstroke/breaststroke. */
export function swim45Feasibility(p:V10Profile){
 const raw=WorkoutLibrary.find(w=>w.id==='A_SWIM_AEROBIC_MULTI_NAGES')!,card=buildRepairWorkoutMetadata(raw);
 const main=raw.structure.find(x=>/main/i.test(x.part))!.text;
 const m=main.match(/(\d+)x\((\d+)m crawl \+ (\d+)m dos \+ (\d+)m brasse\).*r=(\d+)"/i);
 if(!m)throw Error('SWIM_SOURCE_GRAMMAR_CHANGED');
 const warmupM=Number(raw.structure.find(x=>/warm/i.test(x.part))!.text.match(/^(\d+)m/)![1]),cooldownM=Number(raw.structure.find(x=>/cool/i.test(x.part))!.text.match(/^(\d+)m/)![1]);
 const n=+m[1],crawlM=n*(+m[2]),backM=n*(+m[3]),breastM=n*(+m[4]),restSeconds=+m[5];
 const css=typeof p.athlete.css==='number'&&p.athlete.css>0?p.athlete.css:null;
 const zones=deriveTrainingZones({sport:'swim',css}),domain=getDoctrineDomain('moderate_lt1'),zone=getDerivedZone(zones,domain.zone)!;
 const fastestCrawlSecPer100m=css?css/(zone.pctRef.max/100):null;
 const crawlMinimumSeconds=fastestCrawlSecPer100m!==null?crawlM/100*fastestCrawlSecPer100m:null;
 const restRange=[(n-1)*restSeconds,n*restSeconds];
 const partialKnownLowerMinutes=crawlMinimumSeconds!==null?(crawlMinimumSeconds+restRange[0])/60:null;
 const check=checkSessionCatalogue({sport:card.sport,catalogId:card.id,title:card.title,details:card.structure,durationMin:45,zones:card.zones},{objective:'IM',phase:'base',weekType:'load',catalog:[card]});
 return{profile:p.id,source:card.id,requestedMinutes:45,sourceRange:card.durationMin,rawRecipe:raw.structure,distance:{crawlMainM:crawlM,backstrokeMainM:backM,breaststrokeMainM:breastM,warmupM,cooldownM,totalM:crawlM+backM+breastM+warmupM+cooldownM},restRangeSeconds:restRange,cssSecPer100m:css,cssProvenance:css?'inherited V10 synthetic crawl reference, test date/method not documented':'missing; not inferred from VO2max, VLamax or level',existingZoneConvention:{domain:domain.id,zone:zone.id,pctRef:zone.pctRef,source:zones.source,confidence:zones.confidence,fallback:zones.fallbackReason},fastestCrawlSecPer100m,crawlMinimumSeconds,partialKnownLowerMinutes,otherStrokeAndWarmupTimes:null,completeElapsedRange:null,legacyNumericCheck:check,status:'not_confirmed_individual_protocol_time' as const,reasons:[...(!css?['crawl_css_missing']:[]),'backstroke_and_breaststroke_paces_missing','warmup_cooldown_and_turnover_elapsed_unknown','no_complete_execution_record_in45min'],necessaryPartialBoundExceeds45:partialKnownLowerMinutes!==null&&partialKnownLowerMinutes>45,confirmsFeasibility:false,provesPhysiologicalImpossibility:false,doNotRemoveRepetitionsOrRest:true,expertReviewed:false};
}
