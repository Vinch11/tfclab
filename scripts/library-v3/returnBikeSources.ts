// Short bounded endurance for a return to cycling. Not an intense workset,
// a long ride, evidence of race readiness or an individual clearance.
import {v3FullCatalogue,type V3Workout} from './catalogueRuntime';
const base=v3FullCatalogue.workouts.find(s=>s.id==='V3P_BIKE_002')!;
export const returnBikeSources:V3Workout[]=[0,1].map(i=>{
 const s=structuredClone(base);
 s.id='V3P_BIKE_'+(201+i);s.version='3.4-return-bike-candidate';s.minimumLevel='untrained';
 s.title=i?'Reprise vélo · endurance régulière sur terrain plat':'Reprise vélo · pédalage souple';
 s.origin='TFCLab · composition courte pour reprendre un pédalage déjà toléré';s.phase=['base','build','peak','taper'];
 s.focus='Retrouver un pédalage régulier à effort facile sur une courte séance.';
 s.methodology='Choisir un parcours plat ou un vélo stationnaire connu. La cible est individualisée sur les repères disponibles. Rester en aisance respiratoire ; ni intervalles intenses ni travail à jeun requis.';
 s.prerequisites=['Vélo réglé et pédalage facile déjà toléré ; vérifier la durée avec le coach.'];
 s.stopRule='Arrêter si une gêne se développe, si le pédalage se dégrade ou si la respiration ne reste pas confortable.';
 const bounds=[{min:300,base:300,max:300},{min:300,base:i?900:600,max:i?1200:900},{min:300,base:300,max:300}];
 s.blocks=s.blocks.map((b,n)=>({...b,seconds:bounds[n],label:['Pédaler très facilement.',i?'Maintenir une cadence confortable sans accélération.':'Pédaler souplement sur terrain plat.','Ralentir progressivement.'][n]}));
 s.prescription.parameters=s.prescription.parameters.map((p,n)=>({...p,...bounds[n],risk:n===1?'bounded_easy_duration':'fixed_source_prescription'}));
 s.prescription.physiologicalIntent={...s.prescription.physiologicalIntent,statement:s.focus,limiterKeys:['aerobic_capacity']};
 s.prescription.admissibility={...s.prescription.admissibility,minimumLevel:s.minimumLevel,phases:[...s.phase],prerequisites:[...s.prerequisites],stopRule:s.stopRule};
 return s;
});

// A later progression for a rider training regularly. It is distinct from
// the two re-entry cards and is only selectable in a progressing long slot.
const endurance=structuredClone(v3FullCatalogue.workouts.find(s=>s.id==='V3P_BIKE_109')!);
endurance.id='V3P_BIKE_204';
endurance.version='3.5-long-easy-bike-candidate';
endurance.title='Sortie longue vélo · prolongation en endurance facile';
endurance.origin='TFCLab · prolongation de la fiche V3P_BIKE_109, à revoir individuellement.';
endurance.focus='Prolonger progressivement une sortie facile déjà tolérée à cadence libre.';
endurance.methodology='Vérifier la durée réellement tolérée lors de la dernière sortie longue et la récupération avant toute prolongation. Maintenir une conversation aisée et prévoir ravitaillement et possibilités de retour anticipé.';
endurance.prerequisites=[...endurance.prerequisites,'Sortie longue comparable réellement tolérée, vérifiée par le coach.'];
endurance.prescription.admissibility.prerequisites=[...endurance.prerequisites];
endurance.prescription.physiologicalIntent.statement=endurance.focus;
const main=endurance.blocks[1];
if(main.kind!=='time')throw Error('long_bike_parent_shape');
main.seconds={min:108*60,base:117*60,max:162*60};
endurance.prescription.parameters=endurance.prescription.parameters.map(p=>p.path==='1.seconds'?{...p,...main.seconds}:p);
export const longBikeSource=endurance;

// These two endurance ranges fill the gap between the short re-entry rides and
// long events. Selection is restricted to long bike appointments after a
// recorded starting tolerance, with the athlete's actual ramp checked again.
export const progressiveReturnRides:V3Workout[]=[
  {id:'V3P_BIKE_205',title:'Reprise vélo · prolonger le pédalage facile',min:25,base:50,max:75},
  {id:'V3P_BIKE_206',title:'Reprise vélo · sortie longue en endurance continue',min:70,base:95,max:165},
].map(recipe=>{
  const source=structuredClone(returnBikeSources[1]);
  source.id=recipe.id;source.version='3.6-return-long-bike-candidate';source.title=recipe.title;
  source.focus='Prolonger l’endurance aérobie à intensité facile, en partant de la durée récemment tolérée.';
  source.methodology='Parcours plat avec possibilité de raccourcir la boucle. Régler la durée du bloc continu dans les limites de la fiche. Vérifier la tolérance à la sortie précédente et les possibilités de ravitaillement avant toute prolongation.';
  source.origin='TFCLab · progression de la reprise vélo à partir de la prescription V3P_BIKE_202.';
  source.prerequisites=['Durée récente de vélo continu confirmée pour cet athlète.','Sortie précédente tolérée, position confortable et récupération vérifiées avant de prolonger.'];
  source.prescription.physiologicalIntent.statement=source.focus;
  source.prescription.admissibility.prerequisites=[...source.prerequisites];
  const main=source.blocks[1];
  if(main.kind!=='time')throw Error('return_long_bike_parent_shape');
  main.label='Maintenir un pédalage régulier et une respiration aisée sur le plat.';
  main.seconds={min:(recipe.min-10)*60,base:(recipe.base-10)*60,max:(recipe.max-10)*60};
  source.prescription.parameters=source.prescription.parameters.map(param=>param.path==='1.seconds'?{...param,...main.seconds}:param);
  return source;
});
