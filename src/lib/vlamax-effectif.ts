// =============================================
// VLAMAX EFFECTIF - Source unique de vérité (Legacy)
// 
// NOTE: Ce fichier est maintenu pour compatibilité avec VLamaxBadge.
// Le fichier principal est src/lib/vlamaxEffectif.ts
//
// HIÉRARCHIE DES SOURCES (stricte):
// 1. VLamax mesurée lactate (Staff mode) → confiance 0.95
// 2. VLamax test terrain structuré → confiance 0.75
// 3. VLamax estimée via snapshot → confiance 0.55
// 4. Valeur par défaut → confiance faible + avertissement
// =============================================

import { Athlete, ObjectifType } from "@/types/athlete";
import { SnapshotNolio, scoreConfiance, calculerAgeSnapshot } from "@/types/snapshotNolio";
import { StoredTestResult, getVLamaxTestsOnly } from "@/types/testLibrary";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";

// =============================================
// TYPES
// =============================================

export type VLamaxSource = "test" | "snapshot" | "estimé" | "inconnu";

export interface VLamaxEffectif {
  value: number | null;
  source: VLamaxSource;
  confidence: number; // 0 à 1
  label: string; // Label utilisateur explicite
  details?: string; // Détails supplémentaires pour tooltip
  isLocked?: boolean; // true si VLamax mesurée (Staff mode)
}

// =============================================
// HIÉRARCHIE DE CALCUL (OBLIGATOIRE)
// =============================================

/**
 * Calcule la VLamax effective selon la hiérarchie stricte:
 * 1) Test explicite de VLamax → source = "test", confiance ~0.75-0.95
 * 2) Snapshot récent avec données suffisantes → source = "snapshot", confiance ~0.55
 * 3) Estimation prudente → source = "estimé", confiance ~0.30
 * 4) Aucune donnée → VLamax = null
 */
export function getVLamaxEffectif(
  athlete: Athlete,
  snapshot?: SnapshotNolio | null,
  tests?: StoredTestResult[]
): VLamaxEffectif {
  // =============================================
  // 1) Tests explicites de VLamax (priorité absolue)
  // =============================================
  const allTests = tests ?? athlete.tests ?? [];
  const vlamaxTests = getVLamaxTestsOnly(allTests);
  
  if (vlamaxTests.length > 0) {
    // Prendre la valeur pondérée par fiabilité (tests les plus récents prioritaires)
    const sortedTests = [...vlamaxTests].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Pondération par fiabilité et récence
    let somme = 0;
    let poids = 0;
    
    sortedTests.forEach((t, idx) => {
      const vlamax = t.vlamax ?? 0;
      const fiab = t.fiabilite ?? 0.5;
      // Bonus pour tests récents (décroissance exponentielle)
      const recencyBonus = Math.exp(-idx * 0.3);
      const weight = fiab * recencyBonus;
      somme += vlamax * weight;
      poids += weight;
    });
    
    const vlamaxPonderee = poids > 0 ? somme / poids : sortedTests[0].vlamax ?? 0;
    
    // Confiance basée sur fiabilité moyenne - ajustée selon nouvelle hiérarchie
    const avgFiabilite = sortedTests.reduce((sum, t) => sum + (t.fiabilite ?? 0.5), 0) / sortedTests.length;
    // Test terrain structuré = confiance 0.75 de base
    const baseConfidence = 0.75;
    const testCountBonus = Math.min(sortedTests.length * 0.05, 0.15);
    const confidence = Math.min(0.95, baseConfidence + testCountBonus);
    
    // Pénalité si tests anciens (> 8 semaines)
    const mostRecentTest = sortedTests[0];
    const ageJours = calculerAgeSnapshot(mostRecentTest.date);
    const agePenalty = ageJours > 56 ? 0.15 : ageJours > 28 ? 0.05 : 0;
    
    return {
      value: Number(vlamaxPonderee.toFixed(2)),
      source: "test",
      confidence: Math.max(0.5, confidence - agePenalty),
      label: "VLamax (test terrain)",
      details: `Basé sur ${sortedTests.length} test(s), fiabilité moyenne ${Math.round(avgFiabilite * 100)}%`
    };
  }
  
  // =============================================
  // 2) Snapshot récent avec données suffisantes
  // =============================================
  const effectiveSnapshot = snapshot ?? getDernierSnapshotValide(athlete);
  
  if (effectiveSnapshot) {
    const hasRequiredData = checkSnapshotHasSufficientData(effectiveSnapshot);
    
    if (hasRequiredData) {
      const vlamax = calculVLamaxSnapshot(effectiveSnapshot, athlete.objectif);
      const ageJours = calculerAgeSnapshot(effectiveSnapshot.date);
      
      // Estimation via snapshot = confiance 0.55 de base
      const baseConfidence = 0.55;
      const agePenalty = ageJours > 60 ? 0.15 : ageJours > 30 ? 0.10 : ageJours > 14 ? 0.05 : 0;
      const confidence = Math.max(0.3, baseConfidence - agePenalty);
      
      return {
        value: vlamax,
        source: "estimé", // Estimation via snapshot
        confidence,
        label: "VLamax (estimé)",
        details: `Basé sur snapshot du ${formatDate(effectiveSnapshot.date)}, confiance ${Math.round(confidence * 100)}%`
      };
    }
  }
  
  // =============================================
  // 3) Estimation prudente (fallback)
  // =============================================
  const estimation = getEstimationPrudente(athlete.objectif);
  
  if (estimation !== null) {
    return {
      value: estimation,
      source: "estimé",
      confidence: 0.25,
      label: "VLamax (fallback)",
      details: `Estimation par défaut pour objectif ${athlete.objectif}. Effectuez un test pour une valeur précise.`
    };
  }
  
  // =============================================
  // 4) Aucune donnée exploitable
  // =============================================
  return {
    value: null,
    source: "inconnu",
    confidence: 0.2,
    label: "VLamax (non disponible)",
    details: "Aucune donnée disponible. Effectuez un test ou importez un snapshot."
  };
}

// =============================================
// HELPERS
// =============================================

function getDernierSnapshotValide(athlete: Athlete): SnapshotNolio | null {
  if (!athlete.historique || athlete.historique.length === 0) return null;
  
  // Trier par date décroissante
  const sorted = [...athlete.historique].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Retourner le plus récent
  return sorted[0] || null;
}

function checkSnapshotHasSufficientData(snapshot: SnapshotNolio): boolean {
  if (snapshot.sport === "vélo") {
    return !!(snapshot.ftp && snapshot.pmax_5s && snapshot.poids);
  }
  if (snapshot.sport === "course") {
    return !!(snapshot.vma && snapshot.poids);
  }
  if (snapshot.sport === "natation") {
    return !!(snapshot.pace100 && snapshot.poids);
  }
  return false;
}

function getEstimationPrudente(objectif: ObjectifType): number | null {
  // Ne retourne une estimation que si vraiment nécessaire
  // Ces valeurs sont des médianes conservatrices par objectif
  switch (objectif) {
    case "IM":
      return 0.35; // Ironman: VLamax basse recommandée
    case "703":
      return 0.45; // Half Ironman: légèrement plus haute
    case "Marathon":
      return 0.30; // Marathon: très basse pour endurance
    case "Semi":
      return 0.40; // Semi: modérée
    case "Trail":
    case "TrailShort":
    case "TrailMountain":
    case "TrailUltra":
      return 0.35; // Trail: conservateur
    default:
      return null; // Pas d'estimation pour autres objectifs
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// =============================================
// HELPERS UI
// =============================================

export function getSourceColor(source: VLamaxSource): string {
  switch (source) {
    case "test":
      return "text-green-600 dark:text-green-400";
    case "snapshot":
      return "text-blue-600 dark:text-blue-400";
    case "estimé":
      return "text-amber-600 dark:text-amber-400";
    case "inconnu":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function getSourceBgColor(source: VLamaxSource): string {
  switch (source) {
    case "test":
      return "bg-green-100 dark:bg-green-900/30";
    case "snapshot":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "estimé":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "inconnu":
      return "bg-muted";
    default:
      return "bg-muted";
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.4) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "Très fiable";
  if (confidence >= 0.6) return "Fiable";
  if (confidence >= 0.4) return "Modéré";
  if (confidence >= 0.2) return "Faible";
  return "Très faible";
}

// =============================================
// BADGE COMPONENT HELPER
// =============================================

export interface VLamaxBadgeProps {
  vlamax: VLamaxEffectif;
  showDetails?: boolean;
}

export function formatVLamaxDisplay(vlamax: VLamaxEffectif): string {
  if (vlamax.value === null) return "—";
  return vlamax.value.toFixed(2);
}
