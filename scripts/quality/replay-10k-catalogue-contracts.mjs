/** Offline synthetic replay of the declared 10K calendar; no model, DB or athlete input. */
import { createServer } from 'vite';
import { createServer as http } from 'node:http';
import { writeFileSync } from 'node:fs';
const root = process.cwd();
const server = await createServer({ root, configFile: false, resolve: { alias: { '@': `${root}/src` } },
  server: { middlewareMode: true, watch: null, hmr: { server: http() } }, appType: 'custom', logLevel: 'error' });
const originalLog = console.log, originalWarn = console.warn;
console.log = console.warn = () => {};
try {
  const load = path => server.ssrLoadModule(path);
  const { buildWorkoutCatalog } = await load('/src/lib/workoutCatalogBuilder.ts');
  const { catalogueForWeek, catalogueEligibility } = await load('/supabase/functions/_shared/sessionCatalogueContract.ts');
  const { buildPeriodizationCalendar } = await load('/src/lib/plan/periodizationCalendar.ts');
  const { computeWeekQuotaEntry, inferWeekType } = await load('/src/engines/plan/sessionSizingMatrix.ts');
  const { buildWeeklySlotLayout } = await load('/src/engines/plan/weeklySlotLayout.ts');
  const { computeAmbitionEffective } = await load('/src/lib/ambitionDowngrade.ts');
  const resolution = computeAmbitionEffective({ ambitionSaisie: 'competitor', trainingLevel: 'light', tss7d: null, lockAmbition: false });
  const config = { objective: '10K', ambition: resolution.ambitionEffective, weeksAvailable: 12, fondationDurationWeeks: 4,
    identifiedLimitersRaw: ['VLamax', 'FatMax', 'VMA', 'VO2max', 'Wprime'], planStartDate: '2026-10-26',
    raceGoals: [{ objective: '10K', priority: 'A', raceDate: '2027-01-17' }, { objective: '10K', priority: 'B', raceDate: '2026-12-19' }] };
  const calendar = buildPeriodizationCalendar(config);
  const pools = [1, 5, 9].map(start => buildWorkoutCatalog('10K', start, start + 3, 12, {
    strictPhaseFilter: true, phaseOverride: [...new Set([0, 1, 2, 3].map(i => calendar[start + i]))], maxItems: 130,
    chunkIndex: (start - 1) / 4, excludeIds: new Set(), limiters: config.identifiedLimitersRaw,
    sportFilter: ['course', 'run', 'strength', 'renforcement'], rotationSeed: 0,
    beginnerIntensitySignal: { trainingLevel: 'light', trainingLevelSource: 'manual', weeklyHours: 4 },
  }).map(e => e.repairMetadata));
  const scenarios = [32, 50].map(syntheticAge => ({ syntheticAge, weeks: Array.from({ length: 12 }, (_, i) => {
    const week = i + 1, phase = calendar[week], weekType = inferWeekType(week, 12, '10K', syntheticAge);
    const entry = computeWeekQuotaEntry('10K', config.ambition, 4, weekType, false);
    const pool = pools[Math.floor(i / 4)], context = { phase, objective: '10K', weekType };
    const { eligible, missingSports } = catalogueForWeek(pool, context, entry.quota);
    const availableSports = new Set(eligible.map(m => /course|run/i.test(m.sport) ? 'run' : /renforcement|strength/i.test(m.sport) ? 'strength' : m.sport));
    const layout = buildWeeklySlotLayout(entry.quota, entry.floors, weekType, { availableSports });
    return { week, phase, weekType, quota: entry.quota, layout, missingSports,
      candidates: pool.map(m => ({ id: m.id, sport: m.sport, phases: m.phases, durationMin: m.durationMin,
        intentFamily: m.intentFamily, reasons: catalogueEligibility(m, context) })),
      eligibleCount: eligible.length,
      minimaSum: ['run', 'bike', 'swim', 'brick', 'strength'].reduce((sum, sport) => sum + entry.quota[sport].min, 0),
      layoutCount: layout.days.flatMap(d => d.slots).length };
  }) }));
  const result = { syntheticOnly: true, modelCalls: 0, databaseCalls: 0, config,
    assumptions: ['Internal 4h reference is NOT measured current load', 'Synthetic ages exercise both existing recovery cadences',
      'No actual rejected session IDs, history, rotation or prohibitions are available; pools are not the historical payload'], scenarios };
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n');
  originalLog(JSON.stringify(scenarios.map(s => ({ syntheticAge: s.syntheticAge, weeks: s.weeks.map(w => ({
    week: w.week, phase: w.phase, type: w.weekType, eligible: w.eligibleCount, missingSports: w.missingSports,
    total: w.quota.totalSessions, run: w.quota.run, layout: w.layoutCount, minimaSum: w.minimaSum,
  })) })), null, 2));
} finally { console.log = originalLog; console.warn = originalWarn; await server.close(); }
