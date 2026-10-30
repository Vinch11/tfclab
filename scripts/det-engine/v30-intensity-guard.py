"""Independent no-dilution guard against preserved V27 native per-session intensity results."""
import gzip,json,pathlib,sys
old=json.loads(gzip.decompress(pathlib.Path('docs/det-engine/v27/evidence/validation-3/build/results.json.gz').read_bytes()))[1]['executions']
new=json.loads(gzip.decompress((pathlib.Path(sys.argv[1])/'proposed.json.gz').read_bytes()))
for w in new['weeks']:
 for s in w['sessions']:
  prior=next(p for p in old if p['slotKey']==s['slotKey'])
  assert s['intensity']==prior['intensity'],('NATIVE_INTENSITY_CONTRACT_CHANGED',s['slotKey'],[x['zone']for x in prior['intensity']['numericTargets']],[x['zone']for x in s['intensity']['numericTargets']])
print('PASS: all30 native intensity contracts preserved, including strict Z1 S3 run')
