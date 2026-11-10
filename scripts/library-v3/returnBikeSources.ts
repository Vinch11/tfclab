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
