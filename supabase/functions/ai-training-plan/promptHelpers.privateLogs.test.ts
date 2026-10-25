import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUserPrompt } from './promptHelpers.ts';
Deno.test('prompt construction keeps physiology and private config out of every console method', () => {
  const logs: unknown[] = [];
  const methods = ['log', 'info', 'warn', 'error'] as const;
  const saved = methods.map(method => console[method]);
  for (const method of methods) console[method] = (...args: unknown[]) => { logs.push(args); };
  try {
    const prompt = buildUserPrompt({ nom: 'PRIVATE_CANARY', vma: 9.87654321, paceThresholdSecPerKm: 412.2468 }, {
      objective: '10 KM', ambition: 'PRIVATE_CANARY', weeksAvailable: 12, weeklyHours: 5,
      raceGoals: [{ raceName: 'PRIVATE_CANARY', objective: '10 KM', weeksUntilRace: 12, priority: 'A' }],
    });
    assert.ok(prompt.length > 100);
    const output = JSON.stringify(logs);
    for (const privateValue of ['PRIVATE_CANARY', '9.87654321', '412.2468']) assert.ok(!output.includes(privateValue));
  } finally { methods.forEach((method, index) => { console[method] = saved[index]; }); }
});
Deno.test('entrypoint console calls do not directly interpolate athlete or medical configuration', () => {
  const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
  for (const line of source.split('\n').filter(line => /console\.(log|info|warn|error)\(/.test(line))) {
    assert.ok(!/athleteData|raceGoals|injuryRisk|_athleteSex|JSON\.stringify\(planConfig/.test(line));
  }
});
