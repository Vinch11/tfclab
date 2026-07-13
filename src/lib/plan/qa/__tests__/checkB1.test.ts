import { describe, it, expect } from "vitest";
import { checkB1 } from "../checks";
import type { PlanGenerationStat } from "@/lib/plan/planGenerationStats";

const baseJsonOk: PlanGenerationStat = {
  ts: Date.now(),
  format: "json",
  objective: "SEMI",
  totalWeeks: 8,
  totalChunks: 2,
  durationMs: 45000,
  ok: true,
};

describe("checkB1 — plan issu du chemin JSON validé Zod", () => {
  it("PASS quand format=json + ok=true + parsedPresent=true", () => {
    const r = checkB1({ stat: baseJsonOk, parsedPresent: true });
    expect(r.pass).toBe(true);
    expect(r.details.join(" ")).toMatch(/JSON validée/i);
  });

  it("FAIL si fallback markdown", () => {
    const r = checkB1({
      stat: { ...baseJsonOk, format: "markdown-fallback-from-json", ok: false, errorCode: "SCHEMA_FAIL" },
      parsedPresent: true,
    });
    expect(r.pass).toBe(false);
    expect(r.details.join(" ")).toMatch(/Fallback Markdown/);
  });

  it("FAIL si stat absente", () => {
    const r = checkB1({ stat: undefined, parsedPresent: true });
    expect(r.pass).toBe(false);
  });

  it("FAIL si stat=markdown direct", () => {
    const r = checkB1({ stat: { ...baseJsonOk, format: "markdown" }, parsedPresent: true });
    expect(r.pass).toBe(false);
  });

  it("FAIL si json ok mais parsedPresent=false", () => {
    const r = checkB1({ stat: baseJsonOk, parsedPresent: false });
    expect(r.pass).toBe(false);
    expect(r.details.join(" ")).toMatch(/parsedPlan absent/);
  });

  it("PASS + warning quand un chunk a nécessité retry (attempt=2)", () => {
    const r = checkB1({
      stat: {
        ...baseJsonOk,
        schemaFailDetails: { attempts: [{ attempt: 1 }, { attempt: 2 }] },
      },
      parsedPresent: true,
    });
    expect(r.pass).toBe(true);
    expect(r.details.join(" ")).toMatch(/Retry Zod/);
  });
});
