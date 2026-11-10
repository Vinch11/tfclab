// Time-based proposals for athletes with a light but established
// training background. The original cards keep their qualification and level.
import {v3FullCatalogue,type V3Workout,type V3Leaf,type V3Block} from './catalogueRuntime';

type Domain=NonNullable<V3Leaf['domain']>;
const fixed=(base:number)=>({min:base,base,max:base});
function step(role:V3Leaf['role'],domain:Domain,seconds:number,label:string):V3Leaf{
  return {kind:'time',role,domain,seconds:fixed(seconds),label};
}
type Recipe={id:string; parent:string; title:string; cue:string; domain:Domain;
  phases:string[]; count:number; min:number; max:number; seconds:number; rest:number};
const development=['base','build','peak'];
const recipes:Recipe[]=[
  {id:'V3P_RUN_209',parent:'V3P_RUN_137',title:'Seuil sur terrain plat · fractions de cinq minutes',
    domain:'mlss',cue:'Tenir une allure régulière au seuil individuel, sans accélérer en fin de fraction.',
    phases:development,count:2,min:2,max:4,seconds:300,rest:180},
  {id:'V3P_RUN_214',parent:'V3P_RUN_167',title:'Fractions aérobies de deux minutes sur le plat',
    domain:'vo2max',cue:'Courir à vitesse aérobie individuelle, avec une foulée régulière. Trottiner trois minutes entre les fractions.',
    phases:development,count:3,min:3,max:4,seconds:120,rest:180},
  {id:'V3P_RUN_215',parent:'V3P_RUN_167',title:'Fractions aérobies contrôlées avec récupération longue',
    domain:'vo2max',cue:'Courir trois minutes sur le plat à la vitesse aérobie individuelle. Garder quatre minutes de trot facile entre les fractions.',
    phases:development,count:3,min:3,max:3,seconds:180,rest:240},
  {id:'V3P_BIKE_203',parent:'V3P_BIKE_146',title:'Seuil à vélo · fractions courtes à puissance régulière',
    domain:'mlss',cue:'Tenir la plage de puissance individuelle au seuil, sur un terrain régulier. Pédaler facilement pendant les récupérations.',
    phases:development,count:2,min:2,max:4,seconds:300,rest:180},
  {id:'V3P_RUN_216',parent:'V3P_RUN_137',title:'Trail roulant · seuil sur un segment régulier',
    domain:'mlss',cue:'Choisir un segment connu, non technique, à pente régulière. Stabiliser l’effort au seuil individuel établi sur un terrain comparable. Récupérer au trot facile.',
    phases:development,count:2,min:2,max:4,seconds:300,rest:180},
  ...(['semi_pace','marathon_pace'] as const).flatMap((domain,i)=>{
    const race=i?'marathon':'semi-marathon';
    const parent=i?'V3P_RUN_155':'V3P_RUN_160';
    return [false,true].map((taper,j)=>({id:'V3P_RUN_'+(210+i*2+j),parent,domain,
      title:race+' · '+(taper?'rappel court':'fractions régulières sur le plat'),
      cue:'Stabiliser l’allure individuelle de '+race+' sur terrain régulier. Récupérer au trot.',
      phases:taper?['taper']:['build','peak'],count:taper?1:2,min:1,max:taper?1:3,seconds:taper?240:360,rest:180}));
  })
];
export const developmentIntervalSources:V3Workout[]=recipes.map(recipe=>{
  const parent=v3FullCatalogue.workouts.find(s=>s.id===recipe.parent)!;
  const source=structuredClone(parent);
  const count={min:recipe.min,base:recipe.count,max:recipe.max};
  const blocks:V3Block[]=[
    step('warmup','recovery',600,source.sport==='bike'?'Pédaler facilement et progressivement.':'Courir facilement et progressivement.'),
    {kind:'repeat',label:recipe.cue,count,betweenSec:recipe.rest,betweenSecBounds:fixed(recipe.rest),
      steps:[step('main',recipe.domain,recipe.seconds,recipe.cue)]},
    step('cooldown','recovery',360,source.sport==='bike'?'Terminer en pédalant facilement.':'Terminer par une course facile.')];
  Object.assign(source,{id:recipe.id,title:recipe.title,phase:recipe.phases,minimumLevel:'light',blocks,
    version:'3.5.0-development-candidate',origin:'TFCLab · composition spécifique, domaines et références de '+parent.id,
    focus:recipe.cue,methodology:'Régler la cible sur les repères individuels. Choisir le nombre de fractions selon le travail déjà toléré. Garder la récupération complète entre les fractions.',
    prerequisites:[...parent.prerequisites,source.sport==='bike'?'Pédalage continu et fractions à la puissance proposée déjà tolérés.':'Course continue facile et fractions au rythme proposé déjà tolérées.']});
  if(recipe.id==='V3P_RUN_216'){
    source.prerequisites.push('Effort de seuil et allure perçue vérifiés sur un segment comparable. Parcours régulier accessible et dose déjà tolérée.');
    source.prescription.individualization.anchors=source.prescription.individualization.anchors.map(anchor=>({
      ...anchor,key:'coach_reviewed_terrain_effort',transform:'no_flat_pace_on_slopes'
    }));
  }
  source.prescription.physiologicalIntent.statement=recipe.cue;
  source.prescription.admissibility={...source.prescription.admissibility,minimumLevel:'light',phases:[...source.phase],prerequisites:[...source.prerequisites]};
  const parameter=(path:string,unit:string,bounds:typeof count)=>({
    path,unit,...bounds,risk:path==='1.count'?'workset_change':'fixed_source_prescription'
  });
  source.prescription.parameters=[
    parameter('0.seconds','seconds',fixed(600)),parameter('1.count','count',count),
    parameter('1.betweenSec','seconds',fixed(recipe.rest)),
    parameter('1.0.seconds','seconds',fixed(recipe.seconds)),parameter('2.seconds','seconds',fixed(360))
  ];
  return source;
});
