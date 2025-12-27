// =============================================
// MODÈLE PHYSIOLOGIQUE ÉLITE - VLamax pondérée, Confiance, SPM
// =============================================

import { ObjectifType } from "@/types/athlete";

// Fiabilité des tests VLamax (0-1)
export const TestFiabilite: Record<string, number> = {
  "Sprint 5-10s Vélo": 0.9,
  "Wingate 30s Vélo": 0.75,
  "Sprint 30-50m Course": 0.7,
  "200m Natation": 0.7,
  "Sprint + FTP": 0.5,
  "TTE Course": 0.65,
  "4x400m Course": 0.6,
  "Sprint 25-50m Natation": 0.65,
  "4x50m Lactate Natation": 0.7
};

// Cibles VLamax par objectif
export const CiblesVLamax: Record<string, { min: number; max: number; optimal: number }> = {
  IM: { min: 0.3, max: 0.6, optimal: 0.45 },
  "703": { min: 0.4, max: 0.7, optimal: 0.55 },
  Marathon: { min: 0.25, max: 0.5, optimal: 0.35 },
  Semi: { min: 0.35, max: 0.6, optimal: 0.45 }
};

// Interface pour les tests VLamax
export interface TestVLamaxResult {
  nom: string;
  vlamax: number;
  date?: string;
}

// Calcul VLamax pondérée par fiabilité
export function calculVLamaxPonderee(tests: TestVLamaxResult[]): number | null {
  if (!tests || tests.length === 0) return null;

  let somme = 0;
  let poids = 0;

  tests.forEach(t => {
    const fiab = TestFiabilite[t.nom] || 0.5;
    somme += t.vlamax * fiab;
    poids += fiab;
  });

  return poids > 0 ? somme / poids : null;
}

// Indice de confiance (0-100%)
export function calculIndiceConfiance(tests: TestVLamaxResult[]): number {
  if (!tests || tests.length === 0) return 0;

  let total = 0;
  tests.forEach(t => {
    total += TestFiabilite[t.nom] || 0.5;
  });

  // Bonus pour nombre de tests
  const bonusTests = Math.min(tests.length * 5, 20);
  
  return Math.min(100, Math.round((total / tests.length) * 100 * 0.8 + bonusTests));
}

// Score Performance Métabolique (SPM)
export function calculSPM(
  vlamax: number | null, 
  vo2max: number, 
  objectif: ObjectifType, 
  confiance: number
): number {
  if (!vlamax || !vo2max) return 0;

  const cible = CiblesVLamax[objectif] || CiblesVLamax.IM;
  let score = 100;

  // Pénalité si hors cible
  if (vlamax < cible.min) {
    score -= (cible.min - vlamax) * 120;
  }
  if (vlamax > cible.max) {
    score -= (vlamax - cible.max) * 120;
  }

  // Bonus VO2max (référence 50)
  score += (vo2max - 50) * 0.5;

  // Pénalité confiance
  score *= (confiance / 100);

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Interprétation scientifique VLamax
export function interpretationVLamax(vlamax: number | null, objectif: ObjectifType): {
  status: "low" | "optimal" | "high" | "unknown";
  message: string;
  conseil: string;
} {
  if (vlamax === null) {
    return {
      status: "unknown",
      message: "Données insuffisantes",
      conseil: "Effectuer des tests VLamax pour obtenir une analyse."
    };
  }

  const c = CiblesVLamax[objectif] || CiblesVLamax.IM;

  if (vlamax < c.min) {
    return {
      status: "low",
      message: "VLamax trop basse",
      conseil: "Réserve anaérobie limitée. Intégrer des séances de sprint et puissance (séances B) pour remonter la VLamax."
    };
  }
  
  if (vlamax > c.max) {
    return {
      status: "high",
      message: "VLamax trop élevée",
      conseil: "Risque de dérive glycogène sur longue distance. Privilégier les séances d'endurance longue (séances A) pour abaisser la VLamax."
    };
  }

  return {
    status: "optimal",
    message: "VLamax adaptée",
    conseil: "Profil métabolique équilibré pour l'objectif. Maintenir l'équilibre actuel entre endurance et puissance."
  };
}

// Répartition des séances A/B/C/D
export type SeanceCategorie = "A" | "B" | "C" | "D";
export type SeanceStatus = "prioritaire" | "contrôlée" | "limitée" | "maintien";

export interface RepartitionSeances {
  A: { status: SeanceStatus; icon: string; label: string };
  B: { status: SeanceStatus; icon: string; label: string };
  C: { status: SeanceStatus; icon: string; label: string };
  D: { status: SeanceStatus; icon: string; label: string };
  message: string;
  strategie: string;
}

export function calculRepartitionSeances(
  vlamax: number | null, 
  objectif: ObjectifType, 
  confiance: number
): RepartitionSeances {
  const c = CiblesVLamax[objectif] || CiblesVLamax.IM;

  // Confiance faible
  if (confiance < 60) {
    return {
      A: { status: "prioritaire", icon: "✔", label: "Prioritaires" },
      B: { status: "limitée", icon: "⚠", label: "Limitées" },
      C: { status: "maintien", icon: "✔", label: "Techniques" },
      D: { status: "prioritaire", icon: "✔", label: "Récupération" },
      message: "Données peu fiables : prudence sur les séances B.",
      strategie: "Consolider les données avec plus de tests avant d'intensifier."
    };
  }

  if (vlamax === null) {
    return {
      A: { status: "maintien", icon: "✔", label: "Maintien" },
      B: { status: "maintien", icon: "✔", label: "Maintien" },
      C: { status: "maintien", icon: "✔", label: "Techniques" },
      D: { status: "maintien", icon: "✔", label: "Modérées" },
      message: "Tests VLamax nécessaires pour affiner les recommandations.",
      strategie: "Effectuer des tests pour personnaliser la planification."
    };
  }

  // VLamax trop haute
  if (vlamax > c.max) {
    return {
      A: { status: "prioritaire", icon: "✔", label: "Dominantes" },
      B: { status: "limitée", icon: "❌", label: "Réduites" },
      C: { status: "maintien", icon: "✔", label: "Techniques" },
      D: { status: "prioritaire", icon: "✔", label: "Fréquentes" },
      message: "Objectif : abaisser VLamax pour optimiser l'endurance.",
      strategie: "Focus sur les séances longues Z2 et réduction des sprints."
    };
  }

  // VLamax trop basse
  if (vlamax < c.min) {
    return {
      A: { status: "maintien", icon: "✔", label: "Maintien" },
      B: { status: "prioritaire", icon: "✔", label: "Prioritaires" },
      C: { status: "maintien", icon: "✔", label: "Techniques" },
      D: { status: "contrôlée", icon: "✔", label: "Modérées" },
      message: "Objectif : remonter VLamax pour améliorer la puissance.",
      strategie: "Intégrer des sprints courts et travail anaérobie."
    };
  }

  // Équilibre optimal
  return {
    A: { status: "contrôlée", icon: "✔", label: "Optimales" },
    B: { status: "contrôlée", icon: "✔", label: "Contrôlées" },
    C: { status: "maintien", icon: "✔", label: "Techniques" },
    D: { status: "contrôlée", icon: "✔", label: "Stratégiques" },
    message: "Équilibre physiologique atteint.",
    strategie: "Maintenir le ratio actuel et affiner selon la période."
  };
}

// Analyse physiologique complète
export interface AnalysePhysiologique {
  vlamaxPonderee: number | null;
  confiance: number;
  spm: number;
  interpretation: ReturnType<typeof interpretationVLamax>;
  repartition: RepartitionSeances;
  cible: { min: number; max: number; optimal: number };
}

export function analysePhysiologiqueComplete(
  tests: TestVLamaxResult[],
  vo2max: number,
  objectif: ObjectifType
): AnalysePhysiologique {
  const vlamaxPonderee = calculVLamaxPonderee(tests);
  const confiance = calculIndiceConfiance(tests);
  const spm = calculSPM(vlamaxPonderee, vo2max, objectif, confiance);
  const interpretation = interpretationVLamax(vlamaxPonderee, objectif);
  const repartition = calculRepartitionSeances(vlamaxPonderee, objectif, confiance);
  const cible = CiblesVLamax[objectif] || CiblesVLamax.IM;

  return {
    vlamaxPonderee,
    confiance,
    spm,
    interpretation,
    repartition,
    cible
  };
}

// Couleur selon le statut
export function getStatusColor(status: "low" | "optimal" | "high" | "unknown"): string {
  switch (status) {
    case "optimal": return "text-green-500";
    case "low": return "text-amber-500";
    case "high": return "text-red-500";
    default: return "text-muted-foreground";
  }
}

export function getStatusBgColor(status: "low" | "optimal" | "high" | "unknown"): string {
  switch (status) {
    case "optimal": return "bg-green-500/10";
    case "low": return "bg-amber-500/10";
    case "high": return "bg-red-500/10";
    default: return "bg-muted/50";
  }
}
