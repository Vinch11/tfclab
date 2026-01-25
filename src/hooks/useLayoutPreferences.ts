/**
 * Hook pour gérer les préférences de disposition des sections
 * Stockage: localStorage + sync cloud (profiles.layout_preferences)
 * Supporte l'ordre ET la visibilité des sections
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Définition des sections par onglet
export type TabId = "profil" | "dashboard" | "evolution" | "tests" | "seances" | "templates" | "academy" | "race-readiness";

export interface SectionDefinition {
  id: string;
  label: string;
  icon?: string;
  category?: string;
  categoryColor?: string;
  defaultVisible: boolean;
}

// Définition des catégories avec couleurs
export const SECTION_CATEGORIES = {
  onboarding: { label: "🎯 Démarrage", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  profil: { label: "👤 Profil & Ambition", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  metriques: { label: "⚡ Métriques", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  fatigue: { label: "💤 Fatigue & Readiness", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  analyse: { label: "📊 Analyse & Course", color: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  outils: { label: "⚙️ Outils", color: "bg-slate-500/10 text-slate-600 border-slate-500/30" },
} as const;

export type SectionCategory = keyof typeof SECTION_CATEGORIES;

// Configuration d'une section sauvegardée
export interface SectionConfig {
  id: string;
  visible: boolean;
}

// Sections disponibles pour chaque onglet
export const PROFIL_SECTIONS: SectionDefinition[] = [
  { id: "athlete-refs", label: "Références Athlète", icon: "User", defaultVisible: true },
  { id: "athlete-profile", label: "Profil Athlète", icon: "User", defaultVisible: true },
  { id: "two-for-coaching", label: "Analyse Two For Coaching Lab™", icon: "Brain", defaultVisible: true },
  { id: "evolution-chart", label: "Évolution Profils", icon: "TrendingUp", defaultVisible: true },
  { id: "training-zones", label: "Zones d'entraînement", icon: "Target", defaultVisible: true },
];

export const DASHBOARD_SECTIONS: SectionDefinition[] = [
  // 🎯 Onboarding & Guide
  { id: "getting-started", label: "Guide de démarrage", icon: "Rocket", category: "onboarding", defaultVisible: true },
  { id: "data-completion-guide", label: "Complétion des données", icon: "CheckCircle", category: "onboarding", defaultVisible: true },
  
  // 👤 Profil athlète + Ambition
  { id: "athlete-refs", label: "Profil & Références", icon: "User", category: "profil", defaultVisible: false },
  { id: "ambition-progress", label: "Évolution vers les cibles", icon: "TrendingUp", category: "profil", defaultVisible: true },
  
  // 👤 Carte Profil Athlète (juste au-dessus du Compass)
  { id: "athlete-profile-card", label: "Carte Profil Athlète", icon: "UserCircle", category: "profil", defaultVisible: true },
  
  // 📊 Aperçu rapide (grille de mini-jauges)
  { id: "compact-metrics-grid", label: "Aperçu Rapide (Mini-Jauges)", icon: "Activity", category: "metriques", defaultVisible: true },
  
  // ⚡ Métriques VLamax/TTE
  { id: "compass", label: "Metabolic Compass", icon: "Compass", category: "metriques", defaultVisible: true },
  { id: "vlamax-bike-v2-enhanced", label: "VLamax Vélo — Analyse Détaillée", icon: "Zap", category: "metriques", defaultVisible: true },
  { id: "ftp-targets", label: "FTP/kg — zones cibles", icon: "Target", category: "metriques", defaultVisible: true },
  { id: "vlamax-v2-calibration", label: "VLamax TFCL V2 (compact)", icon: "Zap", category: "metriques", defaultVisible: false },
  
  // 💤 Fatigue + Readiness
  { id: "disponibilite-tfcl", label: "Disponibilité TFCL™", icon: "Target", category: "fatigue", defaultVisible: true },
  { id: "daily-readiness-check", label: "TFCL Daily Readiness", icon: "ClipboardCheck", category: "fatigue", defaultVisible: true },
  { id: "quick-fatigue", label: "Fatigue (saisie rapide)", icon: "Zap", category: "fatigue", defaultVisible: true },
  { id: "charge-recente", label: "Charge Récente", icon: "Activity", category: "fatigue", defaultVisible: true },
  
  // 📊 Analyse & Course
  { id: "race-readiness-v2", label: "Race Readiness V2", icon: "Trophy", category: "analyse", defaultVisible: true },
  { id: "running-economy-summary", label: "Économie de course", icon: "Footprints", category: "analyse", defaultVisible: true },
  { id: "fatmax-tfcl", label: "FatMax TFCL™", icon: "Flame", category: "analyse", defaultVisible: true },
  { id: "fatmax-chart", label: "FatMax vs Race Intensity", icon: "BarChart", category: "analyse", defaultVisible: true },
  { id: "dashboard-recommendations", label: "Recommandations", icon: "Sparkles", category: "analyse", defaultVisible: true },
  
  // ⚙️ Outils
  { id: "action-buttons", label: "Boutons d'action", icon: "Settings", category: "outils", defaultVisible: true },
  { id: "low-crr-justification", label: "Justification charge faible", icon: "AlertTriangle", category: "outils", defaultVisible: false },
  { id: "scientific-charts", label: "Graphiques Scientifiques", icon: "BarChart", category: "outils", defaultVisible: false },
  { id: "staff-dashboard", label: "Staff Dashboard", icon: "Users", category: "outils", defaultVisible: false },
  
  // 🔬 INSCYD-style Simulator
  { id: "what-if-simulator", label: "Simulateur What-If", icon: "Beaker", category: "analyse", defaultVisible: true },
  { id: "lactate-prediction", label: "Courbe de Lactate", icon: "TrendingUp", category: "analyse", defaultVisible: true },
  { id: "carb-burn-rate", label: "Carb Burn Rate", icon: "Flame", category: "analyse", defaultVisible: true },
  { id: "metabolic-power-curve", label: "Metabolic Power Curve", icon: "Zap", category: "analyse", defaultVisible: true },
];

export const TESTS_SECTIONS: SectionDefinition[] = [
  { id: "vlamax-testing", label: "Tests VLamax", icon: "Zap", defaultVisible: true },
  { id: "cap-testing", label: "Tests CAP", icon: "Footprints", defaultVisible: true },
  { id: "tfcl-testing", label: "Semaine TFCL", icon: "Calendar", defaultVisible: true },
];

export const SEANCES_SECTIONS: SectionDefinition[] = [
  { id: "workout-library", label: "Bibliothèque Séances", icon: "Dumbbell", defaultVisible: true },
  { id: "wahoo-library", label: "Séances Wahoo", icon: "Activity", defaultVisible: true },
];

export const TEMPLATES_SECTIONS: SectionDefinition[] = [
  { id: "week-selector", label: "Sélecteur de Semaines", icon: "Calendar", defaultVisible: true },
  { id: "template-viewer", label: "Visualiseur Templates", icon: "FileText", defaultVisible: true },
];

export const ACADEMY_SECTIONS: SectionDefinition[] = [
  { id: "theory-content", label: "Contenu Théorique", icon: "BookOpen", defaultVisible: true },
  { id: "protocols", label: "Protocoles", icon: "FlaskConical", defaultVisible: true },
];

export const RACE_READINESS_SECTIONS: SectionDefinition[] = [
  { id: "readiness-card", label: "Score Race Readiness", icon: "Trophy", defaultVisible: true },
  { id: "nutrition-timing", label: "Nutrition & Timing", icon: "Utensils", defaultVisible: true },
  { id: "running-economy", label: "Économie de Course", icon: "Footprints", defaultVisible: true },
  { id: "staff-report", label: "Rapport Staff", icon: "FileText", defaultVisible: true },
];

export const EVOLUTION_SECTIONS: SectionDefinition[] = [
  { id: "historical-chart", label: "Graphique Historique", icon: "LineChart", defaultVisible: true },
  { id: "scientific-dashboard", label: "Dashboard Scientifique", icon: "BarChart", defaultVisible: true },
  { id: "sport-analysis", label: "Analyse par Sport", icon: "Activity", defaultVisible: true },
];

export const ALL_SECTIONS: Record<TabId, SectionDefinition[]> = {
  profil: PROFIL_SECTIONS,
  dashboard: DASHBOARD_SECTIONS,
  evolution: EVOLUTION_SECTIONS,
  tests: TESTS_SECTIONS,
  seances: SEANCES_SECTIONS,
  templates: TEMPLATES_SECTIONS,
  academy: ACADEMY_SECTIONS,
  "race-readiness": RACE_READINESS_SECTIONS,
};

// Format de stockage amélioré avec visibilité
export interface LayoutPreferences {
  profil?: SectionConfig[];
  evolution?: SectionConfig[];
  dashboard?: SectionConfig[];
}

// Format legacy (juste les IDs) pour migration
type LegacyLayoutPreferences = {
  profil?: string[];
  evolution?: string[];
  dashboard?: string[];
};

interface UseLayoutPreferencesReturn {
  getSectionOrder: (tabId: TabId) => string[];
  getVisibleSections: (tabId: TabId) => string[];
  getSectionConfigs: (tabId: TabId) => SectionConfig[];
  setSectionConfigs: (tabId: TabId, configs: SectionConfig[]) => Promise<void>;
  toggleSectionVisibility: (tabId: TabId, sectionId: string) => Promise<void>;
  setSectionOrder: (tabId: TabId, order: string[]) => Promise<void>;
  resetToDefault: (tabId: TabId) => Promise<void>;
  loading: boolean;
}

const STORAGE_KEY = "vlab-layout-preferences";

// Migrer les anciennes préférences (string[]) vers le nouveau format (SectionConfig[])
function migratePreferences(prefs: LayoutPreferences | LegacyLayoutPreferences, tabId: TabId): SectionConfig[] | undefined {
  const tabPrefs = prefs[tabId];
  if (!tabPrefs || tabPrefs.length === 0) return undefined;
  
  // Vérifier si c'est le nouveau format
  if (typeof tabPrefs[0] === 'object' && 'id' in tabPrefs[0]) {
    return tabPrefs as SectionConfig[];
  }
  
  // Migrer depuis l'ancien format (string[])
  const defaults = ALL_SECTIONS[tabId];
  return (tabPrefs as string[]).map(id => ({
    id,
    visible: defaults.find(d => d.id === id)?.defaultVisible ?? true
  }));
}

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
          const parsed = JSON.parse(stored);
          // Migrer si nécessaire
          const migrated: LayoutPreferences = {};
          for (const tabId of ['profil', 'evolution', 'dashboard'] as TabId[]) {
            const tabConfigs = migratePreferences(parsed, tabId);
            if (tabConfigs) {
              migrated[tabId] = tabConfigs;
            }
          }
          setPreferences(migrated);
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
          const cloudPrefs = data.layout_preferences as LayoutPreferences | LegacyLayoutPreferences;
          // Migrer si nécessaire
          const migrated: LayoutPreferences = {};
          for (const tabId of ['profil', 'evolution', 'dashboard'] as TabId[]) {
            const tabConfigs = migratePreferences(cloudPrefs, tabId);
            if (tabConfigs) {
              migrated[tabId] = tabConfigs;
            }
          }
          setPreferences(prev => ({ ...prev, ...migrated }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...preferences, ...migrated }));
        }
      } catch {
        // Fallback sur localStorage uniquement
      }
    };

    syncFromCloud();
  }, [user]);

  // Obtenir les configs de section pour un onglet
  const getSectionConfigs = useCallback((tabId: TabId): SectionConfig[] => {
    const savedConfigs = preferences[tabId];
    const defaultSections = ALL_SECTIONS[tabId];
    
    if (savedConfigs && savedConfigs.length > 0) {
      // Ajouter les nouvelles sections qui n'existent pas dans les préférences sauvegardées
      const savedIds = new Set(savedConfigs.map(c => c.id));
      const missingConfigs = defaultSections
        .filter(s => !savedIds.has(s.id))
        .map(s => ({ id: s.id, visible: s.defaultVisible }));
      
      // Filtrer les sections supprimées et ajouter les nouvelles à la fin
      const validConfigs = savedConfigs.filter(c => 
        defaultSections.some(s => s.id === c.id)
      );
      
      return [...validConfigs, ...missingConfigs];
    }
    
    // Retourner les défauts
    return defaultSections.map(s => ({ id: s.id, visible: s.defaultVisible }));
  }, [preferences]);

  // Obtenir l'ordre des sections (tous les IDs)
  const getSectionOrder = useCallback((tabId: TabId): string[] => {
    return getSectionConfigs(tabId).map(c => c.id);
  }, [getSectionConfigs]);

  // Obtenir uniquement les sections visibles
  const getVisibleSections = useCallback((tabId: TabId): string[] => {
    return getSectionConfigs(tabId)
      .filter(c => c.visible)
      .map(c => c.id);
  }, [getSectionConfigs]);

  // Sauvegarder les configs
  const setSectionConfigs = useCallback(async (tabId: TabId, configs: SectionConfig[]) => {
    const newPrefs = { ...preferences, [tabId]: configs };
    setPreferences(newPrefs);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user) {
      try {
        // Convertir en format JSON compatible avec Supabase
        const jsonPrefs = JSON.parse(JSON.stringify(newPrefs));
        await supabase
          .from("profiles")
          .update({ layout_preferences: jsonPrefs })
          .eq("user_id", user.id);
      } catch {
        // Echec silencieux
      }
    }
  }, [preferences, user]);

  // Toggle la visibilité d'une section
  const toggleSectionVisibility = useCallback(async (tabId: TabId, sectionId: string) => {
    const configs = getSectionConfigs(tabId);
    const updatedConfigs = configs.map(c => 
      c.id === sectionId ? { ...c, visible: !c.visible } : c
    );
    await setSectionConfigs(tabId, updatedConfigs);
  }, [getSectionConfigs, setSectionConfigs]);

  // Mettre à jour l'ordre (préserve la visibilité)
  const setSectionOrder = useCallback(async (tabId: TabId, order: string[]) => {
    const currentConfigs = getSectionConfigs(tabId);
    const configMap = new Map(currentConfigs.map(c => [c.id, c]));
    
    const newConfigs = order.map(id => configMap.get(id) || { id, visible: true });
    await setSectionConfigs(tabId, newConfigs);
  }, [getSectionConfigs, setSectionConfigs]);

  const resetToDefault = useCallback(async (tabId: TabId) => {
    const newPrefs = { ...preferences };
    delete newPrefs[tabId];
    setPreferences(newPrefs);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user) {
      try {
        // Convertir en format JSON compatible avec Supabase
        const jsonPrefs = JSON.parse(JSON.stringify(newPrefs));
        await supabase
          .from("profiles")
          .update({ layout_preferences: jsonPrefs })
          .eq("user_id", user.id);
      } catch {
        // Echec silencieux
      }
    }
  }, [preferences, user]);

  return {
    getSectionOrder,
    getVisibleSections,
    getSectionConfigs,
    setSectionConfigs,
    toggleSectionVisibility,
    setSectionOrder,
    resetToDefault,
    loading,
  };
}
