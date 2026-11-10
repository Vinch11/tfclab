import {useEffect,useRef,useState} from 'react';
type Profile={id:string;name:string;has_api_access:boolean};
type Connection={status:string;reason?:string;configured?:boolean;connected?:boolean;reconnectRequired?:boolean;
  authorizeUrl?:string;athletes?:Profile[];link?:{nolioAthleteRef:string;nolioAthleteName:string}|null};
export function NolioConnection({athleteId}:{athleteId:string}){
  const [state,setState]=useState<Connection|null>(null),[selected,setSelected]=useState(''),[error,setError]=useState('');
  const [busy,setBusy]=useState(false),run=useRef<AbortController|null>(null);
  useEffect(()=>()=>run.current?.abort(),[]);
  async function action(method:'status'|'start'|'link'){
    run.current?.abort();const ctrl=new AbortController();run.current=ctrl;setError('');setBusy(true);
    try{
      const {callNolioConnection}=await import('./nolioRemote');
      if(method==='start'){
        const value=await callNolioConnection({action:'start'},ctrl.signal);
        if(value.status!=='REDIRECT'||!value.authorizeUrl)throw Error(value.reason??'Autorisation Nolio indisponible.');
        const url=new URL(value.authorizeUrl);
        if(url.origin!=='https://www.nolio.io' || url.pathname!=='/api/authorize/')throw Error('Adresse d’autorisation Nolio invalide.');
        if(!ctrl.signal.aborted)window.location.assign(url.href);
        return;
      }
      if(method==='link'){
        const value=await callNolioConnection({action:'link',athleteId,nolioAthleteRef:selected},ctrl.signal);
        if(value.status!=='LINKED')throw Error(value.reason??'Association Nolio refusée.');
      }
      const result:Connection=await callNolioConnection({action:'status',athleteId},ctrl.signal);
      if(result.status!=='OK')throw Error(result.reason??'Connexion Nolio indisponible.');
      if(!ctrl.signal.aborted){setState(result);setSelected(result.link?.nolioAthleteRef??'');}
    }catch(e){if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:String(e));}
    finally{if(!ctrl.signal.aborted)setBusy(false);}
  }
  return <details><summary>Compte et athlète Nolio</summary><div className="space-y-2">
    <button type="button" className="rounded border px-2 py-1" disabled={busy} onClick={()=>void action('status')}>Vérifier la connexion Nolio</button>
    {state && <>{state.link && <p>Profil Nolio associé · {state.link.nolioAthleteName}</p>}
      {!state.configured?<p>Les identifiants du service Nolio doivent être configurés sur ce site.</p>:
      !state.connected||state.reconnectRequired?<button type="button" disabled={busy} onClick={()=>void action('start')}>Autoriser l’export DET sur mon compte Nolio</button>:
      <div><label>Profil Nolio de cet athlète <select value={selected} onChange={e=>setSelected(e.target.value)}>
        <option value="">Choisir un profil</option>{state.athletes?.filter(a=>a.has_api_access).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
      </select></label><button type="button" disabled={busy||!selected||selected===state.link?.nolioAthleteRef} onClick={()=>void action('link')}>Associer ce profil</button></div>}</>}
    {error&&<p role="alert">{error}</p>}</div></details>;
}
