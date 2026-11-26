/**
 * HARNESS DEV-ONLY — carte de course (Simulation) avec une athlète fixe, sans Supabase.
 * ?race=IM | Marathon | 703 ; &lcw=1 pour le Long Course Weekend. Route exposée seulement en dev.
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RaceCardBody } from "@/components/raceSimulation/RaceCardView";
import { buildRaceCard, type RaceCardAthlete, type RaceKind } from "@/lib/raceSimulation/raceCard";

const ATHLETE: RaceCardAthlete = {
  ambition: "competitor", weightKg: 52, ftpW: 188, cssSecPer100: 110, vo2max: 48, tteBikeMin: null, fcMax: 192,
  vlamaxBike: { value: 0.2, measured: false }, vlamaxRun: { value: 0.3, measured: false }, carbToleranceGH: 75, sweatRateMlH: 700,
  snapshot: { date: "2026-11-25", ftp: 188, vma: 13, pace_threshold_sec_per_km: 305, fc_max: 192, fc_repos: 58, weight_kg: 52,
    time_marathon_sec: 14292, time_marathon_date: "2027-02-28" },
};

export default function RaceCardHarness() {
  const [params] = useSearchParams();
  const kind = (params.get("race") ?? "IM") as RaceKind;
  const lcw = params.get("lcw") === "1";
  const card = useMemo(() => buildRaceCard({ kind, lcw, athlete: ATHLETE, today: "2026-11-26" }), [kind, lcw]);
  const [refs, setRefs] = useState<Record<string, unknown>>({});
  return (
    <main className="max-w-3xl mx-auto p-3 space-y-4">
      <h1 className="text-lg font-bold">Simulation de course · harnais</h1>
      <RaceCardBody card={card} weightKg={ATHLETE.weightKg} athleteId={null} raceKey={`main:${kind}`} raceDate={kind === "Marathon" ? "2027-02-28" : null}
        refs={refs} onSaveRefs={async r => setRefs(r)} />
    </main>
  );
}
