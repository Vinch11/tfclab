import type { DbSnapshot } from "@/hooks/useCloudData";
import { rankedFieldGaps } from "@/lib/coachingCompass/rankedFieldGaps";
import { objectiveDemands } from "@/lib/coachingCompass/objectiveDemands";
import { detectUnifiedLimiter } from "@/lib/v2/unifiedLimiterDetection";
import { estimateProfileFatMaxPctFTP } from "@/lib/v2/fatmaxTFCL";
import {
  hasBikeVlamaxMeasurementEvidence,
  hasRunVlamaxMeasurementEvidence,
} from "@/lib/vlamaxEvidence";
import type { AmbitionLevel } from "@/types/ambitionLevel";

/** Historical replay uses only fields stored on the chosen date and explicit scenario assumptions. */
export function replayPriorities(
  row: DbSnapshot,
  goal: string,
  ambition: AmbitionLevel,
  age: number | null,
) {
  const kind = objectiveDemands(goal)?.kind;
  if (!kind) return [];
  const tri = kind === "tri";
  const vla = (tri ? row.vlamax : row.vlamax_run) ?? null;
  const measured = tri
    ? hasBikeVlamaxMeasurementEvidence(row)
    : hasRunVlamaxMeasurementEvidence(row);
  const limiter = detectUnifiedLimiter({
    objectif: goal,
    ambition,
    age,
    sportFocus: tri ? "tri" : "run",
    vma: row.vma ?? null,
    vo2max: row.vo2max ?? null,
    ftpKg: tri && row.weight_kg && row.ftp ? row.ftp / row.weight_kg : null,
    vlamax: vla,
    vlamaxSource: measured ? "test_labo" : "estimated",
    tte: (tri ? row.tte_observed_min : row.tte_observed_min_run) ?? null,
    tteSource: "observed",
    fatmax: tri
      ? estimateProfileFatMaxPctFTP(
          vla,
          row.vo2max ?? null,
          row.weight_kg ?? null,
          row.ftp ?? null,
        )
      : null,
    fatmaxSource: "model",
    wprimeKj: null,
    economyScore: row.run_economy_score ?? null,
    availabilityScore: null,
    hasHealthAlerts: false,
  });
  return rankedFieldGaps(limiter);
}
