"""Release checks independent of the TS planner; run after the report is rendered."""
import collections, gzip, hashlib, json, pathlib, subprocess
R=pathlib.Path('docs/det-engine/v24');E=R/'evidence/validation-2'
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
for p,h in load(E/'source-pins.json').items():assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h,('tested_source_changed',p)
rows=load(E/'build/results.json.gz');checked=0
for row in rows:
 v=row['result'];old={d['slotKey']:d for d in v['before']['result']['decisions']}
 for d in v['result']['decisions']:
  b=old[d['slotKey']];assert d['targets']==b['targets']and d['derivedZoneView']==b['derivedZoneView']and d['physiology']==b['physiology']and d['minutes']==b['minutes']and d['state']==b['state'];checked+=1
for row in load(R/'evidence/warning-witnesses.json'):
 for ledger,issues in [('original','rawOriginalIssues'),('rejectedV23','rawV23Issues'),('retainedV24','rawRetainedIssues')]:
  actual=[i for i in row[issues]if i['code']=='anti_repetition'and i['severity']=='warning'];assert len(actual)==len(row[ledger])
 assert len(row['original'])==11 and len(row['rejectedV23'])==12 and len(row['retainedV24'])==10
required=['PHYSIOLOGY_HANDOFF_424.md','PLACEMENT_WARNING_ANALYSIS.md','PHYSIOLOGICAL_DECISIONS.md','CAPACITY_FLOOR_OPTIONS.md','BEFORE_AFTER.md','COACH_DECISIONS.md','V24_RESULTS.md','REPRISE.md']
assert all((R/p).is_file()and(R/p).stat().st_size>100 for p in required)
status=subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True)
paths=[]
for l in status.splitlines():
 p=l[3:];assert p.startswith('docs/det-engine/v24/')or(p.startswith('experimental/det-engine/')and pathlib.Path(p).name.startswith(('v24-','vitest.v24')))or(p.startswith('scripts/det-engine/')and pathlib.Path(p).name.startswith('v24-')),('unexpected_path',p);paths.append(p)
state=load(R/'state.json');assert state['maxUnits']==10 and len(state['units'])<=10 and not state['budgetRenewal']and not state['automaticRestart']
out={'pass':True,'testedSourcePinsUnchanged':True,'unchangedTargetZonePhysiologyAndStateDecisions':checked,'antiRepetitionLedgersMatchAllRawIssues':True,'requestedDossiersPresent':len(required),'changedPathsAllV24':len(paths),'productionOrPriorFileChanges':0,'approvals':0,'fullIronmanValidation':False}
(R/'evidence/final-additional-checks.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
