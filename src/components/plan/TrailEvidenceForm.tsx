import {useState} from 'react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {findSource} from '@/lib/det/coachDetContext';
import type {FamilySourcePool} from '@/lib/det/familySourcePools';
import type {FrozenAppPlanningInput} from '@/lib/det/appPlanningInput';
import {evaluateV3Workout} from '../../../scripts/library-v3/catalogueRuntime';
import {fingerprintV3SportingSource} from '../../../scripts/library-v3/sportingQualification800';
import {fingerprintTrailRoute,type TrailCoachReview,type TrailRouteReview} from '../../../experimental/det-engine/v360-trail-evidence';
import {detPrimaryLimiterKey,traceLimiterSemantics} from '../../../experimental/det-engine/v403-limiter-semantics';
import {coachFamilyFor} from '../../../experimental/det-engine/v401-coach-inputs-core';
import type {TrailPlanningDeclaration} from '../../../experimental/det-engine/v407-reviewed-trail-contract';

const HISTORY:Record<keyof Omit<TrailCoachReview['history'],'downhillExposureDocumented'|'reviewReference'>,string>={weeksHeld:'Semaines consécutives documentées',weeklyMinutes:'Durée habituelle par semaine (min)',weeklyDPlusM:'D+ habituel par semaine (m)',weeklyDMinusM:'D− habituel par semaine (m)',longestRunMinutes:'Plus longue sortie déjà tolérée (min)',largestDescentM:'Plus grande descente déjà tolérée (m)',observedReadyAfterHours:'Récupération réellement observée (h)'};
const BOUNDS:Record<keyof TrailCoachReview['bounds'],string>={weeklyDPlusM:'Plafond D+ hebdomadaire (m)',weeklyDMinusM:'Plafond D− hebdomadaire (m)',loadStepDPlusM:'Hausse maximale D+ entre semaines de charge (m)',loadStepDMinusM:'Hausse maximale D− entre semaines de charge (m)',longRunStepMinutes:'Hausse maximale de sortie longue (min)',peakLongMinutes:'Sortie spécifique minimale au pic (min)',peakDPlusM:'D+ minimal de la sortie spécifique (m)',peakDMinusM:'D− minimal de la sortie spécifique (m)'};
const ROUTE_NUM={distanceKm:'Distance (km)',dPlusM:'D+ (m)',dMinusM:'D− (m)',descentMinutes:'Descente (min)',minimumRecoveryHours:'Récupération minimale (h)'} as const;
const DOMAINS={recovery:'Récupération',moderate_lt1:'Endurance',mlss:'Seuil',vo2max:'VO₂max'} as const;
/** Actual coach declarations. No imported observations, checked boxes or RPE defaults. */
export function TrailEvidenceForm({pool,app,value,onChange}:{pool:FamilySourcePool;app:FrozenAppPlanningInput|null;value?:TrailPlanningDeclaration;onChange:(d:TrailPlanningDeclaration|undefined)=>void}){
 const [fields,setFields]=useState<Record<string,string>>({});
 const [rows,setRows]=useState<Record<string,Record<string,string>>>({});
 const [checks,setChecks]=useState<Record<string,boolean>>({});
 const [messages,setMessages]=useState<string[]>([]);
 const set=(k:string,v:string)=>{setFields(p=>({...p,[k]:v}));onChange(undefined);setMessages([]);};
 const rowSet=(id:string,k:string,v:string)=>{setRows(p=>({...p,[id]:{...p[id],[k]:v}}));onChange(undefined);setMessages([]);};
 const number=(k:string,label:string)=><label key={k} className="text-xs space-y-1">{label}<Input type="number" min="0" step="any" aria-label={label} value={fields[k]??''} onChange={e=>set(k,e.target.value)}/></label>;
 const confirm=()=>{
  const p:string[]=[];if(!app){setMessages(['Profil de planification indisponible.']);return;}
  const family=coachFamilyFor(String(app.config.objective)),goal=app.config.raceGoals?.find(g=>g.priority==='A');
  const primary=detPrimaryLimiterKey(app.config);
  if(app.config.crossTrainingMaintenance?.velo!==true||app.config.crossTrainingMaintenance?.natation===true)p.push('Ce protocole trail testé demande le cross-training vélo, sans natation : confirmer ce choix dans le formulaire principal.');
  if(!family||family.sportFocus!=='trail'||!['tte','vo2max','durability_race_relative'].includes(primary??'')||traceLimiterSemantics(app.limiters.applied,family.key).blocking)p.push('Le limiteur principal doit être pris en charge par le format trail choisi.');
  if(!goal?.distanceKm||!goal.elevationGainM||!goal.targetTimeMinutes)p.push('Compléter distance, D+ et durée prévue de la course dans le formulaire principal.');
  const history=Object.fromEntries(Object.keys(HISTORY).map(k=>[k,Number(fields['h.'+k])])) as unknown as TrailCoachReview['history'];
  const bounds=Object.fromEntries(Object.keys(BOUNDS).map(k=>[k,Number(fields['b.'+k])])) as unknown as TrailCoachReview['bounds'];
  if([...Object.values(history),...Object.values(bounds),Number(fields.loss),Number(fields.longStart),Number(fields.longPeak)].some(v=>typeof v!=='number'||!Number.isFinite(v)||v<=0))p.push('Renseigner chaque observation et chaque limite avec une valeur positive.');
  if(!fields.reference?.trim()||!fields.fieldReference?.trim())p.push('Préciser les références de l’historique et de la revue terrain.');
  if(!checks.history||!checks.effort||!checks.readiness||!checks.schedule||(family?.key!=='trail_short'&&!checks.backToBack))p.push('Confirmer les vérifications et l’organisation hebdomadaire affichées.');
  const domainRpe:TrailPlanningDeclaration['domainRpe']={};
  for(const k of Object.keys(DOMAINS) as Array<keyof typeof DOMAINS>){const lo=Number(fields[k+'.min']),hi=Number(fields[k+'.max']);if(!lo||!hi||lo>=hi||hi>10)p.push(`RPE ${DOMAINS[k]} : saisir une plage individuelle entre 1 et 10.`);else domainRpe[k]=[lo,hi];}
  const routes:TrailRouteReview[]=pool.ids.filter(id=>findSource(id)?.sport==='run').map(id=>{
   const w=findSource(id)!,r=rows[id]??{};
   const values=Object.fromEntries(Object.keys(ROUTE_NUM).map(k=>[k,Number(r[k])])) as Pick<TrailRouteReview,keyof typeof ROUTE_NUM>;
   if(!r.name?.trim()||!r.role||!r.technicality||Object.keys(ROUTE_NUM).some(k=>r[k]===undefined||r[k]===''||!Number.isFinite(Number(r[k]))||Number(r[k])<0)||values.distanceKm<=0)p.push(`${w.title} : compléter le parcours, son rôle et ses mesures (zéro autorisé pour un parcours plat).`);
   return {athleteId:app.athleteId,objective:family?.engineObjective??'',sourceId:id,sourceFingerprint:fingerprintV3SportingSource(w),routeId:r.name?.trim()??'',durationMin:pool.doses[id]?.targetDurationMin??evaluateV3Workout(w).minutes??0,...values,
    role:r.role as TrailRouteReview['role'],technicality:r.technicality as TrailRouteReview['technicality'],fuelingPractice:r.fueling==='true',minimumRecoveryHours:values.minimumRecoveryHours,provenance:'explicit_coach_route_observation',coachApproved:true};
  });
  if(p.length){setMessages([...new Set(p)]);return;}
  const review:TrailCoachReview={athleteId:app.athleteId,objective:family!.engineObjective,weeks:Number(app.config.weeksAvailable),weeklyHours:Number(app.config.weeklyHours),primaryLimiter:primary as TrailCoachReview['primaryLimiter'],race:{distanceKm:goal!.distanceKm!,elevationGainM:goal!.elevationGainM!,elevationLossM:Number(fields.loss),targetTimeMinutes:goal!.targetTimeMinutes!},history:{...history,downhillExposureDocumented:true,reviewReference:fields.reference.trim()},bounds,backToBackApproved:checks.backToBack===true,terrainEffortReviewConfirmed:true,futureReadinessCheckRequired:true,routeFingerprints:Object.fromEntries(routes.map(r=>[r.sourceId,fingerprintTrailRoute(r)]))};
  onChange({review,routes,longStartMinutes:Number(fields.longStart),longPeakMinutes:Number(fields.longPeak),scheduleConfirmed:true,fieldReviewReference:fields.fieldReference.trim(),domainRpe});setMessages(['Données terrain confirmées pour ce profil. Les contrôles de cohérence restent obligatoires à la génération.']);
 };
 return <section className="space-y-3 border rounded-md p-3" data-testid="trail-evidence-form"><h4 className="font-medium">Trail : historique, terrain et parcours</h4>
  <p className="text-sm">Renseigner les observations propres à cet athlète. D− et récupération restent des données distinctes du D+. Aucune allure sur route ne sera transposée au terrain.</p>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{number('loss','D− de la course (m)')}{Object.entries(HISTORY).map(([k,l])=>number('h.'+k,l))}{Object.entries(BOUNDS).map(([k,l])=>number('b.'+k,l))}{number('longStart','Plafond sortie longue en début de plan (min)')}{number('longPeak','Plafond sortie longue au pic (min)')}</div>
  <Input aria-label="Référence historique trail" placeholder="Référence de l’historique : carnet, période, observations" value={fields.reference??''} onChange={e=>set('reference',e.target.value)}/>
  <Input aria-label="Référence revue terrain" placeholder="Référence de la revue des efforts sur terrain" value={fields.fieldReference??''} onChange={e=>set('fieldReference',e.target.value)}/>
  <p className="text-sm">Plages RPE individuelles revues sur terrain (1–10)</p><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{Object.entries(DOMAINS).map(([k,l])=><div key={k}>{number(k+'.min',l+' minimum')}{number(k+'.max',l+' maximum')}</div>)}</div>
  <details><summary className="cursor-pointer">Parcours associés aux séances de course ({pool.ids.filter(id=>findSource(id)?.sport==='run').length})</summary><div className="space-y-3 mt-2">{pool.ids.filter(id=>findSource(id)?.sport==='run').map(id=>{const w=findSource(id)!,r=rows[id]??{};return <div key={id} className="border rounded-md p-2 space-y-2"><p className="text-sm font-medium">{w.title} · {pool.doses[id]?.targetDurationMin??evaluateV3Workout(w).minutes} min</p><Input aria-label={'Parcours '+w.title} placeholder="Nom ou référence du parcours observé" value={r.name??''} onChange={e=>rowSet(id,'name',e.target.value)}/><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{Object.entries(ROUTE_NUM).map(([k,l])=><label key={k} className="text-xs">{l}<Input type="number" min="0" step="any" aria-label={w.title+' '+l} value={r[k]??''} onChange={e=>rowSet(id,k,e.target.value)}/></label>)}</div><div className="flex flex-wrap gap-2"><select aria-label={'Rôle '+w.title} value={r.role??''} onChange={e=>rowSet(id,'role',e.target.value)}><option value="">Rôle du parcours</option><option value="support">Endurance facile</option><option value="technical">Technique</option><option value="long_terrain">Sortie longue spécifique</option><option value="uphill_quality">Qualité en montée</option></select><select aria-label={'Terrain '+w.title} value={r.technicality??''} onChange={e=>rowSet(id,'technicality',e.target.value)}><option value="">Technicité</option><option value="easy">Facile</option><option value="rocky">Technique / rocheux</option></select><label className="text-xs"><input type="checkbox" checked={r.fueling==='true'} onChange={e=>rowSet(id,'fueling',String(e.target.checked))}/> Ravitaillement pratiqué</label></div></div>;})}</div></details>
  <p className="text-sm">Organisation proposée : lundi repos ; mardi qualité course ; mercredi vélo et force ; jeudi course facile ; vendredi vélo (montagne/ultra) ; samedi technique ; dimanche sortie longue. Semaines réduites : mardi/jeudi/dimanche course et mercredi vélo/force, sans force la semaine de course. Activez le cross-training vélo, sans natation, dans le formulaire principal. Prévoir 5 séances cardio (court) ou 6 (montagne/ultra), 1 force, 2 séances maximum par jour.</p>
  {Object.entries({history:'Historique de descente documenté et toléré',effort:'Consignes de ressenti revues sur ces terrains',readiness:'Douleur, technique et récupération à réévaluer avant chaque séance',backToBack:'Enchaînement samedi/dimanche approuvé pour cet athlète',schedule:'Cette organisation est compatible avec les disponibilités et contraintes de cet athlète'}).map(([k,l])=><label key={k} className="flex gap-2 text-sm"><input type="checkbox" checked={checks[k]===true} onChange={e=>{setChecks(p=>({...p,[k]:e.target.checked}));onChange(undefined);}}/>{l}</label>)}
  <Button type="button" variant="outline" onClick={confirm}>Confirmer ces données et parcours</Button>{value&&<p className="text-xs">Revue terrain liée au profil actuel.</p>}{messages.map(m=><p key={m} className="text-xs">{m}</p>)}
 </section>;
}
