import { describe, expect, it } from 'vitest';
import { criticalFigure, pairedFigure } from '../fieldFigures';
import { reportFieldEvidence } from '../fieldEvidence';
import { latestPairs, durabilityProtocol } from '../../diagnostic/durabilityDay';
import type { StoredCriticalSport } from '../../criticalMetrics';
import type { FactorRow } from '../../coachingCompass/factorStates';

const metric: StoredCriticalSport = { critical: 4, reserve: 160, status: 'confirmed', efforts: [],
  savedAt: '2026-11-05', latestEffortDate: '2026-11-04', warnings: [], residualPct: 0, sensitivityPct: null, r2: null };
const demand = { key: 'demandcs', value: 105, goalPaceSecPerKm: 238 } as FactorRow;

describe('repères complémentaires des deux éditions', () => {
  it('shows a stored fit without drawing fictitious efforts, and an unclipped marathon gauge only with a goal', () => {
    const html = criticalFigure(metric, 'run', [demand], false);
    expect(html).toContain('4:10 <small>min/km');
    expect(html).toContain('105 % de la vitesse critique');
    expect(html).toContain('3:58 min/km');
    expect(html).not.toContain('class="lab-plot"');
    expect(criticalFigure(metric, 'run', [], true)).not.toContain('critical-rail');
    expect(criticalFigure(metric, 'bike', [demand], true)).not.toContain('critical-rail');
  });
  it('omits a rejected fit from numeric readings including the goal and keeps the follow-up private', () => {
    const rejected = { ...metric, coachReview: { verdict: 'reject' as const, text: 'Privé', date: '2026-11-05' } };
    expect(criticalFigure(rejected, 'run', [demand], false)).toBe('');
    expect(criticalFigure(rejected, 'run', [demand], true)).toContain('écartée par le coach');
    expect(reportFieldEvidence({ date: '2026-11-06', critical_metrics: { running: rejected } }).projected.running).toBeUndefined();
  });
  it('keeps running power and later evidence out of an earlier running pace fit', () => {
    const effort = { id:'a', sport:'running', date:'2026-11-04', measurement:'power' };
    for (const running of [{ ...metric, efforts:[effort] }, { ...metric, latestEffortDate:'2026-11-20' }]) {
      const evidence = reportFieldEvidence({ date:'2026-11-06', critical_metrics:{running, runningPower:metric} });
      expect(evidence.critical.running).toBeUndefined();
      expect(evidence.critical.runningPower).toBeDefined();
    }
  });
  it('reports only the latest eligible paired test by athlete, sport and day, and reserves free text for the coach', () => {
    const row = (athlete_id: string, day: string) => ({ athlete_id, type:durabilityProtocol, raw:{ sport:'run', day, between:55, target:'5:00',
      early:'5:00', late:'5:00', hr1:140, hr2:150, rpe1:3, rpe2:5, context:'Note privée' } });
    const [pair] = latestPairs([row('a','2026-11-17'),row('b','2026-11-10'),row('a','2026-11-05')],'a','2026-11-12');
    const athlete = pairedFigure(pair, false);
    expect(athlete).toContain('05/11/2026');
    expect(athlete).toContain('a diminué de 6,7 %');
    expect(athlete).not.toContain('Note privée');
    expect(pairedFigure(pair, true)).toContain('Note privée');
  });
});
