"""Independent fixture arithmetic/lineage audit; no production TS or JS executed here."""
import gzip,json,pathlib,sys,re,math,hashlib
def load(p):return[json.loads(l)for l in gzip.open(p,'rt')]
def norm(s):return re.sub(r'\s+',' ',' '.join(re.sub(r'^\s*[-•*]\s+','',line)for line in re.sub(r'\*\*(.+?)\*\*',r'\1',s).splitlines())).strip()
def length16(s):return len(s.encode('utf-16-le'))//2
def flat(a):return[step for n in a for step in (flat(n['steps'])*n['value']if n['type']=='repetition'else[n])]
def audit(folder):
 root=pathlib.Path(folder);P=json.loads(pathlib.Path('docs/det-engine/v19/cycle-1/state.json').read_text())['validation']['evidence']+'/build';R=load(P+'/catalogue.jsonl.gz');O=load(P+'/outputs.jsonl.gz');rows=load(root/'sender-path-audit.jsonl.gz');provenance=json.loads((root/'provenance.json').read_text());assert provenance['sourceSha256']==hashlib.sha256(pathlib.Path(provenance['sourcePath']).read_bytes()).hexdigest();assert provenance['importsExecuted']==0 and provenance['edgeModuleImported']is False and provenance['denoServeExecuted']is False
 assert len(rows)==len(R)==len(O)==920;strict=precision=removed=structured=missing=0
 for r,o,a in zip(R,O,rows):
  assert a['legacyId']==r['legacyId'];assert a['realNolioCalls']==0 and a['productionPathInvoked']is False;desc=a['pureSourceFormatter']['description'];expected=[{'part':p['part'],'text':p['text']}for p in r['originalCanonical']['original']['effective']['structure']if norm(p['text'])not in norm(desc)];assert a['pureSourceFormatter']['missingSourceParts']==expected;assert a['pureSourceFormatter']['allSourcePartsPreserved']==(not expected);missing+=bool(expected);assert a['pureSourceFormatter']['length']==length16(desc)
  raw=o['sourceTextEncoding']['payload'];assert a['directRawTextFixture']['descriptionLength']==(length16(raw['description'])if raw else None);assert a['directRawTextFixture']['withinKnownFormatter4000CharacterPolicy']==(length16(raw['description'])<=4000 if raw else None)
  wanted=([('source',None,o['sourceStructured']['payload'])]if o['sourceStructured']['payload']else[])+[('editorial',c['candidateKey'],c['structured']['payload'])for c in o['candidates']if c['structured']['payload']];assert len(wanted)==len(a['structuredFixtures'])
  for f,(kind,key,payload)in zip(a['structuredFixtures'],wanted):
   structured+=1;assert(f['kind'],f['candidateKey'],f['sourcePayload'])==(kind,key,payload);before=flat(payload['structured_workout']);after=flat(f['normalizedFixture']['structured_workout']);assert len(before)==len(after);assert sum(s['step_duration_value']for s in after)==f['summary']['durationSec']==payload['duration'];assert f['realExportPermitted']is False;diff=[]
   for i,(b,n)in enumerate(zip(before,after)):
    assert n['comment']==b['notes'];assert n['step_duration_value']==b['step_duration_value'];assert n['step_duration_type']==b['step_duration_type']
    for k in ['step_duration_type','step_duration_value','target_type','target_value_min','target_value_max']:
     if b.get(k)!=n.get(k):diff.append({'step':i,'field':k,'before':b.get(k),'after':n.get(k)})
   assert diff==f['differences'];literal=not diff;assert f['strictFidelityPass']==literal;strict+=literal
   machine=all(d['field']in['target_value_min','target_value_max']and isinstance(d['before'],(int,float))and d['after']==(math.floor(d['before']+.5)if before[d['step']]['target_type']=='power'else float(format(d['before'],'.3f'))if before[d['step']]['target_type']=='pace'else None)for d in diff)
   assert f['documentedMachinePrecisionPass']==machine;precision+=machine
   lost=any(d['field']=='target_type'or d['after']is None for d in diff);removed+=lost
   if lost:assert f['strictFidelityPass']is False and f['documentedMachinePrecisionPass']is False and 'target_semantics_changed_or_removed'in f['reasons'];assert any(s.get('target_value_min')==0 and s['target_type']=='pace'for s in before)
 return{'sourceRecords':920,'structuredFixturesIndependentlyChecked':structured,'literalFidelityPass':strict,'documentedEncodingPrecisionPass':precision,'targetSemanticsRemovedAndRefused':removed,'formatterProjectionMissingAtLeastOnePart':missing,'sourcePayloadsPreserved':True,'productionChanged':False,'realNolioCalls':0,'scope':'exact fixtures and explicit canonical projection only; not a statement that all real exports follow this projection'}
if __name__=='__main__':
 result=audit(sys.argv[1]);pathlib.Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
