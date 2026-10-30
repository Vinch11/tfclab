"""Independent read-only audit; does not import the mapping builder or its routing function."""
import collections,csv,gzip,hashlib,json,pathlib,re,sys
R=pathlib.Path('docs/det-engine/v21a');E=R/'evidence/accepted'
def load(p):return json.loads(pathlib.Path(p).read_text())
def lines(p):
    with gzip.open(p,'rt')if str(p).endswith('.gz')else open(p)as f:return[json.loads(x)for x in f if x.strip()]
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def pointer(obj,p):
    for k in p.split('/')[1:]:obj=obj[int(k)]if isinstance(obj,list)else obj[k.replace('~1','/').replace('~0','~')]
    return obj
C=lines('docs/det-engine/v16/evidence/final/canonical.jsonl.gz');V=lines('docs/det-engine/v18/evidence/validation-3/build/variants.jsonl.gz')
Q={q['legacyId']:q for q in lines('docs/det-engine/v17/evidence/qualification-final.jsonl.gz')}
M=lines(R/'WORKOUT_FAMILY_MAPPING.jsonl');by={r['legacyId']:r for r in M};assert len(by)==len(M)==len(C)==920
assert set(by)=={c['identity']['legacyId']for c in C}
for c in C:
    id=c['identity']['legacyId'];r=by[id];p=c['prescription']
    assert r['source']['raw']==c['original']['raw']and r['source']['effective']==c['original']['effective'],id
    assert r['source']['provenance']==c['provenance']and r['constraints']==p['restrictions'],id
    assert r['doseParameters']['sourceStructure']==p['structure']and r['unknowns']==c['conversion']['unknowns'],id
    assert r['historicalObjective']==p['objective']and r['explicitPhysiology']==p['physiology'],id
    assert r['inheritedQualification']==Q[id]and r['sourceReferenceMentions']==p['references'],id
    assert r['variants']==[v for v in V if v['legacyId']==id],id
    assert r['sourceStructureSha256']==hashlib.sha256(json.dumps(p['structure'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    assert not any([r['scientificallyValidated'],r['automaticPromotion'],r['prescriptionChanged'],r['evidenceAttachments']]),id
    for m in r['memberships']:
        assert m['evidenceLevel']is None and m['referenceIds']==[]and not m['doseValidated']and not m['mechanismIndependentlyAssessed']
        assert m['declaredTarget']==any(x['role']=='declared_target'for x in m['basis'])
        for b in m['basis']:assert pointer(c,b['pointer'])==b['text'],(id,b)
assert sum(len(r['variants'])for r in M)==2425
usage=lines(R/'PLAN_USAGE.jsonl');actual=collections.Counter((x['legacyId'],x['cohort'])for x in usage)
for r in M:
    for cohort,count in r['usageByCohort'].items():assert count==actual[r['legacyId'],cohort]
# Independently count final sessions rather than trusting build summary/trace.
historical=json.load(gzip.open('docs/det-engine/v2/final/candidate.json.gz','rt'))['rows'];assert len(historical)==600
expected=collections.Counter();plans=0
for p in historical:
    if not p.get('technicallyConstructed'):continue
    plans+=1
    for w in p['candidate']['weeks']:
        for s in w['sessions']:
            if not s.get('isRest')and s.get('catalogId'):expected[s['catalogId']]+=1
assert plans==167 and expected==collections.Counter(x['legacyId']for x in usage if x['cohort']=='v2_historical_complete_plans')
families=load(E/'family-definitions-and-impact.json')
for f in families:
    targets={r['legacyId']for r in M if any(m['familyId']==f['id']and m['declaredTarget']for m in r['memberships'])}
    assert targets==set(f['declaredTargetIds'])and f['declaredTargetCount']==len(targets)
    assert f['rankingMetric']==sum(expected[id]for id in targets)
    for cohort,count in f['targetUsageOccurrences'].items():assert count==sum(actual[id,cohort]for id in targets)
ranked=sorted([f for f in families if f['axis']=='mechanism'],key=lambda f:(-f['rankingMetric'],-f['usedDistinctIds'].get('v14_native_primary',0),f['id']))[:5]
dossiers=load(R/'TOP_5_RESEARCH_DOSSIERS.json');assert[f['id']for f in ranked]==[d['familyId']for d in dossiers]
assert len(dossiers)==5 and len(load(R/'RESEARCH_QUESTIONS.json'))==62
refs=load(E/'existing-reference-contexts.json');assert len(refs)==16 and len({x['originalRecord']['url']for x in refs})==14
assert all(not r['workoutAttribution']and not r['newVerification']and not r['doseValidated']for r in refs)
occ=lines(R/'REFERENCE_OCCURRENCES.jsonl');assert len(occ)==475
assert all(not r['verifiedReferenceIds']and not r['doseEvidence']for r in occ)
bundle=json.load(gzip.open('docs/det-engine/v16/evidence/source-bundle.json.gz','rt'))
bundle_files={x['path']:x for x in bundle['files']}
for r in occ:
    if r['scope']=='workout_historical':
        assert pointer({'original':{'raw':by[r['legacyId']]['source']['raw']}},r['pointer'])==r['text']
    else:assert r['text']in bundle_files[r['path']]['text'].splitlines()[r['line']-1]
for f in bundle['files']:assert hashlib.sha256(f['text'].encode()).hexdigest()==sha(f['path'])==f['sha256']
for name in ['WORKOUT_FAMILY_MAPPING.jsonl','REFERENCE_OCCURRENCES.jsonl','PLAN_USAGE.jsonl']:assert sha(R/name)==sha(E/name)
index=lines(R/'evidence/handoff/EDITORIAL_CANDIDATE_INDEX.jsonl');assert len(index)==418
archived_review=lines('docs/det-engine/v20/evidence/validation-2/build/review/review.jsonl.gz')
for item in index:
    loc=item['sourceLocator'];original=archived_review[loc['jsonlLine']-1]['candidates'][loc['candidateIndex']]
    assert item['archivedCandidateReviewUnchanged']==original
    assert not item['scientificApproval']and not item['sourceReplaced']
counts=collections.Counter();plans_by_stratum=collections.defaultdict(set)
for u in usage:
    if u['cohort']!='v2_historical_complete_plans':continue
    for m in by[u['legacyId']]['memberships']:
        if m['declaredTarget']:
            key=(m['familyId'],u['objective'],u['ambition'],u['level']);counts[key]+=1;plans_by_stratum[key].add(u['planKey'])
with open(R/'evidence/handoff/FAMILY_USAGE_BY_OBJECTIVE.csv')as f:
    csvrows=list(csv.DictReader(f));assert len(csvrows)==len(counts)==1309
    for r in csvrows:
        key=tuple(r[k]for k in ['familyId','objective','ambition','qualitativeLevel'])
        assert int(r['sourceSessionOccurrences'])==counts[key]and int(r['distinctSyntheticConfigurations'])==len(plans_by_stratum[key])
for p in (R/'evidence/handoff').iterdir():assert sha(p)==sha(R/'evidence/handoff-replay'/p.name)
baseline=load(R/'baseline-files.json')
for p,h in baseline.items():assert sha(p)==h,p
result={'independentAuditPass':True,'ids':920,'variants':2425,'sourceDoseAndInstructionsUnchanged':True,
 'rawAndEffectiveObjectsEqual':True,'allInheritedQualificationsUnchanged':True,'historicalCasesReadOnly':600,
 'historicalConstructedPlans':plans,'historicalWorkoutOccurrences':sum(expected.values()),'separateCohortOccurrences':dict(collections.Counter(x['cohort']for x in usage)),
 'dossiers':5,'questions':62,'mentions':475,'contextRecords':16,'uniqueContextUrls':14,
 'referencesAutomaticallyAssigned':0,'scientificPromotions':0,'baselineFilesUnchanged':len(baseline),
 'archivedEditorialCandidatesUnchanged':len(index),'objectiveAmbitionLevelStrata':len(csvrows)}
out=pathlib.Path(sys.argv[1]);assert not out.exists();out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
