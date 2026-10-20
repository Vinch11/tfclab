import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OnboardingGate } from "../OnboardingGate";

/**
 * Même audit sécurité que AuthGate.test.tsx : OnboardingGate lit le même
 * flag `e2e_bypass_auth` pour sauter la redirection onboarding. Gaté
 * derrière `import.meta.env.DEV` par cohérence défensive, même si en
 * pratique AuthGate (en amont dans ProtectedRoute) bloque déjà l'accès non
 * authentifié avant qu'OnboardingGate ne soit jamais monté en prod.
 */

const mockUseProfile = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useProfile", () => ({
  useProfile: mockUseProfile,
  getCachedLogoUrl: () => null,
}));

function renderGate() {
  return render(
    <MemoryRouter>
      <OnboardingGate>
        <div data-testid="protected">secret</div>
      </OnboardingGate>
    </MemoryRouter>,
  );
}

describe("OnboardingGate — e2e_bypass gating", () => {
  beforeEach(() => {
    cleanup();
    mockUseProfile.mockReset();
    mockUseProfile.mockReturnValue({
      profile: { onboarding_completed: false },
      loading: false,
    });
    try { window.sessionStorage.clear(); } catch { /* ignore */ }
  });

  it("DEV: the e2e bypass flag skips the onboarding redirect", () => {
    window.sessionStorage.setItem("e2e_bypass_auth", "1");
    renderGate();
    expect(screen.getByTestId("protected")).toBeTruthy();
  });

  it("production build (DEV=false): the e2e bypass flag does NOT skip the onboarding redirect", () => {
    window.sessionStorage.setItem("e2e_bypass_auth", "1");
    vi.stubEnv("DEV", false as unknown as string);
    renderGate();
    expect(screen.queryByTestId("protected")).toBeNull();
    vi.unstubAllEnvs();
  });

  it("a completed onboarding always passes through, regardless of DEV", () => {
    mockUseProfile.mockReturnValue({ profile: { onboarding_completed: true }, loading: false });
    vi.stubEnv("DEV", false as unknown as string);
    renderGate();
    expect(screen.getByTestId("protected")).toBeTruthy();
    vi.unstubAllEnvs();
  });
});
