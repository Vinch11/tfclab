import {useState,useEffect} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import type {TimeTrialDeclaration} from '../../../experimental/det-engine/v410-time-trial-contract';
const NUMBERS={longestContinuousAeroMinutes:'Plus longue tenue continue observée (min)',maxAeroMinutesPerSession:'Plafond aéro total approuvé par séance (min)',minimumContinuousAeroMinutes:'Tenue continue minimale recherchée (min)',minimumAeroMinutesPerSession:'Pratique aéro minimale par séance spécifique (min)',minimumAeroSessions:'Nombre minimal de séances spécifiques'} as const;
/** No history value or human approval is supplied by default. */
export function TimeTrialEvidenceForm({athleteId,raceDuration,profileObjective,value,onChange}:{athleteId:string;raceDuration:string;profileObjective?:string;value?:TimeTrialDeclaration;onChange:(v:TimeTrialDeclaration|undefined)=>void}){
 const [fields,setFields]=useState<Record<string,string>>({}),[checks,setChecks]=useState<Record<string,boolean>>({});
 useEffect(()=>{setFields({});setChecks({});onChange(undefined);},[athleteId]); // eslint-disable-line react-hooks/exhaustive-deps
 const set=(k:string,v:string)=>{setFields(p=>({...p,[k]:v}));onChange(undefined);};
 const ready=fields.aeroWeeks?.trim()&&fields.aeroDayIndex!==undefined&&athleteId&&Number(raceDuration)>0&&fields.observedOn&&fields.reviewReference?.trim()&&Object.keys(NUMBERS).every(k=>Number(fields[k])>0)&&checks.fit&&checks.clear;
 return <section aria-label="Revue spécifique contre-la-montre" className="border rounded p-3 space-y-2"><p className="text-sm font-medium">Contre-la-montre : observation de la position aéro</p><p className="text-xs">Profil physiologique de référence conservé : {profileObjective??"à charger"}. Renseignez la durée prévue de course et les limites posturales vérifiées pour cet athlète. Le moteur ne prédit ni vitesse ni puissance de course. La structure des blocs et des pauses est conservée ; cette revue ne vaut pas attestation scientifique.</p>
 <label className="text-xs">Semaines de pratique aéro (numéros séparés par une virgule)<Input aria-label="Semaines de pratique aéro" value={fields.aeroWeeks??''} onChange={e=>set('aeroWeeks',e.target.value)}/></label>
 <label className="text-xs">Jour choisi pour ces séances<select aria-label="Jour de pratique aéro" value={fields.aeroDayIndex??''} onChange={e=>set('aeroDayIndex',e.target.value)}><option value="">Choisir…</option>{['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label>
 <Input aria-label="Date de l’observation aéro" type="date" value={fields.observedOn??''} onChange={e=>set('observedOn',e.target.value)}/>
 <Input aria-label="Référence de l’observation aéro" placeholder="Observation terrain / compte rendu" value={fields.reviewReference??''} onChange={e=>set('reviewReference',e.target.value)}/>
 <div className="grid grid-cols-2 gap-2">{Object.entries(NUMBERS).map(([k,label])=><label key={k} className="text-xs">{label}<Input aria-label={label} type="number" min="0" step="any" value={fields[k]??''} onChange={e=>set(k,e.target.value)}/></label>)}</div>
 {Object.entries({fit:'Réglage du vélo et maintien de la position vérifiés',clear:'Absence de douleur cervicale/lombaire ou autre gêne en position, vérifiée avec l’athlète'}).map(([k,label])=><label key={k} className="flex gap-2 text-xs"><Checkbox checked={checks[k]===true} onCheckedChange={v=>{setChecks(p=>({...p,[k]:v===true}));onChange(undefined);}}/>{label}</label>)}
 <Button type="button" variant="outline" disabled={!ready} onClick={()=>onChange({aeroWeeks:(fields.aeroWeeks??'').split(',').map(x=>Number(x.trim())),aeroDayIndex:Number(fields.aeroDayIndex),athleteId,raceDurationMinutes:Number(raceDuration),observedOn:fields.observedOn,reviewReference:fields.reviewReference.trim(),bikeFitConfirmed:checks.fit===true,symptomScreenClear:checks.clear===true,...Object.fromEntries(Object.keys(NUMBERS).map(k=>[k,Number(fields[k])]))} as TimeTrialDeclaration)}>Confirmer mon observation pour ce CLM</Button>{value&&<p className="text-xs">Observation liée au profil partagé. Toute modification du profil ou de ces limites périme les revues de séances.</p>}
 </section>;
}
