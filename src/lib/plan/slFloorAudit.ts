import type { SizingFloors } from "@/engines/plan/sessionSizingMatrix";
import { technicalFloorAudit, technicalFloors } from "../../../supabase/functions/_shared/planDiagnosticPrivacy";
export type SLFloorAudit = ReturnType<typeof technicalFloorAudit>;
/** Observe calculated floors only; neither medical inputs nor free-text reasons. */
export function snapshotSLFloorAudit(value: unknown): SLFloorAudit {
  return technicalFloorAudit(value);
}
export function traceSLFloorConsumer(stage: string, week: number, entry?: { floors: SizingFloors; floorAudit?: SLFloorAudit }) {
  if (!entry?.floorAudit) return;
  console.info("[sl_floor_pipeline]", { stage, week,
    floorAudit: technicalFloorAudit(entry.floorAudit), consumedFloors: technicalFloors(entry.floors) });
}
