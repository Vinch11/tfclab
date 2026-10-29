"""Contract tests for experimental evidence refusals; no production validator imports."""
import copy,importlib.util,pathlib,unittest,json
p=pathlib.Path(__file__).with_name('v21c-evidence.py');s=importlib.util.spec_from_file_location('gate',p);g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
ROWS=[json.loads(l)for l in open('docs/det-engine/v21c/evidence/release-comparisons/candidate-comparisons.jsonl')]
def control():
    # Software-only Boolean fixture, deliberately not a publication/workout and not emitted as evidence.
    return {'provenanceVerified':True,'access':'full_main_text_and_xml_tables_examined','studyScope':'primary','protocolComplete':True,
      'checks':{k:True for k in g.MATCHES},'criticalJustification':'software contract control only','studyHorizon':'chronic'}
def check(c,**extra):return g.evaluate(c,{'scope':'exact_recipe_dose',**extra})
class EvidenceContracts(unittest.TestCase):
    def test_software_control_never_approves_individual(self):
        r=check(control());self.assertTrue(r['literatureClaimCandidateAllowed']);self.assertEqual(r['individualAdmissibility'],'not_assessed_not_approved');self.assertFalse(r['automaticPromotion']);self.assertFalse(r['sportingHumanReview'])
    def test_ftp_is_not_vo2peak(self):
        c=control();c['sourceIntensityAnchor']='FTP';c['studyIntensityAnchor']='VO2peak';self.assertIn('INTENSITY_ANCHORS_NOT_INTERCHANGEABLE',check(c)['reasons'])
    def test_running_is_not_cycling(self):
        c=control();c['sourceSport']='bike';c['studySport']='run';self.assertIn('CROSS_SPORT_EXACT_PROTOCOL_REFUSED',check(c)['reasons'])
    def test_acute_is_not_chronic_gain(self):
        c=control();c['studyHorizon']='acute';self.assertIn('ACUTE_IS_NOT_CHRONIC_GAIN',check(c,effectHorizon='chronic')['reasons'])
    def test_last_rest_cannot_be_invented(self):
        for policy in ['after_every','between_only',0,True]:
            self.assertIn('FINAL_REST_MUST_NOT_BE_INVENTED',check(control(),sourceFinalRestAssumption=policy)['reasons'])
    def test_unknown_last_rest_is_blocking(self):
        c=control();c['checks']['source_final_rest_known']=None;self.assertIn('NOT_ESTABLISHED:source_final_rest_known',check(c)['reasons'])
    def test_metadata_http200_is_not_full_text(self):
        c=control();c['access']='metadata_response_not_full_text_prior_abstract_only';self.assertIn('FULL_PROTOCOL_ACCESS_REQUIRED',check(c)['reasons'])
    def test_abstract_does_not_supply_protocol(self):
        c=control();c['access']='abstract_only';self.assertIn('FULL_PROTOCOL_ACCESS_REQUIRED',check(c)['reasons'])
    def test_review_cannot_be_exact_primary_protocol(self):
        c=control();c['studyScope']='review';self.assertIn('PRIMARY_PROTOCOL_REQUIRED',check(c)['reasons'])
    def test_missing_artifact_hash_provenance_blocks(self):
        c=control();c['provenanceVerified']=False;self.assertIn('ARTIFACT_PROVENANCE_REQUIRED',check(c)['reasons'])
    def test_protocol_contradiction_is_blocking(self):
        c=control();c['protocolComplete']=False;self.assertIn('STUDY_PROTOCOL_INCOMPLETE_OR_CONTRADICTORY',check(c)['reasons'])
    def test_critical_argument_required(self):
        c=control();c['criticalJustification']='';self.assertIn('EXPLICIT_CRITICAL_JUSTIFICATION_REQUIRED',check(c)['reasons'])
    def test_each_unestablished_dimension_blocks(self):
        for k in g.MATCHES:
            for value in [None,False,'unknown']:
                c=control();c['checks'][k]=value;self.assertIn('NOT_ESTABLISHED:'+k,check(c)['reasons'])
    def test_actual_candidate_comparisons_all_refused(self):
        self.assertEqual(len(ROWS),102)
        for c in ROWS:self.assertFalse(check(c)['literatureClaimCandidateAllowed']);self.assertEqual(check(c),c['exactDoseGate'])
    def test_actual_cross_sport_witness(self):
        rows=[c for c in ROWS if c['studyKey']=='chronic_run_4_4'and c['workoutId']=='SEILER_BIKE_4X4MIN'];self.assertTrue(rows)
        for r in rows:self.assertFalse(r['checks']['same_sport']);self.assertIn('NOT_ESTABLISHED:same_sport',check(r)['reasons'])
    def test_actual_low_cadence_rest_contradiction(self):
        rows=[c for c in ROWS if c['studyKey']=='low_cadence_primary'];self.assertTrue(rows)
        for r in rows:self.assertFalse(r['protocolComplete']);self.assertIn('STUDY_PROTOCOL_INCOMPLETE_OR_CONTRADICTORY',check(r)['reasons'])
    def test_no_numeric_duration_shortcut(self):
        for r in ROWS:
            self.assertIsNot(r['checks']['intensity_anchor_matches'],True);self.assertFalse(check(r)['literatureClaimCandidateAllowed'])
    def test_no_individual_promotion_even_if_comparison_allowed(self):
        self.assertEqual(check(control())['individualAdmissibility'],check(ROWS[0])['individualAdmissibility'])
if __name__=='__main__':unittest.main(verbosity=2)
