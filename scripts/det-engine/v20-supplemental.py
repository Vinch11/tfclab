"""Independent cohort/context checks, plus adversarial serialization changes rejected."""
import json,gzip,pathlib,re,importlib.util,copy
root=pathlib.Path('docs/det-engine/v20');state=json.loads((root/'state.json').read_text());base=pathlib.Path(state['validation']['evidence'])/'build'
def load(p):return[json.loads(l)for l in gzip.open(p,'rt')]
source={r['legacyId']:r for r in load('docs/det-engine/v19/cycle-1/evidence/validation-2/build/catalogue.jsonl.gz')};contexts=load(root/'evidence/arbitrations-1/contexts.jsonl.gz');review={r['legacyId']:r for r in load(base/'review/review.jsonl.gz')};dossiers=load(root/'coach-dossiers.jsonl.gz');assert len(dossiers)==51 and sum(len(d['variants'])for d in dossiers)==96
for d in dossiers:assert d['originalCanonical']==source[d['legacyId']]['originalCanonical'];assert d['sourceScientificQualification']==source[d['legacyId']]['scientificQualificationV17'];assert d['humanExpertReview']is False
proposals=edits=warm=prefix=0
for r in contexts:
 original=source[r['legacyId']];assert len(r['proposals'])==len(original['candidates'])
 for p,c in zip(r['proposals'],original['candidates']):
  proposals+=1;assert p['candidateKey']==c['candidateKey'];changes=[x for x in c['changes']if x['rule']=='explicit_editorial_final_recovery'];assert len(changes)==len(p['contexts'])
  haswarm=False
  for x,context in zip(changes,p['contexts']):
   node=original['sourceV18Recipe']['nodes'];tokens=re.findall(r'nodes|children|restPolicy|\d+',x['path']);assert tokens.pop(0)=='nodes';assert tokens.pop()=='restPolicy'
   for k in tokens:node=node[int(k)]if k.isdigit()else node[k]
   assert context['sourceRole']==node['role']and context['sourceCount']==node['count'];assert context['sourcePart']==original['originalCanonical']['original']['effective']['structure'][node['partIndex']];assert context['historicalRestPolicy']=='unknown'and context['candidateRestPolicy']==x['after'];edits+=1;haswarm|=context['location']=='before_main_work_or_next_phase'
  warm+=haswarm
 a=next((c for c in review[r['legacyId']]['candidates']if c['variant']=='between_repetitions'),None);b=next((c for c in review[r['legacyId']]['candidates']if c['variant']=='after_each_repetition'),None)
 def mainprefix(c):
  if not c or not c['ledger']:return None
  rows=c['ledger']['rows'];positions=[i for i,x in enumerate(rows)if x['role']=='Main'and not x['recovery']]
  return[{k:x[k]for k in ['seconds','source','role','sourceZones']}for x in rows[:positions[-1]+1]]if positions else None
 A,B=mainprefix(a),mainprefix(b);equal=A is not None and B is not None and A==B;assert r['pairedCompleteScope']['prescribedPrefixIdentical']==equal if 'prescribedPrefixIdentical'in r['pairedCompleteScope']else not equal;prefix+=equal
assert(proposals,edits,warm,prefix)==(418,466,72,37)
spec=importlib.util.spec_from_file_location('v20ind','scripts/det-engine/v20-independent.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);fixtures=load(base/'nolio/fixtures.jsonl.gz');original=next(r for r in fixtures if r['legacyId']=='D_RUN_REGEN');rejected=[]
for name,mutate in [('target_loss',lambda p:p['structured_workout'][0].update(target_type='no_target')),('invented_floor',lambda p:p['structured_workout'][0].update(target_value_min=.5)),('duration',lambda p:p['structured_workout'][0].update(step_duration_value=999)),('instruction_loss',lambda p:p['structured_workout'][0].update(comment='truncated'))]:
 changed=copy.deepcopy(original['result']['payload']);mutate(changed)
 try:module.check_payload(original['sourcePayload'],changed)
 except AssertionError:rejected.append(name)
 else:raise AssertionError('MUTANT_SURVIVED:'+name)
science=load(base/'review/scientific-review.jsonl.gz');result={'proposalContextsChecked':proposals,'sourceRecoveryPolicyEdits':edits,'warmupRecoveryProposalInstances':warm,'sameMainPrefixPairs':prefix,'coachDossiers':51,'completeCandidateVariants':96,'sourceIdsWithExplicitPhysiology':sorted({r['legacyId']for r in science if r['explicitPhysiology']}),'sourceIdsWithVerifiedReferenceMetadataLinks':sorted({r['legacyId']for r in science if r['literature']['verifiedMetadataLinks']}),'adversarialSerializationMutantsRejected':rejected,'scientificValidation':False};out=root/'evidence/supplemental-independent.json';assert not out.exists();out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
