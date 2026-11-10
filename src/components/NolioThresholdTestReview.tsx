import { useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { evaluateThresholdProtocol, type NolioTestSession } from '@/lib/nolioThresholdProtocol';
import type { SnapshotRecordFields } from '@/lib/nolioV2Records';

type Session = NolioTestSession & {sportBase:'cycling'|'running';sportName:string};
type Props = { athlete:string; from:string; to:string; onApply?:(fields:SnapshotRecordFields,notes:string)=>void };
async function read(body:Record<string,string>) {
  const { data, error } = await supabase.functions.invoke('nolio-v2-oauth',{body});
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const detail = await error.context.json().catch(()=>null);
      throw new Error(detail?.reason === 'missing_scope' ? 'Nolio refuse les mesures : autorisation de lecture des séances manquante.' : detail?.status === 403 ? 'Nolio refuse les mesures de cette séance (restriction de la source ou des autorisations).' : 'Les mesures de cette séance ne sont pas accessibles dans Nolio.');
    }
    throw new Error('Lecture Nolio impossible.');
  }
  return data;
}

export function NolioThresholdTestReview({athlete,from,to,onApply}:Props) {
  const [sessions,setSessions] = useState<Session[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [sport,setSport] = useState<'cycling'|'running'>('cycling');
  const [training,setTraining] = useState('');
  const [reference,setReference] = useState('');
  const [streams,setStreams] = useState<Record<string,(number|null)[]> | null>(null);
  const [axis,setAxis] = useState('');
  const [unit,setUnit] = useState('');
  const [target,setTarget] = useState('');
  const [start,setStart] = useState('');
  const [end,setEnd] = useState('');
  const [checks,setChecks] = useState<Record<string,boolean>>({});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const load = async () => {
    setBusy(true);setError('');setLoaded(false);setSessions([]);setTraining('');setReference('');setStreams(null);setChecks({});
    try { const data = await read({action:'test_sessions',athlete,from,to}); if (!data.complete || !Array.isArray(data.sessions)) throw new Error('Liste des séances incomplète : import suspendu.'); setSessions(data.sessions);setLoaded(true); }
    catch(e) { setError(e instanceof Error ? e.message : 'Lecture impossible.'); } finally {setBusy(false);}
  };
  const inspect = async () => {
    setBusy(true);setError('');setStreams(null);setChecks({});setStart('');setEnd('');setAxis('');setUnit('');
    try { const data = await read({action:'protocol_session',athlete,from,to,training}); if (!data.available) throw new Error('Données insuffisantes : aucun enregistrement exploitable fourni par Nolio.');setStreams(data.streams); }
    catch(e) { setError(e instanceof Error ? e.message : 'Lecture impossible.'); } finally {setBusy(false);}
  };
  const session = sessions.find(s=>s.id===training);
  const previous = sessions.find(s=>s.id===reference);
  const time = streams?.stream_time;
  const values = streams?.[axis];
  // Explicit source units; never reconstruct time from sample indices or infer speed from sport.
  const speed = values?.map(v=>v === null ? null : unit === 'km/h' ? v/3.6 : unit === 's/km' ? 1000/v : v) ?? [];
  const result = session && previous && time && values && unit ? evaluateThresholdProtocol({sport,session,reference:previous,target:target.trim()?Number(target):NaN,start:start.trim()?Number(start):NaN,end:end.trim()?Number(end):NaN,
    streams:{time:time.map(t=>t===null?NaN:t),watts:sport==='cycling'?values:[],speed:sport==='running'?speed:[]},
    athleteConfirmed:!!checks.athlete,referenceConfirmed:!!checks.reference,continuousConfirmed:!!checks.continuous,exhaustionConfirmed:!!checks.exhaustion,
  }) : null;
  const selector = (label:string,value:string,change:(v:string)=>void,items:{id:string;label:string}[]) => <div className="space-y-2"><Label>{label}</Label><Select disabled={busy} value={value} onValueChange={change}><SelectTrigger aria-label={label}><SelectValue placeholder="Choisir"/></SelectTrigger><SelectContent>{items.map(s=><SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select></div>;
  const clearChecks = () => setChecks({});
  return <section className="space-y-4 border-t border-border pt-4">
    <h3 className="font-semibold">Durée au seuil · protocole TTE</h3>
    <p className="text-sm text-muted-foreground">D7 vélo au FTP validé en D5 · D6 course à l’allure seuil validée en D5. Test continu dédié, distinct du test du seuil, jusqu’à épuisement. Un arrêt programmé ou une durée cumulée d’intervalles ne mesure pas la TTE.</p>
    <Button variant="outline" disabled={busy||!athlete||!from||!to} onClick={()=>void load()}>{busy?'Lecture…':'Charger les séances de la période'}</Button>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {loaded&&<>
      {selector('Sport du test',sport,v=>{setSport(v==='cycling'?'cycling':'running');setTraining('');setReference('');setStreams(null);setTarget('');clearChecks();},[{id:'cycling',label:'Vélo · D7'},{id:'running',label:'Course · D6'}])}
      {!sessions.some(s=>s.sportBase===sport)&&<p className="text-sm text-muted-foreground">Aucune séance de ce sport dans la période.</p>}
      {selector('Séance du test de durée',training,v=>{setTraining(v);setReference('');setStreams(null);clearChecks();},sessions.filter(s=>s.sportBase===sport).map(s=>({id:s.id,label:`${s.date} · ${s.name} · ${s.sportName}`})))}
      {session&&<>
        {selector('Séance préalable du seuil · D5',reference,v=>{setReference(v);clearChecks();},sessions.filter(s=>s.sport===session.sport&&s.date<session.date).map(s=>({id:s.id,label:`${s.date} · ${s.name}`})))}
        <Label className="block space-y-2"><span>{sport==='cycling'?'FTP validé au préalable (W)':'Allure seuil validée au préalable (s/km)'}</span><Input aria-label="Seuil préalable" type="number" value={target} onChange={e=>{setTarget(e.target.value);clearChecks();}}/></Label>
        <Button variant="outline" disabled={busy||!reference} onClick={()=>void inspect()}>Lire les mesures du test</Button>
      </>}
      {streams&&<>
        {!time&&<p role="alert" className="text-sm text-destructive">Données insuffisantes : chronologie absente. Aucun calcul à partir du nombre d’échantillons.</p>}
        {selector('Mesure enregistrée',axis,v=>{setAxis(v);setUnit('');clearChecks();},Object.keys(streams).filter(k=>sport==='cycling'?/watts|power/.test(k):/speed|velocity/.test(k)).map(k=>({id:k,label:sport==='cycling'?'Puissance enregistrée':'Vitesse enregistrée'})))}
        {selector('Unité des mesures Nolio',unit,v=>{setUnit(v);clearChecks();},(sport==='cycling'?['W']:['m/s','km/h','s/km']).map(v=>({id:v,label:v})))}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[['Début du segment (secondes)',start,setStart],['Fin du segment (secondes)',end,setEnd]].map(([label,value,setter])=><Label key={String(label)} className="space-y-2"><span>{String(label)}</span><Input aria-label={String(label)} type="number" value={String(value)} onChange={e=>{if(typeof setter==='function')setter(e.target.value);clearChecks();}}/></Label>)}</div>
        {time&&<p className="text-xs text-muted-foreground">Chronologie Nolio : {time[0]}–{time.at(-1)} s · {time.length} mesures. Segment sans échauffement ni retour au calme.</p>}
        {time&&values&&<details className="border-y border-border py-2"><summary className="cursor-pointer text-sm font-medium">Mesures du segment · temps et intensité</summary><div className="max-h-56 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="py-2">Temps (s)</th><th>Mesure {unit}</th></tr></thead><tbody>{time.map((t,i)=>t!==null&&t>=Number(start)&&t<=Number(end)?<tr key={i}><td className="py-1">{t}</td><td>{values[i]??'Absente'}</td></tr>:null)}</tbody></table></div></details>}
        {[
          ['athlete','La séance appartient bien à cet athlète ; les unités et la chronologie sont vérifiées.'],
          ['reference','Le seuil indiqué a été mesuré et validé dans la séance préalable D5, sans recalibration pendant le test.'],
          ['continuous','J’ai vérifié le segment : effort continu, sans pause ni récupération ; capteur et conditions fiables.'],
          ['exhaustion','L’arrêt correspond à l’épuisement au seuil, pas à une fin programmée, une limite de temps ou un incident.'],
        ].map(([key,label])=><label key={key} className="flex min-h-11 items-start gap-3 text-sm"><Checkbox className="mt-1" aria-label={label} checked={!!checks[key]} onCheckedChange={v=>setChecks(prev=>({...prev,[key]:v===true}))}/><span>{label}</span></label>)}
        {result&&<><p className="text-sm font-medium">{result.errors.length?'Protocole non validé':'Protocole confirmé par le coach'}{result.minutes!==null&&Number.isFinite(result.minutes)?` · segment ${Math.round(result.minutes*100)/100} min`:''}</p>{result.errors.length>0&&<ul className="space-y-1 text-sm text-destructive">{result.errors.map(e=><li key={e}>{e}</li>)}</ul>}</>}
        {onApply&&<Button disabled={busy||!result||result.errors.length>0} onClick={()=>{if(result&&!result.errors.length)onApply(result.fields,result.notes);}}>Préremplir la durée au seuil {sport==='cycling'?'vélo':'course'}</Button>}
      </>}
    </>}
  </section>;
}