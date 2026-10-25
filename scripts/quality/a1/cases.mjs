import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const fixturePath = 'src/lib/plan/qa/__tests__/fixtures/2026-10-15_B-5K-BEGINNER_run1.json';
const contractPath = 'src/lib/plan/__tests__/sessionCatalogueContract.test.ts';
const approvedSources = JSON.parse(readFileSync(resolve(root, 'docs/quality/a1-approved-sources.json'), 'utf8'));
const read = path => {
  const content = readFileSync(resolve(root, path), 'utf8');
  if (hash(content) !== approvedSources[path]) throw new Error('case_source_changed');
  return content;
};
const criteria = ['limiter_translation', 'session_equivalence', 'intensity_dose', 'load_progression',
  'recovery_periodization', 'constraints_events', 'evidence_limits'];
export const caseIds = ['ref-01', 'ref-02', 'ref-03', 'ref-04', 'ref-05', 'ref-06', 'ref-07'];

/** Closed registry: no arbitrary athlete objects, files, URLs or prompts accepted.
 * All profiles are synthetic. Names, dates, raw diagnostic/config objects omitted.
 * Expert expectations are kept separately, NEVER included in the API bundle. */
export function prepareCase(id) {
  if (!caseIds.includes(id)) throw new Error('case_not_approved');
  const evidence = [];
  const add = (evidenceId, content) => evidence.push({ id: evidenceId, content: JSON.stringify(content) });
  let scope, source, applicableCriteria;
  if (id === 'ref-01') {
    source = { path: fixturePath, sha256: hash(read(fixturePath)) };
    const input = JSON.parse(read(fixturePath));
    scope = 'recorded_generation_synthetic_profile_partial_personalization';
    applicableCriteria = criteria;
    add('profile', { synthetic: true, trainingLevel: input.input.planConfig.ambitionMeta.trainingLevel,
      vo2max: input.input.athleteData.vo2max, vma: input.input.athleteData.vma,
      thresholdPaceSecPerKm: input.input.athleteData.paceThresholdSecPerKm,
      thresholdSource: input.input.athleteData.runMLSSEffectiveSource,
      diagnosticConfidence: null, orderedLimiters: null, activeLevers: null,
      limitation: 'Historical limiter ranking and confidence are absent. Do not recompute or infer them.' });
    add('constraints', { objective: input.input.planConfig.objective, weeklyHours: input.input.planConfig.weeklyHours,
      sessionsPerWeek: input.input.planConfig.sessionsPerWeek,
      strengthSessionsPerWeek: input.input.planConfig.strengthSessionsPerWeek,
      maxSessionsPerDay: input.input.planConfig.maxSessionsPerDay, terrain: input.input.planConfig.terrainAvailability,
      countingConvention: 'Do not infer an endurance-versus-total counting contract from these numeric fields alone.' });
    for (const week of input.output.mergedPlan.weeks) {
      add(`week.${week.weekNumber}`, { phase: week.phase, theme: week.theme });
      week.sessions.forEach((session, index) => {
        // Titles/details belong to the approved synthetic fixture, never a supplied athlete export.
        const { dayIndex, dayName, sport, title, details, durationMin, zones, isRest, isKeySession, catalogId, custom } = session;
        add(`plan.S${week.weekNumber}.session.${index}`, { dayIndex, dayName, sport, title, details, durationMin, zones, isRest, isKeySession, catalogId, custom });
      });
    }
  } else {
    source = { path: contractPath, sha256: hash(read(contractPath)) };
    scope = 'existing_contract_reference_excerpt_not_a_complete_generated_plan';
    applicableCriteria = ['session_equivalence', 'evidence_limits'];
    // Transcriptions of the existing four PDF regression cases, not new prescriptions.
    const cases = {
      'ref-02': { week: 1, sport: 'brick', phase: 'base', durationMin: 120, zones: ['Z1', 'Z2'],
        catalogId: 'B_BRICK_RACE_PACE_SHORT_703', title: 'Brique Introductive Vélo-Course', details: 'Vélo :90min endurance fondamentale Z2. Course :30min Z1-Z2' },
      'ref-03': { week: 4, sport: 'bike', phase: 'base', durationMin: 80, zones: ['Z4a'],
        catalogId: 'V3_BIKE_SST_PROGRESSIF', title: 'Vélo Sweet Spot Progressif', details: '3x12min Z4a' },
      'ref-04': { week: 6, sport: 'brick', phase: 'base', durationMin: 105, zones: ['Z1', 'Z2'],
        catalogId: 'BR_HALF_V1_PRO', title: 'Brique aérobie contrôlée', details: 'Bike:80min Z2. Run:25min Z1-Z2' },
      'ref-05': { week: 10, sport: 'run', phase: 'build', durationMin: 95, zones: ['Z2'],
        catalogId: 'A_RUN_DURABILITY_LONG', title: 'Sortie longue endurance & durabilité', details: 'Warm-up:15min Z1-Z2. Main:75min Z2. Cool-down:5min' },
      // Positive control: existing explicit numeric variant from the same test.
      'ref-06': { sport: 'run', phase: 'build', durationMin: 60, zones: ['Z2'], catalogId: 'A_RUN_DURABILITY_LONG',
        title: 'Endurance fondamentale', variantKey: 'half' },
      // Missing-data control: same existing legacy session test, no duration invented.
      'ref-07': { sport: 'run', phase: 'build', catalogId: 'A_RUN_DURABILITY_LONG', title: 'Endurance' },
    };
    add('profile', { synthetic: true, diagnosticConfidence: null, orderedLimiters: null,
      limitation: 'Only catalogue equivalence is testable; no athlete diagnosis or complete periodization supplied.' });
    add('prescription', cases[id]);
    // Metadata below is exported offline from the real catalogue, not rewritten.
    const metadata = JSON.parse(read('docs/quality/a1-catalogue-evidence.json'));
    add('catalogue', metadata[cases[id].catalogId]);
    if (id === 'ref-06') add('selectedVariant', { key: 'half', text: 'Z2 40–70 min',
      provenance: 'Explicit numeric variant fixture in sessionCatalogueContract.test.ts; not a mutation of library metadata.' });
  }
  const commonPaths = ['docs/quality/SPORT_SCIENCE_CONTRACT.md', 'src/lib/zones/tfclDoctrine.ts', 'docs/quality/a1-catalogue-evidence.json'];
  const references = commonPaths.map(path => ({ path, sha256: hash(read(path)) }));
  add('review-contract', read(commonPaths[0]));
  const doctrine = read(commonPaths[1]);
  add('doctrine', doctrine.slice(0, doctrine.indexOf('export function getDoctrineDomain')));
  const packet = { caseId: id, scope, source, references, applicableCriteria, evidence };
  return { ...packet, bundleHash: hash(packet) };
}

/** Explicit expert acceptance criteria copied from existing tests and Q1 limits.
 * These grade an evaluation, not athletes, and do not change sport rules. */
export const expertExpectations = {
  'ref-01': { uncertain: ['limiter_translation', 'session_equivalence', 'evidence_limits'], violated: [], notViolated: [],
    note: 'No assertion of complete individual causality without historical limiters/confidence.' },
  'ref-02': { uncertain: ['evidence_limits'], violated: ['session_equivalence'], notViolated: [] },
  'ref-03': { uncertain: ['evidence_limits'], violated: ['session_equivalence'], notViolated: [] },
  'ref-04': { uncertain: ['evidence_limits'], violated: ['session_equivalence'], notViolated: [] },
  'ref-05': { uncertain: ['evidence_limits'], violated: ['session_equivalence'], notViolated: [] },
  'ref-06': { uncertain: ['evidence_limits'], violated: [], notViolated: ['session_equivalence'] },
  'ref-07': { uncertain: ['session_equivalence', 'evidence_limits'], violated: [], notViolated: [] },
};
