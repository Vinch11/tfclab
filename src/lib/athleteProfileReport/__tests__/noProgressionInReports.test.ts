import { describe, expect, it } from 'vitest';
import { buildAthleteProfileReportHTML } from '../buildAthleteProfileReportHTML';
import type { AthleteProfileReportInput } from '../types';

/**
 * Règle coach (2026-11-13) : les rapports athlète ne montrent aucune progression
 * ni évolution dans le temps. Seule la comparaison à la cible d'ambition reste,
 * libellée comme un écart.
 */
const base: AthleteProfileReportInput = {
  athleteName: 'Athlète test',
  objectifLabel: 'Ironman 70.3',
  ambitionLabel: 'Competitor',
  age: 40,
  generatedAt: '13/11/2026',
  snapshotDate: '2026-11-01',
  dataCompleteness: 80,
  readiness: { score: 70, label: 'Frais', confidence: 0.8, message: 'Prêt à charger.' },
  profileNarrative: 'Ton moteur aérobie est solide.',
  metrics: [
    { key: 'ftpkg', label: 'FTP / kg', value: 3.2, unit: 'W/kg', status: 'ok', meaning: 'Puissance au seuil par kilo.', scale: [1, 5], target: [3, 4] },
    { key: 'vma', label: 'VMA', value: 16.5, unit: 'km/h', status: 'ok', meaning: 'Vitesse maximale aérobie.', scale: [10, 22], target: [16, 18] },
  ],
  radar: [],
  economyAxis: null,
  targetProgress: [
    { label: 'FTP / kg', current: 3.2, target: 4, unit: 'W/kg', decimals: 2, progress: 80, reached: false },
  ],
  limiters: [],
  levers: [],
  decision: null,
  zoneSets: [
    {
      sportLabel: 'Vélo',
      source: 'derived',
      confidence: 0.8,
      anchors: ['Seuil 250 W'],
      fallbackReason: null,
      zones: [{ id: 'z2', label: 'Z2', condition: 'Endurance', pctRef: '65-75 %', refLabel: 'Seuil', absolute: '165-190 W', heartRate: '130', hrPct: '70 %' }],
    },
  ],
  roadmap: null,
  nextSteps: ['Refaire un test de seuil.'],
  glossary: [],
  durabilityBySport: {
    bike: '<div class="durability-note">Durabilité vélo mesurée sur 3 sorties longues.</div>',
    run: '<div class="durability-note">Durabilité course mesurée sur 2 sorties longues.</div>',
  },
};

const html = buildAthleteProfileReportHTML(base);

describe('athlete profile report has no progression', () => {
  it('renders no progression or evolution chart', () => {
    expect(html).not.toContain('progress-figure');
    expect(html).not.toContain('evo-grid');
    expect(html).not.toContain('Évolutions observées');
    expect(html).not.toContain('Ce qui a réellement changé');
    expect(html.toLowerCase()).not.toContain('progression');
  });
  it('names the ambition comparison an gap to the target, with the remaining gap', () => {
    expect(html).toContain('Écart à ta cible « Competitor »');
    expect(html).toContain('écart restant 20 %');
    expect(html).not.toContain('pas une progression mesurée');
  });
  it('keeps both sport chapters and their durability reading', () => {
    expect(html).toContain('Ton vélo en chiffres');
    expect(html).toContain('Ta course à pied en chiffres');
    expect(html).toContain('Durabilité vélo mesurée sur 3 sorties longues.');
    expect(html).toContain('Durabilité course mesurée sur 2 sorties longues.');
  });
});
