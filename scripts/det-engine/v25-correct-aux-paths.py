"""Version a documentary-only archive-path correction after the final Node validation.

No test, engine, threshold, assertion over results, or archived data is changed.
Original auxiliary sources remain verifiable against the completed Node source pins.
"""
import difflib,hashlib,json,pathlib
R=pathlib.Path('docs/det-engine/v25');E=R/'evidence/validation-3'
def sha(b):return hashlib.sha256(b).hexdigest()
commands=json.loads((E/'commands.json').read_text());assert len(commands)==7 and all(c['status']==0 and not c['error']for c in commands)
pins=json.loads((E/'source-pins.json').read_text())
for p,h in pins.items():assert sha(pathlib.Path(p).read_bytes())==h,('pre_correction_source_changed',p)
paths=['scripts/det-engine/v25-independent.py','scripts/det-engine/v25-final-check.py'];folder=R/'evidence/auxiliary-path-correction';assert not folder.exists();folder.mkdir();manifest={}
old_loop="for p,h in load(E/'source-pins.json').items():assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h,('executed_source_changed',p)"
new_loop="""corrections=load(R/'evidence/auxiliary-path-correction/manifest.json')
assert set(corrections)=={'scripts/det-engine/v25-independent.py','scripts/det-engine/v25-final-check.py'}
for p,h in load(E/'source-pins.json').items():
 if p in corrections:
  c=corrections[p];assert hashlib.sha256(pathlib.Path(c['originalSnapshot']).read_bytes()).hexdigest()==h==c['originalSha256']
  assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==c['correctedSha256']
 else:assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h,('executed_source_changed',p)"""
for p in paths:
 path=pathlib.Path(p);before=path.read_text();after=before.replace('docs/det-engine/v24/evidence/validation-3/','docs/det-engine/v24/evidence/validation-2/').replace('docs/det-engine/v20/evidence/validation-3/','docs/det-engine/v20/evidence/validation-2/')
 assert after!=before
 if p.endswith('v25-final-check.py'):
  assert old_loop in after;after=after.replace(old_loop,new_loop).replace("'sourcePinsUnchanged':True", "'engineAndTestSourcePinsUnchanged':True,'versionedAuxiliaryPathCorrectionsVerified':True")
 snapshot=folder/(path.name+'.before.txt');snapshot.write_text(before);assert sha(snapshot.read_bytes())==pins[p]
 (folder/(path.name+'.diff')).write_text(''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile=p+'@Node-validation-3',tofile=p+'@documentary-path-correction')))
 path.write_text(after);manifest[p]={'originalSnapshot':str(snapshot),'originalSha256':pins[p],'correctedSha256':sha(path.read_bytes()),'scope':'post-validation auxiliary paths and versioned auxiliary-source verification only; TypeScript/runtime/test pins remain checked live'}
(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Two auxiliary verifier revisions saved; no engine, tests, archived files or scientific assertions changed.')
