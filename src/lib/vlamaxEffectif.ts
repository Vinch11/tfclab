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
//
// V2 STAFF-GRADE:
// - Bornage physiologique obligatoire (clamp)
// - Séparation raw vs effective
// - Lissage EWMA anti-bruit
// - Marge d'erreur ±
// - Score de confiance visible staff
// =============================================

import {
  computeVLamaxV2,
  VLamaxV2Result,
  VLamaxV2Source,
  VLamaxV2Input,
  SportContext,
  CalibrationLogEntry,
  PHYSIOLOGICAL_BOUNDS,
  clampVLamax,
  formatVLamaxAthlete,
  formatVLamaxStaff,
  formatVLamaxRange,
  getV2SourceColor,
  getV2SourceBgColor,
  getV2SourceLabel,
  getV2SourceEmoji,
  getV2ConfidenceColor,
  getV2ConfidenceLabel,
  VLAMAX_V2_ACADEMY_TEXT,
  type ErrorMarginFactors,
} from "./v2/vlamaxV2Engine";

import { computeVLamaxBikeV2Enhanced } from "./v2/vlamaxBikeV2Enhanced";
import { computeVLamaxRunV2Enhanced } from "./v2/vlamaxRunV2Enhanced";
import { estimateVLamaxCap } from "./v2/vlamaxCapEstimator";

// Re-export V2 types for consumers
export type { VLamaxV2Result, VLamaxV2Source, CalibrationLogEntry, SportContext, ErrorMarginFactors };
export {
  computeVLamaxV2,
  PHYSIOLOGICAL_BOUNDS,
  clampVLamax,
  formatVLamaxAthlete,
  formatVLamaxStaff,
  formatVLamaxRange,
  getV2SourceColor,
  getV2SourceBgColor,
  getV2SourceLabel,
  getV2SourceEmoji,
  getV2ConfidenceColor,
  getV2ConfidenceLabel,
  VLAMAX_V2_ACADEMY_TEXT,
};

// =============================================
// TYPES (legacy compat)
// =============================================

export type VLamaxSource = "test" | "snapshot" | "estimated" | "unknown";

// Détails optionnels pour affichage enrichi
export interface VLamaxDetails {
  testType?: string;
  testName?: string;
  date?: string;
  protocol?: string;
}

export interface VLamaxEffectif {
  value: number | null;
  source: VLamaxSource;
  confidence: number;
  label: string;
  details?: VLamaxDetails;
  isLocked?: boolean;
  /** V2: marge d'erreur ± */
  errorMargin?: number;
  /** V2: plage effective */
  range?: { low: number; high: number };
  /** V2: warning de variation */
  variationWarning?: boolean;
  variationMessage?: string;
  /** V2: valeur brute (staff only) */
  rawValue?: number;
  /** V2: résultat complet V2 */
  v2?: VLamaxV2Result;
}

// Types pour les données cloud
interface TestCloud {
  athlete_id: string;
  vlamax: number | null;
  date?: string;
  created_at?: string;
  type?: string;
  name?: string;
  note?: string | null;
  raw?: any;
}

/**
 * Détermine si un test VLamax provient d'une mesure laboratoire (prise de sang lactate
 * post-effort). Pour le sport CAP, seules les mesures labo doivent court-circuiter
 * `vlamaxCapEstimator` (source PRIMAIRE — voir mémoire `cap-vlamax-unified-source`).
 *
 * Tous les tests terrain (Sprint 15s CAP, dérivations Score G, saisies coach sans
 * lactate) sont reclassés en fallback : ils ne dominent l'estimateur unifié que si
 * celui-ci renvoie `insufficient`.
 */
function isLabMeasuredVlamaxTest(t: TestCloud): boolean {
  const type = (t.type || "").toUpperCase();
  if (type === "LACTATE_LAB" || type === "VLAMAX_LAB" || type === "LAB") return true;
  const haystack = `${t.name || ""} ${t.note || ""} ${t.raw?.source || ""} ${t.raw?.protocol || ""}`.toLowerCase();
  if (/(labo|lactat[e]? lab|prise de sang|blood lactate|lab measurement)/.test(haystack)) return true;
  return false;
}

function isLabMeasuredVlamaxSnapshot(s: SnapshotCloud): boolean {
  const source = (s.vlamax_source || "").toLowerCase();
  if (["lab", "labo", "lactate_lab", "vlamax_lab"].includes(source)) return true;
  const haystack = `${s.vlamax_source || ""} ${s.vlamax_protocol || ""}`.toLowerCase();
  return /(labo|lactat[e]? lab|prise de sang|blood lactate|lab measurement)/.test(haystack);
}

/**
 * Détecte un test VLamax provenant d'un protocole CAP/course (sprint terrain
 * en running). Ces tests ne sont PAS représentatifs de la glycolyse vélo et
 * doivent être exclus du pipeline `sport=velo` pour éviter qu'un sprint CAP
 * récent (ex. "Sprint 15s CAP" 0.71) ne masque la VLamax vélo réelle.
 */
function isCapSpecificVlamaxTest(t: TestCloud): boolean {
  const type = (t.type || "").toLowerCase();
  if (type.includes("cap") || type.includes("run")) return true;
  const haystack = `${t.name || ""} ${t.note || ""} ${t.raw?.source || ""} ${t.raw?.protocol || ""}`.toLowerCase();
  return /(\bcap\b|course à pied|running|run\b|sprint.*cap|cap.*sprint)/.test(haystack);
}

interface SnapshotCloud {
  id: string;
  athlete_id: string;
  date: string;
  vlamax?: number | null;
  ftp?: number | null;
  pmax_5s?: number | null;
  weight_kg?: number | null;
  sport_main?: string | null;
  // V2 Enhanced fields
  p30s_w?: number | null;
  p60s_w?: number | null;
  map5min_w?: number | null;
  tte_observed_min?: number | null;
  protocol_quality?: number | null;
  objectif?: string | null;
  vo2max?: number | null;
  // CAP V2 Enhanced fields
  vma?: number | null;
  pace_threshold_sec_per_km?: number | null;
  running_power_threshold?: number | null;
  running_power_max?: number | null;
  running_power_1s?: number | null;
  running_power_5s?: number | null;
  running_power_30s?: number | null;
  running_power_60s?: number | null;
  running_power_5min?: number | null;
  // CAP — VLamax mesurée (sprint lactate / test CAP terrain)
  vlamax_run?: number | null;
  vlamax_source?: string | null;
  vlamax_protocol?: string | null;
  sprint_15s_distance?: number | null;
}

interface ComputeVLamaxEffectifParams {
  athleteId: string;
  objectif: string;
  activeSnapshotId?: string | null;
  tests: TestCloud[];
  snapshots: SnapshotCloud[];
  /** V2: valeur effective précédente (pour EWMA) */
  previousEffective?: number | null;
  /**
   * Override explicite du sport ciblé (utile pour le segment course d'un triathlon
   * → forcer "cap" même si l'objectif global est "IM"/"70.3" qui résout vers "velo").
   */
  sportOverride?: SportContext | null;
}

// =============================================
// HELPERS INTERNES
// =============================================

function snapshotSportToContext(sportMain?: string | null, objectif?: string | null): SportContext {
  if (sportMain === "run" || sportMain === "cap" || sportMain === "course") return "cap";
  if (sportMain === "swim" || sportMain === "natation") return "natation";
  if (sportMain === "bike" || sportMain === "velo" || sportMain === "cycling") return "velo";
  // Fallback : déduire du goal/objectif quand sport_main est manquant
  const g = (objectif || "").toLowerCase();
  if (g) {
    if (/(trail|marathon|semi|half|10k|5k|run|cap|course|ultra)/.test(g)) return "cap";
    if (/(swim|natation|nage)/.test(g)) return "natation";
    if (/(bike|velo|vélo|cycl|gran fondo|granfondo|cyclo)/.test(g)) return "velo";
    if (/(triathlon|ironman|im|703|70\.3)/.test(g)) return "velo"; // tri = bike-dominant par défaut
  }
  return "velo";
}

function mapV2SourceToLegacy(s: VLamaxV2Source): VLamaxSource {
  switch (s) {
    case "test_labo": return "snapshot";
    case "semaine_reference": return "test";
    case "test_terrain": return "test";
    case "estimation": return "estimated";
    case "unknown": return "unknown";
  }
}

function computeDataAgeDays(dateStr?: string): number {
  if (!dateStr) return 0;
  try {
    return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
  } catch { return 0; }
}

// =============================================
// FONCTION PRINCIPALE (V2 Staff-Grade)
// =============================================

export function computeVLamaxEffectif(params: ComputeVLamaxEffectifParams): VLamaxEffectif {
  const { athleteId, objectif, activeSnapshotId, tests, snapshots, previousEffective, sportOverride } = params;

  // Déterminer le snapshot effectif
  const athleteSnapshots = snapshots.filter(s => s.athlete_id === athleteId);
  let effectiveSnapshot: SnapshotCloud | null = null;
  
  if (athleteSnapshots.length > 0) {
    if (activeSnapshotId) {
      effectiveSnapshot = athleteSnapshots.find(s => s.id === activeSnapshotId) || null;
    }
    if (!effectiveSnapshot) {
      effectiveSnapshot = [...athleteSnapshots].sort((a, b) => 
        b.date.localeCompare(a.date)
      )[0];
    }
  }

  const sport: SportContext = sportOverride
    ?? snapshotSportToContext(effectiveSnapshot?.sport_main, objectif);

  // =============================================
  // A0) SOURCE CAP MESURÉE LABO (vlamax_run)
  // Priorité absolue uniquement si la valeur est une vraie mesure lactate labo.
  // Les anciennes valeurs terrain/snapshot ne doivent pas masquer vlamaxCapEstimator.
  // =============================================
  if (
    sport === "cap" &&
    effectiveSnapshot &&
    effectiveSnapshot.vlamax_run != null &&
    effectiveSnapshot.vlamax_run > 0 &&
    isLabMeasuredVlamaxSnapshot(effectiveSnapshot)
  ) {
    const ageDays = computeDataAgeDays(effectiveSnapshot.date);
    const protocolLabel = effectiveSnapshot.vlamax_protocol || "Test CAP (sprint lactate)";
    const v2Input: VLamaxV2Input = {
      rawValue: effectiveSnapshot.vlamax_run,
      source: "test_labo",
      sport,
      previousEffective,
      factors: { sourceCount: 1, temporalStability: 0.1, dataAgeDays: ageDays },
      sourceLabels: [protocolLabel],
      reason: `VLamax CAP mesurée (${protocolLabel}) — valeur verrouillée`,
    };
    const v2 = computeVLamaxV2(v2Input);
    return wrapV2Result(v2, {
      testType: "LACTATE_LAB",
      date: effectiveSnapshot.date,
      protocol: protocolLabel,
    });
  }

  // =============================================
  // A) SOURCE SNAPSHOT STAFF (VLamax mesurée lactate — bike/global)
  // ⚠️ Pour un athlète CAP/Trail, le champ `vlamax` du snapshot représente
  // la VLamax vélo et n'est PAS représentatif de la glycolyse en course.
  // On l'ignore donc pour laisser la priorité à la chaîne CAP (vlamax_run
  // mesurée → estimation CAP V2 via VMA/seuil/sprint/power).
  // =============================================
  if (sport !== "cap" && effectiveSnapshot && effectiveSnapshot.vlamax != null) {
    const ageDays = computeDataAgeDays(effectiveSnapshot.date);
    const v2Input: VLamaxV2Input = {
      rawValue: effectiveSnapshot.vlamax,
      source: "test_labo",
      sport,
      previousEffective,
      factors: { sourceCount: 1, temporalStability: 0.1, dataAgeDays: ageDays },
      sourceLabels: ["Mesure lactate (Staff mode)"],
      reason: "VLamax mesurée — valeur verrouillée",
    };
    const v2 = computeVLamaxV2(v2Input);
    return wrapV2Result(v2, {
      testType: "LACTATE_LAB",
      date: effectiveSnapshot.date,
      protocol: "Mesure lactate (Staff mode)",
    });
  }

  // =============================================
  // B) SOURCE TEST TERRAIN
  // ⚠️ Pour le sport CAP : seuls les tests LABO mesurés (lactate post-sprint /
  // rampe lactate) priment sur l'estimateur unifié `vlamaxCapEstimator` qui est
  // la source PRIMAIRE (mémoire `cap-vlamax-unified-source`). Les tests terrain
  // non-labo (Sprint 15s, Score G, saisies coach) sont reclassés en fallback :
  // ils ne sont consultés que si l'estimateur renvoie `insufficient` (bloc D).
  // =============================================
  const athleteTestsAll = tests.filter(t => t.athlete_id === athleteId && t.vlamax != null);
  const athleteTests = sport === "cap"
    ? athleteTestsAll.filter(isLabMeasuredVlamaxTest)
    // Pour sport=velo/natation : exclure les tests CAP-spécifiques (Sprint 15s CAP, etc.)
    // qui mesurent la glycolyse en course et polluent la VLamax vélo.
    : athleteTestsAll.filter(t => !isCapSpecificVlamaxTest(t));
  
  if (athleteTests.length > 0) {
    const sortedTests = [...athleteTests].sort((a, b) => {
      const dateA = a.date || a.created_at || "";
      const dateB = b.date || b.created_at || "";
      return dateB.localeCompare(dateA);
    });
    
    const mostRecentTest = sortedTests[0];
    const testDate = mostRecentTest.date || mostRecentTest.created_at || "";
    const ageDays = computeDataAgeDays(testDate);
    
    const v2Input: VLamaxV2Input = {
      rawValue: mostRecentTest.vlamax!,
      source: "test_terrain",
      sport,
      previousEffective,
      factors: {
        sourceCount: sortedTests.length,
        temporalStability: sortedTests.length > 1 ? computeTestStability(sortedTests) : 0.5,
        dataAgeDays: ageDays,
      },
      sourceLabels: [mostRecentTest.name || mostRecentTest.type || "Test terrain"],
      reason: `Test terrain: ${mostRecentTest.name || mostRecentTest.type}`,
    };
    const v2 = computeVLamaxV2(v2Input);
    return wrapV2Result(v2, {
      testType: mostRecentTest.type,
      testName: mostRecentTest.name,
      date: testDate.slice(0, 10),
    });
  }

  // =============================================
  // C) ESTIMATION (interpolation continue)
  // =============================================
  if (effectiveSnapshot) {
    const { ftp, pmax_5s, weight_kg } = effectiveSnapshot;
    
    // =============================================
    // C0) UNIFIED CAP ESTIMATOR (source principale)
    // - vlamaxCapEstimator = source dominante (intègre Sprint 15s, Pace/VMA,
    //   Puissance course, Modèle C inverse, mesure labo, économie, TTE)
    // - computeVLamaxRunV2Enhanced = fallback Score G running power si
    //   l'estimateur principal renvoie "insufficient"
    // =============================================
    if (sport === "cap") {
      const capEst = estimateVLamaxCap({
        vma: effectiveSnapshot.vma ?? null,
        paceThresholdSecPerKm: effectiveSnapshot.pace_threshold_sec_per_km ?? null,
        tteMin: effectiveSnapshot.tte_observed_min ?? null,
        sprint15sDistance: effectiveSnapshot.sprint_15s_distance ?? null,
        runningPowerMax: effectiveSnapshot.running_power_max ?? null,
        runningPowerThreshold: effectiveSnapshot.running_power_threshold ?? null,
        vlamaxRunMeasured: isLabMeasuredVlamaxSnapshot(effectiveSnapshot) ? effectiveSnapshot.vlamax_run ?? null : null,
      });

      if (capEst.method !== "insufficient" && capEst.value > 0) {
        const ageDays = computeDataAgeDays(effectiveSnapshot.date);
        const v2Input: VLamaxV2Input = {
          rawValue: capEst.value,
          source: "estimation",
          sport,
          previousEffective,
          factors: {
            sourceCount: capEst.sources.length,
            temporalStability: 0.3,
            dataAgeDays: ageDays,
          },
          sourceLabels: capEst.sources.map(s => `CAP: ${s}`),
          reason: `VLamax CAP unifié (${capEst.method})`,
        };
        const v2 = computeVLamaxV2(v2Input);
        v2.confidence = Math.max(v2.confidence, capEst.confidence * 0.95);
        // Bypass EWMA : l'estimateur CAP unifié fait déjà sa propre fusion pondérée
        // multi-sources (Sprint + Pace/VMA + TTE + économie + Modèle C). Un lissage
        // V2 supplémentaire tire la valeur vers un previousEffective potentiellement
        // obsolète (ex. ancien test Score G) et masque le profil glycolytique réel.
        v2.effective = clampVLamax(capEst.value, sport);
        (v2 as any).smoothingApplied = false;
        return wrapV2Result(v2, {
          protocol: `CAP unifié — ${capEst.sources.join(" + ") || capEst.method}`,
          date: effectiveSnapshot.date,
        });
      }

      // Fallback : Score G running power (vlamaxRunV2Enhanced)
      const hasRunPower = effectiveSnapshot.running_power_threshold != null && effectiveSnapshot.running_power_threshold > 0;
      const hasVmaSeuil = effectiveSnapshot.vma != null && effectiveSnapshot.vma > 0
        && effectiveSnapshot.pace_threshold_sec_per_km != null && effectiveSnapshot.pace_threshold_sec_per_km > 0;

      if (hasRunPower || hasVmaSeuil) {
        const runV2 = computeVLamaxRunV2Enhanced({
          runPowerThreshold: effectiveSnapshot.running_power_threshold ?? 0,
          runPower1s: effectiveSnapshot.running_power_1s ?? null,
          runPower5s: effectiveSnapshot.running_power_5s ?? null,
          runPower30s: effectiveSnapshot.running_power_30s ?? null,
          runPower60s: effectiveSnapshot.running_power_60s ?? null,
          runPower5min: effectiveSnapshot.running_power_5min ?? null,
          tteMin: effectiveSnapshot.tte_observed_min ?? null,
          weightKg: weight_kg ?? null,
          protocolQuality: (effectiveSnapshot.protocol_quality as 1|2|3|4|5) ?? 3,
          vma: effectiveSnapshot.vma ?? null,
          paceThresholdSecPerKm: effectiveSnapshot.pace_threshold_sec_per_km ?? null,
        });

        if (runV2.formula !== "insufficient") {
          const ageDays = computeDataAgeDays(effectiveSnapshot.date);
          const v2Input: VLamaxV2Input = {
            rawValue: runV2.value,
            source: "estimation",
            sport,
            previousEffective,
            factors: {
              sourceCount: runV2.sources.length,
              temporalStability: 0.3,
              dataAgeDays: ageDays,
            },
            sourceLabels: runV2.sources.map(s => `CAP fallback: ${s}`),
            reason: `VLamax CAP fallback Score G (${runV2.formulaLabel})`,
          };
          const v2 = computeVLamaxV2(v2Input);
          v2.confidence = Math.max(v2.confidence, runV2.confidence * 0.85);
          return wrapV2Result(v2, {
            protocol: runV2.formulaLabel,
            date: effectiveSnapshot.date,
          });
        }
      }
    }
    
    // =============================================
    // C1) V2 ENHANCED BIKE (P30s, P60s, MAP, TTE) — meilleure estimation
    // =============================================
    const hasV2Data = ftp != null && ftp > 0 && (
      (effectiveSnapshot.p30s_w != null && effectiveSnapshot.p30s_w > 0) ||
      (effectiveSnapshot.p60s_w != null && effectiveSnapshot.p60s_w > 0) ||
      (effectiveSnapshot.map5min_w != null && effectiveSnapshot.map5min_w > 0) ||
      (effectiveSnapshot.tte_observed_min != null && effectiveSnapshot.tte_observed_min > 0)
    );
    
    const v2EnhancedDataCount = [
      effectiveSnapshot.p30s_w != null && effectiveSnapshot.p30s_w > 0,
      effectiveSnapshot.p60s_w != null && effectiveSnapshot.p60s_w > 0,
      effectiveSnapshot.map5min_w != null && effectiveSnapshot.map5min_w > 0,
      effectiveSnapshot.tte_observed_min != null && effectiveSnapshot.tte_observed_min > 0,
    ].filter(Boolean).length;
    
    if (hasV2Data && v2EnhancedDataCount >= 2) {
      const v2Enhanced = computeVLamaxBikeV2Enhanced({
        ftp: ftp!,
        p30s_w: effectiveSnapshot.p30s_w ?? null,
        p60s_w: effectiveSnapshot.p60s_w ?? null,
        map5min_w: effectiveSnapshot.map5min_w ?? null,
        tte_min: effectiveSnapshot.tte_observed_min ?? null,
        pmax_5s: pmax_5s ?? null,
        weight_kg: weight_kg ?? null,
        protocol_quality: (effectiveSnapshot.protocol_quality as 1|2|3|4|5) ?? 3,
        objectif: effectiveSnapshot.objectif ?? objectif,
        vo2max: effectiveSnapshot.vo2max ?? null,
      });
      
      if (v2Enhanced.formula !== "insufficient") {
        const ageDays = computeDataAgeDays(effectiveSnapshot.date);
        const v2Input: VLamaxV2Input = {
          rawValue: v2Enhanced.value,
          source: "estimation",
          sport,
          previousEffective,
          factors: {
            sourceCount: v2Enhanced.sources.length,
            temporalStability: 0.3,
            dataAgeDays: ageDays,
          },
          sourceLabels: v2Enhanced.sources.map(s => `V2: ${s}`),
          reason: `Score G V2 Enhanced (${v2Enhanced.formulaLabel})`,
        };
        const v2 = computeVLamaxV2(v2Input);
        // Override confidence with V2 Enhanced confidence (higher quality)
        v2.confidence = Math.max(v2.confidence, v2Enhanced.confidence * 0.9);
        return wrapV2Result(v2, {
          protocol: v2Enhanced.formulaLabel,
          date: effectiveSnapshot.date,
        });
      }
    }
    
    // =============================================
    // C2) LEGACY estimation (FTP/kg + Pmax/kg)
    // =============================================
    const hasMinimumData = ftp != null && weight_kg != null && weight_kg > 0;
    
    if (hasMinimumData) {
      const ftpKg = ftp! / weight_kg!;
      
      // Interpolation continue FTP/kg → VLamax
      const ftpContribution = 0.55 - (ftpKg - 2.5) * 0.0833;
      
      let estimated: number;
      let sourceCount = 1;
      const sourceLabels: string[] = [`FTP/kg: ${ftpKg.toFixed(2)}`];
      
      if (pmax_5s != null && pmax_5s > 0) {
        const pmaxKg = pmax_5s / weight_kg!;
        const pmaxAdjustment = (pmaxKg - 12) * 0.0125;
        estimated = ftpContribution * 0.65 + (ftpContribution + pmaxAdjustment) * 0.35;
        sourceCount = 2;
        sourceLabels.push(`Pmax/kg: ${pmaxKg.toFixed(1)}`);
      } else {
        estimated = ftpContribution;
      }
      
      const ageDays = computeDataAgeDays(effectiveSnapshot.date);
      
      const v2Input: VLamaxV2Input = {
        rawValue: estimated,
        source: "estimation",
        sport,
        previousEffective,
        factors: {
          sourceCount,
          temporalStability: 0.5,
          dataAgeDays: ageDays,
        },
        sourceLabels,
        reason: "Estimation continue FTP/kg" + (pmax_5s ? " + Pmax/kg" : ""),
      };
      const v2 = computeVLamaxV2(v2Input);
      return wrapV2Result(v2);
    }
  }

  // =============================================
  // D) UNKNOWN
  // =============================================
  const v2 = computeVLamaxV2({
    rawValue: null,
    source: "unknown",
    sport,
    sourceLabels: [],
    reason: "Aucune donnée disponible",
  });
  return wrapV2Result(v2);
}

// =============================================
// WRAPPER V2 → VLamaxEffectif (legacy compat)
// =============================================

function wrapV2Result(v2: VLamaxV2Result, details?: VLamaxDetails): VLamaxEffectif {
  return {
    value: v2.effective,
    source: mapV2SourceToLegacy(v2.source),
    confidence: v2.confidence,
    label: v2.label,
    details,
    isLocked: v2.isLocked,
    errorMargin: v2.errorMargin,
    range: v2.range ?? undefined,
    variationWarning: v2.variationWarning,
    variationMessage: v2.variationMessage,
    rawValue: v2.raw ?? undefined,
    v2,
  };
}

function computeTestStability(tests: TestCloud[]): number {
  const values = tests
    .filter(t => t.vlamax != null)
    .map(t => t.vlamax!);
  if (values.length < 2) return 0.5;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.min(1, cv * 5); // Normalize: CV of 0.2 → stability 1.0
}

// =============================================
// HELPERS UI (legacy compat + V2)
// =============================================

export function getSourceColor(source: VLamaxSource): string {
  switch (source) {
    case "test":      return "text-green-600 dark:text-green-400";
    case "snapshot":   return "text-blue-600 dark:text-blue-400";
    case "estimated":  return "text-amber-600 dark:text-amber-400";
    case "unknown":    return "text-muted-foreground";
    default:           return "text-muted-foreground";
  }
}

export function getSourceBgColor(source: VLamaxSource): string {
  switch (source) {
    case "test":      return "bg-green-100 dark:bg-green-900/30";
    case "snapshot":   return "bg-blue-100 dark:bg-blue-900/30";
    case "estimated":  return "bg-amber-100 dark:bg-amber-900/30";
    case "unknown":    return "bg-muted";
    default:           return "bg-muted";
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
  // V2: utiliser le format athlète (≈) pour les estimations
  if (vlamax.v2) return formatVLamaxAthlete(vlamax.v2);
  return vlamax.value.toFixed(2);
}

/**
 * Formate la VLamax avec une plage adaptative basée sur la confiance
 */
export function formatVLamaxWithRange(vlamax: VLamaxEffectif): string {
  // V2: utiliser le range V2 si disponible
  if (vlamax.v2) return formatVLamaxRange(vlamax.v2);
  
  if (vlamax.value === null) return "—";
  
  const margin = vlamax.errorMargin ?? (
    vlamax.confidence >= 0.9 ? 0.02 :
    vlamax.confidence >= 0.75 ? 0.04 :
    vlamax.confidence >= 0.55 ? 0.06 :
    0.08
  );
  
  if (vlamax.isLocked && margin <= 0.02) {
    return `${vlamax.value.toFixed(2)} mmol/L/s`;
  }
  
  const low = Math.max(0.20, vlamax.value - margin);
  const high = Math.min(1.05, vlamax.value + margin);
  
  return `${vlamax.value.toFixed(2)} [${low.toFixed(2)}–${high.toFixed(2)}]`;
}

/**
 * Retourne une plage de valeurs pour la VLamax
 */
export function getVLamaxRange(vlamax: VLamaxEffectif): { low: number; high: number } {
  if (vlamax.range) return vlamax.range;
  if (vlamax.value === null) return { low: 0.35, high: 0.55 };
  
  const margin = vlamax.errorMargin ?? 0.06;
  return {
    low: Math.max(0.20, vlamax.value - margin),
    high: Math.min(1.05, vlamax.value + margin),
  };
}

// =============================================
// CONVERSION VERS SCORE ENVELOPE (Staff-Grade)
// =============================================

import { 
  ScoreEnvelope, 
  ScoreSource, 
  buildVLamaxEnvelope 
} from "./scoreEnvelope";

export function toVLamaxEnvelope(
  vlamax: VLamaxEffectif, 
  objectif: string
): ScoreEnvelope {
  const sourceMap: Record<VLamaxSource, ScoreSource> = {
    test: vlamax.isLocked ? "MEASURED" : "ESTIMATED",
    snapshot: "MEASURED",
    estimated: "MODELLED",
    unknown: "UNKNOWN",
  };

  const source = sourceMap[vlamax.source];
  
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
  if (vlamax.errorMargin) {
    why.push(`Marge: ± ${vlamax.errorMargin.toFixed(2)}`);
  }
  if (vlamax.variationWarning && vlamax.variationMessage) {
    recommendations.push(vlamax.variationMessage);
  }

  return buildVLamaxEnvelope(
    vlamax.value,
    source,
    vlamax.confidence,
    objectif,
    { why, recommendations }
  );
}
