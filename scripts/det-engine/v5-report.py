"""Read-only evidence aggregation; never constructs a workout or changes acceptance."""
import collections,gzip,hashlib,json,pathlib,subprocess
root=pathlib.Path('docs/det-engine/v5')
load=lambda p:json.load(gzip.open(p)) if str(p).endswith('.gz') else json.load(open(p))
base=load('docs/det-engine/v3/final/candidate.json.gz')['rows']
oldtrail=load('docs/det-engine/v4/final/trail-retained.json.gz')
trail=load(root/'evidence/trail-final/retained.json.gz')
im=load(root/'evidence/im-final/retained.json.gz')
blocking=lambda r:sum(i['severity'] in ('error','critical','blocking') for i in r.get('issues',[]))
warning=lambda r:sum(i['severity']=='warning' for i in r.get('issues',[]))
def groups(rows,keys):
 result=[]
 for key,group in __import__('itertools').groupby(sorted(rows,key=lambda r:tuple(str(r.get(k,''))for k in keys)),key=lambda r:tuple(r.get(k)for k in keys)):
  group=list(group);built=[r for r in group if r.get('candidate')]
  result.append(dict(zip(keys,key))|{'cases':len(group),'built':len(built),'withoutBlockingExecuted':sum(not blocking(r)for r in built),'blockingOccurrences':sum(map(blocking,built)),'warnings':sum(map(warning,built)),'expertReviewed':0})
 return result
oldkeys={(r['fixtureId'],r['model'])for r in oldtrail if r.get('candidate')}
same=[r for r in trail if r.get('candidate') and(r['fixtureId'],r['model'])in oldkeys]
new=[r for r in trail if r.get('candidate') and(r['fixtureId'],r['model'])not in oldkeys]
# Objective and qualitative level belong to the immutable fixture IDs; not inferred physiological capacities.
trailrows=[dict(r,objective=r['fixtureId'].split(':')[1],level=r['fixtureId'].split(':')[2])for r in trail]
reference=load(root/'evidence/reference/summary.json')
report={'version':'det-v5-dashboard-1','recommendation':'NO-GO','historical':{'summary':reference,'byObjectiveAmbitionLevel':groups(base,['objective','ambition','effectiveAmbition','level']),'fresh600PlanGeneration':False,'originalReferencePayloadPreserved':True},
 'sameTwelveTrailCandidates':{'beforeBuilt':12,'afterBuilt':len(same),'beforeBlocking':sum(blocking(r)for r in oldtrail if r.get('candidate')),'afterBlocking':sum(map(blocking,same)),'beforeWarnings':sum(warning(r)for r in oldtrail if r.get('candidate')),'afterWarnings':sum(map(warning,same)),'newCandidatesExcludedFromComparison':len(new),'newCandidateBlockingOccurrences':sum(map(blocking,new))},
 'trail':{'raw':load(root/'evidence/trail-final/summary.json'),'retainedByObjectiveLevelModel':groups(trailrows,['objective','level','model']),'retainedBuilt':sum(bool(r.get('candidate'))for r in trail),'expertReviewed':0},
 'ironman':{'models':load(root/'evidence/im-final/summary.json'),'retainedByRequestedAmbitionLevelModel':groups(im,['ambition','level','model']),'distinctInputsWithCandidate':len({r['id']for r in im if r.get('candidate')}),'expertReviewed':0},
 'globalControls':load(root/'evidence/global-final/summary.json'),
 'coverage':{'technicalSchema':'executed_on_candidates','existingSportControls':'executed_contextual_and_preserved','sourceCatalogue':'executed_during_selection_and_dose_repair','wholePlanRepairGuard':'executed_for_each_proposal','referenceRefusals':'preserved_not_reclassified_as_global_impossibility','physiologicalAdaptation':'not_attested','expertReview':'none','postFinalRaceRecovery':'outside_plan_horizon','verticalRoadIronman':'not_applicable','muscleTolerance':'unknown_without_explicit_individual_evidence'}}
(root/'dashboard.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
checks={}
for version in ['v2','v3','v4']:
 path=pathlib.Path(f'docs/det-engine/{version}/checksums.json')
 if path.exists():
  manifest=load(path)
  for p,h in manifest.items():
   assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h,p
  checks[version]={'manifestSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'allEntriesVerified':True}
(root/'baseline-preservation.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps({'sameTwelve':report['sameTwelveTrailCandidates'],'baseline':checks},ensure_ascii=False))
