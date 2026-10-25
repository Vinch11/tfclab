import type { SizingFloors, SlFloorRampAnchors } from "@/engines/plan/sessionSizingMatrix";

export interface SLFloorAudit {
  version: 1;
  localWeek: number; globalWeek: number;
  weeklyHours: number;
  volumeRamp: SlFloorRampAnchors | null;
  injuryRisk: { bike?: string | null; run?: string | null } | null;
  nominal: SizingFloors;
  individualized: SizingFloors;
  appliedPct: { bike: number; run: number };
  reasons: string[];
}

/** Observe the existing calculation, including no-op. Never recalculate floors. */
export function snapshotSLFloorAudit(value: Omit<SLFloorAudit, "version">): SLFloorAudit {
  return structuredClone({ version: 1, ...value });
}

export function traceSLFloorConsumer(stage: string, week: number, entry?: { floors: SizingFloors; floorAudit?: SLFloorAudit }) {
  if (!entry?.floorAudit) return; // no fabricated provenance for historical plans
  console.info("[sl_floor_pipeline]", structuredClone({ stage, week, floorAudit: entry.floorAudit, consumedFloors: entry.floors }));
}
