import {build} from 'vite';
import react from '@vitejs/plugin-react-swc';
import {readFile,writeFile,copyFile,rm,readdir} from 'node:fs/promises';
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
const pilot={
 name:'tfclab-det-coach-form',enforce:'pre',
 transform(code,id){
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
await build({configFile:false,root,base:'/__det/coach/',publicDir:false,
 plugins:[pilot,react()],resolve:{alias:{'@':path.join(root,'src')}},
 define:{'import.meta.env.VITE_SUPABASE_URL':'undefined','import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':'undefined',__PLAN_RELEASE_INFO__:'null',__APP_VERSION__:JSON.stringify('DET'),__BUILD_TIME__:JSON.stringify(info.releaseId)},
 build:{outDir:out,emptyOutDir:false,rollupOptions:{input:path.join(folder,'coach.html'),
 output:{entryFileNames:'assets/[name]-[hash].mjs',chunkFileNames:'assets/[name]-[hash].mjs'}}},
 logLevel:'warn'});
const html=path.join(out,'integrations/det/coach.html');
await copyFile(html,path.join(out,'index.html'));await rm(html);
const assets=(await readdir(path.join(out,'assets'))).sort();
const hashes=Object.fromEntries(await Promise.all(assets.map(async file=>[file,hash(await readFile(path.join(out,'assets',file)))])));
await writeFile(path.join(out,'host-release.json'),JSON.stringify({upstreamRelease:info.releaseId,assets:hashes},null,2)+'\n');
