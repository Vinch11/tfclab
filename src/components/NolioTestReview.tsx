import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { proposalFields, testProposals, type ReviewedRecord, type SnapshotRecordFields } from '@/lib/nolioV2Records';

export function NolioTestReview({records,mode,athlete,from,to,onApply}:{records:ReviewedRecord[];mode:'quick'|'verified';athlete:string;from:string;to:string;onApply?:(fields:SnapshotRecordFields,notes:string)=>void}) {
  const proposals=useMemo(()=>testProposals(records),[records]);
  const [accepted,setAccepted]=useState<Set<string>>(new Set());
  const [verified,setVerified]=useState<Set<string>>(new Set());
  const [details,setDetails]=useState<Record<string,{laps:unknown[];available:boolean}>>({});
  const [loading,setLoading]=useState('');
  const [error,setError]=useState('');
  const inspect=async(id:string)=>{
    setLoading(id);setError('');
    try{
      const {data,error:readError}=await supabase.functions.invoke('nolio-v2-oauth',{body:{action:'test_session',athlete,training:id,from,to}});
      if(readError)throw new Error(readError instanceof FunctionsHttpError?await readError.context.text():readError.message);
      setDetails(prev=>({...prev,[id]:data}));
    }catch{setError('Les intervalles de cette séance ne sont pas accessibles. Confirmation automatique impossible.');}
    finally{setLoading('');}
  };
  const fields=proposalFields(proposals,accepted,verified,mode);
  const toggle=(setter:typeof setAccepted,id:string,value:boolean)=>setter(prev=>{const next=new Set(prev);if(value)next.add(id);else next.delete(id);return next;});
  return <section className="space-y-3 border-t border-border pt-4">
    <h3 className="font-semibold">Résultats par journée de tests</h3>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {!proposals.length&&<p className="text-sm text-muted-foreground">Données insuffisantes pour les journées de tests.</p>}
    <div className="divide-y divide-border">
      {proposals.map(p=><div key={p.id} className="space-y-2 py-3 text-sm">
        <label className="flex min-h-11 items-center gap-3"><Checkbox aria-label={`Garder ${p.label}`} checked={accepted.has(p.id)} onCheckedChange={v=>toggle(setAccepted,p.id,v===true)}/><span className="min-w-0 break-words"><strong>{p.label} · {p.value} {p.unit}</strong><br/>{p.record.sport_name} · {p.record.date??'Date inconnue'} · {p.record.training_name??'Séance non fournie'}</span></label>
        {mode==='verified'&&p.record.training_id?.startsWith('trn_')&&<Button variant="outline" disabled={!!loading} onClick={()=>{if(p.record.training_id)void inspect(p.record.training_id);}}>Examiner les intervalles de la séance</Button>}
        {p.record.training_id&&details[p.record.training_id]&&<div className="space-y-2">
          <p className="text-sm text-muted-foreground">{details[p.record.training_id].available?'Intervalles mesurés — vérification du coach nécessaire.':'Aucun intervalle fourni par Nolio ; consultez la séance avant de confirmer.'}</p>
          {details[p.record.training_id].available&&<pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(details[p.record.training_id].laps,null,2)}</pre>}
        </div>}
        {(p.requiresProtocol||mode==='verified')&&<label className="flex min-h-11 items-center gap-3"><Checkbox aria-label={`Confirmer ${p.label}`} checked={verified.has(p.id)} disabled={!p.record.training_id||!p.record.date} onCheckedChange={v=>toggle(setVerified,p.id,v===true)}/><span>J’ai vérifié que cet effort provient du test indiqué, réalisé selon son protocole.</span></label>}
        <p className="text-xs text-muted-foreground">{!p.field?'Résultat conservé dans les notes uniquement ; seuil non déduit.':verified.has(p.id)?'Protocole confirmé par le coach ; valeur issue du record.':'Proposition issue d’un record ; test non confirmé.'}</p>
      </div>)}
    </div>
    <p className="text-sm text-muted-foreground">À compléter dans les fiches de tests : répétitions du sprint, seuil, FTP, CSS, durée tenue au seuil, dérive cardiaque, ressenti et qualité du protocole. Les records ne suffisent pas à vérifier ces résultats.</p>
    {onApply&&<Button variant="outline" disabled={!accepted.size} onClick={()=>onApply(fields,[`Import Nolio — ${mode==='quick'?'rapide, à vérifier':'tests vérifiés par le coach'} — aucune validation automatique du protocole.`,...proposals.filter(p=>accepted.has(p.id)).map(p=>`${p.label} : ${p.value} ${p.unit} | ${p.record.date??'?'} | ${p.record.training_id??'séance inconnue'} | ${verified.has(p.id)?'protocole confirmé par le coach':'record non confirmé'}`)].join('\n'))}>Préremplir les résultats retenus</Button>}
  </section>;
}