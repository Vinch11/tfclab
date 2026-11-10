import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Download } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { criticalEffortsFromRecords, fitCriticalEfforts, previewCriticalInterval, type CriticalEffort, type CriticalSport } from '@/lib/criticalEfforts';
import type { ReviewedRecord } from '@/lib/nolioV2Records';

export function CriticalEffortsPanel({records=[],athleteLabel='Bilan en cours'}:{records?:ReviewedRecord[];athleteLabel?:string}) {
  const [sport,setSport]=useState<CriticalSport>('running');
  const [efforts,setEfforts]=useState<CriticalEffort[]>([]);
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [approved,setApproved]=useState(false);
  const [duration,setDuration]=useState('180'); const [target,setTarget]=useState('');
  const today=new Date().toISOString().slice(0,10);
  const imported=useMemo(()=>criticalEffortsFromRecords(records),[records]);
  const available=[...efforts,...imported.filter(e=>!efforts.some(p=>p.id===e.id))].filter(e=>e.sport===sport);
  const chosen=available.filter(e=>selected.has(e.id));
  const fingerprint=JSON.stringify(chosen);
  useEffect(()=>setApproved(false),[fingerprint,athleteLabel]);
  const fit=fitCriticalEfforts(chosen,sport,today);
  const update=(e:CriticalEffort,key:keyof CriticalEffort,value:string|number|boolean)=>{
    setApproved(false);setEfforts(prev=>[...prev.filter(p=>p.id!==e.id),{...e,[key]:value}]);
  };
  const preview=approved?previewCriticalInterval(fit,sport,Number(duration),Number(target)/(sport==='running'?3.6:1)):null;
  const status=fit.status==='insufficient'?'Données insuffisantes':fit.status==='estimate'?'Estimation sur records / efforts non confirmés':fit.status==='review'?'Tests confirmés — qualité à vérifier':approved?'Validé pour l’aperçu uniquement':'Tests admissibles — accord coach requis';
  const exportReview=()=>{
    const blob=new Blob([JSON.stringify({athleteLabel,sport,efforts:chosen,fit,approvedForPreview:approved,generatedAt:today,prescriptionEnabled:false},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`reperes-critiques-${sport}-${today}.json`;a.click();URL.revokeObjectURL(url);
  };
  return <section className="min-w-0 space-y-4 py-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Repères critiques</h2><Badge variant="outline">Étude non enregistrée</Badge></div>
    <p className="text-sm text-muted-foreground">{athleteLabel}</p>
    <Tabs value={sport} onValueChange={v=>{setSport(v==='cycling'?'cycling':'running');setApproved(false);setTarget('');}}><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="running">Course · VC / D′</TabsTrigger><TabsTrigger value="cycling">Vélo · CP / W′</TabsTrigger></TabsList></Tabs>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{const e:CriticalEffort={id:crypto.randomUUID(),sport,durationSec:180,value:0,date:today,session:'',conditions:'',source:'manual',confirmed:false};setEfforts(prev=>[...prev,e]);setSelected(prev=>new Set([...prev,e.id]));setApproved(false);}}><Plus className="mr-2 h-4 w-4"/>Ajouter un effort</Button><Button variant="outline" disabled={!chosen.length} onClick={exportReview}><Download className="mr-2 h-4 w-4"/>Exporter l’étude</Button></div>
    <div className="divide-y divide-border">
      {available.map((e,i)=><fieldset key={e.id} className="min-w-0 space-y-3 py-4">
        <legend className="flex items-center gap-2 text-sm font-medium"><Checkbox aria-label={`Retenir l’effort ${i+1}`} checked={selected.has(e.id)} onCheckedChange={v=>{setSelected(prev=>{const next=new Set(prev);if(v===true)next.add(e.id);else next.delete(e.id);return next;});setApproved(false);}}/>Effort {i+1}<Badge variant="secondary">{e.source==='nolio'?'Nolio':'Manuel'}</Badge></legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs">Durée (s)<Input aria-label={`Durée effort ${i+1}`} type="number" value={e.durationSec} onChange={v=>update(e,'durationSec',Number(v.target.value))}/></label>
          <label className="text-xs">{sport==='running'?'Distance (m)':'Puissance moyenne (W)'}<Input aria-label={`Résultat effort ${i+1}`} type="number" value={e.value||''} onChange={v=>update(e,'value',Number(v.target.value))}/></label>
          <label className="text-xs">Date<Input aria-label={`Date effort ${i+1}`} type="date" value={e.date} onChange={v=>update(e,'date',v.target.value)}/></label>
          <label className="text-xs sm:col-span-2">Séance / référence du test<Input aria-label={`Séance effort ${i+1}`} value={e.session} onChange={v=>update(e,'session',v.target.value)}/></label>
          <label className="text-xs">Conditions<Input aria-label={`Conditions effort ${i+1}`} placeholder={sport==='running'?'Piste, sec':'Home trainer, capteur'} value={e.conditions} onChange={v=>update(e,'conditions',v.target.value)}/></label>
        </div>
        <label className="flex min-h-11 items-start gap-2 text-sm"><Checkbox aria-label={`Confirmer le test ${i+1}`} className="mt-1" checked={e.confirmed} onCheckedChange={v=>update(e,'confirmed',v===true)}/><span>Je confirme l’athlète, l’effort maximal continu, les unités, les mesures, des conditions comparables et une récupération suffisante entre tests.</span></label>
        {e.source==='manual'&&<Button variant="ghost" size="icon" aria-label={`Supprimer l’effort ${i+1}`} title="Supprimer l’effort" onClick={()=>{setEfforts(prev=>prev.filter(p=>p.id!==e.id));setSelected(prev=>{const next=new Set(prev);next.delete(e.id);return next;});setApproved(false);}}><Trash2 className="h-4 w-4"/></Button>}
      </fieldset>)}
    </div>
    <Badge variant="outline" className="h-auto whitespace-normal">{status}</Badge>
    {fit.critical>0&&<>
      <dl className="grid grid-cols-2 gap-4 border-y border-border py-4"><div><dt className="text-sm text-muted-foreground">{sport==='running'?'Vitesse critique':'Puissance critique'}</dt><dd className="text-2xl font-semibold">{sport==='running'?(fit.critical*3.6).toFixed(2):fit.critical.toFixed(0)} {sport==='running'?'km/h':'W'}</dd>{sport==='running'&&<dd className="text-sm">{Math.floor(Math.round(1000/fit.critical)/60)}:{String(Math.round(1000/fit.critical)%60).padStart(2,'0')} min/km</dd>}</div><div><dt className="text-sm text-muted-foreground">{sport==='running'?'D′':'W′'}</dt><dd className="text-2xl font-semibold">{sport==='running'?fit.reserve.toFixed(0):(fit.reserve/1000).toFixed(1)} {sport==='running'?'m':'kJ'}</dd></div></dl>
      <div className="h-56 w-full" aria-label="Courbe des efforts retenus"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:10,right:15,bottom:20,left:5}}><CartesianGrid stroke="var(--border)"/><XAxis dataKey="t" type="number" name="Durée" unit=" s"/><YAxis dataKey="y" type="number" name={sport==='running'?'Distance':'Travail'} unit={sport==='running'?' m':' kJ'}/><Tooltip/><Scatter name="Efforts" data={chosen.map(e=>({t:e.durationSec,y:sport==='running'?e.value:e.value*e.durationSec/1000}))} fill="hsl(var(--primary))"/></ScatterChart></ResponsiveContainer></div>
      <p className="text-xs text-muted-foreground">R² : {fit.r2===null?'non vérifiable':fit.r2.toFixed(4)} · Écart maximal : {fit.residualPct.toFixed(1)} % · Sensibilité au retrait d’un effort : {fit.sensitivityPct===null?'non vérifiable':`${fit.sensitivityPct.toFixed(1)} %`}</p>
    </>}
    {[...fit.errors,...fit.warnings].map(m=><p key={m} className="text-sm text-destructive">{m}</p>)}
    <label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox aria-label="Autoriser l’aperçu des intervalles" checked={approved&&fit.status==='eligible'} disabled={fit.status!=='eligible'} onCheckedChange={v=>setApproved(v===true)}/>Autoriser l’aperçu des intervalles — aucune modification du plan</label>
    {approved&&fit.status==='eligible'&&<div className="space-y-3 border-t border-border pt-3"><h3 className="font-medium">Effort continu · comparaison</h3><div className="grid grid-cols-2 gap-3"><label className="text-sm">Durée (s)<Input aria-label="Durée intervalle" type="number" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label className="text-sm">Cible ({sport==='running'?'km/h':'W'})<Input aria-label="Cible intervalle" type="number" value={target} onChange={e=>setTarget(e.target.value)}/></label></div>{preview?<p className="text-sm">Sollicitation estimée : {(preview.fraction*100).toFixed(0)} % de {sport==='running'?'D′':'W′'} · {preview.used.toFixed(0)} {sport==='running'?'m':'J'}.{preview.warning&&<span className="text-destructive"> {preview.warning}</span>}</p>:<p className="text-sm text-muted-foreground">Effort de 2 à 15 minutes au-dessus du repère critique requis.</p>}<p className="text-xs text-muted-foreground">Effort isolé uniquement : aucune prédiction des récupérations ni du nombre de répétitions. LT1/MLSS et durabilité restent distincts.</p></div>}
  </section>;
}