import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
export const ROOT=path.resolve(import.meta.dirname,'../..');
export const sha=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x));
/** Offline module evaluator: repository TypeScript only, no network/process bindings. */
export function extractLibrary(root=ROOT){
 const cache=new Map(), snapshots=new Map(), dependencies=[];
 const context=vm.createContext({console:new Proxy({}, {get:()=>()=>{}}),__v16Raw:null});
 function load(file){file=path.resolve(file);if(!file.startsWith(root+'/src/')&&!file.startsWith(root+'/supabase/functions/_shared/'))throw Error('NON_SOURCE_IMPORT:'+file);if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;
  const original=fs.readFileSync(file,'utf8');let code=original;
  if(file.endsWith('/workoutLibrary.ts')){if((code.match(/enrichWorkoutGoals\(WorkoutLibrary\);/g)||[]).length!==1)throw Error('CAPTURE_POINT_CHANGED');code=code.replace('enrichWorkoutGoals(WorkoutLibrary);','globalThis.__v16Raw = JSON.parse(JSON.stringify(WorkoutLibrary)); enrichWorkoutGoals(WorkoutLibrary);');}
  const result=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};cache.set(file,mod);dependencies.push({path:path.relative(root,file),sha256:sha(original)});
  const req=specifier=>{if(!specifier.startsWith('.')&&!specifier.startsWith('@/'))throw Error('EXTERNAL_MODULE_FORBIDDEN:'+specifier);return load(specifier.startsWith('@/')?path.join(root,'src',specifier.slice(2)):path.resolve(path.dirname(file),specifier));};
  context.__module=mod;context.__require=req;
  new vm.Script(`(function(require,module,exports){${result}\n})(__require,__module,__module.exports)`,{filename:file}).runInContext(context,{timeout:5000});
  snapshots.set(file,copy(Object.fromEntries(Object.entries(mod.exports).filter(([,v])=>Array.isArray(v)))));return mod.exports;
 }
 const entry=path.join(root,'src/lib/workoutLibrary.ts'), exported=load(entry), raw=copy(context.__v16Raw), effective=copy(exported.WorkoutLibrary);
 const source=fs.readFileSync(entry,'utf8');const imports=[...source.matchAll(/import\s*\{\s*(\w+)\s*\}\s*from\s*["'](\.\/[^"']+)["'];\s*WorkoutLibrary\.push\(\.\.\.\1\);/g)].map(m=>({export:m[1],file:path.resolve(path.dirname(entry),m[2]+'.ts')}));
 const groups=imports.map(i=>({...i,items:snapshots.get(i.file)?.[i.export]}));if(groups.some(g=>!g.items))throw Error('SOURCE_ARRAY_NOT_FOUND');
 const proCount=exported.ProPackWorkouts.length,baseCount=raw.length-proCount-groups.reduce((n,g)=>n+g.items.length,0);
 const ordered=[{export:'WorkoutLibrary:initial',file:entry,items:raw.slice(0,baseCount)},{export:'ProPackWorkouts',file:entry,items:raw.slice(baseCount,baseCount+proCount)},...groups];
 let offset=0;const occurrences=[];for(const g of ordered){g.items.forEach((item,index)=>{if(JSON.stringify(raw[offset])!==JSON.stringify(item))throw Error('ORDER_OR_RAW_MISMATCH:'+offset);occurrences.push({index:offset,legacyId:item.id,source:{file:path.relative(root,g.file),export:g.export,index,sha256:sha(fs.readFileSync(g.file))},raw:item,effective:effective[offset]});offset++;});}
 if(offset!==effective.length||source.match(/WorkoutLibrary\.push\(/g).length!==imports.length+1)throw Error('AGGREGATION_NOT_EXHAUSTIVE');
 const libraryDefinitions=fs.readdirSync(path.join(root,'src/lib')).filter(f=>f.endsWith('.ts')).flatMap(f=>{const text=fs.readFileSync(path.join(root,'src/lib',f),'utf8');return /(?:export\s+const|const)\s+\w+\s*:\s*LibraryWorkout\[\]/.test(text)?[{file:'src/lib/'+f,inAggregation:ordered.some(g=>path.relative(root,g.file)==='src/lib/'+f)}]:[];});
 return{version:'v16-source-manifest-1',entry:'src/lib/workoutLibrary.ts',totalOccurrences:raw.length,uniqueLegacyIds:new Set(raw.map(w=>w.id)).size,groups:ordered.map(g=>({file:path.relative(root,g.file),export:g.export,count:g.items.length})),dependencies:dependencies.sort((a,b)=>a.path.localeCompare(b.path)),libraryDefinitions,rawDigest:sha(raw),effectiveDigest:sha(effective),occurrences};
}
if(process.argv[1]===new URL(import.meta.url).pathname){const result=extractLibrary();process.stdout.write(JSON.stringify({total:result.totalOccurrences,unique:result.uniqueLegacyIds,groups:result.groups,definitions:result.libraryDefinitions,dependencies:result.dependencies.length},null,2)+'\n');}
