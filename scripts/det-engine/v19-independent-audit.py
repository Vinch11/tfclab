"""Independent editorial lineage + Fraction arithmetic verifier. No JS compiler/evaluator imported.
Source objects must be unchanged; only declared editorial paths may differ from V18.
A complete candidate is never certified source-complete, scientifically validated or individually admitted.
"""
import json,gzip,pathlib,re,hashlib,sys,collections
from fractions import Fraction

def load(p):return[json.loads(l)for l in gzip.open(p,'rt')]
def digest(v):return hashlib.sha256(json.dumps(v,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
def slice16(s,a,b):return s.encode('utf-16-le')[a*2:b*2].decode('utf-16-le')
def single(s,inherit=None):
 s=s.strip().replace(',','.');m=re.fullmatch(r'(\d+(?:\.\d+)?)\s*h\s*(\d{1,2})?',s,re.I)
 if m:return Fraction(m[1])*3600+int(m[2]or 0)*60,'second'
 m=re.fullmatch(r'(\d+(?:\.\d+)?)\s*\x27\x27',s)
 if m:return Fraction(m[1]),'second'
 m=re.fullmatch(r'(\d+(?:\.\d+)?)\s*[\x27’]\s*(\d{1,2})?(?:["”s])?',s,re.I)
 if m:return Fraction(m[1])*60+int(m[2]or 0),'second'
 m=re.fullmatch(r'(\d+(?:\.\d+)?)\s*(minutes?|min|secondes?|sec|s|["”]|km|m)',s,re.I)
 if m:
  u=m[2].lower();return Fraction(m[1])*({'km':1000,'min':60,'minute':60,'minutes':60}.get(u,1)),('meter'if u in ['km','m']else'second')
 if inherit and re.fullmatch(r'\d+(?:\.\d+)?',s):return Fraction(s)*inherit[0],inherit[1]
 raise AssertionError(('unrecognized_source_quantity',s))
def quantity(lit):
 p=re.split('[–−-]',lit.strip())
 if len(p)==1:
  n,u=single(p[0]);return float(n),float(n),u
 assert len(p)==2,lit
 b,u=single(p[1]);suffix=p[1].strip();factor=3600 if re.search('h',suffix,re.I)else 60 if re.search(r"min|['’]",suffix,re.I)else 1000 if suffix.endswith('km')else 1
 a,u2=single(p[0],(factor,u));assert u==u2 and a<=b;return float(a),float(b),u

def flatten(nodes):
 for n in nodes:
  yield n
  yield from flatten(n.get('children',[]))
def patch(nodes,path,value):
 tokens=re.findall(r'nodes|children|restPolicy|\d+',path);assert tokens[0]=='nodes';target=nodes
 for t in tokens[1:-1]:target=target[int(t)]if t.isdigit()else target[t]
 assert tokens[-1]=='restPolicy';assert target['kind']=='repeat'and target['restPolicy']=='unknown'and target['reason']=='last_recovery_occurrence_not_specified'and len(target['children'])==2
 assert value in ['between_only','after_each'];target['restPolicy']=value

def evaluate(nodes,witness):
 assignments=witness['assignment'];cursor=0;expanded=[];shared={}
 def bounds(n):
  kind=n['kind']
  if kind in ['time','transition','envelope']:return n['quantity']['min'],n['quantity']['max']
  if kind=='annotation':return 0,0
  if kind=='optional':return bounds(n['children'][0])
  if kind=='sequence':
   vals=[bounds(x)for x in n['children']];return sum(x[0]for x in vals),sum(x[1]for x in vals)
  if kind=='repeat':
   lo,hi=n['count']['min'],n['count']['max'];assert isinstance(lo,int)and isinstance(hi,int)and 1<=lo<=hi
   vals=[bounds(x)for x in n['children']];assert n['restPolicy']in['between_only','after_each','explicit_inside_repeat']
   return sum(a*(lo-1 if n['restPolicy']=='between_only'and i else lo)for i,(a,b)in enumerate(vals)),sum(b*(hi-1 if n['restPolicy']=='between_only'and i else hi)for i,(a,b)in enumerate(vals))
  raise AssertionError(('candidate_not_fully_timed',kind))
 def execute(n):
  nonlocal cursor
  kind=n['kind']
  if kind=='annotation':return 0
  if kind in ['time','envelope']:
   q=n['quantity'];a=assignments[cursor];cursor+=1;assert a['source']==q['source']and a['range']==[q['min'],q['max']];assert q['min']<=a['seconds']<=q['max'];key=json.dumps(a['source'],sort_keys=True)
   if key in shared:assert shared[key]==a['seconds']
   shared[key]=a['seconds'];expanded.append({'seconds':a['seconds'],'notes':n['text'],'source':a['source'],'role':n['role'],'zones':n['zones']if n['zones']else n.get('declaredPartZones',[])});return a['seconds']
  if kind=='optional':assert assignments[cursor]['optionalIncluded']is True;cursor+=1;return execute(n['children'][0])
  if kind=='repeat':
   a=assignments[cursor];cursor+=1;assert a['source']==n['count']['source'];count=a['repetitions'];assert n['count']['min']<=count<=n['count']['max'];return sum(execute(ch)for i in range(count)for j,ch in enumerate(n['children'])if n['restPolicy']!='between_only'or j==0 or i<count-1)
  assert kind=='sequence';return sum(execute(ch)for ch in n['children'])
 core=[n for n in nodes if n['kind']!='integrated'];vals=[bounds(n)for n in core];lo=sum(x[0]for x in vals);hi=sum(x[1]for x in vals);total=sum(execute(n)for n in core);assert cursor==len(assignments)and total==witness['seconds']and lo<=total<=hi;return total,{'min':lo,'max':hi},expanded

def audit(directory):
 d=pathlib.Path(directory);C=load('docs/det-engine/v16/evidence/final/canonical.jsonl.gz');S=load('docs/det-engine/v18/evidence/validation-3/build/recipes.jsonl.gz');rows=load(d/'catalogue.jsonl.gz');O=load(d/'outputs.jsonl.gz');L=load(d/'dose-ledgers.jsonl.gz');ledger={r['candidateKey']:r['ledger']for r in L};context=json.loads((d/'serialization-context.json').read_text());doctrine=pathlib.Path('src/lib/zones/tfclDoctrine.ts').read_text();assert len(C)==len(S)==len(rows)==len(O)==920;assert len(set(r['legacyId']for r in rows))==920
 Q={q['legacyId']:q for q in load('docs/det-engine/v17/evidence/qualification-final.jsonl.gz')};failures=[];complete=[];candidate_count=0;source_complete=0;source_structured=0;text_count=0;structured_count=0;models=collections.Counter()
 for c,source,record,out in zip(C,S,rows,O):
  try:
   legacy=c['identity']['legacyId'];assert record['legacyId']==out['legacyId']==legacy;assert record['originalCanonical']==c;assert record['scientificQualificationV17']==Q[legacy];assert record['sourceV18Recipe']==source;assert record['sourceCanonicalHash']==digest(c)and record['sourceRecipeHash']==digest(source);assert record['originalsUnchanged']is True;assert record['qualification']['expertReview']is False and record['qualification']['individualPrescriptionApproved']is False
   parts=c['original']['effective']['structure'];assert all(p['text']in out['coach']for p in parts);assert all(v in out['coach']for v in c['original']['effective'].get('variants',{}).values())
   for key in ['strength','swim','multimodal']:models[key]+=bool(record['executionModels'][key])
   if source['classification']=='complete':
    total,bs,expanded=evaluate(source['nodes'],source['witness']);assert bs==source['elapsedSeconds'];source_complete+=1
   if out['sourceStructured']['payload']:source_structured+=1
   assert out['sourceTextEncoding']['calendarOrPrescriptionApproval']is False and out['sourceTextEncoding']['encodingOnly']is True
   if out['sourceTextEncoding']['payload']:
    payload=out['sourceTextEncoding']['payload'];assert all(p['text']in payload['description']for p in parts)
   assert len(record['candidates'])==len(out['candidates'])
   for candidate,rendered in zip(record['candidates'],out['candidates']):
    candidate_count+=1;assert candidate['candidateKey']==rendered['candidateKey'];assert candidate['legacyId']==legacy;assert candidate['sourceCanonicalHash']==digest(c)and candidate['sourceRecipeHash']==digest(source)
    assert all(candidate[k]is False for k in ['sourceCompletenessClaim','individualPrescriptionApproved','scientificValidation','expertReview','automaticPromotion'])
    expected=json.loads(json.dumps(source['nodes']));assert candidate['changes']
    for change in candidate['changes']:
     assert change['origin']=='new_editorial_proposal'and change['scientificApproval']is False and change['directDoseEvidence']is None
     assert all(change[k]for k in ['justification','applicability','uncertainty'])
     if change['path']=='candidateMinutes':assert candidate['variant']=='correct_declared_total';assert change['before']==source['advertisedMinutes'];assert source['elapsedSeconds']['min']==source['elapsedSeconds']['max'];assert change['after']==[source['elapsedSeconds']['min']/60]*2
     else:assert change['before']=='unknown';patch(expected,change['path'],change['after'])
    assert expected==candidate['nodes'],'unlogged source field change: work/intensity/count/task must remain unchanged'
    assert candidate['sourceMinutes']==source['advertisedMinutes']
    if candidate['variant']!='correct_declared_total':assert candidate['candidateMinutes']==candidate['sourceMinutes']
    assert all(p['text']in rendered['coach']for p in parts);assert'Proposition éditoriale V19'in rendered['coach']and'non approuvée'in rendered['coach']
    # All original quantity tokens, repetitions, intensity fields and exercise instructions
    # are identical by expected-node equality; reparse every duration literal independently.
    for n in flatten(candidate['nodes']):
     for sp in n['sourceSpans']:assert slice16(parts[sp['partIndex']]['text'],sp['start'],sp['end'])==sp['literal']
     if'quantity'in n:
      q=n['quantity'];sp=q['source'];assert slice16(parts[sp['partIndex']]['text'],sp['start'],sp['end'])==sp['literal'];assert quantity(sp['literal'])==(q['min'],q['max'],q['unit'])
    led=ledger[candidate['candidateKey']]
    if candidate['classification']=='complete_timeline_candidate':
     assert not candidate['unresolved'];total,bs,expanded=evaluate(candidate['nodes'],candidate['witness']);assert bs==candidate['elapsedSeconds'];assert candidate['candidateMinutes'][0]*60<=total<=candidate['candidateMinutes'][1]*60;complete.append({'legacyId':legacy,'candidateKey':candidate['candidateKey'],'seconds':total,'editorialNotSourceValidated':True})
     assert led['seconds']==total and sum(x['seconds']for x in led['rows'])==total;assert[(x['seconds'],x['source'],x['role'])for x in led['rows']]==[(x['seconds'],x['source'],x['role'])for x in expanded]
     assert led['recoverySeconds']==sum(x['seconds']for x in expanded if x['role']=='rest');assert led['nonRecoverySeconds']+led['recoverySeconds']==total
    else:assert candidate['witness']is None;assert not rendered['text']['payload']and not rendered['structured']['payload']
    if rendered['text']['payload']:
     payload=rendered['text']['payload'];assert payload['duration']==candidate['witness']['seconds'];assert all(p['text']in payload['description']for p in parts);assert'Proposition éditoriale V19'in payload['description'];assert c['prescription']['discipline']not in ['brick','mixed'];assert rendered['text']['networkRequests']==0 and rendered['text']['individualPrescriptionApproved']is False;text_count+=1
    if rendered['structured']['payload']:
     payload=rendered['structured']['payload'];assert c['prescription']['discipline']in['run','bike'];steps=payload['structured_workout'];assert all(x['type']=='step'for x in steps);assert[(x['step_duration_value'],x['notes'])for x in steps]==[(x['seconds'],x['notes'])for x in expanded];assert sum(x['step_duration_value']for x in steps)==payload['duration'];assert rendered['structured']['remoteAcceptanceVerified']is False and rendered['structured']['networkRequests']==0
     assert context['synthetic']is True and context['apiVersion']=='v1';assert len(rendered['structured']['bindings'])==len(steps)
     for step,binding,expanded_step in zip(steps,rendered['structured']['bindings'],expanded):
      assert expanded_step['zones']==[binding['sourceZone']];domain=binding['domainId'];assert context['domainBindings'][binding['sourceZone']]==domain;start=doctrine.index('id: "'+domain+'"');block=doctrine[start:doctrine.index('\n  },',start)];assert 'zone: "'+binding['sourceZone']+'"'in block
      sport=c['prescription']['discipline'];m=re.search(sport+r':\s*\{\s*min:\s*([\d.]+),\s*max:\s*([\d.]+)',block);assert m;anchor=context['refs']['ftpWatts']if sport=='bike'else context['refs']['mlssSpeedKmh'];factor=1 if sport=='bike'else 1/3.6
      assert step['target_type']==('power'if sport=='bike'else'pace');assert abs(step['target_value_min']-anchor*float(m[1])*factor)<0.00000051;assert abs(step['target_value_max']-anchor*float(m[2])*factor)<0.00000051
     structured_count+=1
  except(AssertionError,KeyError,IndexError,ValueError)as error:failures.append({'legacyId':c['identity']['legacyId'],'error':str(error)})
 return{'version':'v19-independent-editorial-python-1.1','sourceRecords':920,'unchangedSourceCompleteChecked':source_complete,'candidateInstancesChecked':candidate_count,'completeCandidateWitnesses':len(complete),'completeCandidateDistinctIds':len(set(x['legacyId']for x in complete)),'witnesses':complete,'coachSourceViewsChecked':920,'candidateTextContractsChecked':text_count,'candidateStructuredContractsChecked':structured_count,'sourceStructuredContracts':source_structured,'dedicatedModels':dict(models),'failures':failures,'notAttested':['historical completeness of editorial additions','scientific dose optimality','individual current admission','acquired adaptation','human expert review','real Nolio acceptance']}
if __name__=='__main__':
 out=pathlib.Path(sys.argv[2]);assert not out.exists(),'NO_OVERWRITE';r=audit(sys.argv[1]);out.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items()if k!='witnesses'}));sys.exit(bool(r['failures']))
