"""Independent V18 verifier: Python/Fraction, no import of the JS compiler or its evaluator.
Checks source evidence, arithmetic, multimodal unknowns, six parameter overlays and all outputs.
Does NOT attest scientific efficacy, individual admission, or remote Nolio acceptance.
"""
import pathlib,json,gzip,re,sys,hashlib,collections
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
 raise AssertionError(('source_unit_not_recognized',s))
def quantity(lit):
 p=re.split('[–−-]',lit.strip())
 if len(p)==1:
  n,u=single(p[0]);return float(n),float(n),u
 assert len(p)==2,lit
 b,u=single(p[1]);s=p[1].strip();factor=3600 if re.search('h',s,re.I)else 60 if re.search(r"min|['’]",s,re.I)else 1000 if s.endswith('km')else 1
 a,u2=single(p[0],(factor,u));assert u==u2 and a<=b;return float(a),float(b),u

def audit(directory):
 d=pathlib.Path(directory);C=load('docs/det-engine/v16/evidence/final/canonical.jsonl.gz');R=load(d/'recipes.jsonl.gz');M=load(d/'models.jsonl.gz');V=load(d/'variants.jsonl.gz');O=load(d/'outputs.jsonl.gz');E=load(d/'enriched-canonical.jsonl.gz');old=load('docs/det-engine/v17/evidence/final/recipes.jsonl.gz')
 S={x['legacyId']:x for x in load('docs/det-engine/v17/evidence/qualification-final.jsonl.gz')}
 assert len(C)==len(R)==len(M)==len(O)==len(E)==920;assert len(V)==2425
 assert len(set(r['legacyId']for r in R))==920
 complete=[];swims=[];structured=[];text_count=0;evidence_count=0;variant_count=0;failures=[]
 for c,r,m,o,e,prior in zip(C,R,M,O,E,old):
  try:
   legacy=c['identity']['legacyId'];assert legacy==r['legacyId']==o['id'];parts=c['original']['effective']['structure'];assert r['canonicalHash']==digest(c);assert e['canonicalV16']==c;assert e['recipeV18']==r;assert e['executionModelsV18']==m;assert e['scientificQualificationV17']==S[legacy]
   assert r['scientificValidation']is False and r['automaticPrescription']is False
   if prior['classification']=='complete':assert r['classification']=='complete'and r['witness']==prior['witness']
   covered=[n['partIndex']for n in r['nodes']]+[a['partIndex']for a in r['annotations']];assert sorted(covered)==list(range(len(parts)))
   def source(s):assert slice16(parts[s['partIndex']]['text'],s['start'],s['end'])==s['literal'],(legacy,'source_span',s)
   def qcheck(q):
    source(q['source']);a,b,u=quantity(q['source']['literal']);assert(a,b,u)==(q['min'],q['max'],q['unit']),(legacy,'source_quantity',q)
   def walk(n):
    for s in n['sourceSpans']:source(s)
    if'quantity'in n:qcheck(n['quantity'])
    if'count'in n:
     q=n['count'];source(q['source']);mat=re.fullmatch(r'(\d+)(?:\s*[–-]\s*(\d+))?\s*(?:[x×]\s*|séries?\s+de\s*)',q['source']['literal'],re.I);assert mat;assert(int(mat[1]),int(mat[2]or mat[1]))==(q['min'],q['max'])
    for ch in n.get('children',[]):walk(ch)
   for n in r['nodes']:
    walk(n);assert n['text']==parts[n['partIndex']]['text'].strip();assert n['declaredPartZones']==parts[n['partIndex']]['zones']
   def seq(ns):
    bs=[bounds(x)for x in ns];return sum(x[0]for x in bs),sum(x[1]for x in bs)
   def bounds(n):
    k=n['kind']
    if k in ['time','envelope','transition']:return n['quantity']['min'],n['quantity']['max']
    if k=='annotation':assert n['text']=='.'or re.fullmatch(r"(?:Pas d['’]échauffement|Aucun échauffement|Pas de retour au calme|Aucun retour au calme)[.!]?",n['text'],re.I);return 0,0
    if k=='optional':assert'optionnel'in n['text'].lower();return bounds(n['children'][0])
    if k=='sequence':return seq(n['children'])
    if k=='repeat':
     lo,hi=n['count']['min'],n['count']['max'];assert lo>=1 and isinstance(lo,int)and isinstance(hi,int)
     if n['restPolicy']=='between_only':
      assert re.search(r'entre\s+(?:les\s+|chaque\s+)?(?:séries|répétitions|blocs)',n['text'],re.I);assert len(n['children'])==2
      a,b=bounds(n['children'][0]);x,y=bounds(n['children'][1]);return a*lo+x*(lo-1),b*hi+y*(hi-1)
     if n['restPolicy']=='after_each':assert re.search(r'après chaque répétition,?\s+y compris la dernière',n['text'],re.I);a,b=seq(n['children']);return a*lo,b*hi
     assert n['restPolicy']=='explicit_inside_repeat';tail=n['text'][len(n['count']['source']['literal']):].lstrip();assert tail[0]in'([';a,b=seq(n['children']);return a*lo,b*hi
    raise AssertionError(('not_elapsed_execution',k))
   if r['classification']=='complete':
    assert not r['unknowns'];core=[n for n in r['nodes']if n['kind']!='integrated'];lo,hi=seq(core);assert r['elapsedSeconds']=={'min':lo,'max':hi};a=r['witness']['assignment'];cursor=0;shared={};expanded=[]
    for x in a:
     if'seconds'in x:
      key=json.dumps(x['source'],sort_keys=True)
      if key in shared:assert shared[key]==x['seconds']
      shared[key]=x['seconds']
    def execute(n):
     nonlocal cursor
     k=n['kind']
     if k=='annotation':return 0
     if k in ['time','envelope']:
      x=a[cursor];cursor+=1;q=n['quantity'];assert x['source']==q['source'];assert q['min']<=x['seconds']<=q['max'];assert x['range']==[q['min'],q['max']]
      if k=='envelope':
       assert n['envelopeLayout']=='base_then_explicit_finish'and len(n['children'])==1
       finish=n['children'][0];assert finish['kind']=='time';assert finish['quantity']['max']<=q['min'];assert re.search(r'Z[12](?:[–-]Z2)?\s+avec\s+',n['text']);assert'finish'in finish['text'];assert x['seconds']-finish['quantity']['min']>=0
      expanded.append({'seconds':x['seconds'],'notes':n['text']});return x['seconds']
     if k=='optional':assert a[cursor]['optionalIncluded']is True;cursor+=1;return execute(n['children'][0])
     if k=='repeat':
      x=a[cursor];cursor+=1;assert x['source']==n['count']['source'];count=x['repetitions'];assert n['count']['min']<=count<=n['count']['max'];return sum(execute(ch)for i in range(count)for j,ch in enumerate(n['children'])if n['restPolicy']!='between_only'or j==0 or i<count-1)
     assert k=='sequence';return sum(execute(ch)for ch in n['children'])
    total=sum(execute(n)for n in core);assert cursor==len(a);assert lo<=total<=hi;assert total==r['witness']['seconds'];assert r['advertisedMinutes'][0]*60<=total<=r['advertisedMinutes'][1]*60
    if len(core)!=len(r['nodes']):assert legacy=='SEILER_BIKE_Z1_LONG'
    complete.append({'legacyId':legacy,'seconds':total,'source_and_arithmetic':True})
   if m['strength']:
    s=m['strength'];
    for ev in s['circuitOrganization']['circuitStatements']:source(ev['source']);assert ev['literal']==ev['source']['literal']
    assert c['prescription']['discipline']=='strength';assert s['sourceParts']==parts;assert s['totalElapsedSeconds']is None;assert s['heartRateZoneAsNeuromuscularLoad']is False
    perpart=collections.defaultdict(list)
    for b in s['blocks']:
     source(b['source']);assert b['instructions']==b['source']['literal'];perpart[b['source']['partIndex']].append(b['instructions']);assert b['individualLoad']is None and b['elapsedSeconds']is None
     for key in ['setsReps','namedSetsReps','tempo','rest','load','contractions','circuits']:
      for ev in b[key]:source(ev['source']);assert ev['literal']==ev['source']['literal'];evidence_count+=1
     for q in b['timedEvidence']:qcheck(q)
     for ev in b['setsReps']:
      tail=slice16(parts[ev['source']['partIndex']]['text'],ev['source']['end'],ev['source']['end']+12)
      assert not re.match(r'''\s*(?:s\b|min\b|m\b|['’"])''',tail),'time_mislabeled_as_repetitions'
    assert all(''.join(perpart[i])==p['text']for i,p in enumerate(parts))
   if m['swim']:
    s=m['swim'];
    for ev in s['drillEvidence']+s['relativeTargets']:source(ev['source']);assert ev['literal']==ev['source']['literal']
    assert c['prescription']['discipline']=='swim';assert s['sourceParts']==parts and s['structure']==r['nodes'];assert s['defaultStroke']is None;assert s['individualTargetSeconds']is None and s['cssTransferAcrossStrokesAllowed']is False
    if s['structureStatus']=='source_protocol_structurally_complete':
     assert not s['structuralBlockers'];assert r['witness']is None;assert r['classification']!='complete';swims.append(legacy)
   if m['multimodal']:
    s=m['multimodal'];
    for ev in s['inlineComponentEvidence']+s['inlineTransitionMentions']:source(ev['source']);assert ev['literal']==ev['source']['literal']
    assert c['prescription']['discipline']in['brick','mixed'];assert [x['instructions']for x in s['components']]==[p['text']for p in parts];assert s['singleSportCollapseAllowed']is False;assert o['structured']['status']=='refused'and o['text']['status']=='refused'
    for gap in s['unstatedTransitions']:assert gap['duration']is None
    for t in s['transitions']:
     if t['duration']and'<'in t['instructions']:assert t['duration']['min']is None and t['duration']['maxInclusive']is False
   assert all(p['text']in o['coach']for p in parts);assert all(v in o['coach']for v in c['original']['effective'].get('variants',{}).values());assert legacy in o['coach']
   if o['text']['payload']:
    payload=o['text']['payload'];assert digest(payload)==o['text']['payloadHash'];assert all(p['text']in payload['description']for p in parts);assert legacy in payload['description'];assert all(v in payload['description']for v in c['original']['effective'].get('variants',{}).values());text_count+=1
   if o['structured']['payload']:
    s=o['structured'];payload=s['payload'];assert r['classification']=='complete';assert s['remoteAcceptanceVerified']is False and s['networkRequests']==0;assert c['prescription']['discipline']in['run','bike'];assert all(p['text']in payload['description']for p in parts)
    def expand(items):
     out=[]
     for item in items:
      if item['type']=='repetition':
       for _ in range(item['value']):out.extend(expand(item['steps']))
      else:out.append({'seconds':item['step_duration_value'],'notes':item['notes']})
     return out
    assert expand(payload['structured_workout'])==expanded;assert sum(x['seconds']for x in expanded)==payload['duration'];structured.append(legacy)
  except(AssertionError,KeyError,IndexError,ValueError)as error:failures.append({'legacyId':c['identity']['legacyId'],'error':str(error)})
 index={c['identity']['legacyId']:(c,r)for c,r in zip(C,R)}
 assert len(set((v['legacyId'],v['goal'])for v in V))==2425
 for v in V:
  c,r=index[v['legacyId']];assert v['sourceText']==c['original']['effective']['variants'][v['goal']];assert v['sourceHash']==digest(v['sourceText'])
  if v['instance']:
   x=v['instance'];assert r['classification']=='complete'and v['classification']=='explicit_parameter_only';roots=[n for n in r['nodes']if n['kind']!='annotation'];assert len(roots)==1 and roots[0]['kind']=='time';a,b,u=quantity(v['sourceText']);assert u=='second';assert x['replacementRange']=={'min':a,'max':b,'unit':u};assert r['advertisedMinutes'][0]*60<=a<=b<=r['advertisedMinutes'][1]*60;assert x['executionWitness']['seconds']==a;assert x['executionWitness']['originalNodeText']==roots[0]['text'];assert x['baseRecipeHash']==digest(r);assert x['legacyId']==v['legacyId'];assert x['instructionsPreserved']is True and x['sourceRestrictionsUnchanged']is True;assert x['automaticPrescription']is False;variant_count+=1
 return{'version':'v18-independent-python-1','records':920,'protectedV17Complete':sum(r['classification']=='complete'for r in old),'completeChecked':len(complete),'witnesses':complete,'swimSourceProtocols':swims,'strengthSourceEvidenceChecked':evidence_count,'strengthModelsChecked':sum(bool(m['strength'])for m in M),'multimodalModelsChecked':sum(bool(m['multimodal'])for m in M),'variantsChecked':len(V),'variantBindingsChecked':variant_count,'coachRendersChecked':len(O),'textNolioPayloadsChecked':text_count,'structuredNolioPayloadsChecked':len(structured),'structuredIds':structured,'failures':failures,'notAttested':['individual_admissibility','scientific_efficacy','optimal_dose','remote_Nolio_acceptance','expert_review']}
if __name__=='__main__':
 d=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);assert not out.exists(),'NO_OVERWRITE';result=audit(d);out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k!='witnesses'}));sys.exit(bool(result['failures']))
