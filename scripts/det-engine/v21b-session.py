"""A single V21B budget. Closed V2–V21A work units are never invoked."""
import datetime,hashlib,json,pathlib
ROOT=pathlib.Path('docs/det-engine/v21b')
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(pathlib.Path(p).read_text())
def save(p,obj):
    p=pathlib.Path(p);t=p.with_suffix(p.suffix+'.tmp');t.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n');t.replace(p)
def guard():
    s=load(ROOT/'state.json');a=datetime.datetime.fromisoformat(s['startedAt'].replace('Z','+00:00'));b=datetime.datetime.fromisoformat(s['hardDeadline'].replace('Z','+00:00'))
    assert (b-a).total_seconds()==3600 and s['maxUnits']==10 and not s['automaticRestart']and not s['budgetRenewal']
    assert datetime.datetime.now(datetime.timezone.utc)<b and s['status']=='in_progress_no_go'and len(s['units'])<=10
    assert pathlib.Path('.git/HEAD').read_text().strip()=='ref: refs/heads/experiment/det-engine'
    return s
def preserve():
    old=load(ROOT/'baseline-files.json')
    for p,h in old.items():assert pathlib.Path(p).is_file()and sha(pathlib.Path(p).read_bytes())==h,p
    return len(old)
def unit(name,evidence):
    s=guard();assert len(s['units'])<10
    s['units'].append({'unit':len(s['units'])+1,'name':name,'status':'completed','completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'evidence':evidence});save(ROOT/'state.json',s)
