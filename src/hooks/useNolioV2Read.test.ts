import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
const { from, invoke } = vi.hoisted(() => ({ from: vi.fn(() => { throw new Error("No DB network allowed"); }), invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from, functions: { invoke } } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "local-user" } }) }));
import { isLocalNolioV2Development, useNolioV2Read } from "./useNolioV2Read";
describe("Nolio v2 browser locality and isolation", () => {
  it("rejects the production Supabase project even in Vite dev mode", () => {
    expect(isLocalNolioV2Development(true, "https://production.supabase.co")).toBe(false);
    expect(isLocalNolioV2Development(false, "http://127.0.0.1:54321")).toBe(false);
    expect(isLocalNolioV2Development(true, "http://127.0.0.1:54321")).toBe(true);
    expect(isLocalNolioV2Development(true, "https://localhost.attacker.test")).toBe(false);
  });
  it("does not touch auth data/functions when local development gate is closed", async () => {
    const { result } = renderHook(() => useNolioV2Read(false));
    await expect(result.current.api.call("read", { action: "status" })).rejects.toThrow("local_development_required");
    expect(from).not.toHaveBeenCalled(); expect(invoke).not.toHaveBeenCalled();
  });
});
