// =============================================
// HOOK GESTION PROFIL UTILISATEUR
// =============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserProfile, UserRole } from "@/types/profile";

// Clé localStorage lue par le script inline de l'écran de chargement
// (index.html) — affiché avant même que React/Supabase ne démarrent, donc
// sans accès au profil. On met en cache le dernier logo connu pour que le
// prochain chargement sur cet appareil montre déjà le bon logo.
const CACHED_LOGO_KEY = "tfcl_cached_logo_url";

function cacheLogoUrl(logoUrl: string | null) {
  try {
    if (logoUrl) localStorage.setItem(CACHED_LOGO_KEY, logoUrl);
    else localStorage.removeItem(CACHED_LOGO_KEY);
  } catch {
    /* ignore (storage indisponible/plein) */
  }
}

/**
 * Dernier logo custom connu sur cet appareil, lu de façon synchrone — pour
 * les écrans affichés AVANT que useProfile() n'ait eu le temps de récupérer
 * le profil (gates d'auth/onboarding, splash). Même cache que index.html.
 */
export function getCachedLogoUrl(): string | null {
  try {
    return localStorage.getItem(CACHED_LOGO_KEY);
  } catch {
    return null;
  }
}

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  updateRole: (role: UserRole) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updateLogo: (logoUrl: string | null) => Promise<void>;
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
        cacheLogoUrl((newProfile as UserProfile).logo_url ?? null);
      } else {
        setProfile(data as UserProfile);
        cacheLogoUrl((data as UserProfile).logo_url ?? null);
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

  const updateLogo = async (logoUrl: string | null) => {
    if (!user || !profile) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ logo_url: logoUrl })
      .eq("user_id", user.id);

    if (updateError) throw updateError;
    setProfile((prev) => (prev ? { ...prev, logo_url: logoUrl } : null));
    cacheLogoUrl(logoUrl);
  };

  return {
    profile,
    loading,
    error,
    updateRole,
    completeOnboarding,
    updateLogo,
    refetch: fetchProfile,
  };
}
