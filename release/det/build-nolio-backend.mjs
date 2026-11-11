import {readFile,mkdir,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const target=process.argv[2] && path.resolve(process.argv[2]);
if(!target || target===root || target.startsWith(path.join(root,'supabase')+path.sep))throw Error('Précisez un dossier de distribution distinct des sources Supabase.');
const supabase=path.join(root,'supabase');
const entries=[['nolio-v2-connect','det-nolio-connect'],['nolio-v2-oauth-callback','det-nolio-callback'],['det-nolio-export','det-nolio-export']];
// Isolate OAuth states, grants, mappings, ledger tables and RPCs from the existing 2.1 Nolio connection.
function namespaced(text){return text.replaceAll('nolio_v2_', 'det_nolio_v2_').replaceAll('nolio-v2-oauth-callback','det-nolio-callback')
  .replaceAll('https://tfclab.lovable.app','https://tfcl.twoforcoaching.be');}
async function write(relative,text){const into=path.join(target,'supabase',relative);await mkdir(path.dirname(into),{recursive:true});await writeFile(into,text);}
for(const [source,destination] of entries){
  for(const file of await readdir(path.join(supabase,'functions',source))){
    if(file.endsWith('.ts') && !file.endsWith('.test.ts'))await write(path.join('functions',destination,file),namespaced(await readFile(path.join(supabase,'functions',source,file),'utf8')));
  }
}
for(const file of await readdir(path.join(supabase,'functions/_shared/nolioV2'))){
  if(file.endsWith('.ts'))await write(path.join('functions/_shared/nolioV2',file),namespaced(await readFile(path.join(supabase,'functions/_shared/nolioV2',file),'utf8')));
}
const sql=await readFile(path.join(supabase,'migrations/20261108220000_nolio_v2_production.sql'),'utf8');
await write('migrations/20261111010000_det_nolio_export.sql',namespaced(sql));
await write('config.toml','project_id = "tfclab-det-nolio"\n\n[functions.det-nolio-callback]\nverify_jwt = false\n');
console.log('Services prêts pour le compte coach, le callback Nolio et l’export DET.');
