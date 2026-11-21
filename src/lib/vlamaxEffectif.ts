import { validTestDate } from "./testMeasurementReview";
import { CRITICAL_POLICY } from "./criticalEfforts";
import { hasBikeVlamaxMeasurementEvidence, hasRunVlamaxMeasurementEvidence, hasLactateProtocol, protocolSport } from "./vlamaxEvidence";
import { compareSnapshotsNewestFirst } from "@/lib/referenceSnapshot";
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
export interface FieldModelRange {
  sport: "bike" | "run";
  low: number;
  high: number;
  method: string;
}
export interface VLamaxDetails {
  fieldRange?: FieldModelRange;
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
  sport?: string | null;
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
  return hasLactateProtocol(t.type, [t.name, t.note, t.raw?.protocol].filter(Boolean).join(" ")) ||
    hasLactateProtocol(t.raw?.source, t.raw?.protocol);
}

function vlamaxTestSport(t: TestCloud) {
  return protocolSport(t.sport) ?? protocolSport([t.type, t.name, t.raw?.protocol].join(" ").replace(/_/g, " "));
}

/** Dated context for the coach. A field estimate never becomes a lactate measurement. */
export function latestSportVlamaxTest(tests: TestCloud[], athleteId: string, sport: "run" | "bike", asOf = new Date().toISOString().slice(0, 10)) {
  const modality = sport === "run" ? "cap" : "velo";
  return tests.flatMap(test => {
    if (test.athlete_id !== athleteId || vlamaxTestSport(test) !== modality ||
        test.vlamax == null || !Number.isFinite(test.vlamax) || test.vlamax <= 0) return [];
    const date = validTestDate(test.raw?.testDate) ? test.raw.testDate as string : test.date?.slice(0, 10);
    if (!validTestDate(date) || date > asOf) return [];
    return [{ sport, date, value: test.vlamax, lactate: isLabMeasuredVlamaxTest(test) }];
  }).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

interface SnapshotCloud {
  id: string;
  athlete_id: string;
  date: string;
  created_at?: string | null;
  source?: string | null;
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
  tte_observed_min_run?: number | null;
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
  asOf?: string;
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
  /**
   * Records de performance course (Nolio `nolio_records` cat="par") —
   * 400m / 1km / 5km / 10km en secondes. Si fournis, alimentent
   * `calibrateVLamaxFromRaceRecords` dans le fallback Score G (vlamaxRunV2Enhanced)
   * pour améliorer la précision de la VLamax course.
   * Voir helper async `fetchAthleteRaceRecords` dans `src/lib/effectiveRefs.ts`.
   */
  raceRecords?: import("./v2/vlamaxRunV2Enhanced").RaceRecordsInput | null;
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

function documentedSprint(test: TestCloud | undefined, sport: SportContext): boolean {
  const raw = test?.raw;
  if (!test || !raw || raw.conditionsConfirmed !== true || typeof raw.sensor !== "string" || !raw.sensor.trim() || vlamaxTestSport(test) !== sport) return false;
  const run = sport === "cap";
  if (raw.protocolId !== (run ? "run_vlamax_sprint_15s_12min" : "bike_vlamax_sprint_15s")) return false;
  const reference = run ? raw.dist_12min : raw.ftp_reference;
  const sprints = (run ? [raw.dist_sprint_1, raw.dist_sprint_2] : [raw.power15s_1, raw.power15s_2, raw.power15s_3])
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0).sort((a,b) => b-a);
  return Number.isFinite(reference) && reference > 0 && sprints.length >= 2 &&
    (sprints[0] - sprints[1]) / (run ? sprints[0] : (sprints[0] + sprints[1]) / 2) <= 0.05;
}

function fieldRange(v2: VLamaxV2Result, date: string | undefined, qualified: boolean, method: string, asOf: string): FieldModelRange | undefined {
  const age = validTestDate(date) ? (Date.parse(asOf) - Date.parse(date)) / 86400000 : NaN;
  if (!qualified || !(age >= 0 && age <= CRITICAL_POLICY.maxAgeDays) || !v2.range || v2.variationWarning || !v2.effective ||
      v2.range.low > v2.effective || v2.range.high < v2.effective) return;
  return { ...v2.range, sport: v2.sport === "cap" ? "run" : "bike", method };
}

function computeDataAgeDays(dateStr: string | undefined, asOf: string): number {
  if (!dateStr) return 0;
  try {
    return Math.max(0, Math.floor((Date.parse(asOf) - new Date(dateStr.slice(0,10)).getTime()) / 86400000));
  } catch { return 0; }
}

// =============================================
// FONCTION PRINCIPALE (V2 Staff-Grade)
// =============================================

export function computeVLamaxEffectif(params: ComputeVLamaxEffectifParams): VLamaxEffectif {
  const { athleteId, objectif, activeSnapshotId, tests, snapshots, previousEffective, sportOverride, raceRecords, asOf = new Date().toISOString().slice(0, 10) } = params;


  // Déterminer le snapshot effectif
  const athleteSnapshots = snapshots.filter(s => s.athlete_id === athleteId);
  let effectiveSnapshot: SnapshotCloud | null = null;
  
  if (athleteSnapshots.length > 0) {
    if (activeSnapshotId) {
      effectiveSnapshot = athleteSnapshots.find(s => s.id === activeSnapshotId) || null;
    }
    if (!effectiveSnapshot) {
      effectiveSnapshot = [...athleteSnapshots].sort(compareSnapshotsNewestFirst)[0];
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
    hasRunVlamaxMeasurementEvidence(effectiveSnapshot)
  ) {
    const ageDays = computeDataAgeDays(effectiveSnapshot.date, asOf);
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
  // Verrou uniquement avec une preuve de mesure : source labo explicite, ou
  // saisie en mode Staff (le coach déclare une mesure lactate de laboratoire).
  // Une VLamax estimée stockée ailleurs n'est jamais présentée comme mesurée.
  if (
    sport === "velo" &&
    effectiveSnapshot &&
    effectiveSnapshot.vlamax != null &&
    effectiveSnapshot.vlamax > 0 &&
    hasBikeVlamaxMeasurementEvidence(effectiveSnapshot)
  ) {
    const ageDays = computeDataAgeDays(effectiveSnapshot.date, asOf);
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
  const athleteTests = tests.filter(t => {
    if (t.athlete_id !== athleteId || t.vlamax == null || !Number.isFinite(t.vlamax) || t.vlamax <= 0) return false;
    const modality = vlamaxTestSport(t);
    // Older unlabelled sprints were cycling estimates. They cannot certify a lactate protocol.
    return modality === sport || (sport === "velo" && !t.sport && modality == null && !isLabMeasuredVlamaxTest(t));
  });
  const labTests = athleteTests.filter(isLabMeasuredVlamaxTest);
  const recentDate = (d: unknown) => validTestDate(d) && d <= asOf && (Date.parse(asOf) - Date.parse(d)) / 86400000 <= CRITICAL_POLICY.maxAgeDays;
  const reviewed = athleteTests.filter(t => documentedSprint(t, sport) && recentDate(t.raw.testDate));
  const structuredBike = sport === 'velo' && effectiveSnapshot?.source === 'bike_track_day' && recentDate(effectiveSnapshot.date) &&
    Number(effectiveSnapshot.p30s_w) > Number(effectiveSnapshot.map5min_w) && Number(effectiveSnapshot.map5min_w) > Number(effectiveSnapshot.ftp) && Number(effectiveSnapshot.ftp) > 0;
  const structuredRun = sport === 'cap' && effectiveSnapshot?.source === 'track_day' && recentDate(effectiveSnapshot.date) &&
    Number(effectiveSnapshot.sprint_15s_distance) > 0 && Number(effectiveSnapshot.vma) > 0 && Number(effectiveSnapshot.pace_threshold_sec_per_km) > 0;
  const candidates = labTests.length ? labTests : reviewed.length ? reviewed : structuredBike ? [] : athleteTests;

  if (candidates.length > 0 && (sport !== "cap" || labTests.length > 0 || (reviewed.length > 0 && !structuredRun))) {
    const sortedTests = [...candidates].sort((a, b) => {
      const dateA = validTestDate(a.raw?.testDate) ? a.raw.testDate : a.date || a.created_at || "";
      const dateB = validTestDate(b.raw?.testDate) ? b.raw.testDate : b.date || b.created_at || "";
      return dateB.localeCompare(dateA);
    });
    
    const mostRecentTest = sortedTests[0];
    const testDate = validTestDate(mostRecentTest.raw?.testDate) ? mostRecentTest.raw.testDate : mostRecentTest.date || mostRecentTest.created_at || "";
    const ageDays = computeDataAgeDays(testDate, asOf);
    
    const v2Input: VLamaxV2Input = {
      rawValue: mostRecentTest.vlamax!,
      source: labTests.length ? "test_labo" : "test_terrain",
      sport,
      previousEffective,
      factors: {
        sourceCount: sortedTests.length,
        temporalStability: sortedTests.length > 1 ? computeTestStability(sortedTests) : 0.5,
        dataAgeDays: ageDays,
      },
      sourceLabels: [mostRecentTest.name || mostRecentTest.type || "Test terrain"],
      reason: `Test ${labTests.length ? "lactate" : "terrain"} : ${mostRecentTest.name || mostRecentTest.type}`,
    };
    const v2 = computeVLamaxV2(v2Input);
    return wrapV2Result(v2, {
      fieldRange: fieldRange(v2, mostRecentTest.raw?.testDate, !labTests.length && documentedSprint(mostRecentTest, sport),
        mostRecentTest.name || "Test de terrain", asOf),
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
        tteMin: effectiveSnapshot.tte_observed_min_run ?? null,
        sprint15sDistance: effectiveSnapshot.sprint_15s_distance ?? null,
        runningPowerMax: effectiveSnapshot.running_power_max ?? null,
        runningPowerThreshold: effectiveSnapshot.running_power_threshold ?? null,
        weightKg: weight_kg ?? null,
        vlamaxRunMeasured: hasRunVlamaxMeasurementEvidence(effectiveSnapshot) ? effectiveSnapshot.vlamax_run ?? null : null,
      });

      if (capEst.method !== "insufficient" && capEst.value > 0) {
        const ageDays = computeDataAgeDays(effectiveSnapshot.date, asOf);
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
          fieldRange: fieldRange(v2, effectiveSnapshot.date, effectiveSnapshot.source === "track_day" &&
            capEst.sources.includes("Sprint 15s") && capEst.sources.includes("Seuil/VMA"), "Track Day · sprint et allure soutenue", asOf),
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
          tteMin: effectiveSnapshot.tte_observed_min_run ?? null,
          weightKg: weight_kg ?? null,
          protocolQuality: (effectiveSnapshot.protocol_quality as 1|2|3|4|5) ?? 3,
          vma: effectiveSnapshot.vma ?? null,
          paceThresholdSecPerKm: effectiveSnapshot.pace_threshold_sec_per_km ?? null,
          // M3 — Calibration croisée via records Nolio (400m, 1km, 5km, 10km)
          raceRecords: raceRecords ?? null,
        });


        if (runV2.formula !== "insufficient") {
          const ageDays = computeDataAgeDays(effectiveSnapshot.date, asOf);
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
    // ⚠️ Réservé à sport !== "cap" : ftp/p30s_w/p60s_w/map5min_w/tte_observed_min
    // sont des champs vélo (écrits par Bike Day). Pour un objectif course, ne
    // JAMAIS en dériver une VLamax — mieux vaut "unknown" (bloc D) qu'une
    // estimation glycolytique vélo faussement présentée comme une VLamax course.
    // =============================================
    const hasV2Data = sport === "velo" && ftp != null && ftp > 0 && (
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
        const ageDays = computeDataAgeDays(effectiveSnapshot.date, asOf);
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
          fieldRange: fieldRange(v2, effectiveSnapshot.date, effectiveSnapshot.source === "bike_track_day" &&
            Number(effectiveSnapshot.p30s_w) > Number(effectiveSnapshot.map5min_w) && Number(effectiveSnapshot.map5min_w) > Number(ftp) && Number(ftp) > 0,
            "Bike Day · 30 s, 5 min et FTP", asOf),
          protocol: v2Enhanced.formulaLabel,
          date: effectiveSnapshot.date,
        });
      }
    }
    
    // =============================================
    // C2) LEGACY estimation (FTP/kg + Pmax/kg)
    // ⚠️ Même garde-fou que C1 : FTP/Pmax sont des métriques vélo, réservées
    // à sport !== "cap".
    // =============================================
    const hasMinimumData = sport === "velo" && ftp != null && Number.isFinite(ftp) && ftp > 0 && weight_kg != null && Number.isFinite(weight_kg) && weight_kg > 0;
    
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
      
      const ageDays = computeDataAgeDays(effectiveSnapshot.date, asOf);
      
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

  if (sport === "cap") {
    const test = [...athleteTests].sort((a, b) => (b.date ?? b.created_at ?? "").localeCompare(a.date ?? a.created_at ?? ""))[0];
    const value = test?.vlamax ?? effectiveSnapshot?.vlamax_run;
    if (value != null && Number.isFinite(value) && value > 0) {
      const v2 = computeVLamaxV2({ rawValue: value, source: test ? "test_terrain" : "estimation", sport,
        sourceLabels: [test?.name ?? "Valeur course renseignée"], reason: "Repère course à confirmer par un protocole lactate" });
      return wrapV2Result(v2, { date: test?.date ?? effectiveSnapshot?.date, testName: test?.name,
        fieldRange: fieldRange(v2, test?.raw?.testDate, documentedSprint(test, sport), "Sprints 15 s et effort 12 min", asOf) });
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
