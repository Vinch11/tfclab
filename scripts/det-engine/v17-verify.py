"""Verify the full V17 dossier without changing pre-existing files."""
import pathlib,json,gzip,csv,hashlib,re,subprocess,math,sys
D=pathlib.Path('docs/det-engine/v17')
def read(p):return json.loads(pathlib.Path(p).read_text())
def lines(p):return [json.loads(l)for l in gzip.open(p,'rt')]
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
protected=read(D/'baseline-files.json');assert all(pathlib.Path(p).exists()and sha(p)==h for p,h in protected.items())
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='experiment/det-engine'
changed=set(subprocess.check_output(['git','diff','--name-only','42a0ca0993a479d6d2f7498287ed855fdfa0dd5a','-z']).decode().strip('\0').split('\0')+subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z']).decode().strip('\0').split('\0'))-{''}
assert all(p.startswith(('docs/det-engine/v17/','experimental/det-engine/v17-','experimental/det-engine/vitest.v17','scripts/det-engine/v17-'))for p in changed),changed
C=lines('docs/det-engine/v16/evidence/final/canonical.jsonl.gz');R=lines(D/'evidence/final/recipes.jsonl.gz');E=lines(D/'evidence/final/enriched-canonical.jsonl.gz');O=lines(D/'evidence/outputs-final/outputs.jsonl.gz');Q=lines(D/'evidence/qualification-final.jsonl.gz');assert len(C)==len(R)==len(E)==len(O)==len(Q)==920
ids={c['identity']['legacyId']for c in C};assert len(ids)==920;byid={c['identity']['legacyId']:c for c in C};assert sum(o['structured']['payload']is not None for o in O)==12
for c,r,e,o,q in zip(C,R,E,O,Q):
 assert c['identity']['legacyId']==r['legacyId']==o['id']==q['legacyId'];assert e['canonicalV16']==c and e['recipeV17']==r;assert r['restrictions']==c['prescription']['restrictions'];assert not r['automaticPrescription']and not q['automaticPromotion']and not q['scientificValidation'];assert q['sourceClaim']==c['prescription']['objective']
 for p in c['original']['effective']['structure']:assert p['text']in o['coach']
 assert c['original']['effective']['avoid']in o['coach']
 assert r['multidiscipline']['singleSportCollapseAllowed']is False
 if o['structured']['payload']:
  assert c['prescription']['discipline']not in ['brick','mixed'] and c['original']['effective']['cat']!='Brique'
  assert r['classification']=='complete';p=o['structured']['payload'];assert p['duration']==r['witness']['seconds'];assert o['structured']['individualPrescriptionApproved']is False
  def expand(nodes):
   out=[]
   for n in nodes:
    if n['type']=='repetition':out+=expand(n['steps'])*n['value']
    else:assert n['step_duration_type']=='duration'and n['step_duration_value']>0;out.append(n)
   return out
  def leaves(nodes):
   out=[]
   for n in nodes:
    if n['kind']=='time':out.append(n)
    out+=leaves(n.get('children',[]))
   return out
  source={json.dumps(n['quantity']['source'],sort_keys=True):n['text']for n in leaves(r['nodes'])};assign=[a for a in r['witness']['assignment']if'seconds'in a];steps=expand(p['structured_workout']);assert len(steps)==len(assign)
  for step,a in zip(steps,assign):assert step['step_duration_value']==a['seconds']and step['notes']==source[json.dumps(a['source'],sort_keys=True)];assert all(math.isfinite(step[k])for k in ['target_value_min','target_value_max']);assert step['target_value_min']<=step['target_value_max']
  assert sum(s['step_duration_value']for s in steps)==r['witness']['seconds'];assert p['date_start']=='2026-11-02';assert p['athlete_id']==1
  assert r['legacyId']in p['description']
proof=read(D/'evidence/validation-3/reproducibility.json')
for name,a,b in [('recipes','final','replay'),('outputs','outputs-final','outputs-replay'),('selection','selection-final','selection-replay')]:
 for p in proof[name]:assert sha(D/'evidence'/a/p['file'])==sha(D/'evidence'/b/p['file'])==p['sha256']
assert sha(D/'evidence/qualification-final.jsonl.gz')==sha(D/'evidence/qualification-replay.jsonl.gz');assert read(D/'evidence/final/independent-audit.json')['passed']==67
for p in read(D/'evidence/post-supplement-output-verification.json').get('artifacts',[]):assert sha(D/'evidence/outputs-final'/p['file'])==sha(D/'evidence/outputs-post-supplement'/p['file'])==p['sha256']
with(D/'COMPILATION_INDEX.csv').open()as f:comp=list(csv.DictReader(f))
with(D/'SCIENTIFIC_MATRIX.csv').open()as f:sci=list(csv.DictReader(f))
assert len(comp)==len(sci)==920 and {r['legacy_id']for r in comp}==ids and {r['legacy_id']for r in sci}==ids
variants=lines(D/'evidence/variant-constraints.jsonl.gz');assert len(variants)==2425
import runpy
independent=runpy.run_path('scripts/det-engine/v17-independent-audit.py');variant_quantities=0
for v in variants:
 assert not v['fullVariantRecipeCompiled']and not v['automaticallyAppliedToGenericRecipe'];c=byid[v['legacyId']];assert v['sourceText']==c['original']['effective']['variants'][v['goal']];assert v['sourceContentSha256']==c['provenance']['effectiveContentSha256']
 for q in v['quantities']:
  span=q['source'];assert independent['slice16'](v['sourceText'],span['start'],span['end'])==span['literal'];a,b,u=independent['quantity'](span['literal']);assert(a,b,u)==(q['min'],q['max'],q['unit']);variant_quantities+=1
links=0
for md in D.glob('*.md'):
 for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',md.read_text()):
  if target.startswith(('https:','http:','#')):continue
  assert(md.parent/target.split('#')[0]).exists(),(md,target);links+=1
for name in ['source-checksums.json','checksums.json']:
 if(D/name).exists():
  for p,h in read(D/name).items():assert sha(p)==h,(name,p)
receipt={'version':'v17-dossier-verification-1','protectedFiles':len(protected),'allProtectedUnchanged':True,'canonicalRecordsUnchanged':920,'recipeRecords':920,'scientificRows':920,'variantEntriesPreserved':2425,'variantQuantitiesIndependentlyVerified':variant_quantities,'independentCompleteWitnesses':67,'coachViewsPreserved':920,'structuredFixturesFaithfullyExpanded':12,'sourceSportCollapseAllowed':False,'expertReview':False,'individualPrescriptionsApproved':0,'localLinksChecked':links,'scopeOnlyV17':True}
if'--record'in sys.argv:(D/'evidence/dossier-verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
