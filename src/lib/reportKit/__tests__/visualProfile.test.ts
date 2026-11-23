import { describe, expect, it } from 'vitest';
import { buildVisualProfile } from '../visualProfile';
import { rangeGauge, tracePlot } from '../visualFigures';
import { generateTestCalibrationSection } from '../../calibration/testCalibrationSection';
import type { FactorRow } from '../../coachingCompass/factorStates';
import type { DbSnapshot, DbTest } from '@/hooks/useCloudData';
import type { PerformanceReportInput } from '../../performanceReport/types';

const snap = (id: string, date: string, ftp: number, athlete_id = 'a') =>
  ({ id, date, ftp, athlete_id, source: 'manual', weight_kg: 70, fat_pct: 20 }) as DbSnapshot;
const current = snap('b', '2026-09-21', 245);
const stored = (athlete_id = 'a') =>
  ({
    id: 't',
    athlete_id,
    date: '2026-09-17',
    name: 'Test',
    sport: 'bike',
    raw: {
      protocol: 'Protocole interne',
      sensor: 'Capteur privé',
      streams: { time: [0, 30, 60], watts: [120, 155, 180] },
    },
  }) as unknown as DbTest;
const inputs = {
  athlete: { id: 'a' },
  effectiveSnapshot: current,
  snapshotHistory: [
    snap('a1', '2026-08-01', 220),
    current,
    snap('c', '2026-12-01', 300),
    snap('other', '2026-07-01', 500, 'other'),
  ],
  tests: [stored()],
};
const perf = { sports: ['bike'], curve: [], physio: { ftp: 245 } } as unknown as PerformanceReportInput;

describe('illustrations personnalisées des rapports', () => {
  it('ajoute au graphique des efforts la valeur critique ajustée, avec sa réserve de lecture', () => {
    const effort = (id: string, durationSec: number, value: number) => ({ id, sport: 'cycling', durationSec, value, date: '2026-09-10', session: 's', conditions: 'c', source: 'manual', confirmed: true });
    const withCritical = { ...current, critical_metrics: { cycling: { critical: 262.4, reserve: 18300, status: 'estimate', efforts: [effort('1', 180, 380), effort('2', 420, 310), effort('3', 720, 285)], r2: 0.99, residualPct: 1, sensitivityPct: 2, warnings: [], savedAt: '2026-09-21', latestEffortDate: '2026-09-10' } } } as unknown as DbSnapshot;
    const v = buildVisualProfile({ ...inputs, effectiveSnapshot: withCritical, snapshotHistory: [withCritical] }, perf, true);
    const text = Object.values(v).join(' ');
    expect(text).toContain('Puissance critique · 262 W');
    expect(text).toContain('18,3 kJ (W′)');
    expect(text).toContain('Estimation à confirmer');
    expect(text).toContain('seuil lactique stable');
  });
  it('sans efforts valides, aucune phrase de seuil critique n’est inventée', () => {
    const v = buildVisualProfile(inputs, perf, true);
    expect(Object.values(v).join(' ')).not.toContain('data-critical-sport');
  });
  it('réserve les informations privées au coach et borne la chronologie au bilan actif', () => {
    const coach = buildVisualProfile(inputs, perf, true),
      athlete = buildVisualProfile(inputs, perf, false);
    expect(coach.evolution).toContain('220 W');
    expect(coach.evolution).toContain('245 W');
    expect(coach.evolution).not.toMatch(/300 W|500 W/);
    expect(coach.portrait).toContain('Masse non grasse');
    expect(coach.terrain).toContain('Capteur privé');
    expect(athlete.terrain).not.toContain('Capteur privé');
    expect(athlete.portrait).not.toContain('Masse non grasse');
  });
  it('garde un bilan isolé comme point de départ et exclut les traces étrangères', () => {
    const v = buildVisualProfile(
      { ...inputs, snapshotHistory: [current], tests: [stored('other')] },
      perf,
      true,
    );
    expect(v.evolution).toBe('');
    expect(v.terrain).toBe('');
    expect(v.metabolism).toBe('');
  });
  it('conserve une cible ponctuelle visible et une comparaison bilatérale en VLamax', () => {
    const row = {
      key: 'vlamax',
      label: 'VLamax',
      unit: 'mmol/L/s',
      value: 0.54,
      zone: { low: 0.3, high: 0.4, point: null },
      tier: 'coaching',
    } as FactorRow;
    expect(rangeGauge(row)).toContain('0,3–0,4 mmol/L/s');
    expect(rangeGauge({ ...row, zone: { low: 0.4, high: 0.4, point: 0.4 } })).toContain('stroke-width="4"');
    expect(rangeGauge({ ...row, value: null })).toBe('');
  });
  it('trace une interruption entre deux segments lorsque le capteur manque', () => {
    const plot = tracePlot({
      title: 'Puissance',
      xLabel: 's',
      yLabel: 'W',
      source: 'Test',
      reading: 'Lecture',
      traces: [
        {
          label: 'W',
          points: [
            { x: 0, y: 100 },
            { x: 30, y: null },
            { x: 60, y: 180 },
          ],
        },
      ],
    });
    expect(plot).toMatch(/<path d="M[\d.]+ [\d.]+ {2}M[\d.]+ [\d.]+"/);
    expect(plot).not.toMatch(/NaN|Infinity/);
  });
  it('exporte un test historique dont la VLamax est absente', () => {
    expect(() => generateTestCalibrationSection([stored()], 'a', null)).not.toThrow();
  });
});
