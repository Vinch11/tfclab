"""Negative contracts for research routing and detached evidence transport."""
import copy,importlib.util,json,pathlib,unittest
HERE=pathlib.Path(__file__).parent;ROOT=pathlib.Path('docs/det-engine/v21a')
def module(name):
    s=importlib.util.spec_from_file_location(name,HERE/(name+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
B=module('v21a-build');V=module('v21a-evidence')
ROWS=[json.loads(x)for x in (ROOT/'WORKOUT_FAMILY_MAPPING.jsonl').read_text().splitlines()]
F=json.loads((HERE/'v21a-families.json').read_text())['families']
def packet():
    r=next(r for r in ROWS if r['legacyId']=='A_BIKE_Z2_LONG')
    return {'schemaVersion':'tfcl-evidence-attachment-1.0.0','packetId':'EXAMPLE-UNREVIEWED-NOT-AN-EVIDENCE-CLAIM',
      'binding':{'legacyId':r['legacyId'],'sourceEffectiveSha256':r['source']['provenance']['effectiveContentSha256'],
        'familyId':'aerobic_endurance','variantGoal':None,'variantSourceHash':None,'recipeContentSha256':None},
      'claim':{'text':'Question de recherche non examinée ; aucune justification acquise.','scope':'family_context','origin':'candidate_hypothesis','finding':'unassessed'},
      'reference':{'title':None,'authors':None,'year':None,'doi':None,'pmid':None,'url':None,'referenceKind':'none'},
      'verification':{'status':'source_mention_only','retrievalUrl':None,'responseSha256':None,'accessedAt':None,'reviewer':None,'accessLimits':['Aucune recherche effectuée dans cet exemple.']},
      'evidenceAssessment':dict.fromkeys(['studyDesign','certaintyFramework','certaintyJudgment','rationale','assessedBy']),
      'applicability':{'population':None,'intervention':None,'comparator':None,'outcomes':[],'limitations':['Applicabilité non examinée.'],'directness':'unassessed','doseAndRecoveryCompared':False,'individualDataNeeded':[]},
      'review':{'status':'draft','reviewer':None,'decisionRationale':None,'individualAthleteApproved':False},
      'supersedesPacketId':None,'prescriptionImpact':'none_research_annotation_only','automaticPromotion':False}
class Contracts(unittest.TestCase):
    def test_01_unreviewed_transport_is_not_truth(self):
        x=V.validate_packet(packet(),ROWS);self.assertFalse(x['scientificTruthVerifiedByValidator']);self.assertFalse(x['prescriptionChanged'])
    def test_02_unknown_id(self):
        p=packet();p['binding']['legacyId']='NOT_A_SOURCE';self.assertRaises(ValueError,V.validate_packet,p,ROWS)
    def test_03_stale_hash(self):
        p=packet();p['binding']['sourceEffectiveSha256']='0'*64;self.assertRaises(ValueError,V.validate_packet,p,ROWS)
    def test_04_unmapped_family(self):
        p=packet();p['binding']['familyId']='vo2max';self.assertRaises(ValueError,V.validate_packet,p,ROWS)
    def test_05_variant_binding(self):
        p=packet();v=next(r for r in ROWS if r['legacyId']==p['binding']['legacyId'])['variants'][0]
        p['binding'].update(variantGoal=v['goal'],variantSourceHash=v['sourceHash']);V.validate_packet(p,ROWS)
        p['binding']['variantSourceHash']='0'*64;self.assertRaises(ValueError,V.validate_packet,p,ROWS)
    def test_06_orphan_variant_hash(self):
        p=packet();p['binding']['variantSourceHash']='0'*64;self.assertRaises(ValueError,V.validate_packet,p,ROWS)
    def test_07_exact_dose_requires_recipe_and_comparison(self):
        p=packet();p['claim']['scope']='exact_recipe_dose';self.assertRaises(ValueError,V.validate_packet,p,ROWS)
        r=next(r for r in ROWS if r['legacyId']==p['binding']['legacyId']);p['binding']['recipeContentSha256']=r['sourceStructureSha256'];self.assertRaises(ValueError,V.validate_packet,p,ROWS)
        p['applicability']['doseAndRecoveryCompared']=True;self.assertTrue(V.validate_packet(p,ROWS)['transportValid'])
        p['binding']['recipeContentSha256']='0'*64;self.assertRaises(ValueError,V.validate_packet,p,ROWS)
    def test_08_variant_not_silently_same_recipe(self):
        p=packet();r=next(r for r in ROWS if r['legacyId']==p['binding']['legacyId']);v=r['variants'][0]
        p['binding'].update(variantGoal=v['goal'],variantSourceHash=v['sourceHash'],recipeContentSha256=r['sourceStructureSha256']);p['claim']['scope']='exact_recipe_dose';p['applicability']['doseAndRecoveryCompared']=True
        self.assertRaises(ValueError,V.validate_packet,p,ROWS)
    def test_09_verification_without_retrieval_rejected(self):
        p=packet();p['verification']['status']='full_text_reviewed';self.assertRaises(ValueError,V.validate_packet,p,ROWS)
    def test_10_review_without_intervenant_rejected(self):
        p=packet();p['review']['status']='reviewed';self.assertRaises(ValueError,V.validate_packet,p,ROWS)
    def test_11_no_automatic_promotion(self):
        p=packet();p['automaticPromotion']=True;self.assertRaises(Exception,V.validate_packet,p,ROWS)
        p=packet();p['review']['individualAthleteApproved']=True;self.assertRaises(Exception,V.validate_packet,p,ROWS)
    def test_12_no_unknown_fields_or_invented_certainty(self):
        p=packet();p['autoEvidenceFromTitle']=True;self.assertRaises(Exception,V.validate_packet,p,ROWS)
        p=packet();p['evidenceAssessment']['certaintyJudgment']=7;self.assertRaises(Exception,V.validate_packet,p,ROWS)
    def test_13_title_change_does_not_generate_reference_or_level(self):
        c=copy.deepcopy(B.lines(B.CANON)[0]);c['prescription']['title']='Billat VO2max Nobel scientifically verified'
        a=B.route(c,F)
        self.assertEqual(a,B.route(B.lines(B.CANON)[0],F))
        for m in a:self.assertIsNone(m['evidenceLevel']);self.assertEqual(m['referenceIds'],[])
    def test_14_warmup_recovery_not_target(self):
        c=copy.deepcopy(B.lines(B.CANON)[0]);c['original']['effective']={'objectif':'VO2max','structure':[{'part':'Cool-down','text':'10 min récupération Z1'}]}
        a=B.route(c,F);rec=next(m for m in a if m['familyId']=='recovery');self.assertFalse(rec['declaredTarget'])
    def test_15_muscular_endurance_not_aerobic(self):
        c=copy.deepcopy(B.lines(B.CANON)[0]);c['prescription']['discipline']='strength';c['original']['effective']={'objectif':'Endurance musculaire en circuit','structure':[]}
        a=B.route(c,F);self.assertNotIn('aerobic_endurance',[m['familyId']for m in a]);self.assertIn('strength',[m['familyId']for m in a])
    def test_16_without_fatigue_not_durability(self):
        c=copy.deepcopy(B.lines(B.CANON)[0]);c['original']['effective']={'objectif':'Technique sans fatigue','structure':[]}
        self.assertNotIn('durability',[m['familyId']for m in B.route(c,F)])
    def test_17_intensity_not_invented(self):
        self.assertTrue(all(not r['evidenceAttachments'] and not r['scientificallyValidated']for r in ROWS))
        self.assertTrue(all(not r['prescriptionChanged']for r in ROWS))
if __name__=='__main__':unittest.main(verbosity=2)
