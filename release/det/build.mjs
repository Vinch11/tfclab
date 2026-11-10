import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const folder = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(folder,'../..');
const out = process.argv[2];
if (!out) throw Error('Préciser le dossier de sortie du paquet DET.');
const hash = data => createHash('sha256').update(data).digest('hex');
const marker = 'TFCL_DET_BUILD_CONTENT_IDENTIFIER';
const result = await build({
  absWorkingDir:root, entryPoints:['release/det/worker.ts'], bundle:true, format:'iife',
  platform:'browser', target:'es2022', minify:true, legalComments:'none', write:false,
  tsconfig:'tsconfig.app.json', metafile:true, alias:{'@':path.join(root,'src')},
  plugins:[{name:'vite-raw-json',setup(api){
    api.onResolve({filter:/\.json\?raw$/}, args=>({path:path.resolve(args.resolveDir,args.path.slice(0,-4)),namespace:'det-raw-json'}));
    api.onLoad({filter:/./,namespace:'det-raw-json'},async args=>({contents:await readFile(args.path,'utf8'),loader:'text'}));
  }}],
  define:{__TFCL_DET_VERSION__:JSON.stringify(marker),'import.meta.env.DEV':'false','import.meta.env.PROD':'true'},
});
const inputs=Object.entries(Object.values(result.metafile.outputs)[0].inputs)
  .filter(([,entry])=>entry.bytesInOutput>0).map(([name])=>name);
const forbidden=inputs.filter(x=>/supabase\/functions\/(?:ai-training-plan(?:-test)?\/|nolio-[^/]+\/)|src\/(?:hooks\/useAITrainingPlan\.|integrations\/supabase\/)|supabase-js|planReleaseManifest|node:(?:fs|net|http)/.test(x));
if(forbidden.length)throw Error('Dépendances hors moteur DET : '+forbidden.join(', '));
const original=result.outputFiles[0].text;
if(!original.includes(marker))throw Error('Repère de version DET manquant.');
const version='det-'+hash(original);
const worker=Buffer.from(original.replaceAll(marker,version));
const artifact=gzipSync(worker,{level:9});
const manifest={schema:1,version,entry:'worker.js.gz',encoding:'gzip',bytes:artifact.length,sha256:hash(artifact),workerSha256:hash(worker)};
await mkdir(out,{recursive:true});
await writeFile(path.join(out,manifest.entry),artifact);
await writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(out,'client.mjs'),await readFile(path.join(folder,'client.mjs')));
console.log(JSON.stringify(manifest));
