import { expect, it } from "vitest";
import {
  coachProfileStorageKey,
  readCommittedLimiterPolicy,
  writeCommittedLimiterPolicy,
} from "../coachLimiterPolicyStorage";
const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
};
it("only explicit commitments restore policy, scoped by the existing coach profile and objective", () => {
  const s = storage(), key = coachProfileStorageKey("Synthetic A");
  s.setItem(
    key,
    JSON.stringify({
      primary: "glycolytic",
      limiterOrder: ["VLamax"],
      excludedLimiterMetrics: ["FatMax"],
    }),
  );
  expect(readCommittedLimiterPolicy(s, "Synthetic A", "10K")).toBeNull();
  const p = {
    limiterOrder: ["VMA", "VLamax"],
    excludedLimiterMetrics: ["FatMax"],
  };
  expect(writeCommittedLimiterPolicy(s, "Synthetic A", "10K", p)).toBe(true);
  expect(readCommittedLimiterPolicy(s, "Synthetic A", "10 KM")).toEqual(p);
  expect(readCommittedLimiterPolicy(s, "Synthetic B", "10K")).toBeNull();
  expect(readCommittedLimiterPolicy(s, "Synthetic A", "703")).toBeNull();
  expect(JSON.parse(s.getItem(key)!).primary).toBe("glycolytic");
});
it("corrupt or old preferences never invent exclusions; a storage failure is observable", () => {
  const s = storage();
  s.setItem(coachProfileStorageKey("A"), "invalid json");
  expect(readCommittedLimiterPolicy(s, "A", "10K")).toBeNull();
  expect(
    writeCommittedLimiterPolicy(s, "A", "10K", {
      limiterOrder: ["VLamax"],
      excludedLimiterMetrics: [],
    }),
  ).toBe(false);
});
it("reopening a committed policy preserves explicit safety prohibitions and strength choices without guessing absent fields", () => {
  const s = storage();
  const policy = {
    limiterOrder: ["VLamax", "VMA"],
    excludedLimiterMetrics: ["FatMax"],
    prohibitions: ["sprints" as const],
    s2rStrength: "none" as const,
    sessionsPerWeek: 3,
  };
  expect(writeCommittedLimiterPolicy(s, "stable-id", "10K", policy)).toBe(true);
  expect(readCommittedLimiterPolicy(s, "stable-id", "10K")).toEqual(policy);
  expect(readCommittedLimiterPolicy(s, "other-stable-id", "10K")).toBeNull();
});
