"""Independent Python witness/source/serialization audit. No JS compiler, selector or optimizer imported."""
import json,gzip,pathlib,sys,importlib.util,math,collections,copy
spec=importlib.util.spec_from_file_location('previous_independent','scripts/det-engine/v19-independent-audit.py');ind=importlib.util.module_from_spec(spec);spec.loader.exec_module(ind)
def load(p):return[json.loads(l)for l in gzip.open(p,'rt')]
def check_review(folder):
 old=load('docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz');sources={r['legacyId']:r for r in old};rows=load(pathlib.Path(folder)/'review.jsonl.gz');science=load(pathlib.Path(folder)/'scientific-review.jsonl.gz');assert len(rows)==210 and len(science)==96;assert len(set(s['legacyId']for s in science))==51;count=complete=headlines=0
 for r in rows:
  original=sources[r['legacyId']];assert r['sourceScientificQualificationUnchanged']==original['scientificQualificationV17'];assert len(r['candidates'])==len(original['candidates'])
  for a,c in zip(r['candidates'],original['candidates']):
   count+=1;assert a['candidateKey']==c['candidateKey'];assert a['changes']==c['changes'];assert a['scientificValidation']is False and a['automaticPrescription']is False and a['unmodifiedHistoricalTotalDoseProven']is False
   if c['classification']=='complete_timeline_candidate':
    complete+=1;seconds,bounds,expanded=ind.evaluate(c['nodes'],c['witness']);assert seconds==a['witness']['seconds']==a['ledger']['seconds'];assert sum(x['seconds']for x in a['ledger']['rows'])==seconds;assert [(x['seconds'],x['source'])for x in a['ledger']['rows']]==[(x['seconds'],x['source'])for x in expanded]
   else:assert a['witness']is None and a['ledger']is None
   if c['variant']=='correct_declared_total':headlines+=1;assert c['nodes']==original['sourceV18Recipe']['nodes'];assert a['arithmeticHeadlineCorrectionWithoutComponentDoseChange']is True
 for s in science:
  r=sources[s['legacyId']];c=next(c for c in r['candidates']if c['candidateKey']==s['candidateKey']);assert s['sourceScientificQualification']==r['scientificQualificationV17'];assert s['exactCandidateDose']['seconds']==c['witness']['seconds'];assert s['exactCandidateDose']['assignment']==c['witness']['assignment'];assert s['individualPrescriptionApproved']is False and s['humanExpertReview']is False;assert s['literature']['exactSourceMentions']==r['scientificQualificationV17']['references']['individualSourceMentions'];assert s['literature']['moduleReferencesNotAssignedToWorkout']is True
 assert(count,complete,headlines)==(418,96,2);return{'candidateInstances':count,'completeWitnessesIndependentlyChecked':complete,'completeDistinctIds':51,'headlineOnlyChanges':headlines,'scientificPromotions':0}
def flat(nodes):
 return[step for n in nodes for step in (flat(n['steps'])*n['value']if n['type']=='repetition'else[n])]
def check_payload(before,after):
 assert before['duration']==after['duration'];assert{**before,'structured_workout':None}=={**after,'structured_workout':None};B,A=flat(before['structured_workout']),flat(after['structured_workout']);assert len(B)==len(A)
 for b,a in zip(B,A):
  for k in ['type','step_duration_type','step_duration_value','intensity_type','target_type','target_value_min','target_value_max']:assert b.get(k)==a.get(k),(k,b,a)
  assert a.get('comment')==b.get('notes',b.get('comment'))
 assert sum(n['step_duration_value']for n in A)==after['duration']
def check_nolio(folder):
 rows=load(pathlib.Path(folder)/'fixtures.jsonl.gz');assert len(rows)==15;old=load('docs/det-engine/v19/cycle-2/evidence/nolio-path-2/sender-path-audit.jsonl.gz');originals={(r['legacyId'],f['candidateKey']):f for r in old for f in r['structuredFixtures']};lost=[]
 for r in rows:
  source=originals[(r['legacyId'],r['candidateKey'])];assert r['sourcePayload']==source['sourcePayload'];assert r['historicalNormalizedFixture']==source['normalizedFixture'];assert r['result']['payload'];check_payload(r['sourcePayload'],r['result']['payload']);assert r['result']['realExportPermitted']is False and r['result']['productionSenderChanged']is False
  if r['historicalTargetLoss']:lost.append(r['legacyId']);assert r['result']['payload']['structured_workout'][0]['target_type']=='pace';assert r['result']['payload']['structured_workout'][0]['target_value_min']==0
 assert set(lost)=={'D_RUN_REGEN','D_IM_BRICK_REGEN','D_MAR_REGEN','D_TR_RECUP_ACTIVE'};return{'fixturesIndependentlyChecked':15,'targetLossesRepaired':4,'sourceTargetsTimesInstructionsPreserved':True,'realNolioCalls':0}
def check_physiology(folder):
 root=pathlib.Path(folder);registered=json.loads((root/'registered-inputs.json').read_text());rows=json.loads((root/'results.json').read_text())['rows'];assert len(rows)==len(registered['cases'])==4;doctrine=pathlib.Path('src/lib/zones/tfclDoctrine.ts').read_text();start=doctrine.index('id: "recovery"');fragment=doctrine[start:start+2000];ranges={}
 for sport in ['run','bike']:
  h=__import__('re').search(sport+r':\s*\{\s*min:\s*([\d.]+),\s*max:\s*([\d.]+)',fragment);assert h,(sport,fragment);ranges[sport]=tuple(map(float,h.groups()))
 fixtures=0
 for row,input in zip(rows,registered['cases']):
  assert row['id']==input['id'];assert row['effective']['value']==input['test']['vlamax'];assert row['refs']['ftpWatts']==input['diagnosticInput']['ftp'];assert all(p['individualPrescriptionApproved']is False for p in row['prescriptions'])
  for p,n in zip(row['prescriptions'],row['prospectiveNolioFixtures']):
   sport='bike'if p['legacyId']=='D_BIKE_RECOVERY'else'run';anchor=row['refs']['ftpWatts'if sport=='bike'else'mlssSpeedKmh'];assert p['durationSeconds']==(1800 if sport=='bike'else 1200)
   if anchor is None:assert p['target']is None and n['payload']is None;continue
   factor=1 if sport=='bike'else 1/3.6;assert math.isclose(p['target']['min'],anchor*ranges[sport][0]*factor);assert math.isclose(p['target']['max'],anchor*ranges[sport][1]*factor);assert n['result']['payload'];check_payload(n['sourcePrescription'],n['result']['payload']);fixtures+=1
 assert fixtures==6;return{'preregisteredProfiles':4,'prospectiveSyntheticFixtures':fixtures,'missingReferenceControlsRefused':2,'newOptimalDoseFormula':False,'individualApproval':False}
def check_ironman(folder):
 result=json.loads((pathlib.Path(folder)/'results.json').read_text());old=json.load(gzip.open('docs/det-engine/v14/evidence/final/calendars.json.gz','rt'));profiles={c['profile']:c for c in old if c['model']=='native_floor_conditional'};assert len(result['fullPlans'])==2;alternatives=0
 for p in result['fullPlans']:
  c=profiles[p['profile']];assert len(c['weeks'])==16;assert len(p['alternatives'])==2
  for a in p['alternatives']:
   alternatives+=1;assert len(a['plan']['weeks'])==16;assert len(a['bindings'])==9;assert a['actualApprovedPlan']is None and a['conditionsActuallySatisfied']==0;assert a['noNewCritical']and a['noNewWarnings'];assert a['global']['issues']==p['baseline']['candidate']['global']['issues'];assert a['global']['base']['issues']==p['baseline']['candidate']['global']['base']['issues'];assert a['technical']['issues']==p['baseline']['technicalProjection']['issues']
   binds={(b['week'],b['day'],b['originalSource']):b for b in a['bindings']}
   for ow,nw in zip(c['calendar']['weeks'],a['plan']['weeks']):
    assert len(ow['sessions'])==len(nw['sessions'])
    for os,ns in zip(ow['sessions'],nw['sessions']):
     key=(ow['weekNumber'],os['dayIndex'],os.get('catalogId'));b=binds.get(key)
     if not b:assert os==ns;continue
     assert ns['catalogId']=='C_IM_AERO_HOLD';assert ns['durationMin']==b['proposedMinutes']==(75 if a['policy']=='between_repetitions'else 80);assert b['deltaMinutes']==ns['durationMin']-os['durationMin'];slot=next(s for w in c['weeks']if w['week']==ow['weekNumber']for s in w['slots']if s['day']==b['day']and s['card']['id']==b['originalSource']);assert b['retainedOriginalConditions']==slot['decision']['conditions'];assert b['posturalBoutToleranceNotProven']is True and b['individualApproval']is False
 return{'wholeCalendars':2,'weeksPerCalendar':16,'boundedAlternatives':alternatives,'bindingsPerAlternative':9,'newCriticalOrWarningDetected':False,'originalConditionsRetained':True,'completeApprovedPlans':0}
if __name__=='__main__':
 base=pathlib.Path(sys.argv[1]);result={'review':check_review(base/'review'),'nolio':check_nolio(base/'nolio'),'physiology':check_physiology(base/'physiology'),'ironman':check_ironman(base/'ironman'),'scientificValidation':False};pathlib.Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
