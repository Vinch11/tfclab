"""Independent exact-second accounting/provenance checks. No planner/compiler implementation imported."""
import collections,copy,gzip,hashlib,json,pathlib,sys
R=pathlib.Path('docs/det-engine/v29');E=R/'evidence'/('validation-'+(sys.argv[1] if len(sys.argv)>1 else '1'))
def raw(p):
 p=pathlib.Path(p);b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def load(p):return json.loads(raw(p))
def sha(b):return hashlib.sha256(b).hexdigest()
def digest(v):return sha(json.dumps(v,ensure_ascii=False,separators=(',',':')).encode())
def integer(v):return type(v)is int and 0<=v<=9007199254740991
for f,h in load(E/'executed-source-pins.json').items():assert sha(pathlib.Path(f).read_bytes())==h,('runtime_changed',f)
for f,h in load(R/'baseline-files.json').items():assert sha(pathlib.Path(f).read_bytes())==h,('old_file_changed',f)
reg=load(R/'inputs.json');assert load(E/'build/registration.json.gz')==reg
archives={}
for k,v in reg['sourceArtifacts'].items():
 assert sha(pathlib.Path(v['path']).read_bytes())==v['sha256'];archives[k]=load(v['path'])
source={s['context']['scenarioId']:s for s in archives['scenarios']};base=archives['originals'][1]['result'];old_slots={s['key']:s for w in base['calendar']['weeks']for s in w['slots']}
originals=load(E/'build/originals.json.gz');assert len(originals)==3
for new,old in zip(originals,archives['originals'],strict=True):
 assert new['caseId']==old['caseId'] and new['inputHash']==digest(old['input']) and new['retainedHash']==digest(old['result']) and new['rawHistorical']==old['result']['rawValidation']['historical'] and new['calendarPreserved']
 assert [x['slotKey']for x in new['refusals']]==[d['slotKey']for d in old['result']['decisions']if d['state']=='not_admissible']
assert sum(x['sport']=='run'for x in originals[0]['refusals'])==7 and len(originals[2]['refusals'])==26
rows=load(E/'build/scenarios.json.gz');assert len(rows)==11
def verify(row):
 s=source[row['scenarioId']];old=s['result'];b=row['bridge'];block=row['block'];n=row['nolio'];req=row['request'];events=b['timelineEvents'];native=old_slots[b['slotKey']]
 assert row['sourceId']==b['sourceId']==s['sourceId'] and b['sourceHash']==old['sourceHash'] and b['sourceRecipeHash']==old['sourceRecipeHash']
 assert row['v28Source']['rowHash']==req['sourceRowHash']==b['evidenceBinding']['sourceRowHash']==digest(s)
 assert b['subjectCaseId']=='B_sustainability' and b['evidenceBinding']['subjectInputHash']==digest(archives['originals'][1]['input']) and b['evidenceBinding']['nativeCalendarHash']==digest(base)
 assert b['sourceSlotHash']==digest(native) and b['week']==native['week'] and b['day']==native['day'] and b['sport']==native['role']['sport']
 assert b['individualApprovalStatus']['individualDoseApproved'] is False and b['individualApprovalStatus']['currentlyIndividuallyAdmissible'] is False and b['individualApprovalStatus']['coachApproved'] is False
 assert not b['newCoachPolicyAuthorized'] and not b['automaticallyApplied'] and not b['realExportAuthorized'] and not block['insertedIntoOriginalB'] and not block['individualDoseApproved'] and not block['fullBlockSportingApproval']
 assert b['legacyCompatibility']['nativeDurationMinutes']==native['minutes'] and b['legacyCompatibility']['nativeDurationSeconds']==native['minutes']*60 and b['legacyCompatibility']['semantics']=='exact_planned_exercise_minutes_not_an_upper_bound' and b['legacyCompatibility']['originalSessionUnchanged'] and not b['legacyCompatibility']['directInsertionAuthorized']
 assert b['legacyCompatibility']['v28RejectedTrialRaw']['scopeErrors']==s['wholeBlockReview']['scope']['executedBlockErrors'] and b['legacyCompatibility']['v28RejectedTrialRaw']['rawHistorical']==s['wholeBlockReview']['rawHistorical']
 expected_events=old['timeline']['events'];assert len(events)==len(expected_events) and len({x['eventId']for x in events})==len(events)
 cursor=0;known=old['seconds']is not None
 for i,(e,raw_event)in enumerate(zip(events,expected_events,strict=True)):
  assert e['originalEvent']==raw_event and e['occurrenceIndex']==i and e['accounting']=='additive' and integer(e['durationSeconds']) and e['durationSeconds']==raw_event['seconds']
  assert e['eventId']==row['scenarioId']+':'+row['sourceId']+':'+str(i)+':'+digest(raw_event)
  assert e['relativeStartSeconds']==(cursor if known else None);cursor+=e['durationSeconds']
 assert b['durationAccounting']['contributionSumSeconds']==cursor and not b['durationAccounting']['marginIsTraining'] and not b['durationAccounting']['slackAddedToEvents']
 assert b['executionDurationSeconds']==old['seconds'] and b['reservedSlotSeconds']==s['fixture']['availableMinutes']*60 and integer(b['reservedSlotSeconds'])
 expected_unallocated=None if not known else max(b['reservedSlotSeconds']-old['seconds'],0)
 assert b['unallocatedSlotSeconds']==expected_unallocated
 if known:
  assert integer(old['seconds']) and cursor==old['seconds'] and b['knownSourceTimeline']
  assert b['compatibleWithReservedSlot']==(old['seconds']<=b['reservedSlotSeconds'])
  assert b['durationAccounting']['overrunSlotSeconds']==max(old['seconds']-b['reservedSlotSeconds'],0)
  assert b['legacyCompatibility']['executionRepresentableAsIntegerMinutes']==(old['seconds']%60==0)
  assert b['legacyCompatibility']['sameExecutionAsNativeDuration']==(old['seconds']==native['minutes']*60)
  assert b['programmingFloorSeconds']==native['role']['floor']*60 and b['capacitySeconds']==native['input']['currentCapacity']*60
 else:assert not b['knownSourceTimeline'] and b['compatibleWithReservedSlot'] is None and b['unallocatedSlotSeconds'] is None
 assert b['technicallyCompleteInScenario']==old['technically_complete_in_scenario']
 assert b['documentedSchedule']['status']=='unknown_clock_times_not_documented' and not b['documentedSchedule']['clockConflictFreedomEstablished']
 assert block['legacyCalendarHash']==digest(base) and block['legacyRawHistoricalUnchanged']==base['rawValidation']['historical'] and block['legacyFourWeekScopeUnchanged']==s['wholeBlockReview']['beforeScope'] and not block['legacyResultReplaced']
 assert len(block['weeks'])==4
 target_count=0;budgets=True;known_total=0
 for w,original in zip(block['weeks'],base['calendar']['weeks'],strict=True):
  assert w['week']==original['week'] and w['phase']==original['phase'] and w['weekType']==original['type'];assert len(w['slots'])==len(original['slots'])
  total=0;known_week=0;unknown_week=0;slack=0
  for x,prior in zip(w['slots'],original['slots'],strict=True):
   target=prior['key']==b['slotKey'];target_count+=target
   assert x['slotKey']==prior['key'] and x['sourceId']==prior['card']['id'] and x['sport']==prior['role']['sport'] and x['day']==prior['day'] and x['legacyDurationMinUnchanged']==prior['minutes']
   expected_reservation=b['reservedSlotSeconds']if target else prior['minutes']*60;assert x['reservedSlotSeconds']==expected_reservation and integer(expected_reservation);total+=expected_reservation
   assert x['executionDurationSeconds']==(old['seconds']if target else None) and x['unallocatedSlotSeconds']==(expected_unallocated if target else None)
   if x['executionDurationSeconds']is None:unknown_week+=1
   else:known_week+=x['executionDurationSeconds']
   if x['unallocatedSlotSeconds']is not None:slack+=x['unallocatedSlotSeconds']
  assert w['totalReservedSlotSeconds']==total and w['weeklyReservationBudgetSeconds']==original['budget']*60 and w['originalLegacyPlannedSeconds']==sum(x['minutes']*60 for x in original['slots'])
  assert w['knownExecutionSeconds']==known_week and w['unknownExecutionSlots']==unknown_week and w['totalUnallocatedSecondsKnownOnly']==slack and not w['actualWeeklyExerciseDurationEstablished'];known_total+=known_week
  budgets=budgets and total<=w['weeklyReservationBudgetSeconds']
 assert target_count==1 and known_total==(old['seconds']if known else 0)
 assert block['noNewComplementaryDefect']==(not b['errors'] and budgets)
 if row['sourceId']in['C_SWIM_CATCH_FOCUS','C_SWIM_TRI_CATCH_PULL','A_SWIM_CONTINUOUS_2K']and known:
  assert block['weeks'][0]['totalReservedSlotSeconds']==29100 and block['weeks'][0]['weeklyReservationBudgetSeconds']==28800 and 'reserved_week_budget_exceeded:1'in block['additionalErrors'] and not block['noNewComplementaryDefect']
 if row['sourceId']=='A_STR_STABILITY_CORE'and known:assert block['weeks'][0]['totalReservedSlotSeconds']==28500 and block['noNewComplementaryDefect']
 if row['floatingWitness']:
  f=row['floatingWitness'];assert f['strictEquality']is False and f['legacyActiveMinuteSum']!=f['legacyStoredMinuteSum'] and any(x['code']=='four_week_budget_arithmetic'for x in f['rawError'])
 assert n['networkRequests']==0 and not n['realExportAuthorized'] and not n['individualPrescriptionApproved'] and n['structuredNolio']['status']=='refused' and n['structuredNolio']['payload']is None
 if known:
  internal=n['internalWorkout'];assert internal['executionDurationSeconds']==old['seconds'] and internal['reservedSlotSeconds']==b['reservedSlotSeconds'] and internal['unallocatedSlotSeconds']==expected_unallocated and internal['timelineEvents']==events
  assert all(p in n['reviewText']for p in [part['text']for part in s['sourceSnapshot']['canonical']['original']['effective']['structure']])
  assert n['localRoundTripPass'] and internal['sourceId']==row['sourceId'] and internal['sourceHash']==b['sourceHash']
 if n['payload']:
  p=n['payload'];assert block['noNewComplementaryDefect'] and b['complementaryConstraintsPass'] and p['duration']==old['seconds'] and integer(p['duration']) and 'structured_workout'not in p
  assert p['date_start']==n['internalWorkout']['date'] and str(old['seconds'])in p['description'] and all(part['text']in p['description']for part in s['sourceSnapshot']['canonical']['original']['effective']['structure'])
 else:assert not block['noNewComplementaryDefect']
for row in rows:verify(row)
assert sum(x['bridge']['knownSourceTimeline']for x in rows)==7 and sum(x['bridge']['technicallyCompleteInScenario']for x in rows)==6 and sum(x['block']['noNewComplementaryDefect']for x in rows)==3 and sum(x['nolio']['payload']is not None for x in rows)==3
assert sum(x['floatingWitness']is not None for x in rows)==2
schedule_rows=load(E/'build/schedules.json.gz');assert len(schedule_rows)==4
for x in schedule_rows:
 id=x['input']['id'];assert x['result']['status']==('unknown_clock_times_not_documented'if id=='unknown'else'documented_windows_compatible'if id=='separate'else'conflict')
 if id in['overlap','too_short_window']:assert not x['block']['noNewComplementaryDefect']
mutants=[]
for name,index,change in [
 ('margin_as_exercise',3,lambda x:x['bridge']['timelineEvents'].append({'durationSeconds':545,'accounting':'additive','originalEvent':{'seconds':545,'kind':'invented_training'}})),
 ('rounded_execution',3,lambda x:x['bridge'].update(executionDurationSeconds=2760)),
 ('double_event',0,lambda x:x['bridge']['timelineEvents'].append(copy.deepcopy(x['bridge']['timelineEvents'][0]))),
 ('changed_source',3,lambda x:x['bridge'].update(sourceHash='invented')),
 ('false_individual_approval',8,lambda x:x['bridge']['individualApprovalStatus'].update(individualDoseApproved=True)),
 ('clear_budget_failure',3,lambda x:x['block'].update(noNewComplementaryDefect=True))]:
 x=copy.deepcopy(rows[index]);change(x)
 try:verify(x)
 except AssertionError:mutants.append({'mutation':name,'rejected':True})
 else:raise AssertionError(('independent_mutation_not_rejected',name))
replay={}
for f in ['registration.json.gz','originals.json.gz','scenarios.json.gz','schedules.json.gz']:
 b=raw(E/'build'/f);assert b==raw(E/'replay'/f);replay[f]=sha(b)
commands=load(E/'commands.json');assert len(commands)==12 and all(c['status']==0 and not c['error']for c in commands)
mapping=[json.loads(l)for l in raw('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl').splitlines()];assert len(mapping)==920 and len({x['legacyId']for x in mapping})==920 and sum(len(x['variants'])for x in mapping)==2425
assert len(load('docs/det-engine/evidence-final/matrix.json.gz'))==600 and len(raw('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz').splitlines())==15
assert sum(p['A']['compatible']is False for p in archives['phases'])==4 and all(p['B']['automaticPermission']is False for p in archives['phases'])
fractional=sorted({x['sourceId']for x in rows if x['bridge']['knownSourceTimeline']and x['bridge']['executionDurationSeconds']%60})
qualified=sorted({x['sourceId']for x in rows if x['bridge']['knownSourceTimeline']and x['bridge']['executionDurationSeconds']%60 and x['bridge']['technicallyCompleteInScenario']})
summary={'schema':'det-v29-independent-1','passed':True,'previousFilesUnchanged':len(load(R/'baseline-files.json')),'originalCalendarsUnchanged':3,'originalReservationsUnchanged':90,'v28ScenariosUnchanged':11,'technicallyCompleteScenarios':6,'losslessTransportedTimelines':7,'transportedFractionalSourceIds':fractional,'transportedFractionalGoalCompatibleSourceIds':qualified,'compatibleReservedSlots':sum(x['bridge']['compatibleWithReservedSlot']is True for x in rows),'noNewComplementaryBlockDefects':3,'v28WholeBlockNoNewDefects':sum(x['v28Source']['wholeBlockAccepted']for x in rows),'wholeBlockSportingApprovals':0,'individualApprovals':0,'newOriginalBCalendarInsertions':0,'BOriginalExecutionsUnchanged':3,'reproducedFloatingWitnesses':2,'newPathFloatToleranceUsed':False,'weeklyReservationBudgetFailures':3,'localExactTextPayloads':3,'internalExactWorkouts':7,'officialStructuredNolioPayloads':0,'realNolioCalls':0,'A_runRefusals':7,'C_individualRefusals':26,'longBikeVariantConflictsPreserved':4,'newCoachPolicyAuthorizations':0,'preservedIds':920,'preservedVariants':2425,'preservedHistoricalConfigurationsNotRerun':600,'preservedNolioFixtures':15,'independentNegativeChecks':mutants,'logicalReplay':replay,'verifierSha256':sha(pathlib.Path(__file__).read_bytes())}
(R/'evidence/independent-validation.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
