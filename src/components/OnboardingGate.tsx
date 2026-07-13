// =============================================
// GATE ONBOARDING - REDIRIGE SI PAS COMPLÉTÉ
// =============================================

import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo-2fc.png";

interface OnboardingGateProps {
  children: ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <img src={logo} alt="24C Lab" className="h-36 w-auto animate-pulse" />
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  // If profile exists but onboarding not completed, redirect to onboarding
  // E2E/QA bypass: skip onboarding redirect for Playwright runs.
  const e2eBypass =
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined" &&
    window.sessionStorage.getItem("e2e_bypass_auth") === "1";

  if (!e2eBypass && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
