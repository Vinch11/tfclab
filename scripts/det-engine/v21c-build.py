"""Protocol comparisons and audit artifacts; never writes to existing workouts or viewers."""
import collections,csv,gzip,importlib.util,io,json,pathlib,sys,xml.etree.ElementTree as ET
HERE=pathlib.Path(__file__).parent
def module(n):
    s=importlib.util.spec_from_file_location(n,HERE/(n+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
S=module('v21c-session');G=module('v21c-evidence');R=S.ROOT
V19='docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz'
V20='docs/det-engine/v20/evidence/validation-2/build/review/scientific-review.jsonl.gz'
MAP='docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl'
def lines(p):
    with gzip.open(p,'rt')if str(p).endswith('.gz')else open(p)as f:return[json.loads(l)for l in f if l.strip()]
def snap(v):return S.sha(json.dumps(v,ensure_ascii=False,separators=(',',':')).encode())
def csvwrite(out,name,rows):
    text=io.StringIO();w=csv.DictWriter(text,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader()
    for r in rows:w.writerow({k:json.dumps(v,ensure_ascii=False,separators=(',',':'))if isinstance(v,(dict,list))else v for k,v in r.items()})
    (out/name).write_text(text.getvalue())
def jsonl(out,name,rows):
    (out/name).write_text(''.join(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n'for x in rows))
def xml_identity(raw):
    a=ET.fromstring(raw);assert a.tag=='article'and a.find('body')is not None
    ids={x.attrib.get('pub-id-type'):''.join(x.itertext())for x in a.findall('front/article-meta/article-id')}
    return {'pmid':ids.get('pmid'),'pmcid':ids.get('pmcid'),'doi':ids.get('doi'),
      'title':' '.join(a.find('front/article-meta/title-group/article-title').itertext()),'xmlTables':len(a.findall('.//table-wrap'))}
def registry(config):
    accesses=[a for d in sorted((R/'evidence').glob('retrieval-*'))if(d/'access.json').is_file()for a in S.load(d/'access.json')]
    by={a['key']:a for a in accesses};rows=[];details={}
    for s in config['studies']+config['partialOrUnreviewedFullTexts']:
        a=by[s['key']];raw=gzip.decompress(pathlib.Path(a['artifact']).read_bytes());assert S.sha(raw)==a['responseSha256'];identity=xml_identity(raw)
        full=s['review']=='full_main_text_and_xml_tables_examined'
        row={'studyKey':s['key'],'pmid':identity['pmid'],'pmcid':identity['pmcid'],'doi':identity['doi'],
          'title':identity['title'],'studyType':s.get('scope','context_not_fully_reviewed'),'access':s['review'],
          'url':a['url'],'retrievedAt':a['retrievedAt'],'artifactSha256':a['responseSha256'],'artifact':a['artifact'],
          'fullMainTextReviewed':full,'xmlTableCount':identity['xmlTables'],'population':s.get('population','not newly extracted'),
          'work':s.get('work','not newly extracted'),'recovery':s.get('recovery','not newly extracted'),
          'intensityAnchor':s.get('intensityAnchor','not newly extracted'),'frequency':s.get('frequency','not newly extracted'),
          'protocolComplete':s.get('protocolCompleteForReportedContrast',False),'limits':s.get('limits',s.get('limit',''))}
        rows.append(row);details[s['key']]={**row,'manualReviewUnchanged':s,'sourceAccessRecord':a}
    old=S.load('docs/det-engine/v21b/FAMILY_KNOWLEDGE_BASE.json');old_refs={r['referenceId']:r for r in old['referenceRegistry']}
    for key,id in [('posture_primary_publisher','IM-03'),('swim_primary_publisher','SWIM-01')]:
        a=by[key];oldref=old_refs[id];identity=oldref['retrievedIdentity'];row={'studyKey':key,'pmid':identity['id'],'pmcid':None,'doi':identity['doi'],'title':identity['title'],
          'studyType':'primary_abstract_only','access':'publisher_403_prior_abstract_only'if key.startswith('posture')else'metadata_response_not_full_text_prior_abstract_only',
          'url':a['url'],'retrievedAt':a.get('retrievedAt',a['attemptedAt']),'artifactSha256':a.get('responseSha256'),
          'artifact':a.get('artifact'),'fullMainTextReviewed':False,'xmlTableCount':0,
          'population':'not verified from a complete primary protocol; prior abstract context only','work':'full protocol not reviewed',
          'recovery':'unverified','intensityAnchor':'unverified_full_protocol','frequency':'unverified','protocolComplete':False,
          'limits':'HTTP 200 on DOI resolution was JSON metadata, not the article.'if key.startswith('swim')else'403 access denial; no bypass or paid access.'}
        rows.append(row);details[key]={**row,'sourceAccessRecord':a,'priorAbstractRecordUnchanged':oldref}
    a=by['seiler_primary_search'];raw=gzip.decompress(pathlib.Path(a['artifact']).read_bytes());p=json.loads(raw)['resultList']['result'][0];assert p['id']=='21812820'
    spec=config['abstractOnlyAdditionalStudies'][0];row={'studyKey':spec['key'],'pmid':p['id'],'pmcid':p.get('pmcid'),'doi':p.get('doi'),'title':p['title'],'studyType':'primary_abstract_only',
      'access':spec['review'],'url':a['url'],'retrievedAt':a['retrievedAt'],'artifactSha256':a['responseSha256'],'artifact':a['artifact'],'fullMainTextReviewed':False,'xmlTableCount':0,
      'population':spec['population'],'work':spec['work'],'recovery':spec['rest'],'intensityAnchor':'maximal_tolerable_intensity_not_fixed_FTP_recovery','frequency':'2/week for 7 weeks per abstract','protocolComplete':False,'limits':spec['scope']}
    rows.append(row);details[spec['key']]={**row,'manualReviewUnchanged':spec,'sourceAccessRecord':a,'actualMetadataRecord':p}
    return rows,details,by
def build(out):
    S.guard();S.preserve();out=pathlib.Path(out);assert not out.exists()and out.resolve().is_relative_to((R/'evidence').resolve());out.mkdir()
    config=S.load(HERE/'v21c-studies.json');reg,studies,access=registry(config)
    source={r['legacyId']:r for r in lines(MAP)};raw=lines(V19);candidates={c['candidateKey']:c for r in raw for c in r['candidates']}
    scientific=lines(V20);assert len(scientific)==96 and len({s['legacyId']for s in scientific})==51
    comparisons=[];dossiers=[]
    specs=config['studies']+config['abstractOnlyAdditionalStudies']
    for id in dict.fromkeys(s['legacyId']for s in scientific):
        m=source[id];ss=[s for s in scientific if s['legacyId']==id]
        targets=[s for s in specs if id in s.get('targetIds',[])]
        history=m['usageByCohort'];priority={'historicalOccurrences':history.get('v2_historical_complete_plans',0),
          'otherArchivedUsage':{k:v for k,v in history.items()if k!='v2_historical_complete_plans'},
          'notIndependentAthletesOrScientificImportance':True}
        ds={'legacyId':id,'sourceEffectiveSha256':m['source']['provenance']['effectiveContentSha256'],'sourceStructureSha256':m['sourceStructureSha256'],
          'sourceEffectiveUnchanged':m['source']['effective'],'sourceConstraintsUnchanged':m['constraints'],'variantsUnchanged':m['variants'],
          'historicalUse':priority,'newPrimaryProtocolsTargeted':[s['key']for s in targets if s.get('scope')=='primary'],
          'sourceIntentionNotScientificallyApproved':m['historicalObjective'],'candidates':[],'individualAdmissibility':'not_assessed_not_approved'}
        for old in ss:
            c=candidates[old['candidateKey']];h=snap(c)
            ds['candidates'].append({'candidateKey':c['candidateKey'],'candidateSnapshotSha256':h,'candidateUnchanged':c,
              'v20ReviewUnchanged':old,'doseStatus':'dose_not_individually_verified'})
            ledger=old['exactCandidateDose']['descriptiveLedger'];assignment=old['exactCandidateDose']['assignment']
            main_indices={i for i,p in enumerate(m['source']['effective']['structure'])if p['part'].lower()not in ['warm-up','cool-down']}
            counts=[a['repetitions']for a in assignment if 'repetitions'in a and a['partIndex']in main_indices]
            durations=[r['seconds']for r in ledger['rows']if r['source']['partIndex']in main_indices and not r['recovery']]
            target_refs=targets or [None]
            if id=='C_IM_AERO_HOLD':target_refs=target_refs+[{'key':'posture_primary_publisher'}]
            for t in target_refs:
                s=studies[t['key']]if t else None;spec=s.get('manualReviewUnchanged',{})if s else{}
                full=s is not None and s['fullMainTextReviewed']and s['studyType']=='primary'
                checks={k:None for k in G.MATCHES}
                if full:
                    checks['same_sport']=m['source']['effective']['sportKey']==('cyclisme'if spec['sport']=='bike'else'course')
                    checks['work_matches']=bool(durations)and set(durations)=={spec['workSeconds']}
                    checks['repetitions_match']=counts==[spec['repetitions']]
                    checks['full_session_matches']=False  # Explicitly different warm-up/session or fitting intervention, documented in the review.
                if any(e.get('rule')=='explicit_editorial_final_recovery'for e in c['changes']):checks['source_final_rest_known']=False
                # Domains and athlete capacity are not inferred from matching numeric durations.
                verdict='conclusive_not_same_protocol'if full else'inconclusive_missing_full_or_targeted_protocol'
                support=(spec.get('outcomes')or spec.get('outcomes','Only the source-specific abstract context is available.'))if s else'No adequate primary protocol selected; no evidence attribution made.'
                crit=''
                if full:
                    crit=('Full source compared: '+spec['reasonForTargets']+' Differences: '+spec['limits']+
                      ' Matching a repetition or duration does not equate its intensity anchor, recovery, full session or population.')
                record={'workoutId':id,'candidateKey':c['candidateKey'],'sourceHash':m['source']['provenance']['effectiveContentSha256'],
                  'sourceRecipeHash':c['sourceRecipeHash'],'candidateHash':h,'candidateHashDefinition':'SHA256 compact UTF-8 JSON of complete unchanged V19 candidate, preserving key order',
                  'studyKey':s['studyKey']if s else'','PMID':s['pmid']if s else'','DOI':s['doi']if s else'',
                  'access':s['access']if s else'no_targeted_primary_protocol','studyScope':s['studyType']if s else'none',
                  'studyDesign':spec.get('design','not established from full protocol'),
                  'artifactHash':s['artifactSha256']if s else None,'artifact':s['artifact']if s else None,
                  'sourceSport':{'cyclisme':'bike','course':'run','running':'run'}.get(m['source']['effective']['sportKey'],m['source']['effective']['sportKey']),
                  'studySport':spec.get('sport'),
                  'sourceIntensityAnchor':None, # Preserve missing individual anchor; puissance/allure is not FTP/MAS by itself.
                  'comparability':'whole protocol demonstrably different'if full else'not established without an adequate complete primary protocol',
                  'sourceWork':[p for p in m['source']['effective']['structure']if p['part'].lower()not in ['warm-up','cool-down']],
                  'candidateWorkSeconds':durations,'candidateRepetitionCounts':counts,
                  'candidateTotalSecondsUnchanged':old['exactCandidateDose']['seconds'],
                  'sourceRecoveryConventionsUnchanged':old['conventions'],'sourceIntensityUnknownsUnchanged':old['intensityUnknowns'],
                  'sourceIntensityAnchorVerbatim':{'metricKey':m['source']['effective']['metricKey'],
                    'sourceZonesAndInstructions':m['source']['effective']['structure'],'individualAnchorNotSupplied':True},
                  'studyWork':s['work']if s else'not established','studyRest':s['recovery']if s else'not established',
                  'studyIntensityAnchor':s['intensityAnchor']if s else'not established','population':s['population']if s else'not established',
                  'studyFrequency':s['frequency']if s else'not established','checks':checks,'comparisonStatus':verdict,
                  'supportableClaim':support,'unsupportedClaims':['exact TFCL recipe dose','optimal individual dose','automatic final-rest choice','automatic cross-sport or anchor transfer'],
                  'contraindicationsUnchanged':m['constraints'],'additionalIndividualData':old['requiredEvidence'],
                  'criticalJustification':crit,'provenanceVerified':bool(s and s['artifactSha256']),
                  'protocolComplete':spec.get('protocolCompleteForReportedContrast',False),
                  'studyHorizon':'acute'if spec.get('design','').startswith('acute')else'chronic_or_other',
                  'individualAdmissibility':'not_assessed_not_approved','expertHumanReview':False}
                record['exactDoseGate']=G.evaluate(record,{'scope':'exact_recipe_dose','effectHorizon':None,'sourceFinalRestAssumption':None});assert not record['exactDoseGate']['literatureClaimCandidateAllowed']
                comparisons.append(record)
        dossiers.append(ds)
    # Retain the six original discrepancies and provide separate actual identities, never overwrite input.
    kb=S.load('docs/det-engine/v21b/FAMILY_KNOWLEDGE_BASE.json');corrective=[]
    for ref in kb['referenceRegistry']:
        for issue in ref['discrepancies']:
            corrective.append({'v21bDiscrepancyUnchanged':issue,'providedReferenceUnchanged':ref['providedRecordUnchanged'],
              'verifiedCorrectiveIdentity':ref['retrievedIdentity'],'verificationProvenanceUnchanged':ref['localVerification'],
              'originalRewritten':False,'newLiveRetrievalClaimed':False})
    assert len(corrective)==6
    csvwrite(out,'PRIMARY_STUDY_REGISTER.csv',reg);csvwrite(out,'EXACT_PROTOCOL_COMPARISONS.csv',comparisons)
    jsonl(out,'candidate-comparisons.jsonl',comparisons);jsonl(out,'source-id-dossiers.jsonl',dossiers)
    S.save(out/'study-registry.json',studies);S.save(out/'IDENTITY_CORRECTIVE_REGISTER.json',corrective);S.save(out/'RELAY_IDENTIFIER_DISAGREEMENTS.json',config['aliases'])
    (out/'EXACT_DOSE_ATTACHMENTS.jsonl').write_text('')
    full=[s for s in reg if s['fullMainTextReviewed']];conclusive=[r for r in comparisons if r['comparisonStatus']=='conclusive_not_same_protocol']
    summary={'status':'DRAFT_NO_GO','fullTextsMainTextExamined':len(full),'primaryFullTextsExamined':sum(s['studyType']=='primary'for s in full),
      'fullXmlRetrieved':sum(s['xmlTableCount']>0 for s in reg),'registryEntries':len(reg),'workoutIdsDossiered':len(dossiers),
      'candidateChronologiesPreserved':len(scientific),'workoutIdsWithPrimaryFullProtocolComparison':len({r['workoutId']for r in conclusive}),
      'comparisonRows':len(comparisons),'conclusiveNonEquivalent':len(conclusive),'inconclusive':len(comparisons)-len(conclusive),
      'distinctCandidatesWithPrimaryComparison':len({r['candidateKey']for r in conclusive}),
      'provenanceVerifiedPrimaryComparisonLinks':len(conclusive),'newExactDoseAttachments':0,'individualDoseApprovals':0,
      'newSportingHumanReviews':0,'priorV21bDraftContextPacketsPreserved':2,'libraryCoverageNotExpanded':True,
      'referenceDiscrepanciesPreserved':6,'relayIdentifierCollisions':len(config['aliases'])}
    S.save(out/'summary.json',summary)
    inputs=[V19,V20,MAP,str(HERE/'v21c-studies.json'),'docs/det-engine/v21b/FAMILY_KNOWLEDGE_BASE.json']
    S.save(out/'input-checksums.json',{p:S.sha(pathlib.Path(p).read_bytes())for p in inputs});print(json.dumps(summary))
if __name__=='__main__':build(sys.argv[1])
