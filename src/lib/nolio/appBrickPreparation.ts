import {canonicalJson} from '@/lib/plan/appendOnlyPlanVersionSave';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {checkV3SessionCatalogue} from '@/lib/det/v3SessionCatalogue';
import {appProfileDetStructure} from '@/lib/det/appProfileDetStructure';
import type {ProposedV3Session,ProposedV3Workout} from '@/lib/det/appPlanningV3Proposal';
import {sessionsFromPlanJson} from '../../../supabase/functions/_shared/nolioV2/planSessions';
import {previewAppBrickSplit,type AppBrickSplitChoice} from '../../../supabase/functions/_shared/nolioV2/multisportSplit';
import {resolveLocalInstant} from '../../../supabase/functions/_shared/nolioV2/localTime';
/** Prepare a NEW export version from intact source prescriptions. The caller
 * must authenticate, save append-only and confirm exact readback. */
export async function prepareAppBrickExport(plan:ParsedPlan,input:{keys:string[];timeZone:string;time:string;transitionMinutes:number;confirmed:boolean}){
 if(input.confirmed!==true||!input.keys.length||new Set(input.keys).size!==input.keys.length)throw Error('Choisissez et confirmez les enchaînements.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)||!input.timeZone.trim())throw Error('Indiquez une heure et un fuseau horaire valides.');
 if(!Number.isInteger(input.transitionMinutes)||input.transitionMinutes<3||input.transitionMinutes>10)throw Error('Confirmez une transition de 3 à 10 minutes.');
 const next=structuredClone(plan) as ParsedPlan & {_nolioV2MultisportSplits?:Record<string,unknown>};
 const selected=new Set(input.keys),found=new Set<string>();
 for(const w of next.weeks)for(const [i,raw] of w.sessions.entries()){
  const key=`S${raw.weekNumber}-J${raw.dayIndex}-${i}`;if(!selected.has(key))continue;
  const s=raw as typeof raw & {detSourceComponents?:ProposedV3Workout[]};
  if(s.isRest||s.sport!=='brick'||s.detSourceComponents?.length!==2)throw Error('Cet enchaînement ne possède pas ses deux prescriptions sauvegardées.');
  const check=checkV3SessionCatalogue(s);
  if(!check||check.errors.length||check.unknown.length)throw Error('Les blocs de cet enchaînement ont changé : régénérez ou corrigez le plan.');
  const structure=appProfileDetStructure({role:'long',sport:'brick',components:s.detSourceComponents} as ProposedV3Session);
  if(!structure.detStructuredComponents)throw Error('Les deux prescriptions ne sont pas représentables avec les données disponibles.');
  Object.assign(s,structure);found.add(key);
 }
 if(found.size!==selected.size)throw Error('Sélection de séances périmée.');
 const extracted=sessionsFromPlanJson(next);if(extracted.problems.length)throw Error('Dates du plan invalides.');
 const choices:Record<string,AppBrickSplitChoice>={};
 for(const s of extracted.sessions.filter(s=>selected.has(s.sessionKey))){
  const minuteOfDay=Number(input.time.slice(0,2))*60+Number(input.time.slice(3));
  const instant=resolveLocalInstant(input.timeZone,s.date,minuteOfDay);
  if(instant.status!=='ok')throw Error('Horaire inexistant, ambigu ou fuseau invalide pour '+s.date+'. Choisissez un autre horaire.');
  const bikeStart={provenance:'coach_confirmed' as const,localDate:s.date,minuteOfDay,timeZone:input.timeZone,utcOffsetMinutes:instant.utcOffsetMinutes};
  if(s.coachStart&&canonicalJson(s.coachStart)!==canonicalJson(bikeStart))throw Error('Cet horaire diffère du créneau déjà confirmé dans le plan : sélectionnez les enchaînements ayant le même horaire, ou corrigez leur créneau dans le plan.');
  const r=await previewAppBrickSplit(s,{transitionSeconds:input.transitionMinutes*60,bikeStart});
  if('reason' in r)throw Error('Préparation impossible : '+r.reason);
  choices[s.sessionKey]={schema:'nolio-app-brick-split-v1',parentSha256:r.preview.parentSha256,coachConfirmed:true,transitionSeconds:input.transitionMinutes*60,bikeStart};
 }
 next._nolioV2MultisportSplits={...next._nolioV2MultisportSplits,...choices};
 return next;
}
