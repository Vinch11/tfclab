import { describe, expect, it } from 'vitest';
import { sportDiagramHTML } from '../pedagogy';
import type { StoredDurabilitySport } from '../../durability/longSessionDurability';

const durability: StoredDurabilitySport = {
  status: 'estimate', method: 'best20_early_vs_last_third', unit: 'W', meanChangePct: -5,
  sessions: [
    { id: 'a', date: '2026-10-01', name: 'Longue A', durationMin: 150, early: 200, late: 180, changePct: -10 },
    { id: 'b', date: '2026-10-08', name: 'Longue B', durationMin: 160, early: 210, late: 210, changePct: 0 },
  ], from: '2026-10-01', to: '2026-10-08', savedAt: '2026-11-01',
};

describe('detailed personal sport diagrams', () => {
  it('shows real cycling energy, absolute zones, TTE target and early/late session values', () => {
    const html = sportDiagramHTML({
      sport: 'bike',
      comparisons: [
        { key: 'vo2max', label: 'VO₂max', value: 50, unit: 'ml/kg/min' },
        { key: 'fatmax', label: 'FatMax', value: 70, target: 75, unit: '% FTP' },
      ],
      tte: [{ key: 'tte', label: 'TTE vélo', value: 35, target: 52, unit: 'min' }],
      zones: [{ id: 'Z2', label: 'Endurance', condition: 'Base aérobie', absolute: '150–180 W', heartRate: '125–140 bpm', pctRef: '60–75 %', refLabel: 'FTP' }],
      durability,
    });
    expect(html).toContain('50,0 <small>ml/kg/min</small>');
    expect(html).toContain('Cible du compass : 75,0 % FTP');
    expect(html).toContain('150–180 W');
    expect(html).toContain('125–140 bpm');
    expect(html).toContain('35 min');
    expect(html).toContain('cible 52 min');
    expect(html).toContain('200,0 W');
    expect(html).toContain('180,0 W');
    expect(html).toContain('2026-10-08');
    expect(html).not.toContain('Données insuffisantes');
  });

  it('keeps running in pace and never imports cycling FatMax or watts', () => {
    const html = sportDiagramHTML({
      sport: 'run',
      comparisons: [{ key: 'vma', label: 'VMA', value: 14.2, unit: 'km/h' }],
      tte: [{ key: 'tte', label: 'TTE course', value: 40, target: 52, unit: 'min' }],
      zones: [{ id: 'Z4', label: 'Seuil', condition: 'Endurance au seuil', absolute: '4:30–4:45 /km', heartRate: '160–170 bpm' }],
      durability: null,
    });
    expect(html).toContain('14,2 <small>km/h</small>');
    expect(html).toContain('4:30–4:45 /km');
    expect(html).toContain('12 min restent');
    expect(html).not.toContain('FatMax');
    expect(html).not.toContain('>200<');
  });

  it('keeps a real percentage zone when no absolute pace is available', () => {
    const html = sportDiagramHTML({
      sport: 'run', comparisons: [], tte: [], durability: null,
      zones: [{ id: 'Z6', label: 'Neuromusculaire', condition: 'Vitesse', absolute: null, heartRate: null, pctRef: '111–300 %', refLabel: '% vitesse seuil' }],
    });
    expect(html).toContain('111–300 %');
    expect(html).toContain('% vitesse seuil');
    expect(html).not.toContain('<div class="zone-absolute">—</div>');
  });

  it('omits absent personal values instead of drawing an empty fake measurement', () => {
    const html = sportDiagramHTML({ sport: 'run', comparisons: [], tte: [], zones: [], durability: null });
    expect(html).not.toContain('energy-marker');
    expect(html).not.toContain('zone-row');
    expect(html).not.toContain('durability-block');
  });
});
