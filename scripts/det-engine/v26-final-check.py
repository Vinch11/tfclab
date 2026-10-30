"""Final publication guard for additions only, full coach dossiers, source pins and zero approvals."""
import gzip,hashlib,json,pathlib,subprocess
R=pathlib.Path('docs/det-engine/v26');E=R/'evidence/validation-safety'
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
def sha(b):return hashlib.sha256(b).hexdigest()
for p,h in load(E/'executed-source-pins.json').items():assert sha(pathlib.Path(p).read_bytes())==h,('executed_source_changed',p)
for p,h in load(R/'baseline-files.json').items():assert sha(pathlib.Path(p).read_bytes())==h,('previous_file_changed',p)
expected=['V26_RESULTS.md','PHYSIOLOGICAL_SELECTION_ENGINE.md','INDIVIDUALIZED_PRESCRIPTION_CONTRACT.md','ATHLETE_A_FOUR_WEEK_PLAN.md','ATHLETE_B_FOUR_WEEK_PLAN.md','PROFILE_A_B_COMPARISON.md','DECISION_TRACE.md','SPORTING_VALIDATION.md','COACH_REVIEW.md','NOLIO_SIMULATION.md','BEFORE_AFTER_V25.md','REPRISE.md']
for f in expected:assert (R/f).is_file() and 'NO-GO' in (R/f).read_text()
dossiers=load(E/'build/dossiers.json.gz')
for d,who in zip(dossiers,['A','B'],strict=True):
 text=(R/f'ATHLETE_{who}_FOUR_WEEK_PLAN.md').read_text();assert text.count('** (`')==30
 for w in d['weeks']:
  for s in w['sessions']:
   assert s['sourceId'] in text
   for p in s['originalStructure']:assert p['text'] in text
   for c in s['conditions']:assert c['id'] in text
v=load(R/'evidence/independent-validation.json');assert v['passed'] and v['A_runRefusals']==7 and v['individualRefusalsUnchanged']==42 and v['individualApprovals']==0 and v['newPhysicalSubstitutions']==0
changed=set(subprocess.check_output(['git','diff','--name-only','013489126054a94d4c5395e0b5e49d457d25ab47']).decode().splitlines())
changed.update(p for p in subprocess.check_output(['git','ls-files','--others','--exclude-standard']).decode().splitlines())
def allowed(p):return p.startswith('docs/det-engine/v26/') or p.startswith('experimental/det-engine/v26-') or p=='experimental/det-engine/vitest.v26.config.ts' or p.startswith('scripts/det-engine/v26-')
assert all(allowed(p) for p in changed),('unapproved_path',sorted(p for p in changed if not allowed(p)))
assert subprocess.check_output(['git','branch','--show-current']).decode().strip()=='experiment/det-engine'
result={'pass':True,'essentialDocuments':12,'completeCoachSessionsChecked':60,'priorFilesUnchanged':len(load(R/'baseline-files.json')),'changedPathsInAllowedScope':len(changed),'individualApprovals':0,'sourceSha256':sha(pathlib.Path(__file__).read_bytes())}
(R/'evidence/final-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
