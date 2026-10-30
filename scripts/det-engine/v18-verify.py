"""Read-only final dossier verification; --record saves a fresh receipt during the open unit 10."""
import pathlib,json,gzip,re,hashlib,csv,subprocess,sys,datetime
D=pathlib.Path('docs/det-engine/v18');s=json.loads((D/'state.json').read_text());baseline=json.loads((D/'baseline-files.json').read_text())
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def load(p):return[json.loads(l)for l in gzip.open(p,'rt')]
for p,h in baseline.items():assert pathlib.Path(p).is_file()and sha(p)==h,('protected',p)
assert subprocess.check_output(['git','branch','--show-current']).decode().strip()=='experiment/det-engine'
changes=subprocess.check_output(['git','status','--porcelain','-uall','-z']).decode().split('\0');paths=[]
for row in changes:
 if not row:continue
 path=row[3:];assert path.startswith(('docs/det-engine/v18/','scripts/det-engine/v18-','experimental/det-engine/v18-'))or path=='experimental/det-engine/vitest.v18.config.ts',path;paths.append(path)
P=pathlib.Path(s['units'][8]['evidence']);summary=json.loads((P/'build/summary.json').read_text());audit=json.loads((P/'independent.json').read_text());assert not audit['failures'];assert audit['completeChecked']==summary['counts']['complete'];assert audit['protectedV17Complete']==summary['preservedV17Complete']==67;assert sum(summary['counts'].values())==summary['sourceRecords']==summary['uniqueIds']==920
for directory in [P/'build',P/'replay']:
 for file,h in json.loads((directory/'checksums.json').read_text()).items():assert sha(directory/file)==h,(directory,file)
replay=json.loads((P/'reproducibility.json').read_text());assert replay['independentReplayIdentical'];assert all(x['identical']for key,v in replay.items()if isinstance(v,list)for x in v)
for cmd in json.loads((P/'commands.json').read_text()):assert cmd['exitCode']==0 and cmd['error']is None and cmd['signal']is None,cmd
C=load('docs/det-engine/v16/evidence/final/canonical.jsonl.gz');Q={q['legacyId']:q for q in load('docs/det-engine/v17/evidence/qualification-final.jsonl.gz')};queue=load(P/'family/review-queue.jsonl.gz');assert len(queue)==920
for c,q in zip(C,queue):assert c['identity']['legacyId']==q['legacyId'];assert q['scientificQualificationV17']==Q[q['legacyId']];assert q['newWorkoutReferenceAttributions']==q['newAdaptationClaims']==[];assert not q['expertReview']and not q['automaticPromotion']
for name,n in [('RECIPES.csv',920),('VARIANTS.csv',2425),('QUALIFICATION_MATRIX.csv',920)]:
 with(D/name).open(newline='')as f:assert len(list(csv.DictReader(f)))==n
links=0
for p in D.rglob('*.md'):
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if target.startswith(('http:','https:','#')):continue
  target=target.split('#')[0]
  if not target:continue
  assert(p.parent/target).exists(),('broken_link',p,target);links+=1
for name in ['source-checksums.json','checksums.json']:
 if not(D/name).exists():continue
 for p,h in json.loads((D/name).read_text()).items():assert sha(p)==h,('changed',p)
# Explicitly reject unreviewed production or irreversible action status.
assert summary['scientificPromotions']==summary['expertReviews']==summary['individualPrescriptionsApproved']==summary['realNolioCalls']==0
receipt={'version':'v18-final-dossier-1','protectedFiles':len(baseline),'allProtectedByteIdentical':True,'sourceRecords':920,'completeGenericTimelines':summary['counts']['complete'],'preservedV17Complete':67,'sourcePartsNewlyStructured':summary['sourcePartsPreviouslyUnknownNowStructured'],'variants':2425,'coachViews':920,'scientificRowsUnchanged':920,'familyReviewBriefs':9,'localMarkdownLinks':links,'changedPathsInExperimentalV18Scope':True,'status':'DRAFT_NO_GO','readOnlyVerification':True}
if'--record'in sys.argv:
 assert s['status']=='in_progress_no_go'and datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(s['deadline'].replace('Z','+00:00'));p=D/'evidence/dossier-verification.json';assert not p.exists();p.write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
