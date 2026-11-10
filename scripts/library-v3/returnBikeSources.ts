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
