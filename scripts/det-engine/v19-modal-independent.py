"""Independent Python audit of source facts, not a scientific qualification engine."""
import gzip,json,pathlib,sys,hashlib,re,importlib.util,copy
spec=importlib.util.spec_from_file_location('independent','scripts/det-engine/v19-independent-audit.py');ind=importlib.util.module_from_spec(spec);spec.loader.exec_module(ind)
def load(p):return[json.loads(l)for l in gzip.open(p,'rt')]
def source_span(parts,s):
 assert ind.slice16(parts[s['partIndex']]['text'],s['start'],s['end'])==s['literal'],('SOURCE_SPAN',s)
def quantity(parts,q):
 source_span(parts,q['source']);a,b,u=ind.quantity(q['source']['literal']);assert(a,b,u)==(q['min'],q['max'],q['unit']),('SOURCE_QUANTITY',q)
def check(record,event,prior,output):
 assert record['cycleOneRecord']==prior,'CYCLE_ONE_CHANGED'
 m=record['modalQualification'];parts=prior['originalCanonical']['original']['effective']['structure'];assert record['legacyId']==event['legacyId']==prior['legacyId'];assert m['scientificPromotion']is False
 assert m['multimodalSource']==prior['executionModels']['multimodal']
 assert bool(m['strength'])==bool(prior['executionModels']['strength'])and bool(m['swim'])==bool(prior['executionModels']['swim'])
 strength=m['strength']
 if strength:
  assert strength['wholeWorkoutElapsedSeconds']is None
  assert len(strength['blocks'])==len(prior['executionModels']['strength']['blocks'])
  for b,old in zip(strength['blocks'],prior['executionModels']['strength']['blocks']):
   assert b['instructions']==old['instructions']and b['source']==old['source'];assert b['elapsedWorkoutSeconds']is None and b['individualLoad']is None and b['heartRateAsMuscleLoad']is False
   for f in b['primaryHeadingDoses']:
    source_span(parts,f['source']);hit=re.fullmatch(r'(\d+)(?:[–-](\d+))?\s*[x×]\s*(\d+)(?:[–-](\d+))?',f['source']['literal']);assert hit
    a,bn,c,d=hit.groups();assert f['sets']=={'min':int(a),'max':int(bn or a)}and f['reps']=={'min':int(c),'max':int(d or c)};assert f['derivedRepetitionCount']=={'min':int(a)*int(c),'max':int(bn or a)*int(d or c)}
   for f in b['timedSets']:
    source_span(parts,f['countSource']);quantity(parts,f['secondsPerSet']);hit=re.fullmatch(r'(\d+)(?:[–-](\d+))?\s*[x×]\s*',f['countSource']['literal']);assert hit
    lo,hi=map(int,[hit[1],hit[2]or hit[1]]);assert f['sets']=={'min':lo,'max':hi};assert f['derivedTimedActivityExposureSeconds']=={'min':lo*f['secondsPerSet']['min'],'max':hi*f['secondsPerSet']['max']};assert f['notWholeWorkoutElapsedTime']is True
   for f in b['restFacts']:
    source_span(parts,f['marker'])
    if f['quantity']:quantity(parts,f['quantity'])
    assert f['restNotSetToZero']is True
 for f in m['paceDistanceFacts']:
  source_span(parts,f['source']);h=re.search(r"(\d+(?:[.,]\d+)?)\s*(km|m)\b.*?\(\s*(\d+)['’](\d{1,2})\s*[–-]\s*(\d+)['’](\d{1,2})\s*/\s*km",f['source']['literal']);assert h
  distance=float(h[1].replace(',','.'))*(1000 if h[2]=='km'else 1);a=int(h[3])*60+int(h[4]);b=int(h[5])*60+int(h[6]);assert f['meters']==distance and f['secondsPerKm']=={'min':a,'max':b};assert f['derivedSecondsPerWrittenDistance']=={'min':distance/1000*a,'max':distance/1000*b}
 trail=m['trail']
 if trail:
  assert trail['individualVerticalTolerance']is None and trail['individualEccentricTolerance']is None and trail['dMinusNotInferredFromDPlus']is True
  for f in trail['descentFacts']:
   source_span(parts,f['countSource']);quantity(parts,f['secondsPerDescent']);h=re.fullmatch(r'(\d+)(?:\s*[–-]\s*(\d+))?\s+descentes?\s+',f['countSource']['literal'],re.I);assert h;lo,hi=int(h[1]),int(h[2]or h[1]);assert f['count']=={'min':lo,'max':hi};assert f['derivedDescentExposureSeconds']=={'min':lo*f['secondsPerDescent']['min'],'max':hi*f['secondsPerDescent']['max']};assert f['verticalMetersUnknown']and f['returnAscentDurationUnknown']
  for f in trail['verticalFacts']:
   source_span(parts,f['source']);lit=f['source']['literal'];assert ('D+'in lit)==(f['kind']=='dPlus');nums=[float(n.replace(',','.'))for n in re.findall(r'\d+(?:[.,]\d+)?',lit)];assert f['meters']=={'min':nums[0],'max':nums[-1]}
 swim=m['swim']
 if swim:
  assert swim['individualTimeAttested']is False and swim['cssTransferAcrossStrokesAllowed']is False
  def inspect(nodes):
   flat=list(ind.flatten(nodes));return any(n['kind']=='distance'for n in flat)and all(n['kind']in['distance','time','repeat','sequence','annotation']for n in flat)and not any(n['kind']=='repeat'and n['restPolicy']=='unknown'for n in flat)
  assert swim['sourceDistanceStructureComplete']==(inspect(prior['sourceV18Recipe']['nodes'])and all(u=='individual_elapsed_time_for_distance_unknown'for u in prior['sourceV18Recipe']['unknowns']))
  assert len(swim['candidateStructures'])==len(prior['candidates']);assert swim['strokeAndDrillEvidence']==prior['executionModels']['swim']
  for c,p in zip(swim['candidateStructures'],prior['candidates']):
   assert c['structureComplete']==(inspect(p['nodes'])and all(u=='individual_elapsed_time_for_distance_unknown'for u in p['unresolved']));assert c['individualElapsedSeconds']is None
  def expected_distance_facts(nodes):
   result=[]
   def visit(n,low=1,high=1,path='nodes',known=True):
    kind=n['kind']
    if kind=='distance':result.append({'quantity':n['quantity'],'role':n['role'],'sport':n['sport'],'occurrences':{'min':low,'max':high}if known else None,'sourcePath':path,'derivedDeclaredDistance':{'min':n['quantity']['min']*low,'max':n['quantity']['max']*high}if known else None,'actualSwumDistanceNotAttested':True});return
    for i,ch in enumerate(n.get('children',[])):
     if kind=='alternative':visit(ch,low,high,path+'.alternative['+str(i)+']',False)
     elif kind=='repeat':
      minus=int(n['restPolicy']=='between_only'and i>0);visit(ch,low*(n['count']['min']-minus),high*(n['count']['max']-minus),path+'.repeat['+str(i)+']',known and not(n['restPolicy']=='unknown'and i>0))
     else:visit(ch,low,high,path+'.children['+str(i)+']',known)
   for i,n in enumerate(nodes):visit(n,path='nodes['+str(i)+']')
   return result
  assert swim['sourceDistanceFacts']==expected_distance_facts(prior['sourceV18Recipe']['nodes'])
  for c,p in zip(swim['candidateStructures'],prior['candidates']):assert c['distanceFacts']==expected_distance_facts(p['nodes'])
  for facts in [swim['sourceDistanceFacts']]+[c['distanceFacts']for c in swim['candidateStructures']]:
   for f in facts:
    quantity(parts,f['quantity']);occ=f['occurrences'];assert f['derivedDeclaredDistance']==({'min':f['quantity']['min']*occ['min'],'max':f['quantity']['max']*occ['max']}if occ else None)
 for e in m['occurrence']['explicitActionEvidence']:source_span(parts,e['source'])
 annotations={a['partIndex']for a in prior['sourceV18Recipe']['annotations']};weekdays=set();jdays=set();bouts=set()
 for i,p in enumerate(parts):
  if i in annotations:continue
  text=p['text'];weekdays.update(x.lower()for x in re.findall(r'\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*(?:matin|soir)?\s*:',text,re.I));jdays.update(x.replace('−','-')for x in re.findall(r'\bJ\s*([−-]?\d+)\s*(?:matin|soir)?\s*(?:\([^)]*\))?\s*:',text,re.I));bouts.update('morning'if x.upper()in['AM','MATIN']else'evening'for x in re.findall(r'\b(AM|PM|MATIN|SOIR)(?:\s+session)?\s*(?:\([^)]*\))?\s*:',text,re.I))
 stages=[p['part']for p in parts if re.match(r'^(?:Post-Étape|Pré-Étape)',p['part'],re.I)];multiple=len(stages)>1 or len(weekdays)>1 or len(jdays)>1 or len(bouts)>1;assert m['occurrence']['needsCalendarScopeReview']==multiple;assert m['occurrence']['explicitStagePartNames']==stages
 blocked=m['occurrence']['needsCalendarScopeReview']or m['occurrence']['unresolvedSourceInstruction']or prior['originalCanonical']['prescription']['discipline']in['brick','mixed']
 assert event['rawSourceTextEncoding']==output['sourceTextEncoding'];assert event['realSyncPermitted']is False and event['syntheticOnly']is True
 assert event['sourceEventFixture']==(None if blocked or prior['sourceV18Recipe']['classification']!='complete'else output['sourceTextEncoding']['payload'])
 assert event['sourceStructuredFixture']==(None if blocked else output['sourceStructured']['payload'])
 for a,b in zip(event['candidateEventFixtures'],output['candidates']):assert a['payload']==(None if blocked else b['text']['payload'])
def audit(directory,mutations=False):
 d=pathlib.Path(directory);state=json.loads(pathlib.Path('docs/det-engine/v19/cycle-1/state.json').read_text());base=pathlib.Path(state['validation']['evidence'])/'build';old=load(base/'catalogue.jsonl.gz');outputs=load(base/'outputs.jsonl.gz');rows=load(d/'catalogue.jsonl.gz');events=load(d/'event-audits.jsonl.gz');assert len(rows)==len(events)==len(old)==len(outputs)==920;assert len(set(r['legacyId']for r in rows))==920
 for args in zip(rows,events,old,outputs):check(*args)
 rejected=[]
 if mutations:
  probes=[('immutable_source',lambda r,e:r['cycleOneRecord'].update(legacyId='tampered')),
   ('scientific_promotion',lambda r,e:r['modalQualification'].update(scientificPromotion=True)),
   ('real_sync',lambda r,e:e.update(realSyncPermitted=True))]
  for name,mut in probes:
   r,e=copy.deepcopy(rows[0]),copy.deepcopy(events[0]);mut(r,e)
   try:check(r,e,old[0],outputs[0])
   except AssertionError:rejected.append(name)
   else:raise AssertionError('MUTANT_NOT_REJECTED:'+name)
  for key,modify in [('strength',lambda m:m['blocks'][0].update(elapsedWorkoutSeconds=60)),('trail',lambda m:m.update(individualEccentricTolerance='invented')),('swim',lambda m:m.update(individualTimeAttested=True))]:
   i=next(i for i,r in enumerate(rows)if r['modalQualification'][key]);r,e=copy.deepcopy(rows[i]),copy.deepcopy(events[i]);modify(r['modalQualification'][key])
   try:check(r,e,old[i],outputs[i])
   except AssertionError:rejected.append(key+'_fabrication')
   else:raise AssertionError('MUTANT_NOT_REJECTED:'+key)
  probes=[('deleted_strength_model',lambda r:r['modalQualification'].update(strength=None),lambda r:r['modalQualification']['strength']),
   ('suppressed_multiple_occurrence',lambda r:r['modalQualification']['occurrence'].update(needsCalendarScopeReview=False),lambda r:r['modalQualification']['occurrence']['needsCalendarScopeReview']),
   ('invented_repetition_count',lambda r:next(b for b in r['modalQualification']['strength']['blocks']if b['primaryHeadingDoses'])['primaryHeadingDoses'][0]['derivedRepetitionCount'].update(min=999),lambda r:r['modalQualification']['strength']and any(b['primaryHeadingDoses']for b in r['modalQualification']['strength']['blocks']))]
  for name,mut,find in probes:
   i=next(i for i,r in enumerate(rows)if find(r));r,e=copy.deepcopy(rows[i]),copy.deepcopy(events[i]);mut(r)
   try:check(r,e,old[i],outputs[i])
   except AssertionError:rejected.append(name)
   else:raise AssertionError('MUTANT_NOT_REJECTED:'+name)
 return{'recordsIndependentlyChecked':920,'cycleOneRecordsUnchanged':920,'sourceFactsChecked':True,'scientificValidation':False,'mutationRejections':rejected,'verifier':'Python source spans, quantity parsing, recursive distance occurrences, arithmetic and immutable payload comparison; no JS compiler imported','limits':['source grammar semantics still require human review','calendar action labels remain an editorial scope convention','written protocol is not observed performance']}
if __name__=='__main__':
 result=audit(sys.argv[1],len(sys.argv)>3 and sys.argv[3]=='mutations');pathlib.Path(sys.argv[2]).write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n');print(json.dumps(result))
