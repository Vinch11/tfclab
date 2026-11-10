import type {V3Block,V3Workout} from '../../../scripts/library-v3/catalogueRuntime';
import {resolveDetLimiter} from '../../../experimental/det-engine/v403-limiter-semantics';
import {limiterSourceAffinity} from '../../../experimental/det-engine/v411-limiter-source-affinity';

export function rankedSourceIntent(source:V3Workout, metric:string):boolean {
  const keys = source.prescription.physiologicalIntent.limiterKeys;
  const resolution = resolveDetLimiter(metric);
  if (resolution.status === 'supported') return limiterSourceAffinity({primaryDomain:source.primaryDomain,limiterKeys:keys},resolution.key);
  switch (metric) {
    case 'FatMax': return source.primaryIntent === 'fatmax' && source.primaryDomain === 'moderate_lt1';
    case 'Économie': return keys.includes('movement_economy') && (keys.includes('technical_efficiency') || keys.includes('strength_mechanics'));
    case 'Robustesse': return keys.includes('tissue_load_tolerance') && source.sport === 'strength';
    case 'Durabilité (découplage)': return ['V3P_RUN_034','V3P_BIKE_041','V3P_BIKE_098'].includes(source.id) ||
      /^V3P_BIKE_(116|117|118|119|120)$/.test(source.id);
    case "W'": case "W' (kJ)": return ['V3P_BIKE_585','V3P_BIKE_614'].includes(source.id);
    default: return false;
  }
}

/** Count a prescription only when the configured main set retains work in the source domain. */
export function hasRankedWork(blocks:readonly V3Block[],domain:V3Workout['primaryDomain']):boolean {
  return blocks.some(b => b.kind === 'repeat' ? b.count.base > 0 && hasRankedWork(b.steps,domain) :
    b.role === 'main' && b.domain === domain && (b.seconds?.base ?? b.meters?.base ?? b.reps?.base ?? 0)>0);
}

export const hasAdditionalPrimaryRule = (metric:string) =>
  ['FatMax','Économie','Robustesse','Durabilité (découplage)',"W'","W' (kJ)"].includes(metric);

/** Only count prescribed work in the source domain. Rest between repeats,
 * warm-up and unrelated technical work are deliberately absent. */
export function rankedWorkDose(blocks:readonly V3Block[],domain:V3Workout['primaryDomain']):string {
  let seconds=0,meters=0,reps=0;
  function visit(steps:readonly V3Block[],factor:number) {
    for(const b of steps){
      if(b.kind==='repeat')visit(b.steps,factor*b.count.base);
      else if(b.role==='main' && b.domain===domain){
        if(b.kind==='time')seconds+=factor*(b.seconds?.base??0);
        if(b.kind==='distance')meters+=factor*(b.meters?.base??0);
        if(b.kind==='reps')reps+=factor*(b.reps?.base??0);
      }
    }
  }
  visit(blocks,1);
  const format=(n:number)=>Number(n.toFixed(2)).toLocaleString('fr-FR');
  return [seconds?format(seconds/60)+' min':'',meters?format(meters)+' m':'',reps?format(reps)+' rép.':''].filter(Boolean).join(' + ');
}
