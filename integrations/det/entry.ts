import {loadHostConfig} from './host-config';
// In this separate document, the ordinary form may read saved coach settings.
// All form drafts and cache writes belong to the pilot tab.
function copyOnWrite(base:Storage):Storage {
  const own=new Map<string,string|null>();
  let cleared=false;
  const keys=()=>[...new Set([...(cleared?[]:Object.keys(base)),...own.keys()])].filter(k=>!own.has(k)||own.get(k)!==null);
  return {
    get length(){return keys().length;},
    key(index){return keys()[index]??null;},
    getItem(key){return own.has(key)?own.get(key)??null:cleared?null:base.getItem(key);},
    setItem(key,value){own.set(String(key),String(value));}, removeItem(key){own.set(String(key),null);},
    clear(){own.clear();cleared=true;},
  };
}
for(const name of ['localStorage','sessionStorage'] as const)
  Object.defineProperty(window,name,{value:copyOnWrite(window[name]),configurable:false});
void loadHostConfig().then(()=>import('./mount')).catch(()=>{const node=document.getElementById('det-root');if(node)node.textContent='Le parcours DET ne peut pas démarrer. Rechargez cette page depuis TFCLab.';});
