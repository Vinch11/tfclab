import {useState} from 'react';
import {getDoctrineDomain,type DoctrineDomainId} from '@/lib/zones/tfclDoctrine';

type SourceBlock = {kind:string;domain?:DoctrineDomainId|null;steps?:SourceBlock[]};
export type TrailSource = {sourceId:string;sourceFingerprint:string;title:string;sport:string;targets?:{status:string};blocks:SourceBlock[]};
export type TrailEvidence = {
  sourceId:string; sourceFingerprint:string; athleteId:string; terrainContextId:string;
  fieldReviewReference:string; coachConfirmsFieldEffortReview:true;
  domainRpe:Partial<Record<DoctrineDomainId,[number,number]>>;
};
export type TrailReview = {planningInputFingerprint:string;entries:TrailEvidence[]};
type Range = {min:string;max:string};
function domainsOf(blocks:SourceBlock[]):DoctrineDomainId[] {
  return blocks.flatMap(b=>b.kind==='repeat'?domainsOf(b.steps??[]):b.domain?[b.domain]:[]);
}

export function TrailGuidanceFields({sources,review,athleteId,fingerprint,busy,onApply}:{
  sources:TrailSource[];review:TrailReview|null;athleteId:string;fingerprint:string;busy:boolean;onApply:(value:TrailReview)=>void;
}) {
  const [ids,setIds]=useState<string[]>([]);
  const [terrain,setTerrain]=useState('');
  const [reference,setReference]=useState('');
  const [ranges,setRanges]=useState<Partial<Record<DoctrineDomainId, Range>>>({});
  const [confirmed,setConfirmed]=useState(false);
  const selected=sources.filter(s=>ids.includes(s.sourceId));
  const domains=[...new Set(selected.flatMap(s=>domainsOf(s.blocks)))];
  const valid=domains.length>0 && domains.every(d=>{
    const min=Number(ranges[d]?.min),max=Number(ranges[d]?.max);
    return Number.isInteger(min)&&Number.isInteger(max)&&min>=1&&max<=10&&min<=max;
  });
  function submit() {
    const additions=selected.map(s=>({
      athleteId,sourceId:s.sourceId,sourceFingerprint:s.sourceFingerprint,terrainContextId:terrain.trim(),
      fieldReviewReference:reference.trim(),coachConfirmsFieldEffortReview:true as const,
      domainRpe:Object.fromEntries(domainsOf(s.blocks).map(d=>[d,[Number(ranges[d]!.min),Number(ranges[d]!.max)]])),
    }));
    onApply({planningInputFingerprint:fingerprint,entries:[...(review?.entries??[]).filter(e=>!ids.includes(e.sourceId)),...additions]});
  }
  return <details className="space-y-2">
    <summary>Renseigner les efforts de terrain pour le guidage</summary>
    <label className="block">Parcours ou segment observé <input value={terrain} onChange={e=>{setConfirmed(false);setTerrain(e.target.value);}}/></label>
    <label className="block">Référence de la sortie observée <input value={reference} onChange={e=>{setConfirmed(false);setReference(e.target.value);}}/></label>
    <fieldset><legend>Fiches auxquelles cette observation s’applique</legend>
      {sources.map(s=><label className="block" key={s.sourceId}><input type="checkbox" checked={ids.includes(s.sourceId)}
        onChange={e=>{setConfirmed(false);setIds(e.target.checked?[...ids,s.sourceId]:ids.filter(id=>id!==s.sourceId));}}/> {s.title}
        {review?.entries.some(e=>e.sourceId===s.sourceId)?' · déjà renseignée':''}</label>)}
    </fieldset>
    {domains.map(d=><fieldset className="flex gap-2" key={d}><legend>{getDoctrineDomain(d).label} · RPE sur 10</legend>
      {(['min','max'] as const).map(bound=><label key={bound}>{bound==='min'?'Minimum':'Maximum'} <input className="w-16 rounded border" type="number" min="1" max="10" step="1"
        value={ranges[d]?.[bound]??''} onChange={e=>{setConfirmed(false);setRanges({...ranges,[d]:{min:'',max:'',...ranges[d],[bound]:e.target.value}});}}/></label>)}
    </fieldset>)}
    <label className="block"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> J’ai vérifié ces efforts pour cet athlète, ces fiches et ce terrain.</label>
    <button type="button" className="rounded border px-2 py-1" disabled={busy||!confirmed||!valid||!terrain.trim()||!reference.trim()} onClick={submit}>Appliquer les RPE terrain</button>
  </details>;
}
