"""Experimental documentary contracts; never authorize a workout or mutate a dose."""
import copy,hashlib,importlib.util,pathlib
FORBIDDEN_ASSUMPTIONS=(
 'thresholds_interchangeable','field_vlamax_is_direct_lab_measurement','fresh_test_proves_durability',
 'crawl_css_applies_to_other_strokes','final_rest_assumed_present_or_absent',
 'aero_4x15_equivalent_to_6x10','nutrition_heat_posture_tolerance_assumed',
 'progression_just_because_week_elapsed')
def assert_assumptions(assumptions):
    if set(assumptions)!=set(FORBIDDEN_ASSUMPTIONS):raise ValueError('EXPLICIT_EIGHT_ASSUMPTIONS_REQUIRED')
    for key in FORBIDDEN_ASSUMPTIONS:
        if assumptions[key]is not False:raise ValueError('FORBIDDEN_UNSUPPORTED_INFERENCE:'+key)
    return True
def content_support(membership):
    return [b for b in membership['basis']if (
      '/structure/'in b['pointer']and b['pointer'].endswith('/text') or
      '/physiology/'in b['pointer'] or b['pointer']=='/prescription/discipline')]
def render_coach(historical_text,context,include_context=False):
    return historical_text+('\n\nPourquoi cette séance ? — Justification scientifique et limites\n'+context if include_context else '')
def nolio_unchanged_fixture(archived_payload,optional_context):
    # The scientific sidebar is not an instruction, target or payload field.
    return copy.deepcopy(archived_payload)
def validate_candidate(packet,row,source_response,provenance,targeted_case):
    import json
    S=importlib.util.spec_from_file_location('v21a_pure_evidence_validator',pathlib.Path(__file__).with_name('v21a-evidence.py'))
    old=importlib.util.module_from_spec(S);S.loader.exec_module(old)
    old.validate_packet(packet,[row])
    if packet['claim']['scope']!='family_context':raise ValueError('NO_EXACT_DOSE_OR_WORKOUT_APPROVAL_IN_V21B')
    if packet['review']['status']!='draft':raise ValueError('NO_EXPERT_APPROVAL_CLAIMED')
    if packet['binding']['variantGoal']is not None or packet['binding']['recipeContentSha256']is not None:
        raise ValueError('NO_UNREVIEWED_VARIANT_OR_RECIPE_BINDING')
    if packet['binding']['legacyId']!=targeted_case['legacyId']or packet['binding']['familyId']!=targeted_case['familyId']:
        raise ValueError('EXPLICIT_CASE_COMPARISON_REQUIRED')
    if packet['reference']['pmid']!=targeted_case['referencePmid']or packet['claim']['text']!=targeted_case['claim']:
        raise ValueError('CLAIM_REFERENCE_COMPARISON_MISMATCH')
    if packet['claim']['finding']!=targeted_case['finding']or packet['claim']['origin']!='scientific_publication':
        raise ValueError('REVIEWED_CLAIM_SCOPE_CHANGED')
    comparison=targeted_case['comparison'];app=packet['applicability']
    if any(app[k]!=comparison[v]for k,v in [('population','studyPopulation'),('intervention','studyProtocol'),('comparator','studyComparator')])or app['outcomes']!=[comparison['studyResults']]:
        raise ValueError('PICO_DIFFERS_FROM_EXPLICIT_DOCUMENTARY_REVIEW')
    if comparison['differences']not in app['limitations']or app['individualDataNeeded']!=comparison['individualDataMissing']:
        raise ValueError('TRANSFER_LIMITS_OR_INDIVIDUAL_UNKNOWNS_LOST')
    if app['directness']!='context_only':raise ValueError('NO_PROTOCOL_SPECIFIC_TRANSFER_ESTABLISHED')
    effective_bytes=json.dumps(row['source']['effective'],ensure_ascii=False,separators=(',',':')).encode()
    if hashlib.sha256(effective_bytes).hexdigest()!=row['source']['provenance']['effectiveContentSha256']:
        raise ValueError('EFFECTIVE_SOURCE_CONTENT_HASH_MISMATCH')
    membership=next(m for m in row['memberships']if m['familyId']==packet['binding']['familyId'])
    if not content_support(membership):raise ValueError('TITLE_ONLY_ATTACHMENT_REFUSED')
    actual_hash=hashlib.sha256(source_response).hexdigest()
    if packet['verification']['responseSha256']!=actual_hash or actual_hash!=provenance['responseSha256']:
        raise ValueError('REAL_RESPONSE_HASH_REQUIRED')
    if packet['verification']['retrievalUrl']!=provenance['retrievalUrl']or packet['verification']['accessedAt']!=provenance['retrievedAt']:
        raise ValueError('REAL_RETRIEVAL_PROVENANCE_REQUIRED')
    records=json.loads(source_response)['resultList']['result'];ref=next((p for p in records if p['id']==packet['reference']['pmid']),None)
    if not ref or any([packet['reference']['title']!=ref['title'],packet['reference']['doi']!=ref.get('doi'),packet['reference']['year']!=int(ref['pubYear']),packet['reference']['authors']!=ref.get('authorString')]):
        raise ValueError('CITATION_DOES_NOT_MATCH_ACTUAL_RESPONSE')
    if not ref.get('abstractText')or packet['verification']['status']!='abstract_reviewed':raise ValueError('ACTUAL_ABSTRACT_REQUIRED')
    if packet['applicability']['doseAndRecoveryCompared']:raise ValueError('NO_FULL_DOSE_MATCH_ESTABLISHED')
    if targeted_case['comparison']['doseAndRecoveryFullyMatched']:raise ValueError('UNEXPECTED_DOSE_APPROVAL')
    return {'transportAndProvenanceAdmissible':True,'scope':'family_context','expertApproval':False,
      'scientificTruthCertifiedByCode':False,'doseStatus':'dose_not_individually_verified','prescriptionChanged':False}
