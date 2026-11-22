/** Synthetic data only. Route guarded by import.meta.env.DEV. */
import { CoachDashboard } from "@/components/CoachDashboard";
import { CompassProfileComparison } from "@/components/CompassProfileComparison";
import { DashboardFactorStates } from "@/components/DashboardFactorStates";
import { buildFactorStates } from "@/lib/coachingCompass/factorStates";
import { computeCoachingCompass, type CoachingCompassInput } from "@/lib/coachingCompass";
import { compassFlow } from "@/lib/coachingCompass/compassFlow";
import { dashboardCoverage } from "@/lib/coachingCompass/dashboardConsistency";
import type { DbSnapshot } from "@/hooks/useCloudData";

const input: CoachingCompassInput = {
  ftp: 188, poids: 52, vo2max: 50, tss7d: null, snapshotDate: "2026-11-12", snapshotUpdatedAt: null,
  pmax5s: null, p30sW: null, p60sW: null, map5minW: null, runEconomyScore: null, hrDriftPct: null,
  vma: 14.2, paceThresholdSecPerKm: 315, fatmax: null,
  vlamaxEffectif: { value: 0.2, confidence: 0.4, source: "estimated" },
  vlamaxRunReference: { value: null, source: "unknown" },
  tteEffectif: { tte_min: 35, confidence: 0.4, source: "estimated" },
  tteEffectifRun: { tte_min: 40, confidence: 0.9, source: "observed" },
  fatigueEffectif: null, limiterResult: null, potentielPhysiologique: null, strategyResult: null,
  lactateThresholds: null, wprimeKj: null, objectif: "IM", ambition: "competitor", sportFocus: "triathlon", athleteAge: 51, athleteSex: "F",
};
const snapshot = { id: "s1", athlete_id: "a1", coach_id: "c1", date: "2026-11-12", source: "manual", created_at: "", updated_at: "" } as unknown as DbSnapshot;

export default function DashboardProfileHarness() {
  const compass = computeCoachingCompass(input);
  const flow = compassFlow(input, compass);
  const coverage = dashboardCoverage(input);
  return (
    <main data-bevel-section="dashboard" className="mx-auto max-w-7xl p-3 sm:p-4">
        <CoachDashboard
          athlete={{ id: "a1", name: "Athlète fictif", goal: "IM" }} athletes={[{ id: "a1", nom: "Athlète fictif" }]}
          onSelectAthlete={() => {}} ambition="competitor" onAmbitionChange={() => {}} onGoalChange={async () => {}}
          snapshot={snapshot} coverage={coverage} flow={flow} alert={null}
          nextRace={{ name: "Ironman 70.3 fictif", date: "2027-06-13" }} onOpenReport={() => {}}
          profile={<CompassProfileComparison input={input} compass={compass} athleteName="Athlète fictif" />}
          states={buildFactorStates(input, compass)}
          factors={<DashboardFactorStates input={input} compass={compass} />}
          compass={<p>Compass complet</p>} bilans={<p>Bilans</p>} analyses={<p>Analyses</p>}
        />
    </main>
  );
}
