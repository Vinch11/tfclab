// =============================================
// RACE READINESS EFFECTIF - Source unique de vérité
// =============================================

import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";

// Targets par objectif
const TARGETS = {
  IM: {
    vlamax: { min: 0.25, max: 0.40, ideal: 0.35 },
    tte: { min: 55, ideal: 65 },
    ftpKg: { min: 4.6, ideal: 5.0 },
  },
  "703": {
    vlamax: { min: 0.25, max: 0.45, ideal: 0.38 },
    tte: { min: 50, ideal: 55 },
    ftpKg: { min: 4.7, ideal: 5.2 },
  },
  Marathon: {
    vlamax: { min: 0.25, max: 0.45, ideal: 0.40 },
    tte: { min: 50, ideal: 60 },
    ftpKg: { min: 4.0, ideal: 4.5 }, // proxy vélo
  },
  Semi: {
    vlamax: { min: 0.25, max: 0.50, ideal: 0.42 },
    tte: { min: 45, ideal: 50 },
    ftpKg: { min: 4.0, ideal: 4.5 }, // proxy vélo
  },
};

export interface RaceReadinessDetails {
  vlamax: number;       // 0-25
  endurance: number;    // 0-25
  puissance: number;    // 0-25
  fraicheur: number;    // 0-25
}

export interface RaceReadinessEffectif {
  score: number;                 // 0-100
  label: string;                 // "Prêt", "En progression", etc.
  color: "success" | "warning" | "destructive";
  details: RaceReadinessDetails;
  confidence: number;            // 0-1 (moyenne des confidences)
  reasonsMissing: string[];      // Liste des données manquantes
  inputsUsed: {
    vlamax: { value: number | null; source: string };
    tte: { value: number | null; source: string };
    ftpKg: number | null;
    fatigue_ok: boolean;
    seance_specifique: boolean;
  };
}

export interface ComputeRaceReadinessParams {
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  ftp: number | null;
  poids: number | null;
  fatigue_ok?: boolean;
  seance_specifique_validee?: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Calcule le score Race Readiness unifié
 * 4 sous-scores de 25 points chacun = 100 points max
 */
export function computeRaceReadinessEffectif(params: ComputeRaceReadinessParams): RaceReadinessEffectif {
  const {
    objectif,
    vlamaxEffectif,
    tteEffectif,
    ftp,
    poids,
    fatigue_ok = true,
    seance_specifique_validee = false,
  } = params;

  const reasonsMissing: string[] = [];
  
  // Récupérer les targets pour l'objectif
  const targets = TARGETS[objectif as keyof typeof TARGETS] || TARGETS["IM"];

  // =====================
  // 1. VLAMAX SCORE (0-25)
  // =====================
  let vlamaxScore = 0;
  const vlamax = vlamaxEffectif.value;
  
  if (vlamax === null) {
    vlamaxScore = 10; // Score neutre si manquant
    reasonsMissing.push("VLamax manquant");
  } else if (vlamax >= targets.vlamax.min && vlamax <= targets.vlamax.max) {
    // Dans la cible = max points
    const distanceToIdeal = Math.abs(vlamax - targets.vlamax.ideal);
    vlamaxScore = Math.round(25 - distanceToIdeal * 50); // Plus proche de l'idéal = meilleur
    vlamaxScore = clamp(vlamaxScore, 18, 25);
  } else if (vlamax < targets.vlamax.min) {
    // Trop bas
    vlamaxScore = Math.round(clamp(15 - (targets.vlamax.min - vlamax) * 100, 5, 15));
  } else {
    // Trop haut
    vlamaxScore = Math.round(clamp(18 - (vlamax - targets.vlamax.max) * 80, 5, 18));
  }

  // =====================
  // 2. ENDURANCE/TTE SCORE (0-25)
  // =====================
  let enduranceScore = 0;
  const tte = tteEffectif.tte_min;
  
  if (tte === null || tteEffectif.source === "unknown") {
    enduranceScore = 8; // Score faible si manquant
    if (tteEffectif.source === "unknown") {
      reasonsMissing.push("TTE indisponible (ajouter TSS_7d ou TTE mesuré)");
    }
  } else if (tte >= targets.tte.ideal) {
    enduranceScore = 25;
  } else if (tte >= targets.tte.min) {
    // Entre min et ideal
    const progress = (tte - targets.tte.min) / (targets.tte.ideal - targets.tte.min);
    enduranceScore = Math.round(18 + progress * 7);
  } else {
    // Sous la cible min
    const ratio = tte / targets.tte.min;
    enduranceScore = Math.round(clamp(ratio * 18, 5, 17));
  }

  // =====================
  // 3. PUISSANCE/FTP/kg SCORE (0-25)
  // =====================
  let puissanceScore = 0;
  const ftpKg = ftp && poids && poids > 0 ? ftp / poids : null;
  
  if (ftpKg === null) {
    puissanceScore = 10;
    if (!ftp) reasonsMissing.push("FTP manquant");
    if (!poids) reasonsMissing.push("Poids manquant");
  } else if (ftpKg >= targets.ftpKg.ideal) {
    puissanceScore = 25;
  } else if (ftpKg >= targets.ftpKg.min) {
    const progress = (ftpKg - targets.ftpKg.min) / (targets.ftpKg.ideal - targets.ftpKg.min);
    puissanceScore = Math.round(18 + progress * 7);
  } else {
    const ratio = ftpKg / targets.ftpKg.min;
    puissanceScore = Math.round(clamp(ratio * 18, 5, 17));
  }

  // =====================
  // 4. FRAICHEUR/CONDITIONS SCORE (0-25)
  // =====================
  let fraicheurScore = 12; // Base neutre
  
  if (fatigue_ok && seance_specifique_validee) {
    fraicheurScore = 25;
  } else if (fatigue_ok) {
    fraicheurScore = 18;
  } else if (seance_specifique_validee) {
    fraicheurScore = 15;
  } else {
    fraicheurScore = 10;
  }
  
  // Ajuster selon la confiance des données
  const avgConfidence = (vlamaxEffectif.confidence + tteEffectif.confidence) / 2;
  if (avgConfidence < 0.5) {
    fraicheurScore = Math.round(fraicheurScore * 0.8);
    if (!reasonsMissing.includes("Confiance données faible")) {
      reasonsMissing.push("Confiance données faible");
    }
  }

  // =====================
  // SCORE TOTAL
  // =====================
  const totalScore = vlamaxScore + enduranceScore + puissanceScore + fraicheurScore;
  const score = clamp(totalScore, 0, 100);

  // Label et couleur
  let label: string;
  let color: "success" | "warning" | "destructive";
  
  if (score >= 85) {
    label = "Race Ready!";
    color = "success";
  } else if (score >= 75) {
    label = "Prêt";
    color = "success";
  } else if (score >= 60) {
    label = "En progression";
    color = "warning";
  } else if (score >= 40) {
    label = "Travail en cours";
    color = "warning";
  } else {
    label = "Préparation requise";
    color = "destructive";
  }

  // Si trop de données manquantes, override le label
  if (reasonsMissing.length >= 3) {
    label = "Données insuffisantes";
    color = "warning";
  }

  return {
    score,
    label,
    color,
    details: {
      vlamax: vlamaxScore,
      endurance: enduranceScore,
      puissance: puissanceScore,
      fraicheur: fraicheurScore,
    },
    confidence: avgConfidence,
    reasonsMissing,
    inputsUsed: {
      vlamax: { value: vlamax, source: vlamaxEffectif.source },
      tte: { value: tte, source: tteEffectif.source },
      ftpKg,
      fatigue_ok,
      seance_specifique: seance_specifique_validee,
    },
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

export function getScoreBgColor(score: number): string {
  if (score >= 75) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}

export function formatReadinessLabel(readiness: RaceReadinessEffectif): string {
  if (readiness.reasonsMissing.length >= 2) {
    return `${readiness.label} (partiel)`;
  }
  return readiness.label;
}

export function isReadinessComplete(readiness: RaceReadinessEffectif): boolean {
  return readiness.reasonsMissing.length === 0;
}
