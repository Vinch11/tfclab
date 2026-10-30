"""Independently reject adopting a floor alternative whose whole-block complement refused it."""
import gzip,hashlib,json,pathlib,sys
root=pathlib.Path('docs/det-engine/v26/evidence')/('validation-'+sys.argv[1])/'build'
rows=json.loads(gzip.decompress((root/'sensitivity.json.gz').read_bytes()))
for row in rows:
 r=row['result'];f=r['floor']
 if f['alternativePresent'] and not f['complementary']['policyApplied']:
  h=hashlib.sha256(json.dumps(r['retained'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
  expected={q['referenceHash'] for q in f['requests']}
  assert h in expected,('refused_alternative_adopted',row['id'],f['status'],h,sorted(expected))
print('All refused floor alternatives remain separate from the retained calendar.')
