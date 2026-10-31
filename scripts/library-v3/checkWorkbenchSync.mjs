// TFCLab V3.1 — invariant for the standalone coach workbench.
// The HTML contains a fully offline snapshot; never allow that snapshot to
// silently drift from the 400 signed-off candidate sources.
import {readFileSync} from 'node:fs';

const root='scripts/library-v3/';
const names=[
 'v3PilotCatalogue.json','v3BikeExpansion.json','v3RunExpansion.json',
 'v3SwimExpansion.json','v3StrengthExpansion.json',
];
const source=names.flatMap(file=>JSON.parse(readFileSync(root+file,'utf8')).workouts);
const html=readFileSync(root+'coach-workbench.html','utf8');
const found=/<script type="application\/json" id="catalogueData">([\s\S]*?)<\/script>/.exec(html);
if(!found)throw Error('V31_WORKBENCH_DATASET_MISSING');
const embedded=JSON.parse(found[1]);
if(embedded.version!=='3.1.0-workbench')throw Error('V31_WORKBENCH_VERSION_MISMATCH');
if(source.length!==400||embedded.workouts.length!==400)throw Error('V31_WORKBENCH_COUNT');
const expected=new Map(source.map(w=>[w.id,w]));
if(expected.size!==400)throw Error('V31_DUPLICATE_SOURCE_ID');
for(const w of embedded.workouts){
 const original=expected.get(w.id);
 if(!original)throw Error('V31_UNKNOWN_WORKBENCH_WORKOUT:'+w.id);
 if(JSON.stringify(w)!==JSON.stringify(original))
  throw Error('V31_WORKBENCH_SOURCE_MISMATCH:'+w.id);
 expected.delete(w.id);
}
if(expected.size!==0)throw Error('V31_MISSING_WORKBENCH_IDS:'+expected.size);
console.info('V31_WORKBENCH_SOURCE_SYNC_OK: 400/400 exact source records');
