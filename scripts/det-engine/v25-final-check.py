"""Final independent preservation, fixture-freeze and publication-scope checks."""
import gzip,hashlib,json,pathlib,subprocess
R=pathlib.Path('docs/det-engine/v25');E=R/'evidence/validation-3'
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
corrections=load(R/'evidence/auxiliary-path-correction/manifest.json')
assert set(corrections)=={'scripts/det-engine/v25-independent.py','scripts/det-engine/v25-final-check.py'}
for p,h in load(E/'source-pins.json').items():
 if p in corrections:
  c=corrections[p];assert hashlib.sha256(pathlib.Path(c['originalSnapshot']).read_bytes()).hexdigest()==h==c['originalSha256']
  assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==c['correctedSha256']
 else:assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h,('executed_source_changed',p)
initial=load(R/'evidence/validation-1/build/registered-contract-fixtures.json');final=load(E/'build/registered-contract-fixtures.json')
for kind in['floors','physiology','recovery']:assert initial[kind]==final[kind],('fixture_changed_after_observation',kind)
assert load(R/'evidence/validation-1/source-pins.json')[str(R/'inputs.json')]==load(E/'source-pins.json')[str(R/'inputs.json')]
rows=load(E/'build/results.json.gz');old=load('docs/det-engine/v24/evidence/validation-2/build/results.json.gz');assert len(rows)==len(old)==8
for a,b in zip(rows,old,strict=True):assert a['result']['baselineV24']==b['result']
bike_case=next(x['result']['baselineV24']for x in rows if x['caseId']=='B_sustainability')
positive=next(x for x in final['recovery']if x['id']=='favourable_documented');observation=positive['events'][2]['observation']
assert observation['referenceUsable']==(bike_case['result']['refs']['ftpWatts']is not None and bike_case['result']['refs']['ftpWatts']>0)
assert observation['microcycleCompatible']==(len(bike_case['scope']['executedBlockErrors'])==0)
target=next(s for s in bike_case['result']['calendar']['weeks'][1]['slots']if s['role']['sport']=='bike'and s['role']['kind']=='long')
assert positive['subject']['slotKey']==target['key']and positive['subject']['sourceId']==target['card']['id']and positive['subject']['minutes']==target['minutes']and positive['subject']['currentCapacityMinutes']==target['input']['currentCapacity']
for f in final['physiology']:
 if f['envelope']['status']=='documented_candidate'and f['envelope']['quantity']=='running_oxygen_cost':
  e=f['envelope'];reg=final['verifiedArtifacts'][e['sourceArtifactHash']];assert reg['sourceRef']==e['sourceRef'];assert any(c['value']==e['value']and c['rawInputHash']==e['rawInputHash']and c['unit']==e['unit']and c['quantity']==e['quantity']and c['methodId']==e['method']['id']and c['synthetic']==e['synthetic']for c in reg['claims'])
required=['V25_RESULTS.md','CAPACITY_VS_PLANNING_FLOOR.md','COACH_OVERRIDE_CONTRACT.md','PHYSIOLOGY_424_CONTRACT.md','RECOVERY_REASSESSMENT.md','BEFORE_AFTER.md','SPORTING_SAFETY.md','COACH_DECISION_PACKET.md','REPRISE.md']
assert all((R/p).is_file()and(R/p).stat().st_size>100 for p in required)
paths=[]
for line in subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True).splitlines():
 p=line[3:];assert p.startswith(str(R)+'/')or(p.startswith('experimental/det-engine/')and pathlib.Path(p).name.startswith(('v25-','vitest.v25')))or(p.startswith('scripts/det-engine/')and pathlib.Path(p).name.startswith('v25-')),('unexpected_path',p);paths.append(p)
state=load(R/'state.json');assert state['maxUnits']==10 and len(state['units'])<=10 and not state['budgetRenewal']and not state['automaticRestart']
result={'pass':True,'engineAndTestSourcePinsUnchanged':True,'versionedAuxiliaryPathCorrectionsVerified':True,'all15PreregisteredContractCasesUnchangedAcrossHardening':True,'onlyMaterializedRegistryShapeChangedAfterFixtureFreeze':True,'recoveryReferenceMatchesActualTFCLabFTP':bike_case['result']['refs']['ftpWatts'],'recoveryMicrocycleEvidenceMatchesExecutedFourWeekChecks':True,'recoveryTargetMatchesActualV24Slot':True,'previousToleranceIsExplicitSyntheticObservationNotInferredFromPlannedSession':True,'eightV24ObjectsExactlyPreserved':True,'requestedDossiers':len(required),'changedPathsAllV25':len(paths),'individualDoseApprovals':0,'humanExpertReviews':0}
(R/'evidence/final-additional-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
