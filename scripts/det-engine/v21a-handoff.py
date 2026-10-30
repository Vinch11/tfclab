"""Supplementary handoff indexes; archived overlays and usage remain non-prescriptive."""
import collections,csv,gzip,importlib.util,io,json,pathlib,sys
S=importlib.util.spec_from_file_location('session',pathlib.Path(__file__).with_name('v21a-session.py'))
session=importlib.util.module_from_spec(S);S.loader.exec_module(session)
R=session.ROOT
def lines(p):
    with gzip.open(p,'rt')if str(p).endswith('.gz')else open(p)as f:return[json.loads(x)for x in f if x.strip()]
def build(out):
    session.guard();out=pathlib.Path(out);assert out.is_relative_to(R/'evidence')and not out.exists();out.mkdir()
    mapping={r['legacyId']:r for r in lines(R/'WORKOUT_FAMILY_MAPPING.jsonl')}
    source='docs/det-engine/v20/evidence/validation-2/build/review/review.jsonl.gz';index=[]
    for line,r in enumerate(lines(source),1):
        assert r['legacyId']in mapping
        for i,c in enumerate(r['candidates']):
            index.append({'schemaVersion':'tfcl-research-editorial-index-1.0.0','legacyId':r['legacyId'],
              'candidateKey':c['candidateKey'],'sourceLocator':{'file':source,'jsonlLine':line,'candidateIndex':i},
              'sourceEffectiveSha256':mapping[r['legacyId']]['source']['provenance']['effectiveContentSha256'],
              'archivedSourceCanonicalHash':r['sourceCanonicalHash'],
              'sourceFamilyIds':[m['familyId']for m in mapping[r['legacyId']]['memberships']],
              'archivedCandidateReviewUnchanged':c,'scientificApproval':False,'sourceReplaced':False,
              'evidenceAttachmentRequiresSeparateCandidateVersionContract':True})
    assert len(index)==418 and len({r['legacyId']for r in index})==210
    assert sum(r['archivedCandidateReviewUnchanged']['technicalTimelineAvailable']for r in index)==96
    (out/'EDITORIAL_CANDIDATE_INDEX.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n'for x in index))
    usage=lines(R/'PLAN_USAGE.jsonl');counts=collections.Counter();plan_sets=collections.defaultdict(set)
    for u in usage:
        if u['cohort']!='v2_historical_complete_plans':continue
        for m in mapping[u['legacyId']]['memberships']:
            if not m['declaredTarget']:continue
            key=(m['familyId'],u['objective'],u['ambition'],u['level']);counts[key]+=1;plan_sets[key].add(u['planKey'])
    text=io.StringIO();w=csv.writer(text,lineterminator='\n');w.writerow(['familyId','objective','ambition','qualitativeLevel','sourceSessionOccurrences','distinctSyntheticConfigurations'])
    for key,count in sorted(counts.items()):w.writerow([*key,count,len(plan_sets[key])])
    (out/'FAMILY_USAGE_BY_OBJECTIVE.csv').write_text(text.getvalue())
    summary={'editorialCandidates':418,'distinctSourceIds':210,'completeCandidateTimelines':96,
      'completeDistinctIds':len({r['legacyId']for r in index if r['archivedCandidateReviewUnchanged']['technicalTimelineAvailable']}),
      'newCandidateValidation':False,'automaticPromotion':False,'sourceReplacements':0,'usageStrata':len(counts)}
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
if __name__=='__main__':build(sys.argv[1])
