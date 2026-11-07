import { describe, it, expect } from "vitest";
import { shouldShowQaRlsAuditLink } from "../QaRlsAuditLink";

const QA = "https://lkjesdacgpolrwfxulbo.supabase.co";

describe("QA RLS audit link visibility", () => {
  it("shows in DEV on QA backend", () => expect(shouldShowQaRlsAuditLink(true, QA)).toBe(true));
  it("hidden outside DEV", () => expect(shouldShowQaRlsAuditLink(false, QA)).toBe(false));
  it("hidden on another backend", () =>
    expect(shouldShowQaRlsAuditLink(true, "https://otherref.supabase.co")).toBe(false));
  it("hidden without backend url", () => expect(shouldShowQaRlsAuditLink(true, undefined)).toBe(false));
});
