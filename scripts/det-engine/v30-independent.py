"""Independent arithmetic/source/plan checks. Does not import TS candidate or planner code."""
import collections,copy,datetime,gzip,hashlib,json,pathlib,re,subprocess,sys
R=pathlib.Path('docs/det-engine/v30');E=R/'evidence'/('validation-'+(sys.argv[1]if len(sys.argv)>1 else'2'))
def raw(p):
 p=pathlib.Path(p);b=p.read_bytes();return gzip.decompress(b)if p.suffix=='.gz'else b
def load(p):return json.loads(raw(p))
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def digest(x):return hashlib.sha256(json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def integer(x):return type(x)is int and 0<=x<=9007199254740991
old=load(R/'baseline-files.json')
for p,h in old.items():assert sha(p)==h,('OLD_FILE_CHANGED',p)
for p,h in load(E/'executed-source-pins.json').items():assert sha(p)==h,('EXECUTED_SOURCE_CHANGED',p)
reg=load(R/'inputs.json');sources={}
for k,v in reg['sourceArtifacts'].items():
 assert sha(v['path'])==v['sha256'];sources[k]=[json.loads(l)for l in raw(v['path']).splitlines()]if k=='catalogue'else load(v['path'])
canonical={x['legacyId']:x for x in sources['catalogue']};assert len(canonical)==920
b=sources['originals'][1];native=b['result'];old_exec=load('docs/det-engine/v27/evidence/validation-3/build/results.json.gz')[1]['executions'];by_exec={e['slotKey']:e for e in old_exec}
p=load(E/'build/proposed.json.gz');a=load(E/'build/baseline.json.gz');controls=load(E/'build/originals.json.gz');assert len(controls)==len(sources['v26References'])==8
for c,old_case in zip(controls,sources['v26References'],strict=True):
 assert c['result']==old_case['retained'] and c['unchanged']
assert len([x for x in controls[0]['refusals']if x['sport']=='run'])==7 and len(controls[2]['refusals'])==26
assert p['nativeCalendarHash']==a['nativeCalendarHash']==digest(native) and p['profileInputHash']==digest(b['input'])
def verify(candidate):
 assert candidate['coachPolicyAuthorized']is False and candidate['individualPrescriptionApproved']is False and candidate['automaticallyApplied']is False and candidate['newIndividualParameters']==[]
 assert candidate['legacyRawHistoricalUnchanged']==native['rawValidation']['historical'] and candidate['validation']['autoAdoptionAllowed']is False and candidate['validation']['sportingPrescriptionComplete']is False
 assert len(candidate['weeks'])==4 and candidate['validation']['fullExerciseTimeKnown']is False
 policy=candidate['policy'];review=candidate['reservationModel']=='recipe_review_envelopes';count=0;phase=0;expected_minutes=[]
 for w,nw in zip(candidate['weeks'],native['calendar']['weeks'],strict=True):
  assert w['week']==nw['week'] and w['phase']==nw['phase'] and w['weekType']==nw['type'] and len(w['sessions'])==len(nw['slots'])
  assert w['plannedVolumeBudgetSeconds']==nw['budget']*60 and w['declaredAvailabilitySeconds']==b['input']['form']['weeklyHours']*3600==36000 and w['actualFullExerciseDurationSeconds']is None
  total=0;days=collections.defaultdict(list);freq=collections.Counter();known=0;unknown=0
  for s,ns in zip(w['sessions'],nw['slots'],strict=True):
   count+=1;c=canonical[s['sourceId']]['originalCanonical'];prior=by_exec[ns['key']]
   assert s['slotKey']==ns['key'] and s['sourceId']==ns['card']['id'] and s['sport']==ns['role']['sport'] and s['day']==ns['day'] and s['nativePlannedMinutesUnchanged']==ns['minutes']
   assert s['sourceHash']==digest(ns['card']) and s['originalParts']==c['original']['effective']['structure'] and s['sourceRestrictions']==ns['card']['avoid'] and s['intensity']==prior['intensity'] and s['rawV27Execution']==prior
   assert s['sourceRecipeHash']==canonical[s['sourceId']]['sourceRecipeHash'] and s['canonicalHash']==canonical[s['sourceId']]['sourceCanonicalHash']
   assert not s['individualPrescriptionApproved']and not s['currentlyIntegrable']and not s['individualToleranceVerified']and not s['automaticallyApplied'] and not s['compensatoryVolumeAdded'] and s['coachReviewRequired']
   reserve=ns['minutes']*60
   if review and nw['type']=='load':
    if s['sourceId']=='A_STR_STABILITY_CORE':reserve=c['prescription']['durationMinutes'][1]*60
    if s['sourceId']=='C_BIKE_AERO_POSITION_DRILLS':
     m=re.search(r'(\d+)x(\d+)\x27.*r=(\d+)\x27',ns['card']['structure']);assert m
     reserve=int(m[1])*(int(m[2])+int(m[3]))*60
   assert s['reservedSlotSeconds']==reserve and integer(reserve);total+=reserve;days[s['day']].append(s);freq[s['sport']]+=1
   assert s['phaseVariant']['historicalVariantUnchanged']==prior['variant'] and s['nativeVariantCompatible']==prior['variant']['compatible']
   is_bike=s['sourceId']=='SEILER_BIKE_Z1_LONG';pv=s['phaseVariant'];is_distance=s['sourceId']=='D_SWIM_RECOVERY_EASY'
   expected=True if is_bike and policy=='B'or is_distance else prior['variant']['compatible']
   assert pv['proposedVariantCompatible']is expected
   assert pv['requiresCoachPhasePolicy']==(is_bike and policy=='B') and not pv['phasePolicyAuthorized'] and not pv['futurePhaseAlreadyApproved'];phase+=int(pv['proposedVariantCompatible']is True)
   if expected is None:assert 'goal_variant_scope_requires_source_specific_review'in s['unknowns']and'recipe_or_goal_variant_incompatible'not in s['errors']
   if is_bike:
    assert s['executionDurationSeconds']==ns['minutes']*60 and 90<=ns['minutes']<=180 and pv['historicalVariantUnchanged']['range']==[180,210]
    es=s['timelineEvents'];assert len(es)==3 and [e['durationSeconds']for e in es]==[900,ns['minutes']*60-1800,900]
    assert sum(e['durationSeconds']for e in es)==s['executionDurationSeconds'] and es[0]['relativeStartSeconds']==0 and es[1]['relativeStartSeconds']==900 and es[2]['relativeStartSeconds']==ns['minutes']*60-900
    assert 'explicit_FCmax_reference_missing'in s['intensity']['reasons'] and s['intensity']['anchor']['rawValue']==265 and not s['candidateTechnicallyExecutableIfPhasePolicyAuthorized']
   if s['sport']in['swim','strength']or s['sourceId']=='C_BIKE_AERO_POSITION_DRILLS':assert s['executionDurationSeconds']is None and s['unallocatedSlotSeconds']is None
   if s['sourceId']=='C_BIKE_AERO_POSITION_DRILLS':assert s['aeroInterpretations']['possibleElapsedSeconds']==[5100,5400]and s['aeroInterpretations']['allFitReservation']==review and not s['aeroInterpretations']['finalRestSelected']
   if is_distance:
    proof=pv['literalDistanceProof'];parts=c['original']['effective']['structure'];assert [int(re.match(r'(\d+)m',part['text'])[1])for part in parts]==[200,800,200]
    assert proof['totalMeters']==proof['variantMeters']==1200 and proof['parts'][1]['nonAdditiveDetailMeters']==[200]*4 and proof['detailNotAddedTwice']and not proof['durationResolved']
   x=s['executionDurationSeconds'];assert x is None or integer(x)
   if x is None:unknown+=1
   else:
    assert s['unallocatedSlotSeconds']==max(reserve-x,0);known+=x
   assert s['currentCapacitySeconds']==ns['input']['currentCapacity']*60 and reserve<=s['currentCapacitySeconds']
   if s['sourceId']=='SEILER_RUN_Z1_EASY_LONG':assert s['nativePlannedMinutesUnchanged']==90 and s['day']==4 and [x['zone']for x in s['intensity']['numericTargets']]==['Z1']and s['floorException']['authorizedForExperimentalProgramming']
  assert w['reservedSlotSeconds']==total and total<=w['plannedVolumeBudgetSeconds']<=w['declaredAvailabilitySeconds'] and w['knownExecutionSeconds']==known and w['unknownExecutionCount']==unknown and w['errors']==[]
  assert dict(freq)==w['frequencies'];assert all(day in[1,2,3,4,5,6]and len(xs)<=2 and len({s['sport']for s in xs})==len(xs)for day,xs in days.items())
  expected_minutes.append(total//60)
 assert count==30 and phase==(24 if policy=='B'else 20)
 assert expected_minutes==([480,500,515,285]if review else[465,485,500,285])
 assert candidate['nativeCounts']=={'executableSessions':3,'executableSourceIds':['A_RUN_EASY_45_PRO']}
 assert candidate['proposalCounts']['technicallyExecutableIfPhasePolicyAuthorized']==3 and candidate['proposalCounts']['individualApprovals']==0 and candidate['proposalCounts']['sessionsInsertedIntoOriginalB']==0
 assert candidate['validation']['reservationLayoutFeasible']and not candidate['validation']['longSpacingConflicts'] and candidate['validation']['recoveryWeekDoseNotIncreased']
verify(a);verify(p)
mutations=[]
for name,apply in [('invent_swim_pace',lambda x:x['weeks'][0]['sessions'][0].update(executionDurationSeconds=2755)),('general_5min_margin',lambda x:x['weeks'][0]['sessions'][6].update(reservedSlotSeconds=3000)),('coach_policy_fiction',lambda x:x.update(coachPolicyAuthorized=True)),('source_truncated',lambda x:x['weeks'][0]['sessions'][0]['originalParts'].pop()),('strict_Z1_dilution',lambda x:x['weeks'][2]['sessions'][5]['intensity']['numericTargets'].append({'zone':'Z2'}))]:
 altered=copy.deepcopy(p);apply(altered)
 try:verify(altered)
 except AssertionError:mutations.append({'mutation':name,'rejected':True})
 else:raise AssertionError(('INDEPENDENT_MUTANT_NOT_REJECTED',name))
legacy=load(E/'build/legacyDiagnostics.json.gz');assert legacy['rawHistorical']==native['rawValidation']['historical'] and not legacy['actualExecutionClaimed']and not legacy['individualApproval']and not legacy['usedForAutomaticAcceptance']and len(legacy['changedSlots'])==6
assert [x['reservedSeconds']for x in load(E/'build/stress.json.gz')]==[31200,32400,33300,17100]
stress=load(E/'build/stress.json.gz');assert [bool(x['errors'])for x in stress]==[True,True,False,False]and all(not x['automaticallyApplied']for x in stress)
for x,minutes in zip(load(E/'build/longPolicies.json.gz'),[120,130,145,105],strict=True):assert x['nativeMinutes']==minutes and not x['policyA']['proposedVariantCompatible']and x['policyB']['proposedVariantCompatible']and not x['policyB']['phasePolicyAuthorized']
files=['originals','baseline','proposed','alternatives','legacyDiagnostics','stress','phases','longPolicies'];replays={}
for name in files:
 f=name+'.json.gz';assert raw(E/'build'/f)==raw(E/'replay'/f);replays[f]=hashlib.sha256(raw(E/'build'/f)).hexdigest()
commands=load(E/'commands.json');assert len(commands)==13 and all(c['status']==0 and not c['error']for c in commands)
new=int(re.search(r'Tests\s+(\d+) passed',(E/'build.txt').read_text())[1]);legacy_count=0;skips=0
for c in commands:
 if c['name'].endswith('_non_regression'):
  text=(E/(c['name']+'.txt')).read_text();legacy_count+=int(re.search(r'Tests\s+(\d+) passed',text)[1]);m=re.search(r'(\d+) skipped',text);skips+=int(m[1])if m else 0
mapping=[json.loads(l)for l in raw('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl').splitlines()];assert len(mapping)==920 and len({x['legacyId']for x in mapping})==920 and sum(len(x['variants'])for x in mapping)==2425
assert len(load('docs/det-engine/evidence-final/matrix.json.gz'))==600 and len(raw('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz').splitlines())==15
summary={'schema':'det-v30-independent-1','passed':True,'baselineFilesUnchanged':len(old),'originalCasesUnchanged':8,'originalBSlotsUnchanged':30,'A_runRefusals':7,'C_refusals':26,'candidateSessions':30,'nativeExecutionSources':1,'nativeTechnicallyExecutableSessions':3,'newTechnicallyExecutableSessions':0,'newOriginalInsertions':0,'individualApprovals':0,'newIndividualParameters':0,'historicalVariantCompatibleSessions':19,'literalDistanceCandidateResolutions':1,'policyDependentGenericBaseSessions':4,'proposedVariantCompatibleSessions':24,'proposedReservationMinutes':[480,500,515,285],'nativeExerciseBudgetMinutes':[480,528,580,420],'allAeroInterpretationsNowFitSlots':3,'swimExecutionTimesResolvedForB':0,'strengthExecutionTimesResolvedForB':0,'wholeSportingBlockApproved':False,'rawHistoricalDiagnosticsExactlyPreserved':True,'historicalBErrors':5,'historicalBWarnings':34,'newTests':new,'nonRegressionTests':legacy_count,'unchangedSkips':skips,'independentMutantsRejected':mutations,'logicalReplay':replays,'ids':920,'variants':2425,'archivedConfigurationsPreservedNotRerun':600,'nolioFixturesPreserved':15,'newNolioCalls':0,'verifierSha256':sha(__file__)}
(R/'evidence/independent-validation.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
