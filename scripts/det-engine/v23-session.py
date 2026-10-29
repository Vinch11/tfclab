"""V23 single mandate, 60 minutes / 10 units, no closed-controller restart."""
import datetime,hashlib,json,pathlib,subprocess
ROOT=pathlib.Path('docs/det-engine/v23');MUTABLE_ENGINE={'experimental/det-engine/v14-calendar.ts','experimental/det-engine/v22-prescription.ts'}
def load(p):return json.loads(pathlib.Path(p).read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def save(p,x):pathlib.Path(p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def guard():
 s=load(ROOT/'state.json');a=datetime.datetime.fromisoformat(s['startedAt'].replace('Z','+00:00'));b=datetime.datetime.fromisoformat(s['hardDeadline'].replace('Z','+00:00'))
 assert(b-a).total_seconds()==3600 and s['maxUnits']==10 and len(s['units'])<=10 and not s['automaticRestart']and not s['budgetRenewal']
 assert datetime.datetime.now(datetime.timezone.utc)<b and s['status']=='in_progress_no_go';assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='experiment/det-engine';return s
def preserve():
 files=load(ROOT/'baseline-files.json');changed=[]
 for p,h in files.items():
  assert pathlib.Path(p).is_file(),p
  if sha(pathlib.Path(p).read_bytes())!=h:changed.append(p)
 assert set(changed)<=MUTABLE_ENGINE,changed
 return{'oldFiles':len(files),'unchanged':len(files)-len(changed),'experimentalExtensions':changed,'historicalArchivesUnchanged':True}
