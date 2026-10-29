"""Final publication guard: additions only, complete readable coach view, unchanged evidence and no approval."""
import gzip,hashlib,json,pathlib,re,subprocess
R=pathlib.Path('docs/det-engine/v27');E=R/'evidence/validation-3'
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
def sha(b):return hashlib.sha256(b).hexdigest()
for f,h in load(E/'executed-source-pins.json').items():assert sha(pathlib.Path(f).read_bytes())==h,('runtime_source_changed',f)
for f,h in load(R/'baseline-files.json').items():assert sha(pathlib.Path(f).read_bytes())==h,('previous_file_changed',f)
names=['V27_RESULTS.md','WORKOUT_EXECUTION_CONTRACT.md','PROFILE_B_SESSION_AUDIT.md','LONG_BIKE_VARIANT_CONFLICT.md','SWIM_EXECUTION_TIMING.md','STRENGTH_EXECUTION.md','AERO_POSITION_EXECUTION.md','INTENSITY_RESOLUTION.md','ALTERNATIVE_SESSION_SEARCH.md','BEFORE_AFTER_V26.md','COACH_REVIEW_30_SESSIONS.md','NOLIO_SIMULATION.md','REPRISE.md']
for f in names:assert (R/f).is_file()and'NO-GO'in(R/f).read_text()
text=(R/'COACH_REVIEW_30_SESSIONS.md').read_text();assert len(re.findall(r'^## S[1-4] — ',text,re.M))==30 and'```json'not in text and'{"'not in text
rows=load(E/'build/results.json.gz');assert len(rows[1]['executions'])==30
for e in rows[1]['executions']:
 assert e['sourceId']in text
 for part in e['originalParts']:assert part['text']in text
 for c in e['individualConditionsUnchanged']:assert c['id']in text
audit=load(R/'evidence/independent-validation.json');assert audit['passed']and audit['BTechnicalExecutions']==3 and audit['individualDoseApprovals']==0 and audit['A_runRefusalsPreserved']==7
changed=set(subprocess.check_output(['git','diff','--name-only','ec65f318b943f4a65f5df059288e1abd9e874ae4']).decode().splitlines());changed.update(subprocess.check_output(['git','ls-files','--others','--exclude-standard']).decode().splitlines())
def allowed(f):return f.startswith('docs/det-engine/v27/')or f.startswith('experimental/det-engine/v27-')or f=='experimental/det-engine/vitest.v27.config.ts'or f.startswith('scripts/det-engine/v27-')
assert all(allowed(f)for f in changed),('unapproved_paths',sorted(f for f in changed if not allowed(f)))
assert subprocess.check_output(['git','branch','--show-current']).decode().strip()=='experiment/det-engine'
out={'passed':True,'essentialDocuments':13,'coachSessionsChecked':30,'newExecutableSourceIds':1,'technicalExecutions':3,'individualApprovals':0,'previousFilesUnchanged':len(load(R/'baseline-files.json')),'changedPathsAllowed':len(changed),'guardSourceSha256':sha(pathlib.Path(__file__).read_bytes())}
(R/'evidence/final-check.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
