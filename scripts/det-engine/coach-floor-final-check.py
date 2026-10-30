"""Final release-scope and execution-source verification. Does not grant any prescription approval."""
import gzip,hashlib,json,pathlib,subprocess,sys
R=pathlib.Path('docs/det-engine/v25-coach-floor');attempt=sys.argv[1]if len(sys.argv)>1 else'1';E=R/'evidence'/('validation-'+attempt)
def load(p):
 p=pathlib.Path(p);return json.loads(gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes())
for p,h in load(E/'executed-source-pins.json').items():assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h,('pinned_input_changed',p)
audit=load(R/'evidence/independent-validation.json');assert audit['pass']and audit['policyAppliedAlternatives']==6 and audit['individualDoseApprovals']==0
rows=load(E/'build/results.json.gz');assert sum(bool(x['optIn']['complementary']and x['optIn']['complementary']['policyApplied'])for x in rows)==6
required=['COACH_POLICY.md','EXCEPTION_CONTRACT.md','BEFORE_AFTER.md','COACH_PREVIEW.md','VALIDATION.md','RESULTS.md','REPRISE.md']
assert all((R/f).is_file()and(R/f).stat().st_size>100 for f in required)
policy=load(R/'COACH_POLICY.json');assert policy['provenance']['signature']is None and not policy['individualDoseApproved']and not policy['productionAuthorized']
paths=[]
for line in subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],text=True).splitlines():
 p=line[3:];assert p.startswith(str(R)+'/')or(p.startswith('experimental/det-engine/')and pathlib.Path(p).name.startswith(('coach-floor-','vitest.coach-floor')))or(p.startswith('scripts/det-engine/')and pathlib.Path(p).name.startswith('coach-floor-')),('unexpected_path',p);paths.append(p)
state=load(R/'state.json');assert state['maxUnits']==10 and len(state['units'])<=10 and not state['budgetRenewal']and not state['automaticRestart']
out={'pass':True,'allPreviousAndExecutedNodeSourcesUnchanged':True,'oneExplicitCoachProgrammingPolicy':True,'individualDoseApprovals':0,'individualExpertReviews':0,'requestedFocusedDossiers':len(required),'changedPathsAllCoachFloorScope':len(paths),'verifierSourceSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
(R/'evidence/final-additional-checks.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
