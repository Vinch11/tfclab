import { useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NolioTestReview } from '@/components/NolioTestReview';
import { NolioThresholdTestReview } from '@/components/NolioThresholdTestReview';
import { NolioPeriodTestFinder } from '@/components/NolioPeriodTestFinder';
import { CriticalEffortsPanel } from '@/components/CriticalEffortsPanel';
import { Download, Search, Check } from 'lucide-react';
import { observedFields, recordNotes, recordQueries, readSportsRecords, selectableRecordIndices, type ReviewedRecord, type SnapshotRecordFields } from '@/lib/nolioV2Records';

type Catalogues = {athletes:{id:string;name:string;has_api_access:boolean}[];sports:{id:string;name:string;sport_base:string|null}[];windows:Record<string,{label:string;time:number[];distance:number[]}>;complete:boolean};
async function read(action:string, args:Record<string,unknown> = {}) {
  const {data,error} = await supabase.functions.invoke('nolio-v2-oauth',{body:{action,...args}});
  if(error) throw new Error(error instanceof FunctionsHttpError ? await error.context.text() : error.message);
  return data;
}
export function NolioPeriodRecords({onApply}:{onApply?:(fields:SnapshotRecordFields, notes:string)=>void}) {
  const [catalogues,setCatalogues]=useState<Catalogues|null>(null);
  const [athlete,setAthlete]=useState(''); const [sports,setSports]=useState<Set<string>>(new Set());
  const [sportSearch,setSportSearch]=useState('');
  const [from,setFrom]=useState(''); const [to,setTo]=useState('');
  const [cat,setCat]=useState('ppr'); const [axis,setAxis]=useState('time');
  const [records,setRecords]=useState<ReviewedRecord[]>([]); const [selected,setSelected]=useState<Set<number>>(new Set());
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [complete,setComplete]=useState(true);
  const [period,setPeriod]=useState<{from:string;to:string}|null>(null);
  const [basket,setBasket]=useState<ReviewedRecord[]>([]);
  const [confirmedAthlete,setConfirmedAthlete]=useState(false);
  const [mode,setMode]=useState<'quick'|'verified'>('quick');
  const [autoRecords,setAutoRecords]=useState(true);
  useEffect(()=>{let active=true;read('catalogues').then(data=>{if(active)setCatalogues(data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  const reset=()=>{setRecords([]);setSelected(new Set());setPeriod(null);};
  const search=async()=>{
    if(!from || !to || from>to || !athlete || !sports.size || !catalogues)return;
    setBusy(true);setError('');reset();
    try {
      const data=await readSportsRecords(catalogues.sports.filter(s=>sports.has(s.id)),catalogues.sports,
        async sport=>{
          const chosen=catalogues.sports.find(s=>s.id===sport);
          const queries=autoRecords&&chosen?recordQueries(chosen,catalogues.sports):[{cat,axis}];
          const results=[];
          for(const query of queries)results.push(await read('records',{athlete,sport,from,to,cat:query.cat,record_type:query.axis}));
          return {records:results.flatMap(r=>r.records),complete:results.every(r=>r.complete===true)};
        });
      setRecords(data.records);setComplete(data.complete);setPeriod({from,to});
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  const currentSelection=records.filter((_,i)=>selected.has(i));
  const selectable=selectableRecordIndices(records);
  const allSelected=selectable.length>0 && selectable.every(i=>selected.has(i));
  const reviewed=[...basket,...currentSelection];
  const download=()=>{
    if(!period)return;
    const blob=new Blob([JSON.stringify({period,records:reviewed},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`records-nolio-${period.from}-${period.to}.json`;a.click();URL.revokeObjectURL(url);
  };
  return <section className="space-y-4 py-4">
    <h2 className="text-lg font-semibold">Bilan Nolio par période</h2>
    <Tabs value={mode} onValueChange={value=>{setMode(value==='verified'?'verified':'quick');setConfirmedAthlete(false);}}>
      <TabsList className="grid h-auto w-full grid-cols-2"><TabsTrigger className="min-h-11 whitespace-normal" value="quick">Rapide — à vérifier</TabsTrigger><TabsTrigger className="min-h-11 whitespace-normal" value="verified">Tests vérifiés</TabsTrigger></TabsList>
    </Tabs>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor="nolio-athlete">Athlète Nolio</Label><select id="nolio-athlete" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={athlete} disabled={busy} onChange={e=>{setAthlete(e.target.value);setBasket([]);setConfirmedAthlete(false);reset();}}><option value="">Choisir un athlète</option>{catalogues?.athletes.map(a=><option key={a.id} value={a.id} disabled={!a.has_api_access}>{a.name}{!a.has_api_access?' — accès refusé':''}</option>)}</select></div>
      <fieldset className="min-w-0 sm:col-span-2">
        <legend className="text-sm font-medium">Sports · {sports.size} sélectionnés</legend>
        <Input aria-label="Rechercher un sport" placeholder="Rechercher un sport" className="my-2" value={sportSearch} onChange={e=>setSportSearch(e.target.value)} disabled={busy}/>
        <div className="grid max-h-56 overflow-auto rounded-md border border-input sm:grid-cols-2">
          {catalogues?.sports.filter(s=>s.name.toLocaleLowerCase().includes(sportSearch.toLocaleLowerCase())).map(s=><label key={s.id} className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm">
            <Checkbox aria-label={s.name} checked={sports.has(s.id)} disabled={busy} onCheckedChange={checked=>{setSports(prev=>{const next=new Set(prev);if(checked===true)next.add(s.id);else next.delete(s.id);return next;});reset();}}/>
            <span className="min-w-0 break-words">{s.name}</span>
          </label>)}
        </div>
      </fieldset>
      <div><Label htmlFor="nolio-from">Du</Label><Input id="nolio-from" type="date" value={from} max={to||undefined} disabled={busy} onChange={e=>{setFrom(e.target.value);setBasket([]);reset();}}/></div>
      <div><Label htmlFor="nolio-to">Au (inclus)</Label><Input id="nolio-to" type="date" value={to} min={from||undefined} disabled={busy} onChange={e=>{setTo(e.target.value);setBasket([]);reset();}}/></div>
      <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2"><Checkbox checked={autoRecords} disabled={busy} onCheckedChange={v=>{setAutoRecords(v===true);reset();setBasket([]);}}/>Records adaptés au sport : puissance vélo, allures et distances course/natation, fréquence cardiaque</label>
      {!autoRecords&&<><div><Label htmlFor="nolio-category">Records</Label><select id="nolio-category" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={cat} disabled={busy} onChange={e=>{setCat(e.target.value);reset();}}>{Object.entries(catalogues?.windows??{}).map(([key,w])=><option key={key} value={key}>{w.label}</option>)}</select></div>
      <div><Label htmlFor="nolio-axis">Fenêtres</Label><select id="nolio-axis" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={axis} disabled={busy} onChange={e=>{setAxis(e.target.value);reset();}}><option value="time">Durées</option><option value="distance">Distances</option></select></div></>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">Lecture impossible : {error}</p>}
    {catalogues && !catalogues.complete && <p className="text-sm text-destructive">Liste Nolio incomplète.</p>}
    <Button onClick={search} disabled={busy||!catalogues||!athlete||!sports.size||!from||!to||from>to}><Search className="mr-2 h-4 w-4"/>{busy?'Lecture…':'Lire les records'}</Button>
    {athlete&&from&&to&&from<=to&&catalogues?.complete&&<NolioPeriodTestFinder key={`find-${athlete}-${from}-${to}`} athlete={athlete} from={from} to={to} onApply={onApply}/>}
    {mode==='verified'&&athlete&&from&&to&&from<=to&&catalogues?.complete&&<NolioThresholdTestReview key={`tte-${athlete}-${from}-${to}`} athlete={athlete} from={from} to={to} onApply={onApply}/>}
    {period && <>
      <p className="text-sm text-muted-foreground">{records.length} records · {reviewed.length} retenus · {period.from} → {period.to}</p>
      {!complete && <p role="alert" className="text-destructive text-sm">Réponse incomplète : préremplissage suspendu.</p>}
      {records.length===0 && <p className="text-sm">Données insuffisantes sur cette période.</p>}
      {records.length>0 && <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <Checkbox aria-label="Sélectionner tous les records" checked={allSelected?true:selected.size>0?'indeterminate':false} disabled={!selectable.length} onCheckedChange={checked=>setSelected(checked===true?new Set(selectable):new Set())}/>
        Sélectionner tous les records
      </label>}
      <div className="max-h-80 overflow-auto divide-y divide-border">
        {records.map((r,i)=><label key={i} className="flex items-start gap-3 py-3 text-sm">
          <Checkbox aria-label={`Retenir le record ${i+1}`} checked={selected.has(i)} disabled={typeof r.value!=='number'||!Number.isFinite(r.value)||r.value<=0} onCheckedChange={checked=>setSelected(prev=>{const next=new Set(prev);if(checked===true)next.add(i);else next.delete(i);return next;})}/>
          <span className="min-w-0 break-words"><span className="font-medium">{r.inner_val??'?'} {r.record_type==='distance'?'m':'s'} · {r.value??'Indisponible'} {r.unit}</span><br/>{r.sport_name??'Sport non fourni'} · {r.date??'Date non fournie'}<br/><span className="text-muted-foreground">{r.training_name??'Séance non fournie'}{r.training_id?` · ${r.training_id}`:''} · Effort enregistré, test non confirmé</span></span>
        </label>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!selected.size||!complete} onClick={()=>{setBasket(prev=>[...prev,...currentSelection]);setSelected(new Set());}}>Garder et poursuivre</Button>
        <Button variant="outline" disabled={!reviewed.length} onClick={download}><Download className="mr-2 h-4 w-4"/>Exporter la sélection</Button>
        {onApply && mode==='quick' && <Button disabled={!reviewed.length||!complete||!confirmedAthlete} onClick={()=>onApply(observedFields(reviewed),recordNotes(reviewed,period.from,period.to))}><Check className="mr-2 h-4 w-4"/>Préremplir les champs vides</Button>}
      </div>
      {onApply && <label className="flex items-center gap-3 py-2 text-sm"><Checkbox checked={confirmedAthlete} onCheckedChange={v=>setConfirmedAthlete(v===true)}/>Je confirme que cet athlète Nolio correspond à ce bilan.</label>}
      <NolioTestReview key={`${mode}-${athlete}-${period.from}-${period.to}-${records.length}-${[...selected].join(',')}-${basket.length}`} records={reviewed} mode={mode} athlete={athlete} from={period.from} to={period.to} onApply={onApply&&complete&&catalogues?.complete&&confirmedAthlete?onApply:undefined}/>
      {complete&&catalogues?.complete&&confirmedAthlete&&<details className="border-t border-border"><summary className="cursor-pointer py-3 font-medium text-sm">Repères critiques · étudier les efforts retenus</summary><CriticalEffortsPanel key={`critical-${athlete}-${period.from}-${period.to}`} records={reviewed} athleteLabel={catalogues.athletes.find(a=>a.id===athlete)?.name??'Athlète Nolio'}/></details>}
    </>}
  </section>;
}