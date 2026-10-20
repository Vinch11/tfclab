import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthGate } from "../AuthGate";

/**
 * Audit sécurité (coach, oct. 2026) : `?e2e_bypass=1` levait le redirect
 * d'AuthGate pour TOUT visiteur non authentifié, dans N'IMPORTE QUEL build —
 * y compris un build de production déployé, où ce paramètre d'URL devenait
 * un contournement total de l'authentification, sans aucun secret requis.
 * Le correctif gate ce chemin derrière `import.meta.env.DEV` (statiquement
 * `false` dans un build de prod Vite) ; ces tests fixent le contrat :
 * le bypass fonctionne en dev/E2E (obligatoire pour Playwright, qui lance
 * toujours `npm run dev`, jamais un build) et jamais quand DEV est faux.
 */

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthContext", () => ({ useAuth: mockUseAuth }));

function setUrl(path: string) {
  window.history.pushState({}, "", path);
}

function renderGate() {
  return render(
    <MemoryRouter>
      <AuthGate>
        <div data-testid="protected">secret</div>
      </AuthGate>
    </MemoryRouter>,
  );
}

describe("AuthGate — e2e_bypass gating", () => {
  beforeEach(() => {
    cleanup();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    try { window.sessionStorage.clear(); } catch { /* ignore */ }
    setUrl("/debug/plan-qa");
  });

  it("DEV (dev server / Playwright env): ?e2e_bypass=1 lets an unauthenticated user through", () => {
    setUrl("/debug/plan-qa?e2e_bypass=1");
    renderGate();
    expect(screen.getByTestId("protected")).toBeTruthy();
    expect(window.sessionStorage.getItem("e2e_bypass_auth")).toBe("1");
  });

  it("DEV: a pre-existing sessionStorage flag alone also bypasses, without the query param", () => {
    window.sessionStorage.setItem("e2e_bypass_auth", "1");
    setUrl("/debug/plan-qa");
    renderGate();
    expect(screen.getByTestId("protected")).toBeTruthy();
  });

  it("production build (DEV=false): ?e2e_bypass=1 does NOT bypass auth", () => {
    vi.stubEnv("DEV", false as unknown as string);
    setUrl("/debug/plan-qa?e2e_bypass=1");
    renderGate();
    expect(screen.queryByTestId("protected")).toBeNull();
    vi.unstubAllEnvs();
  });

  it("production build (DEV=false): a pre-existing sessionStorage flag does NOT bypass auth either", () => {
    window.sessionStorage.setItem("e2e_bypass_auth", "1");
    vi.stubEnv("DEV", false as unknown as string);
    setUrl("/debug/plan-qa");
    renderGate();
    expect(screen.queryByTestId("protected")).toBeNull();
    vi.unstubAllEnvs();
  });

  it("an authenticated user always passes through, regardless of DEV", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" }, loading: false });
    vi.stubEnv("DEV", false as unknown as string);
    setUrl("/debug/plan-qa");
    renderGate();
    expect(screen.getByTestId("protected")).toBeTruthy();
    vi.unstubAllEnvs();
  });

  it("shows a loading state while auth status is unresolved (no bypass check yet)", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    setUrl("/debug/plan-qa?e2e_bypass=1");
    renderGate();
    expect(screen.queryByTestId("protected")).toBeNull();
  });
});
