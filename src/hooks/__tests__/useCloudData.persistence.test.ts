import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory transport only: no real database client or network is imported.
const transport = vi.hoisted(() => ({
  user: { id: "11111111-1111-4111-8111-111111111111" },
  rows: {} as Record<string, Record<string, unknown>[]>,
  failWrite: false,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: transport.user }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from(table: string) {
    let payload: Record<string, unknown> | null = null;
    let operation = "read";
    const filters: [string, unknown][] = [];
    const execute = () => {
      if (operation !== "read" && transport.failWrite) return { data: null, error: { message: "offline" } };
      const rows = transport.rows[table] ??= [];
      if (payload && operation === "upsert") {
        const existing = rows.findIndex(row => row.athlete_id === payload!.athlete_id);
        const saved = JSON.parse(JSON.stringify(payload));
        if (existing >= 0) rows[existing] = { ...rows[existing], ...saved };
        else rows.push(saved);
      } else if (payload && operation === "update") {
        rows.forEach((row, i) => { if (filters.every(([key, value]) => row[key] === value)) rows[i] = { ...row, ...JSON.parse(JSON.stringify(payload)) }; });
      } else if (payload && operation === "insert") {
        rows.push({ id: "33333333-3333-4333-8333-333333333333", ...JSON.parse(JSON.stringify(payload)) });
      }
      return { data: structuredClone(rows.filter(row => filters.every(([key, value]) => row[key] === value))), error: null };
    };
    const query = {
      select: () => query, order: () => query,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      upsert: (value: Record<string, unknown>) => { payload = value; operation = "upsert"; return query; },
      update: (value: Record<string, unknown>) => { payload = value; operation = "update"; return query; },
      insert: (value: Record<string, unknown>) => { payload = value; operation = "insert"; return query; },
      single: () => { const result = execute(); return Promise.resolve({ ...result, data: result.data?.at(-1) ?? null }); },
      then: (resolve: (value: ReturnType<typeof execute>) => unknown) => Promise.resolve(execute()).then(resolve),
    };
    return query;
  },
} }));
import { useCloudData } from "../useCloudData";

const athleteId = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  transport.failWrite = false;
  const owner = { athlete_id: athleteId, coach_id: transport.user.id };
  transport.rows = {
    athletes: [{ id: athleteId, coach_id: transport.user.id, name: "Synthetic", refs: { vma: 15 }, active_snapshot_id: "snapshot-1" }],
    snapshots: [{ ...owner, id: "snapshot-1", date: "2026-10-25", vma: 15, confidence: 0.6, run_economy_score: 50 }],
    tests: [{ ...owner, id: "test-1", reliability: 75, raw: { protocol: "synthetic", samples: [1, 2] } }],
    plans: [], checkins: [],
  };
});

describe("cloud data persistence through mocked transport", () => {
  it("reopens saved plans, tests and profiles after the hook is destroyed, preserving edited structured fields", async () => {
    const first = renderHook(() => useCloudData());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    const plan = { weeks: [{ weekNumber: 1, sessions: [{ title: "Edited", durationMin: 47, custom: true, catalogId: null, zones: ["Z2"] }] }] };
    await act(async () => { expect(await first.result.current.savePlan(athleteId, plan)).toBe(true); });
    await act(async () => { expect(await first.result.current.updateSnapshot("snapshot-1", { vma: 16, confidence: 0.7 })).toBe(true); });
    await act(async () => { expect(await first.result.current.addTest(athleteId, "field", "Synthetic test", "run", 80, 0.5, { samples: [3, 4] })).not.toBeNull(); });
    const before = {
      plan: structuredClone(first.result.current.getPlan(athleteId)!.plan_json),
      tests: structuredClone(first.result.current.getTestsForAthlete(athleteId)),
      snapshots: structuredClone(first.result.current.getSnapshotsForAthlete(athleteId)),
      athletes: structuredClone(first.result.current.athletes),
    };
    first.unmount();
    const reopened = renderHook(() => useCloudData());
    await waitFor(() => expect(reopened.result.current.loading).toBe(false));
    expect(reopened.result.current.getPlan(athleteId)!.plan_json).toEqual(before.plan);
    // The mock does not implement server date ordering; compare identities/content.
    expect(reopened.result.current.getTestsForAthlete(athleteId).sort((a, b) => a.id.localeCompare(b.id)))
      .toEqual(before.tests.sort((a, b) => a.id.localeCompare(b.id)));
    expect(reopened.result.current.getSnapshotsForAthlete(athleteId)).toEqual(before.snapshots);
    expect(reopened.result.current.athletes).toEqual(before.athletes);
    expect(transport.rows.plans[0].plan_json).toEqual(plan);
    reopened.unmount();
  });

  it("a rejected save leaves both the prior local plan and stored plan unchanged", async () => {
    const hook = renderHook(() => useCloudData());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await act(async () => { await hook.result.current.savePlan(athleteId, { title: "saved" }); });
    const before = structuredClone(transport.rows.plans);
    transport.failWrite = true;
    await act(async () => { expect(await hook.result.current.savePlan(athleteId, { title: "unsaved" })).toBe(false); });
    expect(hook.result.current.getPlan(athleteId)!.plan_json).toEqual({ title: "saved" });
    expect(transport.rows.plans).toEqual(before);
    hook.unmount();
  });
});
