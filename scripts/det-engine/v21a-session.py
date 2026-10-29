"""Fixed V21A budget; no invocation of closed V2–V20 controllers."""
import datetime, hashlib, json, pathlib
ROOT = pathlib.Path('docs/det-engine/v21a')
def sha(data): return hashlib.sha256(data).hexdigest()
def load(p): return json.loads(pathlib.Path(p).read_text())
def save(p, data):
    p = pathlib.Path(p); tmp = p.with_suffix(p.suffix + '.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n'); tmp.replace(p)
def guard():
    s = load(ROOT/'state.json')
    now = datetime.datetime.now(datetime.timezone.utc)
    start = datetime.datetime.fromisoformat(s['startedAt'].replace('Z','+00:00'))
    end = datetime.datetime.fromisoformat(s['hardDeadline'].replace('Z','+00:00'))
    assert (end-start).total_seconds() == 3600 and s['maxUnits'] == 10
    assert not s['budgetRenewal'] and not s['automaticRestart']
    assert now < end and s['status'] == 'in_progress_no_go' and len(s['units']) <= 10
    assert pathlib.Path('.git/HEAD').read_text().strip() == 'ref: refs/heads/experiment/det-engine'
    return s
def preserve():
    files = load(ROOT/'baseline-files.json')
    for p,h in files.items(): assert pathlib.Path(p).is_file() and sha(pathlib.Path(p).read_bytes()) == h, p
    return len(files)
def unit(name, evidence):
    s = guard(); assert len(s['units']) < 10
    s['units'].append({'unit':len(s['units'])+1,'name':name,'status':'completed',
      'evidence':evidence,'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
    save(ROOT/'state.json',s)
