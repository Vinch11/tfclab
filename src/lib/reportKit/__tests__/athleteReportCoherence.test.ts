import { describe, expect, it } from 'vitest';
import { computeStrategicRoadmap } from '@/lib/v2/strategicRoadmap';
import { preparationTimeline, gapFigure } from '../editions';
import { sportDiagramHTML } from '../pedagogy';
import { reportSportZoneSets } from '../sportDiagramData';
import { gapPercent, type FactorRow } from '@/lib/coachingCompass/factorStates';
import { deriveTrainingZones } from '@/lib/zones/deriveTrainingZones';
import { estimateProfileFatMaxPctFTP } from '@/lib/v2/fatmaxTFCL';

/**
 * Retour coach sur un rapport athlète Ironman (nov. 2026) : frise impossible à lire, VLamax basse
 * classée comme un écart, trois FatMax différentes, FC de repos supposée à 50 % de la FCmax,
 * bornes de zones fictives et jargon interne dans l'édition athlète.
 */
describe('rapport athlète — cohérence', () => {
  const threeRaces = computeStrategicRoadmap({
    objectif: 'IM', limiterResult: null, planStartDate: '2026-11-23',
    raceGoals: [
      { objective: 'IM', raceDate: '2027-02-28', raceName: 'Valence', priority: 'A' },
      { objective: 'Marathon', raceDate: '2027-06-13', priority: 'A' },
      { objective: 'IM', raceDate: '2027-10-10', raceName: 'Barcelone', priority: 'A' },
    ],
  });

  it('la frise nomme chaque course, date les blocs et finit sur la dernière course', () => {
    expect(threeRaces.cycles?.map(c => c.raceName ?? c.objective)).toEqual(['Valence', 'Marathon', 'Barcelone']);
    expect(threeRaces.startDate).toBe('2026-11-23');
    const html = preparationTimeline(threeRaces, 'Ironman · Valence · 28/02/2027', true);
    expect(html).toContain('3 courses · ');
    expect(html).toContain('Course 1 sur 3');
    expect(html).toContain('Valence · Ironman · 28/02/2027');
    expect(html).toContain('Du 23/11/2026 au');
    expect(html).toContain('Barcelone · Ironman · 10/10/2027');
    expect(html).not.toContain('Ironman · Valence · 28/02/2027</strong>');
    // Les blocs des cycles 2 et 3 retrouvent leur nom pédagogique malgré le suffixe « (Cycle n/3 — X) ».
    expect(html).not.toMatch(/Cycle \d\/3/);
    expect(html).not.toContain('Force Endurance K3');
  });

  it('sans date de départ, la frise se présente comme un gabarit', () => {
    const html = preparationTimeline(computeStrategicRoadmap({ objectif: 'IM', limiterResult: null }), 'Ironman', true);
    expect(html).toContain('Trajectoire type sur 24 semaines');
  });

  it('une VLamax sous le repère n’est pas un écart sur épreuve longue', () => {
    const row = { key: 'vlamax', label: 'VLamax', unit: 'mmol/L/s', value: 0.2, zone: { low: 0.21, high: 0.31, point: null },
      tier: 'coaching', state: 'below', basis: null, evidence: [], engineNote: null } as FactorRow;
    expect(gapPercent(row, true)).toBe(0);
    expect(gapPercent(row, false)).toBeGreaterThan(4);
    expect(gapPercent({ ...row, value: 0.4, state: 'above' }, true)).toBeGreaterThan(0);
  });

  it('les zones vélo utilisent la même FatMax que le Compass', () => {
    const set = deriveTrainingZones({ sport: 'bike', ftp: 188, vo2max: 52, vlamax: 0.2, weightKg: 51.9 });
    const compassPct = estimateProfileFatMaxPctFTP(0.2, 52, 51.9, 188);
    expect(set.anchors[0]).toContain(`FatMax ≈ ${compassPct} % FTP`);
    const z2 = set.zones.find(z => z.id === 'Z2')!;
    expect(z2.pctRef.max).toBeLessThan(85);
  });

  it('sans FC de repos, la réserve cardiaque part d’une valeur type plausible et le dit', () => {
    const set = deriveTrainingZones({ sport: 'bike', ftp: 188, vo2max: 52, vlamax: 0.2, weightKg: 51.9, fcMax: 192 });
    expect(set.anchors.join(' ')).toContain('FC de repos non renseignée');
    const z1 = set.zones.find(z => z.id === 'Z1')!;
    expect(Number(z1.heartRate!.split('–')[0])).toBeLessThan(105);
  });

  it('les zones extrêmes restent ouvertes et la plage de course est transmise', () => {
    const sets = reportSportZoneSets({ athlete: { goal: 'IM' },
      effectiveRefs: { ftp: 188, vo2max: 52, weightKg: 51.9, vma: 13, fcMax: 192 },
      effectiveSnapshot: { pace_threshold_sec_per_km: 315 }, vlamax: { value: 0.2 } });
    const bike = sets.find(s => s.sportLabel === 'Vélo')!;
    const run = sets.find(s => s.sportLabel === 'Course à pied')!;
    expect(bike.zones[0].absolute).toMatch(/^< \d+ W$/);
    expect(bike.zones[5].absolute).toMatch(/^> \d+ W$/);
    expect(run.zones[0].absolute).toMatch(/^plus lent que \d:\d\d\/km$/);
    expect(run.zones[5].absolute).toMatch(/^plus rapide que \d:\d\d\/km$/);
    expect(bike.markers?.find(m => m.id === 'race_specific')?.absolute).toMatch(/^\d+–\d+ W$/);
  });

  it('l’édition athlète parle de repère d’objectif, pas de compass ni de moteur', () => {
    const html = sportDiagramHTML({ sport: 'bike', athlete: true, zones: [], durability: null,
      raceMarkers: [{ label: 'Puissance de course · Ironman', absolute: '125–140 W' }],
      comparisons: [{ key: 'vo2max', label: 'VO₂max', value: 52, target: 49.3, unit: 'ml/kg/min', range: { low: 50.4, high: 56.4 } }],
      tte: [{ key: 'tte', label: 'TTE vélo', value: 35, target: 52, unit: 'min' }] });
    expect(html).toContain('Repère pour ton objectif : 50,4–56,4 ml/kg/min');
    expect(html).not.toMatch(/compass|repère TFCL|repère interne/i);
    const gaps = gapFigure([{ r: { key: 'tte', label: 'TTE', unit: 'min', value: 40, zone: { low: 52, high: 52, point: 52 }, tier: 'coaching',
      state: 'below', basis: null, evidence: [], engineNote: null }, sport: 'run', gap: 23 }], false,
      { flow: { lead: { metric: 'tte', sport: 'run' }, others: [] } } as never);
    expect(gaps).toContain('C’est la priorité de ton plan');
    expect(gaps).not.toMatch(/moteur|Repère interne TFCL/);
  });
});
