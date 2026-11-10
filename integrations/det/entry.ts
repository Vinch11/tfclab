import {loadHostConfig} from './host-config';
// In this separate document, the ordinary form may read saved coach settings.
// Only the explicit DET history fields persist. Ordinary form drafts stay in this tab.
function copyOnWrite(base:Storage, rememberHistory:boolean):Storage {
  const remembered=(key:string)=>rememberHistory && key.startsWith('tfcl.det.history.v1.');
  const own=new Map<string,string|null>();
  let cleared=false;
  const keys=()=>[...new Set([...(cleared?[]:Object.keys(base)),...own.keys()])].filter(k=>!own.has(k)||own.get(k)!==null);
  return {
    get length(){return keys().length;},
    key(index){return keys()[index]??null;},
    getItem(key){return remembered(key) ? base.getItem(key) : own.has(key)?own.get(key)??null:cleared?null:base.getItem(key);},
    setItem(key,value){if(remembered(key))base.setItem(key,value);else own.set(String(key),String(value));},
    removeItem(key){if(remembered(key))base.removeItem(key);else own.set(String(key),null);},
    clear(){own.clear();cleared=true;},
  };
}
for(const name of ['localStorage','sessionStorage'] as const)
  Object.defineProperty(window,name,{value:copyOnWrite(window[name],name==='localStorage'),configurable:false});
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
