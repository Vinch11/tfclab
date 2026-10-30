import fs from 'node:fs';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {loadV29Data} from './v29-test-data';
export function loadV30Data(){
 const d=loadV29Data(),spec=JSON.parse(fs.readFileSync('docs/det-engine/v30/inputs.json','utf8')),archives:any={};
 for(const[k,p]of Object.entries(spec.sourceArtifacts)as any){const b=fs.readFileSync(p.path);if(createHash('sha256').update(b).digest('hex')!==p.sha256)throw Error('V30_REGISTERED_SOURCE_CHANGED:'+k);if(k!=='catalogue')archives[k]=JSON.parse(zlib.gunzipSync(b).toString());}
 return{...d,v30:{...spec,nativeEvidenceBinding:d.registry.binding('aero_between')},archives};
}
