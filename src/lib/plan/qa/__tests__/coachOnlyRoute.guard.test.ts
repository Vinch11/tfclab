import { describe, expect, it } from "vitest";
import app from "../../../../App.tsx?raw";
import gate from "../../../../components/CoachOnlyGate.tsx?raw";

describe("plan QA coach-only route guard", () => {
  it("wraps the sensitive plan QA page in the staff gate", () => {
    expect(app).toMatch(/path="\/debug\/plan-qa"[^\n]*<ProtectedRoute><CoachOnlyGate><PlanQAPage\s*\/><\/CoachOnlyGate><\/ProtectedRoute>/);
  });
  it("requires a server-fetched STAFF_COACH profile and fails closed", () => {
    expect(gate).toContain("useProfile()");
    expect(gate).toContain('profile?.role !== "STAFF_COACH"');
    expect(gate).toContain("if (error ||");
    expect(gate).not.toContain("localStorage");
    expect(gate).not.toContain("sessionStorage");
  });
});
