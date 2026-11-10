// One dedicated worker per request. All athlete data stays in the browser.
const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
  .map(b=>b.toString(16).padStart(2,'0')).join('');
let script;
async function checkedScript() {
  const manifest = await fetch(new URL('manifest.json',import.meta.url),{credentials:'omit'}).then(r=>{
    if(!r.ok) throw Error('Version DET indisponible.'); return r.json();
  });
  if(manifest.schema!==1 || manifest.entry !== 'worker.js.gz' || !/^det-[\da-f]{64}$/.test(manifest.version))
    throw Error('Format de version DET inconnu.');
  const response=await fetch(new URL(manifest.entry,import.meta.url),{credentials:'omit'});
  if(!response.ok)throw Error('Téléchargement du moteur DET impossible.');
  const compressed=await response.arrayBuffer();
  if(compressed.byteLength!==manifest.bytes || await hash(compressed)!==manifest.sha256)
    throw Error('Le téléchargement DET est incomplet ou corrompu.');
  const bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(await hash(bytes)!==manifest.workerSha256)throw Error('Intégrité du moteur DET non vérifiée.');
  return {blob:new Blob([bytes],{type:'text/javascript'}),version:manifest.version};
}

export async function runDet(job, signal) {
  signal?.throwIfAborted();
  script ??= checkedScript().catch(e=>{script=undefined;throw e;});
  const {blob,version}=await script;
  signal?.throwIfAborted();
  const url=URL.createObjectURL(blob);
  let worker;
  try {
    worker=new Worker(url);
    return await new Promise((resolve,reject)=>{
      const stop=()=>reject(new DOMException('Génération annulée.','AbortError'));
      const clean=()=>{clearTimeout(timeout);signal?.removeEventListener('abort',onAbort);};
      const timeout=setTimeout(()=>{clean();reject(Error('Délai de calcul DET dépassé.'));},180000);
      const onAbort=()=>{clean();stop();};
      signal?.addEventListener('abort',onAbort,{once:true});
      worker.onerror=e=>{clean();reject(Error(e.message||'Chargement du moteur DET impossible.'));};
      worker.onmessageerror=()=>{clean();reject(Error('Réponse DET illisible.'));};
      worker.onmessage=({data})=>{
        clean();
        if(!data.ok || data.version!==version)reject(Error(data.error||'Version DET incohérente.'));
        else resolve(data.value);
      };
      try {worker.postMessage(job);}catch(error){clean();reject(error);}
    });
  } finally {
    worker?.terminate();
    URL.revokeObjectURL(url);
  }
}
