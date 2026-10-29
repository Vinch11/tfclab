"""Offline, deterministic V21B documentary integration on top of immutable V21A."""
import collections,csv,gzip,importlib.util,json,pathlib,re,sys
HERE=pathlib.Path(__file__).parent
def module(name):
    s=importlib.util.spec_from_file_location(name,HERE/(name+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
S=module('v21b-session');D=module('v21b-documentary');ROOT=S.ROOT;INPUT=ROOT/'input'
MAPPING='docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl'
SCIENCE='docs/det-engine/v20/evidence/validation-2/build/review/scientific-review.jsonl.gz'
COACH='docs/det-engine/v16/evidence/final/coach-renders.jsonl.gz'
COACH_V19='docs/det-engine/v19/cycle-2/coach-library.html'
NOLIO='docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz'
IRONMAN='docs/det-engine/v20/evidence/validation-2/build/ironman/results.json'
def lines(p):
    with gzip.open(p,'rt')if str(p).endswith('.gz')else open(p)as f:return[json.loads(l)for l in f if l.strip()]
def pointer(obj,p):
    for k in p.split('/')[1:]:obj=obj[int(k)]if isinstance(obj,list)else obj[k.replace('~1','/').replace('~0','~')]
    return obj
def write(out,name,value):
    p=out/name;assert not p.exists()
    if name.endswith('.jsonl')or name.endswith('.jsonl.gz'):
        data=(''.join(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n'for r in value)).encode()
        p.write_bytes(gzip.compress(data,mtime=0)if name.endswith('.gz')else data)
    elif isinstance(value,bytes):p.write_bytes(value)
    else:p.write_text(value if isinstance(value,str)else json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def reference_registry(refs,actual,provenance,review):
    result=[]
    for r in refs:
        a=actual[r['pmid']];issues=[i for i in review['referenceDiscrepancies']if i['referenceId']==r['reference_id']]
        assert not r['doi']or r['doi'].lower()==a.get('doi','').lower(),r['reference_id']
        read_abstract=r['reference_id']in review['abstractReadReferenceIds'];assert not read_abstract or a.get('abstractText')
        result.append({'referenceId':r['reference_id'],'providedRecordUnchanged':r,
          'retrievedIdentity':{k:a.get(k)for k in ['id','source','title','authorString','doi','pubYear','electronicPublicationDate','firstPublicationDate','pubTypeList','journalInfo']},
          'localVerification':{'status':'abstract_reviewed'if read_abstract else 'metadata_verified',
              'reviewer':review['role'],'retrievalUrl':provenance['retrievalUrl'],'retrievedAt':provenance['retrievedAt'],
              'responseSha256':provenance['responseSha256'],'responseLocator':{'medPmid':a['id']},
              'rawResponseFile':str(ROOT/'evidence/public-source-retrieval/response.json.gz'),
              'fullTextReviewed':False,'articleEfficacyOrDoseApproved':False},
          'discrepancies':issues,'suppliedCitationQuarantined':any(i['code']in ['WRONG_PROVIDED_AUTHORS','UNSUPPORTED_PROVIDED_YEAR']for i in issues),
          'suppliedJournalRowQuarantined':any(i['code']=='HANDOFF_JOURNAL_STUDY_TYPE_CONFLICT'for i in issues),
          'potentialCorrectedIdentityOnly':bool(issues),'workoutAttributions':[],
          'certainty':'not_independently_formally_graded'})
    return result
def build(out):
    S.guard();S.preserve();out=pathlib.Path(out)
    assert out.resolve().is_relative_to((ROOT/'evidence').resolve())and not out.exists();out.mkdir(parents=True)
    mapping=lines(MAPPING);by={r['legacyId']:r for r in mapping};assert len(by)==len(mapping)==920
    raw_response=gzip.decompress((ROOT/'evidence/public-source-retrieval/response.json.gz').read_bytes())
    actual={p['id']:p for p in json.loads(raw_response)['resultList']['result']};prov=S.load(ROOT/'evidence/public-source-retrieval/provenance.json');assert S.sha(raw_response)==prov['responseSha256']
    refs=S.load(INPUT/'references_verifiees.json');review=S.load(HERE/'v21b-review-decisions.json')
    registry=reference_registry(refs,actual,prov,review);ref_by={r['referenceId']:r for r in registry}
    families=S.load(INPUT/'mecanismes_15_familles.json')['families'];family_by={f['familyId']:f for f in families};assert len(family_by)==15
    assert set(family_by)=={f['id']for f in S.load('docs/det-engine/v21a/evidence/accepted/family-definitions-and-impact.json')}
    assertions=lines(INPUT/'assertions_familiales_non_liees.jsonl');questions=S.load(INPUT/'REPONSES_62_QUESTIONS_V21A.json')['items']
    oldq={q['questionId']:q for q in S.load('docs/det-engine/v21a/RESEARCH_QUESTIONS.json')};assert set(oldq)=={q['questionId']for q in questions}
    with (INPUT/'protocoles_et_doses_etudies.csv').open()as f:protocols=list(csv.DictReader(f))
    kb_families=[]
    for f in families:
        qs=[q for q in questions if q['familyId']==f['familyId']]
        kb_families.append({'familyId':f['familyId'],'providedFamilyUnchanged':f,
          'studiedAdaptationsAndProposedMechanisms':f['scientificContextClaims'],
          'reportedFindings':[{'referenceId':id,'providedFinding':ref_by[id]['providedRecordUnchanged']['key_finding'],
            'verification':ref_by[id]['localVerification']['status'],'notAWorkoutFinding':True}for id in f['referenceIds']],
          'studiedProtocols':[p for p in protocols if p['familyId']==f['familyId']or p['reference_id']in f['referenceIds']],
          'populations':[{'referenceId':p['reference_id'],'populationAsProvided':p['population_from_source']}for p in protocols if p['familyId']==f['familyId']or p['reference_id']in f['referenceIds']],
          'limitsAndContradictions':[{'referenceId':id,'providedTransferLimits':ref_by[id]['providedRecordUnchanged']['transfer_limits'],
              'documentaryCautions':[i['detail']for i in review['protocolCautions']if i['referenceId']==id],
              'identityDiscrepancies':ref_by[id]['discrepancies']}for id in f['referenceIds']],
          'conditionsOfApplication':f['auditActions'],'individualDataNeeded':f['individualDataNeeded'],
          'openScientificQuestions':[{'originalQuestion':oldq[q['questionId']],'providedResponseUnchanged':q,
              'closed':False}for q in qs],
          'prohibitedInferences':f['disallowedAutomaticClaims'],'status':'documentary_family_context_only',
          'hypoxiaEvidenceCovered':False if f['familyId']=='heat_hypoxia'else None,
          'exactRecipeDoseEstablished':False,'automaticPromotion':False})
    kb={'schemaVersion':'tfcl-documentary-knowledge-v21b-1.0.0','baseline':S.load(ROOT/'state.json')['baseline'],
      'families':kb_families,'referenceRegistry':registry,'unboundAssertionsUnchanged':assertions,
      'crossCuttingQuestionResponses':[{'originalQuestion':oldq[q['questionId']],'providedResponseUnchanged':q,'closed':False}for q in questions if q['familyId']is None],
      'unlinkedReferenceIds':sorted(set(ref_by)-{id for f in families for id in f['referenceIds']}),
      'coachingPrinciples':{'source':str(INPUT/'PRINCIPES_COACHING_LORANG.md'),'sha256':S.sha((INPUT/'PRINCIPES_COACHING_LORANG.md').read_bytes()),
        'kind':'documented_coaching_principles_not_experimental_efficacy','localShownotesRetrievalPerformed':False,
        'suppliedAccessClaimPreservedNotNewlyVerified':True,'authorMethodIsNotUniversalQuota':True},
      'automaticPromotion':False,'individualAthleteApproved':False}
    routed=[];gaps=[]
    for row in mapping:
        routes=[]
        for m in row['memberships']:
            fam=family_by[m['familyId']];support=D.content_support(m);eligible=bool(support)
            routes.append({'familyId':m['familyId'],'sourceMembershipUnchanged':m,
              'mechanismCandidate':fam['scientificContextClaims'],'nonTitleSourceSupport':support,
              'potentialReferenceIds':fam['referenceIds']if eligible else [],
              'referenceRole':'potential_family_context_only_not_workout_attribution',
              'status':'family_context_for_research'if eligible else 'title_tags_or_goal_scope_only_needs_content_review',
              'individualDataNeeded':fam['individualDataNeeded'],'unresolvedDose':fam['doseEvidenceLimit'],
              'evidenceAttached':False,'workoutMechanismVerified':False})
            if not eligible:gaps.append({'scope':'route','id':row['legacyId'],'family':m['familyId'],'code':'NO_NON_TITLE_CONTENT_SUPPORT','detail':'Existing V21A routing retained, but no reference pointer attached on title/tags/goal alone.'})
        routed.append({'schemaVersion':'tfcl-workout-research-routing-v21b-1.0.0','legacyId':row['legacyId'],
          'v21aRecordUnchanged':row,'routes':routes,'unresolvedIntent':row['classificationUnresolved'],
          'reviewStatus':'unresolved_intent'if row['classificationUnresolved']else 'context_routed_not_workout_reviewed',
          'doseStatus':'dose_not_individually_verified','actualIndividualProfile':None,
          'workoutEvidenceAttachments':[],'scientificallyValidated':False,'prescriptionChanged':False})
        if row['classificationUnresolved']:gaps.append({'scope':'workout','id':row['legacyId'],'family':'','code':'UNRESOLVED_INTENT_PRESERVED','detail':'No mechanism inferred from the negative-split title or recipe construction.'})
    route_by={r['legacyId']:r for r in routed};science=lines(SCIENCE);assert len(science)==96 and len({x['legacyId']for x in science})==51
    candidate_reviews=[]
    for s in science:
        row=by[s['legacyId']];rs=route_by[s['legacyId']]['routes'];case=next((c for c in review['targetedCases']if c['legacyId']==s['legacyId']),None)
        candidate_reviews.append({'schemaVersion':'tfcl-candidate-documentary-triage-v21b-1.0.0','candidateKey':s['candidateKey'],
          'legacyId':s['legacyId'],'archivedV20ReviewUnchanged':s,'declaredIntention':s['sourceClaim'],'sourceContext':row['source'],
          'candidateMechanisms':[{'familyId':r['familyId'],'mechanismQuestions':r['mechanismCandidate'],
              'potentialReferences':r['potentialReferenceIds'],'scope':r['referenceRole']}for r in rs],
          'supportedAtLiteratureLevel':'Family context and extracted studies; no automatic support for this exact candidate dose.',
          'potentialFamilyFindingsNotCandidateProof':[{'familyId':r['familyId'],
            'claimsToCompare':family_by[r['familyId']]['scientificContextClaims'],
            'protocolRowsToCompare':[p for p in protocols if p['reference_id']in r['potentialReferenceIds']],
            'limitations':family_by[r['familyId']]['doseEvidenceLimit'],
            'mechanismTransferStatus':'not_reviewed_for_this_candidate_except_explicit_targeted_case'}for r in rs if r['potentialReferenceIds']],
          'conventionalDoseParameters':s['conventions'],'exactCandidateDoseUnchanged':s['exactCandidateDose'],
          'unresolvedIntensity':s['intensityUnknowns'],'sourceRestrictionsUnchanged':row['constraints'],
          'individualDataNeeded':sorted({x for r in rs for x in r['individualDataNeeded']}),
          'uncertainties':s['requiredEvidence'],'targetedDocumentaryComparison':case,
          'doseStatus':'dose_not_individually_verified','reviewStatus':'ready_for_documentary_review_not_approved',
          'expertReview':False,'automaticPromotion':False,'individualAthleteApproved':False})
        gaps.append({'scope':'candidate','id':s['candidateKey'],'family':'','code':'DOSE_NOT_INDIVIDUALLY_VERIFIED','detail':'No exact recipe/population/response or individual admissibility is established; all V20 unknowns remain.'})
    packets=[];case_comparisons=[]
    for case in review['targetedCases']:
        row=by[case['legacyId']];ref=ref_by[case['referenceId']];a=actual[case['referencePmid']]
        assert ref['providedRecordUnchanged']['pmid']==case['referencePmid']
        source_compare={'caseUnchanged':case,'sourceEffectiveSha256':row['source']['provenance']['effectiveContentSha256'],
            'sourceRecipeSha256':row['sourceStructureSha256'],'actualSourceExcerpts':[{'pointer':p,'text':pointer({'original':{'effective':row['source']['effective']}},p)}for p in case['sourceReadPointers']],
            'candidateTimelines':[{'candidateKey':c['candidateKey'],'dose':c['exactCandidateDoseUnchanged']}for c in candidate_reviews if c['legacyId']==case['legacyId']],
            'actualReferenceIdentity':ref['retrievedIdentity'],'provenance':ref['localVerification'],
            'exactDoseMatched':False,'individualApproval':False}
        p={'schemaVersion':'tfcl-evidence-attachment-1.0.0','packetId':'V21B-CONTEXT-'+case['legacyId']+'-'+case['referenceId'],
          'binding':{'legacyId':case['legacyId'],'sourceEffectiveSha256':row['source']['provenance']['effectiveContentSha256'],
            'familyId':case['familyId'],'variantGoal':None,'variantSourceHash':None,'recipeContentSha256':None},
          'claim':{'text':case['claim'],'scope':'family_context','origin':'scientific_publication','finding':case['finding']},
          'reference':{'title':a['title'],'authors':a.get('authorString'),'year':int(a['pubYear']),'doi':a.get('doi'),
            'pmid':a['id'],'url':'https://pubmed.ncbi.nlm.nih.gov/'+a['id']+'/','referenceKind':'publication'},
          'verification':{'status':'abstract_reviewed','retrievalUrl':prov['retrievalUrl'],'responseSha256':prov['responseSha256'],
            'accessedAt':prov['retrievedAt'],'reviewer':review['role'],
            'accessLimits':['Public abstract via Europe PMC; no full text reviewed.','The hash covers the actual shared 46-record response; citation is located by PMID.','Not qualified human coach review.']},
          'evidenceAssessment':{'studyDesign':ref['providedRecordUnchanged']['kind'],'certaintyFramework':None,'certaintyJudgment':None,
            'rationale':'Documentary family context only; no formal certainty grading or individual dose validation.','assessedBy':review['role']},
          'applicability':{'population':case['comparison']['studyPopulation'],'intervention':case['comparison']['studyProtocol'],
            'comparator':case['comparison']['studyComparator'],'outcomes':[case['comparison']['studyResults']],
            'limitations':[case['comparison']['differences'],ref['providedRecordUnchanged']['transfer_limits']],
            'directness':'context_only','doseAndRecoveryCompared':False,'individualDataNeeded':case['comparison']['individualDataMissing']},
          'review':{'status':'draft','reviewer':review['role'],'decisionRationale':'Proposed for documentary review only; source and protocol differences explicitly retained.','individualAthleteApproved':False},
          'supersedesPacketId':None,'prescriptionImpact':'none_research_annotation_only','automaticPromotion':False}
        source_compare['packetValidation']=D.validate_candidate(p,row,raw_response,prov,case);case_comparisons.append(source_compare);packets.append(p)
    for r in registry:
        for issue in r['discrepancies']:gaps.append({'scope':'reference','id':r['referenceId'],'family':'','code':issue['code'],'detail':issue['detail']})
    gaps.extend([{'scope':'family','id':'heat_hypoxia','family':'heat_hypoxia','code':'HYPOXIA_NOT_COVERED','detail':'Supplied references cover heat/hydration, not a qualified hypoxia protocol.'},
      {'scope':'safety','id':'B_LCW_NUTRITION_RECHARGE','family':'nutrition','code':'LCW_UNIT_QUARANTINE_RETAINED','detail':'No replacement quantity for +500 mL/h de sommeil.'}])
    # Preserve both canonical text and latest archived documentary/modal additions.
    html=pathlib.Path(COACH_V19).read_text();embedded=re.search(r'<script type="application/json" id="records">([\s\S]*?)</script>',html)
    assert embedded;prior_views=json.loads(embedded.group(1));assert len(prior_views)==920
    prior_by={v['id']:v for v in prior_views};assert len(prior_by)==920
    coaches=[]
    for c in lines(COACH):
        row=by[c['id']];prior=prior_by[c['id']];rs=route_by[c['id']]['routes'];eligible=[r for r in rs if r['potentialReferenceIds']]
        context=('Adaptation recherchée, déclarée dans la source : '+row['historicalObjective']+'.\n'
          +'Mécanismes et contextes à examiner : '+('; '.join(family_by[r['familyId']]['label']for r in eligible)or 'intention à clarifier')+'.\n'
          +'Connaissances : contexte documentaire de famille, sans preuve de la dose exacte ni validation de cette séance.\n'
          +'Pertinence pour le profil : non établie ; références datées, limiteurs et tolérance doivent être confrontés à la recette.\n'
          +'Conditions et restrictions : '+str(row['constraints']['avoid'])+' ; placement : '+str(row['constraints']['when'])+'.\n'
          +'Refus ou maintien en attente : capacité, intensité, durée, récupération ou protocole non vérifiés ; aucune capacité inventée.\n'
          +'À vérifier : '+('; '.join(sorted({x for r in eligible for x in r['individualDataNeeded']}))or 'intention physiologique et données nécessaires')+'.')
        coaches.append({'id':c['id'],'historicalText':c['text'],'priorCoachText':prior['sourceCoach'],
          'archivedCandidateViewsUnchanged':prior['candidates'],'originalCoverageUnchanged':c['coverage'],
          'optionalScientificContext':context,'defaultText':D.render_coach(prior['sourceCoach'],context),
          'withOptionalContext':D.render_coach(prior['sourceCoach'],context,True),'bibliographySentToNolio':False})
    nolio=[]
    for n in lines(NOLIO):
        payload=D.nolio_unchanged_fixture(n['result']['payload'],'Optional scientific section deliberately not serialized.')
        assert payload==n['result']['payload'];nolio.append({'legacyId':n['legacyId'],'candidateKey':n['candidateKey'],
          'archivedPayloadUnchanged':payload,'bibliographyAdded':False,'realExportPermitted':False})
    im=S.load(IRONMAN);improof={'source':IRONMAN,'sourceSha256':S.sha(pathlib.Path(IRONMAN).read_bytes()),
       'baselinesUnchanged':[{'profile':p['profile'],'baseline':p['baseline']}for p in im['fullPlans']],
       'validatorsReexecuted':False,'historicalBlockersPreservedByByteIdentity':True,'actualApprovedPlan':None}
    assumptions={k:False for k in D.FORBIDDEN_ASSUMPTIONS};D.assert_assumptions(assumptions)
    summary={'version':'det-v21b-documentary-integration-1','status':'DRAFT_NO_GO','families':len(families),'referencesMetadataReverified':len(registry),
      'abstractsRead':len(review['abstractReadReferenceIds']),'fullTextsRead':0,'sourceWorkouts':920,'sourceVariants':sum(len(r['variants'])for r in mapping),
      'workoutsWithContentSupportedResearchContext':sum(any(r['potentialReferenceIds']for r in row['routes'])for row in routed),
      'unresolvedIntentIds':[r['legacyId']for r in routed if r['unresolvedIntent']],
      'titleOrScopeOnlyRoutesWithheld':sum(not r['potentialReferenceIds']for row in routed for r in row['routes']),
      'sourceDiscrepancies':len(review['referenceDiscrepancies']),'completeCandidatesTriaged':len(candidate_reviews),'candidateDistinctIds':len({s['legacyId']for s in science}),
      'documentaryPacketCandidates':len(packets),'packetScope':'family_context_only_draft_not_expert_approved','scientificApprovals':0,
      'workoutDosesNotIndividuallyVerified':920,'candidateDosesNotIndividuallyVerified':96,'questionsOpen':len(questions),
      'coachRendersPreserved':len(coaches),'priorEditorialCoachViewsPreserved':sum(len(v['candidates'])for v in prior_views),
      'nolioFixturesPreserved':len(nolio),'doseOrIntensityChanges':0,
      'assumptionGuards':len(D.FORBIDDEN_ASSUMPTIONS),'prohibitedAssumptionsNotAsserted':assumptions,'historical600Reexecuted':False,'nolioCalls':0}
    write(out,'FAMILY_KNOWLEDGE_BASE.json',kb);write(out,'WORKOUT_RESEARCH_ROUTING.jsonl',routed)
    write(out,'EVIDENCE_ATTACHMENT_CANDIDATES.jsonl',packets);write(out,'CANDIDATE_96_REVIEW.jsonl',candidate_reviews)
    write(out,'TARGETED_PROTOCOL_COMPARISONS.json',case_comparisons);write(out,'coach-renders-with-context.jsonl.gz',coaches)
    write(out,'nolio-unchanged-fixtures.jsonl.gz',nolio);write(out,'IRONMAN_BLOCKERS_PRESERVED.json',improof)
    import io
    text=io.StringIO();w=csv.DictWriter(text,fieldnames=['scope','id','family','code','detail'],lineterminator='\n');w.writeheader();w.writerows(gaps);write(out,'REJECTION_AND_GAPS.csv',text.getvalue())
    write(out,'summary.json',summary)
    inputs=[MAPPING,SCIENCE,COACH,COACH_V19,NOLIO,IRONMAN,'docs/det-engine/v21a/EVIDENCE_INTEGRATION_SCHEMA.json',
      str(HERE/'v21b-review-decisions.json'),str(ROOT/'evidence/public-source-retrieval/provenance.json'),str(ROOT/'evidence/public-source-retrieval/response.json.gz')]+[str(p)for p in sorted(INPUT.iterdir())if p.is_file()]
    write(out,'input-checksums.json',{p:S.sha(pathlib.Path(p).read_bytes())for p in inputs})
    print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':build(sys.argv[1])
