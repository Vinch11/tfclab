import type {PlanAthleteData} from '@/hooks/useAITrainingPlan';
export interface PlanNutritionReference {sport:'bike'|'run';status:'to_test'|'missing';}
/** Available physiology is not evidence of digestive tolerance or of event-specific demand. */
export function planNutritionReferences(athlete:PlanAthleteData):PlanNutritionReference[] {
 return (['bike','run'] as const).map(sport=>{
  const vla=sport==='run'?athlete.vlamaxRun:athlete.vlamax;
  return {sport,status:!athlete.weightKg || !athlete.vo2max || !vla?'missing':'to_test'};
 });
}
export function planNutritionPrompt(athlete:PlanAthleteData):string {
 return ['CONTRAT NUTRITION : référence de planification, jamais une tolérance validée.',...planNutritionReferences(athlete).map(r=>
  `${r.sport==='bike'?'Vélo':'Course'} : ${r.status==='missing'?'physiologie incomplète ; ne pas inventer de débit':'physiologie disponible ; le besoin calculé dépend de la durée et de l’intensité de ce sport, pas d’une tolérance validée'}.`),
  'Les simulations et le jour J utilisent le débit effectivement testé et confirmé par le coach pour chaque sport ; en son absence, le signaler. Ne pas copier 60 ou 100 g/h depuis les exemples du catalogue. Les besoins changent avec durée et intensité ; toute exception doit être explicitée.'].join('\n');
}