// =============================================
// MODÈLE PHYSIOLOGIQUE ÉLITE - VLamax pondérée, Confiance, SPM
// Intégré avec bibliothèque de tests standardisée
// =============================================

import { ObjectifType } from "@/types/athlete";
import { StoredTestResult, CiblesVLamax as LibraryCibles } from "@/types/testLibrary";

// Re-export des cibles pour compatibilité
export const CiblesVLamax = LibraryCibles;

// Interface pour les tests VLamax (compatible ancien format)
export interface TestVLamaxResult {
  nom: string;
  vlamax: number;
  fiabilite?: number;
  date?: string;
}

// Calcul VLamax pondérée par fiabilité (fonctionne avec ancien ET nouveau format)
export function calculVLamaxPonderee(tests: (TestVLamaxResult | StoredTestResult)[]): number | null {
  if (!tests || tests.length === 0) return null;

  let somme = 0;
  let poids = 0;

  tests.forEach(t => {
    const vlamax = typeof t.vlamax === "number" ? t.vlamax : null;
    if (vlamax === null || isNaN(vlamax)) return;
    
    const fiab = t.fiabilite ?? 0.5;
    somme += vlamax * fiab;
    poids += fiab;
  });

  return poids > 0 ? somme / poids : null;
}

// Indice de confiance (0-100%)
export function calculIndiceConfiance(tests: (TestVLamaxResult | StoredTestResult)[]): number {
  if (!tests || tests.length === 0) return 0;

  // Filtrer uniquement les tests avec VLamax valide
  const validTests = tests.filter(t => typeof t.vlamax === "number" && !isNaN(t.vlamax));
  if (validTests.length === 0) return 0;

  const fiabs = validTests.map(t => t.fiabilite ?? 0.5);
  const avg = fiabs.reduce((a, b) => a + b, 0) / fiabs.length;

  // Bonus pour nombre de tests (max 20%)
  const bonusTests = Math.min(validTests.length * 5, 20);

  return Math.min(100, Math.round(avg * 100 * 0.8 + bonusTests));
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
