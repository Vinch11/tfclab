"""Mutation tests target silent dose invention, hidden rest changes, and lossy exports."""
import importlib.util,pathlib,gzip,json,tempfile,shutil,unittest,os
os.environ['PYTHONDONTWRITEBYTECODE']='1'
p=pathlib.Path(__file__).with_name('v18-independent-audit.py');spec=importlib.util.spec_from_file_location('v18audit',p);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
SOURCE=pathlib.Path(os.environ.get('TFCL_DET_V18_MUTATION_SOURCE','docs/det-engine/v18/evidence/validation-2/build'))
def reject(file,mutate):
 with tempfile.TemporaryDirectory(prefix='v18-mutant-')as td:
  out=pathlib.Path(td)
  for name in ['recipes','models','variants','outputs','enriched-canonical']:
   shutil.copyfile(SOURCE/(name+'.jsonl.gz'),out/(name+'.jsonl.gz'))
  target=out/(file+'.jsonl.gz');rows=mod.load(target);mutate(rows)
  if file in ['recipes','models']:
   paired=out/'enriched-canonical.jsonl.gz';enriched=mod.load(paired);key='recipeV18'if file=='recipes'else'executionModelsV18'
   for row,replacement in zip(enriched,rows):row[key]=replacement
   with gzip.open(paired,'wt')as f:
    for row in enriched:f.write(json.dumps(row,ensure_ascii=False)+'\n')
  with gzip.open(target,'wt')as f:
   for r in rows:f.write(json.dumps(r,ensure_ascii=False)+'\n')
  try:result=mod.audit(out)
  except(AssertionError,KeyError,IndexError,ValueError):return True
  return bool(result['failures'])
class Mutations(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  result=mod.audit(SOURCE);assert not result['failures'],result['failures']

 def test_time_cannot_be_added_to_a_source_witness(self):
  self.assertTrue(reject('recipes',lambda rs:next(r for r in rs if r['classification']=='complete')['witness'].__setitem__('seconds',99999)))
 def test_missing_brick_transition_cannot_be_zero(self):
  self.assertTrue(reject('models',lambda ms:next(m for m in ms if m['multimodal']and m['multimodal']['unstatedTransitions'])['multimodal']['unstatedTransitions'][0].__setitem__('duration',0)))
 def test_swim_css_cross_stroke_transfer_is_not_licensed(self):
  self.assertTrue(reject('models',lambda ms:next(m for m in ms if m['swim'])['swim'].__setitem__('cssTransferAcrossStrokesAllowed',True)))
 def test_strength_load_not_inferred(self):
  self.assertTrue(reject('models',lambda ms:next(m for m in ms if m['strength'])['strength']['blocks'][0].__setitem__('individualLoad',50)))
 def test_variant_source_text_cannot_be_replaced(self):
  self.assertTrue(reject('variants',lambda vs:vs[0].__setitem__('sourceText','invented dose')))
 def test_nolio_step_cannot_silently_lose_time(self):
  def change(os):
   o=next(x for x in os if x['structured']['payload']);step=o['structured']['payload']['structured_workout'][0];step['step_duration_value']-=1
  self.assertTrue(reject('outputs',change))
 def test_coach_instructions_cannot_disappear(self):
  self.assertTrue(reject('outputs',lambda os:os[0].__setitem__('coach','missing instructions')))
if __name__=='__main__':unittest.main()
