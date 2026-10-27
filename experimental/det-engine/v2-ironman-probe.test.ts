/** Opt-in read-only replay of actual baseline failures; never relaxs sporting contracts. */
import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {planningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {assessPreparedGeneration} from '@/lib/plan/prevalidateTrainingPlan';
import {checkSessionCatalogue,executableCatalogueVariants,executableCatalogueDurationRanges,catalogueEligibility} from '../../supabase/functions/_shared/sessionCatalogueContract';
import {evaluateRepairSportingEquivalence,normalizeRepairSport,normalizeRepairGoal} from '../../supabase/functions/_shared/repairSportingEquivalence';
import {buildWorkoutCatalog,toInjuryRiskCatalogOption} from '@/lib/workoutCatalogBuilder';
import {getCatalogSportFilter,getCatalogExclusions} from '@/lib/plan/catalogScope';
import {inferWeekType} from '@/engines/plan/sessionSizingMatrix';
import type {RepairWorkoutMetadata} from '../../supabase/functions/_shared/repairSportingEquivalence';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
const frequencies=(values:string[])=>Object.fromEntries([...new Set(values)].sort().map(value=>[value,values.filter(x=>x===value).length]));
it.skipIf(!process.env.TFCL_DET_IRONMAN_PROBE_OUT)('diagnoses every actual Ironman continuous empty domain without changing a rule',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const artifact=readFileSync('docs/det-engine/evidence-final/matrix.json.gz');
 const historical=JSON.parse(gunzipSync(artifact).toString()) as Array<{id:string;objective:string;format:string;reason?:string}>;
 const cases=historical.filter(r=>r.objective==='IM'&&r.format==='continuous'&&r.reason?.startsWith('empty_catalogue_domain_week_'));
 expect(cases).toHaveLength(31);
 const rows=cases.map(raw=>{
  const spec=planningCases().find(c=>c.id===raw.id)!;
  const {prepared}=preparePlanningCaseContext(spec);
  const prep=prepareGenerationContracts(prepared.athleteData,prepared.planConfig,{rotationSeed:0});
  const report=assessPreparedGeneration(prepared.planConfig,prep);
  const week=Number(raw.reason!.match(/_(\d+)$/)![1]);
  const w=report.weeks.find(w=>w.week===week)!;
  const catalog=[...new Map([...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()].map(m=>[m.id,m])).values()];
  const ids=new Set(w.eligible.map(m=>m.id));
  const context={objective:w.objective,phase:w.phase,weekType:w.weekType,operation:'insertion' as const};
  // All 31 actual empty-domain IM failures occur in the first five-week chunk.
  // Replay its exact options at 130 first, then change maxItems alone.
  const config=prepared.planConfig,totalWeeks=config.weeksAvailable!;
  expect(week).toBeLessThanOrEqual(5);expect(config.globalWeekOffset??0).toBe(0);
  expect(prep.catalogObjective).toBe(config.objective);expect(prep.chunkRegenWeeks[0]).toHaveLength(0);
  const chunkEnd=Math.min(5,totalWeeks),phases=[...new Set(Array.from({length:chunkEnd},(_,i)=>prep.phaseCalendar?.[i+1]).filter(Boolean))];
  const catalogOptions:NonNullable<Parameters<typeof buildWorkoutCatalog>[4]>={
   phaseOverride:phases,weekContexts:Array.from({length:chunkEnd},(_,i)=>({phase:prep.phaseCalendar?.[i+1],objective:prep.catalogObjective,
    weekType:inferWeekType(i+1,totalWeeks,prep.catalogObjective,prepared.athleteData.age,config.deloadCadenceWeeks)})),
   strictPhaseFilter:true,maxItems:130,chunkIndex:0,rotationIds:new Set<string>(),
   limiters:config.identifiedLimitersRaw?.length?config.identifiedLimitersRaw:undefined,prohibitions:config.prohibitions,
   sportFilter:getCatalogSportFilter(prep.catalogObjective),...getCatalogExclusions(prep.catalogObjective,config.raceGoals),
   historicalUsage:new Map<string,number>(),rotationSeed:0,injuryRisk:toInjuryRiskCatalogOption(config.injuryRisk),
   beginnerIntensitySignal:prep.beginnerIntensitySignal};
  const capped=buildWorkoutCatalog(prep.catalogObjective,1,chunkEnd,totalWeeks,catalogOptions);
  expect(capped.map(c=>c.id).sort(),raw.id).toEqual(prep.chunkRepairCatalogs[0].map(c=>c.id).sort());
  const uncapped=buildWorkoutCatalog(prep.catalogObjective,1,chunkEnd,totalWeeks,{...catalogOptions,maxItems:10000}).map(c=>c.repairMetadata);
  const slots=prep.weeklyQuotas[week].layout!.days.flatMap(d=>d.slots.filter(s=>!s.isRaceEvent).map(slot=>{
   const sportPool=catalog.filter(m=>normalizeRepairSport(m.sport)===slot.sport);
   const eligible=sportPool.filter(m=>ids.has(m.id));
   const compatibility=eligible.map(m=>({m,reasons:evaluateRepairSportingEquivalence(null,m,context).reasons}));
   const insertionCompatible=compatibility.filter(c=>!c.reasons.length).map(c=>c.m);
   function dose(m:RepairWorkoutMetadata,range:[number,number],variantKey?:string,doseCatalog=catalog){
    const duration=Math.max(range[0],slot.minDurationMin??0);
    if(duration>Math.min(range[1],slot.maxDurationMin??Infinity))return null;
    const session={catalogId:m.id,title:m.title,details:m.structure,sport:slot.sport,durationMin:duration,variantKey,
     zones:m.mainZoneMax?[`Z${m.mainZoneMax}`]:m.zones};
    const checked=checkSessionCatalogue(session,{...context,catalog:doseCatalog});
    return {id:m.id,variantKey:variantKey??null,range,duration,errors:checked.errors,unknown:checked.unknown};
   }
   const primaryDose=insertionCompatible.flatMap(m=>{const p=dose(m,m.durationMin);return p?[p]:[];});
   const variantDose=insertionCompatible.flatMap(m=>Object.entries(executableCatalogueVariants(m))
    .filter(([key])=>normalizeRepairGoal(key)===normalizeRepairGoal(w.objective))
    .flatMap(([key,value])=>executableCatalogueDurationRanges({...m,variants:{[key]:value}},w.objective).slice(1).flatMap(range=>{const p=dose(m,range,key);return p?[p]:[];})));
   const uncappedSport=uncapped.filter(m=>normalizeRepairSport(m.sport)===slot.sport);
   const uncappedEligible=uncappedSport.filter(m=>!catalogueEligibility(m,context).length);
   const uncappedCompatible=uncappedEligible.filter(m=>evaluateRepairSportingEquivalence(null,m,context).compatible);
   const uncappedFitting=uncappedCompatible.flatMap(m=>{const p=dose(m,m.durationMin,undefined,uncapped);return p&&!p.errors.length&&!p.unknown.length?[p]:[];});
   const acceptedPrimary=primaryDose.filter(p=>!p.errors.length&&!p.unknown.length);
   const acceptedVariants=variantDose.filter(p=>!p.errors.length&&!p.unknown.length);
   return {day:d.dayName,sport:slot.sport,isLongSession:!!slot.isLongSession,isActivation:!!slot.isActivation,
    slotWindow:[slot.minDurationMin??0,Number.isFinite(slot.maxDurationMin)?slot.maxDurationMin:null],
    poolSportCount:sportPool.length,weekEligibleCount:eligible.length,
    insertionCompatibleCount:insertionCompatible.length,
    insertionRejections:frequencies(compatibility.flatMap(c=>c.reasons)),
    insertionRejectionExamples:compatibility.filter(c=>c.reasons.length).slice(0,5).map(c=>({id:c.m.id,reasons:c.reasons,specialContext:c.m.specialContext,prerequisites:c.m.prerequisiteKeys})),
    insertionDoseWindows:frequencies(insertionCompatible.map(m=>m.durationMin.join('-'))),
    insertionDoseExamples:insertionCompatible.slice(0,5).map(m=>({id:m.id,range:m.durationMin})),
    uncapped:{poolSportCount:uncappedSport.length,weekEligibleCount:uncappedEligible.length,insertionCompatibleCount:uncappedCompatible.length,acceptedPrimaryCount:uncappedFitting.length,
     insertionRejections:frequencies(uncappedEligible.flatMap(m=>evaluateRepairSportingEquivalence(null,m,context).reasons)),
     fittingExamples:uncappedFitting.slice(0,5),doseWindows:frequencies(uncappedCompatible.map(m=>m.durationMin.join('-')))},
    fittingPrimaryCount:primaryDose.length,acceptedPrimaryCount:acceptedPrimary.length,
    fittingExecutableVariantsCount:variantDose.length,acceptedExecutableVariantsCount:acceptedVariants.length,
    contractRejections:frequencies([...primaryDose,...variantDose].flatMap(p=>[...p.errors,...p.unknown])),
    fittingExamples:[...acceptedPrimary,...acceptedVariants].slice(0,5),
    blockingStage:!eligible.length?'week_catalogue_sport_absent':!insertionCompatible.length?'unconfirmed_context_or_prerequisite':!primaryDose.length?'dose_window_disjoint':!acceptedPrimary.length?'session_contract_rejection':'domain_nonempty'};
  }));
  const empty=slots.filter(s=>s.acceptedPrimaryCount===0);
  expect(empty.length,raw.id).toBeGreaterThan(0);
  return {id:raw.id,level:spec.level,ambition:spec.ambition,effectiveAmbition:prepared.planConfig.ambition,
   week,phase:w.phase,weekType:w.weekType,slots,emptySlots:empty.map(s=>({day:s.day,sport:s.sport,blockingStage:s.blockingStage}))};
 });
 const emptySlots=rows.flatMap(r=>r.slots.filter(s=>s.acceptedPrimaryCount===0));
 const evidence={version:'det-v2-ironman-domain-probe-1',sourceHashes:Object.fromEntries(['experimental/det-engine/v2-ironman-probe.test.ts','src/lib/plan/prepareGenerationContracts.ts','src/lib/workoutCatalogBuilder.ts','supabase/functions/_shared/sessionCatalogueContract.ts','supabase/functions/_shared/repairSportingEquivalence.ts'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),baselineArtifact:'docs/det-engine/evidence-final/matrix.json.gz',baselineSha256:createHash('sha256').update(artifact).digest('hex'),
  clock:'2026-10-26T12:00:00Z',rotationSeed:0,cases:rows.length,emptySlots:emptySlots.length,
  blockingStages:frequencies(emptySlots.map(s=>s.blockingStage)),emptySports:frequencies(emptySlots.map(s=>s.sport)),
  rescuedByUncappingOnly:emptySlots.filter(s=>s.uncapped.acceptedPrimaryCount>0).length,
  rescuedByExistingExecutableVariants:emptySlots.filter(s=>s.acceptedExecutableVariantsCount>0).length,
  noRuleChanged:true,paidApiCalls:0,rows};
 const out=process.env.TFCL_DET_IRONMAN_PROBE_OUT!;mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(evidence,null,2)+'\n');
 expect(network).not.toHaveBeenCalled();
},180000);
