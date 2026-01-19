/**
 * Decision Robustness Card - Staff Dashboard Integration
 * 
 * Carte pour le mode staff affichant la courbe de robustesse décisionnelle
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DecisionRobustnessCurve } from "@/components/charts/DecisionRobustnessCurve";
import type { PrecisionInput } from "@/lib/v2/decisionRobustness";
import type { DbSnapshot } from "@/hooks/useCloudData";

interface DecisionRobustnessCardProps {
  snapshot: DbSnapshot | null;
  vo2max?: number | null;
  ambition?: "finisher" | "competitor" | "elite";
  objectif?: string;
  clusterAvailable?: boolean;
  compact?: boolean;
}

/**
 * Construit l'input de précision à partir d'un snapshot
 */
function buildPrecisionInput(
  snapshot: DbSnapshot | null,
  vo2max?: number | null,
  ambition?: "finisher" | "competitor" | "elite",
  objectif?: string,
  clusterAvailable?: boolean
): PrecisionInput {
  if (!snapshot) {
    return {
      vlamaxConfidence: 0,
      tteConfidence: 0,
      ambition: ambition ?? "competitor",
      objectif: objectif ?? "",
    };
  }
  
  // Extraire les données du snapshot avec types étendus
  const snapExt = snapshot as unknown as {
    vlamax_source?: string | null;
    protocol_quality?: number | null;
    p30s_w?: number | null;
    p60s_w?: number | null;
    map5min_w?: number | null;
  };
  
  // Calculer la confiance VLamax basée sur la source
  let vlamaxConfidence = 0.5;
  if (snapExt.vlamax_source === "measured") vlamaxConfidence = 1.0;
  else if (snapExt.vlamax_source === "field_test") vlamaxConfidence = 0.85;
  else if (snapExt.vlamax_source === "estimated") vlamaxConfidence = 0.6;
  else if (snapshot.vlamax != null) vlamaxConfidence = 0.5;
  
  // Calculer la confiance TTE
  let tteConfidence = 0.4;
  if (snapshot.tte_observed_min != null) {
    tteConfidence = snapshot.tte_observed_min > 0 ? 0.85 : 0.4;
  }
  
  // Calculer la confiance VO2max
  let vo2maxConfidence = 0;
  if (vo2max != null || snapshot.vo2max != null) {
    vo2maxConfidence = 0.7; // Valeur par défaut si présent
  }
  
  return {
    vlamaxValue: snapshot.vlamax,
    vlamaxConfidence,
    vlamaxSource: snapExt.vlamax_source ?? null,
    
    tteValue: snapshot.tte_observed_min,
    tteConfidence,
    
    vo2maxValue: vo2max ?? snapshot.vo2max,
    vo2maxConfidence,
    
    p30sPresent: snapExt.p30s_w != null,
    p60sPresent: snapExt.p60s_w != null,
    map5minPresent: snapExt.map5min_w != null,
    protocolQuality: snapExt.protocol_quality ?? 3,
    
    clusterCalibrationAvailable: clusterAvailable ?? false,
    
    ambition: ambition ?? "competitor",
    objectif: objectif ?? (snapshot as unknown as { objectif?: string })?.objectif ?? "",
  };
}

export function DecisionRobustnessCard({
  snapshot,
  vo2max,
  ambition,
  objectif,
  clusterAvailable,
  compact = false,
}: DecisionRobustnessCardProps) {
  const navigate = useNavigate();
  
  const input = useMemo(
    () => buildPrecisionInput(snapshot, vo2max, ambition, objectif, clusterAvailable),
    [snapshot, vo2max, ambition, objectif, clusterAvailable]
  );
  
  const handleOpenAcademy = () => {
    navigate("/academy?module=decision-robustness");
  };
  
  return (
    <DecisionRobustnessCurve
      input={input}
      compact={compact}
      onOpenAcademy={handleOpenAcademy}
    />
  );
}
