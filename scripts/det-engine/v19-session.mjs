/** Shared hard budget for two finite cycles, not a scheduled or persistent service. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import{assertBudgetContract}from'../../experimental/det-engine/v19-budget.mjs';
export const ROOT='docs/det-engine/v19';
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export function atomicJSON(file,value){const temp=file+'.v19-tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n');fs.renameSync(temp,file);}
export function guard(){const mission=readJSON(ROOT+'/state.json'),cycle=readJSON(`${ROOT}/cycle-${mission.currentCycle}/state.json`),contract=readJSON(ROOT+'/budget-contract.json');const budget=assertBudgetContract(mission,cycle,contract);if(fs.readFileSync('.git/HEAD','utf8').trim()!=='ref: refs/heads/experiment/det-engine')throw Error('V19_EXPERIMENTAL_BRANCH_REQUIRED');return{mission,cycle,budget,dir:`${ROOT}/cycle-${mission.currentCycle}`};}
export function preserve(){const baseline=readJSON(ROOT+'/baseline-files.json');for(const[file,expected]of Object.entries(baseline))if(!fs.existsSync(file)||hash(fs.readFileSync(file))!==expected)throw Error('V19_PREEXISTING_FILE_CHANGED:'+file);return Object.keys(baseline).length;}
export function freshDirectory(out){const{dir}=guard();if(!path.resolve(out).startsWith(path.resolve(dir+'/evidence')+'/')||fs.existsSync(out))throw Error('V19_FRESH_CURRENT_CYCLE_PATH_REQUIRED');fs.mkdirSync(out,{recursive:true});}
export function writeNew(file,value){guard();if(fs.existsSync(file))throw Error('V19_NO_OVERWRITE:'+file);fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');}
