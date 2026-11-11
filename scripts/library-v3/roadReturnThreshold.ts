import {developmentIntervalSources} from './developmentIntervalSources';
import type {V3Workout} from './catalogueRuntime';

export const RETURN_THRESHOLD_ID = 'V3P_RUN_221';

/** Re-exposure to a recent run, capped at its tolerated dose by the ordinary planner. */
function buildReturnThreshold():V3Workout {
  const source = structuredClone(developmentIntervalSources.find(s=>s.id==='V3P_RUN_209')!);
  const repeat = source.blocks[1];
  if (repeat.kind!=='repeat' || repeat.steps[0].kind!=='time') throw Error('return_threshold_source_layout');
  const phases = ['build','peak'];
  const cue = 'Courir trois minutes au seuil individuel sur le plat, sans accélérer. Trottiner trois minutes entre les fractions.';
  const prerequisites = [
    ...source.prerequisites,
    'Depuis la reprise, séance sur le plat déjà tolérée après dix minutes de course facile, avec au moins deux fractions de trois minutes au seuil individuel, trois minutes au trot entre les fractions et six minutes de retour au calme. Récupération satisfaisante après la séance.',
    'Allure de seuil actuelle vérifiée et volume des dernières semaines renseigné par le coach.',
  ];
  Object.assign(source,{id:RETURN_THRESHOLD_ID,version:'3.6-road-return',title:'Reprise 10 km · fractions de trois minutes au seuil',phase:phases,minimumLevel:'untrained',prerequisites,
    origin:'TFCLab · travail fractionné au seuil pour le 10 km. Principe présent dans le plan débutant 10 km de la British Heart Foundation (2019). La dose proposée est une composition TFCLab.',
    focus:'Réintroduire le rythme de seuil déjà couru, par fractions de trois minutes.',
    methodology:'Reprendre la dose de seuil confirmée par le coach. Conserver le trot de récupération et arrêter les fractions si l’allure ou la foulée se dégrade.'});
  repeat.count = {min:2,base:2,max:3};
  repeat.label = cue;
  repeat.steps[0] = {...repeat.steps[0],seconds:{min:180,base:180,max:180},label:cue};
  source.prescription.parameters = source.prescription.parameters.map(p=>
    p.path==='1.count'?{...p,...repeat.count}:p.path==='1.0.seconds'?{...p,min:180,base:180,max:180}:p);
  source.prescription.physiologicalIntent.statement = source.focus;
  source.prescription.admissibility = {...source.prescription.admissibility,minimumLevel:'untrained',prerequisites:[...prerequisites],phases:[...phases]};
  return source;
}
export const roadReturnThresholdSource = buildReturnThreshold();
