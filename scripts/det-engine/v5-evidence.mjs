import{readFileSync,readdirSync,statSync}from'node:fs';import{join}from'node:path';import{createHash}from'node:crypto';
/** Full content snapshot for a completed output directory, including nested raw/replay evidence. */
export function snapshotEvidence(root){const hashes={};function walk(directory,prefix=''){for(const name of readdirSync(directory).sort()){const p=join(directory,name),relative=join(prefix,name);if(statSync(p).isDirectory())walk(p,relative);else hashes[relative]=createHash('sha256').update(readFileSync(p)).digest('hex');}}walk(root);return hashes;}
export function verifyEvidence(root,expected){const actual=snapshotEvidence(root);if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('COMPLETED_STRUCTURED_EVIDENCE_CHANGED');return true;}
