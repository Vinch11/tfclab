"""Independent stdlib audit. Does not import the builder, classifier or evidence gate."""
import collections,csv,gzip,hashlib,json,pathlib,re,sys,xml.etree.ElementTree as ET
R=pathlib.Path('docs/det-engine/v21c');A=R/'evidence/release-comparisons'
def load(p):return json.loads(pathlib.Path(p).read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def lines(p):
    with gzip.open(p,'rt')if str(p).endswith('.gz')else open(p)as f:return[json.loads(l)for l in f if l.strip()]
baseline=load(R/'baseline-files.json')
for p,h in baseline.items():assert sha(pathlib.Path(p).read_bytes())==h,p
mapping=lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl');assert len(mapping)==920 and len({r['legacyId']for r in mapping})==920
assert sum(len(r['variants'])for r in mapping)==2425
sources={r['legacyId']:r for r in mapping}
oldcatalogue=lines('docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz')
oldc={c['candidateKey']:c for r in oldcatalogue for c in r['candidates']}
oldreview=lines('docs/det-engine/v20/evidence/validation-2/build/review/scientific-review.jsonl.gz');oldr={r['candidateKey']:r for r in oldreview};assert len(oldr)==96
new=lines(A/'source-id-dossiers.jsonl');assert len(new)==51 and {r['legacyId']for r in new}=={r['legacyId']for r in oldreview}
seen={}
for d in new:
    m=sources[d['legacyId']];assert d['sourceEffectiveUnchanged']==m['source']['effective']and d['sourceConstraintsUnchanged']==m['constraints']and d['variantsUnchanged']==m['variants']
    for c in d['candidates']:
        k=c['candidateKey'];seen[k]=c;assert c['candidateUnchanged']==oldc[k]and c['v20ReviewUnchanged']==oldr[k]
        assert sha(json.dumps(oldc[k],ensure_ascii=False,separators=(',',':')).encode())==c['candidateSnapshotSha256']
        dose=oldr[k]['exactCandidateDose'];rows=dose['descriptiveLedger']['rows']
        assert sum(x['seconds']for x in rows)==dose['seconds']==oldc[k]['witness']['seconds']
        assert sum(x['seconds']for x in rows if x['recovery'])==dose['descriptiveLedger']['recoverySeconds']
        assert all(x['seconds']>=0 for x in rows)and c['doseStatus']=='dose_not_individually_verified'
assert set(seen)==set(oldr)
comparisons=lines(A/'candidate-comparisons.jsonl');assert len(comparisons)==102
for c in comparisons:
    assert c['candidateHash']==seen[c['candidateKey']]['candidateSnapshotSha256']
    assert c['sourceHash']==sources[c['workoutId']]['source']['provenance']['effectiveContentSha256']
    assert not c['exactDoseGate']['literatureClaimCandidateAllowed']and not c['expertHumanReview']
    assert c['exactDoseGate']['individualAdmissibility']=='not_assessed_not_approved'
    if c['artifactHash']:assert sha(gzip.decompress(pathlib.Path(c['artifact']).read_bytes()))==c['artifactHash']
    if c['comparisonStatus'].startswith('conclusive'):
        assert c['access']=='full_main_text_and_xml_tables_examined'and c['studyScope']=='primary'
        assert c['checks']['full_session_matches']is False
assert(A/'EXACT_DOSE_ATTACHMENTS.jsonl').stat().st_size==0
registry=load(A/'study-registry.json');full=[]
for key,s in registry.items():
    if s['artifactSha256']:assert sha(gzip.decompress(pathlib.Path(s['artifact']).read_bytes()))==s['artifactSha256']
    if s['fullMainTextReviewed']:
        raw=ET.fromstring(gzip.decompress(pathlib.Path(s['artifact']).read_bytes()));ids={n.get('pub-id-type'):''.join(n.itertext())for n in raw.findall('front/article-meta/article-id')}
        assert ids['pmid']==s['pmid']and ids['doi']==s['doi'];assert raw.find('body')is not None;full.append(s)
assert len(full)==5 and sum(s['studyType']=='primary'for s in full)==4
assert len(load(A/'IDENTITY_CORRECTIVE_REGISTER.json'))==6 and len(load(A/'RELAY_IDENTIFIER_DISAGREEMENTS.json'))==3
# Independent enumeration from source JSON pointers and roles, not from classifier outputs.
expected={};signatures=collections.Counter();operationcounts=collections.Counter()
for r in oldcatalogue:
    for c in r['candidates']:
        ops=[e for e in c['changes']if e.get('rule')=='explicit_editorial_final_recovery']
        if not ops:continue
        categories=set()
        for e in ops:
            tokens=re.findall(r'[A-Za-z]+|\d+',e['path']);node=r['sourceV18Recipe'];ancestors=[];tails=[]
            for token in tokens[:-1]:
                if token.isdigit():tails.extend(node[int(token)+1:]);node=node[int(token)];ancestors.append(node)
                else:node=node[token]
            assert node['restPolicy']=='unknown'and e['before']=='unknown'
            samepart=[n for n in tails if n.get('partIndex')==node.get('partIndex')]
            role=node.get('role','').lower()
            if 'warm'in role or 'échauff'in role:category='warm_up'
            elif 'cool'in role or 'retour au calme'in role:category='final_cool_down'
            elif any(a.get('kind')=='repeat'for a in ancestors[:-1]):category='inter_series_or_work_blocks'
            elif any(n['kind']=='unknown'for n in samepart):category='unresolved_following_content'
            elif samepart:category='inter_series_or_work_blocks'
            else:category='after_main_block'
            categories.add(category);operationcounts[category]+=1;expected[(c['candidateKey'],e['path'])]=category
        signatures['+'.join(sorted(categories))]+=1
ops=lines(R/'evidence/recovery-1/operations.jsonl.gz');assert len(ops)==466
for o in ops:
    assert expected[(o['candidateKey'],o['path'])]==o['hypotheticalLastRecoveryLocation']
    assert o['sourceLastRecoveryPresence']=='unknown'and not o['scientificArbitrationResolved']and not o['actualRecoveryChanged']
s=load(R/'evidence/recovery-1/summary.json');assert sum(signatures.values())==416 and dict(signatures)==s['disjointProposalSignatures']
assert all(operationcounts[k]==v for k,v in s['hypotheticalLastRestOperations'].items())
replay={}
for p in sorted(A.iterdir()):
    if p.is_file():replay[p.name]=p.read_bytes()==(R/'evidence/release-replay'/p.name).read_bytes();assert replay[p.name],p.name
for p in (R/'evidence/recovery-1').iterdir():assert p.read_bytes()==(R/'evidence/recovery-replay'/p.name).read_bytes(),p.name
oldproof=load(R/'evidence/v21b-independent-replay.json');assert oldproof['independentAuditPass']and oldproof['archivedHistoricalCasesIntact']==600 and oldproof['priorEditorialCoachViewsUnchanged']==418 and oldproof['nolioPayloadsUnchanged']==15 and oldproof['oldIronmanBlockersStillPresent']
im=load('docs/det-engine/v20/evidence/validation-2/build/ironman/results.json');assert len(im['fullPlans'])==2
for p in im['fullPlans']:
    assert not p['baseline']['technicalProjection']['valid'];assert sum(i['severity']=='error'for i in p['baseline']['historical']['issues'])==2
report={'independentAuditPass':True,'previousFilesUnchanged':len(baseline),'idsPreserved':920,'variantsPreserved':2425,'historicalCasesPreservedByPriorAuditAndHashes':600,
 'candidateChronologiesDeepEqual':96,'workoutDossiers':51,'candidateLedgerArithmeticChecked':96,'comparisonRows':len(comparisons),
 'fullMainTextsExaminedRecorded':5,'primaryMainTextsExaminedRecorded':4,'newExactDoseAttachments':0,'individualApprovals':0,'sportingHumanReviews':0,
 'recoveryConventionsIndependentlyPartitioned':416,'recoveryOperations':466,'oldCoachRendersUnchanged':920,'oldCandidateViewsUnchanged':418,'nolioFixturesUnchanged':15,
 'ironmanBlockersStillPresent':True,'replayFilesByteIdentical':replay,'recoveryReplayFilesByteIdentical':3,'scientificScopeOfAudit':'Integrity and logical contracts only; does not independently replicate every reading or validate athlete dose.'}
path=pathlib.Path(sys.argv[1]);assert not path.exists();path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
