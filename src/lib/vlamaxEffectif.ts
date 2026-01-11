// =============================================
// VLAMAX EFFECTIF - Source unique de vérité
// Architecture scientifique correcte - Two For Coaching Lab
// 
// PRINCIPE FONDAMENTAL:
// Un Snapshot ne doit JAMAIS contenir une donnée qu'il sert à calculer.
// La VLamax doit être traitée comme une donnée DÉRIVÉE, jamais brute.
//
// HIÉRARCHIE DES SOURCES (stricte):
// 1. VLamax mesurée lactate (Staff mode) → confiance 0.95
// 2. VLamax test terrain structuré → confiance 0.75
// 3. VLamax estimée via snapshot → confiance 0.55
// 4. Valeur par défaut → confiance faible + avertissement
// =============================================

// =============================================
// TYPES
// =============================================

export type VLamaxSource = "test" | "snapshot" | "estimated" | "unknown";

// Détails optionnels pour affichage enrichi
export interface VLamaxDetails {
  testType?: string;    // Type du test (ex: "SPRINT_15S", "LACTATE")
  testName?: string;    // Nom du test (ex: "Sprint 15s", "Mesure lactate labo")
  date?: string;        // Date du test ou snapshot
  protocol?: string;    // Protocole utilisé (pour mesure lactate)
}

export interface VLamaxEffectif {
  value: number | null;
  source: VLamaxSource;
  confidence: number; // 0 à 1
  label: string;
  details?: VLamaxDetails; // Détails pour affichage enrichi
  isLocked?: boolean; // true si VLamax mesurée (Staff mode) - désactive estimation
}

// Types pour les données cloud
interface TestCloud {
  athlete_id: string;
  vlamax: number | null;
  date?: string;
  created_at?: string;
  type?: string;   // Type de test (ex: "SPRINT_15S", "LACTATE_LAB")
  name?: string;   // Nom du test
}

interface SnapshotCloud {
  id: string;
  athlete_id: string;
  date: string;
  // VLamax dans snapshot = VLamax mesurée (Staff mode uniquement)
  vlamax?: number | null;
  ftp?: number | null;
  pmax_5s?: number | null;
  weight_kg?: number | null;
}

interface ComputeVLamaxEffectifParams {
  athleteId: string;
  objectif: string;
  activeSnapshotId?: string | null;
  tests: TestCloud[];
  snapshots: SnapshotCloud[];
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

/**
 * Calcule la VLamax effective selon la hiérarchie stricte:
 * 
 * A) VLamax mesurée lactate (snapshot avec source "staff") → confiance 0.95
 *    → Valeur VERROUILLÉE, désactive toute estimation
 * 
 * B) Test terrain structuré avec vlamax non-null → confiance 0.75
 *    → Test all-out, sprint 15s, ramp test, etc.
 * 
 * C) Estimation basée sur ftp/pmax_5s/weight → confiance 0.55
 *    → Heuristique prudente basée sur les données snapshot
 * 
 * D) Aucune donnée → value = null, source = "unknown"
 *    → Avertissement affiché
 */
export function computeVLamaxEffectif(params: ComputeVLamaxEffectifParams): VLamaxEffectif {
  const { athleteId, objectif, activeSnapshotId, tests, snapshots } = params;

  // =============================================
  // STEP 0: Déterminer le snapshot effectif
  // =============================================
  const athleteSnapshots = snapshots.filter(s => s.athlete_id === athleteId);
  let effectiveSnapshot: SnapshotCloud | null = null;
  
  if (athleteSnapshots.length > 0) {
    if (activeSnapshotId) {
      effectiveSnapshot = athleteSnapshots.find(s => s.id === activeSnapshotId) || null;
    }
    if (!effectiveSnapshot) {
      // Prendre le plus récent par date
      effectiveSnapshot = [...athleteSnapshots].sort((a, b) => 
        b.date.localeCompare(a.date)
      )[0];
    }
  }

  // =============================================
  // A) SOURCE SNAPSHOT STAFF (priorité #1 - VLamax mesurée lactate)
  // Cette VLamax vient du mode Staff = mesure laboratoire
  // Elle VERROUILLE la valeur et désactive toute autre source
  // =============================================
  if (effectiveSnapshot && effectiveSnapshot.vlamax != null) {
    return {
      value: Number(effectiveSnapshot.vlamax.toFixed(2)),
      source: "snapshot",
      confidence: 0.95, // Confiance maximale car mesure lactate
      label: "VLamax (mesurée)",
      details: {
        date: effectiveSnapshot.date,
        protocol: "Mesure lactate (Staff mode)"
      },
      isLocked: true // Valeur verrouillée
    };
  }

  // =============================================
  // B) SOURCE TEST TERRAIN (priorité #2)
  // Tests structurés: sprint 15s, all-out, ramp test, etc.
  // =============================================
  const athleteTests = tests.filter(t => t.athlete_id === athleteId && t.vlamax != null);
  
  if (athleteTests.length > 0) {
    // Trier par date décroissante (plus récent d'abord)
    const sortedTests = [...athleteTests].sort((a, b) => {
      const dateA = a.date || a.created_at || "";
      const dateB = b.date || b.created_at || "";
      return dateB.localeCompare(dateA);
    });
    
    const mostRecentTest = sortedTests[0];
    const vlamax = mostRecentTest.vlamax!;
    const testDate = mostRecentTest.date || mostRecentTest.created_at || "";
    
    return {
      value: Number(vlamax.toFixed(2)),
      source: "test",
      confidence: 0.75, // Test terrain = confiance modérée-haute
      label: "VLamax (test terrain)",
      details: {
        testType: mostRecentTest.type,
        testName: mostRecentTest.name,
        date: testDate.slice(0, 10),
      }
    };
  }

  // =============================================
  // C) ESTIMATION (priorité #3)
  // Basée sur FTP/kg et Pmax - heuristique prudente
  // =============================================
  if (effectiveSnapshot) {
    const { ftp, pmax_5s, weight_kg } = effectiveSnapshot;
    
    // Vérifie si on a assez de données pour estimer
    const hasMinimumData = ftp != null && weight_kg != null && weight_kg > 0;
    
    if (hasMinimumData) {
      const ftpKg = ftp! / weight_kg!;
      
      // Heuristique simple et prudente
      let base = 0.45;
      
      // Ajustement selon FTP/kg (athlète endurant = VLamax plus basse)
      if (ftpKg >= 4.5) base -= 0.05;
      if (ftpKg >= 5.0) base -= 0.05;
      if (ftpKg < 3.5) base += 0.05;
      
      // Ajustement selon Pmax (puissance explosive = VLamax plus haute)
      if (pmax_5s != null) {
        if (pmax_5s >= 1100) base += 0.05;
        if (pmax_5s >= 1300) base += 0.03;
        if (pmax_5s < 900) base -= 0.03;
      }
      
      // Clamp entre 0.25 et 0.80
      const estimated = Math.max(0.25, Math.min(0.80, base));
      
      return {
        value: Number(estimated.toFixed(2)),
        source: "estimated",
        confidence: 0.55, // Estimation = confiance modérée
        label: "VLamax (estimé)"
      };
    }
  }

  // =============================================
  // D) UNKNOWN (priorité #4)
  // =============================================
  return {
    value: null,
    source: "unknown",
    confidence: 0.2,
    label: "VLamax (non disponible)"
  };
}

// =============================================
// HELPER
// =============================================

function getEstimatedOrUnknown(objectif: string): VLamaxEffectif {
  // Sans snapshot, on ne peut pas estimer de manière fiable
  // Retourner unknown plutôt qu'une valeur arbitraire
  return {
    value: null,
    source: "unknown",
    confidence: 0.2,
    label: "VLamax (non disponible)"
  };
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
    case "estimated":
      return "text-amber-600 dark:text-amber-400";
    case "unknown":
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
    case "estimated":
      return "bg-amber-100 dark:bg-amber-900/30";
    case "unknown":
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

export function formatVLamaxDisplay(vlamax: VLamaxEffectif): string {
  if (vlamax.value === null) return "—";
  return vlamax.value.toFixed(2);
}

// =============================================
// CONVERSION VERS SCORE ENVELOPE (Staff-Grade)
// =============================================

import { 
  ScoreEnvelope, 
  ScoreSource, 
  buildVLamaxEnvelope 
} from "./scoreEnvelope";

/**
 * Convertit un VLamaxEffectif en ScoreEnvelope universel
 */
export function toVLamaxEnvelope(
  vlamax: VLamaxEffectif, 
  objectif: string
): ScoreEnvelope {
  // Mapper les sources VLamax -> ScoreSource
  const sourceMap: Record<VLamaxSource, ScoreSource> = {
    test: vlamax.isLocked ? "MEASURED" : "ESTIMATED",
    snapshot: "MEASURED",
    estimated: "MODELLED",
    unknown: "UNKNOWN",
  };

  const source = sourceMap[vlamax.source];
  
  // Générer les détails contextuels
  const why: string[] = [];
  const recommendations: string[] = [];

  if (vlamax.details?.testType) {
    why.push(`Test: ${vlamax.details.testName || vlamax.details.testType}`);
  }
  if (vlamax.details?.date) {
    why.push(`Date: ${vlamax.details.date}`);
  }
  if (vlamax.isLocked) {
    why.push("🔒 VLamax verrouillée (mesure lactate)");
  }

  return buildVLamaxEnvelope(
    vlamax.value,
    source,
    vlamax.confidence,
    objectif,
    { why, recommendations }
  );
}
