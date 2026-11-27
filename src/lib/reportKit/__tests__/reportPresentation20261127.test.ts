import { describe, expect, it } from 'vitest';
import { computeStrategicRoadmap } from '@/lib/v2/strategicRoadmap';
import { preparationTimeline } from '../editions';
import { reportSportZoneSets } from '../sportDiagramData';
import { buildTargetTable } from '@/lib/plan/targetTable';

/** Retour coach sur le rapport d'Emanuela (27/11/2026). */
describe('rapport athlète — présentation (27/11/2026)', () => {
  it('après une course, le bloc suivant commence le lendemain : aucun jour sans bloc', () => {
    const roadmap = computeStrategicRoadmap({
      objectif: 'IM', limiterResult: null, planStartDate: '2026-11-27',
      raceGoals: [
        { objective: 'Marathon', raceDate: '2027-02-28', raceName: 'Valence', priority: 'A' },
        { objective: 'IM', raceDate: '2027-06-27', raceName: 'Sables', priority: 'A' },
      ],
    });
    const html = preparationTimeline(roadmap, 'Ironman', true);
    expect(html).toContain('au 28/02/2027');
    expect(html).toContain('Du 01/03/2027');
    expect(html).not.toContain('Du 05/03/2027');
  });

  it('puissance Ironman sous Z2 : le rapport dit pourquoi', () => {
    const table = buildTargetTable({ objective: 'IM', ambition: 'competitor', ftp: 188, weightKg: 52, tteMinBike: 19 });
    expect(table.racePowerRange).toEqual([116, 121]);
    const payload = { athlete: { goal: 'IM' }, ambition: { current: 'competitor' }, tte: { tte_min: 19 },
      effectiveRefs: { ftp: 188, vo2max: 48, weightKg: 52, fcMax: 192 }, effectiveSnapshot: { date: '2026-11-25', vlamax: 0.2 } };
    const sets = reportSportZoneSets(payload);
    const race = sets.flatMap(s => s.landmarks ?? []).find(l => l.label.startsWith('Puissance de course'));
    expect(race?.zone).toBe('Z1');
    expect(race?.source).toMatch(/Volontairement sous Z2.*tenue au seuil/);
  });
});
