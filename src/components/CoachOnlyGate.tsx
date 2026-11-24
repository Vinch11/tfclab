import type { ReactNode } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { useProfile } from "@/hooks/useProfile";

/**
 * Fail-closed UI access gate for sensitive coach QA tooling.
 * Uses the server-fetched profiles.role (STAFF_COACH); never trusts a
 * localStorage role or the client-selectable onboarding label.
 * This is UI protection, NOT a substitute for Supabase RLS/edge auth.
 */
export function CoachOnlyGate({ children }: { children: ReactNode }) {
  const { profile, loading, error } = useProfile();
  if (loading) {
    return <SplashScreen label="Vérification des droits coach…" />;
  }
  if (error || profile?.role !== "STAFF_COACH") {
    return (
      <main className="container mx-auto max-w-xl p-8" role="alert">
        <h1 className="text-lg font-semibold">Accès réservé aux coachs TFCLab</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette console de qualification et ses générations IA sont réservées aux comptes coach autorisés.
          Contactez l'équipe TFCLab si votre accès doit être activé.
        </p>
      </main>
    );
  }
  return <>{children}</>;
}
