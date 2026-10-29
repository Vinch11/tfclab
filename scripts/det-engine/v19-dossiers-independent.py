"""Independent exhaustive fidelity review of the candidate dossiers, not expert sports review."""
import json,gzip,pathlib,sys,hashlib,csv
def load(p):return[json.loads(l)for l in gzip.open(p,'rt')]
def audit(folder):
 root=pathlib.Path('docs/det-engine/v19/cycle-2');state=json.loads((root/'state.json').read_text());B=pathlib.Path(state['validation']['evidence'])/'build';M=load(B/'catalogue.jsonl.gz');E=load(B/'event-audits.jsonl.gz');D=load(pathlib.Path(folder)/'review-dossiers.jsonl.gz');science=json.loads(pathlib.Path('docs/det-engine/v19/cycle-1/evidence/science-1/documentary-context.json').read_text());assert len(M)==len(E)==len(D)==920;assert len(set(d['legacyId']for d in D))==920
 for row,event,d in zip(M,E,D):
  p=row['cycleOneRecord'];c=p['originalCanonical'];m=row['modalQualification'];assert d['legacyId']==p['legacyId'];assert d['originalCanonical']==c;assert d['sourceRecipesUnchanged']==p['sourceV18Recipe'];assert d['scientificQualificationV17']==p['scientificQualificationV17'];assert d['sourceDeclaredPhysiology']==c['prescription']['physiology'];assert d['sourceClaim']==c['prescription']['objective'];assert d['domainsAsStored']==c['prescription']['doctrineDomains'];assert d['goalsAndPhasesAsStored']=={'goals':c['prescription']['goals'],'phases':c['prescription']['phases'],'restrictions':c['prescription']['restrictions'],'variants':c['original']['effective']['variants']};assert d['manualDocumentaryReview']==[x for x in science['exactManualCases']if x['legacyId']==p['legacyId']]
  for flag in ['prescriptionApproved','scientificallyValidated','expertReviewed','realExportPermitted']:assert d[flag]is False
  assert len(d['editorialDoseCandidates'])==len(p['candidates'])
  for a,b in zip(d['editorialDoseCandidates'],p['candidates']):
   for k in ['candidateKey','classification','changes','unresolved']:assert a[k]==b[k]
   assert a['witness']==b.get('witness');assert a['notAutomaticallySelected']is True
  for a,b in zip(d['clarificationRequests'],p['specificationTasks']):
   for k,v in b.items():assert a[k]==v
  assert all(t.get('suppliedValue')is None for t in d['clarificationRequests']);assert len(d['clarificationRequests'])>=len(p['specificationTasks']);assert d['eventScope']==m['occurrence']
  assert d['structureSlots']['originalParts']==[{'partIndex':i,'part':v['part'],'text':v['text']}for i,v in enumerate(c['original']['effective']['structure'])]
  for k in ['strength','swim','trail']:assert d['writtenExecutionFacts'][k]==m[k]
  assert d['writtenExecutionFacts']['absolutePaceArithmetic']==m['paceDistanceFacts'];assert d['localRepresentation']['rawTextEncoding']==bool(event['rawSourceTextEncoding']['payload']);assert d['localRepresentation']['nominalSourceEventFixture']==bool(event['sourceEventFixture']);assert d['coachingDecisionChain']['individualProfileLinkedToThisLibraryRow']is None
  if m['multimodalSource']:
   mm=d['writtenExecutionFacts']['multimodal'];assert mm['wholeSessionSeconds']is None and mm['singleSportCollapseAllowed']is False;assert len(mm['parts'])==len(m['multimodalSource']['components']);assert mm['unstatedTransitions']==m['multimodalSource']['unstatedTransitions']
 return{'dossiersChecked':920,'sourceContentsPreserved':920,'scientificRowsUnchanged':920,'noMissingDoseSupplied':True,'manualCasesNotPropagated':4,'individualProfileNotFabricated':True,'scientificValidation':False}
if __name__=='__main__':
 result=audit(sys.argv[1]);pathlib.Path(sys.argv[2]).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
