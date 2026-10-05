// =============================================
// PROFIL RAPIDE — construction du payload snapshot (source unique)
// =============================================
//
// Partagé entre AITrainingPlanPage.tsx (dialog ouvert depuis le choix de
// profil à la création d'un athlète) et DiagnosticPage.tsx (dialog ouvert
// depuis la section "Testing court") — évite que les deux pages dérivent
// avec des champs/libellés différents pour le même type de snapshot.

import type { DbSnapshot } from "@/hooks/useCloudData";
import type { ProfilExpressSubmitPayload } from "@/components/ProfilExpressDialog";

export function buildProfilExpressSnapshotPayload(
  athleteId: string,
  data: ProfilExpressSubmitPayload,
): Omit<DbSnapshot, "id" | "created_at" | "updated_at"> {
  return {
    athlete_id: athleteId,
    date: new Date().toISOString().slice(0, 10),
    source: "profil_express",
    confidence: data.confidence,
    weight_kg: data.weightKg,
    vo2max: data.vo2max,
    ...(data.sport === "run"
      ? {
          vlamax_run: data.vlamax,
          vma: data.vma,
          pace_threshold_sec_per_km: data.paceThresholdSecPerKm,
        }
      : {
          vlamax: data.vlamax,
          ftp: data.ftp,
        }),
    coach_notes: `Profil Rapide (${data.sport === "run" ? "course" : "vélo"}) — estimé depuis 2 efforts de terrain, confiance ${Math.round(data.confidence * 100)}%. ${data.warnings.join(" ")}`.trim(),
  } as Omit<DbSnapshot, "id" | "created_at" | "updated_at">;
}
