import fs from 'node:fs';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {loadCoachFloorData} from './coach-floor-test-data';
import {prepareV23Case} from './v23-cases';
export function loadV26Data(){const d=loadCoachFloorData(),protocolComparisons=JSON.parse(fs.readFileSync('docs/det-engine/v26/evidence/v21c-protocol-index.json','utf8'));
 const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
 if(sha(fs.readFileSync(protocolComparisons.source))!==protocolComparisons.sourceSha256)throw Error('V26_PROTOCOL_SOURCE_CHANGED');
 for(const row of protocolComparisons.rows){const bytes=fs.readFileSync(row.artifact),raw=row.artifact.endsWith('.gz')?zlib.gunzipSync(bytes):bytes;if(sha(raw)!==row.artifactHash)throw Error('V26_PRIMARY_ARTIFACT_CHANGED');}
 return{...d,
 v26:JSON.parse(fs.readFileSync('docs/det-engine/v26/inputs.json','utf8')),
 knowledge:{...JSON.parse(fs.readFileSync('docs/det-engine/v21b/FAMILY_KNOWLEDGE_BASE.json','utf8')),protocolComparisons},
 previous:JSON.parse(zlib.gunzipSync(fs.readFileSync('docs/det-engine/v25-coach-floor/evidence/validation-1/build/results.json.gz')).toString()),
 };}
export function sensitivityV26(d:ReturnType<typeof loadV26Data>,test:any){
 const registered=structuredClone(d.cases.find((c:any)=>c.id===test.seed));if(!registered)throw Error('UNKNOWN_SEED');
 const spec=structuredClone(d.a),delta=test.delta;
 if(delta.weeklyHours){registered.input.form.weeklyHours=delta.weeklyHours;spec.common.weeklyHours=delta.weeklyHours;}
 if(delta.availableDays){spec.common.availableDays=delta.availableDays;registered.input.form.constraints='Synthetic V26 sensitivity: Tuesday unavailable; Wednesday to Sunday only; Monday rest; same maximum two sessions per day.';}
 const v=prepareV23Case(registered,spec);if(delta.longBikeCapacity)v.profile.longCaps.bike=delta.longBikeCapacity;
 if(delta.recoveryReport)v.counterfactual={...(v.counterfactual??{}),v26FavorableReport:delta.recoveryReport};
 const knowledge=structuredClone(d.knowledge);if(delta.removeScientificContext)knowledge.families=knowledge.families.filter((f:any)=>f.familyId!==delta.removeScientificContext);
 return{v,spec,knowledge};
}
