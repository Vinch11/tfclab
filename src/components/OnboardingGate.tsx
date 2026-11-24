// =============================================
// GATE ONBOARDING - REDIRIGE SI PAS COMPLÉTÉ
// =============================================

import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { SplashScreen } from "@/components/SplashScreen";

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { profile, loading } = useProfile();

  if (loading) {
    return <SplashScreen label="Chargement du profil…" />;
  }

  // If profile exists but onboarding not completed, redirect to onboarding
  // E2E/QA bypass: skip onboarding redirect for Playwright runs. Mirrors
  // AuthGate's `import.meta.env.DEV` gating (statically false in a
  // production build) so this flag can never affect a deployed site.
  const e2eBypass =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined" &&
    window.sessionStorage.getItem("e2e_bypass_auth") === "1";

  if (!e2eBypass && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
