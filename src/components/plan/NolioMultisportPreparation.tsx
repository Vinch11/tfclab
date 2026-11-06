import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AppendOnlyPlanVersionSaver, READBACK_COLUMNS, canonicalJson, type PlanVersionRow } from '@/lib/plan/appendOnlyPlanVersionSave';
import { supabasePlanVersionTransport } from '@/lib/plan/planVersionEdits';
import { sessionsFromPlanJson } from '../../../supabase/functions/_shared/nolioV2/planSessions';
import { previewMultisportSplit, type SplitChoice, type SplitPreview } from '../../../supabase/functions/_shared/nolioV2/multisportSplit';

const splitProblem = (reason?: string) => reason === 'split_start_requires_coach_confirmation'
  ? 'Un horaire de départ confirmé par le coach est nécessaire dans le programme.'
  : reason === 'split_provider_time_ambiguous' ? 'Cet horaire se produit deux fois lors du changement d’heure. Nolio ne permet pas de transmettre le choix exact ; un autre horaire confirmé est nécessaire.'
  : reason === 'split_run_timezone_invalid' ? 'Le fuseau horaire de la course doit être vérifié.'
  : 'Les durées, la transition ou les blocs sauvegardés ne permettent pas cette représentation. Une correction du programme est nécessaire.';

/** A deliberate export choice creates a new immutable version; it never grants a send. */
export function NolioMultisportPreparation({planVersionId,plan,onSaved}:{planVersionId:string;plan:unknown;onSaved:(id:string,plan:unknown)=>void}) {
  const [rows,setRows]=useState<Array<{key:string;title:string;preview?:SplitPreview;reason?:string}>>([]);
  const [choices,setChoices]=useState<Record<string,SplitChoice>>({});
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const epoch=useRef(0);
  useEffect(()=>{
    const version=++epoch.current;setChoices({});setConfirmed(false);setMessage('');setRows([]);setBusy(false);
    const sessions=sessionsFromPlanJson(plan).sessions.filter(s=>s.detStructuredWorkout&&(s.detStructuredWorkout.sport==='brick'||'composition' in s.detStructuredWorkout));
    Promise.all(sessions.map(async s=>{
      const r=await previewMultisportSplit(s);return {key:s.sessionKey,title:s.title,...('reason' in r?{reason:r.reason}:{preview:r.preview})};
    })).then(rs=>{if(epoch.current===version)setRows(rs);}).catch(()=>{if(epoch.current===version)setMessage('Lecture de la structure impossible.');});
    return ()=>{epoch.current=version+1;};
  },[planVersionId,plan]);
  if(!rows.length)return null;
  async function save(){
    if(!confirmed||busy||!Object.keys(choices).length)return;
    setBusy(true);setMessage('');const version=epoch.current;
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth.user)throw Error('Session coach requise.');
      const {data,error}=await supabase.from('plan_versions').select(READBACK_COLUMNS).eq('id',planVersionId).eq('coach_id',auth.user.id).maybeSingle();
      if(error||!data)throw Error('Version possédée introuvable.');
      const row=data as unknown as PlanVersionRow;
      if(epoch.current!==version||canonicalJson(row.plan_json)!==canonicalJson(plan))throw Error('La version affichée a changé.');
      const {id:_id,...payload}=row;
      const next={...row.plan_json as Record<string,unknown>,_nolioV2MultisportSplits:choices};
      const result=await new AppendOnlyPlanVersionSaver({transport:supabasePlanVersionTransport(supabase)}).save({...payload,plan_json:next});
      if(result.status!=='CONFIRMED'||!result.attemptId)throw Error('Nouvelle version non confirmée : '+result.status);
      if(epoch.current===version){setMessage('Nouvelle version enregistrée et relue. Revue coach et simulation à refaire sur cette version.');onSaved(result.attemptId,next);}
    }catch(e){if(epoch.current===version)setMessage(e instanceof Error?e.message:'Préparation impossible.');}
    finally{if(epoch.current===version)setBusy(false);}
  }
  return <section className="space-y-3 border-t pt-4"><h3 className="font-semibold">Enchaînements vers Nolio</h3>
    <p className="text-sm">Choisir deux activités liées, vélo puis course. La transition reste un intervalle horaire explicite entre elles, hors temps d’entraînement. Le programme sauvegardé reste inchangé.</p>
    {rows.map(r=><div key={r.key} className="rounded border p-2 text-sm"><label className="flex items-start gap-2">
      <input type="checkbox" disabled={busy||!r.preview} checked={!!choices[r.key]} onChange={e=>{
        const selected=e.target.checked;setConfirmed(false);setChoices(old=>{const next={...old};if(selected&&r.preview)next[r.key]={schema:'nolio-reviewed-split-v1',parentSha256:r.preview.parentSha256,coachConfirmed:true,runStart:r.preview.runStart};else delete next[r.key];return next;});
      }}/><span>{r.title} · {r.key}{r.preview?<><br/>Vélo {r.preview.bikeSeconds/60} min → transition {r.preview.transitionSeconds/60} min → course {r.preview.runSeconds/60} min.<br/>Course : {r.preview.runStart.localDate} à {String(Math.floor(r.preview.runStart.minuteOfDay/60)).padStart(2,'0')}:{String(r.preview.runStart.minuteOfDay%60).padStart(2,'0')} ({r.preview.runStart.timeZone}, UTC{r.preview.runStart.utcOffsetMinutes>=0?'+':'-'}{String(Math.floor(Math.abs(r.preview.runStart.utcOffsetMinutes)/60)).padStart(2,'0')}:{String(Math.abs(r.preview.runStart.utcOffsetMinutes)%60).padStart(2,'0')}).</>:<><br/>{splitProblem(r.reason)}</>}</span>
    </label></div>)}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>Je confirme cette représentation, l’ordre et les horaires affichés. Un envoi partiel reste incomplet ; il devra être vérifié avant toute reprise.</label>
    <Button disabled={busy||!confirmed||!Object.keys(choices).length} onClick={()=>void save()}>Enregistrer une nouvelle version pour préparer Nolio</Button>
    <p role="status" className="text-sm">{message}</p><p className="text-xs text-muted-foreground">Cette action n’envoie rien vers Nolio et ne remplace ni la revue du programme ni le consentement d’envoi.</p>
  </section>;
}
