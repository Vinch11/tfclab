"""Independent stdlib verification of opt-in policy, exact delta, strict Z1 and preserved refusals."""
import collections,gzip,hashlib,json,pathlib,sys
R=pathlib.Path('docs/det-engine/v25-coach-floor');attempt=sys.argv[1]if len(sys.argv)>1 else'1';E=R/'evidence'/('validation-'+attempt)
def raw(p):
 p=pathlib.Path(p);b=p.read_bytes();return gzip.decompress(b)if p.suffix=='.gz'else b
def load(p):return json.loads(raw(p))
def lines(p):return[json.loads(x)for x in raw(p).splitlines()if x]
def sha(b):return hashlib.sha256(b).hexdigest()
def digest(x):return sha(json.dumps(x,ensure_ascii=False,separators=(',',':')).encode())
def issue_counts(issues):return collections.Counter(json.dumps(i,sort_keys=True,ensure_ascii=False)for i in issues if i['severity']in['critical','error','blocking','warning'])
prior=load(R/'baseline-files.json')
for p,h in prior.items():assert pathlib.Path(p).is_file()and sha(pathlib.Path(p).read_bytes())==h,('previous_file_changed',p)
for p,h in load(E/'executed-source-pins.json').items():assert sha(pathlib.Path(p).read_bytes())==h,('executed_source_changed',p)
policy=load(R/'COACH_POLICY.json');assert policy==load(E/'build/policy.json')and policy['provenance']['signature']is None and not policy['provenance']['coachIdentityVerified']and not policy['individualDoseApproved']and not policy['sportingSafetyApproved']
a=policy['scope'];assert(a['objective'],a['sourceId'],a['requiredZone'],a['planningFloor'],a['declaredCapacity'],a['candidateMinutes'],a['week'])==('IM','SEILER_RUN_Z1_EASY_LONG','Z1',95,90,90,3)
registration=load(R/'inputs.json');assert sha(raw(R/'COACH_POLICY.json'))==registration['policyFileSha256']
old=load('docs/det-engine/v25/evidence/validation-3/build/results.json.gz');rows=load(E/'build/results.json.gz');registered=load(E/'build/registered-cases.json');assert len(rows)==8 and registered==load('docs/det-engine/v25/evidence/validation-3/build/registered-cases.json')
assert a['allowedCaseIds']==[r['caseId']for r in rows]
reports=[];applied=changed=conditions_added=capacity_before=capacity_after=0;native_refusals=0
for i,row in enumerate(rows):
 x=row['optIn'];v25=x['baselineV25'];assert v25==old[i]['result']and row['input']==old[i]['input'];assert row['caseId']==old[i]['caseId']
 before=v25['baselineV24']['result'];b_scope=v25['baselineV24']['scope'];capacity_before+=len(b_scope['currentCapacityConflicts']);assert row['optOut']['status']=='opted_out'and row['optOut']['referenceHash']==digest(v25)
 original_slots={s['key']:s for w in before['calendar']['weeks']for s in w['slots']};original_decisions={d['slotKey']:d for d in before['decisions']};states=collections.Counter(d['state']for d in before['decisions']);native_refusals+=states['not_admissible']
 if not x['alternative']:
  assert row['caseId']in['C_uncertain','B_lower_run_capacity']and x['status']=='no_authorized_alternative';capacity_after+=len(b_scope['currentCapacityConflicts'])
  reports.append({'caseId':row['caseId'],'alternative':False,'policyApplied':False,'states':dict(states),'capacityBefore':len(b_scope['currentCapacityConflicts']),'capacityAfter':len(b_scope['currentCapacityConflicts']),'rawHistoricalBefore':[before['rawValidation']['historical']['blocking'],before['rawValidation']['historical']['warnings']],'rawHistoricalAfter':None,'reasons':[r['reasons']for r in x['requests']]});continue
 applied+=1;assert x['status']=='authorized_experimental_alternative_not_individually_approved';r=x['alternative'];c=x['complementary'];q=x['requests'][0];key=q['slotKey'];assert q['authorizedForExperimentalProgramming']and q['enabled']is True and q['coachPolicyStatus']=='authorized_experimental_floor_only'and q['referenceHash']==digest(before)and q['policyDigest']==digest(policy)
 assert c['policyApplied']and not c['errors']and not c['uncoveredNewHistoricalIssues']and not c['otherBlockErrors']and len(c['authorizedFloorWitnesses'])==3
 assert c['historicalPlanningFloor']==95 and c['effectiveExperimentalPlanningFloor']==90 and c['historicalIssuesRemoved']==0 and not c['individualDoseApproved']and not c['individualToleranceVerified']and not c['operationalAuthorization']
 assert not x['individualDoseApproved']and not r['currentlyExecutablePlan']and not r['scientificIndividualValidation']
 assert q['assessment']['source_recipe_minimum']==60 and q['assessment']['catalogue_duration_minimum']==70 and q['assessment']['goal_variant_minimum']==90 and not q['assessment']['individual_tolerance_verified']
 current_slots={s['key']:s for w in r['calendar']['weeks']for s in w['slots']};assert current_slots.keys()==original_slots.keys()and len(current_slots)==30
 for sk,s in current_slots.items():
  b=original_slots[sk];assert s['card']==b['card']and s['day']==b['day']and s['role']==b['role']
  d=next(d for d in r['decisions']if d['slotKey']==sk);old_d=original_decisions[sk]
  if sk!=key:assert s==b and d==old_d;continue
  changed+=1;assert(s['minutes'],b['minutes'],s['role']['floor'],s['input']['currentCapacity'])==(90,95,95,90);assert digest(s['card'])==a['sourceHash'];assert s['card']['variants']['ironman']==a['goalVariant']
  assert 'Warm-up: Intégré'in s['card']['structure']and 'Cool-down: Intégré'in s['card']['structure']and 'Main: 60-120 min'in s['card']['structure']
  expected=[t for t in old_d['targets']if t['zone']=='Z1'];assert d['targets']==expected and d['strictVariantExecution']['numericTargets']==expected and s['strictVariantExecution']==d['strictVariantExecution']
  assert d['strictVariantExecution']['requiredZone']=='Z1'and not d['strictVariantExecution']['individualIntensityApproved'];assert not d['individualPrescriptionApproved']and d['state']!='currently_admissible'
  assert d['goalVariantInstructions']==a['goalVariant']and d['state']==s['decision']['state']and d['minutes']==90
  assert all(h in s['input']['hardFailures']for h in b['input']['hardFailures'])and all(condition in s['input']['conditions']for condition in b['input']['conditions'])
  assert any(condition['id']=='strict_variant_Z1_individual_execution_unverified'for condition in s['input']['conditions']);conditions_added+=1
  stored=next(ss for w in r['calendar']['calendar']['weeks']for ss in w['sessions']if ss.get('catalogId')==s['card']['id']and ss['weekNumber']==s['week'])
  assert stored['zones']==['Z1']and stored['strictVariantExecution']==d['strictVariantExecution']and stored['details']==b['card']['structure']and stored['durationMin']==90
 for w,pw,bw in zip(r['calendar']['weeks'],r['calendar']['calendar']['weeks'],before['calendar']['weeks'],strict=True):
  assert w['reservedMinutes']==bw['reservedMinutes']-(5 if w['week']==3 else 0);assert w['budget']==bw['budget']
  assert sum(s['minutes']for s in w['slots'])==sum(s['durationMin']for s in pw['sessions']if not s.get('isRest'))==w['reservedMinutes']<=w['budget']
  assert collections.Counter(s['role']['sport']for s in w['slots'])==collections.Counter(s['role']['sport']for s in bw['slots'])and w['days']==bw['days']
 assert r['rawValidation']['historical']['blocking']==5 and before['rawValidation']['historical']['blocking']==4
 assert r['rawValidation']['historical']['warnings']==before['rawValidation']['historical']['warnings']
 assert c['rawHistoricalIssues']==r['rawValidation']['historical']['issues']and not r['rawValidation']['candidate']['sourceFailures']
 extra=issue_counts(r['rawValidation']['historical']['issues'])-issue_counts(before['rawValidation']['historical']['issues']);assert sum(extra.values())==1
 extra_issue=json.loads(next(iter(extra)));assert extra_issue['code']=='quota_floor_violation'and extra_issue['week']==3 and extra_issue['severity']=='critical'and extra_issue['control']=='weekly_quotas'
 after_states=collections.Counter(d['state']for d in r['decisions']);assert after_states==states
 capacity_after+=len(c['rawScope']['currentCapacityConflicts']);assert len(c['rawScope']['currentCapacityConflicts'])==0
 if row['caseId']=='A_aerobic':assert sum(d['state']=='not_admissible'and d['sport']=='run'for d in r['decisions'])==7 and all(not d['targets']for d in r['decisions']if d['sport']=='run')
 if row['caseId']=='B_adverse_recovery':
  bike=next(s for s in r['calendar']['weeks'][1]['slots']if s['role']['sport']=='bike'and s['role']['kind']=='long');assert 'documented_adverse_recovery_hold'in bike['input']['hardFailures']and bike['decision']['state']=='not_admissible';assert v25['recovery'][0]['state']=='suspended_due_to_recovery'
 if row['caseId']=='B_sustainability':
  w=r['calendar']['weeks'][2];assert next(s for s in w['slots']if s['role']['sport']=='run'and s['role']['kind']=='long')['day']==4 and next(s for s in w['slots']if s['card']['id']=='A_RUN_EASY_45_PRO')['day']==3
 reports.append({'caseId':row['caseId'],'alternative':True,'policyApplied':True,'minutesBefore':95,'minutesAfter':90,'week3TotalBefore':before['calendar']['weeks'][2]['reservedMinutes'],'week3TotalAfter':r['calendar']['weeks'][2]['reservedMinutes'],'states':dict(states),'capacityBefore':len(b_scope['currentCapacityConflicts']),'capacityAfter':len(c['rawScope']['currentCapacityConflicts']),'rawHistoricalBefore':[4,before['rawValidation']['historical']['warnings']],'rawHistoricalAfter':[5,r['rawValidation']['historical']['warnings']],'authorizedFloorWitnesses':3,'individualDoseApproved':False})
assert(applied,changed,conditions_added,capacity_before,capacity_after,native_refusals)==(6,6,6,9,3,42)
old_contracts=load('docs/det-engine/v25/evidence/validation-3/build/contract-results.json')['contracts'];assert load(E/'build/v25-contract-replay.json')==old_contracts
assert [len(old_contracts[k])for k in['floors','physiology','recovery']]==[5,4,6]and all(not x['decision']['individualDoseApproved']for x in old_contracts['recovery'])
mapping=lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl');assert len(mapping)==920 and len({r['legacyId']for r in mapping})==920 and sum(len(r['variants'])for r in mapping)==2425
assert len(load('docs/det-engine/evidence-final/matrix.json.gz'))==600
assert len(lines('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz'))==15
replay={}
for f in['registered-cases.json','policy.json','results.json.gz','v25-contract-replay.json']:
 b=raw(E/'build'/f);assert b==raw(E/'replay'/f);replay[f]=sha(b)
commands=load(E/'commands.json');assert len(commands)==8 and all(c['status']==0 and not c['error']for c in commands)
result={'version':'coach-floor-independent-1','pass':True,'priorTrackedFilesUnchanged':len(prior),'executedSourcePinsUnchanged':True,'eightV25ReferencesExactlyPreserved':True,'optInRequired':True,'policyAuthorizationsRecorded':1,'policyAppliedAlternatives':applied,'changedDurationSlots':changed,'strictZ1Projections':6,'currentEnvelopeExcessesBefore':capacity_before,'currentEnvelopeExcessesInExperimentalProjectionAfter':capacity_after,'envelopeExcessesRemovedByDoseReductionNotAdaptation':6,'nativeRefusalsBeforeAndAfter':native_refusals,'authorizedRawFloorWitnessesRetained':18,'uncoveredNewHistoricalIssues':0,'v25ContractFixturesReplayedUnchanged':15,'individualDoseApprovals':0,'individualExpertReviews':0,'compensationMinutes':0,'preservedIds':920,'preservedVariants':2425,'historicalCasesPreservedNotRerun':600,'preservedNolioFixtures':15,'logicalReplayHashes':replay,'profiles':reports,'verifierSourceSha256':sha(pathlib.Path(__file__).read_bytes())}
(R/'evidence/independent-validation.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n');print(json.dumps({k:v for k,v in result.items()if k!='profiles'},indent=2))
