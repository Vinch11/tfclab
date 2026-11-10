import {trainedStrengthSources} from '../../../scripts/library-v3/completeSessionSources';
import type {V3Workout} from '../../../scripts/library-v3/catalogueRuntime';

export const SUBMAXIMAL_STRENGTH_IDS = ['V3P_STRENGTH_451','V3P_STRENGTH_452'];
const cache=new Map<string,V3Workout>();
/** Keep a trained runner's strength slot when a neighbouring running session
 * calls for aerobic speed. These are separate prescriptions with a lower load. */
export function findSubmaximalStrength(id:string):V3Workout|undefined {
  const variant=SUBMAXIMAL_STRENGTH_IDS.indexOf(id);
  if(variant<0)return undefined;
  if(cache.has(id))return cache.get(id);
  const w=structuredClone(trainedStrengthSources[variant]);
  const moves=variant ? ['Fente arrière','Hip thrust','Mollets genoux fléchis'] : ['Squat','Soulevé de terre roumain','Mollets debout'];
  w.id=id; w.version='3.4.0-det-strength-candidate'; w.phase=['base','build','peak'];
  w.title='Renforcement sous-maximal · '+moves.join(', ');
  w.focus='Entretenir les gestes de force avec une charge modérée et une exécution stable.';
  w.primaryIntent='strength_endurance';
  w.origin='TFCLab DET · variante technique de renforcement pour coureur entraîné.';
  w.methodology='Effectuer deux tours. Choisir une charge permettant cinq répétitions faciles et stables à RPE 5–6/10. Garder au moins trois répétitions en réserve. Repos durant le temps restant de chaque bloc.';
  const main=w.blocks[1];
  if(main.kind!=='repeat')throw Error('Format de renforcement DET non reconnu.');
  main.label='Deux tours de renforcement à charge modérée';
  main.steps.forEach((step,i)=>{
    if(step.kind!=='time')throw Error('Exercice de renforcement DET sans durée.');
    step.label=moves[i]+(moves[i]==='Fente arrière'?' · cinq répétitions de chaque côté':' · cinq répétitions')+'. Régler une charge modérée, RPE 5–6/10. Récupérer le reste des trois minutes, au moins deux minutes.';
    step.rpeRange={min:5,max:6};
  });
  w.prescription.physiologicalIntent={...w.prescription.physiologicalIntent,statement:w.focus,primaryIntent:w.primaryIntent,
    limiterKeys:['strength_mechanics','tissue_load_tolerance']};
  w.prescription.admissibility={...w.prescription.admissibility,phases:[...w.phase]};
  cache.set(id,w);
  return w;
}
