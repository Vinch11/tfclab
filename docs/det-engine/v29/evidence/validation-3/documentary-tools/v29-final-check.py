"""Release guard: additions only, preserved archives, bounded state, independently checked exact-time receipts."""
import hashlib,json,pathlib,subprocess
R=pathlib.Path('docs/det-engine/v29')
def load(p):return json.loads(pathlib.Path(p).read_text())
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
old=load(R/'baseline-files.json')
for p,h in old.items():assert sha(p)==h,('OLD_FILE_CHANGED',p)
s=load(R/'state.json');assert len(s['units'])<=10 and s['validationAttempts']==3 and not s['automaticRestart']
m=load(R/'evidence/independent-validation.json');assert m['passed'] and m['losslessTransportedTimelines']==7 and len(m['transportedFractionalGoalCompatibleSourceIds'])==3 and m['noNewComplementaryBlockDefects']==5 and m['newOriginalBCalendarInsertions']==m['individualApprovals']==0
expected=['V29_RESULTS.md','EXACT_TIME_CONTRACT.md','LEGACY_CALENDAR_BRIDGE.md','SWIM_AND_STRENGTH_REPLAY.md','AERO_REPLAY.md','BLOCK_VALIDATION.md','BEFORE_AFTER_V28.md','COACH_DECISIONS.md','NOLIO_LOCAL_CONTRACT.md','REPRISE.md']
for name in expected:
 text=(R/name).read_text();assert 'DRAFT — NO-GO'in text and '```json'not in text
assert 'PASS:'in(R/'evidence/nolio-text-final.txt').read_text()
for name in ['strength-anchor-unit-before.txt','registry-boundary-unit-before.txt','nolio-text-unit-before.txt','budget-semantics-unit-before.txt']:
 assert 'AssertionError'in(R/'evidence'/name).read_text(),name
for name in ['v29-time.ts','v29-bridge.ts']:
 text=pathlib.Path('experimental/det-engine',name).read_text();assert not any(x in text for x in ['Math.round','EPSILON','toFixed'])
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='experiment/det-engine'
allowed=lambda p:p.startswith(('docs/det-engine/v29/','experimental/det-engine/v29-','scripts/det-engine/v29-'))or p=='experimental/det-engine/vitest.v29.config.ts'
changed=subprocess.check_output(['git','diff','--name-only','59e1b079ad8c11726d3ca92007fbecb75c5047aa'],text=True).splitlines()
unknown=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines()
for p in changed+unknown:assert allowed(p),('UNAUTHORIZED_PATH',p)
for p,h in load(R/'evidence/validation-3/executed-source-pins.json').items():assert sha(p)==h,('EXECUTED_SOURCE_CHANGED',p)
print(json.dumps({'passed':True,'oldFilesUnchanged':len(old),'documents':len(expected),'boundedUnits':len(s['units']),'validationAttempt':3,'changedOrNewPaths':len(changed+unknown),'individualApprovals':0},indent=2))
