"""Independent release boundaries and coach dossier fidelity. No planner/compiler imported."""
import datetime,gzip,hashlib,json,pathlib,subprocess
R=pathlib.Path('docs/det-engine/v30')
def load(p):return json.loads(pathlib.Path(p).read_text())
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
for p,h in load(R/'baseline-files.json').items():assert sha(p)==h,('BASELINE_CHANGED',p)
for p,h in load(R/'evidence/validation-2/executed-source-pins.json').items():assert sha(p)==h,('EXECUTED_SOURCE_CHANGED',p)
m=load(R/'evidence/independent-validation.json');assert m['passed']and m['newTests']==18 and m['nonRegressionTests']==469 and m['individualApprovals']==m['newOriginalInsertions']==m['newIndividualParameters']==m['newTechnicallyExecutableSessions']==0
assert 'PASS:'in(R/'evidence/intensity-final.txt').read_text()
for name in ['variant-reading-before.txt','intensity-unit-before.txt','intensity-negative-before.txt']:assert 'AssertionError'in(R/'evidence'/name).read_text(),name
p=json.loads(gzip.decompress((R/'evidence/validation-2/build/proposed.json.gz').read_bytes()));coach=(R/'FOUR_WEEK_COACH_CANDIDATE.md').read_text();assert coach.count('\n### ')==30 and '```json'not in coach and 'source-specific technique'not in coach and 'approve or reject'not in coach
for w in p['weeks']:
 for s in w['sessions']:
  assert s['sourceId']in coach
  for part in s['originalParts']:assert part['text']in coach,('COACH_SOURCE_INSTRUCTION_LOSS',s['slotKey'],part['part'])
assert sum(s['sourceId']=='SEILER_RUN_Z1_EASY_LONG'for w in p['weeks']for s in w['sessions'])==1
for name in ['V30_RESULTS.md','IRONMAN_PHASE_POLICY_OPTIONS.md','FOUR_WEEK_COACH_CANDIDATE.md','SESSION_SUBSTITUTIONS.md','SPORTING_CONSTRAINTS.md','BEFORE_AFTER_V29.md','COACH_DECISIONS.md','REPRISE.md']:
 assert 'DRAFT — NO-GO'in(R/name).read_text(),name
state=load(R/'state.json');assert len(state['units'])<=10 and state['validationAttempts']<=3 and not state['automaticRestart']
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='experiment/det-engine'
allowed=lambda p:p.startswith(('docs/det-engine/v30/','experimental/det-engine/v30-','scripts/det-engine/v30-'))or p=='experimental/det-engine/vitest.v30.config.ts'
paths=subprocess.check_output(['git','diff','--name-only','234112a1fa713b796d1f41faf14819d5ab6d0171'],text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines()
for p in paths:assert allowed(p),('UNAUTHORIZED_CHANGE',p)
print(json.dumps({'passed':True,'baselineFilesUnchanged':len(load(R/'baseline-files.json')),'coachSessions':30,'coachOriginalInstructionsPreserved':True,'rawIntensityContractsUnchanged':30,'boundedUnits':len(state['units']),'runtimeEvidence':'validation-2','individualApprovals':0,'newOriginalCalendarInsertions':0},indent=2))
