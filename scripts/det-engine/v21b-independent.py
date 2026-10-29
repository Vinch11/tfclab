"""Independent V21B audit: does not import the integration builder or packet gate."""
import collections,csv,gzip,hashlib,json,pathlib,re,sys
R=pathlib.Path('docs/det-engine/v21b');state=json.loads((R/'state.json').read_text());E=R/state.get('acceptedData','evidence/accepted');I=R/'input'
def load(p):return json.loads(pathlib.Path(p).read_text())
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def lines(p):
    with gzip.open(p,'rt')if str(p).endswith('.gz')else open(p)as f:return[json.loads(x)for x in f if x.strip()]
manifest=load(I/'manifest_sha256.json')['sha256']
for p,h in manifest.items():assert sha(I/p)==h,p
raw=gzip.decompress((R/'evidence/public-source-retrieval/response.json.gz').read_bytes());prov=load(R/'evidence/public-source-retrieval/provenance.json');assert hashlib.sha256(raw).hexdigest()==prov['responseSha256']
actual={p['id']:p for p in json.loads(raw)['resultList']['result']};assert len(actual)==46
old=lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl');new=lines(E/'WORKOUT_RESEARCH_ROUTING.jsonl');assert len(new)==920 and {r['legacyId']for r in new}=={r['legacyId']for r in old}
by={r['legacyId']:r for r in old};count=0;withheld=0
for n in new:
    assert n['v21aRecordUnchanged']==by[n['legacyId']]
    assert n['actualIndividualProfile']is None and n['workoutEvidenceAttachments']==[]and not n['scientificallyValidated']and not n['prescriptionChanged']
    assert n['doseStatus']=='dose_not_individually_verified'
    assert [r['sourceMembershipUnchanged']for r in n['routes']]==by[n['legacyId']]['memberships']
    for route in n['routes']:
        if route['potentialReferenceIds']:
            assert route['nonTitleSourceSupport']and not route['evidenceAttached']
            for b in route['nonTitleSourceSupport']:
                p=b['pointer'];assert ('/structure/'in p and p.endswith('/text'))or '/physiology/'in p or p=='/prescription/discipline'
        else:withheld+=1
    count+=any(r['potentialReferenceIds']for r in n['routes'])
assert sum(len(r['v21aRecordUnchanged']['variants'])for r in new)==2425
assert count==787 and withheld==1697
assert {n['legacyId']for n in new if n['unresolvedIntent']}=={'A_10K_PROGRESSIVE_60','A_SEMI_PROGRESSIVE_FINISH'}
kb=load(E/'FAMILY_KNOWLEDGE_BASE.json');families=load(I/'mecanismes_15_familles.json')['families'];assert len(kb['families'])==15
assert [f['providedFamilyUnchanged']for f in kb['families']]==families
provided=load(I/'references_verifiees.json');assert [r['providedRecordUnchanged']for r in kb['referenceRegistry']]==provided
assert all(not r['workoutAttributions']for r in kb['referenceRegistry'])
for r in kb['referenceRegistry']:
    a=actual[r['providedRecordUnchanged']['pmid']]
    for k,v in r['retrievedIdentity'].items():assert a.get(k)==v
    assert r['localVerification']['responseSha256']==prov['responseSha256']and not r['localVerification']['fullTextReviewed']
assert sum(r['localVerification']['status']=='abstract_reviewed'for r in kb['referenceRegistry'])==45
assert kb['unboundAssertionsUnchanged']==lines(I/'assertions_familiales_non_liees.jsonl')
questions=load(I/'REPONSES_62_QUESTIONS_V21A.json')['items'];assert {q['questionId']for q in questions}=={q['questionId']for q in load('docs/det-engine/v21a/RESEARCH_QUESTIONS.json')}
kept=[x for f in kb['families']for x in f['openScientificQuestions']]+kb['crossCuttingQuestionResponses'];assert len(kept)==62 and all(not q['closed']for q in kept)
assert {q['providedResponseUnchanged']['questionId']:q['providedResponseUnchanged']for q in kept}=={q['questionId']:q for q in questions}
science=lines('docs/det-engine/v20/evidence/validation-2/build/review/scientific-review.jsonl.gz');reviews=lines(E/'CANDIDATE_96_REVIEW.jsonl');assert len(reviews)==96 and len({r['legacyId']for r in reviews})==51
for a,b in zip(science,reviews,strict=True):
    assert b['archivedV20ReviewUnchanged']==a and b['exactCandidateDoseUnchanged']==a['exactCandidateDose']and b['unresolvedIntensity']==a['intensityUnknowns']
    assert b['sourceRestrictionsUnchanged']==by[b['legacyId']]['constraints']and b['doseStatus']=='dose_not_individually_verified'and not b['automaticPromotion']and not b['individualAthleteApproved']
# Independently validate actual packet schema, version binding, citation identity, scope and source-body hash.
import jsonschema
schema=load('docs/det-engine/v21a/EVIDENCE_INTEGRATION_SCHEMA.json');packets=lines(E/'EVIDENCE_ATTACHMENT_CANDIDATES.jsonl');assert len(packets)==2
for p in packets:
    jsonschema.Draft202012Validator(schema).validate(p);row=by[p['binding']['legacyId']];a=actual[p['reference']['pmid']]
    assert p['binding']['sourceEffectiveSha256']==row['source']['provenance']['effectiveContentSha256']
    assert p['claim']['scope']=='family_context'and p['review']['status']=='draft'and not p['applicability']['doseAndRecoveryCompared']
    assert p['verification']['responseSha256']==hashlib.sha256(raw).hexdigest()and p['verification']['retrievalUrl']==prov['retrievalUrl']
    assert p['reference']['title']==a['title']and p['reference']['doi']==a['doi']and p['reference']['year']==int(a['pubYear'])
    assert p['binding']['recipeContentSha256']is None and not p['automaticPromotion']and not p['review']['individualAthleteApproved']
coaches=lines(E/'coach-renders-with-context.jsonl.gz');original_coach=lines('docs/det-engine/v16/evidence/final/coach-renders.jsonl.gz');assert len(coaches)==920
html=pathlib.Path('docs/det-engine/v19/cycle-2/coach-library.html').read_text();latest={v['id']:v for v in json.loads(re.search(r'<script type="application/json" id="records">([\s\S]*?)</script>',html).group(1))}
for a,b in zip(original_coach,coaches,strict=True):
    assert a['id']==b['id']and a['text']==b['historicalText']and a['coverage']==b['originalCoverageUnchanged']
    assert b['defaultText']==b['priorCoachText']==latest[b['id']]['sourceCoach']
    assert b['archivedCandidateViewsUnchanged']==latest[b['id']]['candidates']
    assert b['withOptionalContext']==b['priorCoachText']+'\n\nPourquoi cette séance ? — Justification scientifique et limites\n'+b['optionalScientificContext']
assert sum(len(b['archivedCandidateViewsUnchanged'])for b in coaches)==418
nolio=lines(E/'nolio-unchanged-fixtures.jsonl.gz');original_nolio=lines('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz');assert len(nolio)==15
for a,b in zip(original_nolio,nolio,strict=True):assert a['result']['payload']==b['archivedPayloadUnchanged']and not b['bibliographyAdded']and not b['realExportPermitted']
im=load('docs/det-engine/v20/evidence/validation-2/build/ironman/results.json');proof=load(E/'IRONMAN_BLOCKERS_PRESERVED.json')
assert [p['baseline']for p in im['fullPlans']]==[p['baseline']for p in proof['baselinesUnchanged']]
assert all(not p['baseline']['technicalProjection']['valid']for p in im['fullPlans'])
for p in im['fullPlans']:
    issues=p['baseline']['historical']['issues'];assert sum(i['severity']=='error'for i in issues)==2
    assert sum(i['severity']=='warning'for i in issues)==129
    assert {i['code']for i in issues if i['severity']=='error'}=={'sport_ratio'}
historical=json.load(gzip.open('docs/det-engine/v2/final/candidate.json.gz','rt'))['rows'];assert len(historical)==600
baseline=load(R/'baseline-files.json')
for p,h in baseline.items():assert sha(p)==h,p
replayed={p.name:sha(p)==sha(R/state.get('replayData','evidence/replay')/p.name)for p in E.iterdir()if p.is_file()};assert all(replayed.values())
for name in ['FAMILY_KNOWLEDGE_BASE.json','WORKOUT_RESEARCH_ROUTING.jsonl','EVIDENCE_ATTACHMENT_CANDIDATES.jsonl','REJECTION_AND_GAPS.csv']:
    assert sha(R/name)==sha(E/name)
out={'independentAuditPass':True,'preservedIds':920,'preservedVariants':2425,'archivedHistoricalCasesIntact':600,
 'previousFilesUnchanged':len(baseline),'families':15,'actualMetadataVerified':46,'abstractsReadRecorded':45,'fullTextsRead':0,
 'contentSupportedResearchContexts':count,'withheldTitleOrScopeOnlyRoutes':withheld,'candidateReviewsUnchanged':96,
 'draftContextPacketCandidates':2,'individualDoseApprovals':0,'coachTextsUnchanged':920,'priorEditorialCoachViewsUnchanged':418,'nolioPayloadsUnchanged':15,
 'oldIronmanBlockersStillPresent':True,'questionsStillOpen':62,'deterministicArtifacts':len(replayed),'replay':replayed}
p=pathlib.Path(sys.argv[1]);assert not p.exists();p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
