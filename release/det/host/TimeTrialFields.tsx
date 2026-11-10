import { useId } from 'react';

export const emptyTimeTrial = () => ({
  raceDurationMinutes:'', observedOn:'', reviewReference:'', longestContinuousAeroMinutes:'',
  maxAeroMinutesPerSession:'', minimumContinuousAeroMinutes:'', minimumAeroMinutesPerSession:'',
  aeroWeeks:'', aeroDayIndex:'', bikeFitConfirmed:false, symptomScreenClear:false,
});
export type TimeTrialFieldsValue = ReturnType<typeof emptyTimeTrial>;

export function enteredTimeTrial(value: TimeTrialFieldsValue, athleteId: string) {
  if (!/^\s*\d+(?:[\s,;]+\d+)*\s*$/.test(value.aeroWeeks) || value.aeroDayIndex === '')
    throw Error('CLM : indiquer le jour et les numéros des semaines de pratique aéro.');
  const aeroWeeks = value.aeroWeeks.trim().split(/[\s,;]+/).map(Number);
  return {athleteId, observedOn:value.observedOn, reviewReference:value.reviewReference.trim(), aeroWeeks,
    minimumAeroSessions:aeroWeeks.length, aeroDayIndex:Number(value.aeroDayIndex),
    bikeFitConfirmed:value.bikeFitConfirmed, symptomScreenClear:value.symptomScreenClear,
    raceDurationMinutes:Number(value.raceDurationMinutes), longestContinuousAeroMinutes:Number(value.longestContinuousAeroMinutes),
    maxAeroMinutesPerSession:Number(value.maxAeroMinutesPerSession), minimumContinuousAeroMinutes:Number(value.minimumContinuousAeroMinutes),
    minimumAeroMinutesPerSession:Number(value.minimumAeroMinutesPerSession)};
}

const doses = [
  ['raceDurationMinutes','Durée de course prévue (min)'],
  ['longestContinuousAeroMinutes','Durée continue déjà tolérée (min)'],
  ['maxAeroMinutesPerSession','Total aéro toléré par séance (min)'],
  ['minimumContinuousAeroMinutes','Durée continue visée à l’entraînement (min)'],
  ['minimumAeroMinutesPerSession','Total aéro visé par séance (min)'],
] as const;

export function TimeTrialFields({value, onChange}: {value:TimeTrialFieldsValue; onChange:(next:TimeTrialFieldsValue)=>void}) {
  const id=useId();
  return <fieldset className="grid gap-2 sm:grid-cols-2">
    <legend className="font-medium">Contre-la-montre vélo</legend>
    {doses.map(([key,label])=><label key={key}>{label}<input type="number" min="0.1" step="any" required value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}/></label>)}
    <label>Date de l’observation<input type="date" required value={value.observedOn} onChange={e=>onChange({...value,observedOn:e.target.value})}/></label>
    <label>Référence de la sortie ou du test<input required value={value.reviewReference} onChange={e=>onChange({...value,reviewReference:e.target.value})}/></label>
    <label>Semaines des séances aéro<input placeholder="Ex. 5, 6" value={value.aeroWeeks} onChange={e=>onChange({...value,aeroWeeks:e.target.value})}/></label>
    <label htmlFor={id}>Jour des séances aéro</label><select id={id} value={value.aeroDayIndex} onChange={e=>onChange({...value,aeroDayIndex:e.target.value})}>
      <option value="">Choisir le jour</option>{['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].map((d,i)=><option key={d} value={i}>{d}</option>)}</select>
    <label><input type="checkbox" checked={value.bikeFitConfirmed} onChange={e=>onChange({...value,bikeFitConfirmed:e.target.checked})}/> Réglage du vélo vérifié</label>
    <label><input type="checkbox" checked={value.symptomScreenClear} onChange={e=>onChange({...value,symptomScreenClear:e.target.checked})}/> Position tolérée sans douleur lors de l’observation</label>
  </fieldset>;
}
