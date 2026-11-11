import {build} from 'vite';
import react from '@vitejs/plugin-react-swc';
import {readFile,writeFile,copyFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {coachView} from './form-view.mjs';
import {checkedPlanRelease} from '../../scripts/preproduction/plan-release-source.mjs';

const folder=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(folder,'../..');
const {info}=await checkedPlanRelease(root);
const dest=process.argv[2];
if(!dest)throw Error('Préciser un dossier dédié de destination.');
const out=path.resolve(dest);
process.chdir(root);
const hash=s=>createHash('sha256').update(s).digest('hex');
const distribution=path.join(root,'public/__det/v1');
const manifest=JSON.parse(await readFile(path.join(distribution,'manifest.json'),'utf8'));
if(!/^det-[a-f0-9]{64}$/.test(manifest.version) || manifest.entry!=='worker.js.gz')throw Error('Manifeste DET illisible.');
const worker=await readFile(path.join(distribution,manifest.entry));
if(worker.length!==manifest.bytes || hash(worker)!==manifest.sha256)throw Error('Le moteur ne correspond pas au manifeste DET.');
const clientHash=hash(await readFile(path.join(distribution,'client.mjs')));
const runtime='runtime/'+manifest.version+'/'+clientHash;

const pilot={
 name:'tfclab-det-coach-form',enforce:'pre',
 transform(code,id){
   // The detached form uses the OS font stack, keeping all feature assets on this origin.
   if(id===path.join(root,'src/index.css'))return code.replace(/^@import\s+url\(["']?https:\/\/fonts\.googleapis\.com\/[^\n]*?["']?\);[^\S\r\n]*$/gm,'');
   if(id===path.join(root,'src/pages/AITrainingPlanPage.tsx'))return coachView(code);
   if(id===path.join(root,'src/integrations/supabase/client.ts'))return 'export {supabase} from "/integrations/det/readClient";';
   if(id===path.join(root,'src/hooks/useAITrainingPlan.ts')){
     // This secondary build never exposes model transport. The original file and default build stay independent.
     const mark='export function useAITrainingPlan(';const at=code.indexOf(mark);
     if(at<0 || code.indexOf('\nexport ',at+mark.length)!==-1)throw Error('Contrat du formulaire TFCLab modifié.');
     return code.slice(0,at)+'export {useDetFormState as useAITrainingPlan} from "/integrations/det/form-state";';
   }
 },
};
const bundle=await build({configFile:false,root,base:'/__det/coach/',publicDir:false,
 plugins:[pilot,react()],resolve:{alias:{'@':path.join(root,'src')}},
 define:{__DET_CLIENT_PATH__:JSON.stringify('/__det/coach/'+runtime+'/client.mjs'),'import.meta.env.VITE_SUPABASE_URL':'undefined','import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':'undefined',__PLAN_RELEASE_INFO__:'null',__APP_VERSION__:JSON.stringify('DET'),__BUILD_TIME__:JSON.stringify(info.releaseId)},
 build:{outDir:out,emptyOutDir:false,rollupOptions:{input:path.join(folder,'coach.html'),
 output:{entryFileNames:'assets/[name]-[hash].mjs',chunkFileNames:'assets/[name]-[hash].mjs'}}},
 logLevel:'warn'});
const html=path.join(out,'integrations/det/coach.html');
await copyFile(html,path.join(out,'index.html'));await rm(html);
const emitted=(Array.isArray(bundle) ? bundle : [bundle]).flatMap(group=>group.output.map(entry=>entry.fileName));
const assets=emitted.filter(name=>name.startsWith('assets/')).map(name=>path.basename(name)).sort();
const hashes=Object.fromEntries(await Promise.all(assets.map(async file=>[file,hash(await readFile(path.join(out,'assets',file)))])));
const runtimeDir=path.join(out,runtime);
await mkdir(runtimeDir,{recursive:true});
for(const name of ['manifest.json','client.mjs',manifest.entry])await copyFile(path.join(distribution,name),path.join(runtimeDir,name));
await writeFile(path.join(out,'host-release.json'),JSON.stringify({upstreamRelease:info.releaseId,assets:hashes,runtime},null,2)+'\n');
