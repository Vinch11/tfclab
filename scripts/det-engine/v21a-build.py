"""Offline research preparation. Never calls a prescription engine or changes a source."""
import argparse, collections, gzip, hashlib, json, pathlib, re, sys
import importlib.util
S=importlib.util.spec_from_file_location('session',pathlib.Path(__file__).with_name('v21a-session.py'))
session=importlib.util.module_from_spec(S);S.loader.exec_module(session)
ROOT=session.ROOT
CANON='docs/det-engine/v16/evidence/final/canonical.jsonl.gz'
QUAL='docs/det-engine/v17/evidence/qualification-final.jsonl.gz'
VAR='docs/det-engine/v18/evidence/validation-3/build/variants.jsonl.gz'
BUNDLE='docs/det-engine/v16/evidence/source-bundle.json.gz'
V14='docs/det-engine/v14/evidence/final/calendars.json.gz'
HIST='docs/det-engine/v2/final/candidate.json.gz'
FAMILY=pathlib.Path(__file__).with_name('v21a-families.json')
def read(p):
    with gzip.open(p,'rt') if str(p).endswith('.gz') else open(p) as f: return json.load(f)
def lines(p):
    with gzip.open(p,'rt') if str(p).endswith('.gz') else open(p) as f: return [json.loads(x) for x in f if x.strip()]
def digest(v): return hashlib.sha256(json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def strings(obj,p=''):
    if isinstance(obj,str): yield p,obj
    elif isinstance(obj,dict):
        for k,v in obj.items(): yield from strings(v,p+'/'+str(k).replace('~','~0').replace('/','~1'))
    elif isinstance(obj,list):
        for i,v in enumerate(obj): yield from strings(v,p+'/'+str(i))
def route(c,families):
    p=c['prescription']; raw=c['original']['effective']; fields=[]
    for k in ['objectif','tags','physiology','structure','notes','sport','goals']:
        fields.extend(strings(raw.get(k),'/original/effective/'+k))
    result=[]
    for f in families:
        # Classification of historical claims, not independent scientific inference.
        pattern=f['pattern'].replace('\x08',r'\b'); hits=[]
        if (f['id']=='strength' and p['discipline']=='strength') or (f['id']=='swimming' and p['discipline']=='swim') or (f['id']=='bricks' and p['discipline']=='brick') or (f['id']=='trail' and p['discipline']=='trail'):
            hits.append({'pointer':'/prescription/discipline','text':p['discipline'],'basis':'explicit_discipline'})
        for ptr,text in fields:
            m=re.search(pattern,text,re.I)
            # "Endurance musculaire" and circuit labels are not aerobic evidence.
            if f['id']=='aerobic_endurance' and m and m.group().lower()=='endurance' and (p['discipline']=='strength' or re.search(r'endurance\s+(?:de\s+)?(?:force|musculaire)',text,re.I)):
                m=re.search(r'aérobie|aerobic|sous.lt1|oxydation|fatmax|fondamental|z2 stable',text,re.I)
            if m and not (f['id']=='durability' and re.search(r'(?:sans|éviter|eviter|pas de)\s*$',text[max(0,m.start()-18):m.start()],re.I)):
                hits.append({'pointer':ptr,'text':text,'matchedLiteral':m.group(),'basis':'historical_claim_or_instruction_not_efficacy'})
        for h in hits:
            ptr=h['pointer']
            h['role']=('declared_target' if ptr.endswith('/objectif') or '/tags/' in ptr or ptr.endswith('/physiology/primary') or ptr.endswith('/physiology/secondary') or '/physiology/secondary/' in ptr or ptr=='/prescription/discipline'
              else 'goal_scope_only' if '/goals/' in ptr else 'component_or_rationale_only')
        if hits: result.append({'familyId':f['id'],'axis':f['axis'],'status':'candidate_research_routing','basis':hits,
            'declaredTarget':any(h['role']=='declared_target'for h in hits),
            'plausibleAdaptationQuestion':f['hypothesis'],'evidenceLevel':None,'referenceIds':[],
            'mechanismIndependentlyAssessed':False,'doseValidated':False})
    return result
def calendar_occurrences():
    rows=[];cohorts=[]
    historical=read(HIST)['rows'];assert len(historical)==600
    for n,p in enumerate(historical):
        if not p.get('technicallyConstructed'): continue
        count=0
        for wi,w in enumerate(p['candidate']['weeks']):
            for i,s in enumerate(w['sessions']):
                if s.get('isRest') or not s.get('catalogId'):continue
                rows.append({'cohort':'v2_historical_complete_plans','planKey':p['id'],'week':w['weekNumber'],'slot':i,
                  'legacyId':s['catalogId'],'locator':HIST+f'#/rows/{n}/candidate/weeks/{wi}/sessions/{i}',
                  'conditional':None,'synthetic':True,'expertApproved':False,'objective':p['objective'],
                  'ambition':p['ambition'],'level':p['level']});count+=1
        cohorts.append({'cohort':'v2_historical_complete_plans','planKey':p['id'],'source':HIST,'slots':count,
            'purpose':'archived technically assembled candidate, not sports approval; refused partial traces excluded'})
    calendars=read(V14)
    for n,p in enumerate(calendars):
        cohort='v14_native_primary' if p['model']=='native_floor_conditional' else 'v14_alternatives_separate'
        key=p['profile']+':'+p['model'];count=0
        for w in p['weeks']:
            for i,s in enumerate(w['slots']):
                rows.append({'cohort':cohort,'planKey':key,'week':w['week'],'slot':i,
                  'legacyId':s['card']['id'],'locator':V14+f'#/[{n}]/weeks/{w["week"]-1}/slots/{i}',
                  'conditional':s.get('state') or s.get('admissibility'),'synthetic':True,'expertApproved':False});count+=1
        cohorts.append({'cohort':cohort,'planKey':key,'source':V14,'slots':count,'purpose':'primary pair' if cohort=='v14_native_primary' else 'comparative models, not additional athletes'})
    # Earlier heterogeneous concrete review dossiers, kept as a separate stratum.
    for name in ['ironman','trail-court','trail-montagne','ultra']:
        f=f'docs/det-engine/v7/reviews/{name}.json.gz';p=read(f);count=0
        for w in p['weeks']:
            for i,r in enumerate(w['sessions']):
                s=r['session'];id=s.get('catalogId')
                if not id or s.get('isRest'): continue
                rows.append({'cohort':'v7_review_dossiers_separate','planKey':name+':'+p['id'],'week':w['week'],'slot':i,
                  'legacyId':id,'locator':f+f'#/weeks/{w["week"]-1}/sessions/{i}/session',
                  'conditional':None,'synthetic':True,'expertApproved':False});count+=1
        cohorts.append({'cohort':'v7_review_dossiers_separate','planKey':name+':'+p['id'],'source':f,'slots':count,'purpose':'earlier heterogeneous synthetic review, no independent athlete or effectiveness sample'})
    return rows,cohorts
CITE=re.compile(r'https?://[^\s<>\]\)"\x27]+|10\.\d{4,9}/[^\s<>\]\)"\x27]+|\b(?:PMID|DOI|Réf(?:érence)?|Ref(?:erence)?)[\s.:]|\b(?:19|20)\d{2}\b',re.I)
AUTHORS=re.compile(r'\b(?:Billat|Canova|Coggan|Daniels|Seiler|Lorang|Mujika|Bosquet|Jeukendrup|Burke|Impey|Proeyen|Volek|Phinney|Chatard|Debraux|Périard|Periard|Rønnestad|Ronnestad|Laursen|Buchheit)\b',re.I)
def references(cards,bundle):
    occurrences=[]
    for c in cards:
        for ptr,text in strings(c['original']['raw'],'/original/raw'):
            if CITE.search(text) or AUTHORS.search(text):
                occurrences.append({'scope':'workout_historical','legacyId':c['identity']['legacyId'],
                   'path':c['provenance']['file'],'pointer':ptr,'text':text,
                   'status':'unverified_source_mention' if CITE.search(text) else 'author_or_method_attribution_only',
                   'verifiedReferenceIds':[],'doseEvidence':False})
    # All comments from all captured source files, line-addressable; do not attach to cards.
    for file in bundle['files']:
        for match in re.finditer(r'/\*[\s\S]*?\*/|//[^\n]*',file['text']):
            block=match.group()
            for offset,line in enumerate(block.splitlines()):
                if CITE.search(line) or AUTHORS.search(line):
                    occurrences.append({'scope':'module_comment_unattributed','legacyId':None,'path':file['path'],
                       'line':file['text'][:match.start()].count('\n')+1+offset,'text':line,
                       'status':'unverified_module_mention','verifiedReferenceIds':[],'doseEvidence':False})
    for i,r in enumerate(occurrences): r['occurrenceId']='MENTION-'+str(i+1).zfill(5)
    contexts=[]
    for b in read('docs/det-engine/v8/bibliography.json'):
        contexts.append({'registryId':'V8:'+b['id'],'kind':'coaching_interview' if b['id'].startswith('L') and b['id']!='LL24' else 'publication',
           'source':'docs/det-engine/v8/bibliography.json','originalRecord':b,
           'verification':'inherited_access_scope_only','newVerification':False,'workoutAttribution':[],'doseValidated':False})
    for b in read('docs/det-engine/v17/evidence/scientific-retrieval.json'):
        contexts.append({'registryId':'V17:PMID'+b['pmid'],'kind':'publication','source':'docs/det-engine/v17/evidence/scientific-retrieval.json',
           'originalRecord':b,'verification':'inherited_public_abstract_read_not_full_text','newVerification':False,
           'workoutAttribution':[],'doseValidated':False})
    # Preserve explicitly selected documentary contexts without treating them as new evidence links.
    v19=read('docs/det-engine/v19/cycle-1/evidence/science-1/documentary-context.json')
    for b in v19['newPublicAbstractReviews']:
        contexts.append({'registryId':'V19:PMID'+b['pmid'],'kind':'publication',
          'source':'docs/det-engine/v19/cycle-1/evidence/science-1/documentary-context.json',
          'originalRecord':b,'verification':'inherited_public_abstract_read_not_full_text',
          'newVerification':False,'workoutAttribution':[],'doseValidated':False})
    return occurrences,contexts,v19
def build(out):
    session.guard();session.preserve();out=pathlib.Path(out)
    assert out.is_relative_to(ROOT/'evidence') and not out.exists();out.mkdir(parents=True)
    cards=lines(CANON);q={r['legacyId']:r for r in lines(QUAL)};variants=lines(VAR)
    families=read(FAMILY)['families'];by_id={c['identity']['legacyId']:c for c in cards}
    assert len(cards)==len(by_id)==920 and len(variants)==2425
    plan_rows,cohorts=calendar_occurrences(); mentions,contexts,v19=references(cards,read(BUNDLE))
    byvariants=collections.defaultdict(list);bymentions=collections.defaultdict(list);usage=collections.defaultdict(collections.Counter)
    for r in variants:byvariants[r['legacyId']].append(r)
    for r in mentions:
        if r['legacyId']:bymentions[r['legacyId']].append(r['occurrenceId'])
    for r in plan_rows:usage[r['legacyId']][r['cohort']]+=1
    rows=[]
    for c in cards:
        id=c['identity']['legacyId'];p=c['prescription'];members=route(c,families)
        rows.append({'schemaVersion':'tfcl-workout-family-mapping-1.0.0','legacyId':id,'canonicalKey':c['identity']['canonicalKey'],
          'source':{'canonicalFile':CANON,'ordinal':c['identity']['ordinal'],'provenance':c['provenance'],
                    'raw':c['original']['raw'],'effective':c['original']['effective']},
          'historicalObjective':p['objective'],'explicitPhysiology':p['physiology'],
          'rawPhysiologyPresent':bool(c['original']['raw'].get('physiology')),
          'memberships':members,'classificationUnresolved':not bool(members),
          'plausibilityAssessment':'hypotheses_to_research_not_scientifically_qualified',
          'sourceStructureSha256':digest(p['structure']),
          'doseParameters':{'declaredDuration':p['durationMinutes'],'durationByPhase':p['durationByPhase'],
              'sourceStructure':p['structure'],'individualizable':p['parameters'],'doctrineDomains':p['doctrineDomains'],
              'muscular':p['muscular'],'terrain':p['terrain'],'reassessment':p['reassessment']},
          'constraints':p['restrictions'],'unknowns':c['conversion']['unknowns'],
          'variants':byvariants[id],'sourceReferenceMentions':p['references'],'referenceOccurrenceIds':bymentions[id],
          'inheritedQualification':q[id],'usageByCohort':dict(usage[id]),
          'evidenceAttachments':[],'scientificallyValidated':False,'automaticPromotion':False,'prescriptionChanged':False})
    family_stats=[]
    for f in families:
        ids=[r['legacyId']for r in rows if any(m['familyId']==f['id']for m in r['memberships'])];ss=set(ids)
        target_ids=[r['legacyId']for r in rows if any(m['familyId']==f['id']and m['declaredTarget']for m in r['memberships'])]
        counts={k:sum(usage[id][k]for id in ids)for k in sorted({x['cohort']for x in cohorts})}
        counts_ids={k:len({x['legacyId']for x in plan_rows if x['cohort']==k and x['legacyId']in ss})for k in counts}
        family_stats.append({**f,'ids':ids,'workoutCount':len(ids),'sports':dict(collections.Counter(by_id[id]['prescription']['discipline']for id in ids)),
            'declaredTargetIds':target_ids,'declaredTargetCount':len(target_ids),
            'usageOccurrences':counts,'usedDistinctIds':counts_ids,
            'targetUsageOccurrences':{k:sum(usage[id][k]for id in target_ids)for k in counts},
            'rankingMetric':sum(usage[id]['v2_historical_complete_plans']for id in target_ids),
            'countingWarning':'overlapping families and comparative synthetic plans; counts not independent athletes or efficacy'})
    # Rank mechanisms, not overlapping sport/context labels; contexts kept as cross-cutting review needs.
    ranked=sorted([f for f in family_stats if f['axis']=='mechanism'],key=lambda f:(-f['rankingMetric'],-f['usedDistinctIds'].get('v14_native_primary',0),f['id']))
    unknown_usage=[r for r in plan_rows if r['legacyId']not in by_id]
    summary={'version':'det-v21a-research-preparation-1','baseline':'f295567769af8edc558a24313fd2faa2756cc498',
      'workouts':len(rows),'uniqueIds':len(by_id),'variants':len(variants),'variantClassification':dict(collections.Counter(v['classification']for v in variants)),
      'sports':dict(collections.Counter(c['prescription']['discipline']for c in cards)),
      'rawPhysiology':sum(r['rawPhysiologyPresent']for r in rows),'effectivePhysiology':sum(r['explicitPhysiology']is not None for r in rows),
      'familyMemberships':sum(len(r['memberships'])for r in rows),'unresolvedIds':[r['legacyId']for r in rows if r['classificationUnresolved']],
      'referenceOccurrences':dict(collections.Counter(r['scope']for r in mentions)),
      'mentionStatus':dict(collections.Counter(r['status']for r in mentions)),
      'contextReferenceRecords':len(contexts),'uniqueContextUrls':len({x['originalRecord']['url']for x in contexts}),
      'sourceBundleFiles':len(read(BUNDLE)['files']),
      'primaryImpactCohort':'v2_historical_complete_plans','cohorts':cohorts,'top5Mechanisms':[f['id']for f in ranked[:5]],
      'usageUnknownIds':unknown_usage,'newScientificReviews':0,'newEvidenceLinks':0,'scientificPromotions':0,'doseChanges':0,
      'notAnAthletePopulationSample':True,'historical600Reexecuted':False,'nolioCalls':0}
    def put(name,v):
        target=out/name
        if name.endswith('.jsonl'):target.write_text(''.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n'for r in v))
        else:target.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
    put('WORKOUT_FAMILY_MAPPING.jsonl',rows);put('family-definitions-and-impact.json',family_stats)
    put('REFERENCE_OCCURRENCES.jsonl',mentions);put('existing-reference-contexts.json',contexts)
    put('v19-documentary-context-preserved.json',v19);put('PLAN_USAGE.jsonl',plan_rows)
    put('summary.json',summary)
    sourcepaths=[CANON,QUAL,VAR,BUNDLE,V14,HIST,str(FAMILY),'docs/det-engine/v8/bibliography.json',
      'docs/det-engine/v17/evidence/scientific-retrieval.json','docs/det-engine/v19/cycle-1/evidence/science-1/documentary-context.json']+[c['source']for c in cohorts]
    put('input-checksums.json',{p:session.sha(pathlib.Path(p).read_bytes())for p in sorted(set(sourcepaths))})
    print(json.dumps({k:v for k,v in summary.items()if k not in ['cohorts','usageUnknownIds','unresolvedIds']},ensure_ascii=False))
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('out');build(ap.parse_args().out)
