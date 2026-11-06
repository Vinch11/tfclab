import {useEffect,useRef,useState} from 'react';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {supabase} from '@/integrations/supabase/client';
import {prepareAppBrickExport} from '@/lib/nolio/appBrickPreparation';
import {AppendOnlyPlanVersionSaver,READBACK_COLUMNS,canonicalJson,type PlanVersionRow} from '@/lib/plan/appendOnlyPlanVersionSave';
import {supabasePlanVersionTransport} from '@/lib/plan/planVersionEdits';
import {Button} from '@/components/ui/button';
/** One explicit recurring export schedule; no invented transition or clock. */
export function NolioAppBrickPreparation({plan,planVersionId,athleteId,onSaved}:{plan:ParsedPlan;planVersionId:string;athleteId:string;onSaved:(id:string,plan:ParsedPlan)=>void}){
 const [keys,setKeys]=useState<string[]>([]),[time,setTime]=useState(''),[zone,setZone]=useState(''),[transition,setTransition]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const epoch=useRef(0);
 useEffect(()=>{const token=++epoch.current;setKeys([]);setConfirmed(false);setTime('');setZone('');setTransition('');setMessage('');return()=>{epoch.current=token+1;};},[plan,planVersionId,athleteId]);
 const rows=plan.weeks.flatMap(w=>w.sessions.map((s,i)=>({key:`S${s.weekNumber}-J${s.dayIndex}-${i}`,s}))).filter(({s})=>s.sport==='brick'&&!s.isRest&&Array.isArray((s as unknown as {detSourceComponents?:unknown[]}).detSourceComponents)&&((s as unknown as {detSourceComponents:unknown[]}).detSourceComponents.length===2));
 if(!rows.length)return null;
 async function save(){
  if(busy||!confirmed)return;setBusy(true);setMessage('');const token=epoch.current;
  try{
   const user=await supabase.auth.getUser();const uid=user.data.user?.id;if(user.error||!uid)throw Error('Reconnectez-vous.');
   const row=await supabase.from('plan_versions').select(READBACK_COLUMNS).eq('id',planVersionId).eq('coach_id',uid).eq('athlete_id',athleteId).maybeSingle();
   if(token!==epoch.current)return;
   if(row.error||!row.data)throw Error('Version possédée introuvable.');
   const saved=row.data as unknown as PlanVersionRow;
   if(saved.id!==planVersionId||saved.coach_id!==uid||saved.athlete_id!==athleteId||canonicalJson(saved.plan_json)!==canonicalJson(plan))throw Error('Le plan a changé. Rouvrez la version sauvegardée.');
   const next=await prepareAppBrickExport(plan,{keys,timeZone:zone,time,transitionMinutes:Number(transition),confirmed});
   const again=await supabase.auth.getUser();if(again.error||again.data.user?.id!==uid||token!==epoch.current)throw Error('Identité ou sélection modifiée : action annulée.');
   const {id:_id,...payload}=saved;
   const result=await new AppendOnlyPlanVersionSaver({transport:supabasePlanVersionTransport(supabase)}).save({...payload,plan_json:next});
   if(token!==epoch.current)return;
   if(result.status!=='CONFIRMED'||!result.attemptId)throw Error('Sauvegarde non confirmée : '+result.status);
   const last=await supabase.auth.getUser();if(last.error||last.data.user?.id!==uid||token!==epoch.current)throw Error('Version archivée, mais session modifiée. Rouvrez-la dans l’historique.');
   onSaved(result.attemptId,next);
  }catch(e){if(token===epoch.current)setMessage((e as Error).message);}finally{if(token===epoch.current)setBusy(false);}
 }
 const edit=()=>setConfirmed(false);
 return <details className="border rounded p-3"><summary>Préparer les enchaînements vélo-course</summary><div className="space-y-2 text-sm pt-2">
  <p>Les blocs vélo et course restent ceux du plan. Chaque enchaînement choisi sera exporté en deux activités liées, avec la transition comme intervalle entre elles.</p>
  <label className="block">Fuseau horaire<input aria-label="Fuseau des enchaînements" disabled={busy} placeholder="Europe/Brussels" value={zone} onChange={e=>{setZone(e.target.value);edit();}} className="border rounded ml-2"/></label>
  <label className="block">Départ vélo habituel<input aria-label="Départ vélo des enchaînements" disabled={busy} type="time" value={time} onChange={e=>{setTime(e.target.value);edit();}} className="border rounded ml-2"/></label>
  <label className="block">Transition (minutes)<input aria-label="Transition des enchaînements" disabled={busy} type="number" min={3} max={10} value={transition} onChange={e=>{setTransition(e.target.value);edit();}} className="border rounded ml-2 w-16"/></label>
  <label className="flex gap-2"><input type="checkbox" disabled={busy} checked={keys.length===rows.length} onChange={e=>{setKeys(e.target.checked?rows.map(r=>r.key):[]);edit();}}/>Appliquer ces horaires à tous les enchaînements ci-dessous</label>
  <div className="max-h-40 overflow-auto">{rows.map(({key,s})=><label key={key} className="flex gap-2"><input type="checkbox" disabled={busy} checked={keys.includes(key)} onChange={e=>{setKeys(e.target.checked?[...keys,key]:keys.filter(k=>k!==key));edit();}}/><span>S{s.weekNumber} · {s.dayName} · {s.title}</span></label>)}</div>
  <label className="flex gap-2"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Je confirme les blocs vélo-course sélectionnés, cet horaire et cette transition. Les départs course seront calculés avec les durées exactes du plan.</label>
  <Button disabled={busy||!confirmed||!keys.length||!time||!zone||!transition} onClick={()=>void save()}>Enregistrer la version préparée pour Nolio</Button>
  <p>Cette action conserve l’original et crée une version dans l’historique. Sa revue coach et sa simulation seront à refaire. Aucun envoi n’a lieu ici.</p><p role="status">{busy?'Enregistrement et relecture…':message}</p>
 </div></details>;
}
