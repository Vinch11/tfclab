import { BlindReview } from "@/components/charts/LabCoachReview";
import type { DbSnapshot } from "@/hooks/useCloudData";

const historical: DbSnapshot = {
  id: "old",
  athlete_id: "synthetic",
  coach_id: "coach",
  date: "2026-09-01",
  source: "test",
  objectif: "10K",
  vma: 13,
};
const reference: DbSnapshot = {
  ...historical,
  id: "new",
  date: "2026-10-01",
  vma: 15,
};
export default function LabCoachHarness() {
  return (
    <main className="p-4">
      <BlindReview snapshots={[historical, reference]} reference={reference} />
    </main>
  );
}
