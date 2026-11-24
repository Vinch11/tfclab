// =============================================
// AUTH GATE - Protège les routes
// =============================================

import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/SplashScreen";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen label="Vérification de la session…" />;
  }

  if (!user) {
    // E2E/QA bypass: allow Playwright to reach protected pages (e.g. /debug/plan-qa)
    // without a Supabase session. Activated via `?e2e_bypass=1` in URL or
    // sessionStorage flag `e2e_bypass_auth=1`. Gated on `import.meta.env.DEV`,
    // which Vite statically inlines to `false` in a production build — the
    // whole branch below is dead code there, not just a runtime check, so a
    // query param can never bypass auth on a deployed site. Playwright's
    // webServer always runs `npm run dev` (see playwright.config.ts), so this
    // never breaks E2E.
    if (import.meta.env.DEV && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("e2e_bypass") === "1") {
        try { window.sessionStorage.setItem("e2e_bypass_auth", "1"); } catch { /* ignore */ }
      }
      const bypass =
        (typeof window.sessionStorage !== "undefined" &&
          window.sessionStorage.getItem("e2e_bypass_auth") === "1");
      if (bypass) return <>{children}</>;
    }
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
