import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mocks = vi.hoisted(() => ({
  archiveInsert: vi.fn(),
  planUpsert: vi.fn(),
  checkGuard: vi.fn(),
  patch: vi.fn(),
  journal: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "plan_versions") return { insert: mocks.archiveInsert };
      if (table === "plans") return { upsert: mocks.planUpsert };
      throw new Error("Unexpected table: " + table);
    },
  },
}));
vi.mock("@/hooks/useAITrainingPlan", () => ({
  useAITrainingPlan: () => ({ isLoading: false, chunkProgress: 0 }),
}));
vi.mock("@/engines/plan/planPatcher", () => ({
  applyDeload: mocks.patch,
  redistributeMissedSession: mocks.patch,
  swapModality: mocks.patch,
  shiftRaceDate: mocks.patch,
}));
vi.mock("@/engines/plan/planAdaptationJournal", () => ({
  checkAdaptationGuard: mocks.checkGuard,
  journalAdaptation: mocks.journal,
  listRecentAdaptations: vi.fn(() => []),
}));
vi.mock("@/engines/plan/computePlan", () => ({
  postProcessParsedPlan: (plan: unknown) => ({ plan }),
}));
vi.mock("@/engines/plan/planValidator", () => ({
  validatePlan: () => ({ issues: [] }),
}));
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    warning: vi.fn(),
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

import { usePlanAdaptation, type ApplyPatchArgs } from "../usePlanAdaptation";

// This static guard documents the invariant. Behavioral tests below exercise
// the REAL hook and asynchronous Supabase error result (no live database).
const source = readFileSync(resolve(process.cwd(), "src/hooks/usePlanAdaptation.ts"), "utf8");

describe("adaptation persistence — fail-closed archive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkGuard.mockResolvedValue({ allowed: true, reason: null });
    mocks.journal.mockResolvedValue(undefined);
  });

  it("rejects an unsuccessful plan_versions INSERT before overwriting plans", () => {
    const archiveStart = source.indexOf("const archive = useCallback(");
    const nextSection = source.indexOf("OPTION 1 — Patch déterministe", archiveStart);
    expect(archiveStart).toBeGreaterThanOrEqual(0);
    expect(nextSection).toBeGreaterThan(archiveStart);
    const archiveBody = source.slice(archiveStart, nextSection);
    expect(archiveBody).toContain('const { error } = await supabase.from("plan_versions").insert([');
    expect(archiveBody).toContain("if (error) throw error;");
  });

  it("archives before persisting both adaptation modes", () => {
    const calls = source.split("\n")
      .filter((line) => line.includes("await archive(") || line.includes("await persistPlan("))
      .map((line) => line.trim().split("(")[0]);
    expect(calls).toEqual([
      "await archive", "await persistPlan",
      "await archive", "await persistPlan",
    ]);
  });

  it("does not overwrite the current plan or journal a patch when archive INSERT returns an error", async () => {
    const original = {
      title: "QA non-prescriptive", totalWeeks: 1, phases: [],
      weeks: [{ weekNumber: 1, sessions: [{ durationMin: 40 }] }],
    };
    const modified = {
      ...original,
      weeks: [{ weekNumber: 1, sessions: [{ durationMin: 45 }] }],
    };
    mocks.patch.mockReturnValue({
      plan: modified,
      diff: [{ weekNumber: 1, description: "QA change only" }],
      warnings: [],
    });
    mocks.archiveInsert.mockResolvedValue({ data: null, error: { code: "42501", message: "synthetic RLS refusal" } });
    mocks.planUpsert.mockResolvedValue({ data: null, error: null });

    const hook = renderHook(() => usePlanAdaptation());
    let result: unknown = undefined;
    await act(async () => {
      result = await hook.result.current.applyPatch({
        athleteId: "synthetic-athlete",
        coachId: "synthetic-coach",
        currentPlan: original as unknown as ApplyPatchArgs["currentPlan"],
        triggeredBy: "manual" as ApplyPatchArgs["triggeredBy"],
        kind: "deload",
        options: {} as ApplyPatchArgs["options"],
        planConfig: { objective: "70.3" } as unknown as ApplyPatchArgs["planConfig"],
      });
    });

    expect(result).toBeNull();
    expect(mocks.archiveInsert).toHaveBeenCalledOnce();
    expect(mocks.archiveInsert.mock.calls[0][0][0].plan_json).toEqual(original);
    expect(mocks.planUpsert).not.toHaveBeenCalled();
    expect(mocks.journal).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Échec de l'adaptation du plan");
    expect(hook.result.current.isApplying).toBe(false);
    hook.unmount();
  });

  it("persists and journals the changed plan only after successful archive", async () => {
    const order: string[] = [];
    const original = {
      title: "QA non-prescriptive", totalWeeks: 1, phases: [],
      weeks: [{ weekNumber: 1, sessions: [{ durationMin: 40 }] }],
    };
    const modified = {
      ...original,
      weeks: [{ weekNumber: 1, sessions: [{ durationMin: 45 }] }],
    };
    mocks.patch.mockReturnValue({ plan: modified, diff: [{ weekNumber: 1 }], warnings: [] });
    mocks.archiveInsert.mockImplementation(async () => {
      order.push("archive");
      return { data: null, error: null };
    });
    mocks.planUpsert.mockImplementation(async () => {
      order.push("persist");
      return { data: null, error: null };
    });
    mocks.journal.mockImplementation(async () => {
      order.push("journal");
    });

    const hook = renderHook(() => usePlanAdaptation());
    await act(async () => {
      await hook.result.current.applyPatch({
        athleteId: "synthetic-athlete",
        coachId: "synthetic-coach",
        currentPlan: original as unknown as ApplyPatchArgs["currentPlan"],
        triggeredBy: "manual" as ApplyPatchArgs["triggeredBy"],
        kind: "deload",
        options: {} as ApplyPatchArgs["options"],
        planConfig: { objective: "70.3" } as unknown as ApplyPatchArgs["planConfig"],
      });
    });

    expect(order).toEqual(["archive", "persist", "journal"]);
    expect(mocks.planUpsert.mock.calls[0][0][0].plan_json).toEqual(modified);
    expect(mocks.toastSuccess).toHaveBeenCalledOnce();
    hook.unmount();
  });
});
