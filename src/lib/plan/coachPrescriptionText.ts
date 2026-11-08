import type {V3Block} from '../../../scripts/library-v3/catalogueRuntime';
import type {V3IntensityTarget} from '../../../scripts/library-v3/resolveV3Intensity';
import {getDoctrineDomain} from '@/lib/zones/tfclDoctrine';
const number=(v:number)=>new Intl.NumberFormat('fr-BE',{maximumFractionDigits:3}).format(v);
/** Presentation only. Stored doses, bounds and targets remain unchanged. */
export function coachDuration(minutes:number):string{
 const seconds=Math.round(minutes*60000)/1000,m=Math.floor(seconds/60),s=seconds-m*60;
 return [m?`${m} min`:'',s?`${number(s)} s`:''].filter(Boolean).join(' ')||'0 min';
}
const pace=(seconds:number)=>`${Math.floor(seconds/60)}′${(seconds%60<10?'0':'')+number(seconds%60)}″`;
export function coachTarget(t:V3IntensityTarget,legacySpeedUnits=false):string{
 if(t.min===null)return 'À individualiser';
 if(t.metric==='m_per_sec'&&!legacySpeedUnits&&t.min>0&&t.max!==null&&t.max>0){
  return `${pace(1000/t.max)}${t.max!==t.min?` à ${pace(1000/t.min)}`:''} /km`;
 }
 const format=(v:number)=>['sec_per_km','sec_per_100m'].includes(t.metric)?pace(v):number(v);
 const unit={watts:'W',sec_per_km:'/km',sec_per_100m:'/100 m',m_per_sec:'m/s',coach_rpe_load:'RPE / charge',coach_field_effort:'RPE'}[t.metric];
 return `${format(t.min)}${t.max!==null&&t.max!==t.min?` à ${format(t.max)}`:''} ${unit}`;
}
export function coachBlocks(blocks:readonly V3Block[],indent='',legacyRepeatLabels=false):string{
 return blocks.map(b=>{
  if(b.kind==='repeat')return `${indent}${legacyRepeatLabels?`${b.count.base} répétitions`:`${b.label} — ${b.count.base} fois`} :\n${coachBlocks(b.steps,indent+'  ',legacyRepeatLabels)}${b.betweenSec?`\n${indent}Récupération entre répétitions : ${coachDuration(b.betweenSec/60)}`:''}`;
  const role={warmup:'Échauffement',main:'Travail',cooldown:'Retour au calme'}[b.role];
  const dose=b.kind==='time'?coachDuration(b.seconds!.base/60):b.kind==='distance'?`${number(b.meters!.base)} m`:`${b.reps!.base} répétitions`;
  return `${indent}${role} — ${b.label} : ${dose}${b.domain?` · ${getDoctrineDomain(b.domain).label}`:''}${b.repsTarget?` · cible ${b.repsTarget.base} répétitions`:''}${b.sides?` · ${b.sides} côtés`:''}${b.rpeRange?` · RPE ${b.rpeRange.min} à ${b.rpeRange.max}`:''}`;
 }).join('\n');
}
export function coachMissingReference(key:string):string{
 if(key==='coach_verified_rpe_and_load')return 'Charges et RPE de renforcement à confirmer';
 if(key.startsWith('swim_domain_pace'))return 'Allure individuelle de natation à préciser';
 return 'Repère individuel à compléter';
}
