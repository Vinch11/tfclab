import { BlindReview } from "@/components/charts/LabCoachReview";
import type { DbTest } from "@/hooks/useCloudData";

const historical = {
  id: "old",
  athlete_id: "synthetic",
  coach_id: "coach",
  date: "2026-09-01",
  source: "test",
  objectif: "10K",
  vma: 13,
  created_at: "2026-09-01T09:00:00Z",
  updated_at: "2026-09-01T09:00:00Z",
  time_10k_date: "2026-08-05",
  time_10k_sec: 3000,
};
const reference = {
  ...historical,
  id: "new",
  date: "2026-10-01",
  vma: 15,
  time_10k_date: "2026-09-27",
  time_10k_sec: 2880,
};
const followup = {
  id: "test",
  athlete_id: historical.athlete_id,
  sport: "run",
  name: "Repère piste",
  raw: { vma: 15, testDate: "2026-09-22", conditionsConfirmed: true },
} as DbTest;
export default function LabCoachHarness() {
  return (
    <main className="p-4">
      <BlindReview
        tests={[followup]}
        snapshots={[historical, reference]}
        reference={reference}
      />
    </main>
  );
}
