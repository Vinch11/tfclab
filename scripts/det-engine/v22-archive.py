"""Idempotent lossless compression of this session's bulky result snapshots only."""
import datetime,gzip,hashlib,importlib.util,json,pathlib
p=pathlib.Path(__file__).with_name('v22-session.py');s=importlib.util.spec_from_file_location('session',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);m.guard()
R=m.ROOT;manifest=R/'evidence/result-archives.json';previous=m.load(manifest)if manifest.exists()else[];entries={x['originalPath']:x for x in previous}
for p in sorted((R/'evidence').rglob('results.json')):
 if p==R/'evidence/baseline-1/results.json':continue # immutable golden file consumed by default-regression tests
 raw=p.read_bytes();out=p.with_suffix('.json.gz');digest=hashlib.sha256(raw).hexdigest()
 if out.exists():assert gzip.decompress(out.read_bytes())==raw
 else:out.write_bytes(gzip.compress(raw,compresslevel=6,mtime=0))
 assert gzip.decompress(out.read_bytes())==raw
 entries[str(p)]={'originalPath':str(p),'archivePath':str(out),'uncompressedSha256':digest,'uncompressedBytes':len(raw),'compressedBytes':out.stat().st_size,'originalBytesPreserved':True}
 p.unlink()
m.save(manifest,list(entries.values()));print(json.dumps({'archivedSnapshots':len(entries),'uncompressedBytesPreserved':sum(x['uncompressedBytes']for x in entries.values()),'compressedBytes':sum(x['compressedBytes']for x in entries.values())}))
