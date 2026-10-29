"""Independent guard: a strength model may not choose final rest occurrence without a declared parameter."""
import gzip,json,pathlib,sys
root=pathlib.Path(sys.argv[1]);cases=json.loads(gzip.decompress((root/'scenarios.json.gz').read_bytes()))
for s in cases:
 if s['sourceId']!='A_STR_STABILITY_CORE' or not s['result']['timeline']['complete']:continue
 p={x['key']:x for x in s['parameters']}
 for key in ['strength.exercise_rest_policy','strength.round_rest_policy','strength.peripheral_transition','strength.round_transitions_in_rest','strength.boundary_rest_composition']:
  assert key in p and p[key]['status']=='known',('UNDECLARED_STRENGTH_EXECUTION_BOUNDARY',s['context']['scenarioId'],key)
 for key in ['strength.exercise_rest_policy','strength.round_rest_policy']:
  assert p[key]['value'] in ['between_only','after_each'],('INVALID_RECOVERY_OCCURRENCE',key)
print('PASS: every complete strength scenario declares exercise and round final recovery occurrence')
