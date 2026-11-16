import {describe,it,expect} from 'vitest';
import {cleanPlanText} from '../planText';
describe('cleanPlanText week-title artefacts',()=>{
  it('removes the "Semaine N globale —" window prefix',()=>{
    expect(cleanPlanText('Semaine 6 globale — Assimilation & régénération')).toBe('Assimilation & régénération');
  });
  it('removes a leading dash left by an empty prefix',()=>{
    expect(cleanPlanText('— Peak 1 : Durabilité aérobie')).toBe('Peak 1 : Durabilité aérobie');
  });
  it('keeps an inner dash',()=>{
    expect(cleanPlanText('Build 2 — Décharge')).toBe('Build 2 — Décharge');
  });
});
