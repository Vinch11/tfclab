"""Independent stdlib verification: no TS selector, validator, physiologic formula or planner imported."""
import collections, datetime, gzip, hashlib, json, pathlib, re, sys
R=pathlib.Path('docs/det-engine/v24')
E=R/'evidence'/('validation-'+(sys.argv[1] if len(sys.argv)>1 else '2'))
def raw(p):
 p=pathlib.Path(p);b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def load(p):return json.loads(raw(p))
def lines(p):return[json.loads(l)for l in raw(p).splitlines()if l]
def sha(b):return hashlib.sha256(b).hexdigest()
def signature(r,days=True):return sorted((w['week'],s['key'],s['card']['id'],s['minutes'],s['day'] if days else None)for w in r['calendar']['weeks']for s in w['slots'])
def issues(r,full=False):return collections.Counter(json.dumps(i if full else [i['code'],i.get('week'),i['severity'],i.get('control')],sort_keys=True,ensure_ascii=False)for i in r['rawValidation']['historical']['issues']if i['severity']in['warning','error','critical','blocking'])
baseline=load(R/'baseline-files.json')
for p,h in baseline.items():assert pathlib.Path(p).is_file()and sha(pathlib.Path(p).read_bytes())==h,('prior_file_changed',p)
spec=load(R/'inputs.json')
for p,h in spec['sourceInputs'].items():assert sha(raw(p))==h
mapping=lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl');assert len(mapping)==920 and len({x['legacyId']for x in mapping})==920 and sum(len(x['variants'])for x in mapping)==2425
source={x['legacyId']:x['source']['effective']for x in mapping}
historical=load('docs/det-engine/evidence-final/matrix.json.gz');assert len(historical)==600 and len({x['id']for x in historical})==600
review=lines('docs/det-engine/v20/evidence/validation-2/build/review/scientific-review.jsonl.gz');assert len(review)==96 and len({x['legacyId']for x in review})==51
assert sum(len(x['candidates'])for x in lines('docs/det-engine/v20/evidence/validation-2/build/review/review.jsonl.gz'))==418
assert len(lines('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz'))==15
registered=load(E/'build/registered-cases.json');assert registered==load('docs/det-engine/v23/evidence/validation-1/build/registered-cases.json')
rows=load(E/'build/results.json.gz');old={x['caseId']:x for x in load('docs/det-engine/v23/evidence/validation-1/build/results.json.gz')};assert len(rows)==8
reports=[];total_slots=0;moves_total=0;retained_cases=0;coach_proposals=0;floor_proposals=0;capacity_conflicts=0
for row in rows:
 v=row['result'];r=v['result'];b=v['before']['result'];assert row['input']==old[row['caseId']]['input'];assert v['before']==old[row['caseId']]['after']
 assert not(issues(r)-issues(b))and not(issues(r,True)-issues(b,True)),('new_raw_historical_witness',row['caseId'])
 assert signature(r,False)==signature(b,False)
 moves=sum(a!=z for a,z in zip(signature(b),signature(r),strict=True));moves_total+=moves
 assert not v['automaticApproval']and not v['scientificIndividualValidation']and not v['capacityIncreased']
 scope=v['scope'];assert scope['executedBlockErrors']==[] and not scope['currentlyPrescribable']and not scope['fullIronmanPreparationValidated']
 assert scope['rawHistoricalIssuesUnchanged']==r['rawValidation']['historical']['issues'];assert sum(x['classification']=='historical_sixteen_week_scope'for x in scope['historicalClassifications'])==4
 if v['retainedModel']:
  retained_cases+=1;assert v['retainedModel']=='space_peak_bike_block_and_long_run'and moves==2
  assert row['caseId']in['B_sustainability','B_lower_run_capacity','B_adverse_recovery']
  peak=max((s for w in r['calendar']['weeks']if w['type']=='load'for s in w['slots']if s['role']['sport']=='bike'and s['role']['kind']=='long'),key=lambda s:s['minutes'])
  w=next(w for w in r['calendar']['weeks']if w['week']==peak['week']);assert next(s for s in w['slots']if s['role']['sport']=='run'and s['role']['kind']=='long')['day']==4 and next(s for s in w['slots']if s['role']['sport']=='run'and s['role']['kind']=='endurance')['day']==3
 else:assert moves==0
 for t in v['trials']:
  assert signature(t['result'],False)==signature(b,False)
  add=issues(t['result'],True)-issues(b,True)
  if t['model']!='space_peak_bike_block_and_long_run':
   coach_proposals+=1;assert not t['acceptance']['accepted']and add and t['acceptance']['newHistoricalWitnesses'];assert not(issues(t['result'])-issues(b))
  else:assert t['acceptance']['accepted']and not add
 states=collections.Counter();weeks=[];long_days=[]
 for w,pw in zip(r['calendar']['weeks'],r['calendar']['calendar']['weeks'],strict=True):
  assert w['week']==pw['weekNumber'];active=[s for s in pw['sessions']if not s.get('isRest')]
  assert len({s['dayIndex']for s in pw['sessions']})==7 and len(active)==len(w['slots'])
  assert sum(s['minutes']for s in w['slots'])==sum(s['durationMin']for s in active)==w['reservedMinutes']<=w['budget']<=600
  q=r['calendar']['calendar']['weeklyQuotas'][str(w['week'])];assert w['budget']==min(600,q['volumeBudget']['maxMinutes'])
  freq=collections.Counter(s['role']['sport']for s in w['slots']);assert all(q['quota'][sport]['min']<=freq[sport]<=q['quota'][sport]['max']for sport in['swim','bike','run','strength'])
  byday=collections.defaultdict(list)
  for s in w['slots']:
   total_slots+=1;byday[s['day']].append(s);assert s['day']in[1,2,3,4,5,6]
   assert all(part['text']in s['card']['structure']for part in source[s['card']['id']]['structure'])
   cap=row['profileCaps']['long'if s['role']['kind']=='long'else'normal'][s['role']['sport']]
   assert s['input']['currentCapacity']==s['role']['currentCapacity']==cap
   before=next(x for bw in b['calendar']['weeks']for x in bw['slots']if x['key']==s['key'])
   assert s['card']==before['card']and s['minutes']==before['minutes'];assert set(before['input']['hardFailures'])<=set(s['input']['hardFailures'])
   stored=[x for x in active if x['catalogId']==s['card']['id']];assert len(stored)==1 and stored[0]['dayIndex']==s['day']and stored[0]['durationMin']==s['minutes']and stored[0]['details']==s['card']['structure']
   d=next(x for x in r['decisions']if x['slotKey']==s['key']);assert d['day']==s['day']and not d['individualPrescriptionApproved']
   assert s['minutes']>=s['role']['floor'];states[s['decision']['state']]+=1;assert not s['decision']['operationallyApproved']
   if s['minutes']>cap:capacity_conflicts+=1;assert s['decision']['state']!='currently_admissible'
   if s['role']['kind']=='long':
    absolute=(w['week']-1)*7+s['day'];assert all(abs(absolute-prior)>1 for prior in long_days);long_days.append(absolute)
  assert all(len(xs)<=2 and len({s['role']['sport']for s in xs})==len(xs)for xs in byday.values())and 7-len(byday)>=1
  weeks.append({'week':w['week'],'minutes':w['reservedMinutes'],'bySport':{sport:sum(s['minutes']for s in w['slots']if s['role']['sport']==sport)for sport in['swim','bike','run','strength']},'frequencies':dict(freq)})
 for c in v['floorCounterproposals']:
  floor_proposals+=1;assert not c['appliedToRetainedPlan']and not c['nativeFloorWaived']and not c['coachApproved']and not c['individualDoseApproved']
  assert c['sourceTimingProof']['valid']and c['sourceTimingProof']['minutes']==90 and not c['result']['rawValidation']['candidate']['sourceFailures']
  assert {e['code']for e in c['scope']['executedBlockErrors']}=={'four_week_native_floor','original_weekly_quota_or_budget','historical_error_not_explained_by_scope'}
  assert c['result']['rawValidation']['historical']['blocking']==r['rawValidation']['historical']['blocking']+1
 if row['caseId']=='A_aerobic':assert states['not_admissible']==7
 if row['caseId']=='C_uncertain':assert states['not_admissible']==26
 if row['caseId']=='B_adverse_recovery':
  due=next(s for s in r['calendar']['weeks'][1]['slots']if s['role']['sport']=='bike'and s['role']['kind']=='long');assert 'documented_adverse_recovery_hold'in due['input']['hardFailures']and due['decision']['state']=='not_admissible'
 reports.append({'caseId':row['caseId'],'retainedModel':v['retainedModel'],'changedDays':moves,'warningsBefore':b['rawValidation']['historical']['warnings'],'warningsAfter':r['rawValidation']['historical']['warnings'],'blockingBefore':b['rawValidation']['historical']['blocking'],'blockingAfter':r['rawValidation']['historical']['blocking'],'states':dict(states),'capacityConflicts':len(scope['currentCapacityConflicts']),'blockErrors':len(scope['executedBlockErrors']),'weeks':weeks})
assert(total_slots,retained_cases,moves_total,coach_proposals,floor_proposals,capacity_conflicts)==(240,3,6,9,6,9)
handoff=load(R/'evidence/pr424-retrieval.json')
for f in handoff['files']:
 b=f['content'].encode();assert sha(b)==f['contentSha256']and hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==f['sha']
remote=next(f['content']for f in handoff['files']if f['path']=='src/engines/diagnostic/computeDiagnostic.ts');local=pathlib.Path('src/engines/diagnostic/computeDiagnostic.ts').read_text()
def boundary_body(s):return s[s.index('function computeRunMLSSFromInput('):s.index('function computeSynthesis(')]
assert boundary_body(remote)==boundary_body(local)
phys=load(E/'build/physiology-handoff.json');assert phys['boundary']['production']['crossValidation']['severity']=='critical'and phys['boundary']['candidate']['prediction']is None and phys['boundary']['scoreUnchanged']==3
assert phys['boundary']['refsNative']['mlssSpeedKmh']==phys['boundary']['refsCandidate']['mlssSpeedKmh'] # removal of invalid cross-check does not fabricate a new pace
assert phys['external']['production']['prediction']['mlssPct']==93.7 and phys['external']['candidate']['prediction']['mlssPct']==83.2 and phys['external']['missingCE']is None
assert[x['decision']['status']for x in phys['transport']]==['candidate_reference_for_coach_review','hold_reference','hold_reference']
replay={}
for name in['registered-cases.json','results.json.gz','physiology-handoff.json']:
 a,b=raw(E/'build'/name),raw(E/'replay'/name);assert a==b;replay[name]=sha(a)
commands=load(E/'commands.json');assert len(commands)==6 and all(x['status']==0 and not x['error']for x in commands)
out={'version':'det-v24-independent-1','pass':True,'previousTrackedFilesUnchanged':len(baseline),'preservedIds':920,'preservedVariants':2425,'historicalConfigurationsPreservedNotRerun':600,'candidateChronologies':96,'candidateIds':51,'candidateViews':418,'nolioFixturesPreservedNoCall':15,'cohortCases':8,'checkedRetainedSlots':total_slots,'retainedPlacementCases':retained_cases,'retainedDayMoves':moves_total,'coachOnlyWarningTradeoffProposals':coach_proposals,'coachOnlyFloorCounterproposals':floor_proposals,'currentCapacityConflictsRetained':capacity_conflicts,'newHistoricalWarningOrErrorWitnesses':0,'newBlockErrors':0,'runBoundaryFunctionEqualAcrossBranches':True,'readOnlyPR424Head':handoff['ref'],'deterministicLogicalFiles':replay,'humanExpertReviews':0,'individualDoseApprovals':0,'fullIronmanValidation':False,'profiles':reports}
(R/'evidence/independent-validation.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n');print(json.dumps({k:v for k,v in out.items()if k!='profiles'},indent=2))
