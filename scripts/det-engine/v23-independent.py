"""Independent stdlib audit of scope, capacities, original inputs, rejected trials and arithmetic."""
import collections,gzip,hashlib,json,pathlib,sys
R=pathlib.Path('docs/det-engine/v23');E=R/'evidence/validation-1'
def raw(p):
 p=pathlib.Path(p)
 if not p.exists():p=pathlib.Path(str(p)+'.gz')
 return gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes()
def load(p):return json.loads(raw(p))
def sha(b):return hashlib.sha256(b).hexdigest()
def lines(p):return[json.loads(l)for l in raw(p).decode().splitlines()if l]
old=load(R/'baseline-files.json');mutable={'experimental/det-engine/v14-calendar.ts','experimental/det-engine/v22-prescription.ts'};changed=[]
for p,h in old.items():
 assert pathlib.Path(p).is_file(),p
 if sha(pathlib.Path(p).read_bytes())!=h:changed.append(p)
assert set(changed)==mutable,changed
spec=load(R/'inputs.json');assert sha(raw(spec['baselineInputsPath']))==spec['baselineInputsSha256']
registered=load(E/'build/registered-cases.json');assert len(registered)==8
original=load('docs/det-engine/v22/evidence/baseline-1/registered-full-inputs.json');assert[{'id':x['id'],'raw':x['input']['raw'],'form':x['input']['form'],'evidence':x['input']['evidence']}for x in registered[:3]]==original
reg_by={r['id']:r for r in registered}
for c in spec['counterfactuals']:
 row=reg_by[c['id']];seed=next(x for x in original if x['id']==c['base']);expected={**seed['raw'],**c.get('rawOverrides',{})};assert row['input']['raw']==expected and row['input']['form']==seed['form']and row['counterfactual']==c
rows=load(E/'build/results.json.gz');assert len(rows)==8
archived=load('docs/det-engine/v22/evidence/validation-1/build/prospective/results.json.gz');mapping=lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl');source={x['legacyId']:x['source']['effective']for x in mapping};assert len(source)==920 and sum(len(x['variants'])for x in mapping)==2425
assert len(lines('docs/det-engine/v20/evidence/validation-2/build/review/scientific-review.jsonl.gz'))==96
assert len(lines('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz'))==15
prior=load('docs/det-engine/v22/evidence/independent-after-archive.json');assert prior['historicalCasesPreservedByHashes']==600 and prior['priorCandidateViews']==418

def signature(result):return sorted((w['week'],s['role']['sport'],s['card']['id'],s['minutes'],s['day'])for w in result['calendar']['weeks']for s in w['slots'])
def count_issues(result):return collections.Counter((i['code'],i.get('week'),i['severity'],i.get('control'))for i in result['rawValidation']['historical']['issues']if i['severity']in ['warning','error','critical','blocking'])
reports=[];total_slots=0;capacity_conflicts=0;rejected_alternatives=0;rejected_trials=0;observations=0
for i,row in enumerate(rows):
 assert row['input']==reg_by[row['caseId']];v=row['after'];result=v['result'];before=row['before'];p=row['profileConfig'];caps=row['profileCaps'];scope=v['scope'];input=row['input']['input'];case=row['input']['counterfactual'];c=result['calendar'];plan=c['calendar']
 if i<3:assert before==archived[i]['after']
 assert len(c['weeks'])==4 and len(plan['weeks'])==4 and plan['totalWeeks']==4
 assert scope['executedBlockChecksPass']and scope['executedBlockErrors']==[]and scope['completeCalendar']
 assert scope['rawHistoricalIssuesUnchanged']==result['rawValidation']['historical']['issues']
 assert sum(h['classification']=='historical_sixteen_week_scope'for h in scope['historicalClassifications'])==4
 assert not scope['fullIronmanPreparationValidated']and not scope['currentlyPrescribable']and not v['automaticApproval']
 assert not(count_issues(result)-count_issues(before)),row['caseId']
 assert signature(before)==signature(result),('retained_schedule_must_not_silently_change',row['caseId'])
 accepted=v['programmingAcceptance'];trial=v.get('rejectedProgrammingAttempt');moves=0
 if trial:
  rejected_trials+=1;assert accepted['proposed']and not accepted['accepted']
  delta=count_issues(trial)-count_issues(before);assert delta==collections.Counter({('anti_repetition',3,'warning','plan_validator_complete_context'):1})
  assert accepted['newHistoricalFailuresOrWarnings']and accepted['newHistoricalFailuresOrWarnings'][0]['added']==1
  pairs=list(zip(signature(before),signature(trial),strict=True));moves=sum(a!=b for a,b in pairs);assert moves==6
  for a,b in pairs:assert a[:4]==b[:4] # only day changes, never a dose or source
  for w in trial['calendar']['weeks'][:3]:
   bike=next(s for s in w['slots']if s['role']['sport']=='bike'and s['role']['kind']=='long');assert len([s for s in w['slots']if s['day']==bike['day']])==1
 assert not accepted['accepted'] # current input cohort justifies no accepted calendar alteration
 all_longs=[];states=collections.Counter();week_rows=[]
 for w,pw in zip(c['weeks'],plan['weeks'],strict=True):
  total_slots+=len(w['slots']);assert w['week']==pw['weekNumber'];assert len(w['days'])==7 and set(s['dayIndex']for s in pw['sessions'])==set(range(7))
  active=[s for s in pw['sessions']if not s.get('isRest')];assert len(active)==len(w['slots'])
  assert sum(s['minutes']for s in w['slots'])==w['reservedMinutes']<=w['budget']<=600
  q=plan['weeklyQuotas'][str(w['week'])];assert w['budget']==min(600,q['volumeBudget']['maxMinutes'])
  frequencies=collections.Counter(s['role']['sport']for s in w['slots']);byday=collections.defaultdict(list);ids=set()
  for s in w['slots']:
   assert s['day']in [1,2,3,4,5,6];byday[s['day']].append(s);assert s['card']['id']not in ids;ids.add(s['card']['id'])
   assert all(x['text']in s['card']['structure']for x in source[s['card']['id']]['structure'])
   d=next(d for d in result['decisions']if d['slotKey']==s['key']);assert d['sourceInstructionsUnchanged']==source[s['card']['id']]['structure']and not d['individualPrescriptionApproved']
   actual=[x for x in active if x['catalogId']==s['card']['id']];assert len(actual)==1 and actual[0]['durationMin']==s['minutes']and actual[0]['dayIndex']==s['day']and actual[0]['details']==s['card']['structure']
   expected_cap=caps['long'][s['role']['sport']]if s['role']['kind']=='long'else caps['normal'][s['role']['sport']]
   assert expected_cap==s['role']['currentCapacity']==s['input']['currentCapacity']
   cap=next(x for x in v['capacity']if x['slotKey']==s['key']);assert cap['documentedEnvelope']==expected_cap and cap['currentlyWithinEnvelope']==(s['minutes']<=expected_cap)
   assert cap['adaptationActuallyObserved']is None and cap['assimilationActuallyObserved']is None and not cap['currentIndividualDoseApproved']and not cap['elapsedWeekCreatesCapacity']
   if s['minutes']>expected_cap:
    capacity_conflicts+=1;alt=cap['alternative'];assert alt['proposedMinutes']==expected_cap and alt['status']=='rejected'and not alt['applied'];assert expected_cap<s['role']['floor']and 'unchanged_native_sporting_floor_would_be_violated'in alt['reasons'];rejected_alternatives+=1
    assert s['decision']['state']!='currently_admissible'
   assert s['minutes']>=s['role']['floor']and s['timing']['necessaryRange'][0]<=s['minutes']<=s['timing']['necessaryRange'][1]
   assert not s['decision']['operationallyApproved'];states[s['decision']['state']]+=1
   if s['role']['kind']=='long':
    day=(w['week']-1)*7+s['day'];assert all(abs(day-prev)>1 for prev in all_longs);all_longs.append(day)
  assert all(frequencies[s]==q['quota'][s]['min']for s in ['swim','bike','run','strength']);assert all(len(x)<=2 and len({s['role']['sport']for s in x})==len(x)for x in byday.values())and 7-len(byday)>=1
  week_rows.append({'week':w['week'],'minutes':w['reservedMinutes'],'byDiscipline':{sport:sum(s['minutes']for s in w['slots']if s['role']['sport']==sport)for sport in ['swim','bike','run','strength']},'frequency':dict(frequencies)})
 if case and case.get('observation'):
  observations+=1;assert len(v['appliedObservations'])==1;due=[d for d in result['decisions']if d['week']==2 and d['sport']=='bike'and d['role']['kind']=='long'];assert len(due)==1 and due[0]['state']=='not_admissible'and 'documented_adverse_recovery_hold'in due[0]['hardFailures']
  assert before['status']=='complete_conditional_candidate'and result['status']=='incomplete_or_refused'
 if row['caseId']=='A_aerobic':
  conflict=row['runReferenceConflict'];assert conflict['rawUnchanged']['runEconomyScore']==3 and conflict['actualDiagnostic']['observedPct']==82.8 and conflict['directPrediction']['mlssPct']==95 and conflict['directCrossValidation']['deltaPct']==-12.2;assert not conflict['rawReferenceChanged']and not conflict['productionFormulaChanged']and not conflict['favourableCEInvented'];assert states['not_admissible']==7
 if row['caseId']=='C_uncertain':assert states['not_admissible']==26
 if row['caseId']=='B_insufficient_differentiation':assert v['programming']['policy']is None and 'no_observed_bike_sustainability_evidence'in v['programming']['noDifferenceReasons']
 reports.append({'caseId':row['caseId'],'retainedScheduleUnchanged':True,'priorityTrialRejected':trial is not None,'trialDayMoves':moves,'retainedStatus':result['status'],'states':dict(states),'blockErrors':0,'scopeErrorsRetained':4,'historicalWarnings':result['rawValidation']['historical']['warnings'],'capacityConflicts':len(scope['currentCapacityConflicts']),'weeks':week_rows})
assert total_slots==240 and rejected_trials==3 and rejected_alternatives==9 and observations==1
replay={}
for n in ['registered-cases.json','results.json.gz']:
 assert raw(E/'build'/n)==raw(E/'replay'/n),n;replay[n]=sha(raw(E/'build'/n))
for p,h in load(E/'source-pins.json').items():assert sha(pathlib.Path(p).read_bytes())==h,p
out={'version':'det-v23-independent-1','independentPass':True,'oldFiles':len(old),'oldUnchanged':len(old)-len(changed),'experimentalSourceExtensions':sorted(changed),'archivedV2ThroughV22Untouched':True,'preservedIds':920,'preservedVariants':2425,'preservedHistoricalCasesByHashes':600,'preservedPriorCandidates':96,'preservedPriorViews':418,'preservedNolioFixtures':15,'cases':reports,'checkedSlots':total_slots,'checkedCalendarDays':224,'rejectedPriorityTrials':rejected_trials,'retainedCalendarChanges':0,'rejectedCapacityAlternatives':rejected_alternatives,'currentEnvelopeConflictsExplicit':capacity_conflicts,'adverseRecoveryHoldsApplied':observations,'noNewRetainedHistoricalFailuresOrWarnings':True,'replayLogicalFiles':replay,'actualIndividualApprovals':0,'actualHumanSportingReviews':0}
p=pathlib.Path(sys.argv[1]);assert not p.exists();p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:out[k]for k in ['independentPass','checkedSlots','checkedCalendarDays','rejectedPriorityTrials','rejectedCapacityAlternatives','adverseRecoveryHoldsApplied','oldUnchanged']}))
