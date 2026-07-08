import { describe, it, expect } from 'vitest';
import { getVlamaxTarget, normalizeVlamaxKey } from '../vlamaxTargets';

describe('vlamaxTargets — SOURCE UNIQUE', () => {
  it('semi run ideal = 0.40 (valeur canonique)', () => {
    expect(getVlamaxTarget('semi', 'run').ideal).toBe(0.40);
  });

  it('monotonie décroissante marathon < semi < 10k (run)', () => {
    const marathon = getVlamaxTarget('marathon', 'run').ideal;
    const semi = getVlamaxTarget('semi', 'run').ideal;
    const tenK = getVlamaxTarget('10k', 'run').ideal;
    expect(marathon).toBeLessThan(semi);
    expect(semi).toBeLessThan(tenK);
  });

  it('vélo ≈ course − 0.06 (offset canonique)', () => {
    for (const key of ['5k', '10k', 'semi', 'marathon', '703']) {
      const run = getVlamaxTarget(key, 'run');
      const bike = getVlamaxTarget(key, 'bike');
      // Plancher 0.20 respecté par max()
      expect(bike.ideal).toBeCloseTo(Math.max(0.20, +(run.ideal - 0.06).toFixed(2)), 5);
    }
  });

  it('plancher 0.20 appliqué pour vélo (IM)', () => {
    const bike = getVlamaxTarget('im', 'bike');
    expect(bike.ideal).toBeGreaterThanOrEqual(0.20);
    expect(bike.min).toBeGreaterThanOrEqual(0.20);
  });

  it('alias normalisés (semi/half/half-marathon)', () => {
    expect(normalizeVlamaxKey('Semi')).toBe('semi');
    expect(normalizeVlamaxKey('Half')).toBe('semi');
    expect(normalizeVlamaxKey('half-marathon')).toBe('semi');
    expect(normalizeVlamaxKey('Ironman')).toBe('im');
    expect(normalizeVlamaxKey('70.3')).toBe('703');
    expect(normalizeVlamaxKey('IM 70.3')).toBe('703');
    expect(normalizeVlamaxKey('5K')).toBe('5k');
    expect(normalizeVlamaxKey('TrailUltra')).toBe('im');
    expect(normalizeVlamaxKey('TrailMountain')).toBe('trail');
  });

  it('cible universelle : appel sans/avec ambition non exposé (signature)', () => {
    // La signature n'accepte PAS d'ambition — vérification statique via TS.
    // Ici on vérifie la stabilité de la valeur peu importe le "niveau" simulé.
    const a = getVlamaxTarget('semi', 'run');
    const b = getVlamaxTarget('semi', 'run');
    expect(a).toEqual(b);
  });
});

describe('lorangStrategyEngine — modulation ambition préservée', () => {
  it('finisher ne déclenche PAS de Sprint Ban même si VLamax > cible', async () => {
    const mod = await import('../lorangStrategyEngine');
    // Reconstitue le minimum requis par computeLorangStrategy
    const target = mod.getVlamaxTarget('semi', 'run');
    const vlamaxTooHigh = target.ideal * 1.2; // 20% au-dessus → normalement déclencheur
    const input = {
      objectif: 'semi',
      ambition: 'finisher' as const,
      discipline: 'run' as const,
      sportFocus: 'cap' as const,
      physiology: {
        vo2max: 45,
        vlamax: vlamaxTooHigh,
        vlamaxTarget: target.ideal,
        fatmax: 60,
        tte: 40,
        economy: 70,
        fatigue: 30,
        weight_kg: 70,
        ftp: 200,
      } as any,
      athlete: { age: 35, sex: 'M' as const, weight_kg: 70 },
      availability: { weekly_hours: 8, sessions_per_week: 5 },
    } as any;
    const res = mod.computeLorangStrategy(input);
    const banned = res?.avoid?.map((a: any) => a.id || a.key || a.label) || [];
    const hasSprintBan = banned.some((k: string) =>
      String(k).toLowerCase().includes('sprint'),
    );
    expect(hasSprintBan).toBe(false);
  });
});
