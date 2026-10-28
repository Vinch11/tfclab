import unittest,importlib.util,pathlib,copy
spec=importlib.util.spec_from_file_location('audit',pathlib.Path(__file__).with_name('v17-independent-audit.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class IndependentAuditTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.cards=m.load('docs/det-engine/v16/evidence/final/canonical.jsonl.gz');cls.rows=m.load('docs/det-engine/v17/evidence/candidate-4/recipes.jsonl.gz')
 def test_source_literal_tampering_is_detected(self):
  rows=copy.deepcopy(self.rows);r=next(r for r in rows if r['legacyId']=='D_BIKE_RECOVERY');r['nodes'][0]['quantity']['min']+=60
  with self.assertRaises(AssertionError):m.audit(self.cards,rows)
 def test_missing_source_part_is_detected(self):
  rows=copy.deepcopy(self.rows);r=next(r for r in rows if r['legacyId']=='A_RUN_Z2_EASY');r['nodes'].pop()
  with self.assertRaises(AssertionError):m.audit(self.cards,rows)
 def test_wrong_witness_sum_is_detected(self):
  rows=copy.deepcopy(self.rows);r=next(r for r in rows if r['legacyId']=='D_BIKE_RECOVERY');r['witness']['seconds']+=60;result=m.audit(self.cards,rows);self.assertTrue(any(f['id']=='D_BIKE_RECOVERY'for f in result['failures']))
if __name__=='__main__':unittest.main()
