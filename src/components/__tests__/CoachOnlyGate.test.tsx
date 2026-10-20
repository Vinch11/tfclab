import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CoachOnlyGate } from "../CoachOnlyGate";

const mockProfile = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useProfile", () => ({ useProfile: mockProfile }));

describe("CoachOnlyGate behavior", () => {
  beforeEach(() => {
    cleanup();
    mockProfile.mockReset();
  });

  it("shows a pending state and does not mount coach-only children", () => {
    mockProfile.mockReturnValue({ profile: null, loading: true, error: null });
    render(<CoachOnlyGate><button>Générer un plan payant</button></CoachOnlyGate>);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Générer un plan payant/ })).toBeNull();
  });

  it("denies access to an athlete profile", () => {
    mockProfile.mockReturnValue({ profile: { role: "ATHLETE" }, loading: false, error: null });
    render(<CoachOnlyGate><button>Générer un plan payant</button></CoachOnlyGate>);
    expect(screen.getByRole("alert").textContent).toContain("Accès réservé");
    expect(screen.queryByRole("button", { name: /Générer un plan payant/ })).toBeNull();
  });

  it("fails closed if profile retrieval fails", () => {
    mockProfile.mockReturnValue({ profile: { role: "STAFF_COACH" }, loading: false, error: new Error("network") });
    render(<CoachOnlyGate><button>Générer un plan payant</button></CoachOnlyGate>);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Générer un plan payant/ })).toBeNull();
  });

  it("allows a confirmed staff coach", () => {
    mockProfile.mockReturnValue({ profile: { role: "STAFF_COACH" }, loading: false, error: null });
    render(<CoachOnlyGate><button>Générer un plan payant</button></CoachOnlyGate>);
    expect(screen.getByRole("button", { name: /Générer un plan payant/ })).toBeTruthy();
  });
});
