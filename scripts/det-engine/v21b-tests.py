"""Offline refusal and fidelity contracts; no remote calls, no individual approvals."""
import copy,gzip,importlib.util,json,pathlib,re,unittest
HERE=pathlib.Path(__file__).parent;R=pathlib.Path('docs/det-engine/v21b');E=R/json.loads((R/'state.json').read_text()).get('acceptedData','evidence/accepted')
def module(n):
    s=importlib.util.spec_from_file_location(n,HERE/(n+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
D=module('v21b-documentary')
def lines(p):
    with gzip.open(p,'rt')if str(p).endswith('.gz')else open(p)as f:return[json.loads(l)for l in f if l.strip()]
M={r['legacyId']:r for r in lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl')}
P=lines(E/'EVIDENCE_ATTACHMENT_CANDIDATES.jsonl');RAW=gzip.decompress((R/'evidence/public-source-retrieval/response.json.gz').read_bytes())
PROV=json.loads((R/'evidence/public-source-retrieval/provenance.json').read_text());CASES=json.loads((HERE/'v21b-review-decisions.json').read_text())['targetedCases']
def validate(p,row=None,raw=RAW):
    c=next(c for c in CASES if c['legacyId']==p['binding']['legacyId'])
    return D.validate_candidate(p,row or M[p['binding']['legacyId']],raw,PROV,c)
class Contracts(unittest.TestCase):
    def test_01_two_real_response_bound_context_packets(self):
        self.assertEqual(len(P),2)
        for p in P:
            x=validate(p);self.assertTrue(x['transportAndProvenanceAdmissible']);self.assertFalse(x['expertApproval']);self.assertEqual(x['doseStatus'],'dose_not_individually_verified')
    def test_02_no_forged_response_hash(self):
        p=copy.deepcopy(P[0]);p['verification']['responseSha256']='0'*64;self.assertRaises(ValueError,validate,p)
    def test_03_no_absent_response_hash(self):
        p=copy.deepcopy(P[0]);p['verification']['responseSha256']=None;self.assertRaises(ValueError,validate,p)
    def test_04_no_swapped_response_body(self):
        self.assertRaises(ValueError,validate,P[0],None,b'{}')
    def test_05_no_changed_citation(self):
        for key,value in [('doi','10.0000/fake'),('year',1900),('title','Unverified invented title'),('authors','Invented')]:
            p=copy.deepcopy(P[0]);p['reference'][key]=value;self.assertRaises(ValueError,validate,p)
    def test_06_no_uncompared_publication_substitution(self):
        p=copy.deepcopy(P[0]);p['reference']['pmid']='29663142';self.assertRaises(ValueError,validate,p)
    def test_07_no_changed_claim(self):
        p=copy.deepcopy(P[0]);p['claim']['text']='This proves the optimal individual dose.';self.assertRaises(ValueError,validate,p)
    def test_08_no_title_only_attachment(self):
        p=P[0];row=copy.deepcopy(M[p['binding']['legacyId']]);member=next(m for m in row['memberships']if m['familyId']==p['binding']['familyId']);member['basis']=[{'pointer':'/original/effective/objectif','text':row['historicalObjective']}]
        self.assertRaises(ValueError,validate,p,row)
    def test_09_no_exact_dose_scope(self):
        p=copy.deepcopy(P[0]);p['claim']['scope']='exact_recipe_dose';p['binding']['recipeContentSha256']=M[p['binding']['legacyId']]['sourceStructureSha256'];p['applicability']['doseAndRecoveryCompared']=True
        self.assertRaises(ValueError,validate,p)
    def test_10_no_false_full_text_access(self):
        p=copy.deepcopy(P[0]);p['verification']['status']='full_text_reviewed';self.assertRaises(ValueError,validate,p)
    def test_11_stale_workout_source_rejected(self):
        p=copy.deepcopy(P[0]);p['binding']['sourceEffectiveSha256']='0'*64;self.assertRaises(ValueError,validate,p)
    def test_12_no_unknown_variant_binding(self):
        p=copy.deepcopy(P[0]);p['binding']['variantGoal']='made-up';p['binding']['variantSourceHash']='0'*64;self.assertRaises(ValueError,validate,p)
    def test_13_no_approval_or_automatic_promotion(self):
        p=copy.deepcopy(P[0]);p['review']['status']='reviewed';self.assertRaises(ValueError,validate,p)
        p=copy.deepcopy(P[0]);p['automaticPromotion']=True;self.assertRaises(Exception,validate,p)
    def test_14_eight_forbidden_inferences(self):
        flags={k:False for k in D.FORBIDDEN_ASSUMPTIONS};self.assertTrue(D.assert_assumptions(flags))
        for k in D.FORBIDDEN_ASSUMPTIONS:
            with self.subTest(inference=k):
                bad={**flags,k:True};self.assertRaises(ValueError,D.assert_assumptions,bad)
    def test_15_no_missing_or_implicit_inference_decision(self):
        self.assertRaises(ValueError,D.assert_assumptions,{})
        flags={k:False for k in D.FORBIDDEN_ASSUMPTIONS};flags[D.FORBIDDEN_ASSUMPTIONS[0]]=None;self.assertRaises(ValueError,D.assert_assumptions,flags)
    def test_16_920_default_coach_renders_unchanged(self):
        original={c['id']:c for c in lines('docs/det-engine/v16/evidence/final/coach-renders.jsonl.gz')};new=lines(E/'coach-renders-with-context.jsonl.gz');self.assertEqual(len(new),920)
        html=pathlib.Path('docs/det-engine/v19/cycle-2/coach-library.html').read_text();latest={v['id']:v for v in json.loads(re.search(r'<script type="application/json" id="records">([\s\S]*?)</script>',html).group(1))}
        for c in new:
            self.assertEqual(c['historicalText'],original[c['id']]['text']);self.assertEqual(c['defaultText'],latest[c['id']]['sourceCoach'])
            self.assertEqual(c['archivedCandidateViewsUnchanged'],latest[c['id']]['candidates'])
            self.assertTrue(c['withOptionalContext'].startswith(latest[c['id']]['sourceCoach']+'\n\nPourquoi cette séance ?'))
    def test_17_15_nolio_outputs_unchanged_with_context(self):
        original=lines('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz');new=lines(E/'nolio-unchanged-fixtures.jsonl.gz');self.assertEqual(len(new),15)
        for a,b in zip(original,new,strict=True):
            self.assertEqual(a['result']['payload'],b['archivedPayloadUnchanged'])
            self.assertEqual(D.nolio_unchanged_fixture(a['result']['payload'],'Bibliography must not enter the payload.'),a['result']['payload'])
    def test_18_96_doses_not_individually_verified(self):
        c=lines(E/'CANDIDATE_96_REVIEW.jsonl');self.assertEqual(len(c),96);self.assertEqual(len({r['legacyId']for r in c}),51)
        for r in c:self.assertEqual(r['doseStatus'],'dose_not_individually_verified');self.assertFalse(r['individualAthleteApproved'])
    def test_19_two_unresolved_intents_not_filled(self):
        rows=lines(E/'WORKOUT_RESEARCH_ROUTING.jsonl');u=[r for r in rows if r['unresolvedIntent']]
        self.assertEqual({r['legacyId']for r in u},{'A_10K_PROGRESSIVE_60','A_SEMI_PROGRESSIVE_FINISH'})
        self.assertTrue(all(not r['routes']for r in u))
    def test_20_mixed_units_or_tolerance_not_resolved_by_context(self):
        kb=json.loads((E/'FAMILY_KNOWLEDGE_BASE.json').read_text());f=next(f for f in kb['families']if f['familyId']=='heat_hypoxia');self.assertFalse(f['hypoxiaEvidenceCovered'])
        self.assertTrue(all(not r['scientificallyValidated']and r['actualIndividualProfile']is None for r in lines(E/'WORKOUT_RESEARCH_ROUTING.jsonl')))
    def test_21_no_invented_population_protocol_or_results(self):
        for key,value in [('population','A fabricated elite cohort'),('intervention','Invented exact 5×3 trial'),('outcomes',['A fabricated adaptation result']),('directness','protocol_specific_candidate')]:
            p=copy.deepcopy(P[0]);p['applicability'][key]=value;self.assertRaises(ValueError,validate,p)
    def test_22_no_removal_of_transfer_limits_or_unknowns(self):
        for key in ['limitations','individualDataNeeded']:
            p=copy.deepcopy(P[0]);p['applicability'][key]=[];self.assertRaises(ValueError,validate,p)
    def test_23_no_variant_implicit_in_context_case(self):
        p=copy.deepcopy(P[0]);v=M[p['binding']['legacyId']]['variants'][0];p['binding'].update(variantGoal=v['goal'],variantSourceHash=v['sourceHash']);self.assertRaises(ValueError,validate,p)
    def test_24_no_source_content_change_behind_correct_hash(self):
        p=P[0];row=copy.deepcopy(M[p['binding']['legacyId']]);row['source']['effective']['structure'][1]['text']='Invented easier dose';self.assertRaises(ValueError,validate,p,row)
if __name__=='__main__':unittest.main(verbosity=2)
