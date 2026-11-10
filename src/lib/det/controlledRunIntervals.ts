import type { Bounds, V3Workout } from '../../../scripts/library-v3/catalogueRuntime';

const strengthSeparation = '🚫 STRATÉGIE — Blocs VO2 lourds: Incompatible avec le travail de force max. Le travail de force max nécessite une récupération neuromusculaire incompatible avec les blocs VO2 intensifs. Séparer ces stimuli dans le temps.';
export const requiresStrengthSeparation = (prohibitions:readonly string[] = []) => prohibitions.includes(strengthSeparation);

/** Only an unrestricted profile or the recognised heavy-block restriction
 * can use this dose. Cycling watts are never used as a running pace. */
export function allowsControlledRunIntervals(prohibitions:readonly string[] = []):boolean {
  const related = prohibitions.filter(text=>/vo[2₂](?:\s*max)?|\bvma\b|\b(?:zone\s*5|z5)\b/i.test(text));
  return related.every(text=>
    text.startsWith('🚫 RESTRICTION VO2max LOURD') &&
    text.includes('AUTORISÉ : intervalles VO2max COURTS et CONTRÔLÉS') ||
    text==='🚫 Pas de blocs VO2max longs ≥5min (jugement coach).' || text===strengthSeparation);
}

/** One time-based main set, 3–4 × 3 min, at least 4 min between bouts.
 * Prescribe only a combination inside the original V3 bounds. */
export function controlledRunDose(source:V3Workout) {
  if(source.sport!=='run'||source.primaryDomain!=='vo2max'||source.primaryIntent!=='vo2max')return null;
  const [warmup,work,cooldown]=source.blocks;
  if(source.blocks.length!==3||warmup.kind!=='time'||warmup.role!=='warmup'||
    cooldown.kind!=='time'||cooldown.role!=='cooldown'||
    ![warmup.domain,cooldown.domain].every(d=>d==='recovery'||d==='moderate_lt1')||
    work.kind!=='repeat'||work.steps.length!==1)return null;
  const bout=work.steps[0];
  const within=(b:Bounds|undefined,value:number)=>!!b&&b.min<=value&&value<=b.max;
  const count=Math.max(3,work.count.min), rest=Math.max(240,work.betweenSec);
  if(bout.kind!=='time'||bout.role!=='main'||bout.domain!=='vo2max'||!within(bout.seconds,180)||
    !Number.isInteger(count)||count>4||count>work.count.max||
    !(work.betweenSecBounds?within(work.betweenSecBounds,rest):rest===work.betweenSec))return null;
  const overrides: Record<string,number> = {'1.count':count,'1.0.seconds':180};
  if(work.betweenSecBounds)overrides['1.betweenSec']=rest;
  return {overrides,allowWorksetChange:true};
}
