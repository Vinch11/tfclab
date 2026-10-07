import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Bug réel (retour coach) : "les nouveaux logo que j'importe dans la section
 * configuration n'apparaissent pas partout... il ne change pas sur les pages
 * de chargement". `index.html` (splash statique) avait déjà été corrigé
 * (#317) via un cache localStorage (`tfcl_cached_logo_url`, écrit par
 * useProfile), mais AuthGate et OnboardingGate — les écrans "Chargement..."
 * affichés sur QUASIMENT CHAQUE navigation (ProtectedRoute = AuthGate >
 * OnboardingGate) — importaient encore le logo par défaut en dur, sans
 * jamais consulter ce cache.
 */

const CACHE_KEY = "tfcl_cached_logo_url";
const CUSTOM_LOGO = "data:image/png;base64,CUSTOM_COACH_LOGO";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: true }),
}));

vi.mock("@/hooks/useProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useProfile")>();
  return {
    ...actual,
    useProfile: () => ({
      profile: null,
      loading: true,
      error: null,
      updateRole: vi.fn(),
      completeOnboarding: vi.fn(),
      updateLogo: vi.fn(),
      refetch: vi.fn(),
    }),
  };
});

describe("Écrans de chargement (AuthGate / OnboardingGate) — logo custom du coach", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("AuthGate affiche le logo custom mis en cache plutôt que le logo par défaut", async () => {
    localStorage.setItem(CACHE_KEY, CUSTOM_LOGO);
    const { AuthGate } = await import("../AuthGate");

    render(
      <MemoryRouter>
        <AuthGate>
          <div>children</div>
        </AuthGate>
      </MemoryRouter>
    );

    const img = screen.getByAltText("24C Lab") as HTMLImageElement;
    expect(img.src).toBe(CUSTOM_LOGO);
  });

  it("OnboardingGate affiche le logo custom mis en cache plutôt que le logo par défaut", async () => {
    localStorage.setItem(CACHE_KEY, CUSTOM_LOGO);
    const { OnboardingGate } = await import("../OnboardingGate");

    render(
      <MemoryRouter>
        <OnboardingGate>
          <div>children</div>
        </OnboardingGate>
      </MemoryRouter>
    );

    const img = screen.getByAltText("24C Lab") as HTMLImageElement;
    expect(img.src).toBe(CUSTOM_LOGO);
  });

  it("sans logo en cache, retombe sur le logo par défaut packagé (pas de casse)", async () => {
    const { AuthGate } = await import("../AuthGate");

    render(
      <MemoryRouter>
        <AuthGate>
          <div>children</div>
        </AuthGate>
      </MemoryRouter>
    );

    const img = screen.getByAltText("24C Lab") as HTMLImageElement;
    expect(img.src).not.toBe(CUSTOM_LOGO);
    expect(img.src.length).toBeGreaterThan(0);
  });
});
