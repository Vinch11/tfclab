"""Detached research packet validation. No prescription mutation or automatic scientific approval."""
import hashlib,json,pathlib
import jsonschema
ROOT=pathlib.Path('docs/det-engine/v21a')
def validate_packet(packet,mapping,schema=None):
    schema=schema or json.loads((ROOT/'EVIDENCE_INTEGRATION_SCHEMA.json').read_text())
    jsonschema.Draft202012Validator(schema).validate(packet)
    binding=packet['binding'];row=next((r for r in mapping if r['legacyId']==binding['legacyId']),None)
    if row is None:raise ValueError('UNKNOWN_WORKOUT_ID')
    if binding['sourceEffectiveSha256']!=row['source']['provenance']['effectiveContentSha256']:
        raise ValueError('STALE_OR_WRONG_SOURCE')
    if binding['familyId']not in {m['familyId']for m in row['memberships']}:
        raise ValueError('FAMILY_MAPPING_REVIEW_REQUIRED')
    goal=binding['variantGoal'];variant_hash=binding['variantSourceHash']
    if goal is not None:
        variant=next((v for v in row['variants']if v['goal']==goal),None)
        if not variant or variant['sourceHash']!=variant_hash:raise ValueError('WRONG_VARIANT_BINDING')
    elif variant_hash is not None:raise ValueError('ORPHAN_VARIANT_HASH')
    if packet['claim']['scope']=='exact_recipe_dose' and (not binding['recipeContentSha256'] or not packet['applicability']['doseAndRecoveryCompared']):
        raise ValueError('EXACT_DOSE_REQUIRES_VERSIONED_RECIPE_AND_COMPARISON')
    if packet['claim']['scope']=='exact_recipe_dose' and goal is not None:
        raise ValueError('VARIANT_DOSE_REQUIRES_FUTURE_VERSIONED_VARIANT_RECIPE_BINDING')
    if binding['recipeContentSha256']is not None and binding['recipeContentSha256']!=row['sourceStructureSha256']:
        raise ValueError('UNRECOGNIZED_RECIPE_VERSION_NO_SILENT_OVERLAY_BINDING')
    if packet['verification']['status']!='source_mention_only':
        v=packet['verification']
        if not v['retrievalUrl'] or not v['responseSha256'] or not v['accessedAt'] or not v['reviewer']:
            raise ValueError('VERIFICATION_PROVENANCE_REQUIRED')
        if not any(packet['reference'][k]for k in ['doi','pmid','url']):
            raise ValueError('REFERENCE_IDENTIFIER_REQUIRED')
    if packet['review']['status']=='reviewed' and (not packet['review']['reviewer']or not packet['review']['decisionRationale']):
        raise ValueError('EXPLICIT_REVIEW_REQUIRED')
    if packet['review']['individualAthleteApproved']:raise ValueError('LIBRARY_PACKET_IS_NOT_INDIVIDUAL_APPROVAL')
    # Validating a packet only validates its transport and binding, never its factual correctness.
    return {'transportValid':True,'sourceBound':True,'scientificTruthVerifiedByValidator':False,
            'prescriptionChanged':False,'automaticPromotion':False}
