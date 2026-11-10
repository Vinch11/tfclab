import {v3FullCatalogue,type V3Workout} from './catalogueRuntime';

const parent=v3FullCatalogue.workouts.find(source=>source.id==='V3P_RUN_101')!;
const recipes=[
  {id:'V3P_RUN_217',title:'Reprise sur plat · alternances courtes',run:60,walk:90,min:2,base:4,max:8},
  {id:'V3P_RUN_218',title:'Reprise sur plat · continuité en marche-course',run:120,walk:120,min:3,base:6,max:12},
  {id:'V3P_RUN_219',title:'Endurance sur plat · sortie longue en marche-course',run:120,walk:180,min:6,base:9,max:15},
  {id:'V3P_RUN_220',title:'Sortie longue sur plat · marche dominante',run:120,walk:300,min:10,base:12,max:16},
];
// The NHS Couch to 5K programme supports alternation and rest days.
// These original variants are not validated NHS sessions.
export const roadReturnSources:V3Workout[]=recipes.map(recipe=>{
  const source=structuredClone(parent);
  source.id=recipe.id;
  source.version='3.5-road-return-candidate';
  source.title=recipe.title;
  source.origin='TFCLab · adaptation marche-course sur plat. Principe : NHS Couch to 5K.';
  source.phase=['base','build','peak','taper'];
  source.focus='Accumuler des fractions de course facile entre des marches de récupération.';
  source.methodology='Parcours plat. Marcher sans cible d’allure. Le coach choisit la dose selon la tolérance récente aux impacts.';
  source.prescription.physiologicalIntent.statement=source.focus;
  source.prescription.admissibility.phases=[...source.phase];
  const [warm,repeat,cool]=source.blocks;
  if(warm.kind!=='time'||repeat.kind!=='repeat'||cool.kind!=='time')throw Error('road_return_parent_shape');
  const [run,walk]=repeat.steps;
  if(run.kind!=='time'||walk.kind!=='time')throw Error('road_return_repeat_shape');
  const fixed=(n:number)=>({min:n,base:n,max:n});
  warm.seconds=fixed(recipe.id==='V3P_RUN_217'?240:300);warm.label='Marcher progressivement sur le plat.';
  cool.seconds=fixed(recipe.id==='V3P_RUN_217'?180:300);cool.label='Terminer en marchant tranquillement.';
  run.seconds=fixed(recipe.run);run.label='Courir facilement, en aisance respiratoire.';
  walk.seconds=fixed(recipe.walk);walk.label='Marcher à son rythme.';
  for(const step of [warm,cool,walk])step.rpeRange={min:1,max:2};
  repeat.count={min:recipe.min,base:recipe.base,max:recipe.max};repeat.label='Alterner course et marche';
  const bounds=[warm.seconds,repeat.count,fixed(0),run.seconds,walk.seconds,cool.seconds];
  source.prescription.parameters=source.prescription.parameters.map((p,i)=>({...p,...bounds[i]}));
  source.prescription.individualization.anchors=source.prescription.individualization.anchors.filter(a=>a.domain!=='recovery');
  return source;
});
