import { describe, expect, it } from 'vitest';
import { athleteNextStep, buildAthleteProfileReportHTML } from '../buildAthleteProfileReportHTML';
import type { AthleteProfileReportInput } from '../types';
import { vo2maxVmaMismatch } from '../../zones/vo2maxCoherence';

const base: AthleteProfileReportInput = {
  athleteName: 'Emanuela',
  objectifLabel: 'Ironman',
  ambitionLabel: 'Compétiteur',
  age: 40,
  generatedAt: '24/11/2026',
  snapshotDate: '2026-11-12',
  dataCompleteness: 80,
  readiness: { score: 70, label: 'Frais', confidence: 0.8, message: 'Prêt.' },
  profileNarrative: 'Profil.',
  metrics: [],
  radar: [],
  economyAxis: null,
  targetProgress: [],
  limiters: [],
  levers: [],
  decision: null,
  zoneSets: [{
    sportLabel: 'Vélo', source: 'derived', confidence: 0.8, fallbackReason: null,
    anchors: [
      'Zones ancrées sur le seuil critique (CP) : 195 W · Test réalisé (estimation).',
      'Premier seuil ≈ 75 % de la CP (haut de Z2) ; MLSS ≈ 95 % de la CP (dans Z5).',
      'VO₂max saisie (52 ml/kg/min) incohérente avec la VMA de 13 km/h (≈ 46 attendus) : à vérifier.',
    ],
    summary: 'Tes zones partent de ton seuil critique à vélo : 195 W.',
    zones: [{ id: 'z2', label: 'Z2', condition: 'Endurance', pctRef: '65-75 %', refLabel: 'CP', absolute: '127-146 W', heartRate: '130', hrPct: '70 %' }],
  }],
  roadmap: null,
  nextSteps: [],
  glossary: [],
  sports: ['bike'],
};

describe('rapport athlète : zones et prochaine étape', () => {
  const html = buildAthleteProfileReportHTML(base);

  it('montre une phrase simple et jamais les repères techniques ni les alertes coach', () => {
    expect(html).toContain('Tes zones partent de ton seuil critique à vélo : 195 W.');
    expect(html).not.toContain('MLSS');
    expect(html).not.toContain('incohérente');
    expect(html).not.toMatch(/\.,|\.\.(?!\.)/);
  });

  it('traduit la décision coach en phrase pour l’athlète', () => {
    expect(athleteNextStep('Contrôler le progrès sur le terrain')).toMatch(/Ton coach suivra tes séances/);
    expect(athleteNextStep(null)).toBe('Ton coach précisera le premier chantier avec toi.');
    expect(athleteNextStep('Seuil course')).toBe('Le premier chantier proposé est « Seuil course ».');
  });
});

describe('VO₂max ↔ VMA', () => {
  it('signale une VO₂max de montre trop haute pour la VMA', () => {
    expect(vo2maxVmaMismatch(52, 13)).toBe(true);
    expect(vo2maxVmaMismatch(46, 13)).toBe(false);
    expect(vo2maxVmaMismatch(null, 13)).toBe(false);
  });
});
