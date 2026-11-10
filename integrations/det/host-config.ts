export type HostConfig = {url:string; key:string};
let current:HostConfig;
export async function loadHostConfig(){
  const r=await fetch('/index.html',{cache:'no-store',credentials:'same-origin'});
  if(!r.ok)throw Error('Configuration TFCLab inaccessible.');
  const page=new DOMParser().parseFromString(await r.text(),'text/html');
  const content=(name:string)=>page.querySelector<HTMLMetaElement>('meta[name="'+name+'"]')?.content;
  const url=new URL(content('tfcl-det-project')??'',window.location.origin);
  const key=content('tfcl-det-public-key')??'';
  const isAnon=()=>{
    if(key.startsWith('sb_publishable_'))return true;
    try{return JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{return false;}
  };
  if(url.protocol!=='https:' || !url.hostname.endsWith('.supabase.co') || url.pathname!=='/' || !isAnon())
    throw Error('La configuration publique du projet TFCLab est absente ou invalide.');
  current={url:url.origin,key};
}
export function hostConfig(){if(!current)throw Error('Initialiser le projet TFCLab.');return current;}
