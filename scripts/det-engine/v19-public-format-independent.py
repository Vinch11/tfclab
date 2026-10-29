"""Independent literal-preservation check of public-format fixtures, never remote validation."""
import json,gzip,pathlib,sys
def load(p):return[json.loads(l)for l in gzip.open(p,'rt')]
def compare(before,after):
 assert len(before)==len(after)
 for b,a in zip(before,after):
  if b['type']=='repetition':assert a['value']==b['value']and a['type']=='repetition';compare(b['steps'],a['steps']);continue
  assert b['type']==a['type']=='step';assert a['step_duration_type']=='duration';assert isinstance(a['step_duration_value'],int)and a['step_duration_value']>0
  for k in ['step_duration_type','step_duration_value','intensity_type','target_type','target_value_min','target_value_max']:assert a.get(k)==b.get(k)
  assert a.get('comment')==b.get('notes',b.get('comment'));assert 'notes'not in a and'target_unit'not in a
  if a['target_type']!='no_target':assert isinstance(a['target_value_max'],(int,float))
def audit(folder):
 rows=load(pathlib.Path(folder)/'fixtures.jsonl.gz');assert len(rows)==15;prior=json.loads(pathlib.Path('docs/det-engine/v19/cycle-1/state.json').read_text())['validation']['evidence']+'/build';outputs=load(prior+'/outputs.jsonl.gz');expected={}
 for o in outputs:
  if o['sourceStructured']['payload']:expected[(o['legacyId'],None)]=o['sourceStructured']['payload']
  for c in o['candidates']:
   if c['structured']['payload']:expected[(o['legacyId'],c['candidateKey'])]=c['structured']['payload']
 assert len(expected)==len(rows)
 for r in rows:
  assert r['sourcePayload']==expected[(r['legacyId'],r['candidateKey'])];result=r['result'];assert result['payload'];assert result['realExportPermitted']is False and result['remoteAcceptanceVerified']is False and result['individualPrescriptionApproved']is False;assert{**result['payload'],'structured_workout':None}=={**r['sourcePayload'],'structured_workout':None};compare(r['sourcePayload']['structured_workout'],result['payload']['structured_workout'])
 return{'fixturesChecked':15,'source':13,'editorial':2,'literalNumericTargetPreservation':True,'instructionCopyToCommentVerified':True,'currentProductionSenderCompatibilityNotClaimed':True,'remoteAcceptanceVerified':False,'realNolioCalls':0}
if __name__=='__main__':
 result=audit(sys.argv[1]);pathlib.Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
