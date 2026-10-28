"""Aggregate preserved evidence only; no plan generation, acceptance or validator edits."""
import collections,gzip,hashlib,json,pathlib
root=pathlib.Path('docs/det-engine/v6')
def load(p):
 return json.load(gzip.open(p)) if str(p).endswith('.gz') else json.load(open(p))
def grouped(rows):
 groups={}
 for r in rows:groups.setdefault((r['cohort'],r['objective'],r.get('ambition'),r.get('level')),[]).append(r)
 return [{'cohort':key[0],'objective':key[1],'effectiveAmbition':key[2],'declaredLevel':key[3],'variants':len(group),'distinctInputs':len({r['id']for r in group}),'technicalValid':sum(r['technical']['valid']is True for r in group),'withoutBlockingExistingAndGlobal':sum(r['legacyNoBlocking']for r in group),'blockingExisting':sum(i['severity']in('error','critical','blocking')for r in group for i in r['issues']),'warnings':sum(i['severity']=='warning'for r in group for i in r['issues']),'expertReviewed':0}for key,group in groups.items()]
rows=load(root/'evidence/cohort/validation.json.gz')
dashboard={'version':'det-v6-dashboard-1','status':'NO-GO','same76Comparison':load(root/'comparison.json'),'diagnostic':load(root/'evidence/audit/summary.json'),'ratioContractModels':load(root/'evidence/ratios-final/summary.json'),'actualGenerationBlockRatios':load(root/'evidence/ratios-blocks/block-summary.json')if(root/'evidence/ratios-blocks/block-summary.json').exists()else{'status':'pending'},'strictIronman':load(root/'evidence/ironman-final/summary.json'),'ultraRoleCoverage':load(root/'evidence/trail-coverage/summary.json'),'independentValidation':load(root/'evidence/cohort/summary.json'),'byObjectiveAmbitionLevel':grouped(rows),'historical':load(root/'evidence/reference/summary.json'),'coverage':{'existingSportRules':'executed_and_retained','globalProgression':'executed','keyFlags':'unchanged_independent_invariant_test','ratioUnits':'counts_and_minutes_separate','zoneMinutes':'legacy_clause_estimates_and_unknowns','verticalTolerance':'not_attested','generalSportingRelevance':'not_attested','expertReview':'none'}}
(root/'dashboard.json').write_text(json.dumps(dashboard,indent=2,ensure_ascii=False)+'\n')
proof={}
for version in ['v2','v3','v4','v5']:
 path=pathlib.Path('docs/det-engine')/version/'checksums.json';manifest=load(path)
 for p,h in manifest.items():assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h,p
 proof[version]={'allEntriesVerified':True,'manifestSha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(root/'baseline-preservation.json').write_text(json.dumps(proof,indent=2)+'\n')
print(json.dumps({'cohortRows':len(rows),'same76':dashboard['same76Comparison'],'oldManifestsVerified':list(proof)}))
