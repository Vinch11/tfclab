/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 1B — Merge tests exécutables au runtime (fallback Vitest)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Vitest est cassé dans la sandbox dev (`vite/module-runner` ERR). En attendant
 * réparation, ces 8 cas tournent au clic depuis /debug/plan-qa. Aucune requête
 * réseau, aucun appel IA. Miroir strict de mergePlanChunks.test.ts.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { mergePlanChunks, MergePlanError, validateSportObjective } from "./mergePlanChunks";
import { jsonPlanToParsedPlan, computeWeeklyVolumeBySport } from "./jsonPlanToParsedPlan";
import { zPlanChunk, type PlanChunk } from "./planSchema";

export interface TestResult {
  name: string;
  pass: boolean;
  error?: string;
}

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}
function assertEqual<T>(a: T, b: T, msg: string) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`${msg} — expected ${sb}, got ${sa}`);
}
function assertThrows(fn: () => void, expected: any, msg: string) {
  try {
    fn();
  } catch (e) {
    if (expected && !(e instanceof expected)) {
      throw new Error(`${msg} — expected ${expected.name}, got ${(e as Error).name}`);
    }
    return;
  }
  throw new Error(`${msg} — no throw`);
}

function mkSession(over: any = {}) {
  return {
    day: "lundi", title: "Session", details: "",
    isKeySession: false, durationMin: 60, zones: [],
    sport: "bike", custom: false, catalogId: "B_BIKE_TEMPO_01",
    ...over,
  };
}
function mkChunk(weeks: number[], over: any = {}): PlanChunk {
  return zPlanChunk.parse({
    weeks: weeks.map(n => ({
      weekNumber: n, phase: "build", theme: `S${n}`, sessions: [mkSession()],
    })),
    ...over,
  });
}

const CASES: Array<{ name: string; fn: () => void }> = [
  {
    name: "merge — chunks consécutifs (1..8)",
    fn: () => {
      const c1 = mkChunk([1, 2, 3, 4], { title: "T", phases: [{ name: "Base", weeks: "S1-S4" }] });
      const c2 = mkChunk([5, 6, 7, 8]);
      const m = mergePlanChunks([c1, c2], 8);
      assertEqual(m.weeks.map(w => w.weekNumber), [1, 2, 3, 4, 5, 6, 7, 8], "weekNumbers");
      assert(m.title === "T", "title");
    },
  },
  {
    name: "merge — détecte GAP",
    fn: () => {
      const c1 = mkChunk([1, 2, 3]);
      const c2 = mkChunk([5, 6]);
      assertThrows(() => mergePlanChunks([c1, c2], 6), MergePlanError, "expected GAP");
    },
  },
  {
    name: "merge — détecte DUP",
    fn: () => {
      const c1 = mkChunk([1, 2, 3]);
      const c2 = mkChunk([3, 4]);
      assertThrows(() => mergePlanChunks([c1, c2], 4), MergePlanError, "expected DUP");
    },
  },
  {
    name: "merge — chunks désordonnés",
    fn: () => {
      const a = mkChunk([5, 6, 7, 8]);
      const b = mkChunk([1, 2, 3, 4]);
      const m = mergePlanChunks([a, b], 8);
      assertEqual(m.weeks.map(w => w.weekNumber), [1, 2, 3, 4, 5, 6, 7, 8], "sorted");
    },
  },
  {
    name: "merge — weekNumber hors bornes",
    fn: () => {
      const c = mkChunk([1, 2, 9]);
      assertThrows(() => mergePlanChunks([c], 8), MergePlanError, "expected OUT_OF_RANGE");
    },
  },
  {
    name: "volume — recalculé depuis Σ durationMin (contrainte N°4)",
    fn: () => {
      const chunk = zPlanChunk.parse({
        weeks: [{
          weekNumber: 1, phase: "base", theme: "S1",
          sessions: [
            mkSession({ day: "lundi", durationMin: 60 }),
            mkSession({ day: "mardi", durationMin: 90 }),
            {
              day: "mercredi", sport: "rest", title: "Repos", details: "",
              isKeySession: false, durationMin: 0, zones: [],
              custom: true, catalogId: null,
            },
          ],
        }],
      });
      const merged = mergePlanChunks([chunk], 1);
      const parsed = jsonPlanToParsedPlan(merged);
      assert(parsed.weeks[0].computedVolumeMin === 150, "computedVolumeMin=150");
      assert(parsed.weeks[0].volumeTarget === undefined, "volumeTarget must be undefined");
      const vol = computeWeeklyVolumeBySport(merged)[0];
      assert(vol.totalMin === 150, "totalMin=150");
      assert(vol.bySport.bike === 150, "bySport.bike=150");
    },
  },
  {
    name: "sport-guard — flag catalogId trail dans 70.3 (critical)",
    fn: () => {
      const c = zPlanChunk.parse({
        weeks: [{
          weekNumber: 1, phase: "base", theme: "",
          sessions: [mkSession({ catalogId: "A_TR_HILL_HIKE" })],
        }],
      });
      const m = mergePlanChunks([c], 1);
      const issues = validateSportObjective(m, "70.3 Nice");
      assert(issues.length === 1, `expected 1 issue, got ${issues.length}`);
      assert(issues[0].severity === "critical", "severity critical");
      assert(issues[0].offendingId === "A_TR_HILL_HIKE", "offendingId");
    },
  },
  {
    name: "sport-guard — custom trail vocab dans semi (critical)",
    fn: () => {
      const c = zPlanChunk.parse({
        weeks: [{
          weekNumber: 1, phase: "base", theme: "",
          sessions: [{
            day: "samedi", sport: "run", title: "Sortie longue",
            details: "3h de sortie avec 1500m D+ et power-hike sur les montées",
            isKeySession: true, durationMin: 180, zones: ["Z2"],
            custom: true, catalogId: null,
          }],
        }],
      });
      const m = mergePlanChunks([c], 1);
      const issues = validateSportObjective(m, "Semi-marathon");
      assert(issues.length === 1, `expected 1 issue, got ${issues.length}`);
      assert(/marqueur trail/i.test(issues[0].reason), "reason mentions trail");
    },
  },
];

export async function runMergeTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const c of CASES) {
    try {
      c.fn();
      results.push({ name: c.name, pass: true });
    } catch (e) {
      results.push({ name: c.name, pass: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
