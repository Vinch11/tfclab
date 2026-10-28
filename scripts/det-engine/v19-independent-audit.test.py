import importlib.util,pathlib,tempfile,shutil,gzip,json,os,unittest
p=pathlib.Path(__file__).with_name('v19-independent-audit.py');spec=importlib.util.spec_from_file_location('v19audit',p);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
SOURCE=pathlib.Path(os.environ['TFCL_DET_V19_MUTATION_SOURCE'])
def put(p,rows):
 with gzip.open(p,'wt')as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False)+'\n')
def reject(file,fn):
 with tempfile.TemporaryDirectory(prefix='v19-mutant-')as tmp:
  out=pathlib.Path(tmp)
  for name in ['catalogue.jsonl.gz','outputs.jsonl.gz','dose-ledgers.jsonl.gz','serialization-context.json']:shutil.copyfile(SOURCE/name,out/name)
  rows=mod.load(out/(file+'.jsonl.gz'));fn(rows);put(out/(file+'.jsonl.gz'),rows)
  try:result=mod.audit(out)
  except(AssertionError,KeyError,IndexError,ValueError):return True
  return bool(result['failures'])
def complete(rows):return next(c for r in rows for c in r['candidates']if c['classification']=='complete_timeline_candidate')
class Mutations(unittest.TestCase):
 @classmethod
 def setUpClass(cls):assert not mod.audit(SOURCE)['failures']
 def test_original_source_cannot_change(self):self.assertTrue(reject('catalogue',lambda rs:rs[0]['originalCanonical']['prescription'].__setitem__('title','invented source')))
 def test_new_policy_cannot_be_claimed_historical(self):self.assertTrue(reject('catalogue',lambda rs:complete(rs)['changes'][0].__setitem__('origin','source_explicit')))
 def test_intensity_cannot_be_diluted(self):
  def mutate(rs):next(n for n in mod.flatten(complete(rs)['nodes'])if n['zones'])['zones']=['Z1']
  self.assertTrue(reject('catalogue',mutate))
 def test_work_duration_cannot_be_fabricated(self):
  def mutate(rs):next(n for n in mod.flatten(complete(rs)['nodes'])if'quantity'in n)['quantity']['min']+=60
  self.assertTrue(reject('catalogue',mutate))
 def test_independent_arithmetic_rejects_an_extra_minute(self):self.assertTrue(reject('catalogue',lambda rs:complete(rs)['witness'].__setitem__('seconds',complete(rs)['witness']['seconds']+60)))
 def test_scientific_approval_cannot_be_forged(self):self.assertTrue(reject('catalogue',lambda rs:complete(rs).__setitem__('scientificValidation',True)))
 def test_nolio_numeric_target_cannot_be_lowered(self):
  def mutate(rs):next(c for r in rs for c in r['candidates']if c['structured']['payload'])['structured']['payload']['structured_workout'][0]['target_value_max']*=0.5
  self.assertTrue(reject('outputs',mutate))
 def test_coach_instruction_loss_is_rejected(self):self.assertTrue(reject('outputs',lambda rs:rs[0].__setitem__('coach','missing instructions')))
if __name__=='__main__':unittest.main()
