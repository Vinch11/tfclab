import { it, expect, vi } from 'vitest';
import { deriveRaceTargets, mapObjectiveToSport } from '../deriveRaceTargets';
it('keeps athlete values and free-text objectives out of browser console methods', () => {
  const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'info'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
  spies.forEach(spy => spy.mockImplementation(() => {}));
  try {
    mapObjectiveToSport('PRIVATE_CANARY');
    const result = deriveRaceTargets({ objective: '10 KM', ambition: 'competitor', sport: 'run_route',
      vmaKmh: 9.87654321, thresholdPaceSecPerKm: 412.2468, weeklyHours: 7.654321 });
    expect(result.source).toBe('snapshot');
    const logged = JSON.stringify(spies.map(spy => spy.mock.calls));
    for (const value of ['PRIVATE_CANARY', '9.87654321', '412.2468', '7.654321']) expect(logged).not.toContain(value);
    expect(logged).toContain('race_target_resolution');
  } finally { spies.forEach(spy => spy.mockRestore()); }
});
