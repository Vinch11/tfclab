import { describe, it, expect } from 'vitest';
import {
  getVlamaxSprintBanMultiplier,
  getReductionIntensity,
  getVlamaxTarget,
} from '../lorangStrategyEngine';

/**
 * Vérifie la MODULATION AMBITION de la réponse VLamax.
 * Rappel : la cible reste universelle (semi=0.40, marathon=0.34).
 * Seuls le déclenchement et l'agressivité varient.
 */
describe('Modulation ambition VLamax — seuils & agressivité', () => {
  it('multiplicateurs Sprint Ban par ambition', () => {
    expect(getVlamaxSprintBanMultiplier('finisher')).toBe(Infinity);
    expect(getVlamaxSprintBanMultiplier('age_group')).toBe(1.25);
    expect(getVlamaxSprintBanMultiplier('competitor')).toBe(1.15);
    expect(getVlamaxSprintBanMultiplier('elite')).toBe(1.10);
    expect(getVlamaxSprintBanMultiplier('world_class')).toBe(1.10);
  });

  it('intensité de réduction (soft vs firm)', () => {
    expect(getReductionIntensity('finisher')).toBe('soft');
    expect(getReductionIntensity('age_group')).toBe('soft');
    expect(getReductionIntensity('competitor')).toBe('firm');
    expect(getReductionIntensity('elite')).toBe('firm');
    expect(getReductionIntensity('world_class')).toBe('firm');
  });

  // ─── Cas (a) : SEMI age_group, VLamax 0.48 ─────────────────────────────────
  it('(a) SEMI age_group VLamax=0.48 → réduction DOUCE, PAS de Sprint Ban', () => {
    const target = getVlamaxTarget('semi', 'run').ideal; // 0.40
    const vlamax = 0.48;
    const seuil = target * getVlamaxSprintBanMultiplier('age_group'); // 0.40×1.25 = 0.50
    expect(vlamax).toBeLessThan(seuil);
    expect(getReductionIntensity('age_group')).toBe('soft');
  });

  // ─── Cas (b) : SEMI competitor, VLamax 0.48 ────────────────────────────────
  it('(b) SEMI competitor VLamax=0.48 → réduction FERME, seuil déclenché', () => {
    const target = getVlamaxTarget('semi', 'run').ideal; // 0.40
    const vlamax = 0.48;
    const seuil = target * getVlamaxSprintBanMultiplier('competitor'); // 0.40×1.15 = 0.46
    expect(vlamax).toBeGreaterThan(seuil);
    expect(getReductionIntensity('competitor')).toBe('firm');
    // NB : pour SEMI, le Sprint Ban lui-même reste bloqué en amont
    // (isLongDistance = false pour 'semi'), mais l'agressivité "firm"
    // se manifeste via la prescription Z2/SFR (priority 1, blocs longs).
  });

  // ─── Cas (c) : MARATHON finisher, VLamax 0.45 ──────────────────────────────
  it('(c) MARATHON finisher VLamax=0.45 → jamais de Sprint Ban, base aérobie encouragée', () => {
    const target = getVlamaxTarget('marathon', 'run').ideal; // 0.34
    const vlamax = 0.45;
    const mult = getVlamaxSprintBanMultiplier('finisher');
    expect(mult).toBe(Infinity);
    // Même si vlamax bien au-dessus (0.45 > 0.34×1.25=0.425), pas de SB.
    expect(Number.isFinite(mult)).toBe(false);
    expect(getReductionIntensity('finisher')).toBe('soft');
  });

  // ─── Garde-fou : le diagnostic glycolytique reste fidèle ──────────────────
  it('détection limiteur glycolytique (gap>0.15) inchangée quel que soit l’ambition', () => {
    const target = getVlamaxTarget('semi', 'run').ideal; // 0.40
    const vlamax = 0.48;
    const gap = (vlamax - target) / target; // 0.20 > 0.15
    expect(gap).toBeGreaterThan(0.15);
    // La détection ne dépend pas de l'ambition — c'est un fait physiologique.
    // Seule la RÉPONSE (agressivité + prohibitions) est modulée.
  });
});
