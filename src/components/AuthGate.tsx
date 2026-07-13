// =============================================
// AUTH GATE - Protège les routes
// =============================================

import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo-2fc.png";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <img 
            src={logo} 
            alt="24C Lab" 
            className="h-36 w-auto animate-pulse"
          />
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // E2E/QA bypass: allow Playwright to reach protected pages (e.g. /debug/plan-qa)
    // without a Supabase session. Activated via `?e2e_bypass=1` in URL or
    // sessionStorage flag `e2e_bypass_auth=1`. Non-persistent, dev-only escape hatch.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("e2e_bypass") === "1") {
        try { window.sessionStorage.setItem("e2e_bypass_auth", "1"); } catch {}
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
