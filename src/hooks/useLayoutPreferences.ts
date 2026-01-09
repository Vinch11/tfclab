/**
 * Hook pour gérer les préférences de disposition des sections
 * Stockage: localStorage + sync cloud (profiles.layout_preferences)
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Définition des sections par onglet
export type TabId = "profil" | "evolution" | "dashboard";

export interface SectionDefinition {
  id: string;
  label: string;
  icon?: string;
  defaultVisible: boolean;
}

// Sections disponibles pour chaque onglet
export const PROFIL_SECTIONS: SectionDefinition[] = [
  { id: "athlete-refs", label: "Références Athlète", icon: "User", defaultVisible: true },
  { id: "athlete-profile", label: "Profil Athlète", icon: "User", defaultVisible: true },
  { id: "dan-lorang", label: "Analyse Dan Lorang", icon: "Brain", defaultVisible: true },
  { id: "evolution-chart", label: "Évolution Snapshots", icon: "TrendingUp", defaultVisible: true },
  { id: "training-zones", label: "Zones d'entraînement", icon: "Target", defaultVisible: true },
];

export const DASHBOARD_SECTIONS: SectionDefinition[] = [
  { id: "athlete-refs", label: "Références Athlète", icon: "User", defaultVisible: true },
  { id: "charge-recente", label: "Charge Récente (CRR)", icon: "Activity", defaultVisible: true },
  { id: "compass", label: "Metabolic Performance Compass", icon: "Compass", defaultVisible: true },
  { id: "scientific-charts", label: "Graphiques Scientifiques", icon: "BarChart", defaultVisible: true },
  { id: "staff-dashboard", label: "Dashboard Staff", icon: "Briefcase", defaultVisible: true },
];

export const EVOLUTION_SECTIONS: SectionDefinition[] = [
  { id: "historical-chart", label: "Graphique Historique", icon: "LineChart", defaultVisible: true },
  { id: "scientific-dashboard", label: "Dashboard Scientifique", icon: "BarChart", defaultVisible: true },
  { id: "sport-analysis", label: "Analyse par Sport", icon: "Activity", defaultVisible: true },
];

export const ALL_SECTIONS: Record<TabId, SectionDefinition[]> = {
  profil: PROFIL_SECTIONS,
  evolution: EVOLUTION_SECTIONS,
  dashboard: DASHBOARD_SECTIONS,
};

export interface LayoutPreferences {
  profil?: string[];
  evolution?: string[];
  dashboard?: string[];
}

interface UseLayoutPreferencesReturn {
  getSectionOrder: (tabId: TabId) => string[];
  setSectionOrder: (tabId: TabId, order: string[]) => Promise<void>;
  resetToDefault: (tabId: TabId) => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = "vlab-layout-preferences";

export function useLayoutPreferences(): UseLayoutPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<LayoutPreferences>({});
  const [loading, setLoading] = useState(true);

  // Charger depuis localStorage au démarrage
  useEffect(() => {
    const loadLocal = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPreferences(JSON.parse(stored));
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
          const cloudPrefs = data.layout_preferences as LayoutPreferences;
          setPreferences(prev => ({ ...prev, ...cloudPrefs }));
          // Mettre à jour le localStorage aussi
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...preferences, ...cloudPrefs }));
        }
      } catch {
        // Fallback sur localStorage uniquement
      }
    };

    syncFromCloud();
  }, [user]);

  const getSectionOrder = useCallback((tabId: TabId): string[] => {
    const customOrder = preferences[tabId];
    const defaultSections = ALL_SECTIONS[tabId];
    
    if (customOrder && customOrder.length > 0) {
      // Ajouter les sections qui pourraient être nouvelles (pas dans l'ordre sauvegardé)
      const allIds = defaultSections.map(s => s.id);
      const missingIds = allIds.filter(id => !customOrder.includes(id));
      return [...customOrder.filter(id => allIds.includes(id)), ...missingIds];
    }
    
    return defaultSections.map(s => s.id);
  }, [preferences]);

  const setSectionOrder = useCallback(async (tabId: TabId, order: string[]) => {
    const newPrefs = { ...preferences, [tabId]: order };
    setPreferences(newPrefs);
    
    // Sauvegarder en localStorage immédiatement
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    // Sync cloud si connecté
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ layout_preferences: newPrefs })
          .eq("user_id", user.id);
      } catch {
        // Echec silencieux, localStorage reste la source de vérité
      }
    }
  }, [preferences, user]);

  const resetToDefault = useCallback(async (tabId: TabId) => {
    const newPrefs = { ...preferences };
    delete newPrefs[tabId];
    setPreferences(newPrefs);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ layout_preferences: newPrefs })
          .eq("user_id", user.id);
      } catch {
        // Echec silencieux
      }
    }
  }, [preferences, user]);

  return {
    getSectionOrder,
    setSectionOrder,
    resetToDefault,
    loading,
  };
}
