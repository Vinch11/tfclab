import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {TimeTrialEvidenceForm} from '../TimeTrialEvidenceForm';
afterEach(cleanup);
it('requires real coach entries and separate explicit checks, never supplies posture history by default',()=>{
 const onChange=vi.fn();render(<TimeTrialEvidenceForm athleteId="SYNTHETIC-A" raceDuration="60" profileObjective="703" onChange={onChange}/>);
 const button=screen.getByRole('button',{name:'Confirmer mon observation pour ce CLM'});expect(button).toBeDisabled();
 expect(screen.getAllByRole('checkbox').every(b=>b.getAttribute('aria-checked')==='false')).toBe(true);
 const values={'Semaines de pratique aéro':'5,6','Date de l’observation aéro':'2026-10-20','Référence de l’observation aéro':'SYNTHETIC field assessment','Plus longue tenue continue observée (min)':'20','Plafond aéro total approuvé par séance (min)':'60','Tenue continue minimale recherchée (min)':'15','Pratique aéro minimale par séance spécifique (min)':'30','Nombre minimal de séances spécifiques':'2'};
 for(const [name,value]of Object.entries(values))fireEvent.change(screen.getByLabelText(name),{target:{value}});
 fireEvent.change(screen.getByLabelText('Jour de pratique aéro'),{target:{value:'3'}});expect(button).toBeDisabled();
 for(const box of screen.getAllByRole('checkbox'))fireEvent.click(box);
 expect(button).toBeEnabled();onChange.mockClear();fireEvent.click(button);
 expect(onChange).toHaveBeenCalledWith(expect.objectContaining({athleteId:'SYNTHETIC-A',raceDurationMinutes:60,aeroWeeks:[5,6],aeroDayIndex:3,longestContinuousAeroMinutes:20,bikeFitConfirmed:true,symptomScreenClear:true}));
 fireEvent.change(screen.getByLabelText('Plus longue tenue continue observée (min)'),{target:{value:'18'}});expect(onChange).toHaveBeenLastCalledWith(undefined);
});
