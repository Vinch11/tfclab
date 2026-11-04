/* eslint-disable @typescript-eslint/no-explicit-any */
/** Vue « fiche athlète » du panneau DET, construite comme la page (getEffectiveRefs + snapshot effectif). */
import { getEffectiveRefs } from "@/lib/effectiveRefs";
import { rankPrescriptionGaps } from "@/lib/limiterPrescription";
import type { AthleteDiagnostic } from "@/engines/diagnostic";
import type { AthleteRecordView } from "./athleteDetBridge";

export function buildAthleteRecordView(athlete: any, snapshots: any[], coachId: string, diagnostic: AthleteDiagnostic | null): AthleteRecordView {
  const refs = getEffectiveRefs(athlete as never, snapshots as never);
  const sn = refs.snapshotUsed as unknown as Record<string, unknown> | null;
  return {
    athleteId: athlete.id, coachId, birthDate: (athlete as { birth_date?: string | null }).birth_date ?? null, sex: (athlete as { sex?: string | null }).sex ?? null,
    refs: { vma: refs.vma, ftp: refs.ftp, css: refs.css, vo2max: refs.vo2max, weightKg: refs.weightKg, fcMax: refs.fcMax,
      sources: { vma: refs.sources.vma, ftp: refs.sources.ftp, css: refs.sources.css, vo2max: refs.sources.vo2max, weightKg: refs.sources.weightKg, fcMax: refs.sources.fcMax } },
    snapshot: sn ? { id: sn.id as string, date: (sn.date as string) ?? null, pace_threshold_sec_per_km: (sn.pace_threshold_sec_per_km as number) ?? null,
      tte_observed_min_run: (sn.tte_observed_min_run as number) ?? null, vlamax_run: (sn.vlamax_run as number) ?? null, vlamax: (sn.vlamax as number) ?? null,
      vlamax_source: (sn.vlamax_source as string) ?? null, vlamax_protocol: (sn.vlamax_protocol as string) ?? null, fatigue_state: (sn.fatigue_state as string) ?? null } : null,
    diagnosticLimiters: diagnostic ? rankPrescriptionGaps(diagnostic.limiter.gapAnalysis).map((g) => g.metric) : [],
  };
}
