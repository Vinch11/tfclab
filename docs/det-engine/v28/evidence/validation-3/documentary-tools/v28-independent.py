"""Independent source, duration, domain, scope and no-approval verification. No TS engine imported."""
import collections,copy,gzip,hashlib,json,pathlib,re,sys
R=pathlib.Path('docs/det-engine/v28');E=R/'evidence'/('validation-'+(sys.argv[1] if len(sys.argv)>1 else '1'))
def raw(p):
 p=pathlib.Path(p);b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def load(p):return json.loads(raw(p))
def sha(b):return hashlib.sha256(b).hexdigest()
def digest(o):return sha(json.dumps(o,ensure_ascii=False,separators=(',',':')).encode())
for f,h in load(E/'executed-source-pins.json').items():assert sha(pathlib.Path(f).read_bytes())==h,('runtime_changed',f)
for f,h in load(R/'baseline-files.json').items():assert sha(pathlib.Path(f).read_bytes())==h,('previous_file_changed',f)
inputs=load(R/'inputs.json');assert load(E/'build/inputs.json.gz')==inputs
strength_registration=load(R/'strength-rest-policy-registration.json');assert load(E/'build/strengthRegistration.json.gz')==strength_registration
strength_boundary=load(R/'strength-boundary-registration.json');assert load(E/'build/strengthBoundary.json.gz')==strength_boundary
canonical={r['legacyId']:r for r in map(json.loads,raw('docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz').splitlines())}
originals=load(E/'build/originals.json.gz');v27=load('docs/det-engine/v27/evidence/validation-3/build/results.json.gz')
for a,b in zip(originals,v27,strict=True):
 assert a['caseId']==b['caseId'] and a['input']==b['input'] and a['result']==b['calendar'] and a['executions']==b['executions']
 assert len(a['executions'])==30
assert sum(e['technicallyExecutable'] for e in originals[1]['executions'])==3
assert sum(d['sport']=='run' and d['state']=='not_admissible' for d in originals[0]['result']['decisions'])==7
assert sum(d['state']=='not_admissible' for d in originals[2]['result']['decisions'])==26
base=originals[1]['result'];source_slots={s['card']['id']:s for s in base['calendar']['weeks'][0]['slots']}
scenarios=load(E/'build/scenarios.json.gz');assert len(scenarios)==11
doctrine=pathlib.Path('src/lib/zones/tfclDoctrine.ts').read_text()
def bike_domain(id):
 m=re.search('id: "'+id+r'".*?bike: \{ min: ([\d.]+), max: ([\d.]+) \}',doctrine,re.S);assert m;return tuple(map(float,m.groups()))
def verify_scenario(s):
 r=s['result'];sid=s['sourceId'];src=canonical[sid];b=s['wholeBlockReview'];fixture=s['fixture'];p=s['parameters'];context=s['context'];timeline=r['timeline']
 assert s['sourceSnapshot']['canonical']==src['originalCanonical'] and s['sourceSnapshot']['recipe']==src['sourceV18Recipe']
 assert digest(src['originalCanonical'])==r['sourceHash']==src['sourceCanonicalHash'] and digest(src['sourceV18Recipe'])==r['sourceRecipeHash']==src['sourceRecipeHash']
 assert r['originalSourceIntact'] and r['originalSourceText']==src['originalCanonical']['original']['raw']['structure']
 assert context['syntheticOnly'] and r['parameterValuesAreNotAthleteBData']
 assert r['individually_admissible'] is False and r['approved_by_coach'] is False and not r['individualToleranceVerified'] and not r['safeForUnconditionalInsertion'] and not r['automaticallyApplied']
 assert not b['automaticallyApplied'] and not b['individualApproval'] and not b['coachPolicyApproved'] and b['retainedUnchanged']
 assert b['beforeScope']['rawHistoricalIssuesUnchanged']==base['rawValidation']['historical']['issues']
 assert all(x['status'] in ['known','unknown'] and x['origin']=='synthetic_fixture' for x in p)
 assert len({x['key'] for x in p})==len(p)
 for x in p:
  assert x['sourceId']==sid and x['sourceHash']==r['sourceHash'] and x['recipeHash']==r['sourceRecipeHash']
  assert x['scope']=={k:context[k] for k in ['scenarioId','objective','phase']} and x['contextDate']==inputs['contextDate'] and x['contextVersion']==(strength_boundary['contextVersion'] if sid=='A_STR_STABILITY_CORE' else inputs['contextVersion'])
 vals={x['key']:x['value'] for x in p};events=timeline['events'];expected=None
 if sid=='C_BIKE_AERO_POSITION_DRILLS':
  text=src['originalCanonical']['original']['raw']['structure'][0]['text'];assert "6x10'" in text and "r=5'" in text
  policy=fixture['policy'];assert vals['aero.rest_policy']==policy
  if policy:
   nrest=5 if policy=='between_only' else 6;expected=6*10*60+nrest*5*60
   work=[e for e in events if e['kind']=='work'];rests=[e for e in events if e['kind']=='rest'];assert len(work)==6 and len(rests)==nrest
   assert all(e['seconds']==600 and e['position']=='aero' for e in work) and all(e['seconds']==300 and e['position']=='relaxed' for e in rests)
   ftp=originals[1]['input']['raw']['ftp'];assert ftp==265
   for e in events:
    target=e['intensity'];lo,hi=bike_domain(target['domain']);assert target['min']==ftp*lo and target['max']==ftp*hi and target['unit']=='W'
   assert timeline['noFourByFifteenEquivalence']
 elif sid.startswith('C_SWIM_') or sid=='A_SWIM_CONTINUOUS_2K':
  assert timeline['cssTransferred'] is False
  q=fixture['params'];paces=q.get('secondsPer100ByLiteral',{})
  for literal,pace in paces.items():assert vals['swim.pace:'+literal]==pace
  if paces:
   tr=q['transitionSeconds'];assert tr==5
   if sid=='C_SWIM_TRI_CATCH_PULL':
    assert '8x(50m' in src['originalCanonical']['original']['raw']['structure'][1]['text']
    expected=3*paces['300m facile']+8*(.5*paces['50m rattrapé']+.5*paces['50m poing fermé']+paces['100m nage complète propre'])+7*15+18*tr+2*paces['200m souple'];meters=2100
   elif sid=='C_SWIM_CATCH_FOCUS':
    expected=3*paces['300m facile']+8*.5*paces['50m scull avant']+8*.5*paces['50m catch-up drill']+6*paces['100m Z2 focus catch']+2*7*15+5*q['unstatedRestSeconds']+4*tr+2*paces['200m facile'];meters=1900
   else:
    expected=4*paces['400m facile multi-nages']+20*paces['2000m continu Z2 (splits réguliers, focus respiration bilatérale)']+2*paces['200m dos facile']+2*tr;meters=2600
   assert sum(e.get('meters',0) for e in events)==meters
   for e in events:
    if e['kind']=='distance':
     assert e['secondsPer100']==paces[e['sourceText']] and e['seconds']==e['meters']/100*e['secondsPer100']
     assert e['intensity']['sourceZone']==vals['swim.zone:'+e['sourceText']]
   assert expected>(40 if sid=='A_SWIM_CONTINUOUS_2K' else 35)*60
  else:assert not r['technically_complete_in_scenario'] and timeline['unknowns']
 else:
  assert sid=='A_STR_STABILITY_CORE';q=fixture
  assert all(q[k]==v for k,v in inputs['strength'].items() if k!='id') and q['sideCount']==2 and q['sideExecution']=='sequential'
  registered=next(v for v in strength_registration['variants'] if v['id']==q['id']);assert all(q[k]==v for k,v in registered.items())
  rawmain=src['originalCanonical']['original']['raw']['structure'][1]['text'];assert rawmain.startswith('3 tours:')
  if q['exerciseRestPolicy'] is not None and q['roundRestPolicy'] is not None:
   assert vals['strength.exercise_rest_policy']==q['exerciseRestPolicy'] and vals['strength.round_rest_policy']==q['roundRestPolicy']
   assert vals['strength.peripheral_transition']==strength_boundary['peripheralTransitionSeconds']==5 and vals['strength.round_transitions_in_rest'] is True and vals['strength.boundary_rest_composition']=='additive_separate_segments'
   nex=5 if q['exerciseRestPolicy']=='between_only' else 6;nround=2 if q['roundRestPolicy']=='between_only' else 3
   expected=600+2*strength_boundary['peripheralTransitionSeconds']+3*(45+30*q['sideCount']+sum([10,12,10,15])*q['sideCount']*q['secondsPerRep']+5*q['sideChangeSeconds']+nex*q['exerciseRestSeconds'])+nround*q['roundRestSeconds']
   assert len([e for e in events if e['kind']=='peripheral_transition'])==2 and all(e['seconds']==5 for e in events if e['kind']=='peripheral_transition')
   assert len([e for e in events if e['kind']=='repetitions'])==24 and len([e for e in events if e['kind']=='hold'])==9
   assert len([e for e in events if e['kind']=='exercise_rest_and_transition'])==3*nex and len([e for e in events if e['kind']=='round_rest_and_transition'])==nround
   for e in events:
    if e['kind']=='repetitions':assert e['secondsPerRep']==q['secondsPerRep']==vals['strength.tempo:'+e['name']] and e['seconds']==e['repetitions']*e['secondsPerRep'] and e['cardiovascularZone'] is None
  else:assert not timeline['complete'] and not events and not r['technically_complete_in_scenario']
  assert not timeline['cardiovascularZoneUsed'] and timeline['neuromuscularLoadMode']=='bodyweight'
 assert r['seconds']==expected
 if expected is not None:
  assert sum(e['seconds'] for e in events)==expected and all(e['seconds']>=0 for e in events)
  assert r['compatible_with_reserved_slot']==(expected<=fixture['availableMinutes']*60)
  assert r['currentCapacityCompatible']==(expected<=source_slots[sid]['input']['currentCapacity']*60)
  assert b['exactElapsedSeconds']==expected and b['historicalIntegerMinuteTransportCompatible']==(expected%60==0)
  changes=b['changes'];assert len(changes)==1 and changes[0]['toMinutes']==expected/60 and changes[0]['sourceIdUnchanged']==sid
  # Historical whole-plan outputs retain every real warning/error; exact seconds are never rounded.
  if expected%60:
   assert not b['acceptedAsSeparateTechnicalScenario'] and b['transportLimitation']
   assert any(e['code']=='technical_plan_schema' for e in b['scope']['executedBlockErrors'])
 else:assert not r['technically_complete_in_scenario'] and not b['changes']
 if sid=='A_SWIM_CONTINUOUS_2K':assert r['objectiveVariant']['compatible'] is None and not r['technically_complete_in_scenario']
 if b['acceptedAsSeparateTechnicalScenario']:
  assert r['technically_complete_in_scenario'] and r['compatible_with_reserved_slot'] and r['canSubmitForWholeBlockReview'] and not b['newHistoricalIssues'] and not b['newScopeErrors']
 return expected
seconds=[verify_scenario(s) for s in scenarios]
assert seconds==[5100,5400,None,2755,2860,3090,None,None,1834,1924,None]
phases=load(E/'build/phases.json.gz');assert len(phases)==4
for x,minutes in zip(phases,[120,130,145,105],strict=True):
 assert x['reservedMinutes']==minutes and not x['A']['compatible'] and x['literalGenericRange']==[90,180] and x['literalIntersection']==[180,180]
 assert x['B']['genericDurationCompatible'] and x['B']['policyStatus']=='proposed_not_authorized' and not x['B']['automaticPermission'] and x['B']['candidate_requires_coach_policy']
 assert 'explicit_FCmax_reference_missing' in x['intensityUnchanged']['reasons'] and x['intensityUnchanged']['sourcePower']['min']==265*55/100 and x['intensityUnchanged']['sourcePower']['max']==265*72/100
 assert x['recordedExplicitHistoricalGenericBaseWaiver'] is None and x['weekReservedMinutes']<=x['budget']
negative_checks=[]
for name,index,mutate in [
 ('invent_final_rest',1,lambda s:s['result'].update(seconds=5100)),
 ('invent_individual_approval',0,lambda s:s['result'].update(approved_by_coach=True)),
 ('alter_source',0,lambda s:s['sourceSnapshot']['canonical']['original']['raw']['structure'][0].update(text='4x15')),
 ('invent_rep_tempo',8,lambda s:next(e for e in s['result']['timeline']['events'] if e['kind']=='repetitions').update(secondsPerRep=3)),
 ('borrow_css_for_drill',3,lambda s:next(p for p in s['parameters'] if p['key']=='swim.pace:50m rattrapé').update(value=105))]:
 s=copy.deepcopy(scenarios[index]);mutate(s)
 try:verify_scenario(s)
 except AssertionError:negative_checks.append({'mutation':name,'rejected':True})
 else:raise AssertionError(('independent_negative_not_rejected',name))
replay={}
for f in ['inputs.json.gz','strengthRegistration.json.gz','strengthBoundary.json.gz','originals.json.gz','scenarios.json.gz','phases.json.gz']:
 b=raw(E/'build'/f);assert b==raw(E/'replay'/f);replay[f]=sha(b)
commands=load(E/'commands.json');assert len(commands)==11 and all(c['status']==0 and not c['error'] for c in commands)
mapping=[json.loads(l) for l in raw('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl').splitlines()];assert len(mapping)==920 and len({x['legacyId'] for x in mapping})==920 and sum(len(x['variants']) for x in mapping)==2425
assert len(load('docs/det-engine/evidence-final/matrix.json.gz'))==600
assert len(raw('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz').splitlines())==15
phys=load(R/'evidence/physiology-readonly.json');b=phys['content'].encode();assert hashlib.sha1(('blob '+str(len(b))+'\0').encode()+b).hexdigest()==phys['sha'] and phys['ref']=='429a84c1c35255843251a478ef3f48ab0dd907c6'
unique=sorted({s['sourceId'] for s in scenarios if s['result']['technically_complete_in_scenario']})
summary={'schema':'v28-independent-1','passed':True,'previousFilesUnchanged':len(load(R/'baseline-files.json')),'unchangedOriginalCalendars':3,'unchangedOriginalReservations':90,'BOriginalTechnicalExecutions':3,'BOriginalUniqueSourceIds':1,'syntheticScenarios':len(scenarios),'syntheticCompleteTimingScenarios':sum(x is not None for x in seconds),'syntheticTechnicallyCompleteScenarios':sum(s['result']['technically_complete_in_scenario'] for s in scenarios),'syntheticTechnicallyCompleteSourceIds':unique,'syntheticCompleteSourceCount':len(unique),'syntheticFullBlockReviewAccepted':sum(s['wholeBlockReview']['acceptedAsSeparateTechnicalScenario'] for s in scenarios),'syntheticFractionalMinuteBlockRefusals':sum(s['wholeBlockReview']['transportLimitation'] is not None for s in scenarios),'individualApprovals':0,'humanSportingReviews':0,'automaticSubstitutions':0,'A_runRefusals':7,'C_individualRefusals':26,'longBikeVariantConflictsPreserved':4,'newCoachPolicyAuthorizations':0,'idsPreserved':920,'variantsPreserved':2425,'historicalConfigurationsPreservedNotRerun':600,'priorNolioFixturesPreserved':15,'independentNegativeChecks':negative_checks,'logicalReplay':replay,'verifierSha256':sha(pathlib.Path(__file__).read_bytes())}
(R/'evidence/independent-validation.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
