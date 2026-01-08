// =============================================
// COMPOSANT PRINCIPAL ONBOARDING
// =============================================

import { useState } from "react";
import { RoleSelector } from "./RoleSelector";
import { OnboardingScreens } from "./OnboardingScreens";
import { useProfile } from "@/hooks/useProfile";
import type { UserRole } from "@/types/profile";

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { profile, updateRole, completeOnboarding } = useProfile();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = async (role: UserRole) => {
    setLoading(true);
    try {
      await updateRole(role);
      setSelectedRole(role);
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    setLoading(true);
    try {
      await completeOnboarding();
      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  // If role not yet selected, show role selector
  if (!selectedRole && (!profile || profile.role === "ATHLETE_LOISIR" && !profile.onboarding_completed)) {
    return <RoleSelector onSelect={handleRoleSelect} loading={loading} />;
  }

  // Show onboarding screens
  const roleToUse = selectedRole || profile?.role || "ATHLETE_LOISIR";
  return (
    <OnboardingScreens
      role={roleToUse}
      onComplete={handleOnboardingComplete}
      loading={loading}
    />
  );
}
