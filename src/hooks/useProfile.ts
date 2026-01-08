// =============================================
// HOOK GESTION PROFIL UTILISATEUR
// =============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserProfile, UserRole } from "@/types/profile";

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  updateRole: (role: UserRole) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If no profile exists, create one
      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile as UserProfile);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateRole = async (role: UserRole) => {
    if (!user || !profile) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("user_id", user.id);

    if (updateError) throw updateError;
    setProfile((prev) => (prev ? { ...prev, role } : null));
  };

  const completeOnboarding = async () => {
    if (!user || !profile) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", user.id);

    if (updateError) throw updateError;
    setProfile((prev) => (prev ? { ...prev, onboarding_completed: true } : null));
  };

  return {
    profile,
    loading,
    error,
    updateRole,
    completeOnboarding,
    refetch: fetchProfile,
  };
}
