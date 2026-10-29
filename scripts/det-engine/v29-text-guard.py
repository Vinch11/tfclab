"""Independent local text fidelity guard for explicit neuromuscular load and tempo."""
import gzip,json,pathlib,sys
rows=json.loads(gzip.decompress((pathlib.Path(sys.argv[1])/'scenarios.json.gz').read_bytes()))
for row in rows:
 n=row['nolio'];p=n['payload']
 if not p or row['sourceId']!='A_STR_STABILITY_CORE':continue
 assert 'charge : poids du corps'in p['description'],('DECLARED_BODYWEIGHT_LOAD_MISSING_FROM_TEXT',row['scenarioId'])
 assert '2 s/répétition'in p['description'] and 'côté 2'in p['description'] and 'tour 3'in p['description'],('FORCE_EXECUTION_DETAILS_MISSING',row['scenarioId'])
print('PASS: explicit strength load, tempo, side and round survive the local text payload')
