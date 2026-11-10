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
// The DET calculation binds one snapshot and one ordered diagnosis to one athlete.
window.localStorage.removeItem('tfcl_ai_multi_plan');
async function start() {
  let stage = 'configuration publique';
  try {
    await loadHostConfig();
    stage = 'ouverture du formulaire';
    await import('./mount');
  } catch (error) {
    console.error('Initialisation du formulaire DET', stage, error instanceof Error ? error.name + ' ' + error.message : 'Erreur');
    const node = document.getElementById('det-root');
    if (node) node.textContent = 'Le parcours DET ne peut pas démarrer (' + stage + '). Rechargez cette page depuis TFCLab.';
  }
}
void start();
