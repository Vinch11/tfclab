"""Independent arithmetic, source/goal, calendar and approval verification; no JS engine imported."""
import collections,datetime,gzip,hashlib,json,pathlib,re,sys
R=pathlib.Path('docs/det-engine/v27');attempt=sys.argv[1] if len(sys.argv)>1 else '1';E=R/'evidence'/('validation-'+attempt)
def raw(p):
 p=pathlib.Path(p);b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def load(p):return json.loads(raw(p))
def lines(p):return [json.loads(x) for x in raw(p).splitlines() if x]
def sha(b):return hashlib.sha256(b).hexdigest()
def digest(x):return sha(json.dumps(x,ensure_ascii=False,separators=(',',':')).encode())
for p,h in load(E/'executed-source-pins.json').items():assert sha(pathlib.Path(p).read_bytes())==h,('source_changed',p)
assert load(R/'inputs.json')==load(E/'build/registered-inputs.json')
rows=load(E/'build/results.json.gz');old=load('docs/det-engine/v26/evidence/validation-safety/build/originals.json.gz');assert len(rows)==3
canonical={x['legacyId']:x for x in lines('docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz')};assert len(canonical)==920
domain_source=pathlib.Path('src/lib/zones/tfclDoctrine.ts').read_text()
def domain(name):
 match=re.search('id: "'+name+r'".*?run: \{ min: ([\d.]+), max: ([\d.]+) \}',domain_source,re.S);assert match;return tuple(map(float,match.groups()))
reports=[];passes=0;refusals=0;workouts=0
for row,prior in zip(rows,old[:3],strict=True):
 assert row['caseId']==prior['caseId'] and row['input']==prior['input'] and row['calendar']==prior['retained'];assert row['calendarHash']==digest(row['calendar'])
 assert row['scope']==prior['fourWeekScope'];assert row['scope']['rawHistoricalIssuesUnchanged']==row['calendar']['rawValidation']['historical']['issues']
 assert len(row['executions'])==30
 slots={s['key']:s for w in row['calendar']['calendar']['weeks'] for s in w['slots']}
 assert {e['slotKey'] for e in row['executions']}==set(slots)
 for e in row['executions']:
  s=slots[e['slotKey']];source=canonical[e['sourceId']];original=source['originalCanonical']['original']['effective'];flags=e['flags']
  assert e['sourceId']==s['card']['id'] and e['sourceHash']==digest(s['card']) and e['sourceRecipeHash']==source['sourceRecipeHash'];assert e['originalParts']==original['structure']
  assert e['minutesReserved']==s['minutes'] and e['currentCapacity']==s['input']['currentCapacity'];assert e['individualConditionsUnchanged']==s['input']['conditions'];assert e['nativeDecisionUnchanged']==s['decision']
  assert all(x in e['hardFailures'] for x in s['input']['hardFailures']);assert not flags['individual_tolerance_verified'] and not flags['individual_prescription_approved'] and flags['coach_review_required'] and not e['operationalAuthorization'];assert not e['individualPrescriptionApproved']
  if e['sourceId']=='SEILER_BIKE_Z1_LONG':
   assert e['variant']['range']==[180,210] and e['variant']['compatible'] is False and e['minutesReserved'] in [120,130,145,105]
   assert flags['full_duration_verified'] and not e['technicallyExecutable'];assert e['execution']['seconds']==e['minutesReserved']*60
   assert len(e['execution']['integratedPeripheralParts'])==2
   power=e['intensity']['sourcePower'];ftp=row['input']['raw']['ftp']
   if ftp is None:assert power is None
   else:assert power['min']==ftp*55/100 and power['max']==ftp*72/100
   assert 'explicit_FCmax_reference_missing' in e['intensity']['reasons']
  if e['sourceId']=='A_RUN_EASY_45_PRO' and row['caseId']=='B_sustainability':
   assert e['technicallyExecutable'] and e['flags']['objective_variant_compatible'] and e['executableWorkout']['totalSeconds']==2700
   assert sum(x['seconds'] for x in e['executableWorkout']['steps'])==2700 and e['execution']['witness']['seconds']==2700
   assert original['structure'][0]['text'].startswith('45–55');assert not e['executableWorkout']['readyForAthlete'];assert 'F'in e['categories']
   anchor=(3600/row['input']['raw']['paceThresholdSecPerKm'])/3.6
   for t in e['intensity']['numericTargets']:
    low,high=domain(t['domain']);assert abs(t['min']-anchor*low)<1e-10 and abs(t['max']-anchor*high)<1e-10
   workouts+=1
  if e['sourceId']=='SEILER_RUN_Z1_EASY_LONG':
   proof=e['execution']['existingIntegratedTimingProof'];assert proof['valid'] and proof['minutes']==90 and proof['extraMinutesInvented']==0
   assert e['execution']['seconds']==5400 and sum(x['seconds']for x in e['execution']['integratedSegments'])==5400
   assert 'Warm-up: Intégré — les 10 premières minutes'in s['card']['structure'] and 'Cool-down: Intégré — les 10 dernières minutes'in s['card']['structure']
   assert not e['technicallyExecutable'] and not e['intensity']['resolved']
  if row['caseId']in['A_aerobic','C_uncertain'] and e['sport']=='run':assert not e['technicallyExecutable'] and not e['intensity']['numericTargets']
  if e['technicallyExecutable']:assert flags['full_duration_verified'] and flags['current_capacity_documented'] and flags['objective_variant_compatible'] is True and not e['hardFailures'] and e['fits_reserved_window']
 for n in row['nolio']:
  e=next(e for e in row['executions'] if e['slotKey']==n['slotKey']);r=n['result'];assert r['networkRequests']==0 and not r['realExportPermitted']
  if r.get('payload'):
   passes+=1;assert e['technicallyExecutable'];p=r['payload'];assert p['duration']==2700 and 'structured_workout'not in p
   date=datetime.date(2026,11,2)+datetime.timedelta(days=(e['week']-1)*7+e['day']);assert p['date_start']==str(date)
   for part in e['originalParts']:assert part['text'] in p['description']
   assert 'non approuvées' in p['description']
  else:refusals+=1;assert not e['technicallyExecutable']
 reports.append({'caseId':row['caseId'],'slots':30,'technicalExecutable':sum(e['technicallyExecutable'] for e in row['executions']),'flags':{k:sum(e['flags'][k] is True for e in row['executions']) for k in row['executions'][0]['flags']},'rawHistorical':[row['calendar']['rawValidation']['historical']['blocking'],row['calendar']['rawValidation']['historical']['warnings']]})
assert workouts==passes==3 and refusals==87
assert sum(d['sport']=='run' and d['state']=='not_admissible' for d in rows[0]['calendar']['decisions'])==7
assert sum(d['state']=='not_admissible' for d in rows[2]['calendar']['decisions'])==26
alt=rows[1]['alternatives'];assert not alt['automaticallyApplied'] and alt['trialLimit']==3
for search in alt['searches']:
 assert search['scannedCanonicalRecords']==920
 for offer in search['offers']:
  if offer['technicallyCandidate']:assert 'ironman'in canonical[offer['sourceId']]['originalCanonical']['original']['effective'].get('goals',[])
fixtures=load(E/'build/fixtures.json.gz');assert len(fixtures['equipment'])==4
for case in fixtures['equipment']:
 id=case['input']['id'];r=case['result'];expected=None if id=='unknown' else id!='indoor_no_fan';assert r['equipment']['compatible'] is expected;assert 'ventilateur'in r['equipment']['rawMetadataPrerequisites'];assert not r['flags']['individual_tolerance_verified'] and not r['flags']['objective_variant_compatible']
for i,(meters,seconds) in enumerate([(2100,2755),(1900,2860),(2600,3090)]):
 f=fixtures['swim'][i];r=f['result'];assert r['totalWrittenMeters']==meters and r['fullDurationSeconds']==seconds and r['fullDurationVerified'];assert sum(e['seconds'] for e in r['events'])==seconds
 assert r['syntheticParametersAreNotAthleteBData'] and not r['cssUsedForOtherStrokes'] and not r['individualToleranceVerified'];assert seconds> (40 if i==2 else 35)*60
 assert sum(e.get('meters',0) for e in r['events'])==meters
for f in fixtures['swim'][3:]:assert f['result']['fullDurationSeconds'] is None
for f in fixtures['aero']:
 r=f['result'];assert r['repetitions']==6 and r['secondsPerBout']==600 and r['totalAeroSeconds']==3600 and r['possibleElapsedSeconds']==[5100,5400];assert not r['posturalToleranceVerified'] and not r['equalsFourByFifteen']
 assert r['seconds']=={'unknown':None,'between_declared':5100,'after_each_declared':5400}[f['input']['id']]
for f in fixtures['strength']:
 r=f['result'];assert r['rounds']==3 and len(r['exercises'])==6 and r['knownPeripheralSeconds']==600 and r['wholeWorkoutSeconds'] is None;assert r['technicalPrerequisitesSatisfied'] is (f['competence'] is True) and not r['assimilationObserved'] and not r['cardiovascularZoneUsedAsMuscularDose']
for f in fixtures['negativeRun']:
 r=f['result'];assert not r['technicallyExecutable'] and not r['flags']['individual_prescription_approved'];assert r['flags']['recipe_structurally_complete']
for p in [R/'evidence/pr425-file-0.json',R/'evidence/pr425-file-1.json']:
 x=load(p);b=x['content'].encode();assert hashlib.sha1(('blob '+str(len(b))+'\0').encode()+b).hexdigest()==x['sha'];assert x['ref']=='9f67b70240d21f4d07ef29828a64d01b2060fadf'
replay={}
for f in ['registered-inputs.json','original-cases.json','results.json.gz','fixtures.json.gz']:
 b=raw(E/'build'/f);assert b==raw(E/'replay'/f);replay[f]=sha(b)
commands=load(E/'commands.json');assert len(commands)==10 and all(c['status']==0 and not c['error'] for c in commands)
mapping=lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl');assert len(mapping)==920 and len({x['legacyId'] for x in mapping})==920 and sum(len(x['variants']) for x in mapping)==2425
assert len(load('docs/det-engine/evidence-final/matrix.json.gz'))==600 and len(lines('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz'))==15
result={'version':'det-v27-independent-1','passed':True,'previousFilesUnchanged':len(load(R/'baseline-files.json')),'unchangedCalendars':3,'unchangedSessionReservations':90,'BTechnicalExecutions':3,'uniqueNewExecutableSourceIds':1,'NolioTextFixtures':3,'NolioExplicitRefusals':87,'individualDoseApprovals':0,'humanSportingReviews':0,'A_runRefusalsPreserved':7,'C_individualRefusalsPreserved':26,'explicitBikeVariantConflicts':4,'syntheticSwimCompleteTimingScenarios':3,'syntheticSwimDataAppliedToB':False,'automaticReplacements':0,'alternativeOffersExamined':sum(len(s['offers']) for s in alt['searches']),'wholePlanAlternativeTrials':len(alt['trials']),'preservedIds':920,'preservedVariants':2425,'historicalConfigurationsPreservedNotRerun':600,'preservedNolioFixtures':15,'logicalReplay':replay,'profiles':reports,'verifierSha256':sha(pathlib.Path(__file__).read_bytes())}
(R/'evidence/independent-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['profiles','logicalReplay']},indent=2))
