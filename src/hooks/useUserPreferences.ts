/**
 * Hook pour gérer les préférences utilisateur générales
 * Stockage: localStorage + sync cloud (profiles.layout_preferences)
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface UserPreferences {
  potentielPhysiologiqueCompactMode?: boolean;
  // Autres préférences futures peuvent être ajoutées ici
}

interface UseUserPreferencesReturn {
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = "vlab-user-preferences";

const DEFAULT_PREFERENCES: UserPreferences = {
  potentielPhysiologiqueCompactMode: true, // Compact par défaut
};

export function useUserPreferences(): UseUserPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  // Charger depuis localStorage au démarrage
  useEffect(() => {
    const loadLocal = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      } catch {
        // Ignore parse errors
      }
      setLoading(false);
    };

    loadLocal();
  }, []);

  // Synchro cloud si connecté
  useEffect(() => {
    const syncFromCloud = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("layout_preferences")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data?.layout_preferences) {
          const cloudPrefs = data.layout_preferences as Record<string, unknown>;
          // Extraire les préférences utilisateur du champ layout_preferences
          if (cloudPrefs.userPreferences) {
            const userPrefs = cloudPrefs.userPreferences as UserPreferences;
            setPreferences(prev => ({ ...prev, ...userPrefs }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...preferences, ...userPrefs }));
          }
        }
      } catch {
        // Fallback sur localStorage uniquement
      }
    };

    syncFromCloud();
  }, [user]);

  const setPreference = useCallback(async <K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user) {
      try {
        // Récupérer les préférences existantes
        const { data } = await supabase
          .from("profiles")
          .select("layout_preferences")
          .eq("user_id", user.id)
          .maybeSingle();

        const existingPrefs = (data?.layout_preferences as Record<string, unknown>) || {};
        const updatedPrefs = {
          ...existingPrefs,
          userPreferences: newPrefs
        };

        await supabase
          .from("profiles")
          .update({ layout_preferences: updatedPrefs })
          .eq("user_id", user.id);
      } catch {
        // Echec silencieux
      }
    }
  }, [preferences, user]);

  return {
    preferences,
    setPreference,
    loading,
  };
}
