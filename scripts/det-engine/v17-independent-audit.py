"""Independent source-span and arithmetic verifier. No import of the JS compiler or its evaluator."""
import pathlib,json,gzip,re,sys,hashlib,fractions,collections
from fractions import Fraction

def load(p):return [json.loads(l)for l in gzip.open(p,'rt')]
def slice16(s,a,b):return s.encode('utf-16-le')[a*2:b*2].decode('utf-16-le')
def value(s,inherit=None):
 s=s.strip().replace(',','.');m=re.fullmatch(r'(\d+(?:\.\d+)?)\s*h\s*(\d{1,2})?',s,re.I)
 if m:return Fraction(m[1])*3600+int(m[2]or 0)*60,'second'
 m=re.fullmatch(r'(\d+(?:\.\d+)?)\s*[\x27’]\s*(\d{1,2})?(?:["”s])?',s,re.I)
 if m:return Fraction(m[1])*60+int(m[2]or 0),'second'
 m=re.fullmatch(r'(\d+(?:\.\d+)?)\s*(minutes?|min|secondes?|sec|s|["”]|km|m)',s,re.I)
 if m:
  u=m[2].lower();return Fraction(m[1])*({'km':1000,'min':60,'minute':60,'minutes':60}.get(u,1)),('meter'if u in ['km','m']else'second')
 if inherit and re.fullmatch(r'\d+(?:\.\d+)?',s):return Fraction(s)*inherit[0],inherit[1]
 raise AssertionError(('unrecognized_source_literal',s))
def quantity(lit):
 p=re.split('[–−-]',lit.strip())
 if len(p)==1:
  n,u=value(p[0]);return float(n),float(n),u
 assert len(p)==2,lit
 b,u=value(p[1]);s=p[1].strip();factor=3600 if re.search('h',s,re.I)else 60 if re.search(r"min|['’]",s,re.I)else 1000 if s.endswith('km')else 1
 a,u2=value(p[0],(factor,u));assert u==u2 and a<=b;return float(a),float(b),u

def audit(cards,rows):
 assert len(cards)==len(rows)==920
 C={c['identity']['legacyId']:c for c in cards};checked=[];fail=[]
 for r in rows:
  c=C[r['legacyId']];parts=c['original']['effective']['structure'];assert r['canonicalHash']==hashlib.sha256(json.dumps(c,separators=(',',':'),ensure_ascii=False).encode()).hexdigest(),r['legacyId']
  covered=[n['partIndex']for n in r['nodes']]+[a['partIndex']for a in r['annotations']];assert sorted(covered)==list(range(len(parts))),r['legacyId']
  def walk(n):
   for span in n['sourceSpans']:assert slice16(parts[span['partIndex']]['text'],span['start'],span['end'])==span['literal'],(r['legacyId'],'source_span')
   if 'quantity'in n:
    q=n['quantity'];span=q['source'];assert slice16(parts[span['partIndex']]['text'],span['start'],span['end'])==span['literal'];a,b,u=quantity(span['literal']);assert (a,b,u)==(q['min'],q['max'],q['unit']),(r['legacyId'],span)
   if 'count'in n:
    q=n['count'];span=q['source'];m=re.fullmatch(r'(\d+)(?:\s*[–-]\s*(\d+))?\s*[x×]\s*',span['literal']);assert m;assert (int(m[1]),int(m[2]or m[1]))==(q['min'],q['max'])
   for child in n.get('children',[]):walk(child)
  for n in r['nodes']:walk(n)
  if r['classification']!='complete':continue
  try:
   assert not r['unknowns'];assert r['witness']is not None
   def bounds(n):
    if n['kind']=='time':return n['quantity']['min'],n['quantity']['max']
    if n['kind']=='optional':assert 'optionnel'in n['text'].lower();return bounds(n['children'][0])
    if n['kind']=='repeat':assert n['restPolicy']=='explicit_inside_repeat';lo,hi=seq(n['children']);return lo*n['count']['min'],hi*n['count']['max']
    if n['kind']=='sequence':return seq(n['children'])
    raise AssertionError(('not_timed',n['kind']))
   def seq(nodes):
    allbounds=[bounds(n)for n in nodes];return sum(a for a,b in allbounds),sum(b for a,b in allbounds)
   core=[n for n in r['nodes']if n['kind']!='integrated'];lo,hi=seq(core);assert r['elapsedSeconds']=={'min':lo,'max':hi}
   assignments=r['witness']['assignment'];cursor=0;shared_values={}
   for a in assignments:
    if 'seconds'in a:
     key=json.dumps(a['source'],sort_keys=True)
     if key in shared_values:assert shared_values[key]==a['seconds'],'nonuniform_repeated_source_parameter'
     shared_values[key]=a['seconds']
   def execute(n):
    nonlocal cursor
    if n['kind']=='time':
     a=assignments[cursor];cursor+=1;q=n['quantity'];assert a['source']==q['source'];assert q['min']<=a['seconds']<=q['max'];assert a['range']==[q['min'],q['max']];return a['seconds']
    if n['kind']=='optional':assert assignments[cursor]['optionalIncluded']is True;cursor+=1;return execute(n['children'][0])
    if n['kind']=='repeat':
     a=assignments[cursor];cursor+=1;assert a['source']==n['count']['source'];k=a['repetitions'];assert isinstance(k,int)and n['count']['min']<=k<=n['count']['max'];return sum(execute(x)for _ in range(k)for x in n['children'])
    return sum(execute(x)for x in n['children'])
   total=sum(execute(n)for n in core);assert cursor==len(assignments);assert lo<=total<=hi;assert total==r['witness']['seconds'];ad=r['advertisedMinutes'];assert ad[0]*60<=total<=ad[1]*60
   # Independently verify whole-part preservation and coverage; all extra material remains on nodes or annotations.
   for n in r['nodes']:assert n['text']==parts[n['partIndex']]['text'].strip();assert n['declaredPartZones']==parts[n['partIndex']]['zones']
   if any(n['kind']=='integrated'for n in r['nodes']):
    assert r['legacyId']=='SEILER_BIKE_Z1_LONG';assert len(core)==1;assert lo>=30*60;assert all(n['text'].startswith('Intégré')for n in r['nodes']if n['kind']=='integrated')
   checked.append({'id':r['legacyId'],'seconds':total,'bounds':[lo,hi],'sourceSpansPass':True,'independentArithmeticPass':True,'individualAdmission':False})
  except AssertionError as e:fail.append({'id':r['legacyId'],'error':str(e)})
 return{'version':'v17-independent-python-1','sourceRecords':len(cards),'completeChecked':len(checked)+len(fail),'passed':len(checked),'failures':fail,'witnesses':checked,'checks':['canonical_hash','all_source_parts_accounted_for','exact_UTF16_source_spans','source_literals_reparsed_with_fraction_arithmetic','repeat_counts_and_closed_recovery_structure','independent_range_sums','independent_witness_expansion','advertised_duration_intersection','verbatim_zones_and_instructions'],'notAttested':['physiological_individual_admissibility','goal_variant_execution','time_in_intensity_domains','fatigue_response','expert_review']}
if __name__=='__main__':
 source=pathlib.Path(sys.argv[1]if len(sys.argv)>1 else'docs/det-engine/v17/evidence/candidate-2');r=audit(load('docs/det-engine/v16/evidence/final/canonical.jsonl.gz'),load(source/'recipes.jsonl.gz'));out=pathlib.Path(sys.argv[2]if len(sys.argv)>2 else str(source/'independent-audit.json'));assert not out.exists(),'NO_OVERWRITE';out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:v for k,v in r.items()if k!='witnesses'}));sys.exit(bool(r['failures']))
