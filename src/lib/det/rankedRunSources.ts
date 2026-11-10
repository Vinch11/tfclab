import {v3FullCatalogue,type V3Block,type V3Leaf,type V3Workout} from '../../../scripts/library-v3/catalogueRuntime';

const fixed = (value:number) => ({min:value,base:value,max:value});
const timed = (minutes:number,role:V3Leaf['role'],domain:V3Leaf['domain'],label:string):V3Leaf =>
  ({kind:'time',seconds:fixed(minutes*60),role,domain,label});
const warm = timed(12,'warmup','recovery','Courir facilement et progressivement. Vérifier le confort avant les fractions.');
const cool = timed(8,'cooldown','recovery','Terminer par une course facile.');
const intervals = (count:number,minutes:number,rest:number,domain:V3Leaf['domain'],label:string):V3Block =>
  ({kind:'repeat',label,count:fixed(count),betweenSec:rest*60,betweenSecBounds:fixed(rest*60),steps:[timed(minutes,'main',domain,label)]});

export const TRAIL_THRESHOLD_ID='V3P_RUN_206';
export const SHORT_AEROBIC_INTERVALS_ID='V3P_RUN_207';
export const AEROBIC_MAINTENANCE_ID='V3P_RUN_208';

type Recipe = Pick<V3Workout,'title'|'focus'|'methodology'|'prerequisites'|'phase'|'blocks'> & {parent:string};
const recipes:Record<string,Recipe>={
  [TRAIL_THRESHOLD_ID]:{
    parent:'V3P_RUN_137',title:'Trail roulant · deux fractions de cinq minutes au seuil contrôlé',phase:['base','build','peak'],
    focus:'Cumuler dix minutes au seuil en deux fractions régulières, sur un terrain connu et peu technique.',
    methodology:'Choisir une portion roulante à pente stable. Le coach vérifie le repère de seuil en conditions comparables. Ralentir si l’effort augmente à allure constante.',
    prerequisites:['Course facile continue déjà tolérée pendant au moins 35 minutes.','Seuil et terrain régulier vérifiés par le coach.','Charge et récupération compatibles avec une première exposition fractionnée.'],
    blocks:[warm,intervals(2,5,3,'mlss','Courir cinq minutes à l’effort de seuil individuel, régulier et maîtrisé.'),cool],
  },
  [SHORT_AEROBIC_INTERVALS_ID]:{
    parent:'V3P_RUN_167',title:'Course sur le plat · trois fractions aérobies de deux minutes',phase:['build'],
    focus:'Travailler la vitesse aérobie individuelle en gardant trois fractions régulières et une récupération longue.',
    methodology:'Sur piste ou portion plane mesurée. Utiliser les repères de vitesse individuels. Trottiner très facilement entre les fractions. Interrompre le travail si le rythme ou la technique se dégrade.',
    prerequisites:['Pratique régulière et fractions courtes déjà tolérées.','VMA et allure de seuil individuelles disponibles.','Accès à une piste ou à une portion plate et régulière vérifié par le coach.'],
    blocks:[warm,intervals(3,2,3,'vo2max','Répéter deux minutes dans la plage de vitesse aérobie individuelle sur le plat. Garder le contrôle sur les trois fractions.'),cool],
  },
  [AEROBIC_MAINTENANCE_ID]:{
    parent:'V3P_RUN_034',title:'Entretien aérobie continu · effort stable',phase:['peak'],
    focus:'Entretenir le travail oxydatif à un effort aérobie stable sur parcours roulant.',
    methodology:'Suivre le repère aérobie individuel et une respiration aisée. Conserver les habitudes alimentaires habituelles. Le travail vise l’endurance oxydative. La détermination de l’intensité de FatMax nécessite un repère spécifique.',
    prerequisites:['Course facile continue de 45 minutes déjà tolérée.','Parcours sans difficulté technique choisi par le coach.'],
    blocks:[timed(8,'warmup','recovery','Courir très facilement.'),timed(30,'main','moderate_lt1','Maintenir trente minutes à un effort aérobie régulier et facile.'),timed(7,'cooldown','recovery','Ralentir progressivement.')],
  },
};
const cache=new Map<string,V3Workout>();

/** Built only when DET requests one of these IDs. Original catalogue and
 * qualified pools remain independent of these explicitly reviewable candidates. */
export function findRankedRunSource(id:string):V3Workout|undefined {
  const recipe=Object.prototype.hasOwnProperty.call(recipes,id)?recipes[id]:undefined;
  if(!recipe)return undefined;
  if(cache.has(id))return cache.get(id);
  const source=structuredClone(v3FullCatalogue.workouts.find(w=>w.id===recipe.parent)!);
  const {parent,...content}=recipe;
  Object.assign(source,structuredClone(content),{id,version:'3.4.0-det-running-candidate',minimumLevel:'light',
    origin:'TFCLab DET · composition originale, principes et domaines de la fiche '+parent+'.'});
  const p=source.prescription;
  if(id===AEROBIC_MAINTENANCE_ID){
    source.primaryIntent='fatmax';source.primaryDomain='moderate_lt1';
    p.physiologicalIntent={...p.physiologicalIntent,primaryIntent:source.primaryIntent,primaryDomain:source.primaryDomain,
      domainIds:['recovery','moderate_lt1'],limiterKeys:['aerobic_capacity','fat_oxidation']};
  }
  p.physiologicalIntent.statement=source.focus;
  if(id!==SHORT_AEROBIC_INTERVALS_ID)p.individualization.anchors=p.individualization.anchors.map(a=>
    ({...a,key:'coach_reviewed_terrain_effort',transform:'no_flat_pace_on_slopes'}));
  p.admissibility={...p.admissibility,phases:[...source.phase],minimumLevel:source.minimumLevel,prerequisites:[...source.prerequisites]};
  p.parameters=[];
  function add(steps:V3Block[],prefix=''){
    steps.forEach((block,index)=>{
      const path=prefix+index+'.';
      if(block.kind==='repeat'){
        p.parameters.push({path:path+'count',unit:'count',...block.count,risk:'fixed_source_prescription'},
          {path:path+'betweenSec',unit:'seconds',...fixed(block.betweenSec),risk:'recovery_dose'});
        add(block.steps,path);
      }else if(block.seconds)p.parameters.push({path:path+'seconds',unit:'seconds',...block.seconds,risk:'fixed_source_prescription'});
    });
  }
  add(source.blocks);
  cache.set(id,source);
  return source;
}
