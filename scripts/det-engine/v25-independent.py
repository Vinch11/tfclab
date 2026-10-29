"""Independent stdlib verification of unchanged V24 results and new V25 contracts. No planner imported."""
import collections, gzip, hashlib, json, pathlib, re, sys
R=pathlib.Path('docs/det-engine/v25');E=R/'evidence'/('validation-'+(sys.argv[1]if len(sys.argv)>1 else'3'))
def raw(p):
 p=pathlib.Path(p);b=p.read_bytes();return gzip.decompress(b)if p.suffix=='.gz'else b
def load(p):return json.loads(raw(p))
def lines(p):return[json.loads(x)for x in raw(p).splitlines()if x]
def sha(b):return hashlib.sha256(b).hexdigest()
def digest(x):return sha(json.dumps(x,ensure_ascii=False,separators=(',',':')).encode())
old_files=load(R/'baseline-files.json')
for p,h in old_files.items():assert pathlib.Path(p).is_file()and sha(pathlib.Path(p).read_bytes())==h,('historical_file_changed',p)
spec=load(R/'inputs.json')
for p,h in spec['cohortInputs'].items():assert sha(raw(p))==h
old=load('docs/det-engine/v24/evidence/validation-2/build/results.json.gz');registered=load(E/'build/registered-cases.json');assert registered==load('docs/det-engine/v24/evidence/validation-2/build/registered-cases.json')
rows=load(E/'build/results.json.gz');assert len(rows)==8
reports=[];alternatives=receivable=slots=capacity_conflicts=suspensions=0
for i,row in enumerate(rows):
 v=row['result'];b=v['baselineV24'];assert b==old[i]['result']and row['input']==old[i]['input']and row['caseId']==old[i]['caseId']
 assert v['reservationsChanged']==v['nativeRefusalsRemoved']==v['individualDoseApprovals']==v['expertHumanReviews']==0 and not v['operationalAuthorization']
 r=b['result'];states=collections.Counter(d['state']for d in r['decisions']);capacity_conflicts+=len(b['scope']['currentCapacityConflicts']);slots+=len(r['decisions'])
 assert len(r['calendar']['weeks'])==4 and len(r['calendar']['calendar']['weeks'])==4
 assert r['rawValidation']['historical']['blocking']==4 and b['scope']['executedBlockErrors']==[]
 assert v['physiology']['experimental']['prediction']is None and v['physiology']['nativeRunMLSS']==r['refs']['runReference']['runMLSS']
 count=0
 for a in v['alternatives']:
  alternatives+=1;c=a['current'];f=a['alternative'];x=a['complement'];assert not c['withinDeclaredEnvelope']and not c['individualDoseApproved']and f['coach_override_status']=='pending_explicit_decision'
  assert f['minutes']==f['current_capacity_envelope']and not f['individual_tolerance_verified']and not f['intensityAssignmentVerified']and not f['nativeFloorChanged']and not f['capacityIncreased']
  assert f['sourceIntensityInstructions']==next(s['card']['structure']for w in r['calendar']['weeks']for s in w['slots']if s['key']==f['slotKey'])
  if x['technicallyReceivableUnderControlledException']:
   receivable+=1;count+=1;assert(f['minutes'],f['source_recipe_minimum'],f['catalogue_duration_minimum'],f['goal_variant_minimum'],f['planning_floor'],f['current_capacity_envelope'])==(90,60,70,90,95,90)
   assert len(x['exceptionWitnesses'])==3 and not x['otherErrors'];assert x['rawValidation']['historical']['blocking']==5
   assert len(x['rawScope']['executedBlockErrors'])==3 and x['historicalErrorsRemoved']==0 and not x['planningFloorWaived']and not x['appliedToRetainedPlan']and not x['individualDoseApproved']
   original=next(p for p in b['floorCounterproposals']if p['sourceTimingProof']['sourceHash']==f['sourceHash']and any(s['key']==f['slotKey']and s['minutes']==90 for w in p['result']['calendar']['weeks']for s in w['slots']))
   assert x['rawValidation']==original['result']['rawValidation']and x['rawScope']==original['scope']
  proposal={k:f[k]for k in['version','slotKey','week','sourceId','sourceHash','minutes','planningFloor','capacity','objective','profileContextHash']};assert digest(proposal)==f['proposalHash']
 for s in v['recovery']:
  suspensions+=1;assert s['state']=='suspended_due_to_recovery'and s['nativeSuspension']['observedAt']is None and not s['history']and s['recoveryHoldStillOperative'];assert s['compensationMinutes']==0 and not s['calendarModified']
 if row['caseId']=='A_aerobic':assert states['not_admissible']==7
 if row['caseId']=='C_uncertain':assert states['not_admissible']==26
 if b['retainedModel']:
  s3=r['calendar']['weeks'][2];assert next(s for s in s3['slots']if s['role']['sport']=='run'and s['role']['kind']=='long')['day']==4 and next(s for s in s3['slots']if s['role']['sport']=='run'and s['role']['kind']=='endurance')['day']==3
 reports.append({'caseId':row['caseId'],'reservationsUnchanged':len(r['decisions']),'retainedV24Model':b['retainedModel'],'receivableFloorAlternatives':count,'capacityConflicts':len(b['scope']['currentCapacityConflicts']),'states':dict(states),'historicalBlockingUnchanged':4,'historicalWarningsUnchanged':r['rawValidation']['historical']['warnings'],'newBlockErrors':0,'nativeRecoverySuspensions':len(v['recovery'])})
assert(alternatives,receivable,slots,capacity_conflicts,suspensions)==(9,6,240,9,1)
fixtures=load(E/'build/registered-contract-fixtures.json');out=load(E/'build/contract-results.json');c=out['contracts'];assert[len(c[k])for k in['floors','physiology','recovery']]==[5,4,6]
f={x['id']:x['decision']for x in c['floors']};assert not f['95_over_90']['withinDeclaredEnvelope'];assert f['90_floor_candidate']['alternativeTechnicallyReceivable']and not f['90_floor_candidate']['individualDoseApproved'];assert f['75_below_goal_min']['recipeComplete']and not f['75_below_goal_min']['goalVariantCompatible'];assert not f['missing_component_reduction']['recipeComplete'];assert f['unknown_capacity']['current_capacity_envelope']is None and not f['unknown_capacity']['withinDeclaredEnvelope']
for x in fixtures['floors']:
 if x['sourceId']=='SEILER_RUN_Z1_EASY_LONG':
  card=x['slot']['card'];assert 'Main: 60-120 min'in card['structure']and 'Warm-up: Intégré'in card['structure']and 'Cool-down: Intégré'in card['structure']and card['variants']['ironman'].startswith('90-120 min Z1 strict')
  assert card['durationMin']==[70,150]
src=load(R/'evidence/pr424-readonly.json')
for x in src['files']:
 b=x['content'].encode();assert sha(b)==x['contentSha256']and hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==x['sha']
study=next(x for x in src['files']if x['path'].endswith('economy-contract.test.ts'));assert re.findall(r'runningEconomyCostMlKgKm:\s*(\d+)',study['content'])==['200']
phy=c['physiology'];assert phy[0]['decision']['status']=='typed_context_consumed_for_review'and phy[0]['decision']['experimental']['prediction']['mlssPct']==83.2 and out['native424']['prediction']['mlssPct']==93.7
for i,x in enumerate(phy):
 d=x['decision'];assert d['nativeRunMLSS']==out['native424']and d['nativeRefusalsRemoved']==0 and not d['nativeReferenceReplaced']and not d['scoreConvertedToCost']and not d['individualValueExperimentallyValidated'];assert 'runningEconomyCostMlKgKm'not in d['inputUnchanged'];assert digest(d['inputUnchanged'])==d['rawInputHash']
 if i:assert d['experimental']['prediction']is None and d['status']=='hold_typed_reference'
first=fixtures['physiology'][0];assert first['envelope']['value']==200 and first['envelope']['sourceArtifactHash']==study['contentSha256'];assert first['envelope']['rawInputHash']==digest(first['raw'])
expected=['awaiting_reassessment','suspended_due_to_recovery','not_admissible','not_admissible','not_admissible','candidate_for_coach_review']
assert[x['decision']['state']for x in c['recovery']]==expected
for rawcase,result in zip(fixtures['recovery'],c['recovery'],strict=True):
 d=result['decision'];assert rawcase['subject']==d['subject']and d['currentCapacityMinutes']==rawcase['subject']['currentCapacityMinutes'];assert d['compensationMinutes']==0 and not d['calendarModified']and not d['capacityIncreased']and not d['adaptationObserved']and not d['individualDoseApproved']and not d['operationalAuthorization']and d['recoveryHoldStillOperative']and not d['targetRecipeIndividualToleranceVerified'];assert d['history'][0]['to']=='suspended_due_to_recovery'and d['history'][1]['to']=='awaiting_reassessment'
good=c['recovery'][5]['decision'];assert digest({'subject':good['subject'],'observation':fixtures['recovery'][5]['events'][2]['observation'],'asOf':fixtures['recovery'][5]['events'][2]['at']})==good['reviewPacketHash']
mapping=lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl');assert len(mapping)==920 and len({r['legacyId']for r in mapping})==920 and sum(len(r['variants'])for r in mapping)==2425
assert len(load('docs/det-engine/evidence-final/matrix.json.gz'))==600
review=lines('docs/det-engine/v20/evidence/validation-2/build/review/scientific-review.jsonl.gz');assert len(review)==96 and len({r['legacyId']for r in review})==51
assert sum(len(r['candidates'])for r in lines('docs/det-engine/v20/evidence/validation-2/build/review/review.jsonl.gz'))==418 and len(lines('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz'))==15
replay={}
for p in['registered-cases.json','registered-contract-fixtures.json','results.json.gz','contract-results.json']:
 b=raw(E/'build'/p);assert b==raw(E/'replay'/p);replay[p]=sha(b)
commands=load(E/'commands.json');assert len(commands)==7 and all(x['status']==0 and not x['error']for x in commands)
result={'version':'det-v25-independent-1','pass':True,'priorTrackedFilesUnchanged':len(old_files),'cohortCases':8,'retainedReservationsUnchanged':240,'capacityConflictsRetained':9,'planningFloorAlternativesExamined':9,'technicallyReceivableFloorAlternatives':6,'nativeRecoverySuspensionsRetained':1,'newFloorFixtures':5,'newPhysiologyFixtures':4,'typedCostContextsConsumed':1,'newRecoveryFixtures':6,'recoveryCoachReviewCandidates':1,'nativeRefusalsRemoved':0,'historicalErrorsRemoved':0,'calendarMutations':0,'compensationMinutes':0,'individualDoseApprovals':0,'humanExpertReviews':0,'preservedIds':920,'preservedVariants':2425,'historicalCasesPreservedNotRerun':600,'preservedCandidateChronologies':96,'preservedCandidateIds':51,'preservedCandidateViews':418,'preservedNolioFixtures':15,'logicalReplayHashes':replay,'profiles':reports}
(R/'evidence/independent-validation.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n');print(json.dumps({k:v for k,v in result.items()if k!='profiles'},indent=2))
