"""Final independent publication guard for V28 additions and separation of synthetic/individual outcomes."""
import gzip,hashlib,json,pathlib,subprocess
R=pathlib.Path('docs/det-engine/v28');E=R/'evidence/validation-3'
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
def sha(b):return hashlib.sha256(b).hexdigest()
for f,h in load(E/'executed-source-pins.json').items():assert sha(pathlib.Path(f).read_bytes())==h,('runtime_changed',f)
for f,h in load(R/'baseline-files.json').items():assert sha(pathlib.Path(f).read_bytes())==h,('historical_changed',f)
names=['V28_RESULTS.md','PARAMETRIC_EXECUTION_CONTRACT.md','IRONMAN_PHASE_VARIANT_OPTIONS.md','AERO_RECOVERY_ALTERNATIVES.md','SWIM_AND_STRENGTH_EXECUTION.md','BEFORE_AFTER_V27.md','COACH_DECISIONS.md','REPRISE.md']
for name in names:
 t=(R/name).read_text();assert 'NO-GO' in t and '```json' not in t and '{"' not in t,('missing_or_dump_doc',name)
a=load(R/'evidence/independent-validation.json');assert a['passed'] and a['syntheticCompleteSourceCount']==4 and a['BOriginalTechnicalExecutions']==3 and a['individualApprovals']==0
scenarios=load(E/'build/scenarios.json.gz');assert len(scenarios)==11
for s in scenarios:
 r=s['result'];assert not r['individually_admissible'] and not r['approved_by_coach'] and not r['automaticallyApplied'] and not s['wholeBlockReview']['automaticallyApplied']
 if r['sourceId']=='A_STR_STABILITY_CORE' and r['technically_complete_in_scenario']:
  p={x['key']:x for x in s['parameters']}
  for key in ['strength.exercise_rest_policy','strength.round_rest_policy','strength.peripheral_transition','strength.round_transitions_in_rest','strength.boundary_rest_composition']:assert key in p and p[key]['status']=='known'
for p in load(E/'build/phases.json.gz'):assert not p['B']['automaticPermission'] and p['B']['policyStatus']=='proposed_not_authorized'
assert (R/'evidence/strength-boundary-final.txt').read_text().startswith('PASS:')
assert all('AssertionError'in (R/'evidence'/f).read_text() for f in ['strength-rest-negative-before.txt','strength-boundary-negative-before.txt','strength-rest-unit-before.txt','strength-boundary-unit-before.txt'])
changed=set(subprocess.check_output(['git','diff','--name-only','aaefc53771c6a12639b0e3669c58d922be162291'],text=True).splitlines());changed.update(subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines())
allowed=lambda f:f.startswith('docs/det-engine/v28/')or f.startswith('experimental/det-engine/v28-')or f=='experimental/det-engine/vitest.v28.config.ts'or f.startswith('scripts/det-engine/v28-')
assert all(allowed(f) for f in changed),('unapproved_paths',[f for f in changed if not allowed(f)])
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='experiment/det-engine'
out={'passed':True,'documents':8,'originalCalendarsUnchanged':3,'previousFilesUnchanged':len(load(R/'baseline-files.json')),'syntheticCompleteSourceCount':4,'originalBTechnicalExecutions':3,'individualApprovals':0,'changedPathsAllowed':len(changed),'guardSourceSha256':sha(pathlib.Path(__file__).read_bytes())}
(R/'evidence/final-check.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
