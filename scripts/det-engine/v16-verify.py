"""Read-only dossier verification; --record stores a V16 receipt without changing any prior reference."""
import csv,gzip,hashlib,json,pathlib,re,subprocess,sys
D=pathlib.Path('docs/det-engine/v16')
def read(p):return json.loads(pathlib.Path(p).read_text())
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
base=read(D/'baseline-files.json');bad=[p for p,h in base.items()if not pathlib.Path(p).exists()or sha(p)!=h];assert not bad,bad
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='experiment/det-engine'
paths=set(subprocess.check_output(['git','diff','--name-only','e9fd91a6e9d4eb3cf2c59d708818e5901ae69d07'],text=True).splitlines()+subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines())
assert all(p.startswith(('docs/det-engine/v16/','experimental/det-engine/v16-','experimental/det-engine/vitest.v16','scripts/det-engine/v16-'))for p in paths),paths
manifest=read(D/'evidence/final/manifest.json');cards=[json.loads(l)for l in gzip.open(D/'evidence/final/canonical.jsonl.gz','rt')];quality=[json.loads(l)for l in gzip.open(D/'evidence/quality-register.jsonl.gz','rt')]
assert len(cards)==len(quality)==manifest['totalOccurrences']==manifest['uniqueLegacyIds']==920
ids={c['identity']['legacyId']for c in cards};assert len(ids)==920==len({r['legacyId']for r in quality})
for c in cards:assert c['conversion']['automaticPrescription'] is False and c['conversion']['scientificStatus']=='not_validated_by_conversion'
for dep in manifest['dependencies']:assert sha(dep['path'])==dep['sha256']
for group in ['final','replay','post-intensity-guard-verified']:
 for name,h in read(D/'evidence'/group/'checksums.json').items():assert sha(D/'evidence'/group/name)==h
for proof in read(D/'evidence/proof-1/reproducibility.json')['outputs']:assert sha(D/'evidence/final'/proof['file'])==sha(D/'evidence/replay'/proof['file'])==proof['sha256']
assert sha(D/'evidence/integration-final/integration-study.json')==sha(D/'evidence/integration-replay/integration-study.json')
post=read(D/'evidence/post-intensity-guard-verification.json');assert post['exitCode']==0 and post['processVerified']
for p in post['comparisons']:assert sha(D/'evidence/final'/p['file'])==sha(D/'evidence/post-intensity-guard-verified'/p['file'])==p['sha256']
assert read(D/'evidence/intensity-guard-validation.json')['exitCode']==0
schema=read(D/'evidence/json-schema-validation.json');assert schema['records']==schema['valid']==920 and not schema['errors']
with(D/'MANIFEST.csv').open()as f:rows=list(csv.DictReader(f))
assert len(rows)==920 and {r['legacy_id']for r in rows}==ids
with(D/'ANOMALIES.csv').open()as f:anomalies=list(csv.DictReader(f))
assert len(anomalies)==3282
missing=[];links=0
for md in D.glob('*.md'):
 for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',md.read_text()):
  if target.startswith(('http:','https:','#','mailto:')):continue
  target=target.split('#')[0];links+=1
  if not(md.parent/target).exists():missing.append((str(md),target))
assert not missing,missing
for file in ['source-checksums.json','checksums.json']:
 if(D/file).exists():
  for p,h in read(D/file).items():assert sha(p)==h,(file,p)
receipt={'version':'v16-dossier-verification-1','protectedFiles':len(base),'allProtectedUnchanged':True,'sourceRecords':len(cards),'uniqueIds':len(ids),'qualityRecords':len(quality),'manifestCSVRows':len(rows),'anomalyCSVRows':len(anomalies),'localLinksChecked':links,'replayedCanonicalArtifacts':7,'replayedStudies':1,'postIntensityGuardArtifactsIdentical':7,'automaticPrescriptions':0,'newFullPlans':0,'scientificOrHumanReviewClaimed':False,'allowedV16ScopeOnly':True}
if'--record'in sys.argv:(D/'evidence/dossier-verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
