/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HARNESS DEV-ONLY — MobileBottomNav isolé pour tests Playwright
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pourquoi un harness plutôt que tester `/` directement : `/` (Index.tsx) est
 * derrière `AuthGate` + `useCloudDataContext`/`useAthletes`, qui restent
 * bloqués sur "Chargement des données..." sans vraie session Supabase — le
 * flag `?e2e_bypass=1` d'AuthGate ne lève que le redirect, pas la dépendance
 * aux données. `MobileBottomNav` lui-même ne dépend d'aucune donnée athlète
 * (juste `useLocation`/`useNavigate` de react-router) — exactement le
 * composant où vivait le bug "Exporter un rapport ne fait rien" (iOS Safari,
 * double déclenchement touch+souris sur le bouton "Plus"). Le monter seul
 * ici permet un vrai test navigateur de ce composant sans dépendre d'un
 * compte de test Supabase.
 *
 * Route exposée UNIQUEMENT en dev (`import.meta.env.DEV` dans App.tsx) —
 * jamais présente dans un build de production.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import { useState } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
// MobileBottomNav appelle useIsRunningOnly() → useRunningFocusMode(), qui
// exige un ancêtre RunningFocusModeProvider. Le Provider RÉEL dépend de
// useAthletes() → AthleteProvider → Supabase (même blocage que `/`, cf.
// commentaire en tête de fichier). On fournit donc directement une valeur
// mock via le Context brut, sans monter la vraie chaîne de providers.
import { RunningFocusModeContext, type RunningFocusModeContextType } from "@/contexts/RunningFocusModeContext";
import { getRunningFocusModeState, RUNNING_LIMITER_INFO, RUNNING_LEVER_INFO, RUNNING_KEY_METRICS, RUNNING_TRAINING_ZONES } from "@/lib/runningFocusMode";

const MOCK_RUNNING_FOCUS_MODE: RunningFocusModeContextType = {
  isRunningOnly: false,
  state: getRunningFocusModeState(undefined),
  raceType: null,
  raceLabel: null,
  distanceKm: null,
  targets: null,
  getLimiterInfo: (limiter) => RUNNING_LIMITER_INFO[limiter],
  getLeverInfo: (lever) => RUNNING_LEVER_INFO[lever],
  keyMetrics: RUNNING_KEY_METRICS,
  trainingZones: RUNNING_TRAINING_ZONES,
  shouldHideCyclingContent: () => false,
  getMetricLabel: (label) => label,
};

export default function MobileNavHarness() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staffMode, setStaffMode] = useState(false);
  const [exportClickCount, setExportClickCount] = useState(0);

  return (
    <RunningFocusModeContext.Provider value={MOCK_RUNNING_FOCUS_MODE}>
      <div style={{ minHeight: "100vh" }}>
        <p data-testid="export-click-count">{exportClickCount}</p>
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          staffMode={staffMode}
          onStaffModeChange={setStaffMode}
          onExportClick={() => setExportClickCount((n) => n + 1)}
        />
      </div>
    </RunningFocusModeContext.Provider>
  );
}
