/** Synthetic data only. Route guarded by import.meta.env.DEV. */
import { useState } from "react";
import { ExportTools } from "@/components/ExportTools";
import { CloudDataProvider } from "@/contexts/CloudDataContext";
import { CoachDashboard } from "@/components/CoachDashboard";
import { CompassProfileComparison } from "@/components/CompassProfileComparison";
import { DashboardFactorStates } from "@/components/DashboardFactorStates";
import { buildFactorStates } from "@/lib/coachingCompass/factorStates";
import { computeCoachingCompass, type CoachingCompassInput } from "@/lib/coachingCompass";
import { compassFlow } from "@/lib/coachingCompass/compassFlow";
import { dashboardCoverage } from "@/lib/coachingCompass/dashboardConsistency";
import type { DbAthlete, DbSnapshot, DbTest } from "@/hooks/useCloudData";

const input: CoachingCompassInput = {
  ftp: 188, poids: 52, vo2max: 50, tss7d: null, snapshotDate: "2026-11-12", snapshotUpdatedAt: null,
  pmax5s: null, p30sW: null, p60sW: null, map5minW: null, runEconomyScore: null, hrDriftPct: null,
  vma: 14.2, paceThresholdSecPerKm: 315, fatmax: null,
  vlamaxEffectif: { value: 0.2, confidence: 0.4, source: "estimated" },
  vlamaxRunReference: { value: null, source: "unknown" },
  tteEffectif: { tte_min: 35, confidence: 0.4, source: "estimated" },
  tteEffectifRun: { tte_min: 40, confidence: 0.9, source: "observed" },
  fatigueEffectif: null, limiterResult: null, potentielPhysiologique: null, strategyResult: null,
  lactateThresholds: null, wprimeKj: null,
  criticalMetrics: {
    cycling: { critical: 232, reserve: 17400, status: "confirmed", latestEffortDate: "2026-11-02", efforts: [], warnings: [] },
    running: { critical: 3.9, reserve: 190, status: "estimate", latestEffortDate: "2026-10-20", efforts: [], warnings: [] },
    durability: { bike: { status: "estimate", method: "best20_early_vs_last_third", windowVersion: 2, unit: "W", meanChangePct: -8.2, from: "2026-09-01", to: "2026-11-01", savedAt: "2026-11-02",
      sessions: [{ id: "a", date: "2026-09-10", name: "Sortie longue", durationMin: 180, early: 250, late: 230, changePct: -8 }, { id: "b", date: "2026-10-10", name: "Sortie longue", durationMin: 200, early: 255, late: 234, changePct: -8.4 }] } },
  },
  objectif: "IM", ambition: "competitor", sportFocus: "triathlon", athleteAge: 51, athleteSex: "F",
};
const snapshot = { id: "s1", athlete_id: "a1", coach_id: "c1", date: "2026-11-12", source: "manual", weight_kg:52, vma:14.2, ftp:188, vo2max:50, css:100, pace_threshold_sec_per_km:315, tte_observed_min_run:40, coach_notes:"Note réservée au coach", created_at: "", updated_at: "" } as unknown as DbSnapshot;

const prior: DbSnapshot = {...snapshot, id:"s0", date:"2026-09-14", ftp:171, pace_threshold_sec_per_km:330, coach_notes:null};
const testRide = {id:"t1", athlete_id:"a1", coach_id:"c1", date:"2026-11-10", name:"Effort en paliers", sport:"bike", vlamax:null,
  raw:{protocol:"Paliers vélo", sensor:"Capteur témoin", streams:{time:[0,30,60,90], watts:[120,141,155,179], heartrate:[105,114,121,132]}}} as unknown as DbTest;

export default function DashboardProfileHarness() {
  const [reports, setReports] = useState(false);
  const athlete = {id:"a1", name:"Camille · profil fictif", goal:"IM", birth_date:"1975-02-01", sex:"F", refs:{}, active_snapshot_id:"s1"} as DbAthlete;
  const compass = computeCoachingCompass(input);
  const flow = compassFlow(input, compass);
  const coverage = dashboardCoverage(input);
  return (
    <main data-bevel-section="dashboard" className="mx-auto max-w-7xl p-3 sm:p-4">
        <CoachDashboard
          athlete={{ id: "a1", name: "Athlète fictif", goal: "IM" }} athletes={[{ id: "a1", nom: "Athlète fictif" }]}
          onSelectAthlete={() => {}} ambition="competitor" onAmbitionChange={() => {}} onGoalChange={async () => {}}
          snapshot={snapshot} coverage={coverage} flow={flow} alert={null}
          nextRace={{ name: "Ironman 70.3 fictif", date: "2027-06-13" }} onOpenReport={() => {}} onOpenEditions={() => setReports(true)}
          profile={<CompassProfileComparison input={input} compass={compass} athleteName="Athlète fictif" />}
          states={buildFactorStates(input, compass)}
          factors={<DashboardFactorStates input={input} compass={compass} />}
          compass={<p>Compass complet</p>} bilans={<p>Bilans</p>} analyses={<p>Analyses</p>}
        />
        {reports && <CloudDataProvider><ExportTools athlete={athlete} dashboardInput={input} snapshots={[snapshot,prior]} tests={[testRide]} ambition="competitor" open onOpenChange={setReports}/></CloudDataProvider>}
    </main>
  );
}
