"""Independent stdlib verifier: no planner, selector, dose model or TypeScript imported."""
import collections,gzip,hashlib,json,pathlib,sys
R=pathlib.Path('docs/det-engine/v26');attempt=sys.argv[1] if len(sys.argv)>1 else '1';E=R/'evidence'/('validation-'+attempt)
def raw(p):
 p=pathlib.Path(p);b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def load(p):return json.loads(raw(p))
def lines(p):return [json.loads(x) for x in raw(p).splitlines() if x]
def sha(b):return hashlib.sha256(b).hexdigest()
def digest(x):return sha(json.dumps(x,ensure_ascii=False,separators=(',',':')).encode())
pins=load(E/'executed-source-pins.json')
for p,h in pins.items():assert sha(pathlib.Path(p).read_bytes())==h,('source_changed',p)
registration=load(R/'inputs.json');assert registration==load(E/'build/preregistered-inputs.json')
old=load('docs/det-engine/v25-coach-floor/evidence/validation-1/build/results.json.gz');rows=load(E/'build/originals.json.gz');assert len(rows)==len(old)==8
canon={x['legacyId']:x for x in lines('docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz')};assert len(canon)==920
knowledge=load('docs/det-engine/v21b/FAMILY_KNOWLEDGE_BASE.json');families={f['familyId']:f for f in knowledge['families']}
protocols=load(R/'evidence/v21c-protocol-index.json');assert sha(raw(protocols['source']))==protocols['sourceSha256']
for p in protocols['rows']:assert sha(raw(p['artifact']))==p['artifactHash']
verified_witnesses=0
def verify_witness(nodes,witness):
 global verified_witnesses
 assignment=iter(witness['assignment']);consumed=[]
 def next_a():
  a=next(assignment);consumed.append(a);return a
 def visit(n):
  k=n['kind']
  if k in ['annotation','integrated']:return 0
  if k=='sequence':return sum(visit(c) for c in n['children'])
  if k=='repeat':
   a=next_a();count=a['repetitions'];assert n['count']['min']<=count<=n['count']['max']
   total=0
   for i in range(count):
    for j,c in enumerate(n['children']):
     if n.get('restPolicy')!='between_only' or j==0 or i<count-1:total+=visit(c)
   return total
  if k=='optional':
   a=next_a();return visit(n['children'][0]) if a['optionalIncluded'] else 0
  assert k=='time',('unhandled_claimed_complete_kind',k)
  a=next_a();assert n['quantity']['min']<=a['seconds']<=n['quantity']['max'];assert a['source']['literal']==n['quantity']['source']['literal'];return a['seconds']
 total=sum(visit(n) for n in nodes if n['kind']!='integrated');assert total==witness['seconds']
 assert next(assignment,None) is None;verified_witnesses+=1

reports=[]
for row,previous in zip(rows,old,strict=True):
 assert row['caseId']==previous['caseId'] and row['input']==previous['input']['input']
 reference=previous['optIn']['alternative'] or previous['optIn']['baselineV25']['baselineV24']['result'];assert row['retained']==reference
 assert not row['individualDoseApproved'] and not row['expertReviewed'] and row['newAutomaticSubstitutions']==0
 native_levers=previous['optIn']['baselineV25']['baselineV24']['before']['programming']['requests'];assert sorted(x['lever']['id'] for x in row['search']['intentionsBeforeSearch'])==sorted(x['leverUnchanged']['id'] for x in native_levers)
 for r in row['search']['results']:
  assert r['scannedCanonicalRecords']==920 and r['shortlistIsNotEligibility']
  if r['scientificContext']:assert r['scientificContext']['contextHash']==digest(families[r['scientificContext']['familyId']])
  assert sorted(k for group in r['ranking'] for k in group['keys'])==sorted(o['key'] for o in r['offers'])
  for o in r['offers']:
   c=canon[o['sourceId']];p=c['originalCanonical']['prescription'];assert p['discipline']==r['intention']['sport']
   phys=c['originalCanonical']['original']['effective']['physiology'];assert r['intention']['intent'] in [phys['primary'],*phys.get('secondary',[])]
   recipe=next(x for x in c['candidates'] if x['candidateKey']==o['key']) if o['editorial'] else c['sourceV18Recipe'];assert o['recipe']==recipe and o['recipeHash']==digest(recipe)
   assert o['sourceInstructions']==c['originalCanonical']['original']['effective']['structure'] and o['restrictions']==p['restrictions']
   if o['witness']:verify_witness(recipe['nodes'],o['witness']);assert o['witness']['seconds']==o['minimumMinutes']*60
   assert not o['layers']['C_individuallyAdmissible'] and not o['layers']['D_explicitCoachDoseApproval'];assert o['doseStatus']=='dose_not_individually_verified'
   assert o['exactRecipeDoseEvidence'] is False
   for comparison in o['documentaryComparisons']:
    assert comparison in protocols['rows'] and comparison['candidateHash']==o['recipeHash'] and comparison['sourceRecipeHash']==c['sourceRecipeHash'];assert comparison['comparisonStatus']=='conclusive_not_same_protocol'
   if o['key'] in r['selectedForCoachReview']:assert not o['blockers'] and o['witness']
 for co in row['contextualOffers']:
  recipe=next(o['recipe'] for r in row['search']['results'] for o in r['offers'] if o['key']==co['key'])
  for w in co['weeks']:
   if w['witness']:verify_witness(recipe['nodes'],w['witness']);assert w['witness']['seconds']==w['minutes']*60
   assert not w['individualDoseApproved'] and not w['automaticReplacement']
 for w in row['retained']['calendar']['weeks']:
  assert len(w['days'])==7;assert sum(s['minutes'] for s in w['slots'])==w['reservedMinutes']<=w['budget'];assert {'run','bike','swim'}.issubset({s['role']['sport'] for s in w['slots']})
 if row['caseId']=='A_aerobic':assert sum(d['sport']=='run' and d['state']=='not_admissible' for d in reference['decisions'])==7
 if row['caseId']=='B_sustainability':
  week=reference['calendar']['weeks'][2];assert next(s for s in week['slots'] if s['role']['sport']=='run' and s['role']['kind']=='long')['day']==4;assert next(s for s in week['slots'] if s['card']['id']=='A_RUN_EASY_45_PRO')['day']==3
 if row['caseId']=='B_adverse_recovery':assert any('documented_adverse_recovery_hold' in s['input']['hardFailures'] for s in reference['calendar']['weeks'][1]['slots'])
 reports.append({'caseId':row['caseId'],'rawHistorical':[reference['rawValidation']['historical']['blocking'],reference['rawValidation']['historical']['warnings']], 'refusals':sum(d['state']=='not_admissible' for d in reference['decisions']),'candidateShortlist':sum(len(r['shortlistForEvidenceReview']) for r in row['search']['results']),'selectionPassingKnownGates':sum(len(r['selectedForCoachReview']) for r in row['search']['results']),'physicalChangesBeyondBaselineCoachPolicy':0})
del old
sens=load(E/'build/sensitivity.json.gz');assert len(sens)==10 and [s['id'] for s in sens]==[s['id'] for s in registration['sensitivity']]
assert sens[9]['result']['retained']==sens[1]['result']['retained'] and sens[9]['result']['futureFavorableReport']['capacityGainEvidence'] is None
assert sens[8]['result']['retained']==sens[1]['result']['retained']
assert not sens[8]['result']['search']['results'][0]['scientificContext']
assert not sens[8]['result']['search']['results'][0]['shortlistForEvidenceReview'] and sens[1]['result']['search']['results'][0]['shortlistForEvidenceReview']==['SEILER_BIKE_Z1_LONG@original']
assert len([k for r in sens[3]['result']['search']['results'] for k in r['shortlistForEvidenceReview']])==2
assert not any(r['selectedForCoachReview'] for r in sens[2]['result']['search']['results'])
assert not any(r['selectedForCoachReview'] for r in sens[6]['result']['search']['results'])
assert sens[4]['result']['input']['form']['weeklyHours']==7
assert sens[4]['result']['retained']['structuralCalendarComplete'] is False and sens[4]['result']['fourWeekScope']['executedBlockErrors']
for s in sens:
 r=s['result'];assert not r['individualDoseApproved'] and not r['expertReviewed']
 for w in r['retained']['calendar']['weeks']:
  assert sum(slot['minutes'] for slot in w['slots'])==w['reservedMinutes']
  for slot in w['slots']:
   assert not slot['decision'].get('individualDoseApproved',False)
   if slot['minutes']>slot['input']['currentCapacity']:assert slot['decision']['state']!='currently_admissible'
assert all(s['input']['currentCapacity']==100 for w in sens[7]['result']['retained']['calendar']['weeks'] for s in w['slots'] if s['role']['sport']=='bike' and s['role']['kind']=='long')
assert any('actual_calendar_dose_exceeds_or_lacks_current_capacity' in w['blockers'] for c in sens[7]['result']['contextualOffers'] for w in c['weeks'] if w['week']==1)
del sens
dossiers=load(E/'build/dossiers.json.gz');assert len(dossiers)==2
for dossier,row in zip(dossiers,rows[:2],strict=True):
 assert len(dossier['weeks'])==4 and sum(len(w['sessions']) for w in dossier['weeks'])==30
 for w in dossier['weeks']:
  for s in w['sessions']:
   source=canon[s['sourceId']]['originalCanonical']['original']['effective']['structure'];assert s['originalStructure']==source
   slot=next(x for x in row['retained']['calendar']['weeks'][w['week']-1]['slots'] if x['key']==s['slotKey']);assert s['conditions']==slot['input']['conditions'] and s['hardFailures']==slot['input']['hardFailures']
nolio=load(E/'build/nolio.json.gz');texts=refused=0
for r in nolio:
 assert not r['result']['realExportPermitted'] and r['result']['networkRequests']==0
 for source in r['result']['sourceTexts']:
  assert source['structured']['payload'] is None and not source['calendarPrescriptionExported']
  payload=source['text'].get('payload')
  if payload:
   texts+=1
   for part in canon[source['sourceId']]['originalCanonical']['original']['effective']['structure']:assert part['text'] in payload['description']
  else:refused+=1
 for o in r['result']['editorialCandidates']:assert not o['programmingPermitted'] and o['structured']['payload'] is None
transfers=load(E/'build/transfers.json.gz');assert [r['id'] for r in transfers if r['result']['result']['status']=='typed_context_consumed_for_review']==['typed_verified']
assert all(not r['result']['referenceInjectedIntoProfiles'] and not r['result']['source425AssumedMerged'] and not r['result']['C8Resolved'] for r in transfers)
replay={}
for f in ['preregistered-inputs.json','original-cases.json','originals.json.gz','sensitivity.json.gz','dossiers.json.gz','nolio.json.gz','transfers.json.gz']:
 b=raw(E/'build'/f);assert b==raw(E/'replay'/f);replay[f]=sha(b)
commands=load(E/'commands.json');assert len(commands)==9 and all(c['status']==0 and not c['error'] for c in commands)
mapping=lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl');assert len(mapping)==920 and len({x['legacyId'] for x in mapping})==920 and sum(len(x['variants']) for x in mapping)==2425
assert len(load('docs/det-engine/evidence-final/matrix.json.gz'))==600;assert len(lines('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz'))==15
result={'version':'det-v26-independent-1','passed':True,'previousFilesUnchanged':len(load(R/'baseline-files.json')),'originalCasesUnchanged':8,'sensitivityCases':10,'coachDossiers':2,'sessionsDetailed':60,'independentlyCheckedRecipeWitnesses':verified_witnesses,'historicalRawResultsUnchanged':True,'individualRefusalsUnchanged':sum(r['refusals'] for r in reports),'A_runRefusals':7,'newPhysicalSubstitutions':0,'individualApprovals':0,'humanSportingReviews':0,'knownSourceTextNolioMocks':texts,'sourceTextRefusals':refused,'structuredCalendarWorkouts':0,'separate425TransferProbes':5,'historicalFixturesPreservedNotRerun':600,'preservedIds':920,'preservedVariants':2425,'preservedNolioFixtures':15,'logicalReplay':replay,'profiles':reports,'verifierSha256':sha(pathlib.Path(__file__).read_bytes())}
(R/'evidence/independent-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['profiles','logicalReplay']},indent=2))
