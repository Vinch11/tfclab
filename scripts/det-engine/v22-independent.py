"""Independent calendar/arithmetic/preservation audit; no engine, solver or TS validator imports."""
import collections,datetime,gzip,hashlib,json,pathlib,re,sys
R=pathlib.Path('docs/det-engine/v22');E=R/'evidence/validation-1'
def raw(p):
 p=pathlib.Path(p)
 if p.exists():return gzip.decompress(p.read_bytes())if p.suffix=='.gz'else p.read_bytes()
 return gzip.decompress(pathlib.Path(str(p)+'.gz').read_bytes())
def load(p):return json.loads(raw(p))
def sha(b):return hashlib.sha256(b).hexdigest()
def lines(p):return[json.loads(l)for l in raw(p).decode().splitlines()if l]
mut={'experimental/det-engine/v10-profiles.ts','experimental/det-engine/v10-allocation.ts','experimental/det-engine/v14-calendar.ts'}
old=load(R/'baseline-files.json');changed=[]
for p,h in old.items():
 assert pathlib.Path(p).is_file(),p
 if sha(pathlib.Path(p).read_bytes())!=h:changed.append(p)
assert set(changed)==mut,changed
mapping=lines('docs/det-engine/v21a/WORKOUT_FAMILY_MAPPING.jsonl');assert len(mapping)==920 and len({r['legacyId']for r in mapping})==920
assert sum(len(r['variants'])for r in mapping)==2425
sources={r['legacyId']:r for r in mapping};original=load(R/'inputs.json');assert sha(raw(R/'inputs.json'))==load(R/'evidence/preregistration.json')['inputSha256']
cohort=lines('docs/det-engine/v20/evidence/validation-2/build/review/scientific-review.jsonl.gz');assert len(cohort)==96 and len({r['legacyId']for r in cohort})==51
assert len(lines('docs/det-engine/v20/evidence/validation-2/build/nolio/fixtures.jsonl.gz'))==15
prior=load('docs/det-engine/v21c/evidence/independent-validation-release.json');assert prior['historicalCasesPreservedByPriorAuditAndHashes']==600 and prior['oldCandidateViewsUnchanged']==418
rows=load(E/'build/prospective/results.json');assert len(rows)==3
registered=load(E/'build/baseline/registered-full-inputs.json');assert registered==load(R/'evidence/baseline-1/registered-full-inputs.json')
assert[{'id':r['id'],'raw':r['rawInput']['raw'],'form':r['rawInput']['form'],'evidence':r['rawInput']['evidence']}for r in rows]==registered
# Read doctrine fractions from the unchanged production source, not copied training constants.
doctrine=pathlib.Path('src/lib/zones/tfclDoctrine.ts').read_text();domains={}
for id in ['recovery','moderate_lt1']:
 segment=re.search(r'id: "'+id+r'"(?P<s>.*?)\n  },',doctrine,re.S)['s'];domains[id]={}
 for sport in ['run','bike']:
  x=re.search(sport+r': \{ min: ([\d.]+), max: ([\d.]+) \}',segment);assert x;domains[id][sport]=tuple(map(float,x.groups()))
def issuecounts(issues):return collections.Counter((i['code'],i.get('week'),i['severity'],i.get('control'))for i in issues if i['severity']in ['warning','error','critical','blocking'])
reports=[];slots_total=0;numeric_targets=0;recovery_scopes=collections.Counter()
for row in rows:
 id=row['id'];a=row['after'];calendar=a['calendar'];plan=calendar['calendar'];assert len(calendar['weeks'])==4 and plan['totalWeeks']==4 and len(plan['weeks'])==4
 assert a['structuralCalendarComplete']and not a['currentlyExecutablePlan']and not a['automaticRelease']and not a['expertReviewed']and not a['scientificIndividualValidation']
 assert a['rawValidation']['technicalProjection']['valid']and not a['historicalControlsPass']
 afterissues=issuecounts(a['rawValidation']['historical']['issues']);beforeissues=issuecounts(row['before']['prefixValidation']['historical']['issues']);assert not(afterissues-beforeissues),(id,afterissues-beforeissues)
 last_longs=[];week_reports=[];states=collections.Counter();source_gate_reasons=collections.Counter();all_keys=set()
 for w,pw in zip(calendar['weeks'],plan['weeks'],strict=True):
  assert w['week']==pw['weekNumber'];week=w['week'];active=[s for s in pw['sessions']if not s.get('isRest')];assert len(active)==len(w['slots'])
  assert set(s['dayIndex']for s in pw['sessions'])==set(range(7))
  assert not w['unassigned']and w['placement']['complete']and len(w['days'])==7
  assert sum(s['minutes']for s in w['slots'])==w['reservedMinutes']<=w['budget']<=original['common']['weeklyHours']*60
  quotas=plan['weeklyQuotas'][str(week)];assert w['budget']==min(quotas['volumeBudget']['maxMinutes'],original['common']['weeklyHours']*60)
  grouped=collections.defaultdict(list);sports=collections.Counter();ids=set()
  for s in w['slots']:
   slots_total+=1;key=s['key'];assert key not in all_keys;all_keys.add(key);sport=s['role']['sport'];sports[sport]+=1
   assert s['card']['id']not in ids;ids.add(s['card']['id']);assert s['day']in original['common']['availableDays'];grouped[s['day']].append(s)
   assert s['minutes']>=s['role']['floor']and s['timing']['necessaryRange'][0]<=s['minutes']<=s['timing']['necessaryRange'][1]
   src=sources[s['card']['id']]['source']['effective'];assert all(p['text']in s['card']['structure']for p in src['structure'])
   assert s['card']['durationMin'][0]<=s['minutes']<=s['card']['durationMin'][1]
   actual=[x for x in active if x['catalogId']==s['card']['id']];assert len(actual)==1;v=actual[0]
   assert v['durationMin']==s['minutes']and v['dayIndex']==s['day']and v['details']==s['card']['structure']and v['title']==s['card']['title']
   assert not s['decision']['operationallyApproved']and not s['decision']['expertReviewed'];states[s['decision']['state']]+=1
   if s['decision']['hardFailures']:assert s['decision']['state']=='not_admissible'
   if s['minutes']>s['role']['currentCapacity']:assert s['decision']['state']!='currently_admissible'and any(c['kind']=='capacity'for c in s['decision']['conditions'])
   if week>1:assert any(c['kind']=='recovery'for c in s['decision']['conditions'])
   if s['role']['kind']=='long':
    day=(week-1)*7+s['day'];assert all(abs(day-prev)>1 for prev in last_longs);last_longs.append(day)
   decision=next(d for d in a['decisions']if d['slotKey']==key);assert decision['sourceInstructionsUnchanged']==src['structure']and not decision['individualPrescriptionApproved']
   gate=decision['canonicalReview'];assert gate is not None and not gate['currentIndividualPrescriptionApproved']and not gate['automaticPrescription'];source_gate_reasons.update(gate['reasons'])
   if gate['goalVariantStatus']=='requires_goal_specific_source_resolution':assert 'objective_variant_requires_explicit_source_resolution'in decision['additionalPending']
   witness=gate['witness']
   if witness is not None:
    assert abs(witness['seconds']-s['minutes']*60)<1e-7
    assert sum(t.get('seconds',0)for t in witness['assignment'])==witness['seconds']
   for t in decision['targets']:
    if t.get('min')is None:continue
    numeric_targets+=1;assert sport in ['run','bike'];domain=domains[t['domain']][sport];anchor=a['refs']['ftpWatts']if sport=='bike'else a['refs']['mlssSpeedKmh'];factor=1 if sport=='bike'else 1/3.6
    assert abs(t['anchor']-anchor)<1e-9 and t['min']>=anchor*domain[0]*factor-1e-8 and t['max']<=anchor*domain[1]*factor+1e-8
    ftp=re.search(r'(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%\s*FTP',s['card']['structure'],re.I)
    if sport=='bike'and t['zone']=='Z2'and ftp:assert t['min']>=anchor*float(ftp[1])/100-1e-8 and t['max']<=anchor*float(ftp[2])/100+1e-8
   if sport in ['swim','strength']:assert not any(t.get('min')is not None for t in decision['targets'])
  for sport in ['swim','bike','run','strength']:assert sports[sport]==quotas['quota'][sport]['min']
  assert all(len(v)<=original['common']['maxDaily']and len({s['role']['sport']for s in v})==len(v)for v in grouped.values())
  rest=7-len(grouped);assert rest>=original['common']['minRest']and 0 not in grouped
  week_reports.append({'week':week,'minutes':w['reservedMinutes'],'budget':w['budget'],'sports':dict(sports),'restDays':rest})
 assert len(a['reassessmentEvents'])==4 and all(e['trainingDose']is None and not e['automaticRelease']for e in a['reassessmentEvents'])
 feedback=row['reassessment'];assert feedback['wholePlanHashBefore']==feedback['wholePlanHashAfter']and not feedback['actualApproval']
 for f in feedback['scenarios']:
  assert not f['planRelease']and not f['capacityGainInferred']and not f['actualHumanReview']
  if f['id']=='adverse':assert f['decision']['state']=='not_admissible'
  if f['id']=='recovered_within_existing_envelope':assert any('ventilateur'in c['id']for c in f['decision']['remaining'])
 if id=='A_aerobic':assert states['not_admissible']==7 and a['status']=='incomplete_or_refused'
 if id=='B_sustainability':assert states['not_admissible']==0 and a['status']=='complete_conditional_candidate'
 if id=='C_uncertain':assert states['not_admissible']==26 and a['stimulusRequests'][0]['status']=='refused_missing_physiological_evidence'
 reports.append({'profile':id,'status':a['status'],'structuralComplete':True,'currentlyExecutable':False,'states':dict(states),'weeks':week_reports,'historicalErrorsBefore':row['before']['prefixValidation']['historical']['blocking'],'historicalErrorsAfter':a['rawValidation']['historical']['blocking'],'historicalWarningsBefore':row['before']['prefixValidation']['historical']['warnings'],'historicalWarningsAfter':a['rawValidation']['historical']['warnings'],'newHistoricalBlockingOrWarnings':0,'canonicalReasons':dict(source_gate_reasons)})
replay={}
for p in sorted((E/'build').rglob('*')):
 if not p.is_file():continue
 relative=p.relative_to(E/'build');logical=str(relative).removesuffix('.gz')
 assert sha(raw(E/'build'/logical))==sha(raw(E/'replay'/logical)),logical;replay[logical]=sha(raw(E/'build'/logical))
assert len(replay)==4 # three results and the full preregistered raw inputs
for p,h in load(E/'source-pins.json').items():assert sha(pathlib.Path(p).read_bytes())==h,p
out={'version':'det-v22-independent-1','independentPass':True,'oldFiles':len(old),'oldUnchanged':len(old)-len(changed),'optInExperimentalSourceChanges':sorted(changed),'archivesV2ThroughV21CIntact':True,'preservedIds':920,'preservedVariants':2425,'historicalCasesPreservedByHashes':600,'priorCandidateChronologies':96,'priorCandidateViews':418,'priorNolioFixtures':15,'profiles':reports,'checkedSlots':slots_total,'numericDomainViewsChecked':numeric_targets,'deterministicLogicalFiles':replay,'expertHumanReviews':0,'actualIndividualDoseApprovals':0,'fullIronmanReadiness':False,'noNewHistoricalCriticalOrWarnings':True}
p=pathlib.Path(sys.argv[1]);assert not p.exists();p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'independentPass':True,'checkedSlots':slots_total,'numericDomainViews':numeric_targets,'replayFiles':len(replay),'oldUnchanged':len(old)-len(changed)}))
