"""Two-axis recovery inventory: repeated-rest role and hypothetical final-rest location."""
import collections,gzip,importlib.util,json,pathlib,re,sys
S=importlib.util.spec_from_file_location('session',pathlib.Path(__file__).with_name('v21c-session.py'));session=importlib.util.module_from_spec(S);S.loader.exec_module(session)
SOURCE='docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz'
CATEGORIES=['warm_up','inter_repetitions','inter_series_or_work_blocks','after_main_block','final_cool_down','unresolved_following_content']
def loadrows():
    with gzip.open(SOURCE,'rt')as f:return[json.loads(l)for l in f if l.strip()]
def locate(nodes,path):
    tokens=re.findall('nodes|children|[0-9]+|restPolicy',path);assert tokens[0]=='nodes'and tokens[-1]=='restPolicy'
    current=nodes;parents=[];containers=[]
    for token in tokens[1:-1]:
        if token=='children':parents.append(current);current=current['children']
        else:containers.append((current,int(token)));current=current[int(token)]
    following=[]
    for container,index in reversed(containers):following.extend(container[index+1:])
    return current,parents,following
def classify(node,parents,following):
    role=node.get('role','')
    if re.search(r'warm|échauff',role,re.I):return'warm_up'
    if re.search(r'cool|retour au calme',role,re.I):return'final_cool_down'
    if any(p['kind']=='repeat'for p in parents):return'inter_series_or_work_blocks'
    relevant=[n for n in following if n.get('partIndex')==node.get('partIndex')]
    if any(n['kind']=='unknown'for n in relevant):return'unresolved_following_content'
    if relevant:return'inter_series_or_work_blocks'
    # Following separately labelled cool-down does not turn this last rest into that cool-down.
    return'after_main_block'
def build(out):
    session.guard();out=pathlib.Path(out);assert not out.exists()and out.resolve().is_relative_to((session.ROOT/'evidence').resolve());out.mkdir()
    operations=[];proposals=[]
    for r in loadrows():
        for c in r['candidates']:
            changes=[e for e in c['changes']if e.get('rule')=='explicit_editorial_final_recovery']
            if not changes:continue
            keys=[]
            for e in changes:
                n,pa,following=locate(r['sourceV18Recipe']['nodes'],e['path']);kind=classify(n,pa,following);keys.append(kind)
                operations.append({'legacyId':r['legacyId'],'candidateKey':c['candidateKey'],'path':e['path'],
                    'sourceNodeUnchanged':n,'parentKinds':[p['kind']for p in pa],
                    'followingNodesUnchanged':following,'sourcePartUnchanged':r['originalCanonical']['original']['effective']['structure'][n['partIndex']],
                    'sourceRestPolicy':n['restPolicy'],'editorialPolicy':e['after'],
                    'ongoingRestRole':'inter_repetitions_of_this_repeat',
                    'hypotheticalLastRecoveryLocation':kind,'sourceLastRecoveryPresence':'unknown',
                    'scientificArbitrationResolved':False,'actualRecoveryChanged':False})
            proposals.append({'candidateKey':c['candidateKey'],'legacyId':r['legacyId'],
              'lastRecoveryContextSignature':sorted(set(keys)),'operationCount':len(changes),
              'ongoingRestContext':'inter_repetitions','sourceLastRecoveryPresence':'unknown',
              'policyNotApproved':True})
    assert len(proposals)==416 and len(operations)==466
    op=collections.Counter(x['hypotheticalLastRecoveryLocation']for x in operations)
    inclusive=collections.Counter(k for p in proposals for k in p['lastRecoveryContextSignature'])
    signatures=collections.Counter('+'.join(p['lastRecoveryContextSignature'])for p in proposals)
    summary={'conventionProposals':len(proposals),'sourceIds':len({p['legacyId']for p in proposals}),'policyOperations':len(operations),
      'ongoingInterRepetitionContextProposals':416,'hypotheticalLastRestOperations':{k:op[k]for k in CATEGORIES},
      'inclusiveProposalCounts':{k:inclusive[k]for k in CATEGORIES},'disjointProposalSignatures':dict(sorted(signatures.items())),
      'warmupOperations':op['warm_up'],'warmupProposals':inclusive['warm_up'],
      'classificationDoesNotDeterminePresence':True,'approvedPolicies':0}
    for name,rows in [('operations',operations),('proposals',proposals)]:
        (out/(name+'.jsonl.gz')).write_bytes(gzip.compress((''.join(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n'for x in rows)).encode(),mtime=0))
    session.save(out/'summary.json',summary);print(json.dumps(summary))
if __name__=='__main__':build(sys.argv[1])
