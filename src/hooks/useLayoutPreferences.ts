/**
 * Hook pour gérer les préférences de disposition des sections
 * Stockage: localStorage + sync cloud (profiles.layout_preferences)
 * Supporte l'ordre ET la visibilité des sections
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Définition des sections par onglet
export type TabId = "profil" | "dashboard" | "evolution" | "tests" | "seances" | "templates" | "academy" | "race-readiness" | "running-profile" | "strategie";

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
  collapsedByDefault?: boolean; // Section minimisée par défaut
  movedToTab?: TabId; // Si la section a été déplacée vers un autre onglet
}

// Configuration des sections déplacées (cross-tab)
export interface MovedSectionConfig {
  sectionId: string;
  originalTab: TabId;
  targetTab: TabId;
}

// Sections disponibles pour chaque onglet
export const PROFIL_SECTIONS: SectionDefinition[] = [
  { id: "objective-manager", label: "Objectif & Courses", icon: "Target", category: "profil", defaultVisible: true },
  { id: "athlete-refs", label: "Références Athlète", icon: "User", defaultVisible: true },
  { id: "athlete-profile", label: "Profil Athlète", icon: "User", defaultVisible: true },
  { id: "two-for-coaching", label: "Analyse Two For Coaching Lab™", icon: "Brain", defaultVisible: true },
  { id: "evolution-chart", label: "Évolution Profils", icon: "TrendingUp", defaultVisible: true },
  { id: "training-zones", label: "Zones d'entraînement", icon: "Target", defaultVisible: true },
  { id: "lactate-thresholds-profil", label: "Seuils Lactiques TFCL", icon: "Droplets", category: "metriques", defaultVisible: true },
];

export const DASHBOARD_SECTIONS: SectionDefinition[] = [
  // 🎯 Onboarding & Guide
  { id: "getting-started", label: "Guide de démarrage", icon: "Rocket", category: "onboarding", defaultVisible: true },
  
  // 👤 Profil athlète + Ambition
  // ✅ Phase 1f: Profil & Ambition unifiée
  { id: "profil-ambition-unified", label: "Profil & Ambition (unifiée)", icon: "User", category: "profil", defaultVisible: true },
  { id: "athlete-refs", label: "Profil & Données (legacy)", icon: "User", category: "profil", defaultVisible: false },
  { id: "objective-manager", label: "Objectif & Historique (legacy)", icon: "Target", category: "profil", defaultVisible: false },
  { id: "ambition-progress", label: "Évolution vers les cibles (legacy)", icon: "TrendingUp", category: "profil", defaultVisible: false },
  
  // 👤 Carte Profil Athlète (juste au-dessus du Compass)
  { id: "athlete-profile-card", label: "Carte Profil Athlète", icon: "UserCircle", category: "profil", defaultVisible: true },
  
  // 📊 Aperçu rapide (grille de mini-jauges)
  { id: "compact-metrics-grid", label: "Aperçu Rapide (Mini-Jauges)", icon: "Activity", category: "metriques", defaultVisible: true },
  
  // 🧠 MATRICE DÉCISIONNELLE TFCL — Consolidé Phase 1e UX
  { id: "coach-decision-unified", label: "Centre Décisionnel TFCL™ (unifié)", icon: "Brain", category: "analyse", defaultVisible: true },
  { id: "tfcl-decision-matrix", label: "Décision Coach TFCL™ (legacy)", icon: "Brain", category: "analyse", defaultVisible: false },
  { id: "tfcl-symptom-matrix", label: "Matrice Symptômes TFCL™ (legacy)", icon: "Stethoscope", category: "analyse", defaultVisible: false },
  { id: "lorang-strategy", label: "Lorang Strategy Engine™ (legacy)", icon: "Target", category: "analyse", defaultVisible: false },
  
  // ⚡ Métriques VLamax/TTE (consolidé Phase 1 UX)
  { id: "compass", label: "Metabolic Compass", icon: "Compass", category: "metriques", defaultVisible: true },
  { id: "vlamax-v2-calibration", label: "VLamax TFCL™ (unifiée)", icon: "Zap", category: "metriques", defaultVisible: true },
  { id: "ftp-targets", label: "FTP/kg — zones cibles", icon: "Target", category: "metriques", defaultVisible: true },
  // Sections consolidées — masquées par défaut (intégrées dans la carte unifiée)
  { id: "vlamax-bike-v2-enhanced", label: "VLamax Vélo — Détaillée (legacy)", icon: "Zap", category: "metriques", defaultVisible: false },
  { id: "vlamax-combined", label: "VLamax Comparaison (legacy)", icon: "GitCompare", category: "metriques", defaultVisible: false },
  
  // 💤 Fatigue + Readiness (consolidé Phase 1d UX)
  { id: "fatigue-disponibilite-unified", label: "Fatigue & Disponibilité (unifiée)", icon: "Battery", category: "fatigue", defaultVisible: true },
  { id: "disponibilite-tfcl", label: "Disponibilité TFCL™ (legacy)", icon: "Target", category: "fatigue", defaultVisible: false },
  { id: "daily-readiness-check", label: "TFCL Daily Readiness (legacy)", icon: "ClipboardCheck", category: "fatigue", defaultVisible: false },
  { id: "quick-fatigue", label: "Fatigue (saisie rapide) (legacy)", icon: "Zap", category: "fatigue", defaultVisible: false },
  { id: "charge-recente", label: "Charge Récente (legacy)", icon: "Activity", category: "fatigue", defaultVisible: false },
  
  // 📊 Analyse & Course
  { id: "race-readiness-unified", label: "Race Readiness TFCL™ (unifiée)", icon: "Target", category: "analyse", defaultVisible: true },
  { id: "race-readiness-signature", label: "Race Readiness Signature™ (legacy)", icon: "Target", category: "analyse", defaultVisible: false },
  { id: "race-readiness-v2", label: "Race Readiness V2 (legacy)", icon: "Trophy", category: "analyse", defaultVisible: false },
  { id: "running-economy-summary", label: "Économie de course", icon: "Footprints", category: "analyse", defaultVisible: true },
  { id: "fatmax-tfcl", label: "Zones Métaboliques TFCL™ (unifiée)", icon: "Flame", category: "analyse", defaultVisible: true },
  { id: "fatmax-chart", label: "FatMax vs Race Intensity (legacy)", icon: "BarChart", category: "analyse", defaultVisible: false },
  { id: "dashboard-recommendations", label: "Recommandations", icon: "Sparkles", category: "analyse", defaultVisible: true },
  
  // ⚙️ Outils
  { id: "action-buttons", label: "Boutons d'action", icon: "Settings", category: "outils", defaultVisible: true },
  { id: "low-crr-justification", label: "Justification charge faible", icon: "AlertTriangle", category: "outils", defaultVisible: false },
  { id: "scientific-charts", label: "Graphiques Scientifiques", icon: "BarChart", category: "outils", defaultVisible: false },
  { id: "staff-dashboard", label: "Staff Dashboard", icon: "Users", category: "outils", defaultVisible: false },
  
  // 🔬 INSCYD-style Simulator
  { id: "metabolic-power-curve", label: "Metabolic Power Curve", icon: "Zap", category: "analyse", defaultVisible: true },
  
  // 👤 Comparaison Âge
  { id: "vo2max-age-comparison", label: "Cibles VO₂max — Comparatif âge", icon: "Calendar", category: "profil", defaultVisible: true },
  
  // ✅ Lorang Test Checklist
  { id: "lorang-test-checklist", label: "Checklist Tests Lorang", icon: "ClipboardCheck", category: "analyse", defaultVisible: true },
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

export const STRATEGIE_SECTIONS: SectionDefinition[] = [
  { id: "race-readiness-page", label: "Race Readiness", icon: "Trophy", category: "analyse", defaultVisible: true },
  { id: "nutrition-v2", label: "Nutrition V2", icon: "Utensils", category: "analyse", defaultVisible: true },
  { id: "pacing-envelope", label: "Pacing Envelope", icon: "Target", category: "analyse", defaultVisible: true },
  { id: "synthese-executive", label: "Synthèse Executive", icon: "FileText", category: "analyse", defaultVisible: true },
  { id: "double-boucle-cap", label: "Double Boucle CAP", icon: "GitCompare", category: "analyse", defaultVisible: true },
  { id: "lactate-correspondence", label: "Correspondances Lactiques TFCL", icon: "Droplets", category: "analyse", defaultVisible: true },
  { id: "comprendre-scores", label: "Comprendre mes Scores", icon: "HelpCircle", category: "outils", defaultVisible: true },
  { id: "seances-library", label: "Séances & Bibliothèque", icon: "Dumbbell", category: "outils", defaultVisible: true },
];

export const EVOLUTION_SECTIONS: SectionDefinition[] = [
  { id: "historical-chart", label: "Graphique Historique", icon: "LineChart", defaultVisible: true },
  { id: "scientific-dashboard", label: "Dashboard Scientifique", icon: "BarChart", defaultVisible: true },
  { id: "sport-analysis", label: "Analyse par Sport", icon: "Activity", defaultVisible: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNING PROFILE SECTIONS — Sections spécifiques au profil CAP
// ═══════════════════════════════════════════════════════════════════════════════
export const RUNNING_PROFILE_SECTIONS: SectionDefinition[] = [
  // 🎯 Profil VLamax CAP
  { id: "vlamax-cap-card", label: "VLamax CAP", icon: "Zap", category: "metriques", defaultVisible: true },
  { id: "vlamax-cap-explained", label: "VLamax CAP Expliquée", icon: "BookOpen", category: "metriques", defaultVisible: true },
  { id: "calibration-summary", label: "Calibration Continue", icon: "Brain", category: "metriques", defaultVisible: true },
  
  // ⚡ Économie & Performance
  { id: "running-economy-module", label: "Économie de Course", icon: "Activity", category: "analyse", defaultVisible: true },
  { id: "running-economy-summary", label: "Synthèse Économie", icon: "TrendingUp", category: "analyse", defaultVisible: true },
  
  // 🛡️ Risque & Readiness
  { id: "injury-risk-cap", label: "Risque Blessure CAP", icon: "Shield", category: "fatigue", defaultVisible: true },
  { id: "availability-form", label: "Disponibilité du Jour", icon: "ClipboardCheck", category: "fatigue", defaultVisible: true },
  { id: "race-readiness-run", label: "Race Readiness CAP", icon: "Trophy", category: "fatigue", defaultVisible: true },
  
  // 📊 Pacing & Métriques
  { id: "pacing-envelope-run", label: "Enveloppe Pacing", icon: "Target", category: "analyse", defaultVisible: true },
  { id: "key-metrics-run", label: "Métriques Clés Running", icon: "BarChart", category: "metriques", defaultVisible: true },
  
  // 🔗 Liens rapides
  { id: "quick-links", label: "Liens Rapides", icon: "Link", category: "outils", defaultVisible: true },
];

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING FOCUS MODE FILTER — Sections à masquer en mode CAP/Trail
 * 
 * Ces sections sont automatiquement masquées lorsque l'objectif est running-only
 * (5K, 10K, Semi, Marathon, Trail, TrailShort, TrailMountain, TrailUltra)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Sections spécifiques vélo/triathlon — masquées en Running Focus Mode
export const CYCLING_TRIATHLON_SECTIONS: string[] = [
  // Vélo spécifiques
  "ftp-targets",                    // FTP/kg — zones cibles vélo
  "vlamax-bike-v2-enhanced",        // VLamax Vélo — Analyse Détaillée
  "vlamax-v2-calibration",          // VLamax TFCL V2 compact vélo
  "low-crr-justification",          // Justification charge faible (TSS vélo)
  "fatmax-chart",                   // FatMax vs Race Intensity (vélo focus)
  "metabolic-power-curve",          // Metabolic Power Curve (vélo)
  
  // Triathlon spécifiques
  "vlamax-combined",                // VLamax Vélo/CAP (comparaison tri)
  
  // Scénarios vélo-centriques
  "scenarios-tte-vlamax",           // Scénarios TTE/VLamax (vélo-centric)
];

// Sections visibles UNIQUEMENT en Running Focus Mode
export const RUNNING_ONLY_SECTIONS: string[] = [
  "vlamax-cap-card",                // VLamax CAP Card
  "running-economy-module",         // Running Economy Module
];

// Sections universelles (toujours visibles)
export const UNIVERSAL_SECTIONS: string[] = [
  "getting-started",
  "athlete-refs",
  "objective-manager",
  "ambition-progress",
  "athlete-profile-card",
  "profil-ambition-unified",
  "compact-metrics-grid",
  "tfcl-decision-matrix",
  "tfcl-symptom-matrix",
  "lorang-strategy",
  "coach-decision-unified",
  "tfcl-symptom-matrix",
  "lorang-strategy",
  "compass",
  "fatigue-disponibilite-unified",
  "disponibilite-tfcl",
  "daily-readiness-check",
  "quick-fatigue",
  "charge-recente",
  "race-readiness-unified",
  "race-readiness-signature",
  "race-readiness-v2",
  "running-economy-summary",
  "fatmax-tfcl",
  "dashboard-recommendations",
  "action-buttons",
  "scientific-charts",
  "staff-dashboard",
  "vo2max-age-comparison",
];

/**
 * Vérifie si une section doit être masquée en Running Focus Mode
 */
export function shouldHideSectionInRunningMode(sectionId: string): boolean {
  return CYCLING_TRIATHLON_SECTIONS.includes(sectionId);
}

/**
 * Vérifie si une section n'est visible QU'EN Running Focus Mode
 */
export function isRunningOnlySection(sectionId: string): boolean {
  return RUNNING_ONLY_SECTIONS.includes(sectionId);
}

/**
 * Filtre les sections selon le Running Focus Mode
 */
export function filterSectionsForRunningMode(
  sectionIds: string[], 
  isRunningOnly: boolean
): string[] {
  return sectionIds.filter(id => {
    // Si Running Focus Mode actif
    if (isRunningOnly) {
      // Masquer les sections vélo/tri
      if (shouldHideSectionInRunningMode(id)) {
        return false;
      }
      // Afficher toutes les autres
      return true;
    } else {
      // Mode normal (non-running)
      // Masquer les sections running-only
      if (isRunningOnlySection(id)) {
        return false;
      }
      // Afficher toutes les autres
      return true;
    }
  });
}

export const ALL_SECTIONS: Record<TabId, SectionDefinition[]> = {
  profil: PROFIL_SECTIONS,
  dashboard: DASHBOARD_SECTIONS,
  evolution: EVOLUTION_SECTIONS,
  tests: TESTS_SECTIONS,
  seances: SEANCES_SECTIONS,
  templates: TEMPLATES_SECTIONS,
  academy: ACADEMY_SECTIONS,
  "race-readiness": RACE_READINESS_SECTIONS,
  "running-profile": RUNNING_PROFILE_SECTIONS,
  strategie: STRATEGIE_SECTIONS,
};

// Format de stockage amélioré avec visibilité
export interface LayoutPreferences {
  profil?: SectionConfig[];
  evolution?: SectionConfig[];
  dashboard?: SectionConfig[];
  tests?: SectionConfig[];
  seances?: SectionConfig[];
  templates?: SectionConfig[];
  academy?: SectionConfig[];
  "race-readiness"?: SectionConfig[];
  "running-profile"?: SectionConfig[];
  movedSections?: MovedSectionConfig[];
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
  toggleCollapsedByDefault: (tabId: TabId, sectionId: string) => Promise<void>;
  moveSection: (sectionId: string, fromTab: TabId, toTab: TabId) => Promise<void>;
  getMovedSections: () => MovedSectionConfig[];
  getEffectiveSections: (tabId: TabId) => SectionConfig[];
  setSectionOrder: (tabId: TabId, order: string[]) => Promise<void>;
  resetToDefault: (tabId: TabId) => Promise<void>;
  resetAllToDefault: () => Promise<void>;
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
          // Migrer si nécessaire - inclure tous les onglets
          const migrated: LayoutPreferences = { movedSections: parsed.movedSections || [] };
          const allTabs: TabId[] = ['profil', 'evolution', 'dashboard', 'tests', 'seances', 'templates', 'academy', 'race-readiness', 'running-profile'];
          for (const tabId of allTabs) {
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
      let missingConfigs = defaultSections
        .filter(s => !savedIds.has(s.id))
        .map(s => ({ id: s.id, visible: s.defaultVisible }));
      
      // Filtrer les sections supprimées et ajouter les nouvelles
      const validConfigs = savedConfigs.filter(c => 
        defaultSections.some(s => s.id === c.id)
      );

      // ✅ Important: insérer "objective-manager" à un endroit attendu (sinon il finit tout en bas)
      // Cas typique: l'utilisateur a déjà une disposition sauvegardée avant l'ajout de la section.
      const objectiveDef = defaultSections.find(s => s.id === "objective-manager");
      const objectiveMissing = objectiveDef && missingConfigs.some(c => c.id === "objective-manager");

      const merged = [...validConfigs];
      if (objectiveMissing && objectiveDef) {
        const objectiveConfig: SectionConfig = { id: "objective-manager", visible: objectiveDef.defaultVisible };
        const afterAthleteRefsIdx = merged.findIndex(c => c.id === "athlete-refs");
        if (afterAthleteRefsIdx >= 0) merged.splice(afterAthleteRefsIdx + 1, 0, objectiveConfig);
        else merged.unshift(objectiveConfig);
        missingConfigs = missingConfigs.filter(c => c.id !== "objective-manager");
      }

      return [...merged, ...missingConfigs];
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

  // Toggle l'état "minimisé par défaut" d'une section
  const toggleCollapsedByDefault = useCallback(async (tabId: TabId, sectionId: string) => {
    const configs = getSectionConfigs(tabId);
    const updatedConfigs = configs.map(c => 
      c.id === sectionId ? { ...c, collapsedByDefault: !c.collapsedByDefault } : c
    );
    await setSectionConfigs(tabId, updatedConfigs);
  }, [getSectionConfigs, setSectionConfigs]);

  // Déplacer une section d'un onglet à un autre
  const moveSection = useCallback(async (sectionId: string, fromTab: TabId, toTab: TabId) => {
    if (fromTab === toTab) return;

    const newPrefs = { ...preferences };
    const movedSections = [...(newPrefs.movedSections || [])];
    
    // Vérifier si cette section a déjà été déplacée
    const existingMoveIndex = movedSections.findIndex(m => m.sectionId === sectionId);
    
    // Trouver l'onglet d'origine (peut être différent si déjà déplacé)
    let originalTab = fromTab;
    if (existingMoveIndex !== -1) {
      originalTab = movedSections[existingMoveIndex].originalTab;
      movedSections.splice(existingMoveIndex, 1);
    }
    
    // Si on revient à l'onglet d'origine, on supprime simplement l'entrée
    if (toTab !== originalTab) {
      movedSections.push({
        sectionId,
        originalTab,
        targetTab: toTab,
      });
    }
    
    newPrefs.movedSections = movedSections;
    
    // Supprimer la section de l'onglet source
    const fromConfigs = getSectionConfigs(fromTab);
    const sectionConfig = fromConfigs.find(c => c.id === sectionId);
    newPrefs[fromTab] = fromConfigs.filter(c => c.id !== sectionId);
    
    // Ajouter la section à l'onglet cible
    const toConfigs = getSectionConfigs(toTab);
    if (sectionConfig && !toConfigs.some(c => c.id === sectionId)) {
      newPrefs[toTab] = [...toConfigs, { ...sectionConfig, movedToTab: undefined }];
    }
    
    setPreferences(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user) {
      try {
        const jsonPrefs = JSON.parse(JSON.stringify(newPrefs));
        await supabase
          .from("profiles")
          .update({ layout_preferences: jsonPrefs })
          .eq("user_id", user.id);
      } catch {
        // Echec silencieux
      }
    }
  }, [preferences, getSectionConfigs, user]);

  // Obtenir la liste des sections déplacées
  const getMovedSections = useCallback((): MovedSectionConfig[] => {
    return preferences.movedSections || [];
  }, [preferences]);

  // Obtenir les sections effectives pour un onglet (incluant les sections déplacées)
  const getEffectiveSections = useCallback((tabId: TabId): SectionConfig[] => {
    return getSectionConfigs(tabId);
  }, [getSectionConfigs]);

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
    
    // Supprimer les sections déplacées depuis/vers cet onglet
    if (newPrefs.movedSections) {
      newPrefs.movedSections = newPrefs.movedSections.filter(
        m => m.originalTab !== tabId && m.targetTab !== tabId
      );
    }
    
    setPreferences(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user) {
      try {
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

  const resetAllToDefault = useCallback(async () => {
    const newPrefs: LayoutPreferences = {};
    setPreferences(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ layout_preferences: {} })
          .eq("user_id", user.id);
      } catch {
        // Echec silencieux
      }
    }
  }, [user]);

  return {
    getSectionOrder,
    getVisibleSections,
    getSectionConfigs,
    setSectionConfigs,
    toggleSectionVisibility,
    toggleCollapsedByDefault,
    moveSection,
    getMovedSections,
    getEffectiveSections,
    setSectionOrder,
    resetToDefault,
    resetAllToDefault,
    loading,
  };
}
