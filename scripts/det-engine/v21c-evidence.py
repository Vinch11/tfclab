"""Experimental literature gate. A concordant study never approves an individual."""
MATCHES=('same_sport','work_matches','repetitions_match','intensity_anchor_matches','recovery_anchor_matches',
 'recovery_duration_matches','source_final_rest_known','full_session_matches','frequency_matches','population_transfer_justified')
def evaluate(comparison,claim):
    reasons=[]
    if not comparison.get('provenanceVerified'):reasons.append('ARTIFACT_PROVENANCE_REQUIRED')
    if claim.get('effectHorizon')=='chronic'and comparison.get('studyHorizon')=='acute':reasons.append('ACUTE_IS_NOT_CHRONIC_GAIN')
    if claim.get('sourceFinalRestAssumption')not in [None,'unknown']:reasons.append('FINAL_REST_MUST_NOT_BE_INVENTED')
    if claim.get('scope')=='exact_recipe_dose':
        if comparison.get('sourceIntensityAnchor') and comparison.get('studyIntensityAnchor') and comparison['sourceIntensityAnchor']!=comparison['studyIntensityAnchor']:
            reasons.append('INTENSITY_ANCHORS_NOT_INTERCHANGEABLE')
        if comparison.get('sourceSport') and comparison.get('studySport') and comparison['sourceSport']!=comparison['studySport']:
            reasons.append('CROSS_SPORT_EXACT_PROTOCOL_REFUSED')
        if comparison.get('access')!='full_main_text_and_xml_tables_examined':reasons.append('FULL_PROTOCOL_ACCESS_REQUIRED')
        if comparison.get('studyScope')!='primary':reasons.append('PRIMARY_PROTOCOL_REQUIRED')
        if not comparison.get('protocolComplete'):reasons.append('STUDY_PROTOCOL_INCOMPLETE_OR_CONTRADICTORY')
        for k in MATCHES:
            if comparison.get('checks',{}).get(k)is not True:reasons.append('NOT_ESTABLISHED:'+k)
        if not comparison.get('criticalJustification'):reasons.append('EXPLICIT_CRITICAL_JUSTIFICATION_REQUIRED')
    return {'literatureClaimCandidateAllowed':not reasons,'reasons':reasons,
      'individualAdmissibility':'not_assessed_not_approved','sportingHumanReview':False,'automaticPromotion':False}
