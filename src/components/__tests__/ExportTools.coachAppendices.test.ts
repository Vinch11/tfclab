import { describe, expect, it } from 'vitest';
import { COACH_FACTUAL_APPENDICES } from '../ExportTools';

/**
 * Retour coach (nov. 2026) : les « Analyses complémentaires » recalculaient leurs propres repères
 * (puissance de course, glucides, durée, TTE cible) sur des données parfois absentes et
 * contredisaient la décision du rapport. Seules les annexes factuelles restent.
 */
describe('rapport coach — annexes', () => {
  it('ne garde que les données enregistrées', () => {
    expect([...COACH_FACTUAL_APPENDICES].sort()).toEqual(['checkins', 'fitImports', 'historique', 'tests']);
  });

  it('exclut les modules modélisés', () => {
    for (const key of ['pacingEnvelope', 'injuryRisk', 'nutritionV2', 'ambitionPredictions', 'ageAdjustment', 'runMLSSCoherence',
      'vlamaxZoneConfidence', 'performancePrediction', 'leviersAction', 'cpWprimeWbal', 'lactateCurve', 'fatmaxTFCL', 'zones', 'qualite'] as const)
      expect(COACH_FACTUAL_APPENDICES.has(key)).toBe(false);
  });
});
