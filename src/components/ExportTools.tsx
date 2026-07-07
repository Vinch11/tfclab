import { computePotentielEffectif, type PotentielPhysiologiqueEffectif, getWeightsBySport } from "@/lib/potentielPhysiologiqueEffectif";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
import { resolveCompassSportFocus } from "@/lib/sportMainDeduction";
// =============================================
// OUTILS EXPORT PDF – RAPPORT STAFF-GRADE COMPLET
// Two For Coaching Lab – Performance & Metabolic Report
// =============================================

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileText, AlertCircle, Settings2, Eye, ChevronRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PDFPreviewPanel } from "./PDFPreviewPanel";
import { openPrintableHTML } from "@/lib/openPrintableHTML";
import type { DbAthlete, DbSnapshot, DbTest, DbCheckin } from "@/hooks/useCloudData";
import { isRunningFocusModeActive } from "@/lib/runningFocusMode";
// ✅ NEW: Import Calibration Layer
import { 
  blendOutputs,
  computeModelOutputs,
  computeTestOutputs,
  type CalibrationResult,
  type TestData,
  type CalibrationEvidence,
  type EvidenceType,
  CALIBRATION_WINDOW_DAYS,
  computeEvidenceWeight,
} from "@/lib/calibration";
import { generateTestCalibrationSection, type TestCalibrationSection } from "@/lib/calibration/testCalibrationSection";
import { getEffectiveSnapshot, getEffectiveRefs, type EffectiveRefs } from "@/lib/effectiveRefs";
import { computeVLamaxEffectif, type VLamaxEffectif, computeTTEEffectif, type TTEEffectif } from "@/engines/diagnostic";
import { ZonesConfig, computeAbsoluteRange, AthleteRefsForZones } from "@/lib/zonesConfig";
import { TRAINING_ZONES, computeZoneAbsoluteValues, ZONES_METHODOLOGY_NOTE, type AthleteZoneRefs } from "@/lib/trainingZonesDefinition";
import { SEANCES } from "@/types/seances";
import { computeNutritionEstimate, type NutritionEstimate } from "@/lib/nutritionPredictive";
import { computeCAPInjuryRisk, getCAPRiskIcon } from "@/lib/capInjuryRisk";
import { calculateAge, computeAgeAdjustmentIndex, type AgeAdjustmentIndex, interpretVLamaxByAge, getAgeNutritionAdjustment, getAgeAdjustedVLamaxProfil, getVLamaxAgeStatus, type VLamaxProfil } from "@/lib/ageAdjustment";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition, AMBITION_LEVELS_ORDERED, AMBITION_DEFINITIONS } from "@/types/ambitionLevel";
import { getTargetsForAmbition, AMBITION_TARGETS } from "@/lib/physiologicalTargets";
import logoUrl from "@/assets/logo-2fc.png";
import { buildChartePageHTML } from "@/data/charteInterpretation";
// ✅ NEW: Import Compass Scoring et CRR
import { computeCRR, computeChargeScore, getCRRTargets, type ChargeRecenteReference, type ChargeScore } from "@/lib/chargeRecenteReference";
import { computeCompassScores, type CompassScores, type CompassAxisScore } from "@/lib/compassScoring";
import { computeCAPInjuryRisk as computeCAPInjuryRiskEngine } from "@/lib/capInjuryRisk";
import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";
// ✅ NEW: Import FatMax TFCL et Nutrition V2
import { computeFatMaxTFCL, computeFatMaxAnchorPctFTP, type FatMaxTFCLResult, FATMAX_DEFINITIONS, FATMAX_ACADEMY_CONTENT } from "@/lib/v2/fatmaxTFCL";
import { computeNutritionV2, type NutritionPredictiveV2, NUTRITION_PHILOSOPHY } from "@/lib/v2/nutritionV2";
// ✅ NEW: Strategic Roadmap Engine
import { computeStrategicRoadmap, type StrategicRoadmap, type RoadmapPhase as SmartRoadmapPhase, computeLorangStrategy, type LorangStrategyResult, type LorangLeverActivation, type LorangProhibitionRule } from "@/engines/decision";
import { detectUnifiedLimiter, type UnifiedLimiterResult, computeDiagnostic, type DiagnosticInput } from "@/engines/diagnostic";
import { fatigueStateToScore } from "@/lib/fatigueStateMapping";
import { User, Shield, Sparkles } from "lucide-react";
import { SECTION_LABELS, getSectionOrder, getSectionVisibility, DEFAULT_SECTION_ORDER, DEFAULT_REPORT_SECTIONS, REPORT_PRESETS, type ReportPreset } from "./ReportSectionOrderEditor";
// ✅ NEW: Import Disponibilité TFCL™
import { 
  computeDisponibiliteTFCL, 
  type TFCLReadinessInput, 
  type DisponibiliteTFCL,
  PDF_DISPONIBILITE_SECTION,
  DISPONIBILITE_PHILOSOPHY,
  DISPONIBILITE_SCALE
} from "@/lib/v2/disponibiliteTFCL";
// ✅ Import Mader Metabolic Model & Performance Prediction (ESM)
import {
  findSteadyStateLactate,
  findLactateThresholds,
  findFatMax,
  findMLSSPower,
  predictMaderPerformance,
  calculateFatOxidation,
  calculateCarbOxidation,
  calculateTTEatMLSS,
} from "@/lib/v2/maderMetabolicModel";
import { computePerformancePredictions } from "@/lib/v2/performancePrediction";
import { useAthleteRaceRecords } from "@/hooks/useAthleteRaceRecords";
// ✅ NEW: Coaching Compass (5 axes)
import { computeCoachingCompass, type TFCLCoachingCompassResult, type CoachingCompassInput } from "@/lib/coachingCompass";
// ✅ NEW: Import CP/W' model
import { analyzeCriticalPower, generateRecoveryTable, effectiveWprime, type CriticalPowerResult } from "@/lib/v2/criticalPowerModel";
import { computeLactateThresholdsTFCL, TFCL_LACTATE_TABLE } from "@/lib/thresholds/computeLactateThresholdsTFCL";
import { computeCycleIntelligence, snapshotToEngineData } from "@/lib/v2/cycleIntelligence";

// ✅ CHANTIER E — Moteurs Pacing Envelope unifiés (A/B/C/D)
import { computePacingEnvelope, type PacingEnvelopeResult, type RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";
import { computePacingEnvelopeRun, PACING_ZONE_COLORS } from "@/lib/v2/pacingEnvelopeRunning";
import { computeLongDistanceEnvelope, LONG_DISTANCE_THRESHOLD_HOURS, type LongDistanceEnvelopeResult } from "@/lib/v2/pacingEnvelopeLongDistance";

// =============================================
// TYPES
// =============================================

interface ExportToolsProps {
  athlete: DbAthlete;
  snapshots: DbSnapshot[];
  tests: DbTest[];
  checkins?: DbCheckin[];
  staffMode?: boolean;
  ambition?: AmbitionLevel;
  calibrationEvidences?: CalibrationEvidence[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Sections disponibles dans le rapport
export interface ReportSections {
  synthese: boolean;        // Synthèse Exécutive
  compass: boolean;         // Metabolic Performance Compass
  profilMetabolique: boolean; // Profil Métabolique Complet (Radar Chart)
  vlamaxZoneConfidence: boolean; // ⚡ VLamax = Zone × Confiance (graphique signature)
  runMLSSCoherence: boolean; // 🎯 Run MLSS Cohérence (Modèle C — RMSE 2.64%)
  indicateurs: boolean;     // Indicateurs Clés
  pacingEnvelope: boolean;  // Pacing Envelope™ - Discipline Métabolique
  potentielPhysiologiqueRunning: boolean; // Potentiel Physiologique CAP (Running)
  injuryRisk: boolean;      // Risque de Blessure CAP
  nutritionV2: boolean;     // Nutrition Prédictive V2
  fatmaxTFCL: boolean;      // FatMax TFCL
  ambitionTargets: boolean; // Cibles par Niveau d'Ambition
  ambitionPredictions: boolean; // Prédictions d'Ambition
  evolutionCharts: boolean; // Graphiques d'évolution
  ageAdjustment: boolean;   // Ajustement par l'Âge (AAI)
  ambitionLegend: boolean;  // Légende des cibles par ambition
  zones: boolean;           // Zones d'entraînement
  historique: boolean;      // Historique Profils
  tests: boolean;           // Historique Tests
  testsCalibration: boolean; // Tests & Calibration TFCL
  calibrationEvidence: boolean; // Calibration Evidence Summary
  fitImports: boolean;      // Tests Observés (import FIT)
  checkins: boolean;        // Check-ins
  comprendre: boolean;      // Comprendre mes scores
  qualite: boolean;         // Qualité des données
  roadmap: boolean;         // Roadmap Stratégique
  lactateCurve: boolean;     // Courbe de Lactate Simulée (Mader-Heck)
  substrateCurve: boolean;   // Oxydation Lipides / Glucides
  performancePrediction: boolean; // Prédiction de Performance
  facteursLimitants: boolean; // Facteurs Limitants (moteur unifié)
  leviersAction: boolean;    // Leviers d'Action (moteur unifié)
  cpWprimeWbal: boolean;     // CP / W' & Repos Optimaux W'bal
  lactateCorrespondence: boolean; // Correspondances Lactiques TFCL
  cycleIntelligence: boolean; // Cycle Intelligence™
}

interface ExportOptions {
  sections: ReportSections;
  audience?: "athlete" | "staff";
}

// ReportSections interface - defines available sections in PDF export
// DEFAULT_REPORT_SECTIONS is imported from ReportSectionOrderEditor

// Note: DEFAULT_REPORT_SECTIONS is now defined in ReportSectionOrderEditor

// SECTION_LABELS, getSectionOrder and DEFAULT_SECTION_ORDER are imported from ReportSectionOrderEditor

// Payload normalisé pour toutes les sections du rapport
interface ExportPayload {
  athlete: {
    id: string;
    name: string;
    goal: string | null;
    refs: Record<string, number | null>;
  };
  effectiveSnapshot: DbSnapshot | null;
  effectiveRefs: EffectiveRefs;
  vlamax: VLamaxEffectif;
  tte: TTEEffectif;
  potentielPhysiologique: PotentielPhysiologiqueEffectif;
  // Unified Limiter Result (source de vérité)
  unifiedLimiter: UnifiedLimiterResult;
  tests: DbTest[];
  snapshotHistory: DbSnapshot[];
  checkins: DbCheckin[];
  completude: {
    score: number;
    manquants: string[];
  };
  reportDate: string;
  nutritionEstimate: NutritionEstimate | null;
  capInjuryRisk: {
    level: number;
    label: string;
    icon: string;
    globalIndex: number;
    factors: { vlamaxContribution: number; tteContribution: number; chargeContribution: number };
    staffAnalysis: string;
  } | null;
  // CRR et Compass Scores
  crr: ChargeRecenteReference;
  chargeScore: ChargeScore;
  compassScores: CompassScores;
  // ✅ NEW: Age Adjustment Index
  ageAdjustment: {
    age: number | null;
    aai: AgeAdjustmentIndex;
    vlamaxInterpretation: ReturnType<typeof interpretVLamaxByAge>;
    nutritionAdjustment: ReturnType<typeof getAgeNutritionAdjustment>;
  };
  // ✅ NEW: FatMax TFCL
  fatmaxTFCL: FatMaxTFCLResult | null;
  // ✅ NEW: Nutrition V2
  nutritionV2: NutritionPredictiveV2 | null;
  // ✅ NEW: Ambition Targets
  ambition: {
    current: AmbitionLevel;
    label: string;
    icon: string;
    targets: {
      vlamax: { min: number; max: number; optimal: number };
      tte_min: number;
      ftp_kg_min: number;
    };
    allTargets: {
      ambition: AmbitionLevel;
      label: string;
      icon: string;
      targets: {
        vlamax: { min: number; max: number; optimal: number };
        tte_min: number;
        ftp_kg_min: number;
      };
      progress: {
        vlamax: number | null;
        tte: number | null;
        ftpKg: number | null;
        global: number | null;
      };
      isReached: boolean;
      weeksToReach: number | null;
    }[];
  };
  // ✅ NEW: Coaching Compass (5 axes)
  coachingCompass: TFCLCoachingCompassResult;
  // ✅ NEW: Lorang Strategy (leviers dynamiques — cohérence dashboard)
  lorangResult: LorangStrategyResult | null;
  // ✅ NEW: Run MLSS Cohérence (Modèle C — RMSE 2.64% sur N=14 run)
  runMLSS: ReturnType<typeof computeDiagnostic>["runMLSS"] | null;
  // Records de course réels (injectés depuis useAthleteRaceRecords côté composant)
  raceRecords?: import("@/lib/v2/vlamaxRunV2Enhanced").RaceRecordsInput | null;
  // Audience du rapport (dérivée du preset actif) — pilote le rendu, jamais les calculs
  audience?: "athlete" | "staff";
}

// =============================================
// HELPERS
// =============================================

function safe(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function fmt(n: number | null | undefined, d = 2): string {
  return typeof n === "number" && !isNaN(n) ? n.toFixed(d) : "—";
}

function fmtPct(n: number | null | undefined): string {
  return typeof n === "number" && !isNaN(n) ? `${Math.round(n * 100)}%` : "—";
}

function dtStr(iso: string | Date | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return safe(iso);
  }
}

function htmlEscape(s: string): string {
  return safe(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseRefs(refs: unknown): Record<string, number | null> {
  if (!refs || typeof refs !== "object") return {};
  return refs as Record<string, number | null>;
}

function getAthleteRefsForZones(effectiveRefs: EffectiveRefs): AthleteRefsForZones {
  return {
    fcMax: effectiveRefs.fcMax,
    vma: effectiveRefs.vma,
    ftp: effectiveRefs.ftp,
    css: effectiveRefs.css
  };
}

function getObjectifLabel(objectif: string | null): string {
  const labels: Record<string, string> = {
    IM: "Ironman",
    Ironman: "Ironman",
    "703": "70.3",
    Half: "Half Ironman",
    Marathon: "Marathon",
    Semi: "Semi-Marathon",
    Trail: "Trail",
    TrailCourt: "Trail Court",
    TrailLong: "Trail Long",
    Ultra: "Ultra",
    Course: "Course à pied"
  };
  return labels[objectif || ""] || objectif || "—";
}

function buildReportTargetsFromUnifiedLimiter(
  unifiedLimiter: UnifiedLimiterResult,
  objectif: string | null,
  ambition: AmbitionLevel
): {
  vlamaxMin: number;
  vlamaxMax: number;
  vlamaxIdeal: number;
  tteTarget: number;
  ftpKgTarget: number;
} {
  const ambitionTargets = getTargetsForAmbition(objectif || "IM", ambition);
  const gapByMetric = new Map(unifiedLimiter.gapAnalysis.map((gap) => [gap.metric, gap]));

  return {
    // VLamax reste définie par objectif + ambition
    vlamaxMin: ambitionTargets.vlamax.min,
    vlamaxMax: ambitionTargets.vlamax.max,
    vlamaxIdeal: gapByMetric.get("VLamax")?.target ?? ambitionTargets.vlamax.optimal,
    // TTE et FTP/kg proviennent de la cible effectivement utilisée par le moteur unifié (âge + ambition)
    tteTarget: gapByMetric.get("TTE")?.target ?? ambitionTargets.tte_min,
    ftpKgTarget: gapByMetric.get("FTP/kg")?.target ?? ambitionTargets.ftp_kg_min,
  };
}


function zoneAbs(metricKey: string, sportKey: string, zoneKey: string, refs: AthleteRefsForZones): string {
  const metric = ZonesConfig[metricKey];
  if (!metric) return zoneKey;
  const table = metric.sports[sportKey];
  if (!table) return zoneKey;
  const z = table.find((zone) => zone.key === zoneKey);
  if (!z) return zoneKey;
  
  const abs = computeAbsoluteRange(metricKey, sportKey, z, refs);
  return abs && abs.ok 
    ? `${zoneKey} (${z.min}-${z.max}%) → ${abs.display}` 
    : `${zoneKey} (${z.min}-${z.max}%)`;
}

function getStatusIcon(status: "ok" | "warning" | "critical" | undefined): string {
  switch (status) {
    case "ok": return "✅";
    case "warning": return "⚠️";
    case "critical": return "🔴";
    default: return "❔";
  }
}

function getStatusLabel(score: number): string {
  if (score >= 80) return "OK";
  if (score >= 60) return "WARNING";
  return "CRITICAL";
}

// =============================================
// BUILD NUTRITION V2 HTML SECTION
// =============================================

function buildNutritionV2HTML(payload: ExportPayload): string {
  const { nutritionV2, athlete } = payload;
  const isAthlete = payload.audience === "athlete";
  const nutritionTitle = isAthlete ? "🍎 Ton plan nutrition course" : "🍎 Nutrition Prédictive V2 — TFCL™";
  const nutritionEmptyTitle = isAthlete ? "🍎 Ton plan nutrition course" : "🍎 Nutrition Prédictive V2";
  
  if (!nutritionV2) {
    return `
      <section id="nutrition-v2" class="section pagebreakAvoid">
        <h2>${nutritionEmptyTitle}</h2>
        <div class="alert alertWarning">
          <b>⚠️ Données insuffisantes</b><br>
          Le poids est requis pour calculer les besoins nutritionnels. Renseignez le poids dans le snapshot.
        </div>
      </section>
    `;
  }

  const riskBadgeClass = nutritionV2.glycogenRisk === 'low' ? 'badgeSuccess' 
    : nutritionV2.glycogenRisk === 'moderate' ? 'badge' 
    : nutritionV2.glycogenRisk === 'high' ? 'badgeWarning' : 'badgeError';
  
  const riskCardClass = nutritionV2.glycogenRisk === 'low' ? 'cardSuccess' 
    : nutritionV2.glycogenRisk === 'moderate' ? '' 
    : nutritionV2.glycogenRisk === 'high' ? 'cardWarning' : 'cardError';

  const goal = athlete.goal || "IM";
  const segments = generateRaceSegments(goal, nutritionV2);
  const philosophyText = htmlEscape(NUTRITION_PHILOSOPHY.principle.replace(/\n/g, ' '));

  const contributorsHTML = nutritionV2.contributors.map(c => {
    const colorStyle = c.direction === 'up' ? 'var(--warning)' : c.direction === 'down' ? 'var(--success)' : 'var(--muted)';
    const prefix = c.direction === 'up' ? '+' : '';
    return `<tr>
      <td><b>${htmlEscape(c.label)}</b></td>
      <td>${htmlEscape(c.value)}</td>
      <td style="color:${colorStyle};">${prefix}${c.adjustment} g/h</td>
      <td class="muted">${htmlEscape(c.explanation)}</td>
    </tr>`;
  }).join('');

  const segmentsHTML = segments.map(seg => `<tr>
    <td><b>${htmlEscape(seg.name)}</b></td>
    <td>${seg.durationMin} min</td>
    <td>${seg.intensityPct}% FTP</td>
    <td>${seg.carbsPerHour} g/h</td>
    <td><b>${seg.totalCarbs} g</b></td>
    <td class="muted">${htmlEscape(seg.timing)}</td>
  </tr>`).join('');

  const totalCarbs = segments.reduce((sum, s) => sum + s.totalCarbs, 0);

  const recommendationsHTML = nutritionV2.recommendations.map(r => `<li>${htmlEscape(r)}</li>`).join('');

  const warningsHTML = nutritionV2.warnings.length > 0 ? `
    <div class="alert alertWarning mt">
      <b>⚠️ Points d'attention</b>
      <ul style="margin:8px 0 0 0;">
        ${nutritionV2.warnings.map(w => `<li>${htmlEscape(w)}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const riskWordAthlete = nutritionV2.glycogenRisk === 'low' ? 'Faible'
    : nutritionV2.glycogenRisk === 'moderate' ? 'Modéré'
    : nutritionV2.glycogenRisk === 'high' ? 'Élevé' : 'Risque de mur';
  const riskActionAthlete = nutritionV2.glycogenRisk === 'low'
    ? 'Tes réserves d\'énergie tiennent la course, reste régulier sur les apports.'
    : nutritionV2.glycogenRisk === 'moderate'
      ? 'Bien gérer les apports pour éviter le coup de mou en fin de course.'
      : nutritionV2.glycogenRisk === 'high'
        ? 'Risque de coup de mou : respecte scrupuleusement le plan d\'apport, ne saute aucune prise.'
        : 'Risque de mur : sois discipliné sur les apports dès les premières minutes.';

  return `
    <section id="nutrition-v2" class="section pagebreak">
      <h2>${nutritionTitle}</h2>
      
      ${isAthlete ? '' : `<div class="alert alertInfo mb">
        <b>📋 Philosophie TFCL™ :</b> ${philosophyText}
      </div>`}
      
      <div class="card ${riskCardClass}">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;">Besoins glucidiques estimés</div>
            <div class="big" style="margin:8px 0;">${nutritionV2.carbsMin}–${nutritionV2.carbsMax} g/h</div>
            <div style="font-size:14px;font-weight:600;">Valeur centrale : ${nutritionV2.carbsCentral} g/h</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">${isAthlete ? 'Risque énergétique' : 'Risque glycogène'}</div>
            <div style="margin:8px 0;">
              <span class="badge ${riskBadgeClass}" style="font-size:14px;padding:8px 16px;">${isAthlete ? riskWordAthlete : htmlEscape(nutritionV2.glycogenRiskLabel)}</span>
            </div>
            ${isAthlete
              ? `<div class="muted" style="font-size:11px;max-width:200px;">${riskActionAthlete}</div>`
              : `<div class="muted" style="font-size:11px;">Score: ${nutritionV2.glycogenRiskScore}/4</div>`}
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Confiance</div>
            <div class="medium" style="margin:8px 0;">${Math.round(nutritionV2.confidence * 100)}%</div>
            <div class="muted" style="font-size:11px;">${nutritionV2.sportLabel}</div>
          </div>
        </div>
      </div>
      
      <div class="card mt">
        <h3>💡 Pourquoi ce chiffre ?</h3>
        <p style="line-height:1.6;">${htmlEscape(nutritionV2.whyThisNumber)}</p>
      </div>
      
      <div class="card mt">
        <h3>📊 Décomposition du calcul</h3>
        <table>
          <thead>
            <tr><th>Facteur</th><th>Valeur</th><th>Ajustement</th><th>Explication</th></tr>
          </thead>
          <tbody>${contributorsHTML}</tbody>
        </table>
      </div>
      
      <div class="card mt">
        <h3>🏁 Stratégie nutritionnelle par segment</h3>
        <p class="muted mb">Estimation des besoins et timing d'apport pour ${htmlEscape(getObjectifLabel(goal))}</p>
        <table>
          <thead>
            <tr><th>Segment</th><th>Durée</th><th>Intensité</th><th>Apport</th><th>Total</th><th>Timing</th></tr>
          </thead>
          <tbody>
            ${segmentsHTML}
            <tr style="background:var(--soft);font-weight:700;">
              <td colspan="4">TOTAL COURSE</td>
              <td>${totalCarbs} g</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="card mt">
        <h3>✅ Recommandations</h3>
        <ul>${recommendationsHTML}</ul>
      </div>
      
      ${warningsHTML}
      
      <div class="alert alertInfo mt" style="font-size:11px;">
        <b>📋 Disclaimer :</b> ${htmlEscape(nutritionV2.disclaimer)}
      </div>
    </section>
  `;
}

function generateRaceSegments(goal: string, nutrition: NutritionPredictiveV2): Array<{
  name: string;
  durationMin: number;
  intensityPct: number;
  carbsPerHour: number;
  totalCarbs: number;
  timing: string;
}> {
  const baseCarbsPerHour = nutrition.carbsCentral;
  
  if (goal === "IM" || goal === "Ironman") {
    return [
      { name: "Natation", durationMin: 70, intensityPct: 75, carbsPerHour: Math.round(baseCarbsPerHour * 0.3), totalCarbs: Math.round(70 / 60 * baseCarbsPerHour * 0.3), timing: "Gel dans les 10 dernières minutes" },
      { name: "T1", durationMin: 5, intensityPct: 50, carbsPerHour: 0, totalCarbs: 0, timing: "Hydratation uniquement" },
      { name: "Vélo (0-90km)", durationMin: 150, intensityPct: 72, carbsPerHour: baseCarbsPerHour, totalCarbs: Math.round(150 / 60 * baseCarbsPerHour), timing: "Débuter dès 15min, toutes les 15-20min" },
      { name: "Vélo (90-180km)", durationMin: 180, intensityPct: 68, carbsPerHour: Math.round(baseCarbsPerHour * 0.95), totalCarbs: Math.round(180 / 60 * baseCarbsPerHour * 0.95), timing: "Alterner solide/liquide" },
      { name: "T2", durationMin: 5, intensityPct: 50, carbsPerHour: 0, totalCarbs: 0, timing: "Gel rapide + hydratation" },
      { name: "Marathon (0-21km)", durationMin: 120, intensityPct: 78, carbsPerHour: Math.round(baseCarbsPerHour * 0.85), totalCarbs: Math.round(120 / 60 * baseCarbsPerHour * 0.85), timing: "Gel/boisson toutes les 20-25min" },
      { name: "Marathon (21-42km)", durationMin: 150, intensityPct: 72, carbsPerHour: Math.round(baseCarbsPerHour * 0.75), totalCarbs: Math.round(150 / 60 * baseCarbsPerHour * 0.75), timing: "Maintenir apports, coca/gel" }
    ];
  } else if (goal === "70.3" || goal === "703" || goal === "Half") {
    return [
      { name: "Natation", durationMin: 35, intensityPct: 80, carbsPerHour: Math.round(baseCarbsPerHour * 0.3), totalCarbs: Math.round(35 / 60 * baseCarbsPerHour * 0.3), timing: "Gel 5min avant sortie eau" },
      { name: "T1", durationMin: 3, intensityPct: 50, carbsPerHour: 0, totalCarbs: 0, timing: "Hydratation" },
      { name: "Vélo", durationMin: 150, intensityPct: 78, carbsPerHour: baseCarbsPerHour, totalCarbs: Math.round(150 / 60 * baseCarbsPerHour), timing: "Débuter immédiatement, toutes les 15min" },
      { name: "T2", durationMin: 3, intensityPct: 50, carbsPerHour: 0, totalCarbs: 0, timing: "Gel rapide" },
      { name: "Semi-Marathon", durationMin: 100, intensityPct: 85, carbsPerHour: Math.round(baseCarbsPerHour * 0.8), totalCarbs: Math.round(100 / 60 * baseCarbsPerHour * 0.8), timing: "Gel toutes les 25min" }
    ];
  } else if (goal === "Marathon") {
    return [
      { name: "0-10km", durationMin: 50, intensityPct: 82, carbsPerHour: baseCarbsPerHour, totalCarbs: Math.round(50 / 60 * baseCarbsPerHour), timing: "Premier gel à 30min" },
      { name: "10-21km", durationMin: 55, intensityPct: 82, carbsPerHour: baseCarbsPerHour, totalCarbs: Math.round(55 / 60 * baseCarbsPerHour), timing: "Maintenir rythme" },
      { name: "21-30km", durationMin: 45, intensityPct: 80, carbsPerHour: Math.round(baseCarbsPerHour * 0.9), totalCarbs: Math.round(45 / 60 * baseCarbsPerHour * 0.9), timing: "Gel + boisson" },
      { name: "30-42km", durationMin: 60, intensityPct: 78, carbsPerHour: Math.round(baseCarbsPerHour * 0.85), totalCarbs: Math.round(60 / 60 * baseCarbsPerHour * 0.85), timing: "Apports réguliers" }
    ];
  } else if (goal === "Semi") {
    return [
      { name: "0-10km", durationMin: 48, intensityPct: 88, carbsPerHour: baseCarbsPerHour, totalCarbs: Math.round(48 / 60 * baseCarbsPerHour), timing: "Gel à 25min si >1h30" },
      { name: "10-21km", durationMin: 52, intensityPct: 86, carbsPerHour: Math.round(baseCarbsPerHour * 0.9), totalCarbs: Math.round(52 / 60 * baseCarbsPerHour * 0.9), timing: "Second gel vers 15km" }
    ];
  }
  
  // Default
  const dur = (nutrition.targetDurationHours || 3) * 30;
  const int = nutrition.targetIntensityPct || 75;
  return [
    { name: "Première moitié", durationMin: Math.round(dur), intensityPct: Math.round(int), carbsPerHour: baseCarbsPerHour, totalCarbs: Math.round(dur / 60 * baseCarbsPerHour), timing: "Débuter tôt, régularité" },
    { name: "Seconde moitié", durationMin: Math.round(dur), intensityPct: Math.round(int * 0.95), carbsPerHour: Math.round(baseCarbsPerHour * 0.9), totalCarbs: Math.round(dur / 60 * baseCarbsPerHour * 0.9), timing: "Maintenir apports" }
  ];
}

// =============================================
// BUILD FATMAX TFCL HTML SECTION
// =============================================

export function buildFatMaxTFCLHTML(payload: ExportPayload): string {
  const { fatmaxTFCL, effectiveRefs, athlete } = payload;
  const isAthlete = payload.audience === "athlete";
  const fatmaxTitle = isAthlete ? "🔥 FatMax" : "🔥 FatMax TFCL™";
  const fatmaxFullTitle = isAthlete ? "🔥 FatMax — Zone d'Oxydation Lipidique Maximale" : "🔥 FatMax TFCL™ — Zone d'Oxydation Lipidique Maximale";
  const defLabel = isAthlete ? "Définition" : "Définition TFCL™";
  // Label de référence dynamique : "Allure Seuil" en mode Running, "FTP" sinon
  const isRunningMode = isRunningFocusModeActive(athlete?.goal);
  const refLabel = isRunningMode ? "Allure Seuil" : "FTP";
  const refLabelShort = isRunningMode ? "Seuil" : "FTP";
  
  if (!fatmaxTFCL) {
    return `
      <section id="fatmax-tfcl" class="section pagebreakAvoid">
        <h2>${fatmaxTitle}</h2>
        <div class="alert alertWarning">
          <b>⚠️ Données insuffisantes</b><br>
          La VLamax est requise pour estimer la FatMax. Renseignez ou faites estimer la VLamax.
        </div>
      </section>
    `;
  }

  const confidenceBadgeClass = fatmaxTFCL.confidenceLevel === 'HIGH' ? 'badgeSuccess' 
    : fatmaxTFCL.confidenceLevel === 'MEDIUM' ? 'badgeWarning' : 'badgeError';
  
  const zoneColorClass = fatmaxTFCL.metabolicZone === 'lipid_dominant' ? 'success' 
    : fatmaxTFCL.metabolicZone === 'balanced' ? '' : 'warning';

  const minWatts = effectiveRefs.ftp ? Math.round(effectiveRefs.ftp * fatmaxTFCL.minPctFTP / 100) : null;
  const maxWatts = effectiveRefs.ftp ? Math.round(effectiveRefs.ftp * fatmaxTFCL.maxPctFTP / 100) : null;
  const centerWatts = effectiveRefs.ftp ? Math.round(effectiveRefs.ftp * fatmaxTFCL.centerPctFTP / 100) : null;

  const wattsInfo = centerWatts ? `<div class="muted" style="margin-top:4px;">${minWatts}–${maxWatts} W (centre: ${centerWatts} W)</div>` : '';

  const svgMinX = 10 + ((fatmaxTFCL.minPctFTP - 50) / 40) * 380;
  const svgWidth = ((fatmaxTFCL.maxPctFTP - fatmaxTFCL.minPctFTP) / 40) * 380;
  const svgCenterX = 10 + ((fatmaxTFCL.centerPctFTP - 50) / 40) * 380;

  const adjustmentsHTML = fatmaxTFCL.adjustments.map(adj => {
    const valText = adj.id === 'base' ? adj.value + '% ' + refLabelShort : (adj.value > 0 ? '+' : '') + adj.value + '%';
    const dirColor = adj.direction === 'up' ? 'var(--success)' : adj.direction === 'down' ? 'var(--warning)' : 'var(--muted)';
    const dirText = adj.direction === 'up' ? '↑ Hausse' : adj.direction === 'down' ? '↓ Baisse' : '— Neutre';
    return `<tr>
      <td><b>${htmlEscape(adj.label)}</b></td>
      <td>${valText}</td>
      <td style="color:${dirColor};">${dirText}</td>
      <td class="muted">${htmlEscape(adj.explanation)}</td>
    </tr>`;
  }).join('');

  return `
    <section id="fatmax-tfcl" class="section pagebreak">
      <h2>${fatmaxFullTitle}</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 ${defLabel} :</b> ${htmlEscape(FATMAX_DEFINITIONS.official)}
      </div>
      
      
      <div class="card cardHighlight">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;">Zone FatMax estimée</div>
            <div class="big" style="margin:8px 0;">${fatmaxTFCL.minPctFTP}–${fatmaxTFCL.maxPctFTP}% ${refLabelShort}</div>
            <div style="font-size:14px;">Centre : <b>${fatmaxTFCL.centerPctFTP}% ${refLabelShort}</b></div>
            ${wattsInfo}
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Confiance</div>
            <div style="margin:8px 0;">
              <span class="badge ${confidenceBadgeClass}" style="font-size:14px;padding:8px 16px;">${htmlEscape(fatmaxTFCL.confidenceLabel)}</span>
            </div>
            <div class="muted" style="font-size:11px;">${Math.round(fatmaxTFCL.confidence * 100)}%</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Profil métabolique</div>
            <div class="medium ${zoneColorClass}" style="margin:8px 0;">${htmlEscape(fatmaxTFCL.zoneLabel)}</div>
            <div class="muted" style="font-size:11px;">Objectif: ${htmlEscape(fatmaxTFCL.objectifLabel)}</div>
          </div>
        </div>
      </div>
      
      <div class="card mt">
        <h3>📊 Visualisation de la zone FatMax</h3>
        <div style="margin:20px 0;">
          <svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="fatmaxGradPdf" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#16a34a"/>
                <stop offset="40%" style="stop-color:#22c55e"/>
                <stop offset="60%" style="stop-color:#eab308"/>
                <stop offset="100%" style="stop-color:#ef4444"/>
              </linearGradient>
            </defs>
            <rect x="10" y="25" width="380" height="25" rx="4" fill="url(#fatmaxGradPdf)"/>
            <rect x="${svgMinX}" y="20" width="${svgWidth}" height="35" rx="4" fill="rgba(34, 197, 94, 0.3)" stroke="#16a34a" stroke-width="2"/>
            <line x1="${svgCenterX}" y1="15" x2="${svgCenterX}" y2="60" stroke="#111" stroke-width="3"/>
            <text x="10" y="70" font-size="10" fill="#666">50%</text>
            <text x="105" y="70" font-size="10" fill="#666">60%</text>
            <text x="200" y="70" font-size="10" fill="#666">70%</text>
            <text x="295" y="70" font-size="10" fill="#666">80%</text>
            <text x="380" y="70" font-size="10" fill="#666" text-anchor="end">90%</text>
            <text x="${svgCenterX}" y="12" font-size="11" fill="#16a34a" text-anchor="middle" font-weight="700">FatMax</text>
          </svg>
          <div style="text-align:center;margin-top:8px;">
            <span style="display:inline-block;width:20px;height:12px;background:rgba(34, 197, 94, 0.3);border:2px solid #16a34a;border-radius:2px;margin-right:6px;"></span>
            <span class="muted" style="font-size:11px;">Zone FatMax (${fatmaxTFCL.minPctFTP}–${fatmaxTFCL.maxPctFTP}% ${refLabelShort})</span>
          </div>
        </div>
      </div>
      
      <div class="card mt">
        <h3>⚙️ Ajustements appliqués au calcul</h3>
        <table>
          <thead><tr><th>Facteur</th><th>Valeur</th><th>Direction</th><th>Explication</th></tr></thead>
          <tbody>${adjustmentsHTML}</tbody>
        </table>
      </div>
      
      <div class="card mt">
        <h3>💡 Interprétation pour l'athlète</h3>
        <p style="line-height:1.6;">${htmlEscape(fatmaxTFCL.interpretation)}</p>
      </div>
      
      <div class="card mt">
        <h3>📋 Note technique (Staff)</h3>
        <p class="muted" style="line-height:1.6;">${htmlEscape(fatmaxTFCL.staffNote)}</p>
      </div>
      
      <div class="card mt">
        <h3>🎯 Applications pratiques</h3>
        <div class="grid2">
          <div>
            <h4>Pour l'entraînement</h4>
            <ul class="muted">
              <li>Zone cible pour les sorties longues Z2</li>
              <li>Travail de la filière lipidique</li>
              <li>Séances "fat adaptation" à jeun (si tolérées)</li>
              <li>Récupération active dans cette zone</li>
            </ul>
          </div>
          <div>
            <h4>Pour la course</h4>
            <ul class="muted">
              <li>Repère pour le pacing sur longue distance</li>
              <li>Si intensité course > FatMax : nutrition critique</li>
              <li>Marge avant basculement glucidique</li>
              <li>Ajuster l'intensité si problèmes digestifs</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="card mt">
        <h3>📈 Comment améliorer sa FatMax</h3>
        <div class="grid3">
          <div style="text-align:center;padding:12px;">
            <div style="font-size:24px;margin-bottom:8px;">↓</div>
            <div style="font-weight:600;margin-bottom:4px;">${isAthlete ? 'Travailler l\'endurance de base' : 'Baisser la VLamax'}</div>
            <div class="muted" style="font-size:11px;">${isAthlete ? 'Sorties longues à basse intensité pour mieux utiliser les graisses' : 'Séances Z2 longues, tempo prolongé'}</div>
          </div>
          <div style="text-align:center;padding:12px;">
            <div style="font-size:24px;margin-bottom:8px;">↑</div>
            <div style="font-weight:600;margin-bottom:4px;">Augmenter la TTE</div>
            <div class="muted" style="font-size:11px;">Blocs de durabilité, séances seuil</div>
          </div>
          <div style="text-align:center;padding:12px;">
            <div style="font-size:24px;margin-bottom:8px;">⚖️</div>
            <div style="font-weight:600;margin-bottom:4px;">Optimiser composition</div>
            <div class="muted" style="font-size:11px;">Ratio masse maigre/grasse</div>
          </div>
        </div>
        <p class="muted mt" style="text-align:center;font-size:11px;">Délai typique : 6-12 semaines pour observer des changements significatifs.</p>
      </div>
      
      <div class="alert alertWarning mt" style="font-size:11px;">
        <b>⚠️ Avertissement scientifique :</b> ${htmlEscape(fatmaxTFCL.disclaimer)}
      </div>
    </section>
  `;
}

// =============================================
// BUILD RACE SIMULATION HTML SECTION (BASIC / PRO)
// =============================================

import {
  computeBasicSimulation,
  computeRaceSimulation,
  checkProModeEligibility,
  normalizeRaceType,
  SIMULATION_DEFINITIONS,
  PDF_SIMULATION_BASIC_SECTION,
  PDF_SIMULATION_PRO_SECTION,
  type BasicSimulationResult,
  type RaceSimulationResult,
  type SimulationMode,
  type RaceType,
  type AmbitionLevel as SimAmbitionLevel,
} from "@/lib/v2/raceSimulation";
import {
  buildNutritionProtocolsSectionHTML,
  type NutritionExportContext,
} from "@/lib/exportNutritionProtocols";

/** Durée par défaut (min) pour chaque type de course — alimente F3-F8 */
const DURATION_BY_GOAL: Record<string, number> = {
  IM: 600,
  '70.3': 300,
  Marathon: 210,
  Semi: 100,
  '10km': 45,
  StartToRun: 35,
  Trail: 240,
  TrailLong: 480,
  Ultra: 720,
  Sprint: 75,
  Olympic: 150,
};

function deriveNutritionContext(
  payload: ExportPayload,
  goal: RaceType,
  staffMode: boolean,
): NutritionExportContext {
  const refs = (payload.athlete.refs ?? {}) as Record<string, unknown>;
  const sport: NutritionExportContext['sport'] =
    goal === 'Marathon' || goal === 'Semi' || goal === '10km'
      ? 'run'
      : goal === 'IM' || goal === '70.3'
      ? 'tri'
      : 'bike';

  return {
    weightKg: payload.effectiveRefs.weightKg ?? null,
    durationMin: DURATION_BY_GOAL[goal] ?? 180,
    sport,
    hasRepeatedEfforts: refs.hasRepeatedEfforts === true,
    bicarbTested: refs.bicarbTested === true,
    vegetarian: refs.vegetarian === true,
    staffMode,
  };
}

function buildRaceSimulationHTML(
  payload: ExportPayload,
  mode: SimulationMode = 'pro'
): string {
  const { effectiveSnapshot, effectiveRefs, vlamax, tte, potentielPhysiologique } = payload;
  // Normaliser le type de course pour éviter les erreurs
  const goal = normalizeRaceType(payload.athlete.goal || "IM");
  
  // Check PRO eligibility
  const eligibility = checkProModeEligibility({
    raceType: goal,
    heat: 'moderate',
    terrain: 'flat',
    ambition: 'perf',
    vlamaxEffectif: vlamax.value,
    vlamaxConfidence: vlamax.confidence ?? 0.5,
    vlamaxDiscipline: 'bike',
    tteMin: tte.tte_min,
    tteConfidence: tte.confidence ?? 0.5,
    fatmaxCenterPct: payload.fatmaxTFCL?.centerPctFTP ?? null,
    fatmaxRange: payload.fatmaxTFCL ? [payload.fatmaxTFCL.minPctFTP, payload.fatmaxTFCL.maxPctFTP] : null,
    disponibiliteScore: 75, // Default decent value for PDF
    disponibiliteLevel: 'good',
    ftp: effectiveRefs.ftp ?? null,
    vma: effectiveRefs.vma ?? null,
    weight: effectiveRefs.weightKg ?? null,
  });

  const actualMode = mode === 'pro' && eligibility.eligible ? 'pro' : 'basic';
  const nutritionCtx = deriveNutritionContext(payload, goal, actualMode === 'pro');
  const nutritionHTML = buildNutritionProtocolsSectionHTML(nutritionCtx);

  if (actualMode === 'basic') {
    return buildBasicSimulationHTML(payload, goal, eligibility) + nutritionHTML;
  } else {
    return buildProSimulationHTML(payload, goal, eligibility) + nutritionHTML;
  }
}

function buildBasicSimulationHTML(
  payload: ExportPayload,
  goal: RaceType,
  eligibility: ReturnType<typeof checkProModeEligibility>
): string {
  const { potentielPhysiologique } = payload;
  
  // Compute basic simulation
  const basicResult = computeBasicSimulation({
    raceType: goal,
    ambition: 'perf' as SimAmbitionLevel,
    heat: 'moderate',
    terrain: 'flat',
    disponibiliteScore: 75,
    disponibiliteLevel: 'good',
    potentielPhysiologiqueScore: potentielPhysiologique.score,
  });
  
  const riskColorClass = basicResult.globalRiskLevel === 'LOW' ? 'badgeSuccess' 
    : basicResult.globalRiskLevel === 'MODERATE' ? 'badge' : 'badgeError';
  
  const zoneColorClass = basicResult.intensityZone === 'controlled' ? 'cardSuccess' 
    : basicResult.intensityZone === 'limit' ? '' : 'cardError';
  
  const guardrailsHTML = basicResult.guardrails.length > 0 
    ? basicResult.guardrails.map(g => `
        <div class="alert ${g.type === 'critical' ? 'alertError' : 'alertWarning'}" style="margin-bottom:8px;">
          <b>${g.icon} ${htmlEscape(g.title)}</b><br>
          ${htmlEscape(g.message)}
        </div>
      `).join('')
    : '';

  const messagesHTML = basicResult.secondaryMessages.length > 0
    ? `<ul style="margin:8px 0;padding-left:20px;">${basicResult.secondaryMessages.map(m => `<li>${htmlEscape(m)}</li>`).join('')}</ul>`
    : '';

  return `
    <section id="race-simulation" class="section pagebreak">
      <h2>🏁 ${htmlEscape(PDF_SIMULATION_BASIC_SECTION.title)}</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Philosophie TFCL™ :</b> ${htmlEscape(SIMULATION_DEFINITIONS.philosophy)}
      </div>
      
      <div style="display:inline-block;margin-bottom:12px;padding:4px 12px;background:#e2e8f0;border-radius:16px;font-size:11px;font-weight:600;">
        MODE BASIC — Décision robuste
      </div>
      
      ${!eligibility.eligible ? `
        <div class="alert alertWarning mb">
          <b>ℹ️ Mode BASIC activé :</b> ${htmlEscape(eligibility.message)}
        </div>
      ` : ''}
      
      <div class="card ${zoneColorClass}" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;">Zone d'intensité conseillée</div>
            <div class="big" style="margin:8px 0;">${htmlEscape(basicResult.intensityZoneLabel)}</div>
            <div style="font-size:14px;">${htmlEscape(basicResult.intensityZoneDescription)}</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Risque global</div>
            <div style="margin:8px 0;">
              <span class="badge ${riskColorClass}" style="font-size:14px;padding:8px 16px;">${htmlEscape(basicResult.globalRiskLabel)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card mt">
        <h3>💬 Message principal</h3>
        <p style="font-size:14px;line-height:1.6;font-weight:500;">${htmlEscape(basicResult.primaryMessage)}</p>
        ${messagesHTML}
      </div>
      
      <div class="card mt">
        <h3>🎯 Scénarios disponibles</h3>
        <table>
          <thead>
            <tr><th>Scénario</th><th>Description</th><th>Recommandé</th></tr>
          </thead>
          <tbody>
            <tr${basicResult.recommendedScenario === 'conservative' ? ' style="background:#dcfce7;"' : ''}>
              <td><b>🛡️ Conservateur</b></td>
              <td>${htmlEscape(basicResult.scenarioLabels.conservative)}</td>
              <td>${basicResult.recommendedScenario === 'conservative' ? '✅ Oui' : ''}</td>
            </tr>
            <tr${basicResult.recommendedScenario === 'optimal' ? ' style="background:#fef9c3;"' : ''}>
              <td><b>⚡ Optimal</b></td>
              <td>${htmlEscape(basicResult.scenarioLabels.optimal)}</td>
              <td>${basicResult.recommendedScenario === 'optimal' ? '✅ Oui' : ''}</td>
            </tr>
            <tr${basicResult.recommendedScenario === 'aggressive' ? ' style="background:#fee2e2;"' : ''}>
              <td><b>🚀 Agressif</b></td>
              <td>${htmlEscape(basicResult.scenarioLabels.aggressive)}</td>
              <td>${basicResult.recommendedScenario === 'aggressive' ? '✅ Oui' : ''}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      ${guardrailsHTML ? `<div class="mt">${guardrailsHTML}</div>` : ''}
      
      <div class="alert alertInfo mt" style="font-size:11px;">
        <b>📋 Disclaimer :</b> ${htmlEscape(basicResult.disclaimer)}
      </div>
    </section>
  `;
}

function buildProSimulationHTML(
  payload: ExportPayload,
  goal: RaceType,
  eligibility: ReturnType<typeof checkProModeEligibility>
): string {
  const { vlamax, tte, effectiveRefs, fatmaxTFCL, nutritionV2 } = payload;
  
  // Compute PRO simulation
  const proResult = computeRaceSimulation({
    raceType: goal,
    heat: 'moderate',
    terrain: 'flat',
    ambition: 'perf' as SimAmbitionLevel,
    vlamaxEffectif: vlamax.value,
    vlamaxConfidence: vlamax.confidence ?? 0.5,
    vlamaxDiscipline: 'bike',
    tteMin: tte.tte_min,
    tteConfidence: tte.confidence ?? 0.5,
    fatmaxCenterPct: fatmaxTFCL?.centerPctFTP ?? null,
    fatmaxRange: fatmaxTFCL ? [fatmaxTFCL.minPctFTP, fatmaxTFCL.maxPctFTP] : null,
    disponibiliteScore: 75,
    disponibiliteLevel: 'good',
    ftp: effectiveRefs.ftp ?? null,
    vma: effectiveRefs.vma ?? null,
    weight: effectiveRefs.weightKg ?? null,
    plannedCarbsGH: nutritionV2?.carbsCentral ?? 60,
  });
  
  const depletionBadgeClass = proResult.globalDepletionRisk === 'LOW' ? 'badgeSuccess' 
    : proResult.globalDepletionRisk === 'MEDIUM' ? 'badge' 
    : proResult.globalDepletionRisk === 'HIGH' ? 'badgeWarning' : 'badgeError';
  
  const confidenceBadgeClass = proResult.timeConfidence >= 0.7 ? 'badgeSuccess' 
    : proResult.timeConfidence >= 0.5 ? 'badge' : 'badgeWarning';

  const guardrailsHTML = proResult.guardrails.length > 0 
    ? proResult.guardrails.map(g => `
        <div class="alert ${g.type === 'critical' ? 'alertError' : 'alertWarning'}" style="margin-bottom:8px;">
          <b>${g.icon} ${htmlEscape(g.title)}</b><br>
          ${htmlEscape(g.message)}
        </div>
      `).join('')
    : '';

  const failureRisksHTML = proResult.failureRisks.length > 0
    ? `
      <div class="card mt">
        <h3>⚠️ Ce qui ferait échouer ce scénario</h3>
        <table>
          <thead>
            <tr><th>Risque</th><th>Description</th><th>Probabilité</th></tr>
          </thead>
          <tbody>
            ${proResult.failureRisks.map(r => {
              const probColor = r.probability === 'high' ? '#dc2626' : r.probability === 'moderate' ? '#f59e0b' : '#16a34a';
              const probLabel = r.probability === 'high' ? 'Élevée' : r.probability === 'moderate' ? 'Modérée' : 'Faible';
              return `<tr>
                <td><b>${htmlEscape(r.label)}</b></td>
                <td>${htmlEscape(r.description)}</td>
                <td style="color:${probColor};font-weight:600;">${probLabel}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `
    : '';

  const scenariosHTML = proResult.scenarios.map(scenario => {
    const scenarioColor = scenario.type === 'conservative' ? '#16a34a' 
      : scenario.type === 'optimal' ? '#f59e0b' : '#dc2626';
    const scenarioIcon = scenario.type === 'conservative' ? '🛡️' 
      : scenario.type === 'optimal' ? '⚡' : '🚀';
    const isRecommended = scenario.type === proResult.recommendedScenario;
    
    const segmentsTableHTML = scenario.segments.slice(0, 5).map(seg => {
      const riskColor = seg.depletionRisk === 'LOW' ? '#16a34a' 
        : seg.depletionRisk === 'MEDIUM' ? '#f59e0b' 
        : seg.depletionRisk === 'HIGH' ? '#dc2626' : '#7c3aed';
      return `<tr>
        <td>${seg.segmentIndex + 1}</td>
        <td>${seg.distanceKm.toFixed(1)} km</td>
        <td>${seg.intensityPct}%</td>
        <td style="color:${riskColor};font-weight:600;">${seg.depletionRisk}</td>
        <td>${seg.glycogenRemaining}%</td>
      </tr>`;
    }).join('');

    const warningsHTML = scenario.warnings.length > 0 
      ? `<div class="muted" style="margin-top:8px;font-size:11px;">⚠️ ${scenario.warnings.join(' | ')}</div>` 
      : '';

    const strengthsHTML = scenario.strengths.length > 0 
      ? `<div style="margin-top:8px;font-size:11px;color:#16a34a;">✅ ${scenario.strengths.join(' | ')}</div>` 
      : '';

    return `
      <div class="card mt" style="border-left:4px solid ${scenarioColor};${isRecommended ? 'background:rgba(251,191,36,0.08);' : ''}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3 style="margin:0;">${scenarioIcon} ${htmlEscape(scenario.label)}</h3>
          ${isRecommended ? '<span class="badge badgeSuccess">✅ RECOMMANDÉ</span>' : ''}
        </div>
        <p class="muted" style="margin-bottom:12px;">${htmlEscape(scenario.description)}</p>
        
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
          <div style="text-align:center;background:var(--soft);padding:10px;border-radius:8px;">
            <div class="muted" style="font-size:10px;">Temps estimé</div>
            <div style="font-size:16px;font-weight:700;">${formatMinutesToTime(scenario.estimatedTimeRange[0])}–${formatMinutesToTime(scenario.estimatedTimeRange[1])}</div>
          </div>
          <div style="text-align:center;background:var(--soft);padding:10px;border-radius:8px;">
            <div class="muted" style="font-size:10px;">Intensité</div>
            <div style="font-size:16px;font-weight:700;">${scenario.targetIntensityPct}% FTP</div>
          </div>
          <div style="text-align:center;background:var(--soft);padding:10px;border-radius:8px;">
            <div class="muted" style="font-size:10px;">Succès</div>
            <div style="font-size:16px;font-weight:700;color:${scenarioColor};">${Math.round(scenario.successProbability * 100)}%</div>
          </div>
          <div style="text-align:center;background:var(--soft);padding:10px;border-radius:8px;">
            <div class="muted" style="font-size:10px;">Risque fuel</div>
            <div style="font-size:16px;font-weight:700;">${scenario.overallFuelRisk}/100</div>
          </div>
        </div>
        
        ${scenario.breakpointKm ? `
          <div class="alert alertWarning" style="margin-bottom:12px;">
            <b>🚨 Point de bascule :</b> km ${scenario.breakpointKm.toFixed(1)} — ${htmlEscape(scenario.breakpointRisk || '')}
          </div>
        ` : ''}
        
        <table style="font-size:11px;">
          <thead>
            <tr><th>#</th><th>Distance</th><th>Intensité</th><th>Risque</th><th>Glycogène</th></tr>
          </thead>
          <tbody>${segmentsTableHTML}</tbody>
        </table>
        
        ${strengthsHTML}
        ${warningsHTML}
      </div>
    `;
  }).join('');

  // Build SVG glycogen chart
  const optimalScenario = proResult.scenarios.find(s => s.type === 'optimal') || proResult.scenarios[0];
  const glycogenChartSVG = buildGlycogenChartSVG(optimalScenario.segments);

  return `
    <section id="race-simulation" class="section pagebreak">
      <h2>🏁 ${htmlEscape(PDF_SIMULATION_PRO_SECTION.title)}</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Philosophie TFCL™ :</b> ${htmlEscape(SIMULATION_DEFINITIONS.philosophy)}
      </div>
      
      <div style="display:inline-block;margin-bottom:12px;padding:4px 12px;background:#8b5cf6;color:white;border-radius:16px;font-size:11px;font-weight:600;">
        MODE PRO — Analyse complète
      </div>
      
      <div class="card cardHighlight" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;">Temps probable</div>
            <div class="big" style="margin:8px 0;">${htmlEscape(proResult.estimatedTimeLabel)}</div>
            <div style="font-size:14px;">${htmlEscape(proResult.raceLabel)} — ${htmlEscape(proResult.ambitionLabel)}</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Confiance</div>
            <div style="margin:8px 0;">
              <span class="badge ${confidenceBadgeClass}" style="font-size:14px;padding:8px 16px;">${htmlEscape(proResult.timeConfidenceLabel)}</span>
            </div>
            <div class="muted" style="font-size:11px;">${Math.round(proResult.timeConfidence * 100)}%</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Risque glycogène</div>
            <div style="margin:8px 0;">
              <span class="badge ${depletionBadgeClass}" style="font-size:14px;padding:8px 16px;">${proResult.globalDepletionRisk}</span>
            </div>
          </div>
        </div>
      </div>
      
      ${guardrailsHTML ? `<div class="mb">${guardrailsHTML}</div>` : ''}
      
      <div class="card mt">
        <h3>📊 Simulation glycogène — Scénario Optimal</h3>
        ${glycogenChartSVG}
        <p class="muted" style="text-align:center;font-size:11px;margin-top:8px;">
          Évolution estimée des réserves de glycogène au fil de la course.
        </p>
      </div>
      
      <h3 style="margin-top:24px;">📈 Comparaison des scénarios</h3>
      ${scenariosHTML}
      
      ${failureRisksHTML}
      
      <div class="card mt">
        <h3>📋 Hypothèses utilisées</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          <div>
            <div class="muted" style="font-size:10px;">Sources utilisées</div>
            <ul style="margin:4px 0;padding-left:16px;font-size:11px;">
              ${proResult.sourcesUsed.map(s => `<li>${htmlEscape(s)}</li>`).join('')}
            </ul>
          </div>
          <div>
            <div class="muted" style="font-size:10px;">Données manquantes</div>
            ${proResult.missingData.length > 0 
              ? `<ul style="margin:4px 0;padding-left:16px;font-size:11px;color:#f59e0b;">${proResult.missingData.map(m => `<li>${htmlEscape(m)}</li>`).join('')}</ul>`
              : `<p style="font-size:11px;color:#16a34a;">Aucune donnée manquante</p>`
            }
          </div>
          <div>
            <div class="muted" style="font-size:10px;">Confiance données</div>
            <p style="font-size:11px;">${Math.round(eligibility.confidence * 100)}%</p>
          </div>
        </div>
      </div>
      
      <div class="alert alertInfo mt" style="font-size:11px;">
        <b>📋 Disclaimer :</b> ${htmlEscape(proResult.disclaimer)}
      </div>
      
      <div class="alert mt" style="font-size:11px;background:#f1f5f9;">
        <b>🔬 Méthodologie :</b> ${htmlEscape(proResult.methodology)}
      </div>
    </section>
  `;
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function buildGlycogenChartSVG(segments: { segmentIndex: number; glycogenRemaining: number; depletionRisk: string }[]): string {
  if (segments.length < 2) return '<p class="muted">Pas assez de segments pour afficher le graphique.</p>';
  
  const width = 500;
  const height = 120;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - 30;
  
  const points = segments.map((seg, i) => ({
    x: padding + (i / (segments.length - 1)) * chartWidth,
    y: 15 + ((100 - seg.glycogenRemaining) / 100) * chartHeight,
    glycogen: seg.glycogenRemaining,
    risk: seg.depletionRisk,
  }));
  
  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${height - 15} L ${points[0].x} ${height - 15} Z`;
  
  const circles = points.map(p => {
    const color = p.risk === 'LOW' ? '#16a34a' : p.risk === 'MEDIUM' ? '#f59e0b' : p.risk === 'HIGH' ? '#dc2626' : '#7c3aed';
    return `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" stroke="#fff" stroke-width="2"/>`;
  }).join('');
  
  // Add horizontal reference lines
  const refLines = [100, 75, 50, 25, 0].map(pct => {
    const y = 15 + ((100 - pct) / 100) * chartHeight;
    return `
      <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 2"/>
      <text x="${padding - 5}" y="${y + 3}" font-size="8" fill="#64748b" text-anchor="end">${pct}%</text>
    `;
  }).join('');
  
  // Add danger zone
  const dangerY = 15 + ((100 - 25) / 100) * chartHeight;
  
  return `
    <svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;">
      <defs>
        <linearGradient id="glycogenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#16a34a" stop-opacity="0.3"/>
          <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#dc2626" stop-opacity="0.3"/>
        </linearGradient>
      </defs>
      
      <!-- Danger zone -->
      <rect x="${padding}" y="${dangerY}" width="${chartWidth}" height="${height - 15 - dangerY}" fill="#fef2f2" rx="4"/>
      <text x="${width - padding - 5}" y="${dangerY + 12}" font-size="8" fill="#dc2626" text-anchor="end">Zone critique</text>
      
      ${refLines}
      
      <!-- Area fill -->
      <path d="${areaD}" fill="url(#glycogenGradient)"/>
      
      <!-- Line -->
      <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Points -->
      ${circles}
      
      <!-- Labels -->
      <text x="${width / 2}" y="${height - 2}" font-size="9" fill="#64748b" text-anchor="middle">Progression course (segments)</text>
      <text x="12" y="${height / 2}" font-size="9" fill="#64748b" text-anchor="middle" transform="rotate(-90 12 ${height / 2})">Glycogène %</text>
    </svg>
  `;
}


function calculateCompletude(
  effectiveRefs: EffectiveRefs,
  effectiveSnapshot: DbSnapshot | null,
  tests: DbTest[],
  vlamax: VLamaxEffectif,
  tte: TTEEffectif
): { score: number; manquants: string[] } {
  const manquants: string[] = [];
  let total = 0;
  let filled = 0;

  // ✅ P2 — Complétude pondérée par la confiance V2 (et non plus binaire présent/absent).
  // Pour VLamax & TTE, on utilise la confiance retournée par le moteur unifié (0..1) :
  // une valeur estimée à forte confiance compte partiellement, plutôt que d'être "manquante".
  const vlamaxIsObserved = vlamax.source !== "estimated" && vlamax.source !== "unknown";
  const tteIsObserved = tte.source === "observed";
  const vlamaxConfidence = Math.max(0, Math.min(1, vlamax.confidence ?? 0));
  const tteConfidence = Math.max(0, Math.min(1, tte.confidence ?? 0));
  const nbVlamaxTests = tests.filter(t => t.vlamax != null).length;

  type Check = { label: string; weight: number; fillRatio: number; missingLabel?: string };
  const checks: Check[] = [
    { label: "FCmax", weight: 10, fillRatio: effectiveRefs.fcMax != null ? 1 : 0 },
    { label: "VMA", weight: 10, fillRatio: effectiveRefs.vma != null ? 1 : 0 },
    { label: "FTP", weight: 15, fillRatio: effectiveRefs.ftp != null ? 1 : 0 },
    { label: "Poids", weight: 10, fillRatio: effectiveRefs.weightKg != null ? 1 : 0 },
    { label: "VO2max", weight: 5, fillRatio: effectiveRefs.vo2max != null ? 1 : 0 },
    { label: "TSS 7d", weight: 10, fillRatio: effectiveSnapshot?.tss_7d != null ? 1 : 0 },
    {
      label: "VLamax (mesure ou estimation fiable)",
      weight: 15,
      // Mesure observée = 100% ; estimation = pondérée par confiance V2 (jusqu'à 80% de crédit)
      fillRatio: vlamaxIsObserved ? 1 : Math.min(0.8, vlamaxConfidence),
      missingLabel: vlamaxIsObserved
        ? undefined
        : vlamaxConfidence < 0.3
          ? "VLamax (estimation peu fiable)"
          : undefined,
    },
    {
      label: "TTE (observé ou estimation fiable)",
      weight: 10,
      fillRatio: tteIsObserved ? 1 : Math.min(0.7, tteConfidence),
      missingLabel: tteIsObserved
        ? undefined
        : tteConfidence < 0.3
          ? "TTE (non observé, fiabilité faible)"
          : undefined,
    },
    {
      label: "Tests VLamax (≥2 pour calibration)",
      weight: 15,
      fillRatio: nbVlamaxTests >= 2 ? 1 : nbVlamaxTests === 1 ? 0.5 : 0,
      missingLabel: nbVlamaxTests >= 2 ? undefined : `Tests VLamax (${nbVlamaxTests}/2)`,
    },
  ];

  for (const check of checks) {
    total += check.weight;
    filled += check.weight * check.fillRatio;
    if (check.fillRatio < 0.5) {
      manquants.push(check.missingLabel ?? check.label);
    }
  }

  return {
    score: Math.round((filled / total) * 100),
    manquants,
  };
}

// =============================================
// BUILD EXPORT PAYLOAD
// =============================================

function buildExportPayload(
  athlete: DbAthlete,
  snapshots: DbSnapshot[],
  tests: DbTest[],
  checkins: DbCheckin[] = [],
  ambition: AmbitionLevel = DEFAULT_AMBITION
): ExportPayload {
  const effectiveSnapshot = getEffectiveSnapshot(athlete, snapshots);
  const effectiveRefs = getEffectiveRefs(athlete, snapshots);
  const athleteSnapshots = snapshots.filter(s => s.athlete_id === athlete.id);
  const athleteTests = tests.filter(t => t.athlete_id === athlete.id);
  const athleteCheckins = checkins.filter(c => c.athlete_id === athlete.id);
  
  // Calculer VLamax effectif (legacy)
  const vlamaxLegacy = computeVLamaxEffectif({
    athleteId: athlete.id,
    objectif: athlete.goal || "IM",
    activeSnapshotId: athlete.active_snapshot_id,
    tests: athleteTests.map(t => ({
      athlete_id: t.athlete_id,
      vlamax: t.vlamax,
      date: t.date,
      type: t.type,
      name: t.name
    })),
    snapshots: athleteSnapshots.map(mapSnapshotToV2)
  });
  
  // ✅ Diagnostic Engine unifié — Source unique de vérité (identique au dashboard)
  const athleteBirthDate = athlete.birth_date ?? ((athlete as unknown as { dateNaissance?: string | null }).dateNaissance ?? null);
  const athleteAge = calculateAge(athleteBirthDate);
  const objectifForLimiter = athlete.goal || "IM";

  // Calculer TTE effectif (legacy) — F33: âge propagé
  const tteLegacy = computeTTEEffectif({
    ftp: effectiveRefs.ftp,
    tss_7d: effectiveSnapshot?.tss_7d,
    tte_mode: effectiveSnapshot?.tte_mode,
    tte_observed_min: effectiveSnapshot?.tte_observed_min,
    objectif: athlete.goal || "IM",
    age: athleteAge,
  });
  const sportFocusForLimiter: "run" | "bike" | "tri" = 
    ["Marathon", "Semi", "Trail", "TrailLong", "TrailCourt", "Ultra", "Course", "10K", "5K", "StartToRun"].includes(objectifForLimiter) ? "run"
    : ["IM", "Ironman", "703", "70.3", "Half", "Olympic", "Sprint"].includes(objectifForLimiter) ? "tri"
    : "bike";
  const ftpKg = effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0
    ? effectiveRefs.ftp / effectiveRefs.weightKg
    : 4.0;
  const cpResultForPayload = analyzeCriticalPower({
    pmax_5s: effectiveSnapshot?.pmax_5s ?? null,
    p30s_w: effectiveSnapshot?.p30s_w ?? null,
    p60s_w: effectiveSnapshot?.p60s_w ?? null,
    map5min_w: effectiveSnapshot?.map5min_w ?? null,
    ftp: effectiveRefs.ftp ?? null,
    weight_kg: effectiveRefs.weightKg ?? null,
  });
  const wprimeKjForPayload = cpResultForPayload ? cpResultForPayload.wprimeKJ : null;

  // Checkin le plus récent
  const sortedCheckins = [...athleteCheckins].sort((a, b) =>
    new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
  );
  const latestCheckin = sortedCheckins[0] || null;

  let diagnostic: ReturnType<typeof computeDiagnostic> | null = null;
  if (effectiveSnapshot) {
    const diagnosticInput: DiagnosticInput = {
      athleteId: athlete.id,
      athleteName: athlete.name,
      age: athleteAge,
      sex: (athlete.sex === "M" || athlete.sex === "F") ? athlete.sex : null,
      weightKg: effectiveSnapshot.weight_kg ?? null,
      objectif: objectifForLimiter,
      ambition: ambition,
      sportFocus: sportFocusForLimiter === "tri" ? "bike" : sportFocusForLimiter,
      vo2max: effectiveSnapshot.vo2max ?? null,
      ftp: effectiveSnapshot.ftp ?? null,
      ftpKg,
      pmax5s: effectiveSnapshot.pmax_5s ?? null,
      p30sW: effectiveSnapshot.p30s_w ?? null,
      p60sW: effectiveSnapshot.p60s_w ?? null,
      map5minW: effectiveSnapshot.map5min_w ?? null,
      vma: effectiveSnapshot.vma ?? null,
      css: effectiveSnapshot.css ?? null,
      vlamax: effectiveSnapshot.vlamax ?? null,
      vlamaxRun: effectiveSnapshot.vlamax_run ?? null,
      vlamaxSource: effectiveSnapshot.vlamax_source ?? null,
      vlamaxProtocol: effectiveSnapshot.vlamax_protocol ?? null,
      vlamaxIsReference: effectiveSnapshot.vlamax_is_reference ?? false,
      tteObservedMin: effectiveSnapshot.tte_observed_min ?? null,
      tteMode: effectiveSnapshot.tte_mode ?? null,
      tss7d: effectiveSnapshot.tss_7d ?? null,
      fatigueState: effectiveSnapshot.fatigue_state ?? null,
      runEconomyScore: effectiveSnapshot.run_economy_score ?? null,
      runHrDriftPct: effectiveSnapshot.run_hr_drift_pct ?? null,
      paceThresholdSecPerKm: effectiveSnapshot.pace_threshold_sec_per_km ?? null,
      runningPower1s: effectiveSnapshot.running_power_1s ?? null,
      runningPower5s: effectiveSnapshot.running_power_5s ?? null,
      runningPower30s: effectiveSnapshot.running_power_30s ?? null,
      runningPower60s: effectiveSnapshot.running_power_60s ?? null,
      runningPower5min: effectiveSnapshot.running_power_5min ?? null,
      runningPowerThreshold: effectiveSnapshot.running_power_threshold ?? null,
      sprint15sDistance: effectiveSnapshot.sprint_15s_distance ?? null,
      bikeCadenceRpm: effectiveSnapshot.bike_cadence_rpm ?? null,
      bikeHrDriftFlag: effectiveSnapshot.bike_hr_drift_flag ?? false,
      protocolQuality: effectiveSnapshot.protocol_quality ?? null,
      wprimeKj: wprimeKjForPayload,
      cpDataQuality: cpResultForPayload?.dataQuality ?? null,
      // Audit 2D F29: ancre FatMax canonique unifiée (computeFatMaxAnchorPctFTP)
      // Formule: clamp(78 − 52·(VLa−0.25) + 0.15·(VO2−50), 48, 82)
      fatmax: computeFatMaxAnchorPctFTP(vlamaxLegacy.value, effectiveSnapshot.vo2max ?? null),
      forceDevMode: effectiveSnapshot.force_development_mode ?? false,
      giIssuesFlag: effectiveSnapshot.gi_issues_flag ?? false,
      checkinData: latestCheckin ? {
        sleep: latestCheckin.sleep,
        fatigue: latestCheckin.fatigue,
        soreness: latestCheckin.soreness,
        stress: latestCheckin.stress,
        motivation: latestCheckin.motivation,
        painFlag: latestCheckin.pain_flag ?? false,
      } : undefined,
      // ✅ Cohérence Dashboard ↔ PDF : on injecte le VLamax effectif déjà résolu
      // (sport-aware via mapSnapshotToV2 + resolveVlamaxForGoal). Sans cela,
      // computeDiagnostic force sport_main selon sportFocus ("bike" pour tri/703)
      // et lit snapshot.vlamax (vélo) au lieu de vlamax_run/CAP → divergence
      // app (0.37) vs export (0.20) constatée sur Quentin (sport_main=run, goal=703).
      vlamaxEffectifPrecomputed: vlamaxLegacy,
    };
    diagnostic = computeDiagnostic(diagnosticInput);
  }

  // ✅ Valeurs alignées sur le diagnostic unifié (cohérence totale Dashboard ↔ PDF)
  const vlamax: VLamaxEffectif = diagnostic ? {
    value: diagnostic.effectifs.vlamax.value,
    confidence: diagnostic.effectifs.vlamax.confidence,
    source: diagnostic.effectifs.vlamax.source,
    label: `VLamax (${diagnostic.effectifs.vlamax.source})`,
  } : vlamaxLegacy;

  const tte: TTEEffectif = diagnostic ? {
    tte_min: diagnostic.effectifs.tte.tte_min,
    confidence: diagnostic.effectifs.tte.confidence,
    source: diagnostic.effectifs.tte.source,
    label: `TTE (${diagnostic.effectifs.tte.source})`,
  } : tteLegacy;

  // ✅ P1 — Score Potentiel Physiologique aligné sur le moteur Diagnostic V2
  // Source unique de vérité : `diagnostic.readiness` + `diagnostic.synthesis` (mêmes valeurs que le Dashboard).
  // Fallback sur le stub legacy uniquement si le diagnostic n'a pas pu être calculé (snapshot manquant).
  let potentielPhysiologique: PotentielPhysiologiqueEffectif;
  if (diagnostic) {
    const readinessV2 = diagnostic.readiness;
    const score = readinessV2.readiness.score;
    const rawScore = readinessV2.readiness.rawScore;
    const confidence = readinessV2.readiness.confidenceGlobal;
    const label = readinessV2.readiness.categoryLabel;
    // Mappe la catégorie V2 vers le code couleur sémantique attendu par les templates HTML
    const colorMap: Record<string, string> = {
      preparation_required: "destructive",
      in_progress: "warning",
      solid: "warning",
      ready: "success",
      peak: "success",
    };
    const color = colorMap[readinessV2.readiness.category] ?? (score >= 80 ? "success" : score >= 60 ? "warning" : "destructive");

    // Mappe les 4 piliers V2 (0-100) vers le format details legacy (sur 25)
    const sources = readinessV2.potential.sources;
    const to25 = (v: number) => Math.round((Math.max(0, Math.min(100, v)) / 100) * 25);
    const details = {
      vlamax: to25(sources.metabolic.value),     // pilier métabolique = VLamax
      endurance: to25(sources.tolerance.value),   // pilier tolérance = TTE/endurance
      puissance: to25(sources.aerobic.value),     // pilier aérobie = puissance/VO2
      fraicheur: to25(sources.robustness.value),  // pilier robustesse = fraîcheur/fatigue
    };

    potentielPhysiologique = {
      score,
      rawScore,
      label,
      color,
      confidence,
      isInsufficient: confidence < 0.3,
      messageStaff: readinessV2.explanation?.why || `Score physiologique: ${score}/100 (${label})`,
      wasCappedByNutrition: false,
      nutritionalCapReason: undefined,
      wasCappedByEconomy: false,
      economyCapReason: undefined,
      reasonsMissing: readinessV2.penalties?.reasons ?? [],
      nutritionalRiskIndex: 0,
      runningEconomy: undefined,
      details,
      // Champs additionnels exposés pour traçabilité (consommés via `[key: string]: any`)
      potential: readinessV2.potential,
      availability: readinessV2.availability,
      governingFactor: readinessV2.potential.mainLimitation ?? null,
      _source: "diagnostic-v2",
    };
  } else {
    // Fallback legacy — uniquement quand aucun snapshot effectif n'est disponible
    potentielPhysiologique = computePotentielEffectif({
      objectif: athlete.goal || "IM",
      vlamaxEffectif: vlamax,
      tteEffectif: tte,
      ftp: effectiveRefs.ftp,
      poids: effectiveRefs.weightKg,
      fatigue_ok: true,
      seance_specifique_validee: false,
      fcMax: effectiveRefs.fcMax,
      athleteAge,
      ambition,
    });
  }

  // ✅ Unified Limiter — directement depuis le diagnostic engine (cohérence totale Dashboard ↔ PDF)
  const unifiedLimiter: UnifiedLimiterResult = diagnostic
    ? diagnostic.limiter
    : detectUnifiedLimiter({
        vo2max: effectiveSnapshot?.vo2max ?? null,
        ftpKg: ftpKg,
        vlamax: vlamax.value,
        wprimeKj: cpResultForPayload ? cpResultForPayload.wprimeKJ : null,
        cpDataQuality: cpResultForPayload ? cpResultForPayload.dataQuality : null,
        tte: tte.tte_min,
        fatmax: null,
        economyScore: effectiveSnapshot?.run_economy_score ?? null,
        availabilityScore: null,
        hasHealthAlerts: false,
        objectif: objectifForLimiter,
        ambition: (ambition as any) || "competitive",
        age: athleteAge,
        vma: effectiveSnapshot?.vma ?? null,
        sportFocus: sportFocusForLimiter,
      });

  // ✅ Compute Lorang Strategy — IDENTIQUE au dashboard (Index.tsx)
  let lorangResult: LorangStrategyResult | null = null;
  try {
    // ✅ P2 — Cibles unifiées (âge + ambition + objectif) issues du moteur Diagnostic V2.
    // Plus aucune valeur hard-codée par paliers d'ambition : on utilise `diagnostic.targets.current`
    // (ObjectiveTargets) et `unifiedLimiter.gapAnalysis` (pour VO2max, non couvert par ObjectiveTargets).
    const objectiveTargets = diagnostic?.targets?.current ?? null;
    const vo2maxGap = unifiedLimiter.gapAnalysis?.find((g: any) => g.metric === "VO2max");
    const vlamaxTarget = objectiveTargets?.vlamax.optimal
      ?? (ambition === "elite" ? 0.35 : ambition === "competitor" ? 0.45 : 0.55);
    const vo2maxTarget = (typeof vo2maxGap?.target === "number" ? vo2maxGap.target : null)
      ?? (ambition === "elite" ? 70 : ambition === "competitor" ? 62 : 55);
    const tteTarget = objectiveTargets?.tte_min
      ?? (ambition === "elite" ? 50 : ambition === "competitor" ? 40 : 35);
    const ftpKgTargetUnified = objectiveTargets?.ftp_kg_min ?? null;
    const disciplineMap: Record<string, 'IM' | '703' | 'marathon' | 'semi' | '10k' | 'cycling' | 'trail'> = {
      'IM': 'IM', 'Ironman': 'IM', '70.3': '703', 'Ironman70.3': '703',
      'Marathon': 'marathon', 'Semi': 'semi', '10K': '10k', '5K': '10k',
      'Trail': 'trail', 'TrailLong': 'trail',
    };
    const discipline = disciplineMap[athlete.goal || 'IM'] || 'IM';
    const ambitionMap: Record<string, 'finisher' | 'age_group' | 'competitor' | 'elite' | 'world_class'> = {
      finisher: 'finisher', age_group: 'age_group', competitor: 'competitor', elite: 'elite', world_class: 'world_class',
    };
    const lorangAmbition = ambitionMap[ambition] || 'age_group';
    const fatigueStateToScoreLorang: Record<string, number> = { fresh: 2, ok: 4, fatigued: 6, high: 8, injured: 10 };
    const fatigueScoreLorang = fatigueStateToScoreLorang[effectiveSnapshot?.fatigue_state || "ok"] ?? 4;
    const availabilityScore = Math.max(0, 100 - fatigueScoreLorang * 10);
    
    lorangResult = computeLorangStrategy({
      physiology: {
        vo2max: effectiveSnapshot?.vo2max ?? null,
        vo2maxTarget,
        ftpKg: ftpKg,
        ftpKgTarget: ftpKgTargetUnified,
        vlamax: vlamax.value,
        vlamaxTarget,
        tte: tte.tte_min,
        tteTarget,
        fatmax: null,
        fatmaxTarget: 0,
        economy: effectiveSnapshot?.run_economy_score ?? null,
      },
      athlete: {
        age: athleteAge,
        discipline,
        ambition: lorangAmbition,
        hasGIIssues: effectiveSnapshot?.gi_issues_flag ?? false,
      },
      availability: {
        score: availabilityScore,
        level: availabilityScore >= 80 ? 'high' : availabilityScore >= 60 ? 'moderate' : availabilityScore >= 40 ? 'low' : 'critical',
        hasAlerts: false,
        hrvOutOfRange2Days: false,
      },
      context: {
        daysToRace: null,
        isRaceWeek: false,
        currentPhase: 'build',
      },
      load: {
        tss7d: effectiveSnapshot?.tss_7d ?? null,
        tss28d: effectiveSnapshot?.tss_7d ? effectiveSnapshot.tss_7d * 4 : null,
      },
      // ✅ Passer le résultat du moteur unifié pour cohérence maximale
      unifiedLimiterResult: {
        primaryLimiter: unifiedLimiter.primaryLimiter,
        gapAnalysis: unifiedLimiter.gapAnalysis,
        aerobicWeaknessDetail: unifiedLimiter.aerobicWeaknessDetail,
      },
    });
  } catch { /* fallback null */ }

  // Calculer complétude
  const completude = calculateCompletude(effectiveRefs, effectiveSnapshot, athleteTests, vlamax, tte);
  
  // Calculer Nutrition Prédictive
  const nutritionEstimate = computeNutritionEstimate({
    vlamax: vlamax.value,
    objectif: athlete.goal || "IM",
    tteMin: tte.tte_min,
    tteTarget: tte.target ?? diagnostic?.targets?.current?.tte_min ?? 50,
    potentielPhysiologique: potentielPhysiologique.score,
    vo2max: effectiveRefs.vo2max,
    weightKg: effectiveRefs.weightKg,
  });
  
  // Calculer CAP Injury Risk
  const capRiskResult = computeCAPInjuryRisk({
    vlamaxValue: vlamax.value,
    tteValue: tte.tte_min,
    objectif: athlete.goal || "IM"
  });
  
  const capInjuryRisk = {
    level: capRiskResult.level,
    label: capRiskResult.label,
    icon: getCAPRiskIcon(capRiskResult.level),
    globalIndex: capRiskResult.level * 25,
    factors: {
      vlamaxContribution: vlamax.value ? Math.min(100, (vlamax.value / 0.55) * 100) : 50,
      tteContribution: tte.tte_min ? Math.max(0, 100 - (tte.tte_min / 60) * 100) : 50,
      chargeContribution: effectiveSnapshot?.tss_7d ? Math.min(100, (effectiveSnapshot.tss_7d / 800) * 100) : 50
    },
    staffAnalysis: capRiskResult.staffAnalysis
  };
  
  // ✅ NEW: Calculer CRR et Compass Scores
  const crr = computeCRR({
    tss7d: effectiveSnapshot?.tss_7d ?? null,
    snapshotDate: effectiveSnapshot?.date ?? null,
    snapshotUpdatedAt: effectiveSnapshot?.updated_at ?? null
  });
  
  const chargeScore = computeChargeScore(crr, athlete.goal || "IM");
  
  const compassScores = computeCompassScores({
    ftp: effectiveRefs.ftp,
    poids: effectiveRefs.weightKg,
    vlamaxEffectif: vlamax,
    tteEffectif: tte,
    crr,
    objectif: athlete.goal || "IM",
    ambition,
    athleteAge
  });
  
  // ✅ sportFocus déjà calculé plus haut (sportFocusForLimiter)
  const objectif = objectifForLimiter;
  const sportFocus = sportFocusForLimiter;

  // ✅ Calculer injury risk pour runners comme dans le dashboard
  let injuryRiskRun = undefined;
  if (sportFocus === "run" || sportFocus === "tri") {
    const levelMap: Record<number, "faible" | "modéré" | "élevé"> = {
      0: "faible",
      1: "faible",
      2: "modéré",
      3: "élevé",
    };
    injuryRiskRun = {
      level: levelMap[capRiskResult.level] || "faible",
      score: capRiskResult.totalScore,
    };
  }

  // ✅ fatigueScore depuis le snapshot (fatigue_state) — snapshot-centric
  const fatigueStateToScore: Record<string, number> = {
    fresh: 2, ok: 4, fatigued: 6, high: 8, injured: 10,
  };
  const fatigueScore = fatigueStateToScore[effectiveSnapshot?.fatigue_state || "ok"] ?? 4;

  return {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      goal: athlete.goal,
      refs: parseRefs(athlete.refs)
    },
    effectiveSnapshot,
    effectiveRefs,
    vlamax,
    tte,
    potentielPhysiologique,
    unifiedLimiter,
    tests: athleteTests,
    snapshotHistory: athleteSnapshots,
    checkins: athleteCheckins,
    completude,
    reportDate: new Date().toISOString(),
    nutritionEstimate,
    capInjuryRisk,
    crr,
    chargeScore,
    compassScores,
    // ✅ NEW: Age Adjustment
    ageAdjustment: (() => {
      const age = athleteAge;
      const aai = computeAgeAdjustmentIndex(age);
      const vlamaxInterpretation = interpretVLamaxByAge(vlamax.value, age);
      const nutritionAdjustment = getAgeNutritionAdjustment(age);
      return { age, aai, vlamaxInterpretation, nutritionAdjustment };
    })(),
    // ✅ NEW: FatMax TFCL
    fatmaxTFCL: computeFatMaxTFCL({
      vlamaxEffectif: vlamax.value,
      vlamaxConfidence: vlamax.confidence,
      vo2maxEffectif: effectiveRefs.vo2max,
      tteEffectif: tte.tte_min,
      tteConfidence: tte.confidence,
      fatigueIndex: fatigueScore ?? null,
      objectif: (athlete.goal || "IM") as "IM" | "70.3" | "Marathon" | "Semi" | "10km" | "Ironman",
      ftp: effectiveRefs.ftp,
    }),
    // ✅ NEW: Nutrition V2
    nutritionV2: computeNutritionV2({
      vlamaxValue: vlamax.value,
      vlamaxConfidence: vlamax.confidence,
      vo2max: effectiveRefs.vo2max,
      tteMin: tte.tte_min,
      sport: ["Marathon", "Semi", "Trail", "TrailLong", "TrailCourt", "Ultra", "Course"].includes(athlete.goal || "") ? "cap" : "velo",
      targetDurationHours: (() => {
        const goal = athlete.goal || "IM";
        const durationMap: Record<string, number> = {
          IM: 10, Ironman: 10, "70.3": 5, "703": 5, Half: 5,
          Marathon: 3.5, Semi: 1.75, Trail: 4, TrailLong: 8, TrailCourt: 2, Ultra: 12,
        };
        return durationMap[goal] || 5;
      })(),
      targetIntensityPct: (() => {
        const goal = athlete.goal || "IM";
        const intensityMap: Record<string, number> = {
          IM: 70, Ironman: 70, "70.3": 78, "703": 78, Half: 78,
          Marathon: 82, Semi: 88, Trail: 75, TrailLong: 65, TrailCourt: 80, Ultra: 60,
        };
        return intensityMap[goal] || 75;
      })(),
      weightKg: effectiveRefs.weightKg,
    }),
    // ✅ NEW: Ambition Targets
    ambition: (() => {
      const objectif = athlete.goal || "IM";
      const currentDef = getAmbitionDefinition(ambition);
      const currentTargets = getTargetsForAmbition(objectif, ambition);
      
      // Calculate progress for each ambition level
      const ftpKg = effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0
        ? effectiveRefs.ftp / effectiveRefs.weightKg
        : null;
      
      const allTargets = AMBITION_LEVELS_ORDERED.map(amb => {
        const def = getAmbitionDefinition(amb);
        const targets = getTargetsForAmbition(objectif, amb);
        
        // Calculate progress for each metric
        // VLamax: lower is better for endurance - progress = (optimal / current) * 100
        // If current <= optimal, progress = 100% (target reached)
        const vlamaxProgress = vlamax.value !== null && vlamax.value > 0
          ? vlamax.value <= targets.vlamax.optimal 
            ? 100 
            : Math.min(100, Math.max(0, (targets.vlamax.optimal / vlamax.value) * 100))
          : null;
        
        const tteProgress = tte.tte_min !== null 
          ? Math.min(100, (tte.tte_min / targets.tte_min) * 100)
          : null;
        
        const ftpKgProgress = ftpKg !== null 
          ? Math.min(100, (ftpKg / targets.ftp_kg_min) * 100)
          : null;
        
        // Global progress (average of available metrics)
        const validProgress = [vlamaxProgress, tteProgress, ftpKgProgress].filter(p => p !== null) as number[];
        const globalProgress = validProgress.length > 0 
          ? validProgress.reduce((sum, p) => sum + p, 0) / validProgress.length 
          : null;
        
        const isReached = globalProgress !== null && globalProgress >= 95;
        
        // Estimate weeks to reach (simple linear projection)
        let weeksToReach: number | null = null;
        if (globalProgress !== null && globalProgress < 100) {
          const remaining = 100 - globalProgress;
          const progressPerWeek = 1.5; // Assumed average progress per week
          weeksToReach = Math.min(52, Math.ceil(remaining / progressPerWeek));
        }
        
        return {
          ambition: amb,
          label: def.label,
          icon: def.icon,
          targets: {
            vlamax: targets.vlamax,
            tte_min: targets.tte_min,
            ftp_kg_min: targets.ftp_kg_min,
          },
          progress: {
            vlamax: vlamaxProgress,
            tte: tteProgress,
            ftpKg: ftpKgProgress,
            global: globalProgress,
          },
          isReached,
          weeksToReach: isReached ? null : weeksToReach,
        };
      });
      
      return {
        current: ambition,
        label: currentDef.label,
        icon: currentDef.icon,
        targets: {
          vlamax: currentTargets.vlamax,
          tte_min: currentTargets.tte_min,
          ftp_kg_min: currentTargets.ftp_kg_min,
        },
        allTargets,
      };
    })(),
    // ✅ NEW: Coaching Compass (5 axes unifiés)
    coachingCompass: (() => {
      const compassInput: CoachingCompassInput = {
        ftp: effectiveRefs.ftp ?? null,
        poids: effectiveRefs.weightKg ?? null,
        vo2max: effectiveRefs.vo2max ?? null,
        tss7d: effectiveSnapshot?.tss_7d ?? null,
        snapshotDate: effectiveSnapshot?.date ?? null,
        snapshotUpdatedAt: effectiveSnapshot?.updated_at ?? null,
        pmax5s: effectiveSnapshot?.pmax_5s ?? null,
        p30sW: effectiveSnapshot?.p30s_w ?? null,
        p60sW: effectiveSnapshot?.p60s_w ?? null,
        map5minW: effectiveSnapshot?.map5min_w ?? null,
        runEconomyScore: effectiveSnapshot?.run_economy_score ?? null,
        hrDriftPct: effectiveSnapshot?.run_hr_drift_pct ?? null,
        vma: effectiveSnapshot?.vma ?? null,
        paceThresholdSecPerKm: effectiveSnapshot?.pace_threshold_sec_per_km ?? null,
        fatmax: null,
        vlamaxEffectif: { value: vlamax.value, confidence: vlamax.confidence, source: vlamax.source },
        tteEffectif: { tte_min: tte.tte_min, confidence: tte.confidence, source: tte.source },
        fatigueEffectif: null,
        limiterResult: unifiedLimiter as any,
        potentielPhysiologique: {
          score: potentielPhysiologique.score,
          potential: potentielPhysiologique.potential,
          availability: potentielPhysiologique.availability,
          governingFactor: potentielPhysiologique.governingFactor,
          label: potentielPhysiologique.label,
          color: potentielPhysiologique.color,
        },
        strategyResult: lorangResult,
        lactateThresholds: null,
        wprimeKj: cpResultForPayload ? cpResultForPayload.wprimeKJ : null,
        objectif: athlete.goal || "IM",
        ambition: ambition,
        sportFocus: resolveCompassSportFocus(effectiveSnapshot, athlete, "bike"),
        athleteAge: athleteAge,
      };
      return computeCoachingCompass(compassInput);
    })(),
    // ✅ NEW: Lorang Strategy Result (cohérence dashboard)
    lorangResult,
    // ✅ NEW: Run MLSS (Modèle C) — directement depuis le diagnostic engine
    runMLSS: diagnostic?.runMLSS ?? null,
  };
}

// =============================================
// CHECK IF EXPORT IS POSSIBLE
// =============================================

function canExport(payload: ExportPayload): { ok: boolean; reason?: string } {
  const hasSnapshot = payload.effectiveSnapshot != null;
  const hasTest = payload.tests.length > 0;
  const hasMinimalData = payload.effectiveRefs.ftp != null || payload.effectiveRefs.weightKg != null;
  
  if (!hasSnapshot && !hasTest && !hasMinimalData) {
    return {
      ok: false,
      reason: "Aucune donnée suffisante à exporter. Ajoutez un snapshot (FTP, poids, TSS 7d) ou un test."
    };
  }
  
  return { ok: true };
}

// =============================================
// CONVERT IMAGE TO BASE64
// =============================================

async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

// =============================================
// BUILD POTENTIEL PHYSIOLOGIQUE RUNNING HTML (CAP)
// =============================================

function buildPotentielPhysiologiqueRunningHTML(payload: ExportPayload): string {
  const { effectiveSnapshot, potentielPhysiologique, athlete, vlamax: alignedVlamax, tte: alignedTte } = payload;
  
  // ✅ Utiliser les valeurs alignées du diagnostic unifié (pas le snapshot brut)
  const vlamax_run = alignedVlamax.value;
  // F38: pas de fake 45 min — null = "—"
  const durability = alignedTte.tte_min && alignedTte.tte_min > 0 ? alignedTte.tte_min : null;
  const vo2max = effectiveSnapshot?.vo2max ?? null;
  const potentielScore = potentielPhysiologique.score;
  
  const getStateColor = (score: number) => {
    if (score >= 80) return { color: "#16a34a", bg: "rgba(22,163,74,0.1)", label: "GREEN", message: "Conditions optimales" };
    if (score >= 60) return { color: "#d97706", bg: "rgba(217,119,6,0.1)", label: "ORANGE", message: "Prudence recommandée" };
    return { color: "#dc2626", bg: "rgba(220,38,38,0.1)", label: "RED", message: "Risque élevé" };
  };
  
  const state = getStateColor(potentielScore);
  const isRunningFocus = athlete.goal?.includes("Marathon") || athlete.goal?.includes("Semi") || athlete.goal?.includes("10K") || athlete.goal?.includes("Trail");
  const intensityCap = potentielScore >= 80 ? 100 : potentielScore >= 60 ? 90 : 80;
  const pacingDiscipline = potentielScore >= 80 ? "NORMAL" : potentielScore >= 60 ? "STRICT" : "VERY_STRICT";
  
  return `
    <section id="race-readiness-running" class="section pagebreakAvoid">
      <h2>🏃 Potentiel Physiologique CAP — TFCL Method™</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Concept :</b> Le Potentiel Physiologique mesure l'adéquation du profil métabolique CAP avec les exigences de l'objectif. 
        Il évalue le <b>Potentiel structurel</b> indépendamment de la fatigue conjoncturelle.
      </div>
      
      <div class="card" style="border-color: ${state.color}; background: ${state.bg};">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Potentiel Physiologique CAP</div>
            <div style="font-size:42px;font-weight:800;color:${state.color};">${potentielScore}%</div>
            <div style="font-size:14px;font-weight:600;color:${state.color};">${state.message}</div>
          </div>
          <div style="text-align:center;">
            <div class="badge" style="font-size:16px;padding:12px 24px;background:${state.bg};color:${state.color};border:2px solid ${state.color};">
              ${state.label}
            </div>
          </div>
        </div>
      </div>
      
      <div class="grid2 mt">
        <div class="card">
          <h3>🔒 Potentiel Verrouillé (Boucle Lente)</h3>
          <div class="kv mt">
            <div class="k">VLamax CAP</div><div class="v">${vlamax_run ? vlamax_run.toFixed(2) + ' mmol/L/s' : '—'}</div>
            <div class="k">VO₂max</div><div class="v">${vo2max ? vo2max + ' ml/kg/min' : '—'}</div>
            <div class="k">Durabilité</div><div class="v">${durability != null ? `${durability} min` : "— (données insuffisantes)"}</div>
            <div class="k">Objectif</div><div class="v">${htmlEscape(athlete.goal || '—')}</div>
          </div>
          <p class="muted mt" style="font-size:10px;font-style:italic;">
            Ce profil ne change que par recalibration (4-6 semaines).
          </p>
        </div>
        
        <div class="card">
          <h3>⚡ Implications Opérationnelles</h3>
          <div class="kv mt">
            <div class="k">Intensité max autorisée</div><div class="v" style="font-weight:700;color:${state.color};">${intensityCap}% du potentiel</div>
            <div class="k">Discipline pacing</div><div class="v"><span class="badge ${pacingDiscipline === 'NORMAL' ? 'badgeSuccess' : pacingDiscipline === 'STRICT' ? 'badgeWarning' : 'badgeError'}">${pacingDiscipline}</span></div>
            <div class="k">Course autorisée</div><div class="v">${potentielScore >= 50 ? '✅ Oui' : '⛔ Non recommandé'}</div>
            <div class="k">Allure départ</div><div class="v">${potentielScore >= 80 ? 'Nominale' : potentielScore >= 60 ? 'Prudente (-3%)' : 'Conservative (-5%)'}</div>
          </div>
        </div>
      </div>
      
      ${!isRunningFocus ? `
        <div class="alert alertWarning mt">
          <b>ℹ️ Note :</b> L'objectif actuel (${htmlEscape(athlete.goal || '—')}) n'est pas un objectif CAP pur. 
          Pour un rapport Running complet, définissez un objectif course (10K, Semi, Marathon, Trail).
        </div>
      ` : ''}
      
      <div class="alert alertWarning mt" style="font-size:11px;">
        <b>⚠️ TFCL Method™ :</b> Le Potentiel Physiologique évalue l'adéquation structurelle du profil avec l'objectif. 
        Ce score reflète le niveau de développement des qualités métaboliques requises, pas la forme du jour.
      </div>
    </section>
  `;
}

// =============================================
// BUILD PACING ENVELOPE RUNNING HTML (CAP)
// =============================================

// =============================================
// CHANTIER E — Helpers communs Pacing Envelope
// =============================================

const RACE_OBJECTIVE_MAP_E: Record<string, RaceObjective> = {
  "Ironman": "IM", "IM": "IM",
  "70.3": "70.3", "Ironman 70.3": "70.3",
  "Marathon": "Marathon",
  "Semi-Marathon": "Semi", "Semi": "Semi",
  "10km": "10km", "10K": "10km",
};

const RACE_DURATION_MIN_E: Record<string, number> = {
  "Ironman": 600, "IM": 600, "70.3": 300, "Ironman 70.3": 300,
  "Marathon": 210, "Semi-Marathon": 105, "Semi": 105,
  "10km": 45, "10K": 45,
};

const RACE_DURATION_HOURS_E: Record<string, number> = {
  "Ironman": 10, "IM": 10, "70.3": 5, "Ironman 70.3": 5,
  "Marathon": 3.5, "Semi-Marathon": 1.75, "Semi": 1.75,
  "10km": 0.75, "10K": 0.75,
};

function computePacingEnvelopeForExport(payload: ExportPayload): PacingEnvelopeResult | null {
  const { effectiveSnapshot, effectiveRefs, vlamax, tte, potentielPhysiologique, athlete, ambition, fatmaxTFCL } = payload;
  const objectif = athlete.goal || "Marathon";
  const raceObjective = RACE_OBJECTIVE_MAP_E[objectif] ?? "Marathon";
  const sport: "bike" | "run" =
    objectif.includes("km") || objectif.includes("Marathon") || objectif.includes("Semi") || objectif.includes("Trail") || objectif.includes("Ultra")
      ? "run" : "bike";

  const ftp = effectiveRefs.ftp ?? null;
  const weight = (effectiveSnapshot as any)?.weight_kg ?? null;

  let cpWkg: number | null = null;
  let wPrimeJkg: number | null = null;
  try {
    const cp = analyzeCriticalPower({
      ...(effectiveSnapshot as any),
      weight_kg: weight,
      ftp,
    } as any);
    cpWkg = cp?.cpWkg ?? null;
    wPrimeJkg = cp?.wprimeJkg ?? null;
  } catch { /* fallback safe */ }

  return computePacingEnvelope({
    vlamaxEffectif: vlamax,
    tteEffectif: tte,
    fatmax: fatmaxTFCL,
    potentielPhysiologiqueScore: potentielPhysiologique.score,
    fatigueIndex: null,
    raceObjective,
    sport,
    ftp: ftp ?? undefined,
    weight: weight ?? undefined,
    ambition: ambition?.current ?? null,
    cpWkg,
    wPrimeJkg,
    predictedDurationMin: RACE_DURATION_MIN_E[objectif] ?? 180,
  });
}

function computeLongDistanceEnvelopeForExport(
  payload: ExportPayload,
  baseEnvelope: PacingEnvelopeResult,
): LongDistanceEnvelopeResult | null {
  const { effectiveSnapshot, vlamax, tte, athlete, fatmaxTFCL, ageAdjustment } = payload;
  const objectif = athlete.goal || "Marathon";
  const hours = RACE_DURATION_HOURS_E[objectif] ?? 3;
  if (hours < LONG_DISTANCE_THRESHOLD_HOURS) return null;

  const sport: "run" | "bike" =
    objectif.includes("km") || objectif.includes("Marathon") || objectif.includes("Semi") || objectif.includes("Trail") || objectif.includes("Ultra")
      ? "run" : "bike";

  const weight = (effectiveSnapshot as any)?.weight_kg ?? null;

  return computeLongDistanceEnvelope({
    baseEnvelope,
    targetDurationHours: hours,
    vlamaxValue: vlamax.value,
    vlamaxConfidence: vlamax.confidence,
    tteConfidence: tte.confidence,
    athleteAge: ageAdjustment?.age ?? null,
    fatmaxPct: fatmaxTFCL?.centerPctFTP ?? null,
    historicalFadePattern: null,
    glycogenAvailability: null,
    bodyMassKg: weight,
    sport,
    plannedCarbIntakeGph: null,
    gutTrainingLevel: null,
    ambientTempC: null,
    humidityPct: null,
    heatAcclimationLevel: null,
  });
}

// =============================================
// BUILD PACING ENVELOPE RUNNING HTML — moteur unifié
// =============================================

function buildPacingEnvelopeRunningHTML(payload: ExportPayload): string {
  const { effectiveSnapshot, athlete, vlamax: alignedVlamax, tte, ambition } = payload;
  const threshold_pace = effectiveSnapshot?.pace_threshold_sec_per_km ?? null;
  const vo2max_run = (effectiveSnapshot as any)?.vo2max ?? null;
  const vma = (effectiveSnapshot as any)?.vma ?? null;

  const goal = athlete.goal || "Marathon";
  let distance: "10K" | "HM" | "MARATHON" = "MARATHON";
  if (goal.includes("10K") || goal.includes("10k")) distance = "10K";
  else if (goal.includes("Semi") || goal.includes("HM") || goal.includes("21")) distance = "HM";

  const distanceLabels: Record<string, string> = { "10K": "10 km", HM: "Semi-Marathon", MARATHON: "Marathon" };

  if (!threshold_pace) {
    return `
      <section id="pacing-envelope-running" class="section pagebreakAvoid">
        <h2>🏃 Pacing Envelope™ CAP — ${distanceLabels[distance]}</h2>
        <div class="alert alertWarning"><b>⚠️ Données insuffisantes :</b> Allure seuil manquante.</div>
      </section>`;
  }

  const result = computePacingEnvelopeRun({
    distance,
    vlamax_run_v2: alignedVlamax.value,
    vo2max_run,
    threshold_pace,
    durability_index: tte?.tte_min ?? null,
    race_readiness_state: "GREEN",
    race_readiness_score: payload.potentielPhysiologique.score ?? 70,
    athlete_experience: "MEDIUM",
    ambition: ambition?.current ?? null,
    vma,
    predictedDurationMin: RACE_DURATION_MIN_E[goal] ?? null,
  });

  const formatPace = (s: number) => `${Math.floor(s/60)}'${(Math.round(s%60)).toString().padStart(2,'0')}"`;

  const zoneRows = result.zones.map((z) => {
    const paceStr = z.rangeSecPerKm
      ? `${formatPace(z.rangeSecPerKm[0])} - ${formatPace(z.rangeSecPerKm[1])}`
      : "—";
    const bg = z.zone === "GREEN" ? "rgba(22,163,74,0.1)" : z.zone === "ORANGE" ? "rgba(217,119,6,0.1)" : "rgba(220,38,38,0.1)";
    const badge = z.zone === "GREEN" ? "badgeSuccess" : z.zone === "ORANGE" ? "badgeWarning" : "badgeError";
    const riskLabel = z.zone === "GREEN" ? "Faible" : z.zone === "ORANGE" ? "Modéré" : "Élevé";
    return `
      <tr style="background:${bg};">
        <td><span style="color:${z.color};font-weight:700;">${z.zone === "GREEN" ? "🟢" : z.zone === "ORANGE" ? "🟠" : "🔴"} ${z.label}</span></td>
        <td>${z.rangePctThreshold[0]}-${z.rangePctThreshold[1]}%</td>
        <td>${paceStr}</td>
        <td><span class="badge ${badge}">${riskLabel}</span></td>
        <td style="font-size:11px;">${htmlEscape(z.message)}</td>
      </tr>`;
  }).join("");

  const scenarioCards = result.scenarios.map(s => {
    const color = s.type === "DISCIPLINED" ? "#16a34a" : s.type === "OPTIMISTIC" ? "#d97706" : "#dc2626";
    return `
      <div style="padding:12px;border-radius:8px;border:1px solid ${color};background:${color}10;">
        <div style="font-size:14px;font-weight:700;color:${color};">${htmlEscape(s.label)}</div>
        <div class="muted" style="font-size:11px;">${htmlEscape(s.description)}</div>
        <div style="margin-top:8px;font-size:11px;">
          <div>1er tiers: <b>${s.pacing_profile.first_third_pct}%</b></div>
          <div>Médian: <b>${s.pacing_profile.middle_third_pct}%</b></div>
          <div>Final: <b>${s.pacing_profile.last_third_pct}%</b></div>
        </div>
        <div class="progressBar" style="height:8px;margin-top:8px;">
          <div class="progressFill" style="width:${s.estimated_success_rate}%;background:${color};"></div>
        </div>
        <div style="font-size:11px;text-align:right;margin-top:4px;">Succès: ${s.estimated_success_rate}%</div>
        ${s.risk_warning ? `<div class="muted" style="font-size:10px;margin-top:4px;color:${color};">⚠ ${htmlEscape(s.risk_warning)}</div>` : ""}
      </div>`;
  }).join("");

  const disciplineColor =
    result.discipline_level === "VERY_HIGH" ? "#dc2626" :
    result.discipline_level === "HIGH" ? "#ea580c" :
    result.discipline_level === "MODERATE" ? "#d97706" : "#16a34a";

  return `
    <section id="pacing-envelope-running" class="section pagebreak">
      <h2>🏃 Pacing Envelope™ CAP — ${distanceLabels[distance]}</h2>

      <div class="alert alertInfo mb">
        <b>📋 Modèle continu Smyth-Skiba :</b> Zones calculées dynamiquement par le moteur unifié TFCL™ (Chantier C) — %CS f(durée, ambition) avec largeur asymétrique W'/CP.
      </div>

      <div class="card cardHighlight">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;">Niveau de discipline requis</div>
            <div style="font-size:24px;font-weight:700;color:${disciplineColor};">${result.discipline_level}</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Confiance modèle</div>
            <div style="font-size:18px;font-weight:600;">${Math.round(result.confidence * 100)}%</div>
          </div>
          <div style="text-align:right;">
            <div class="muted" style="font-size:11px;">Allure seuil</div>
            <div style="font-size:18px;font-weight:600;">${formatPace(threshold_pace)}/km</div>
          </div>
        </div>
      </div>

      <div class="card mt">
        <h3>🎯 Zones de Pacing dynamiques</h3>
        <table>
          <thead>
            <tr><th>Zone</th><th>% Seuil</th><th>Allure</th><th>Risque</th><th>Consigne</th></tr>
          </thead>
          <tbody>${zoneRows}</tbody>
        </table>
      </div>

      <div class="card mt">
        <h3>📊 3 Scénarios — Discipliné / Optimiste / Ambitieux</h3>
        <div class="grid3">${scenarioCards}</div>
      </div>

      <div class="card mt">
        <h3>🎯 Briefing athlète</h3>
        <div style="font-size:14px;font-weight:600;color:#1e40af;">${htmlEscape(result.briefing.key_phrase)}</div>
        <ul style="font-size:12px;margin-top:8px;">
          ${result.briefing.rules_max_3.map(r => `<li>${htmlEscape(r)}</li>`).join("")}
        </ul>
        <p class="muted" style="font-size:11px;margin-top:8px;font-style:italic;">${htmlEscape(result.briefing.message_to_remember)}</p>
      </div>

      <div class="alert alertInfo mt" style="font-size:10px;">
        <b>📚 Méthodologie :</b> ${htmlEscape(result.methodology)}
      </div>
    </section>
  `;
}

// =============================================
// BUILD PACING ENVELOPE HTML (Vélo/Tri) — Chantiers A/B unifiés
// =============================================

function buildPacingEnvelopeHTML(payload: ExportPayload): string {
  const env = computePacingEnvelopeForExport(payload);
  const { effectiveRefs, vlamax } = payload;
  const ftp = effectiveRefs.ftp ?? null;

  if (!env) {
    return `
      <section id="pacing-envelope" class="section pagebreakAvoid">
        <h2>📊 Pacing Envelope™ — Discipline Métabolique</h2>
        <div class="alert alertWarning"><b>⚠️ Données insuffisantes</b> pour générer l'enveloppe (FTP/VLamax/TTE manquants).</div>
      </section>`;
  }

  const b = env.boundary;
  const wattRange = (pct: number) => ftp ? Math.round(ftp * pct / 100) : null;

  const zoneRows = env.zones.map(z => {
    const [pmin, pmax] = z.rangePct;
    const wmin = wattRange(pmin), wmax = wattRange(pmax);
    return `
      <tr style="background:${z.color}15;">
        <td><span style="color:${z.color};font-weight:700;">${z.label}</span></td>
        <td>${pmin}-${pmax}% ${b.referenceShortLabel}</td>
        <td>${wmin && wmax ? `${wmin}-${wmax}W` : "—"}</td>
        <td>${z.riskLevel}/100</td>
        <td style="font-size:11px;">${htmlEscape(z.message)}</td>
      </tr>`;
  }).join("");

  const asymmetryLabel = b.asymmetryRatio < 0.85
    ? `Plafond resserré (W' faible)`
    : b.asymmetryRatio > 1.15
      ? `Plafond ouvert (W' confortable)`
      : `Symétrique`;
  const asymmetryColor = b.asymmetryRatio < 0.85 ? "#dc2626" : b.asymmetryRatio > 1.15 ? "#16a34a" : "#d97706";

  return `
    <section id="pacing-envelope" class="section pagebreak">
      <h2>📊 Pacing Envelope™ — Modèle Continu Smyth-Skiba</h2>

      <div class="alert alertInfo mb">
        <b>📋 Concept :</b> Enveloppe calculée par le moteur unifié TFCL™ (Chantiers A+B). Le centre suit %CS f(durée, ambition) [Smyth 2022], la largeur est asymétrique pilotée par W'/CP [Skiba 2024, Vanhatalo 2020].
      </div>

      <div class="grid3 mb">
        <div class="card">
          <div class="muted" style="font-size:11px;">Profil de Pacing</div>
          <div style="font-size:18px;font-weight:700;">${htmlEscape(env.pacingProfile.label)}</div>
          <div class="muted" style="font-size:10px;margin-top:4px;">${htmlEscape(env.pacingProfile.description)}</div>
        </div>
        <div class="card">
          <div class="muted" style="font-size:11px;">Largeur enveloppe</div>
          <div style="font-size:18px;font-weight:700;">${env.envelopeWidth.toFixed(1)} pts</div>
          <div class="muted" style="font-size:10px;margin-top:4px;">${htmlEscape(env.envelopeWidthLabel)}</div>
        </div>
        <div class="card">
          <div class="muted" style="font-size:11px;">Confiance</div>
          <div style="font-size:18px;font-weight:700;">${env.confidenceLevel} (${Math.round(env.confidence * 100)}%)</div>
          <div class="muted" style="font-size:10px;margin-top:4px;">${htmlEscape(env.confidenceLabel)}</div>
        </div>
      </div>

      <div class="card cardHighlight">
        <h3>🎯 Centre de l'enveloppe</h3>
        <div style="display:flex;justify-content:space-around;flex-wrap:wrap;gap:12px;text-align:center;">
          <div>
            <div class="muted" style="font-size:11px;">Plancher (low)</div>
            <div style="font-size:22px;font-weight:700;color:#16a34a;">${b.lowPct}%</div>
            ${ftp ? `<div class="muted" style="font-size:11px;">${wattRange(b.lowPct)}W</div>` : ""}
          </div>
          <div>
            <div class="muted" style="font-size:11px;">Centre</div>
            <div style="font-size:28px;font-weight:800;color:#1e40af;">${b.centerPct}%</div>
            ${ftp ? `<div class="muted" style="font-size:11px;">${wattRange(b.centerPct)}W</div>` : ""}
          </div>
          <div>
            <div class="muted" style="font-size:11px;">Plafond (high)</div>
            <div style="font-size:22px;font-weight:700;color:#d97706;">${b.highPct}%</div>
            ${ftp ? `<div class="muted" style="font-size:11px;">${wattRange(b.highPct)}W</div>` : ""}
          </div>
        </div>
        <div style="margin-top:12px;padding:10px;background:${asymmetryColor}15;border-left:3px solid ${asymmetryColor};border-radius:4px;font-size:12px;">
          <b style="color:${asymmetryColor};">Asymétrie W'/CP :</b> widthLow ${b.widthLow.toFixed(1)} pts | widthHigh ${b.widthHigh.toFixed(1)} pts | ratio ${b.asymmetryRatio.toFixed(2)} → <b>${asymmetryLabel}</b>
        </div>
        <div class="muted" style="font-size:10px;margin-top:6px;">Référence: ${htmlEscape(b.referenceLabel)}${b.isFallbackReference ? " (fallback)" : ""}</div>
      </div>

      <div class="card mt">
        <h3>🎯 Zones d'intensité</h3>
        <table>
          <thead><tr><th>Zone</th><th>% Réf</th><th>Watts</th><th>Risque</th><th>Message</th></tr></thead>
          <tbody>${zoneRows}</tbody>
        </table>
      </div>

      ${env.readinessMessage ? `
      <div class="alert alertWarning mt" style="font-size:11px;">
        <b>⚠️ Ajustement Potentiel Physiologique :</b> ${htmlEscape(env.readinessMessage)} (-${env.readinessAdjustment} pts)
      </div>` : ""}

      ${env.missingData.length > 0 ? `
      <div class="alert alertInfo mt" style="font-size:10px;">
        <b>📊 Données manquantes :</b> ${env.missingData.map(htmlEscape).join(", ")}
      </div>` : ""}

      <div class="alert alertInfo mt" style="font-size:10px;">
        <b>📚 Méthodologie :</b> ${htmlEscape(env.methodology)}
      </div>
    </section>
  `;
}

// =============================================
// BUILD LONG DISTANCE PACING HTML — Chantier D unifié (glycogène/CHO/thermique)
// =============================================

function buildLongDistancePacingHTML(payload: ExportPayload): string {
  const { athlete } = payload;
  const objectif = athlete.goal || "IM";

  const baseEnv = computePacingEnvelopeForExport(payload);
  if (!baseEnv) {
    return `
      <section id="long-distance-pacing" class="section pagebreakAvoid">
        <h2>🏃 Long Distance Pacing — LDRI</h2>
        <div class="alert alertWarning"><b>⚠️ Données insuffisantes</b> pour la modélisation longue distance.</div>
      </section>`;
  }

  const ld = computeLongDistanceEnvelopeForExport(payload, baseEnv);
  if (!ld) {
    return `
      <section id="long-distance-pacing" class="section pagebreakAvoid">
        <h2>🏃 Long Distance Pacing — LDRI</h2>
        <div class="alert alertInfo">
          <b>ℹ️ Note :</b> Section réservée aux épreuves ≥ ${LONG_DISTANCE_THRESHOLD_HOURS}h.
          Objectif actuel (${htmlEscape(objectif)}) hors scope.
        </div>
      </section>`;
  }

  const ldriColor = ld.ldri.level === "critical" ? "#dc2626" : ld.ldri.level === "high" ? "#dc2626" : ld.ldri.level === "moderate" ? "#d97706" : "#16a34a";

  // Glycogen Budget (Rapoport 2010)
  const gb = ld.glycogenBudget;
  const gbColor = gb?.status === "critical" ? "#dc2626" : gb?.status === "deficit" ? "#dc2626" : gb?.status === "tight" ? "#d97706" : "#16a34a";
  const glycogenSection = gb ? `
    <div class="card mt">
      <h3>🍞 Budget Glycogène — Rapoport 2010</h3>
      <div class="grid3">
        <div><div class="muted" style="font-size:11px;">Réserves initiales</div><div style="font-size:18px;font-weight:700;">${gb.initialStoresG}g</div></div>
        <div><div class="muted" style="font-size:11px;">Burn rate projeté</div><div style="font-size:18px;font-weight:700;">${gb.projectedBurnRateGph} g/h</div></div>
        <div><div class="muted" style="font-size:11px;">Apport effectif</div><div style="font-size:18px;font-weight:700;">${gb.effectiveCarbIntakeGph} g/h</div></div>
      </div>
      <div style="margin-top:10px;padding:10px;background:${gbColor}15;border-left:3px solid ${gbColor};border-radius:4px;">
        <div style="font-size:12px;"><b style="color:${gbColor};">Statut: ${gb.status.toUpperCase()}</b> — Déplétion nette ${gb.netDepletionGph} g/h</div>
        <div style="font-size:12px;margin-top:4px;">⏱ Temps avant zone critique (&lt;20%): <b>${gb.timeToCriticalMinutes !== null ? gb.timeToCriticalMinutes + " min" : "—"}</b></div>
        <div style="font-size:12px;margin-top:4px;">⚠ Risque "bonking": <b>${gb.bonkRisk}/100</b></div>
        <div class="muted" style="font-size:11px;margin-top:6px;">${htmlEscape(gb.message)}</div>
      </div>
    </div>` : "";

  // Carb Strategy (Jeukendrup 2014)
  const cs = ld.carbStrategy;
  const csColor = cs?.giRiskLevel === "high" ? "#dc2626" : cs?.giRiskLevel === "moderate" ? "#d97706" : "#16a34a";
  const carbSection = cs ? `
    <div class="card mt">
      <h3>🥤 Stratégie Glucidique — Jeukendrup 2014 / King 2022</h3>
      <div class="grid3">
        <div><div class="muted" style="font-size:11px;">Recommandé</div><div style="font-size:18px;font-weight:700;">${cs.recommendedGph} g/h</div></div>
        <div><div class="muted" style="font-size:11px;">Max absorbable (gut)</div><div style="font-size:18px;font-weight:700;">${cs.maxAbsorbableGph} g/h</div></div>
        <div><div class="muted" style="font-size:11px;">Ratio glucose:fructose</div><div style="font-size:18px;font-weight:700;">${cs.glucoseFructoseRatio}</div></div>
      </div>
      <div style="margin-top:10px;padding:10px;background:${csColor}15;border-left:3px solid ${csColor};border-radius:4px;font-size:12px;">
        <b style="color:${csColor};">Risque GI: ${cs.giRiskLevel.toUpperCase()}</b>
        ${cs.plannedVsRecommendedGap !== 0 ? ` — Écart planifié vs reco: ${cs.plannedVsRecommendedGap > 0 ? "+" : ""}${cs.plannedVsRecommendedGap} g/h` : ""}
        <div class="muted" style="font-size:11px;margin-top:4px;">${htmlEscape(cs.message)}</div>
      </div>
    </div>` : "";

  // Thermal Stress (Périard 2021)
  const ts = ld.thermalStress;
  const tsColor = ts?.stressLevel === "extreme" ? "#dc2626" : ts?.stressLevel === "high" ? "#dc2626" : ts?.stressLevel === "moderate" ? "#d97706" : "#16a34a";
  const thermalSection = ts ? `
    <div class="card mt">
      <h3>🌡️ Stress Thermique — Périard 2021 / Stull 2011</h3>
      <div class="grid3">
        <div><div class="muted" style="font-size:11px;">WBGT estimé</div><div style="font-size:18px;font-weight:700;">${ts.wbgtC.toFixed(1)}°C</div></div>
        <div><div class="muted" style="font-size:11px;">Pénalité intensité</div><div style="font-size:18px;font-weight:700;">−${ts.intensityPenaltyPct}%</div></div>
        <div><div class="muted" style="font-size:11px;">Hydratation supp.</div><div style="font-size:18px;font-weight:700;">+${ts.extraFluidNeedMlPerHour} mL/h</div></div>
      </div>
      <div style="margin-top:10px;padding:10px;background:${tsColor}15;border-left:3px solid ${tsColor};border-radius:4px;font-size:12px;">
        <b style="color:${tsColor};">Stress: ${ts.stressLevel.toUpperCase()}</b>
        <div class="muted" style="font-size:11px;margin-top:4px;">${htmlEscape(ts.message)}</div>
      </div>
    </div>` : "";

  // Scénarios long distance
  const scenarioCards = ld.scenarios.map(s => {
    const sColor = s.color === "red" ? "#dc2626" : s.color === "orange" ? "#d97706" : "#16a34a";
    return `
      <div style="padding:12px;border-radius:8px;border:1px solid ${sColor};background:${sColor}10;">
        <div style="font-size:14px;font-weight:700;color:${sColor};">${htmlEscape(s.label)}</div>
        <div class="muted" style="font-size:11px;">Intensité moy: <b>${s.avgIntensityPct}%</b></div>
        <div class="muted" style="font-size:11px;margin-top:4px;">Décroissance fin: <b>−${s.lateRaceDecayPct}%</b></div>
        <div class="muted" style="font-size:10px;margin-top:6px;font-style:italic;">"${htmlEscape(s.earlyFeeling)}" → "${htmlEscape(s.lateFeeling)}"</div>
        <div style="font-size:11px;margin-top:6px;color:${sColor};font-weight:600;">${htmlEscape(s.outcome)}</div>
      </div>`;
  }).join("");

  const p = ld.penalties;

  return `
    <section id="long-distance-pacing" class="section pagebreak">
      <h2>🏃 Long Distance Pacing — Glycogène / CHO / Thermique</h2>

      <div class="alert alertInfo mb">
        <b>📋 Modèle Chantier D :</b> Module longue distance enrichi avec budget glycogène (Rapoport 2010), stratégie CHO (Jeukendrup 2014), stress thermique WBGT (Périard 2021).
      </div>

      <div class="card" style="border-color:${ldriColor};background:${ldriColor}10;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;text-transform:uppercase;">Long Distance Risk Index</div>
            <div style="font-size:42px;font-weight:800;color:${ldriColor};">${ld.ldri.score}</div>
            <div style="font-size:14px;font-weight:600;color:${ldriColor};">${htmlEscape(ld.ldri.label)}</div>
          </div>
          <div style="text-align:center;padding:16px;background:white;border-radius:8px;">
            <div class="muted" style="font-size:11px;">Durée cible</div>
            <div style="font-size:16px;font-weight:600;">${ld.targetDurationHours.toFixed(1)}h</div>
            <div class="muted" style="font-size:10px;">${htmlEscape(objectif)}</div>
          </div>
        </div>
        <div class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(ld.ldri.message)}</div>
      </div>

      <div class="grid2 mt">
        <div class="card">
          <h3>🚨 Seuil Glycogen Collapse</h3>
          <div style="font-size:28px;font-weight:700;color:#dc2626;">${ld.glycogenThreshold.thresholdPct}% ${baseEnv.boundary.referenceShortLabel}</div>
          <p class="muted" style="font-size:11px;margin-top:4px;">Max ${ld.glycogenThreshold.maxDurationMinutes}min au-dessus</p>
          <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(ld.glycogenThreshold.explanation)}</p>
        </div>
        <div class="card">
          <h3>🎯 Cible Discipline</h3>
          <div style="font-size:28px;font-weight:700;color:#16a34a;">${ld.disciplineBuffer.disciplineTargetPct}% ${baseEnv.boundary.referenceShortLabel}</div>
          <p class="muted" style="font-size:11px;margin-top:4px;">Marge: ${ld.disciplineBuffer.bufferMarginPct} pts sous le plafond</p>
          <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(ld.disciplineBuffer.message)}</p>
        </div>
      </div>

      ${glycogenSection}
      ${carbSection}
      ${thermalSection}

      <div class="card mt">
        <h3>📈 3 Scénarios Long Distance</h3>
        <div class="grid3">${scenarioCards}</div>
      </div>

      <div class="card mt">
        <h3>📉 Pénalités appliquées</h3>
        <table style="font-size:12px;">
          <tr><td>Pénalité durée</td><td><b>−${p.durationPenaltyPct}%</b></td></tr>
          <tr><td>Pénalité glycogène</td><td><b>−${p.glycogenPenaltyPct}%</b></td></tr>
          <tr><td>Pénalité thermique (Chantier D)</td><td><b>−${p.thermalPenaltyPct}%</b></td></tr>
          <tr><td>Pénalité déficit CHO (Chantier D)</td><td><b>−${p.carbDeficitPenaltyPct}%</b></td></tr>
          <tr style="background:#fef3c7;font-weight:700;"><td>Total réduction plafond</td><td>−${p.totalReductionPct}%</td></tr>
        </table>
      </div>

      <div class="alert alertWarning mt" style="font-size:11px;">
        <b>💡 Message coach :</b> ${htmlEscape(ld.keyMessages.coachWarning)}
      </div>
      <div class="alert alertInfo mt" style="font-size:11px;">
        <b>🗣 Message athlète :</b> ${htmlEscape(ld.keyMessages.athleteMessage)}
      </div>
    </section>
  `;
}

// =============================================
// BUILD DOUBLE BOUCLE CAP HTML (Running)
// =============================================

function buildDoubleBoucleCAPHTML(payload: ExportPayload): string {
  const { effectiveSnapshot, potentielPhysiologique, athlete, vlamax, tte: alignedTte } = payload;
  
  // ✅ Utiliser les valeurs alignées du diagnostic unifié (pas le snapshot brut)
  const vlamax_run = vlamax.value;
  const vo2max = effectiveSnapshot?.vo2max ?? null;
  // F38: pas de fake 45 min — null = "—"
  const durability = alignedTte.tte_min && alignedTte.tte_min > 0 ? alignedTte.tte_min : null;
  const objectif = athlete.goal || "Marathon";
  
  // Déterminer si c'est un objectif CAP
  const isRunningFocus = ["Marathon", "Semi-Marathon", "Semi", "10K", "Trail", "TrailCourt", "TrailLong", "Ultra"].some(
    g => objectif.includes(g)
  );
  
  if (!isRunningFocus) {
    return `
      <section id="double-boucle-cap" class="section pagebreakAvoid">
        <h2>🔄 Double Boucle CAP — TFCL Method™</h2>
        <div class="alert alertInfo">
          <b>ℹ️ Note :</b> Cette section s'applique aux objectifs Course à Pied (Marathon, Semi, Trail...).
          L'objectif actuel (${htmlEscape(objectif)}) n'est pas un objectif CAP.
        </div>
      </section>
    `;
  }
  
  // ✅ Levier prioritaire depuis le moteur unifié (cohérence dashboard ↔ PDF)
  const ul = payload.unifiedLimiter;
  const lever = {
    lever: ul.primaryLever,
    emoji: ul.leverEmoji || "🎯",
    label: ul.leverLabel || "Maintien Profil",
  };
  const potentielScore = potentielPhysiologique.score;
  const potentielColor = potentielScore >= 80 ? "#16a34a" : potentielScore >= 60 ? "#d97706" : "#dc2626";
  const potentielLabel = potentielScore >= 80 ? "Bonne" : potentielScore >= 60 ? "Modérée" : "Faible";
  
  // Confiance simulée
  const confidence = vlamax.confidence;
  
  return `
    <section id="double-boucle-cap" class="section pagebreak">
      <h2>🔄 Double Boucle CAP — TFCL Method™</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Concept :</b> La Double Boucle sépare le <b>Profil Verrouillé</b> (boucle lente, 4-6 semaines) 
        de la <b>Décision Hebdomadaire</b> (boucle rapide). La physiologie évolue lentement, les décisions doivent être prises souvent.
      </div>
      
      <div class="grid2">
        <!-- BOUCLE LENTE -->
        <div class="card" style="border:2px solid var(--primary);background:rgba(37,99,235,0.05);">
          <h3 style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">🔒</span>
            Boucle Lente (4-6 sem)
          </h3>
          
          <div class="kv mt">
            <div class="k">VLamax CAP</div>
            <div class="v">${vlamax_run ? vlamax_run.toFixed(2) + ' mmol/L/s' : '—'}</div>
            
            <div class="k">VO₂max</div>
            <div class="v">${vo2max ? vo2max + ' ml/kg/min' : '—'}</div>
            
            <div class="k">Durabilité</div>
            <div class="v">${durability != null ? `${durability} min` : "— (données insuffisantes)"}</div>
            
            <div class="k">Objectif</div>
            <div class="v">${htmlEscape(objectif)}</div>
          </div>
          
          <div style="margin-top:16px;padding:12px;background:rgba(0,0,0,0.05);border-radius:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:20px;">${lever.emoji}</span>
              <div>
                <div style="font-size:12px;font-weight:600;color:var(--primary);">${lever.label}</div>
                <div style="font-size:10px;color:#64748b;">Levier prioritaire du bloc</div>
              </div>
            </div>
          </div>
          
          <p class="muted" style="font-size:10px;margin-top:12px;font-style:italic;">
            Ce profil ne change que par recalibration planifiée (pas de modification continue).
          </p>
        </div>
        
        <!-- BOUCLE RAPIDE -->
        <div class="card" style="border:2px solid ${potentielColor};">
          <h3 style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">⚡</span>
            Boucle Rapide (hebdo)
          </h3>
          
          <div style="padding:16px;background:${potentielColor}15;border-radius:8px;text-align:center;margin-top:12px;">
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;">Disponibilité</div>
            <div style="font-size:28px;font-weight:700;color:${potentielColor};">${potentielLabel}</div>
            <div style="font-size:12px;color:${potentielColor};">Score: ${potentielScore}%</div>
          </div>
          
          <div class="kv mt">
            <div class="k">Intensité autorisée</div>
            <div class="v">${potentielScore >= 80 ? 'Haute ✓' : potentielScore >= 60 ? 'Modérée' : 'Faible ✗'}</div>
            
            <div class="k">Long run</div>
            <div class="v">${potentielScore >= 50 ? '✓ Autorisé' : '✗ Non recommandé'}</div>
            
            <div class="k">Séances clés max</div>
            <div class="v">${potentielScore >= 80 ? '3' : potentielScore >= 60 ? '2' : '1'}</div>
            
            <div class="k">Fiabilité</div>
            <div class="v">${confidence >= 0.8 ? 'Élevée' : confidence >= 0.6 ? 'Modérée' : 'Limitée'}</div>
          </div>
        </div>
      </div>
      
      <div class="card mt" style="background:rgba(0,0,0,0.02);">
        <p style="font-size:11px;color:#64748b;">
          <b>💡 Double Boucle TFCL™ :</b> La boucle lente verrouille le profil physiologique 
          pendant 4-6 semaines (pas de recalibration permanente). La boucle rapide ajuste les décisions 
          hebdomadaires sans modifier les seuils physiologiques. 
          <em>"La physiologie évolue lentement, les décisions doivent être prises souvent."</em>
        </p>
      </div>
    </section>
  `;
}

// =============================================
// ROADMAP STRATÉGIQUE — SMART GANTT SVG (PDF)
// Uses computeStrategicRoadmap engine for metabolic-aware phases
// =============================================

// =============================================
// FACTEURS LIMITANTS (moteur unifié)
// =============================================

function buildFacteursLimitantsHTML(payload: ExportPayload): string {
  const ul = payload.unifiedLimiter;
  const gaps = ul.gapAnalysis;
  
  const statusColor = (s: string) => s === "limiting" ? "#dc2626" : s === "acceptable" ? "#ca8a04" : s === "optimal" ? "#16a34a" : "#6b7280";
  const statusLabel = (s: string) => s === "limiting" ? "Limitant" : s === "acceptable" ? "Acceptable" : s === "optimal" ? "Optimal" : "Inconnu";
  
  const fmtV = (v: number | null) => v === null ? "—" : v < 10 ? v.toFixed(2) : v.toFixed(1);
  
  // Trier par impact pondéré (les plus limitants en premier)
  const sorted = [...gaps].sort((a, b) => b.weightedImpact - a.weightedImpact);

  return `
    <section id="facteurs-limitants" class="section pagebreakAvoid">
      <h2>🎯 Facteurs Limitants</h2>
      
      <div class="card cardHighlight">
        <div class="grid2">
          <div>
            <h3>${ul.limiterEmoji} Limiteur Principal</h3>
            <div style="font-size:22px;font-weight:700;margin:8px 0;">${htmlEscape(ul.limiterLabel)}</div>
            <div class="muted">${htmlEscape(ul.limiterExplanation)}</div>
          </div>
          <div>
            <div style="display:flex;gap:16px;margin-top:8px;">
              <div style="text-align:center;">
                <div style="font-size:28px;font-weight:700;color:${ul.confidence > 0.7 ? '#16a34a' : ul.confidence > 0.4 ? '#ca8a04' : '#dc2626'};">${Math.round(ul.confidence * 100)}%</div>
                <div class="muted" style="font-size:11px;">Confiance</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:28px;font-weight:700;color:${ul.robustnessScore > 60 ? '#16a34a' : '#ca8a04'};">${ul.robustnessScore}</div>
                <div class="muted" style="font-size:11px;">Robustesse</div>
              </div>
            </div>
            <div class="muted mt" style="font-size:11px;">${htmlEscape(ul.robustnessNote)}</div>
          </div>
        </div>
      </div>

      ${ul.insufficientData ? `
        <div class="alert alertWarning mt">
          ⚠️ ${htmlEscape(ul.insufficientDataMessage || "Données insuffisantes")}
          ${ul.missingMetrics.length > 0 ? `<br><b>Métriques manquantes :</b> ${ul.missingMetrics.join(", ")}` : ""}
        </div>
      ` : ""}

      ${ul.fatigueWarning.active ? `
        <div class="alert alertWarning mt">
          🔋 ${htmlEscape(ul.fatigueWarning.message || "Fatigue détectée")}
        </div>
      ` : ""}

      <div class="card mt">
        <h3>📊 Analyse des Écarts (Gap Analysis)</h3>
        <table>
          <thead>
            <tr>
              <th>Métrique</th>
              <th>Actuel</th>
              <th>Cible</th>
              <th>Écart</th>
              <th>Impact</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(g => {
              const gapPct = Number.isFinite(g.gapPercent) ? g.gapPercent : 0;
              return `
              <tr>
                <td><b>${htmlEscape(g.metric)}</b></td>
                <td>${fmtV(g.value)}</td>
                <td>${fmtV(g.target)}</td>
                <td style="font-weight:600;color:${gapPct < -15 ? '#dc2626' : gapPct < -5 ? '#ca8a04' : '#16a34a'};">${gapPct.toFixed(0)}%</td>
                <td>
                  <div style="background:#e5e7eb;border-radius:4px;height:8px;width:60px;position:relative;">
                    <div style="background:${statusColor(g.status)};border-radius:4px;height:8px;width:${Math.min(100, Math.abs(g.weightedImpact) * 10)}%;"></div>
                  </div>
                </td>
                <td><span class="badge" style="background:${statusColor(g.status)}20;color:${statusColor(g.status)};font-size:10px;">${statusLabel(g.status)}</span></td>
              </tr>
            `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// =============================================
// LEVIERS D'ACTION (moteur unifié)
// =============================================

function buildLeviersActionHTML(payload: ExportPayload): string {
  const ul = payload.unifiedLimiter;
  const lr = payload.lorangResult;
  const roadmap = computeStrategicRoadmap({ objectif: payload.athlete.goal, limiterResult: ul });
  
  // ✅ Utiliser le Lorang Strategy Engine (identique au dashboard)
  const levers = lr?.activatedLevers || [];
  const prohibitions = lr?.prohibitions || [];
  const summary = lr?.summary;
  const templateSuggestion = lr?.templateSuggestion;

  const priorityBadge = (p: number) => p === 1 
    ? '<span class="badge" style="background:#3b82f620;color:#3b82f6;font-size:10px;">P1 — Prioritaire</span>'
    : p === 2 
      ? '<span class="badge" style="background:#f59e0b20;color:#f59e0b;font-size:10px;">P2 — Secondaire</span>'
      : '<span class="badge" style="background:#6b728020;color:#6b7280;font-size:10px;">P3 — Tertiaire</span>';

  return `
    <section id="leviers-action" class="section pagebreakAvoid">
      <h2>🔧 Leviers d'Action</h2>
      
      ${lr ? `
        <!-- Synthèse décisionnelle Lorang -->
        <div class="card cardHighlight">
          <div class="grid2">
            <div>
              <h3>${lr.limiterIcon} Limiteur : ${htmlEscape(lr.limiterLabel)}</h3>
              <p class="muted" style="font-size:12px;">${htmlEscape(lr.limiterExplanation)}</p>
            </div>
            <div>
              <p style="font-size:13px;"><b>Action principale :</b> ${htmlEscape(summary?.mainAction || "—")}</p>
              <p class="muted" style="font-size:11px;margin-top:4px;"><b>Pourquoi :</b> ${htmlEscape(summary?.whyThis || "—")}</p>
              <p class="muted" style="font-size:11px;"><b>Pourquoi pas autre chose :</b> ${htmlEscape(summary?.whyNotOthers || "—")}</p>
            </div>
          </div>
          ${templateSuggestion ? `
            <div style="margin-top:12px;padding:8px 12px;background:var(--muted-bg, #f1f5f9);border-radius:6px;">
              <span style="font-size:11px;color:var(--muted);">💡 Type de semaine suggéré : <b>${htmlEscape(templateSuggestion.weekLabel)}</b> — ${htmlEscape(templateSuggestion.reasoning)}</span>
            </div>
          ` : ""}
          <div style="margin-top:8px;">
            <span class="badge" style="background:${lr.confidence === 'high' ? '#16a34a' : lr.confidence === 'moderate' ? '#f59e0b' : '#dc2626'}20;color:${lr.confidence === 'high' ? '#16a34a' : lr.confidence === 'moderate' ? '#f59e0b' : '#dc2626'};font-size:10px;">
              Confiance : ${htmlEscape(lr.confidenceLabel)}
            </span>
          </div>
        </div>

        <!-- Leviers activés (dynamiques, identiques au dashboard) -->
        ${levers.length > 0 ? `
          <div class="card mt">
            <h3>⚡ Leviers Activés (${levers.length})</h3>
            ${levers.map(lever => `
              <div style="padding:12px;margin:8px 0;border-radius:8px;border:1px solid ${lever.priority === 1 ? 'var(--primary, #3b82f6)' : '#e5e7eb'};background:${lever.priority === 1 ? 'rgba(59,130,246,0.05)' : '#fafafa'};">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span style="font-size:20px;">${lever.icon}</span>
                  <span style="font-size:14px;font-weight:600;">${htmlEscape(lever.label)}</span>
                  ${priorityBadge(lever.priority)}
                  ${lever.isStaffOnly ? '<span class="badge" style="background:#6b728020;color:#6b7280;font-size:9px;">🛡️ Staff</span>' : ''}
                </div>
                <p class="muted" style="font-size:12px;margin-top:4px;">${htmlEscape(lever.reason)}</p>
                ${lever.prescription.length > 0 ? `
                  <div style="margin-top:8px;">
                    <p style="font-size:11px;font-weight:600;color:#16a34a;">Prescription :</p>
                    <ul style="margin:4px 0 0 16px;font-size:12px;">
                      ${lever.prescription.map(p => `<li style="color:#16a34a;">• ${htmlEscape(p)}</li>`).join("")}
                    </ul>
                  </div>
                ` : ""}
                ${lever.warnings.length > 0 ? `
                  <div style="margin-top:6px;">
                    <p style="font-size:11px;font-weight:600;color:#f59e0b;">⚠️ Précautions :</p>
                    <ul style="margin:4px 0 0 16px;font-size:12px;">
                      ${lever.warnings.map(w => `<li style="color:#f59e0b;">• ${htmlEscape(w)}</li>`).join("")}
                    </ul>
                  </div>
                ` : ""}
              </div>
            `).join("")}
          </div>
        ` : ""}

        <!-- Interdictions -->
        ${prohibitions.length > 0 ? `
          <div class="card mt">
            <h3>🚫 Interdictions Actives</h3>
            ${prohibitions.map(p => `
              <div class="alert alertWarning" style="margin:6px 0;">
                <b>${htmlEscape(p.label)}</b><br>
                <span class="muted" style="font-size:11px;">${htmlEscape(p.reason)} — ${htmlEscape(p.explanation)}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}
      ` : `
        <!-- Fallback si Lorang non disponible -->
        <div class="card cardHighlight">
          <h3>${ul.leverEmoji} Levier Prioritaire : ${htmlEscape(ul.leverLabel)}</h3>
          <p class="muted">${htmlEscape(ul.limiterExplanation)}</p>
        </div>
      `}

      ${roadmap.phases.length > 0 ? `
        <div class="card mt">
          <h3>📋 Roadmap Stratégique — ${htmlEscape(roadmap.title)}</h3>
          <p class="muted mb">${roadmap.totalWeeks} semaines • ${roadmap.phases.length} phases</p>
          <table>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Semaines</th>
                <th>Focus</th>
                <th>Objectif</th>
              </tr>
            </thead>
            <tbody>
              ${roadmap.phases.map(p => `
                <tr>
                  <td><b>${htmlEscape(p.name)}</b></td>
                  <td>S${p.startWeek}→S${p.endWeek} (${p.endWeek - p.startWeek + 1} sem)</td>
                  <td>${htmlEscape(p.focus)}</td>
                  <td class="muted">${htmlEscape(p.targets?.join(", ") || "—")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : ""}
    </section>
  `;
}

// =============================================
// CP / W' & W'BAL RECOVERY — HTML REPORT SECTION
// =============================================

function buildCpWprimeWbalHTML(payload: ExportPayload): string {
  const snap = payload.effectiveSnapshot;
  const ftp = payload.effectiveRefs.ftp ?? null;
  const poids = payload.effectiveRefs.weightKg ?? null;

  const pmax5s = snap?.pmax_5s ?? null;
  const p30s = snap?.p30s_w ?? null;
  const p60s = snap?.p60s_w ?? null;
  const map5min = snap?.map5min_w ?? null;

  const cpResult = analyzeCriticalPower({
    pmax_5s: pmax5s,
    p30s_w: p30s,
    p60s_w: p60s,
    map5min_w: map5min,
    ftp,
    weight_kg: poids,
  });

  if (!cpResult) {
    return `
      <section id="cp-wprime-wbal" class="section pagebreakAvoid">
        <h2>⚡ Puissance Critique & W' — Repos Optimaux W'bal</h2>
        <div class="card" style="padding:16px;">
          <p class="muted">Données insuffisantes pour le calcul CP/W'. Renseignez au moins 2 puissances parmi P30s, P60s, MAP5min dans le snapshot.</p>
        </div>
      </section>
    `;
  }

  const recoveryTable = generateRecoveryTable(cpResult.effectiveCP, cpResult.wprime, poids ?? undefined);
  const wprimeEff = effectiveWprime(cpResult.wprime);

  const qualityColor = cpResult.dataQuality === "good" ? "#16a34a" : cpResult.dataQuality === "suspect" ? "#f59e0b" : "#dc2626";
  const qualityLabel = cpResult.dataQuality === "good" ? "✓ Bonne" : cpResult.dataQuality === "suspect" ? "⚠ Suspecte" : "✗ Implausible";

  // Diagnostics HTML
  const diagnosticsHTML = cpResult.diagnostics.length > 0
    ? cpResult.diagnostics.map(d => {
        const color = d.severity === "critical" ? "#dc2626" : d.severity === "warning" ? "#f59e0b" : "#3b82f6";
        const icon = d.severity === "critical" ? "🔴" : d.severity === "warning" ? "🟡" : "ℹ️";
        return `<div style="display:flex;gap:6px;align-items:flex-start;padding:6px 8px;border-radius:6px;background:${color}10;border:1px solid ${color}30;font-size:11px;">
          <span>${icon}</span>
          <span>${htmlEscape(d.message)}</span>
        </div>`;
      }).join("")
    : "";

  // Data points badges
  const pointsBadges = cpResult.points.map(pt => {
    const isOverlay = 'regressionPoint' in pt ? !(pt as any).regressionPoint : false;
    const style = isOverlay
      ? "background:#f1f5f9;color:#64748b;border:1px dashed #94a3b8;"
      : "background:#eff6ff;color:#2563eb;border:1px solid #93c5fd;";
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-family:monospace;${style}">${htmlEscape(pt.label || pt.durationSec + 's')}: ${pt.powerWatts}W${isOverlay ? ' (overlay)' : ''}</span>`;
  }).join(" ");

  // Recovery table rows
  const recoveryRows = recoveryTable && recoveryTable.length > 0
    ? recoveryTable.map(row => {
        const repColor = row.maxReps >= 8 ? "#16a34a" : row.maxReps >= 4 ? "#f59e0b" : "#dc2626";
        return `<tr>
          <td style="padding:6px 8px;font-weight:500;">${htmlEscape(row.format)}</td>
          <td style="padding:6px 8px;font-family:monospace;color:#2563eb;">${htmlEscape(row.intervalPower)}</td>
          <td style="padding:6px 8px;font-family:monospace;">${htmlEscape(row.optimalRest)}</td>
          <td style="padding:6px 8px;text-align:right;"><span style="display:inline-block;padding:1px 8px;border-radius:9999px;font-size:10px;font-weight:600;color:white;background:${repColor};">×${row.maxReps}</span></td>
        </tr>`;
      }).join("")
    : "";

  return `
    <section id="cp-wprime-wbal" class="section pagebreakAvoid">
      <h2>⚡ Puissance Critique & W' — Repos Optimaux W'bal</h2>
      
      <div class="card" style="padding:16px;">
        <!-- Quality badge -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
          <span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:10px;font-weight:600;color:${qualityColor};border:1px solid ${qualityColor}40;background:${qualityColor}10;">
            Qualité ${qualityLabel}
          </span>
        </div>

        <!-- Main metrics -->
        <div class="grid2" style="gap:12px;margin-bottom:16px;">
          <div style="background:#f8fafc;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#64748b;">Critical Power</div>
            <div style="font-size:24px;font-weight:700;color:#2563eb;font-family:monospace;">${cpResult.effectiveCP}W</div>
            ${cpResult.cpBounded ? `<div style="font-size:10px;color:#f59e0b;">Borné FTP (${cpResult.cp}W brut)</div>` : ""}
            ${cpResult.cpWkg ? `<div style="font-size:10px;color:#64748b;font-family:monospace;">${cpResult.effectiveCPWkg ?? cpResult.cpWkg} W/kg</div>` : ""}
          </div>
          <div style="background:#f8fafc;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#64748b;">W' (Cap. Anaérobie)</div>
            <div style="font-size:24px;font-weight:700;color:#dc2626;font-family:monospace;">${cpResult.wprimeKJ} kJ</div>
            ${cpResult.wprimeJkg ? `<div style="font-size:10px;color:#64748b;font-family:monospace;">${cpResult.wprimeJkg} J/kg</div>` : ""}
            ${wprimeEff > cpResult.wprime ? `<div style="font-size:10px;color:#f59e0b;">Plancher 10kJ appliqué</div>` : ""}
          </div>
        </div>

        <!-- Secondary metrics -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
          <div style="background:#f8fafc;border-radius:6px;padding:8px;text-align:center;">
            <div style="font-size:10px;color:#64748b;">R² Modèle</div>
            <div style="font-size:14px;font-weight:700;font-family:monospace;color:${cpResult.r2 > 0.95 ? '#16a34a' : cpResult.r2 > 0.9 ? '#f59e0b' : '#dc2626'};">${cpResult.r2.toFixed(3)}</div>
          </div>
          <div style="background:#f8fafc;border-radius:6px;padding:8px;text-align:center;">
            <div style="font-size:10px;color:#64748b;">Points</div>
            <div style="font-size:14px;font-weight:700;font-family:monospace;">${cpResult.points.length}</div>
          </div>
          <div style="background:#f8fafc;border-radius:6px;padding:8px;text-align:center;">
            <div style="font-size:10px;color:#64748b;">FTP/CP</div>
            <div style="font-size:14px;font-weight:700;font-family:monospace;">${cpResult.ftpCpRatio ? cpResult.ftpCpRatio.toFixed(2) : '—'}</div>
          </div>
        </div>

        <!-- Diagnostics -->
        ${diagnosticsHTML ? `<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:16px;">${diagnosticsHTML}</div>` : ""}

        <!-- Data points -->
        <div style="margin-bottom:16px;">
          <div style="font-size:10px;color:#64748b;margin-bottom:4px;font-weight:600;">Points de données</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">${pointsBadges}</div>
        </div>

        <!-- Recovery table -->
        ${recoveryRows ? `
        <div style="margin-top:16px;">
          <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;">🔄 Repos Optimaux W'bal (Skiba 2012)</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="border-bottom:2px solid #e2e8f0;">
                <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Format</th>
                <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Puissance</th>
                <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Repos optimal</th>
                <th style="text-align:right;padding:6px 8px;color:#64748b;font-weight:500;">Reps max</th>
              </tr>
            </thead>
            <tbody>${recoveryRows}</tbody>
          </table>
        </div>
        ` : ""}

        <!-- Footer note -->
        <div style="margin-top:12px;font-size:10px;color:#94a3b8;font-style:italic;">
          Durées calibrées sur W' individuel (${cpResult.wprimeKJ} kJ) et CP effectif (${cpResult.effectiveCP}W).
          Modèle : reconstitution exponentielle W'bal — Skiba et al. (2012).
        </div>
      </div>
    </section>
  `;
}

// =============================================
// LACTATE CORRESPONDENCE TFCL — HTML REPORT SECTION
// =============================================

function buildLactateCorrespondenceHTML(payload: ExportPayload): string {
  const ftp = payload.effectiveRefs.ftp ?? null;
  const sport = payload.athlete.goal || "IM";
  const tte = payload.tte;
  const vlamax = payload.vlamax;

  const thresholds = computeLactateThresholdsTFCL({
    ftp,
    sport,
    tteValue: tte.tte_min,
    tteSource: tte.source as any,
    vlamaxValue: vlamax.value,
    vlamaxSource: vlamax.source as any,
  });

  if (thresholds.sport === "unknown" || (!thresholds.lt1.watts && !thresholds.lt1.pct_of_ftp && thresholds.lt1.confidence === 0)) {
    return `
      <section id="lactate-correspondence" class="section pagebreakAvoid">
        <h2>🧪 Correspondances Lactiques TFCL</h2>
        <div class="card" style="padding:16px;">
          <p class="muted">Données insuffisantes pour estimer LT1/LT2. Renseignez FTP et sport dans le snapshot.</p>
        </div>
      </section>
    `;
  }

  const confColor = (c: number) => c >= 0.75 ? "#16a34a" : c >= 0.55 ? "#f59e0b" : "#dc2626";

  const lt1Watts = thresholds.lt1.watts ? `${thresholds.lt1.watts}W` : "—";
  const lt2Watts = thresholds.lt2.watts ? `${thresholds.lt2.watts}W` : "—";
  const lt1Pct = thresholds.lt1.pct_of_ftp ? `${Math.round(thresholds.lt1.pct_of_ftp * 100)}% FTP` : "";
  const lt2Pct = thresholds.lt2.pct_of_ftp ? `${Math.round(thresholds.lt2.pct_of_ftp * 100)}% FTP` : "";

  const correspondenceRows = TFCL_LACTATE_TABLE.map(row => `
    <tr>
      <td style="padding:6px 8px;font-weight:500;">${htmlEscape(row.element)}</td>
      <td style="padding:6px 8px;font-family:monospace;color:#2563eb;">${htmlEscape(row.correspondence)}</td>
      <td style="padding:6px 8px;font-size:10px;color:#64748b;">${htmlEscape(row.dataSource)}</td>
      <td style="padding:6px 8px;font-size:10px;color:#64748b;">${htmlEscape(row.staffWhy)}</td>
    </tr>
  `).join("");

  return `
    <section id="lactate-correspondence" class="section pagebreakAvoid">
      <h2>🧪 Correspondances Lactiques TFCL</h2>
      
      <div class="card" style="padding:16px;">
        <!-- LT1 / LT2 Summary -->
        <div class="grid2" style="gap:12px;margin-bottom:16px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#16a34a;font-weight:600;">LT1 — Seuil Aérobie</div>
            <div style="font-size:22px;font-weight:700;font-family:monospace;color:#16a34a;">${lt1Watts}</div>
            ${lt1Pct ? `<div style="font-size:10px;color:#64748b;">${lt1Pct}</div>` : ""}
            <div style="font-size:10px;margin-top:4px;">
              <span style="color:${confColor(thresholds.lt1.confidence)};">Confiance: ${Math.round(thresholds.lt1.confidence * 100)}%</span>
            </div>
          </div>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:11px;color:#dc2626;font-weight:600;">LT2 — Seuil Anaérobie (MLSS)</div>
            <div style="font-size:22px;font-weight:700;font-family:monospace;color:#dc2626;">${lt2Watts}</div>
            ${lt2Pct ? `<div style="font-size:10px;color:#64748b;">${lt2Pct}</div>` : ""}
            <div style="font-size:10px;margin-top:4px;">
              <span style="color:${confColor(thresholds.lt2.confidence)};">Confiance: ${Math.round(thresholds.lt2.confidence * 100)}%</span>
            </div>
          </div>
        </div>

        <!-- Correspondence Table -->
        <div style="margin-top:12px;">
          <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;">Table de Correspondance TFCL ↔ Seuils Lactiques</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="border-bottom:2px solid #e2e8f0;">
                <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Élément TFCL</th>
                <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">↔ Seuil</th>
                <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Source</th>
                <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Justification</th>
              </tr>
            </thead>
            <tbody>${correspondenceRows}</tbody>
          </table>
        </div>

        ${thresholds.notes.length > 0 ? `
        <div style="margin-top:12px;font-size:10px;color:#94a3b8;font-style:italic;">
          ${thresholds.notes.map(n => htmlEscape(n)).join("<br/>")}
        </div>
        ` : ""}
      </div>
    </section>
  `;
}

// =============================================
// CYCLE INTELLIGENCE™ — HTML REPORT SECTION
// =============================================

function buildCycleIntelligenceHTML(payload: ExportPayload): string {
  const snapshots = payload.snapshotHistory;
  
  if (snapshots.length < 2) {
    return `
      <section id="cycle-intelligence" class="section pagebreakAvoid">
        <h2>🔄 Cycle Intelligence™</h2>
        <div class="card" style="padding:16px;">
          <p class="muted">Minimum 2 snapshots requis pour l'analyse d'évolution. Actuellement : ${snapshots.length} snapshot(s).</p>
        </div>
      </section>
    `;
  }

  // Sort by date and take the last 2
  const sorted = [...snapshots].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const prev = sorted[sorted.length - 2];
  const curr = sorted[sorted.length - 1];

  const prevData = snapshotToEngineData(prev as unknown as Record<string, unknown>);
  const currData = snapshotToEngineData(curr as unknown as Record<string, unknown>);

  const result = computeCycleIntelligence({
    previousSnapshot: prevData,
    currentSnapshot: currData,
    objectif: payload.athlete.goal || "IM",
  });

  const scoreColor = result.adaptationScore >= 70 ? "#16a34a" : result.adaptationScore >= 55 ? "#3b82f6" : result.adaptationScore >= 40 ? "#f59e0b" : "#dc2626";

  const metricsRows = result.metrics
    .filter(m => m.available)
    .map(m => {
      const changeColor = m.evolution === "positive" ? "#16a34a" : m.evolution === "negative" ? "#dc2626" : "#64748b";
      const changeIcon = m.evolution === "positive" ? "↑" : m.evolution === "negative" ? "↓" : "→";
      const isVlamax = m.label.toLowerCase().includes("vlamax");
      const prevVal = m.previousValue != null ? (isVlamax ? m.previousValue.toFixed(2) : m.previousValue.toFixed(1)) : "—";
      const currVal = m.currentValue != null ? (isVlamax ? m.currentValue.toFixed(2) : m.currentValue.toFixed(1)) : "—";
      const significant = m.deltaPct != null && Math.abs(m.deltaPct) >= m.threshold;
      return `<tr>
        <td style="padding:6px 8px;font-weight:500;">${htmlEscape(m.label)}</td>
        <td style="padding:6px 8px;font-family:monospace;">${prevVal}</td>
        <td style="padding:6px 8px;font-family:monospace;">${currVal}</td>
        <td style="padding:6px 8px;font-family:monospace;color:${changeColor};">${changeIcon} ${m.deltaPct != null ? (m.deltaPct > 0 ? '+' : '') + m.deltaPct.toFixed(1) + '%' : '—'}</td>
        <td style="padding:6px 8px;font-size:10px;color:${changeColor};">${significant ? '✓ Significatif' : 'Non significatif'}</td>
      </tr>`;
    }).join("");

  return `
    <section id="cycle-intelligence" class="section pagebreakAvoid">
      <h2>🔄 Cycle Intelligence™</h2>
      
      <div class="card" style="padding:16px;">
        <!-- Score global -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
          <div style="width:64px;height:64px;border-radius:50%;border:4px solid ${scoreColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="font-size:20px;font-weight:700;color:${scoreColor};font-family:monospace;">${result.adaptationScore}</span>
          </div>
          <div>
            <div style="font-size:14px;font-weight:700;">${result.verdictEmoji} ${htmlEscape(result.verdictLabel)}</div>
            <div style="font-size:11px;color:#64748b;">
              ${htmlEscape(dtStr(prev.date))} → ${htmlEscape(dtStr(curr.date))} (${result.daysBetween} jours)
            </div>
          </div>
        </div>

        <!-- Metrics table -->
        ${metricsRows ? `
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0;">
              <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Métrique</th>
              <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Avant</th>
              <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Après</th>
              <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Δ</th>
              <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:500;">Statut</th>
            </tr>
          </thead>
          <tbody>${metricsRows}</tbody>
        </table>
        ` : ""}

        <!-- Recommendation -->
        <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-top:8px;">
          <div style="font-size:12px;font-weight:600;margin-bottom:4px;">💡 ${htmlEscape(result.recommendationLabel)}</div>
          <div style="font-size:11px;color:#64748b;">${htmlEscape(result.recommendationDetail)}</div>
        </div>

        <div style="margin-top:12px;font-size:10px;color:#94a3b8;font-style:italic;">
          ${htmlEscape(result.staffNote)}
        </div>
      </div>
    </section>
  `;
}

// =============================================

function buildRoadmapHTML(payload: ExportPayload): string {
  // ✅ Réutilise le limiter unifié du payload (source unique de vérité)
  const limiterResult = payload.unifiedLimiter;

  const roadmap = computeStrategicRoadmap({ objectif: payload.athlete.goal, limiterResult });
  const { phases, totalWeeks, title } = roadmap;

  const W = 900, H = 360, marginLeft = 60, marginRight = 30, chartTop = 40;
  const chartBottom = H - 60;
  const chartWidth = W - marginLeft - marginRight;
  const weekWidth = chartWidth / totalWeeks;

  const step = totalWeeks <= 12 ? 1 : 2;
  const weekLabels = Array.from({ length: totalWeeks }, (_, i) => i + 1)
    .filter(w => w % step === 1 || step === 1)
    .map(w => {
      const x = marginLeft + (w - 0.5) * weekWidth;
      return `<text x="${x}" y="${chartBottom + 30}" text-anchor="end" transform="rotate(-45 ${x} ${chartBottom + 30})" font-size="10" fill="#374151">S${w}</text>`;
    }).join('\n');

  const axisLine = `<line x1="${marginLeft}" y1="${chartTop}" x2="${marginLeft}" y2="${chartBottom}" stroke="#9ca3af" stroke-width="1"/>`;
  const baseLine = `<line x1="${marginLeft}" y1="${chartBottom}" x2="${W - marginRight}" y2="${chartBottom}" stroke="#9ca3af" stroke-width="1"/>`;

  const barHeight = 32;
  const phaseBars = phases.map((phase, idx) => {
    const x = marginLeft + (phase.startWeek - 1) * weekWidth;
    const width = (phase.endWeek - phase.startWeek + 1) * weekWidth;
    const yOffset = chartTop + 20 + idx * 50;
    const isDark = phase.color === '#1e3a5f';
    const isGreen = phase.color === '#86efac';
    const textColor = isDark ? '#ffffff' : (isGreen ? '#1e3a5f' : '#1e293b');
    return `
      <text x="${x + width / 2}" y="${yOffset - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="#1e293b">${phase.name}</text>
      <rect x="${x}" y="${yOffset}" width="${width}" height="${barHeight}" rx="6" fill="${phase.color}" />
      <text x="${x + width / 2}" y="${yOffset + barHeight / 2 + 4}" text-anchor="middle" font-size="10" font-weight="500" fill="${textColor}">${phase.subtitle}</text>
    `;
  }).join('\n');

  const phaseDetailsHTML = phases.map(phase => `
    <div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <div style="width:12px;height:12px;border-radius:3px;background:${phase.color};"></div>
        <span style="font-weight:600;font-size:13px;color:#1e293b;">${phase.name}</span>
        <span style="font-size:11px;color:#64748b;">S${phase.startWeek}\u2013S${phase.endWeek}</span>
      </div>
      <p style="font-size:11px;color:#475569;margin-bottom:6px;">${phase.focus}</p>
      ${phase.levers.length > 0 ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
          ${phase.levers.map(l => `<span style="font-size:10px;padding:2px 6px;background:#f1f5f9;border-radius:4px;color:#334155;">${l}</span>`).join('')}
        </div>
      ` : ''}
      ${phase.targets.length > 0 ? `
        <div style="margin-top:4px;">
          ${phase.targets.map(t => `<div style="font-size:10px;color:#0369a1;">\u{1F3AF} ${t}</div>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');

  return `
    <section class="page-break" style="margin-top:36px;">
      <div class="card" style="padding:28px;">
        <h2 style="font-size:20px;font-weight:700;margin-bottom:4px;color:#1e293b;">\u{1F4CB} ${title}</h2>
        <p style="font-size:12px;color:#64748b;margin-bottom:4px;">Périodisation stratégique — Two For Coaching Lab\u2122</p>
        ${roadmap.personalized ? `<p style="font-size:11px;color:#0369a1;margin-bottom:16px;padding:6px 10px;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;">${roadmap.limiterSummary}</p>` : '<div style="margin-bottom:16px;"></div>'}
        <div style="background:#ffffff;border-radius:8px;padding:12px;border:1px solid #e2e8f0;">
          <svg width="100%" viewBox="0 0 ${W} ${H}" style="background:#ffffff;" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
            ${axisLine}
            ${baseLine}
            ${phaseBars}
            ${weekLabels}
          </svg>
        </div>
        <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${phaseDetailsHTML}
        </div>
      </div>
    </section>
  `;
}

// =============================================
// VLAMAX ZONE × CONFIANCE — SVG CHART (PDF)
// =============================================

function buildVLamaxZoneConfidenceHTML(payload: ExportPayload): string {
  const v2 = payload.vlamax.v2;
  if (!v2 || v2.effective === null) {
    return `
      <section id="vlamax-zone-confidence" class="section pagebreakAvoid">
        <h2>⚡ VLamax = Zone × Fiabilité</h2>
        <div class="card">
          <p class="muted" style="text-align:center;">Données insuffisantes pour positionner l'athlète sur le graphique VLamax Zone × Fiabilité.</p>
        </div>
      </section>
    `;
  }

  const goal = payload.athlete.goal || "";
  const isRun = ["Marathon", "Semi", "Trail", "TrailLong", "TrailCourt", "Ultra", "Course"].includes(goal);
  const xMin = 0.20;
  const xMax = isRun ? 0.90 : 1.05;
  const xRange = xMax - xMin;

  // Zones physiologiques
  const zones = [
    { id: "diesel",    label: "Diesel",    min: 0.20, max: 0.30, color: "rgba(59,130,246,0.15)",  textColor: "#1d4ed8" },
    { id: "endurance", label: "Endurance", min: 0.30, max: 0.40, color: "rgba(34,197,94,0.15)",   textColor: "#15803d" },
    { id: "allround",  label: "All-round", min: 0.40, max: 0.55, color: "rgba(234,179,8,0.15)",   textColor: "#92400e" },
    { id: "puncheur",  label: "Puncheur",  min: 0.55, max: 0.70, color: "rgba(249,115,22,0.15)",  textColor: "#9a3412" },
    { id: "sprinter",  label: "Sprinter",  min: 0.70, max: 1.10, color: "rgba(239,68,68,0.15)",   textColor: "#b91c1c" },
  ].filter(z => z.min < xMax && z.max > xMin).map(z => ({
    ...z,
    min: Math.max(z.min, xMin),
    max: Math.min(z.max, xMax),
  }));

  // SVG dimensions
  const W = 500, H = 300;
  const pad = { top: 25, right: 30, bottom: 50, left: 55 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const toX = (v: number) => pad.left + ((v - xMin) / xRange) * plotW;
  const toY = (c: number) => pad.top + (1 - c) * plotH;

  // Athlete point
  const ax = toX(v2.effective!);
  const ay = toY(v2.confidence);
  const errLeft = toX(v2.effective! - v2.errorMargin);
  const errRight = toX(v2.effective! + v2.errorMargin);

  // Find zone for color
  const athleteZone = zones.find(z => v2.effective! >= z.min && v2.effective! < z.max) || zones[2];
  const opacity = Math.max(0.5, v2.confidence);

  // Confidence labels
  const confLevels = [
    { y: 0.0, label: "Exploratoire" },
    { y: 0.4, label: "Tendance" },
    { y: 0.6, label: "Décision utilisable" },
    { y: 0.8, label: "Décision robuste" },
  ];

  // Source label
  const sourceLabel = v2.source === "test_labo" ? "Test labo" 
    : v2.source === "test_terrain" ? "Test terrain" 
    : v2.source === "semaine_reference" ? "Semaine référence"
    : v2.source === "estimation" ? "Estimation continue" : "—";

  // Badges
  const badges: string[] = [];
  if (v2.confidence < 0.6) badges.push("⚠️ Décision à confirmer");
  if (v2.variationWarning) badges.push("🔄 Variation détectée");

  // Confidence label
  const confLabel = v2.confidence >= 0.85 ? "Très fiable" 
    : v2.confidence >= 0.70 ? "Fiable" 
    : v2.confidence >= 0.50 ? "Modéré" 
    : v2.confidence >= 0.35 ? "Faible" : "Fragile";

  return `
    <section id="vlamax-zone-confidence" class="section pagebreakAvoid">
      <h2>⚡ VLamax = Zone physiologique × Fiabilité</h2>
      
      <div class="alert alertInfo mb" style="font-size:11px;">
        <b>📊 Graphique signature TFCL :</b> Ce graphique positionne l'athlète selon sa zone physiologique VLamax (axe X) et le niveau de fiabilité de la mesure (axe Y). 
        La décision coaching doit reposer sur la <b>zone + source</b>, pas sur le centième.
      </div>

      <div class="card cardHighlight">
        ${badges.length > 0 ? `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">${badges.map(b => `<span class="badge badgeWarning" style="font-size:10px;padding:4px 10px;">${b}</span>`).join('')}</div>` : ''}
        
        <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="max-width:520px;margin:0 auto;display:block;background:#ffffff;">
          <!-- White background -->
          <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
          <!-- Zone bands -->
          ${zones.map(z => `<rect x="${toX(z.min)}" y="${pad.top}" width="${toX(z.max) - toX(z.min)}" height="${plotH}" fill="${z.color}" />`).join('\n          ')}
          
          <!-- Grid lines -->
          ${[0.2, 0.4, 0.6, 0.8, 1.0].map(c => `<line x1="${pad.left}" y1="${toY(c)}" x2="${W - pad.right}" y2="${toY(c)}" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="4 4"/>`).join('\n          ')}
          
          <!-- Confidence threshold lines -->
          ${[0.4, 0.6, 0.8].map(c => `<line x1="${pad.left}" y1="${toY(c)}" x2="${W - pad.right}" y2="${toY(c)}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="6 3"/>`).join('\n          ')}
          
          <!-- Confidence level labels -->
          ${confLevels.map(cl => `<text x="${W - pad.right + 3}" y="${toY(cl.y) + 4}" font-size="7" fill="#64748b" text-anchor="start">${cl.label}</text>`).join('\n          ')}
          
          <!-- Zone labels at top -->
          ${zones.map(z => {
            const cx = (toX(z.min) + toX(z.max)) / 2;
            return `<text x="${cx}" y="${pad.top - 8}" font-size="9" fill="${z.textColor}" text-anchor="middle" font-weight="600">${z.label}</text>`;
          }).join('\n          ')}
          
          <!-- Axes -->
          <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${H - pad.bottom}" stroke="#334155" stroke-width="1.5"/>
          <line x1="${pad.left}" y1="${H - pad.bottom}" x2="${W - pad.right}" y2="${H - pad.bottom}" stroke="#334155" stroke-width="1.5"/>
          
          <!-- X axis ticks -->
          ${Array.from({ length: Math.round(xRange / 0.1) + 1 }, (_, i) => xMin + i * 0.1).filter(v => v <= xMax + 0.001).map(v => `
            <line x1="${toX(v)}" y1="${H - pad.bottom}" x2="${toX(v)}" y2="${H - pad.bottom + 5}" stroke="#334155" stroke-width="1"/>
            <text x="${toX(v)}" y="${H - pad.bottom + 16}" font-size="9" fill="#334155" text-anchor="middle">${v.toFixed(1)}</text>
          `).join('')}
          
          <!-- Y axis ticks -->
          ${[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(c => `
            <line x1="${pad.left - 5}" y1="${toY(c)}" x2="${pad.left}" y2="${toY(c)}" stroke="#334155" stroke-width="1"/>
            <text x="${pad.left - 8}" y="${toY(c) + 3}" font-size="9" fill="#334155" text-anchor="end">${c.toFixed(1)}</text>
          `).join('')}
          
          <!-- Axis labels -->
          <text x="${(pad.left + W - pad.right) / 2}" y="${H - 5}" font-size="10" fill="#334155" text-anchor="middle">VLamax (mmol/L/s)</text>
          <text x="12" y="${(pad.top + H - pad.bottom) / 2}" font-size="10" fill="#334155" text-anchor="middle" transform="rotate(-90, 12, ${(pad.top + H - pad.bottom) / 2})">Fiabilité</text>
          
          <!-- Error bar -->
          <line x1="${errLeft}" y1="${ay}" x2="${errRight}" y2="${ay}" stroke="${athleteZone.textColor}" stroke-width="2.5" stroke-opacity="0.5"/>
          <line x1="${errLeft}" y1="${ay - 4}" x2="${errLeft}" y2="${ay + 4}" stroke="${athleteZone.textColor}" stroke-width="1.5" stroke-opacity="0.5"/>
          <line x1="${errRight}" y1="${ay - 4}" x2="${errRight}" y2="${ay + 4}" stroke="${athleteZone.textColor}" stroke-width="1.5" stroke-opacity="0.5"/>
          
          <!-- Athlete point -->
          <circle cx="${ax}" cy="${ay}" r="8" fill="${athleteZone.textColor}" fill-opacity="${opacity}" stroke="#fff" stroke-width="2.5"/>
        </svg>

        <!-- Summary row -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:12px;background:#f8fafc;border-radius:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:14px;height:14px;border-radius:50%;background:${athleteZone.textColor};opacity:${opacity};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
            <div>
              <span style="font-size:18px;font-weight:800;font-family:ui-monospace,monospace;">≈ ${v2.effective!.toFixed(2)}</span>
              <span style="font-size:12px;color:#64748b;margin-left:6px;">± ${v2.errorMargin.toFixed(2)}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="badge ${v2.confidence >= 0.7 ? 'badgeSuccess' : v2.confidence >= 0.5 ? 'badgeWarning' : 'badgeError'}" style="font-size:11px;padding:5px 12px;">
              🛡️ ${confLabel}
            </span>
          </div>
        </div>

        <!-- Details -->
        <div class="grid3 mt">
          <div class="card" style="padding:10px;">
            <div style="font-size:10px;color:#64748b;">Zone</div>
            <div style="font-size:14px;font-weight:700;color:${athleteZone.textColor};">${athleteZone.label}</div>
          </div>
          <div class="card" style="padding:10px;">
            <div style="font-size:10px;color:#64748b;">Source</div>
            <div style="font-size:12px;font-weight:600;">${sourceLabel}</div>
          </div>
          <div class="card" style="padding:10px;">
            <div style="font-size:10px;color:#64748b;">Plage</div>
            <div style="font-size:12px;font-weight:600;font-family:ui-monospace,monospace;">${v2.range ? `${v2.range.low.toFixed(2)} – ${v2.range.high.toFixed(2)}` : '—'}</div>
          </div>
        </div>

        ${v2.confidence < 0.4 ? `
          <div class="alert alertWarning mt" style="font-size:11px;">
            <b>⚠️ Fiabilité insuffisante pour une recommandation automatique.</b><br>
            La VLamax est positionnée à titre indicatif. Réalisez un test terrain ou importez des données supplémentaires pour fiabiliser la décision.
          </div>
        ` : ''}
      </div>

      <div class="alert alertInfo mt" style="font-size:10px;">
        <b>💡 Pourquoi ce graphique ?</b> La VLamax est une estimation continue influencée par la qualité des données, la fatigue et le type de test. 
        TFCL affiche volontairement une valeur avec marge d'erreur et niveau de fiabilité, car la décision d'entraînement dépend davantage de la <b>zone physiologique</b> que d'un chiffre isolé. 
        Une variation de ±0.02 est physiologiquement normale et ne justifie pas un changement de stratégie.
      </div>
    </section>
  `;
}

// =============================================
// RUN MLSS COHÉRENCE — Modèle C (RMSE 2.64% sur N=14 run)
// Affiche % MLSS effectif (observé > prédit), source, prédiction, cross-validation
// =============================================
function buildRunMLSSCoherenceHTML(payload: ExportPayload): string {
  const runMLSS = payload.runMLSS;
  const goal = payload.athlete.goal || "";
  const isRun = goal.includes("km") || goal.includes("Marathon") || goal.includes("Semi") || goal.includes("Trail") || goal.includes("Ultra") || (payload.effectiveSnapshot?.sport_main === "run");

  // Section masquée si pas pertinente (sport non-run, pas de données)
  if (!isRun && !runMLSS) {
    return `
      <section id="run-mlss-coherence" class="section pagebreakAvoid">
        <h2>🎯 Run MLSS — Cohérence Modèle C</h2>
        <div class="card" style="font-size:11px;color:#64748b;">
          Section non pertinente pour cet objectif (cycliste/triathlon non-run-focus).
        </div>
      </section>`;
  }

  if (!runMLSS) {
    return `
      <section id="run-mlss-coherence" class="section pagebreakAvoid">
        <h2>🎯 Run MLSS — Cohérence Modèle C</h2>
        <div class="alert alertWarning" style="font-size:11px;">
          <b>Données insuffisantes</b> — Ajoutez VLamax run et économie de course (CE) pour activer la prédiction Modèle C.
        </div>
      </section>`;
  }

  const effectivePct = runMLSS.effectivePct;
  const effectiveSource = runMLSS.effectiveSource;
  const observedPct = runMLSS.observedPct;
  const prediction = runMLSS.prediction;
  const crossValidation = runMLSS.crossValidation;

  const sourceLabel = effectiveSource === "observed"
    ? "🎯 Observé (test seuil 30 min terrain)"
    : effectiveSource === "predicted"
      ? "🧪 Prédit (Modèle C — RMSE 2.64 %)"
      : "—";

  const sourceBadgeClass = effectiveSource === "observed" ? "badgeSuccess" : effectiveSource === "predicted" ? "badgeWarning" : "badgeError";

  const xvSeverityClass: Record<string, string> = {
    ok: "alertSuccess",
    warning: "alertWarning",
    critical: "alertError",
  };
  const xvAlertClass = crossValidation ? (xvSeverityClass[crossValidation.severity] ?? "alertInfo") : "alertInfo";

  const predBlock = prediction ? `
    <div class="card" style="padding:10px;">
      <div style="font-size:10px;color:#64748b;">Prédit Modèle C</div>
      <div style="font-size:14px;font-weight:700;font-family:ui-monospace,monospace;">${prediction.mlssPct.toFixed(1)}% VMA</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px;">RMSE ±${prediction.trace.rmseExpected.toFixed(2)}%</div>
    </div>` : `
    <div class="card" style="padding:10px;">
      <div style="font-size:10px;color:#64748b;">Prédit Modèle C</div>
      <div style="font-size:12px;color:#94a3b8;">VLamax run ou CE manquant</div>
    </div>`;

  const obsBlock = observedPct != null ? `
    <div class="card" style="padding:10px;">
      <div style="font-size:10px;color:#64748b;">Observé terrain</div>
      <div style="font-size:14px;font-weight:700;font-family:ui-monospace,monospace;">${observedPct.toFixed(1)}% VMA</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px;">Pace seuil / VMA</div>
    </div>` : `
    <div class="card" style="padding:10px;">
      <div style="font-size:10px;color:#64748b;">Observé terrain</div>
      <div style="font-size:12px;color:#94a3b8;">Pas de test seuil</div>
    </div>`;

  const xvBlock = crossValidation && observedPct != null && prediction ? `
    <div class="alert ${xvAlertClass} mt" style="font-size:11px;">
      <b>🔬 Cross-validation observé vs prédit :</b> Δ = ${crossValidation.deltaPct > 0 ? "+" : ""}${crossValidation.deltaPct.toFixed(1)}% — <b>${crossValidation.severity.toUpperCase()}</b><br>
      ${crossValidation.explanation ?? ""}
    </div>` : "";

  return `
    <section id="run-mlss-coherence" class="section pagebreakAvoid">
      <h2>🎯 Run MLSS — Cohérence Modèle C <span style="font-size:11px;font-weight:400;color:#64748b;">(RMSE 2.64% sur N=14 run)</span></h2>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <div style="font-size:10px;color:#64748b;">% MLSS effectif (utilisé pour ancrage Z5)</div>
            <div style="font-size:24px;font-weight:800;font-family:ui-monospace,monospace;">
              ${effectivePct != null ? `${effectivePct.toFixed(1)}% VMA` : "—"}
            </div>
          </div>
          <span class="badge ${sourceBadgeClass}" style="font-size:11px;padding:5px 12px;">${sourceLabel}</span>
        </div>

        <div class="grid2">
          ${obsBlock}
          ${predBlock}
        </div>

        ${xvBlock}
      </div>

      <div class="alert alertInfo mt" style="font-size:10px;">
        <b>📚 Modèle C (TFCL™ N=14 run) :</b> <code>MLSS_pct = 1 − 0.337·VLa_run − 0.0021·(CE − 200)</code>.
        Quand un test seuil 30 min est disponible, l'observé prime. Sinon, la prédiction Modèle C ancre Z5 dans le plan IA (à confirmer par un test terrain).
      </div>
    </section>
  `;
}

// =============================================
// BUILD STAFF-GRADE REPORT HTML
// Rapport scientifiquement rigoureux, pédagogiquement clair,
// et explicitement non dogmatique
// =============================================

// =============================================
// EXECUTIVE SUMMARY — Page autonome "si tu ne lis qu'une chose"
// Placée juste après la cover, avant toute section technique.
// Répond à 4 questions : profil, limiteur, leviers, chrono, risque.
// =============================================
function buildExecutiveSummaryHTML(payload: ExportPayload): string {
  const {
    athlete, effectiveRefs, effectiveSnapshot, vlamax,
    unifiedLimiter, capInjuryRisk, nutritionEstimate, ambition, raceRecords,
  } = payload;

  const goal = normalizeRaceType(athlete.goal || "IM");
  const goalLabel = getObjectifLabel(athlete.goal);
  const runGoals = new Set(["MARATHON", "SEMI", "10K", "5K", "TRAIL", "ULTRA_TRAIL", "ULTRA"]);
  const triGoals = new Set(["IM", "70.3", "OLYMPIQUE", "SPRINT"]);
  const disciplineLabel = runGoals.has(goal as string) ? "Coureur"
    : triGoals.has(goal as string) ? "Triathlète"
    : "Cycliste";
  const ambitionCur = ambition?.current as string | undefined;
  const ambitionLabel = ambitionCur === "world_class" ? "élite"
    : ambitionCur === "competitor" ? "compétiteur"
    : ambitionCur === "finisher" ? "finisher"
    : ambitionCur === "age_group" ? "âge-groupe"
    : "intermédiaire";

  const vlaVal = vlamax?.value ?? null;
  const orientation = vlaVal == null ? null
    : vlaVal <= 0.35 ? "profil plutôt aérobie"
    : vlaVal >= 0.55 ? "profil plutôt glycolytique"
    : "profil équilibré";

  const isRun = runGoals.has(goal as string);
  const keyMetric = isRun && effectiveSnapshot?.vma
    ? `VMA ${effectiveSnapshot.vma.toFixed(1)} km/h`
    : (effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0)
      ? `FTP ${(effectiveRefs.ftp / effectiveRefs.weightKg).toFixed(1)} W/kg`
      : effectiveRefs.ftp
        ? `FTP ${effectiveRefs.ftp} W`
        : null;

  const profilePhrase = [
    `${disciplineLabel} ${ambitionLabel}`,
    orientation,
    keyMetric,
    `objectif ${goalLabel}`,
  ].filter(Boolean).join(", ") + ".";

  // ─── Facteur limitant ─────────────────────────────
  const hasLimiter = !!(unifiedLimiter && unifiedLimiter.limiterLabel);
  const limiterName = hasLimiter ? htmlEscape(unifiedLimiter.limiterLabel) : null;
  const limiterImplication = hasLimiter
    ? (unifiedLimiter.leverLabel
        ? `Le travail « ${htmlEscape(unifiedLimiter.leverLabel)} » est la priorité du cycle.`
        : "C'est l'axe prioritaire du cycle.")
    : null;

  // ─── Leviers prioritaires ─────────────────────────
  const VERB_BY_METRIC: Record<string, string> = {
    "VO2max": "Développer le VO2max (fractionné long 3–5 min)",
    "FTP/kg": "Élever le seuil (sweet spot & 2×20 min)",
    "VMA": "Travailler la VMA (fractionné court 200–400 m)",
    "VLamax": "Abaisser la VLamax (volume Z2, moins de sprints)",
    "TTE": "Prolonger le TTE (2×20 → 1×45 min au seuil)",
    "Economy": "Améliorer l'économie (drills, cadence, plyométrie)",
    "FatMax": "Élever le FatMax (sorties longues Z2 à jeun)",
    "Durability": "Renforcer la durabilité (sorties >3 h, back-to-back)",
  };
  const gaps = ((unifiedLimiter as any)?.gapAnalysis ?? [])
    .filter((g: any) => g?.status !== "unknown" && typeof g?.gap === "number" && g.gap < -3)
    .sort((a: any, b: any) => a.gap - b.gap)
    .slice(0, 3);
  const leviers: string[] = gaps.map((g: any) => VERB_BY_METRIC[g.metric] || `Développer ${g.metric}`);

  // ─── Prédiction chrono ────────────────────────────
  let predictionBlock: string | null = null;
  try {
    const vo2 = effectiveRefs.vo2max ?? effectiveSnapshot?.vo2max ?? null;
    const wKg = effectiveRefs.weightKg ?? effectiveSnapshot?.weight_kg ?? null;
    if (vo2 && vlaVal && wKg) {
      const output = computePerformancePredictions({
        vo2max: vo2, vlamax: vlaVal, weight: wKg,
        ftp: effectiveRefs.ftp ?? null,
        vma: effectiveSnapshot?.vma ?? null,
        css: effectiveSnapshot?.css ?? null,
        confidence: (vlamax?.confidence ?? 0) / 100,
        raceRecords: raceRecords ?? null,
      });
      const optimal = output.scenarios.find((s: any) => s.scenario === "optimal") ?? output.scenarios[0];
      const races: any[] = optimal?.predictions ?? [];
      const goalMap: Record<string, string[]> = {
        MARATHON: ["marathon", "42"], SEMI: ["semi", "21", "half"], "10K": ["10 k", "10k"], "5K": ["5 k", "5k"],
        IM: ["ironman", "im"], "70.3": ["70.3", "half"], OLYMPIQUE: ["olymp"], SPRINT: ["sprint"],
        TRAIL: ["trail"], ULTRA_TRAIL: ["ultra"], ULTRA: ["ultra"],
      };
      const needles = goalMap[goal as string] ?? [];
      const norm = (s: string) => (s || "").toLowerCase();
      const match = races.find((r: any) => needles.some(n => norm(r.raceName).includes(n) || norm(r.distance).includes(n)));
      const chosen = match ?? races[0];
      if (chosen && chosen.timeFormatted) {
        const hasRecords = !!(raceRecords && Object.values(raceRecords).some((v) => v != null));
        const source = hasRecords ? "recalé sur tes records récents" : "estimation physiologique pure";
        predictionBlock = `
          <div class="execValue">${htmlEscape(chosen.timeFormatted)}</div>
          <div class="execMeta">sur ${htmlEscape(chosen.raceName)} · <i>${source}</i></div>
        `;
      }
    }
  } catch { /* silencieux : bloc masqué */ }

  // ─── Risque n°1 ───────────────────────────────────
  let riskBlock: string;
  const capLevel = capInjuryRisk?.level ?? 0;              // 0..4
  const nutR = nutritionEstimate?.riskLevel ?? "low";
  const nutScore = nutR === "critical" ? 4 : nutR === "high" ? 3 : nutR === "moderate" ? 2 : 1;
  if (Math.max(capLevel, nutScore) >= 2) {
    const capWins = capLevel >= nutScore;
    if (capWins && capInjuryRisk) {
      const word = capLevel >= 3 ? "Blessure" : "Surcharge";
      const action = capLevel >= 3
        ? "réduire le volume CAP et renforcer la prévention."
        : "surveiller la charge et intégrer davantage de récupération.";
      riskBlock = `<div class="execValue riskHigh">${word}</div><div class="execMeta"><b>Action :</b> ${htmlEscape(action)}</div>`;
    } else if (nutritionEstimate) {
      const action = `viser ${nutritionEstimate.carbsMin}–${nutritionEstimate.carbsMax} g/h de glucides en course.`;
      riskBlock = `<div class="execValue riskHigh">Carburant</div><div class="execMeta"><b>Action :</b> ${htmlEscape(action)}</div>`;
    } else {
      riskBlock = `<div class="execValue riskLow">Aucun risque majeur</div><div class="execMeta">Maintien du cadre d'entraînement.</div>`;
    }
  } else {
    riskBlock = `<div class="execValue riskLow">Aucun risque majeur</div><div class="execMeta">Maintien du cadre d'entraînement actuel.</div>`;
  }

  const leviersBlock = leviers.length > 0
    ? `<ol class="execLeviers">${leviers.map(l => `<li>${htmlEscape(l)}</li>`).join("")}</ol>`
    : `<p class="execMeta">Pas d'axe prioritaire détecté — maintenir la routine.</p>`;

  return `
    <section class="section execSummary pagebreak">
      <style>
        .execSummary { padding: 28px 8px 12px; }
        .execHeader { border-bottom: 2px solid #1e3a5f; padding-bottom: 14px; margin-bottom: 22px; }
        .execEyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #64748b; font-weight: 700; }
        .execTitle { font-size: 28px; font-weight: 800; margin: 6px 0 0; color: #0f172a; letter-spacing: -0.01em; }
        .execSubtitle { font-size: 13px; color: #475569; margin-top: 4px; }
        .execProfileBlock { border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); margin-bottom: 16px; break-inside: avoid; }
        .execGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .execBlock { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; background: #ffffff; break-inside: avoid; }
        .execLabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #64748b; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .execValue { font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.25; }
        .execValue.riskHigh { color: #b91c1c; }
        .execValue.riskLow { color: #15803d; }
        .execMeta { font-size: 12px; color: #475569; margin-top: 6px; line-height: 1.5; }
        .execProfile { font-size: 16px; line-height: 1.5; color: #0f172a; font-weight: 500; }
        .execLeviers { margin: 4px 0 0; padding-left: 20px; }
        .execLeviers li { font-size: 13px; line-height: 1.55; color: #1e293b; margin-bottom: 4px; }
        .execFooter { margin-top: 18px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #94a3b8; text-align: center; letter-spacing: 0.05em; }
        @media print {
          .execSummary { page-break-after: always; break-after: page; }
        }
      </style>

      <div class="execHeader">
        <div class="execEyebrow">Si tu ne lis qu'une page</div>
        <div class="execTitle">Synthèse en 30 secondes</div>
        <div class="execSubtitle">Les réponses essentielles avant tout détail technique.</div>
      </div>

      <div class="execProfileBlock">
        <div class="execLabel">👤 Profil</div>
        <div class="execProfile">${htmlEscape(profilePhrase)}</div>
      </div>

      <div class="execGrid">
        ${hasLimiter ? `
          <div class="execBlock">
            <div class="execLabel">🎯 Facteur limitant principal</div>
            <div class="execValue">${limiterName}</div>
            <div class="execMeta">→ ${limiterImplication}</div>
          </div>
        ` : ''}

        <div class="execBlock">
          <div class="execLabel">🔧 Leviers prioritaires</div>
          ${leviersBlock}
        </div>

        ${predictionBlock ? `
          <div class="execBlock">
            <div class="execLabel">⏱️ Chrono cible</div>
            ${predictionBlock}
          </div>
        ` : ''}

        <div class="execBlock">
          <div class="execLabel">⚠️ Risque n°1</div>
          ${riskBlock}
        </div>
      </div>

      <div class="execFooter">DÉTAILS, MÉTHODOLOGIE ET GRAPHIQUES DANS LES SECTIONS SUIVANTES →</div>
    </section>
  `;
}

function buildStaffGradeReportHTML(payload: ExportPayload, logoBase64: string, options: ExportOptions = { sections: DEFAULT_REPORT_SECTIONS }, calibrationEvidences: CalibrationEvidence[] = []): string {
  const { 
    athlete, effectiveSnapshot, effectiveRefs, 
    vlamax, tte, potentielPhysiologique,
    tests, snapshotHistory, checkins, completude, reportDate,
    nutritionEstimate, capInjuryRisk, ageAdjustment, ambition
  } = payload;
  
  const isAthlete = options.audience === "athlete";
  // Propage l'audience au payload pour que les builders externes (nutritionV2, fatmax, pacing…) puissent adapter leur rendu
  payload.audience = isAthlete ? "athlete" : "staff";
  
  const refs = getAthleteRefsForZones(effectiveRefs);
  // ✅ Source de vérité unifiée : ambitions + âge (mêmes cibles que dashboard/limiteur)
  const targets = buildReportTargetsFromUnifiedLimiter(payload.unifiedLimiter, athlete.goal, ambition.current);
  const weights = getWeightsBySport(athlete.goal || "IM");

  // =============================================
  // CONSTANTES BRANDING REPOSITIONNÉ (NON DOGMATIQUE)
  // =============================================
  const brandMain = "Two For Coaching Lab";
  const brandSub = "Rapport de Modélisation Physiologique & Aide à la Décision";
  const createdAt = new Date(reportDate);
  const title = `${brandMain} — Modélisation Physiologique — ${athlete.name || "Athlète"}`;

  const coverObjective = htmlEscape(getObjectifLabel(athlete.goal));
  const coverAthlete = htmlEscape(athlete.name || "Athlète");
  const coverDate = htmlEscape(createdAt.toLocaleDateString("fr-FR"));
  const snapshotDate = effectiveSnapshot ? dtStr(effectiveSnapshot.date) : "—";
  const snapshotSource = effectiveSnapshot?.source || "—";
  const cycleTag = effectiveSnapshot?.cycle_tag || "—";
  
  const ftpKg = effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0 
    ? effectiveRefs.ftp / effectiveRefs.weightKg 
    : null;

  // ✅ NEW: Profil VLamax ajusté par âge
  const vlamaxProfilAgeAdjusted = getAgeAdjustedVLamaxProfil(vlamax.value, ageAdjustment.age);
  const vlamaxAgeStatus = getVLamaxAgeStatus(vlamax.value, ageAdjustment.age, athlete.goal || "IM");
  
  // Helper pour couleur profil
  const getProfilColor = (profil: VLamaxProfil): string => {
    switch (profil) {
      case "diesel": return "#0891b2"; // cyan
      case "endurant": return "#06b6d4"; // cyan lighter
      case "equilibre": return "#16a34a"; // green
      case "explosif": return "#ea580c"; // orange
      case "sprinter": return "#dc2626"; // red
      default: return "#64748b";
    }
  };
  
  const getProfilBgColor = (profil: VLamaxProfil): string => {
    switch (profil) {
      case "diesel": return "rgba(8,145,178,0.1)";
      case "endurant": return "rgba(6,182,212,0.1)";
      case "equilibre": return "rgba(22,163,74,0.1)";
      case "explosif": return "rgba(234,88,12,0.1)";
      case "sprinter": return "rgba(220,38,38,0.1)";
      default: return "#f1f5f9";
    }
  };
  
  const vlamaxProfilColor = getProfilColor(vlamaxProfilAgeAdjusted.profil);
  const vlamaxProfilBgColor = getProfilBgColor(vlamaxProfilAgeAdjusted.profil);

  // =============================================
  // CSS STYLES
  // =============================================
  const css = `
    <style>
      :root { --fg:#111; --muted:#555; --border:#ddd; --bg:#ffffff; --soft:#f7f7f7; --success:#16a34a; --warning:#d97706; --error:#dc2626; --primary:#2563eb; }
      * { box-sizing: border-box; }
      html, body { background: #ffffff !important; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: var(--fg); margin: 0; padding: 24px; line-height: 1.5; font-size: 13px; }
      h1 { margin: 0; font-size: 28px; letter-spacing: 0.2px; }
      h2 { margin: 24px 0 12px 0; font-size: 18px; border-bottom: 2px solid var(--primary); padding-bottom: 6px; color: var(--primary); page-break-after: avoid; }
      h3 { margin: 0 0 8px 0; font-size: 14px; font-weight: 600; }
      h4 { margin: 12px 0 6px 0; font-size: 13px; font-weight: 600; color: var(--muted); }
      p { margin: 6px 0; }
      .muted { color: var(--muted); font-size: 12px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .tag { border:1px solid var(--border); border-radius: 999px; padding: 4px 12px; font-size: 11px; display:inline-block; background: var(--soft); }
      .tagPrimary { border-color: var(--primary); background: rgba(37,99,235,0.1); color: var(--primary); font-weight: 600; }
      .card { border:1px solid var(--border); border-radius: 14px; padding: 16px; background: #ffffff; margin-bottom: 12px; break-inside: avoid; }
      .cardHighlight { border-color: var(--primary); background: #ffffff; box-shadow: 0 2px 8px rgba(37,99,235,0.08); }
      .cardSuccess { border-color: var(--success); background: rgba(22,163,74,0.05); }
      .cardWarning { border-color: var(--warning); background: rgba(217,119,6,0.05); }
      .cardError { border-color: var(--error); background: rgba(220,38,38,0.05); }
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
      .grid4 { display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
      .mt { margin-top: 12px; }
      .mb { margin-bottom: 12px; }
      ul { margin: 6px 0 0 0; padding-left: 20px; }
      li { margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #eee; padding: 8px; vertical-align: top; text-align: left; }
      th { font-weight: 700; background: var(--soft); }
      .big { font-size: 28px; font-weight: 700; }
      .medium { font-size: 20px; font-weight: 600; }
      .success { color: var(--success); }
      .warning { color: var(--warning); }
      .error { color: var(--error); }
      .locked { color: var(--primary); font-weight: 600; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
      .badgeSuccess { background: rgba(22,163,74,0.15); color: var(--success); }
      .badgeWarning { background: rgba(217,119,6,0.15); color: var(--warning); }
      .badgeError { background: rgba(220,38,38,0.15); color: var(--error); }
      .badgePrimary { background: rgba(37,99,235,0.15); color: var(--primary); }
      .progressBar { height: 10px; background: #eee; border-radius: 5px; overflow: hidden; }
      .progressFill { height: 100%; border-radius: 5px; }
      .kv { display:grid; grid-template-columns: 140px 1fr; gap: 4px 12px; }
      .kv .k { color: var(--muted); font-size: 12px; }
      .kv .v { font-weight: 600; }
      .toc { border:1px solid var(--border); border-radius: 14px; padding: 16px; background: var(--soft); }
      .tocTitle { font-weight: 800; margin-bottom: 10px; font-size: 14px; }
      .tocRow { display:flex; justify-content:space-between; border-bottom: 1px dashed #ddd; padding: 6px 0; font-size: 12px; }
      .tocRow a { color: var(--primary); text-decoration: none; }
      .section { margin-bottom: 24px; }
      .alert { padding: 12px; border-radius: 8px; margin: 8px 0; font-size: 12px; }
      .alertWarning { background: rgba(217,119,6,0.1); border-left: 4px solid var(--warning); }
      .alertError { background: rgba(220,38,38,0.1); border-left: 4px solid var(--error); }
      .alertSuccess { background: rgba(22,163,74,0.1); border-left: 4px solid var(--success); }
      .alertInfo { background: rgba(37,99,235,0.1); border-left: 4px solid var(--primary); }
      .footer { margin-top: 30px; font-size: 11px; color: var(--muted); border-top: 2px solid var(--border); padding-top: 15px; }
      .cover { min-height: 90vh; display:flex; flex-direction:column; justify-content:space-between; position: relative; overflow:hidden; margin-bottom: 24px; background: var(--bg); }
      .coverBanner { background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 50%, #1e3a5f 100%); padding: 40px 32px; border-radius: 18px; margin-bottom: 24px; position: relative; overflow: hidden; }
      .coverBanner::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat; opacity: 0.3; }
      .coverBannerContent { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; }
      .coverBrandBlock { display: flex; align-items: center; gap: 20px; }
      .coverLogo { height: 140px; width: auto; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); background: white; padding: 12px; border-radius: 16px; }
      .coverBrandText { color: white; }
      .coverBrandName { font-size: 28px; font-weight: 800; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.2); margin: 0; }
      .coverBrandTagline { font-size: 14px; opacity: 0.9; margin-top: 4px; font-weight: 400; letter-spacing: 1px; text-transform: uppercase; }
      .coverBannerBadges { display: flex; gap: 10px; flex-wrap: wrap; }
      .coverBannerBadge { background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.3); }
      .coverBody { flex: 1; padding: 0 8px; }
      .coverTop { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; }
      .brand { display:flex; flex-direction:column; gap: 6px; }
      .brandSub { font-size: 13px; color: var(--muted); }
      .coverMid { margin-top: 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
      .coverTitle { font-size: 36px; margin: 10px 0 8px; font-weight: 800; }
      .coverMeta { display:flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
      .coverBottom { display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; margin-top: 24px; }
      .watermark { position:absolute; right:-60px; bottom:-40px; font-size: 100px; font-weight: 900; letter-spacing: 2px; color: rgba(17,17,17,0.04); transform: rotate(-12deg); user-select: none; pointer-events:none; }
      .scoreCircle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; border: 4px solid; }
      .noPrint { margin: 12px 0; padding: 12px; background: #f0f9ff; border-radius: 8px; }
      @media print {
        html, body { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        body { margin: 10mm; padding: 0; font-size: 11px; }
        .card, .cardHighlight { background: #ffffff !important; }
        svg { background: #ffffff !important; }
        .noPrint { display:none !important; }
        
        /* === PAGE BREAK CONTROLS === */
        .pagebreak { page-break-before: always; break-before: page; }
        .pagebreakAvoid { break-inside: avoid !important; page-break-inside: avoid !important; }
        .cover { min-height: auto; page-break-after: always; break-after: page; }
        
        /* === PREVENT SECTION HEADERS FROM BEING ORPHANED === */
        h2 { 
          font-size: 14px; 
          page-break-after: avoid !important; 
          break-after: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        h3, h4 { 
          page-break-after: avoid !important; 
          break-after: avoid !important;
          orphans: 3;
          widows: 3;
        }
        
        /* === CARDS AND CONTENT BLOCKS - NEVER SPLIT === */
        .card { 
          padding: 10px; 
          break-inside: avoid !important; 
          page-break-inside: avoid !important;
        }
        .alert {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        
        /* === SECTIONS - KEEP TOGETHER WHEN POSSIBLE === */
        .section {
          break-inside: avoid-page;
          page-break-inside: avoid;
        }
        
        /* === TABLES - PREVENT AWKWARD BREAKS === */
        table { 
          break-inside: avoid !important; 
          page-break-inside: avoid !important;
        }
        thead { 
          display: table-header-group; 
        }
        tfoot { 
          display: table-footer-group; 
        }
        tr { 
          break-inside: avoid !important; 
          page-break-inside: avoid !important;
        }
        
        /* === GRIDS - KEEP TOGETHER === */
        .grid2, .grid3, .grid4 {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        
        /* === LISTS - PREVENT ORPHANED ITEMS === */
        ul, ol {
          orphans: 2;
          widows: 2;
        }
        li {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        
        /* === KEY-VALUE PAIRS - KEEP TOGETHER === */
        .kv {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        
        /* === SVG CHARTS - NEVER SPLIT === */
        svg {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        
        /* === PROGRESS BARS AND VISUAL ELEMENTS === */
        .progressBar, .scoreCircle {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        
        /* === TOC - KEEP ON SINGLE PAGE === */
        .toc {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          page-break-after: always;
          break-after: page;
        }
      }
      @media screen and (max-width: 768px) {
        .grid2, .grid3, .grid4 { grid-template-columns: 1fr; }
        .coverBottom { grid-template-columns: 1fr; }
        table { display: block; overflow-x: auto; }
      }
    </style>
  `;

  // =============================================
  // A. COUVERTURE — POSITIONNEMENT CLAIR (NON DOGMATIQUE)
  // =============================================
  const completudeBadge = completude.score >= 80 
    ? '<span class="badge badgeSuccess">Données complètes</span>'
    : completude.score >= 50 
      ? '<span class="badge badgeWarning">Données partielles</span>'
      : '<span class="badge badgeError">Données insuffisantes</span>';

  // Fonction helper pour obtenir le statut de la source (MESURE vs ESTIMATION)
  const getSourceStatus = (source: string, confidence: number): { icon: string; label: string; cssClass: string } => {
    if (source === "test" || source === "labo" || source === "observed") {
      return { icon: "🔬", label: "Mesurée", cssClass: "badgeSuccess" };
    } else if (source === "snapshot" || source === "field") {
      return { icon: "🔁", label: "Déduite", cssClass: "badgeWarning" };
    } else {
      return { icon: "🧠", label: "Estimée (modèle)", cssClass: "badgeError" };
    }
  };
  
  const vlamaxStatus = getSourceStatus(vlamax.source, vlamax.confidence);
  const tteStatus = getSourceStatus(tte.source, tte.confidence);

  const coverHTML = `
    <section class="cover">
      <!-- BANNIÈRE PROFESSIONNELLE REPOSITIONNÉE -->
      <div class="coverBanner">
        <div class="coverBannerContent">
          <div class="coverBrandBlock">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="coverLogo" />` : ''}
            <div class="coverBrandText">
              <div class="coverBrandName">${htmlEscape(brandMain)}</div>
              <div class="coverBrandTagline">${htmlEscape(brandSub)}</div>
            </div>
          </div>
          <div class="coverBannerBadges">
            <div class="coverBannerBadge">📊 Modélisation Physiologique</div>
            <div class="coverBannerBadge">📅 ${coverDate}</div>
          </div>
        </div>
      </div>
      
      <!-- ENCADRÉ OBLIGATOIRE DE POSITIONNEMENT -->
      <div class="alert alertWarning" style="margin:0 8px 20px 8px; border:2px solid var(--warning); background:rgba(217,119,6,0.08);">
        <div style="font-size:14px;font-weight:700;margin-bottom:8px;">⚠️ Ce rapport n'est pas un test physiologique</div>
        <p style="margin:4px 0;font-size:12px;">Il ne remplace ni un test lactate, ni un avis médical, ni l'expertise du coach.</p>
        <p style="margin:4px 0;font-size:12px;">Il propose une <b>modélisation cohérente</b> basée sur des données mesurées, estimées et modélisées — destinée à <b>guider les choix d'entraînement</b>.</p>
        <p style="margin:4px 0;font-size:12px;font-style:italic;color:var(--muted);">À interpréter avec esprit critique et dans le contexte global de la préparation.</p>
      </div>
      
      <!-- CORPS DE LA COUVERTURE -->
      <div class="coverBody">
        <div class="coverMid">
          <div style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;">Analyse basée sur données mesurées, estimées et modélisées</div>
          <div class="coverTitle">${coverAthlete}</div>
          <div class="coverMeta">
            <div class="tag tagPrimary"><b>Objectif:</b> ${coverObjective}</div>
            <div class="tag"><b>Snapshot:</b> ${snapshotDate}</div>
            <div class="tag"><b>Cycle:</b> ${htmlEscape(cycleTag)}</div>
            ${completudeBadge}
          </div>
        </div>

        <div class="coverBottom">
          <div class="card cardHighlight">
            <h3>🎯 Indicateurs clés — Vue rapide</h3>
            <div class="grid3 mt">
              <div>
                <span class="muted">VLamax</span><br>
                <span class="medium" style="color:${vlamaxProfilColor};">${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</span>
                <br><span class="badge" style="font-size:9px;background:${vlamaxProfilBgColor};color:${vlamaxProfilColor};">${vlamaxProfilAgeAdjusted.label}</span>
                <br><span class="muted" style="font-size:10px;">Confiance: ${vlamax.confidence >= 0.7 ? "élevée" : vlamax.confidence >= 0.4 ? "modérée" : "faible"}</span>
                ${ageAdjustment.age !== null && ageAdjustment.age >= 40 ? '<br><span class="muted" style="font-size:9px;font-style:italic;">Seuils ajustés pour ' + ageAdjustment.aai.label + '</span>' : ''}
              </div>
              <div>
                <span class="muted">TTE</span><br>
                <span class="medium ${tte.tte_min < (tte.target || 45) ? 'warning' : 'success'}">${tte.tte_min} min</span>
                <br><span class="badge ${tteStatus.cssClass}" style="font-size:9px;">${tteStatus.icon} ${tteStatus.label}</span>
                <br><span class="muted" style="font-size:10px;">Cible: ${tte.target ?? 50} min</span>
              </div>
              <div>
                <span class="muted">Potentiel Physiologique</span><br>
                <span class="medium ${potentielPhysiologique.score >= 80 ? 'success' : potentielPhysiologique.score >= 60 ? 'warning' : 'error'}">${potentielPhysiologique.score}%</span>
                <br><span class="badge badgeWarning" style="font-size:9px;">🔁 Indicateur calculé</span>
                <br><span class="muted" style="font-size:10px;">Cohérence globale</span>
              </div>
            </div>
          </div>
          <div class="card">
            <h3>📐 Références effectives</h3>
            <div class="kv">
              <div class="k">FCmax</div><div class="v">${effectiveRefs.fcMax ?? "—"} bpm</div>
              <div class="k">VMA</div><div class="v">${effectiveRefs.vma ?? "—"} km/h</div>
              <div class="k">FTP</div><div class="v">${effectiveRefs.ftp ?? "—"} W</div>
              <div class="k">Poids</div><div class="v">${effectiveRefs.weightKg ? fmt(effectiveRefs.weightKg, 1) : "—"} kg</div>
              <div class="k">FTP/kg</div><div class="v">${ftpKg ? fmt(ftpKg, 2) : "—"} W/kg</div>
            </div>
            ${ageAdjustment.age !== null ? `
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border);">
              <h4 style="margin: 0 0 8px 0; font-size: 12px;">🎂 Ajustement par l'âge (AAI)</h4>
              <div class="kv" style="font-size: 11px;">
                <div class="k">Âge</div><div class="v">${ageAdjustment.age} ans</div>
                <div class="k">Catégorie</div><div class="v">${ageAdjustment.aai.label}</div>
                <div class="k">AAI</div><div class="v">${Math.round(ageAdjustment.aai.aai * 100)}%</div>
                <div class="k">Risque ×</div><div class="v">${ageAdjustment.aai.riskMultiplier.toFixed(2)}</div>
              </div>
              <p class="muted" style="margin-top: 6px; font-size: 10px;">
                ${ageAdjustment.aai.category === "master1" || ageAdjustment.aai.category === "master2" 
                  ? "⚠️ Profil Master : cibles TTE ajustées, nutrition plus conservative recommandée." 
                  : "Profil " + (ageAdjustment.aai.category === "young" ? "jeune" : "prime") + " : pas d'ajustement majeur."}
              </p>
            </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="watermark">2FC</div>
    </section>
  `;

  // =============================================
  // SOMMAIRE REPOSITIONNÉ
  // =============================================
  const tocHTML = (() => {
    const sectionOrder = getSectionOrder();
    const sectionVisibility = options.sections;
    const visibleSections = sectionOrder.filter(key => sectionVisibility[key]);
    
    const sectionAnchors: Record<keyof ReportSections, string> = {
      synthese: "executif",
      compass: "compass",
      profilMetabolique: "profil-metabolique",
      vlamaxZoneConfidence: "vlamax-zone-confidence",
      runMLSSCoherence: "run-mlss-coherence",
      indicateurs: "indicateurs",
      pacingEnvelope: "pacing-envelope",
      potentielPhysiologiqueRunning: "potentiel-running",
      injuryRisk: "injury-risk",
      nutritionV2: "nutrition-v2",
      fatmaxTFCL: "fatmax-tfcl",
      ambitionTargets: "ambition-targets",
      ambitionPredictions: "ambition-predictions",
      evolutionCharts: "evolution-charts",
      ageAdjustment: "aai",
      ambitionLegend: "ambition-legend",
      zones: "zones",
      historique: "historique",
      tests: "tests",
      testsCalibration: "tests-calibration",
      calibrationEvidence: "calibration-evidence",
      fitImports: "fit-imports",
      checkins: "checkins",
      comprendre: "comprendre",
      qualite: "qualite",
      roadmap: "roadmap",
      lactateCurve: "lactate-curve",
      substrateCurve: "substrat-curve",
      performancePrediction: "performance-prediction",
      facteursLimitants: "facteurs-limitants",
      leviersAction: "leviers-action",
      cpWprimeWbal: "cp-wprime-wbal",
      lactateCorrespondence: "lactate-correspondence",
      cycleIntelligence: "cycle-intelligence",
    };
    
    const tocRows = visibleSections.map((key, i) => {
      const label = SECTION_LABELS[key] || key;
      const anchor = sectionAnchors[key] || key;
      return `<div class="tocRow"><a href="#${anchor}">${i + 1}. ${htmlEscape(label)}</a></div>`;
    }).join('\n      ');
    
    return `
    <div class="toc mb">
      <div class="tocTitle">📑 SOMMAIRE — Rapport de Modélisation Physiologique</div>
      <div class="tocRow"><a href="#positionnement">0. Positionnement & Comment lire ce rapport</a></div>
      ${tocRows}
    </div>
  `;
  })();

  // =============================================
  // 1. POSITIONNEMENT UNIFIÉ (FUSIONNÉ AVEC CHARTE)
  // =============================================
  const positionnementHTML = `
    <section id="positionnement" class="section" style="page-break-before: always;">
      <h2>1. Positionnement & Comment lire ce rapport</h2>
      
      <!-- ALERTE CRITIQUE -->
      <div class="alert alertWarning" style="margin-bottom:20px; border:2px solid var(--warning);">
        <div style="font-size:14px;font-weight:700;margin-bottom:8px;">⚠️ Ce rapport n'est pas un test physiologique</div>
        <p style="margin:4px 0;font-size:12px;">Il ne remplace ni un test lactate, ni un avis médical, ni l'expertise du coach.</p>
        <p style="margin:4px 0;font-size:12px;">Il propose une <b>modélisation cohérente</b> basée sur des données mesurées, estimées et modélisées — destinée à <b>guider les choix d'entraînement</b>.</p>
      </div>
      
      <!-- CE QUE C'EST / CE QUE CE N'EST PAS -->
      <div class="grid2" style="gap:16px; margin-bottom:20px;">
        <div class="card cardSuccess">
          <h3>✅ Ce que ce rapport permet</h3>
          <ul>
            <li><b>Identifier</b> les leviers physiologiques prioritaires</li>
            <li><b>Hiérarchiser</b> les axes de travail pour l'objectif</li>
            <li><b>Anticiper</b> certains risques (nutrition, endurance)</li>
            <li><b>Suivre</b> l'évolution longitudinale du profil</li>
            <li><b>Orienter</b> les décisions d'entraînement</li>
          </ul>
        </div>
        <div class="card cardError">
          <h3>❌ Ce que ce rapport ne fait pas</h3>
          <ul>
            <li><b>Mesurer</b> directement (lactate, VO₂, etc.)</li>
            <li><b>Prescrire</b> un plan d'entraînement automatique</li>
            <li><b>Garantir</b> une performance ou un résultat</li>
            <li><b>Remplacer</b> l'expertise et le jugement du coach</li>
            <li><b>Diagnostiquer</b> médicalement</li>
          </ul>
        </div>
      </div>
      
      <!-- SOURCES DE DONNÉES -->
      <div class="card mt">
        <h3>📐 Comprendre les sources de données</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-top:12px;">
          <thead>
            <tr style="background:var(--muted-bg);">
              <th style="padding:8px; text-align:left; border:1px solid var(--border);">Type</th>
              <th style="padding:8px; text-align:left; border:1px solid var(--border);">Signification</th>
              <th style="padding:8px; text-align:left; border:1px solid var(--border);">Confiance typique</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px; border:1px solid var(--border);">🔬 <b>Mesurée</b></td>
              <td style="padding:8px; border:1px solid var(--border);">Test direct (labo, lactate)</td>
              <td style="padding:8px; border:1px solid var(--border);">Élevée (&gt; 85%)</td>
            </tr>
            <tr style="background:var(--muted-bg);">
              <td style="padding:8px; border:1px solid var(--border);">🧠 <b>Estimée</b></td>
              <td style="padding:8px; border:1px solid var(--border);">Test terrain standardisé</td>
              <td style="padding:8px; border:1px solid var(--border);">Modérée (65 – 85%)</td>
            </tr>
            <tr>
              <td style="padding:8px; border:1px solid var(--border);">🔁 <b>Modélisée</b></td>
              <td style="padding:8px; border:1px solid var(--border);">Calcul croisé (formules)</td>
              <td style="padding:8px; border:1px solid var(--border);">Faible (&lt; 65%)</td>
            </tr>
          </tbody>
        </table>
        <p class="muted mt" style="font-size:11px;">
          Chaque métrique affiche une <b>valeur centrale</b> et une <b>plage de plausibilité</b>. Plus la confiance est basse, plus la plage est large.
        </p>
      </div>
      
      <!-- FONDEMENTS MÉTHODOLOGIQUES -->
      <div class="card mt">
        <h3>📖 Fondements méthodologiques</h3>
        <p class="muted">Les modèles Two For Coaching Lab™ s'appuient sur des relations physiologiques issues de la littérature scientifique :</p>
        <ul class="muted">
          <li><b>École allemande</b> : Mader, Heck, Olbrecht — modèles énergétiques bi-compartimental</li>
          <li><b>Concepts INSCYD-like</b> : VLamax, ratio FatMax, contribution énergétique</li>
          <li><b>Approche structurée</b> : hiérarchisation des priorités physiologiques par objectif</li>
        </ul>
      </div>
      
      <!-- MESSAGE FINAL -->
      <div class="alert alertSuccess mt">
        <b>💡 En résumé :</b> Ce rapport est un outil de <b>lecture physiologique avancée</b> pour éclairer vos décisions. 
        <b>Les décisions finales d'entraînement appartiennent toujours au coach et à l'athlète.</b>
      </div>
    </section>
  `;

  // =============================================
  // 2. SYNTHÈSE EXÉCUTIVE — LECTURE NUANCÉE (max 1 page)
  // =============================================
  const pointsForts: string[] = [];
  const pointsLimitants: string[] = [];

  if (potentielPhysiologique.details.vlamax >= 20) pointsForts.push("VLamax dans la cible");
  else pointsLimitants.push("VLamax hors cible");

  if (potentielPhysiologique.details.endurance >= 20) pointsForts.push("Endurance (TTE) solide");
  else pointsLimitants.push("Endurance à développer");

  if (potentielPhysiologique.details.puissance >= 20) pointsForts.push("Puissance relative correcte");
  else pointsLimitants.push("FTP/kg insuffisant");

  if (potentielPhysiologique.details.fraicheur >= 18) pointsForts.push("Fraîcheur optimale");
  else pointsLimitants.push("Fatigue accumulée");

  // Déterminer le profil métabolique AVEC NUANCES
  const profilMessage = (() => {
    if (vlamax.value === null) return "Données insuffisantes pour évaluer le profil métabolique. L'interprétation ci-dessous repose sur des hypothèses prudentes.";
    
    const confidenceNote = vlamax.confidence < 0.5 ? " (confiance faible — à confirmer)" : vlamax.confidence < 0.7 ? " (confiance modérée)" : "";
    
    if (potentielPhysiologique.score >= 80 && pointsLimitants.length === 0) {
      return `Le profil métabolique actuel SEMBLE cohérent avec l'objectif visé${confidenceNote}. Aucune limitation majeure identifiée sur la base des données disponibles.`;
    }
    if (potentielPhysiologique.score >= 60) {
      return `Le profil métabolique est globalement adapté à l'objectif MAIS potentiellement limité par : ${pointsLimitants.slice(0, 2).join(", ")}${confidenceNote}.`;
    }
    return `Le profil métabolique présente un DÉSALIGNEMENT potentiel avec l'objectif. Axes d'amélioration suggérés : ${pointsLimitants.slice(0, 2).join(", ")}${confidenceNote}.`;
  })();

  const risquesIdentifies = (() => {
    const risques: string[] = [];
    if (capInjuryRisk && capInjuryRisk.level >= 2) risques.push(`Risque blessure CAP (${capInjuryRisk.label})`);
    if (nutritionEstimate && (nutritionEstimate.riskLevel === "high" || nutritionEstimate.riskLevel === "critical")) {
      risques.push(`Risque nutritionnel (${nutritionEstimate.riskLabel})`);
    }
    return risques.length > 0 ? risques.join(", ") : "Aucun risque majeur identifié sur la base des données disponibles";
  })();

  const executifHTML = `
    <section id="executif" class="section pagebreak">
      <h2>2. Synthèse Exécutive — Lecture nuancée</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Rappel :</b> Cette synthèse présente des <b>indicateurs de cohérence</b>, pas des certitudes physiologiques. 
        Chaque valeur est accompagnée de son statut (mesurée/estimée) et de son niveau de confiance.
      </div>
      
      <!-- TABLE OBLIGATOIRE DES AXES CLÉS -->
      <div class="card">
        <h3>📊 Vue consolidée des axes clés</h3>
        <table>
          <thead>
            <tr>
              <th>Axe</th>
              <th>Valeur actuelle</th>
              <th>Statut</th>
              <th>Confiance</th>
              <th>Message clé</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>FTP</b></td>
              <td>${effectiveRefs.ftp ?? "—"} W ${ftpKg ? `(${fmt(ftpKg, 2)} W/kg)` : ""}</td>
              <td><span class="badge badgeSuccess">🔬 Mesurée</span></td>
              <td><span class="badge badgeSuccess">Élevée</span></td>
              <td class="muted">Capacité fonctionnelle au seuil — base de calcul pour TTE et zones.</td>
            </tr>
            <tr>
              <td><b>VO₂max</b></td>
              <td>${effectiveRefs.vo2max ? fmt(effectiveRefs.vo2max, 1) : "—"} ml/kg/min</td>
              <td><span class="badge ${effectiveRefs.vo2max ? 'badgeSuccess' : 'badgeWarning'}">${effectiveRefs.vo2max ? '🔬 Mesurée/Labo' : '🧠 Estimée'}</span></td>
              <td><span class="badge ${effectiveRefs.vo2max ? 'badgeSuccess' : 'badgeWarning'}">${effectiveRefs.vo2max ? 'Élevée' : 'Modérée'}</span></td>
              <td class="muted">Plafond aérobie — l'augmentation marginale est limitée après un certain niveau.</td>
            </tr>
            <tr>
              <td><b>VLamax</b></td>
              <td>
                ${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"} mmol/L/s
                <br><span style="font-size:10px;color:${vlamaxProfilColor};font-weight:600;">${vlamaxProfilAgeAdjusted.label}</span>
              </td>
              <td><span class="badge ${vlamaxStatus.cssClass}">${vlamaxStatus.icon} ${vlamaxStatus.label}</span></td>
              <td><span class="badge ${vlamax.confidence >= 0.7 ? 'badgeSuccess' : vlamax.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${vlamax.confidence >= 0.7 ? 'Élevée' : vlamax.confidence >= 0.4 ? 'Modérée' : 'Faible'}</span></td>
              <td class="muted">
                ${htmlEscape(vlamaxAgeStatus.message)}
                ${vlamaxProfilAgeAdjusted.ageContext ? '<br><i style="font-size:10px;">🎂 ' + htmlEscape(vlamaxProfilAgeAdjusted.ageContext) + '</i>' : ''}
              </td>
            </tr>
            <tr>
              <td><b>TTE</b></td>
              <td>${tte.tte_min} min</td>
              <td><span class="badge ${tteStatus.cssClass}">${tteStatus.icon} ${tteStatus.label}</span></td>
              <td><span class="badge ${tte.confidence >= 0.7 ? 'badgeSuccess' : tte.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${tte.confidence >= 0.7 ? 'Élevée' : tte.confidence >= 0.4 ? 'Modérée' : 'Faible'}</span></td>
              <td class="muted">${tte.tte_min >= (tte.target ?? 50) ? "Indicateur de durabilité satisfaisant pour l'objectif." : `Indicateur de durabilité insuffisant (cible: ${tte.target ?? 50} min) — axe de travail potentiel.`}</td>
            </tr>
            <tr>
              <td><b>Potentiel Physiologique</b></td>
              <td>${potentielPhysiologique.score}%</td>
              <td><span class="badge badgeWarning">🔁 Calculé</span></td>
              <td><span class="badge ${potentielPhysiologique.confidence >= 0.7 ? 'badgeSuccess' : potentielPhysiologique.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${potentielPhysiologique.confidence >= 0.7 ? 'Élevée' : potentielPhysiologique.confidence >= 0.4 ? 'Modérée' : 'Faible'}</span></td>
              <td class="muted">${potentielPhysiologique.score >= 80 ? "Bonne cohérence actuelle entre capacités et charge." : potentielPhysiologique.score >= 60 ? "Cohérence acceptable avec des axes d'amélioration identifiés." : "Désalignement significatif — analyse détaillée recommandée."}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card cardHighlight mt">
        <h3>📋 Résumé automatique (Lecture < 2 min)</h3>
        <p style="font-size:14px;line-height:1.6;margin:12px 0;">${profilMessage}</p>
        <p style="font-size:12px;color:var(--muted);">
          <b>Limiteur principal:</b> ${payload.unifiedLimiter.limiterEmoji} ${htmlEscape(payload.unifiedLimiter.limiterLabel)} (confiance ${Math.round(payload.unifiedLimiter.confidence * 100)}%).<br>
          <b>Levier prioritaire:</b> ${payload.unifiedLimiter.leverEmoji} ${htmlEscape(payload.unifiedLimiter.leverLabel)}.<br>
          <b>Décision coaching:</b> ${htmlEscape(payload.coachingCompass.decision.recommendedBlock)} (${payload.coachingCompass.decision.durationWeeks} sem).<br>
          <b>Risques identifiés:</b> ${risquesIdentifies}.
        </p>
        ${payload.coachingCompass.decision.prohibitions.length > 0 ? `
          <div class="alert alertError mt" style="font-size:11px;">
            <b>🚫 Interdictions :</b> ${payload.coachingCompass.decision.prohibitions.map(p => htmlEscape(p)).join(" • ")}
          </div>
        ` : ''}
        <div class="alert alertWarning mt" style="font-size:11px;">
          <b>⚠️ INTERDICTION :</b> Ce score ne garantit pas la performance le jour J. 
          Il indique une cohérence entre les données disponibles et l'objectif, pas une prédiction de résultat.
        </div>
      </div>
    </section>
  `;

  // =============================================
  // 3. METABOLIC PERFORMANCE COMPASS™ — VERSION OFFICIELLE
  // =============================================
  
  // Utiliser les scores calculés dans le payload (source unique de vérité)
  const { compassScores: cScores, crr, chargeScore } = payload;
  const crrTargets = getCRRTargets(athlete.goal || "IM");
  
  // Générer l'interprétation coach automatique
  const generateCoachInterpretation = (): { limitation: string; risk: string; recommendation: string } => {
    const axes = [
      { name: "Capacité Aérobie (FTP/kg)", score: cScores.capaciteAerobie.score },
      { name: "Tolérance Effort (TTE)", score: cScores.toleranceEffort.score },
      { name: "Profil Métabolique (VLamax)", score: cScores.profilMetabolique.score },
      { name: "Robustesse", score: cScores.robustesse.score }
    ];
    
    const sorted = [...axes].sort((a, b) => a.score - b.score);
    const weakest = sorted[0];
    
    let limitation = "Aucune limitation majeure détectée.";
    let risk = "Risque global modéré.";
    let recommendation = "Maintenir l'équilibre actuel.";
    
    if (weakest.score < 60) {
      limitation = "La performance est principalement limitée par : " + weakest.name + " (score: " + weakest.score + "/100).";
    }
    
    if (!crr.isValid) {
      risk = "⚠️ Charge récente inconnue – l'évaluation de la robustesse et du risque est incomplète.";
      recommendation = "Priorité : renseigner la charge d'entraînement (TSS 7j) pour une analyse fiable.";
    } else if (chargeScore.status === "overload") {
      risk = "🔴 Surcharge détectée – risque de surentraînement élevé.";
      recommendation = "Réduire immédiatement la charge et surveiller les signes de fatigue.";
    } else if (chargeScore.status === "low") {
      risk = "⚠️ Charge insuffisante pour l'objectif visé.";
      recommendation = "Augmenter progressivement le volume d'entraînement.";
    } else if (weakest.name.includes("VLamax") && weakest.score < 70) {
      recommendation = "Travailler le profil métabolique : séances de seuil bas, tempo long pour réduire VLamax.";
    } else if (weakest.name.includes("TTE") && weakest.score < 70) {
      recommendation = "Développer l'endurance au seuil : intervalles longs 88-95% FTP.";
    } else if (weakest.name.includes("FTP") && weakest.score < 70) {
      recommendation = "Améliorer la puissance aérobie : sweet spot et travail au seuil.";
    }
    
    return { limitation, risk, recommendation };
  };
  
  const coachInterpretation = generateCoachInterpretation();
  
  // Build compass HTML with proper template literals
  const crrCardColor = crr.isValid ? '#22c55e' : '#f59e0b';
  const crrValue = crr.value !== null ? crr.value : "—";
  const crrSourceClass = crr.source === 'NOLIO' ? 'tagSuccess' : crr.source === 'SNAPSHOT' ? 'tagInfo' : 'tagWarning';
  const chargeStatusClass = chargeScore.status === 'optimal' ? 'badgeSuccess' : chargeScore.status === 'overload' ? 'badgeError' : 'badgeWarning';
  const chargeStatusLabel = chargeScore.status === 'optimal' ? '✓ Optimal' : chargeScore.status === 'overload' ? '⚠ Surcharge' : chargeScore.status === 'low' ? '↓ Faible' : chargeScore.status === 'high' ? '↑ Élevée' : '? Inconnu';
  
  const globalBadgeClass = cScores.globalColor === 'success' ? 'badgeSuccess' : cScores.globalColor === 'warning' ? 'badgeWarning' : 'badgeError';
  const limitationAlertClass = cScores.mainLimitation ? 'alertWarning' : 'alertInfo';
  const riskAlertClass = chargeScore.status === 'overload' ? 'alertError' : chargeScore.status === 'unknown' ? 'alertWarning' : 'alertInfo';
  
  
  // ✅ Coaching Compass 5 axes (source unique de vérité)
  const cc = payload.coachingCompass;
  const axes = cc.radarAxes;
  const nAxes = axes.length;
  
  // Construire le SVG pentagonal (5 axes)
  const cx = 170, cy = 170, maxR = 100;
  const angleOffset = -Math.PI / 2; // Start from top
  
  const getXY = (i: number, r: number) => {
    const angle = angleOffset + (2 * Math.PI * i) / nAxes;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  
  // Grilles concentriques (25%, 50%, 75%, 100%)
  const grids = [25, 50, 75, 100].map(pct => {
    const r = (pct / 100) * maxR;
    const pts = Array.from({ length: nAxes }, (_, i) => getXY(i, r).join(",")).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="#cbd5e1" stroke-width="${pct === 100 ? 1.5 : 0.8}"/>`;
  }).join("\n");
  
  // Lignes d'axes
  const axisLines = Array.from({ length: nAxes }, (_, i) => {
    const [x, y] = getXY(i, maxR);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  }).join("\n");
  
  // Polygone des scores
  const scorePts = axes.map((a, i) => getXY(i, (a.score / 100) * maxR).join(",")).join(" ");
  
  // Points et labels
  const axisElements = axes.map((a, i) => {
    const [px, py] = getXY(i, (a.score / 100) * maxR);
    const [lx, ly] = getXY(i, maxR + 30);
    const anchor = lx < cx - 10 ? "end" : lx > cx + 10 ? "start" : "middle";
    return `
      <circle cx="${px}" cy="${py}" r="6" fill="#2563eb" stroke="#fff" stroke-width="2"/>
      <text x="${lx}" y="${ly - 5}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="#1e40af">${a.icon} ${a.shortLabel}</text>
      <text x="${lx}" y="${ly + 10}" text-anchor="${anchor}" font-size="13" font-weight="800" fill="#2563eb">${a.score}/100</text>
    `;
  }).join("\n");

  const globalScore = Math.round(axes.reduce((s, a) => s + a.score, 0) / nAxes);
  const globalColor = globalScore >= 75 ? "#16a34a" : globalScore >= 50 ? "#ca8a04" : "#dc2626";
  const globalBadgeClass2 = globalScore >= 75 ? "badgeSuccess" : globalScore >= 50 ? "badgeWarning" : "badgeError";
  
  // ✅ Économie = modulateur secondaire (badge séparé)
  const ecoMod = cc.economyModifier;
  const ecoStatus = ecoMod && ecoMod.score >= 75 ? "Bonus" : ecoMod && ecoMod.score >= 50 ? "Neutre" : "Pénalité";
  const ecoBadgeClass = ecoMod && ecoMod.score >= 75 ? "badgeSuccess" : ecoMod && ecoMod.score >= 50 ? "badgeWarning" : "badgeError";

  const compassHTML = `
    <section id="compass" class="section pagebreak">
      <h2>3. TFCL Coaching Compass™ — 4 Piliers + Modulateur Économie</h2>
      
      <!-- CRR -->
      <div class="card mb" style="border-left: 4px solid ${crrCardColor};">
        <h3>📊 Charge Récente de Référence (CRR)</h3>
        <div class="grid3">
          <div><span class="muted">Valeur</span><br><span class="big">${crrValue}</span><span class="muted"> TSS/7j</span></div>
          <div><span class="muted">Source</span><br><span class="tag ${crrSourceClass}">${crr.source}</span></div>
          <div><span class="muted">Statut</span><br><span class="badge ${chargeStatusClass}">${chargeStatusLabel}</span></div>
        </div>
        <div class="muted mt" style="font-size:11px;">
          Cibles ${crrTargets.objectif}: Min ${crrTargets.chargeMinimale} | Optimal ${crrTargets.chargeOptimale} | Max ${crrTargets.chargeMaximale} TSS
          ${crr.warningMessage ? '<br>⚠️ ' + crr.warningMessage : ''}
        </div>
      </div>
      
      <!-- RADAR 4 PILIERS -->
      <div class="card cardHighlight">
        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;">TFCL Coaching Compass™</div>
          <div class="muted">4 Piliers (VO₂max · VLamax · Aérobie · Durabilité) — Économie en modulateur secondaire</div>
        </div>
        
        <div style="display:flex;justify-content:center;margin:20px 0;">
          <svg width="340" height="340" viewBox="0 0 340 340" style="overflow:visible;background:#ffffff;">
            <rect x="0" y="0" width="340" height="340" fill="#ffffff"/>
            ${grids}
            ${axisLines}
            <polygon points="${scorePts}" fill="rgba(37,99,235,0.2)" stroke="#2563eb" stroke-width="2.5"/>
            ${axisElements}
          </svg>
        </div>
        
        <div style="text-align:center;margin-top:16px;">
          <span class="badge ${globalBadgeClass2}" style="font-size:16px;padding:10px 20px;">
            Score Global (4 piliers) : ${globalScore}/100
          </span>
          <div class="muted mt" style="font-size:11px;">Complétude: ${cc.meta.dataCompleteness}%</div>
        </div>

        ${ecoMod ? `
          <div style="margin-top:18px;padding:12px;border:1px dashed #94a3b8;border-radius:8px;background:#f8fafc;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <div>
                <div style="font-size:12px;font-weight:700;color:#0f172a;">🦶 ${htmlEscape(ecoMod.label)} — Modulateur d'efficience</div>
                <div class="muted" style="font-size:11px;margin-top:2px;">Coût énergétique du mouvement. Multiplicateur secondaire des 4 piliers (n'augmente pas le plafond physiologique).</div>
              </div>
              <span class="badge ${ecoBadgeClass}" style="font-size:13px;padding:6px 12px;white-space:nowrap;">${ecoMod.score}/100 — ${ecoStatus}</span>
            </div>
          </div>
        ` : ''}
      </div>
      
      <!-- 4 PILIERS DÉTAILLÉS -->
      <div class="card mt">
        <h3>📐 Détail des 4 Piliers</h3>
        <table>
          <thead>
            <tr>
              <th>Pilier</th>
              <th>Score</th>
              <th>Actuel</th>
              <th>Cible</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            ${axes.map(a => {
              const delta = a.score >= 100 ? "✓" : `-${100 - a.score}%`;
              const deltaColor = a.score >= 100 ? "#16a34a" : a.score >= 70 ? "#ca8a04" : "#dc2626";
              const fmtVal = (v: number | null, u: string) => v === null ? "—" : v < 10 ? `${v.toFixed(2)} ${u}` : `${v.toFixed(1)} ${u}`;
              return `<tr>
                <td><b>${a.icon} ${htmlEscape(a.label)}</b></td>
                <td><span class="badge" style="background:${a.score >= 75 ? '#dcfce7' : a.score >= 50 ? '#fef9c3' : '#fee2e2'};color:${a.score >= 75 ? '#16a34a' : a.score >= 50 ? '#a16207' : '#dc2626'};font-weight:700;">${a.score}/100</span></td>
                <td>${fmtVal(a.value, a.unit)}</td>
                <td>${a.target !== null ? fmtVal(a.target, a.unit) : "—"}</td>
                <td style="font-weight:700;color:${deltaColor};">${delta}</td>
              </tr>`;
            }).join("")}
            ${ecoMod ? `<tr style="background:#f8fafc;">
              <td><b>${ecoMod.icon} ${htmlEscape(ecoMod.label)}</b> <span class="muted" style="font-size:10px;">(modulateur)</span></td>
              <td><span class="badge ${ecoBadgeClass}" style="font-weight:700;">${ecoMod.score}/100</span></td>
              <td>${ecoMod.value !== null ? (ecoMod.value < 10 ? ecoMod.value.toFixed(2) : ecoMod.value.toFixed(1)) + ' ' + ecoMod.unit : '—'}</td>
              <td>${ecoMod.target !== null ? (ecoMod.target < 10 ? ecoMod.target.toFixed(2) : ecoMod.target.toFixed(1)) + ' ' + ecoMod.unit : '—'}</td>
              <td class="muted" style="font-size:11px;">${ecoStatus}</td>
            </tr>` : ''}
          </tbody>
        </table>
      </div>

      <!-- DÉCISION COACHING -->
      <div class="card mt" style="border-left: 4px solid #2563eb;">
        <h3>🧭 Flux Décisionnel TFCL</h3>
        <div class="grid3 mt">
          <div class="alert alertWarning">
            <b>${cc.limiter.icon} Limiteur</b><br>
            <span style="font-size:14px;font-weight:700;">${htmlEscape(cc.limiter.label)}</span><br>
            <span class="muted" style="font-size:11px;">${htmlEscape(cc.limiter.description)}</span>
          </div>
          <div class="alert alertInfo">
            <b>${cc.leverage.icon} Levier</b><br>
            <span style="font-size:14px;font-weight:700;">${htmlEscape(cc.leverage.label)}</span><br>
            <span class="muted" style="font-size:11px;">${htmlEscape(cc.leverage.description)}</span>
          </div>
          <div class="alert alertSuccess">
            <b>📋 Décision</b><br>
            <span style="font-size:14px;font-weight:700;">${htmlEscape(cc.decision.recommendedBlock)}</span><br>
            <span class="muted" style="font-size:11px;">${cc.decision.durationWeeks} semaines</span>
          </div>
        </div>
        <div class="muted mt" style="font-size:11px;">
          <b>Justification coach :</b> ${htmlEscape(cc.decision.coachRationale)}
        </div>
        ${cc.decision.prohibitions.length > 0 ? `
          <div class="alert alertError mt" style="font-size:11px;">
            <b>🚫 Interdictions :</b> ${cc.decision.prohibitions.map(p => htmlEscape(p)).join(" • ")}
          </div>
        ` : ""}
      </div>
    </section>
  `;


  // =============================================
  // C-bis. PROFIL MÉTABOLIQUE COMPLET (RADAR CHART)
  // =============================================
  
  // Calculer les scores normalisés (0-100) pour le radar
  const normalizeVlamax = (value: number | null, objectif: string): number => {
    if (value === null) return 0;
    // VLamax idéale selon objectif (plus basse = mieux pour longue distance)
    const idealValues: Record<string, number> = {
      IM: 0.25, Ironman: 0.25, "703": 0.30, Half: 0.30,
      Marathon: 0.28, Semi: 0.32, Trail: 0.30, Ultra: 0.25
    };
    const ideal = idealValues[objectif] || 0.30;
    // Plus on est proche de l'idéal, plus le score est élevé
    const deviation = Math.abs(value - ideal);
    const maxDeviation = 0.5;
    return Math.max(0, Math.min(100, Math.round((1 - deviation / maxDeviation) * 100)));
  };
  
  const normalizeTTE = (value: number, target: number): number => {
    // Score basé sur l'atteinte de la cible
    if (value >= target) return 100;
    return Math.max(0, Math.round((value / target) * 100));
  };
  
  const normalizeFtpKg = (value: number | null, target: number): number => {
    if (!value) return 0;
    if (value >= target) return 100;
    return Math.max(0, Math.round((value / target) * 100));
  };
  
  const currentVlamaxScore = normalizeVlamax(vlamax.value, athlete.goal || "703");
  const currentTTEScore = normalizeTTE(tte.tte_min, targets.tteTarget);
  const currentFtpKgScore = normalizeFtpKg(ftpKg, targets.ftpKgTarget);
  
  // Cibles idéales (toujours 100%)
  const targetVlamaxScore = 100;
  const targetTTEScore = 100;
  const targetFtpKgScore = 100;
  
  // Calculer l'écart moyen
  const avgCurrent = (currentVlamaxScore + currentTTEScore + currentFtpKgScore) / 3;
  const avgTarget = (targetVlamaxScore + targetTTEScore + targetFtpKgScore) / 3;
  const gapPercent = Math.round(((avgTarget - avgCurrent) / avgTarget) * 100);
  
  // Écarts individuels
  const vlamaxGap = targetVlamaxScore - currentVlamaxScore;
  const tteGap = targetTTEScore - currentTTEScore;
  const ftpKgGap = targetFtpKgScore - currentFtpKgScore;
  
  // Déterminer les couleurs des écarts
  const getGapColor = (gap: number): string => {
    if (gap <= 5) return "#16a34a"; // vert
    if (gap <= 15) return "#d97706"; // orange
    return "#dc2626"; // rouge
  };
  
  const getGapBg = (gap: number): string => {
    if (gap <= 5) return "rgba(22,163,74,0.1)";
    if (gap <= 15) return "rgba(217,119,6,0.1)";
    return "rgba(220,38,38,0.1)";
  };
  
  const profilMetaboliqueHTML = `
    <section id="profil-metabolique" class="section pagebreakAvoid">
      <h2>🎯 Profil Métabolique Complet — VLamax / TTE / FTP</h2>
      
      <div class="alert alertInfo mb">
        <b>📊 Radar de Performance :</b> Ce graphique compare votre profil actuel aux cibles idéales pour votre objectif (${getObjectifLabel(athlete.goal)}). 
        Plus la zone colorée se rapproche du pentagone extérieur, plus le profil est optimisé.
      </div>
      
      <div class="card cardHighlight">
        <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;">
          
          <!-- RADAR CHART SVG -->
          <div style="flex:1;min-width:280px;">
            <svg width="100%" viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" style="max-width:320px;margin:0 auto;display:block;background:#ffffff;">
              <rect x="0" y="0" width="300" height="280" fill="#ffffff"/>
              <defs>
                <linearGradient id="radarFillCurrent" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#0891b2" stop-opacity="0.4"/>
                  <stop offset="100%" stop-color="#0e7490" stop-opacity="0.25"/>
                </linearGradient>
                <linearGradient id="radarFillTarget" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#2563eb" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.08"/>
                </linearGradient>
              </defs>
              
              <!-- Centre: 150, 130 | Rayon max: 100 -->
              <!-- Grilles de fond (triangles concentriques) -->
              <polygon points="150,30 237,180 63,180" fill="none" stroke="#e2e8f0" stroke-width="1"/>
              <polygon points="150,55 212,155 88,155" fill="none" stroke="#e2e8f0" stroke-width="1"/>
              <polygon points="150,80 187,130 113,130" fill="none" stroke="#e2e8f0" stroke-width="1"/>
              <polygon points="150,105 162,130 138,130" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>
              
              <!-- Axes -->
              <line x1="150" y1="130" x2="150" y2="30" stroke="#cbd5e1" stroke-width="1"/>
              <line x1="150" y1="130" x2="237" y2="180" stroke="#cbd5e1" stroke-width="1"/>
              <line x1="150" y1="130" x2="63" y2="180" stroke="#cbd5e1" stroke-width="1"/>
              
              <!-- Polygone CIBLE (idéal) - fond -->
              <polygon points="150,30 237,180 63,180" fill="url(#radarFillTarget)" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>
              
              <!-- Polygone ACTUEL - calculé dynamiquement -->
              <!-- VLamax = haut (y diminue), TTE = bas droite, FTP/kg = bas gauche -->
              <!-- Formule: score/100 * rayon_max (100) depuis le centre -->
              <polygon points="${150},${130 - (currentVlamaxScore / 100) * 100} ${150 + (currentTTEScore / 100) * 87},${130 + (currentTTEScore / 100) * 50} ${150 - (currentFtpKgScore / 100) * 87},${130 + (currentFtpKgScore / 100) * 50}" 
                fill="url(#radarFillCurrent)" stroke="#0891b2" stroke-width="2.5"/>
              
              <!-- Points sur chaque axe (profil actuel) -->
              <circle cx="150" cy="${130 - (currentVlamaxScore / 100) * 100}" r="6" fill="#0891b2" stroke="#fff" stroke-width="2"/>
              <circle cx="${150 + (currentTTEScore / 100) * 87}" cy="${130 + (currentTTEScore / 100) * 50}" r="6" fill="#0891b2" stroke="#fff" stroke-width="2"/>
              <circle cx="${150 - (currentFtpKgScore / 100) * 87}" cy="${130 + (currentFtpKgScore / 100) * 50}" r="6" fill="#0891b2" stroke="#fff" stroke-width="2"/>
              
              <!-- Labels des axes -->
              <text x="150" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#0891b2">VLamax</text>
              <text x="150" y="28" text-anchor="middle" font-size="9" fill="#64748b">${currentVlamaxScore}%</text>
              
              <text x="250" y="190" text-anchor="start" font-size="11" font-weight="700" fill="#ea580c">TTE</text>
              <text x="250" y="202" text-anchor="start" font-size="9" fill="#64748b">${currentTTEScore}%</text>
              
              <text x="50" y="190" text-anchor="end" font-size="11" font-weight="700" fill="#16a34a">FTP/kg</text>
              <text x="50" y="202" text-anchor="end" font-size="9" fill="#64748b">${currentFtpKgScore}%</text>
              
              <!-- Légende -->
              <rect x="80" y="245" width="12" height="12" rx="2" fill="#0891b2" fill-opacity="0.4" stroke="#0891b2" stroke-width="1.5"/>
              <text x="96" y="255" font-size="10" fill="#334155">Profil actuel</text>
              
              <rect x="170" y="245" width="12" height="12" rx="2" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="3 2"/>
              <text x="186" y="255" font-size="10" fill="#334155">Cible idéale</text>
            </svg>
          </div>
          
          <!-- MÉTRIQUES DÉTAILLÉES -->
          <div style="flex:1;min-width:250px;">
            <div style="margin-bottom:16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:14px;font-weight:700;color:#111;">Écart moyen à combler</span>
                <span style="font-size:24px;font-weight:800;color:${gapPercent <= 10 ? '#16a34a' : gapPercent <= 25 ? '#d97706' : '#dc2626'};">${gapPercent > 0 ? gapPercent : 0}%</span>
              </div>
              ${gapPercent <= 0 ? '<div style="background:#dcfce7;color:#16a34a;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;text-align:center;">✓ Profil aligné avec la cible</div>' : ''}
            </div>
            
            <!-- Détail par métrique -->
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="padding:10px 12px;border-radius:8px;background:${getGapBg(vlamaxGap)};">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-size:12px;font-weight:600;color:#0891b2;">VLamax</div>
                    <div style="font-size:11px;color:#64748b;">${vlamax.value !== null ? fmt(vlamax.value, 2) + ' mmol/L/s' : '—'}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:14px;font-weight:700;">${currentVlamaxScore}%</div>
                    <div style="font-size:11px;color:${getGapColor(vlamaxGap)};">${vlamaxGap > 0 ? '−' + vlamaxGap + '%' : vlamaxGap < 0 ? '+' + Math.abs(vlamaxGap) + '%' : '✓'}</div>
                  </div>
                </div>
              </div>
              
              <div style="padding:10px 12px;border-radius:8px;background:${getGapBg(tteGap)};">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-size:12px;font-weight:600;color:#ea580c;">TTE</div>
                    <div style="font-size:11px;color:#64748b;">${tte.tte_min} min (cible: ${targets.tteTarget} min)</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:14px;font-weight:700;">${currentTTEScore}%</div>
                    <div style="font-size:11px;color:${getGapColor(tteGap)};">${tteGap > 0 ? '−' + tteGap + '%' : tteGap < 0 ? '+' + Math.abs(tteGap) + '%' : '✓'}</div>
                  </div>
                </div>
              </div>
              
              <div style="padding:10px 12px;border-radius:8px;background:${getGapBg(ftpKgGap)};">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-size:12px;font-weight:600;color:#16a34a;">FTP/kg</div>
                    <div style="font-size:11px;color:#64748b;">${ftpKg ? fmt(ftpKg, 2) : '—'} W/kg (cible: ${fmt(targets.ftpKgTarget, 1)} W/kg)</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:14px;font-weight:700;">${currentFtpKgScore}%</div>
                    <div style="font-size:11px;color:${getGapColor(ftpKgGap)};">${ftpKgGap > 0 ? '−' + ftpKgGap + '%' : ftpKgGap < 0 ? '+' + Math.abs(ftpKgGap) + '%' : '✓'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- PRIORITÉS D'AMÉLIORATION -->
        <div class="mt" style="border-top:1px solid #e2e8f0;padding-top:16px;">
          <h4 style="margin:0 0 12px 0;font-size:13px;">📋 Priorités d'amélioration</h4>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            ${vlamaxGap > 15 ? '<div style="background:#fee2e2;color:#b91c1c;padding:6px 12px;border-radius:6px;font-size:11px;"><b>🔴 VLamax :</b> Travail prioritaire — séances Z2 longues, éviter les sprints</div>' : ''}
            ${tteGap > 15 ? '<div style="background:#fee2e2;color:#b91c1c;padding:6px 12px;border-radius:6px;font-size:11px;"><b>🔴 TTE :</b> Développer l\'endurance au seuil — intervalles longs 95-105% FTP</div>' : ''}
            ${ftpKgGap > 15 ? '<div style="background:#fee2e2;color:#b91c1c;padding:6px 12px;border-radius:6px;font-size:11px;"><b>🔴 FTP/kg :</b> Améliorer la puissance — sweet spot et travail VO2max</div>' : ''}
            ${vlamaxGap > 5 && vlamaxGap <= 15 ? '<div style="background:#fef3c7;color:#92400e;padding:6px 12px;border-radius:6px;font-size:11px;"><b>🟡 VLamax :</b> Optimisation en cours — maintenir le volume Z2</div>' : ''}
            ${tteGap > 5 && tteGap <= 15 ? '<div style="background:#fef3c7;color:#92400e;padding:6px 12px;border-radius:6px;font-size:11px;"><b>🟡 TTE :</b> Progression — augmenter la durée des séances au seuil</div>' : ''}
            ${ftpKgGap > 5 && ftpKgGap <= 15 ? '<div style="background:#fef3c7;color:#92400e;padding:6px 12px;border-radius:6px;font-size:11px;"><b>🟡 FTP/kg :</b> Affûtage — blocs de travail spécifique</div>' : ''}
            ${gapPercent <= 10 ? '<div style="background:#dcfce7;color:#166534;padding:6px 12px;border-radius:6px;font-size:11px;"><b>✅ Profil optimisé :</b> Maintenir l\'équilibre et affûter pour la compétition</div>' : ''}
          </div>
        </div>
      </div>
      
      <!-- EXPLICATION PÉDAGOGIQUE -->
      <div class="card mt">
        <h4 style="margin:0 0 8px 0;">📖 Comment lire ce graphique ?</h4>
        <div class="grid3" style="gap:16px;">
          <div>
            <div style="font-weight:600;color:#0891b2;font-size:12px;">VLamax (haut)</div>
            <p class="muted" style="font-size:11px;margin:4px 0 0 0;">Mesure la capacité glycolytique. Pour la longue distance, une VLamax basse (proche de 0.25-0.30) est idéale.</p>
          </div>
          <div>
            <div style="font-weight:600;color:#ea580c;font-size:12px;">TTE (droite)</div>
            <p class="muted" style="font-size:11px;margin:4px 0 0 0;">Durée de maintien à FTP. Plus le TTE est élevé, meilleure est l'endurance au seuil.</p>
          </div>
          <div>
            <div style="font-weight:600;color:#16a34a;font-size:12px;">FTP/kg (gauche)</div>
            <p class="muted" style="font-size:11px;margin:4px 0 0 0;">Puissance relative au poids. Indicateur clé de performance en montée et sur le plat.</p>
          </div>
        </div>
        <div class="alert alertWarning mt" style="margin-bottom:0;">
          <b>⚠️ Note :</b> Ce radar est une simplification visuelle. Les 3 métriques sont interdépendantes et doivent être analysées ensemble dans le contexte de l'objectif sportif.
        </div>
      </div>
    </section>
  `;

  // =============================================
  // C. INDICATEURS CLÉS + INTERPRÉTATION
  // =============================================
  // Hiérarchisation des 3 indicateurs selon le moteur unifié de limiteurs
  const ul = payload.unifiedLimiter;
  const gapByMetricName = new Map(ul.gapAnalysis.map(g => [g.metric, g]));
  const vlamaxGapRank = gapByMetricName.get("VLamax");
  const tteGapRank = gapByMetricName.get("TTE");
  const ftpKgGapRank = gapByMetricName.get("FTP/kg");
  const indicatorRanking = [
    { key: "vlamax", label: "VLamax", impact: vlamaxGapRank?.weightedImpact ?? 0, gap: vlamaxGapRank?.gap ?? 0 },
    { key: "tte", label: "TTE", impact: tteGapRank?.weightedImpact ?? 0, gap: tteGapRank?.gap ?? 0 },
    { key: "ftpkg", label: "FTP/kg", impact: ftpKgGapRank?.weightedImpact ?? 0, gap: ftpKgGapRank?.gap ?? 0 },
  ].sort((a, b) => b.impact - a.impact);
  const priorityRankByKey: Record<string, number> = {};
  indicatorRanking.forEach((ind, i) => { priorityRankByKey[ind.key] = i + 1; });
  const priorityBadge = (key: string) => {
    const rank = priorityRankByKey[key];
    const cls = rank === 1 ? 'badgeError' : rank === 2 ? 'badgeWarning' : 'badgeSuccess';
    const icon = rank === 1 ? '🔴' : rank === 2 ? '🟡' : '🟢';
    return `<span class="badge ${cls}" style="margin-left:8px;font-size:10px;vertical-align:middle;">${icon} PRIORITÉ #${rank}</span>`;
  };

  const indicateursHTML = `
    <section id="indicateurs" class="section">
      <h2>B. Indicateurs clés + Interprétation</h2>

      <!-- Bannière hiérarchisation : facteur limitant principal -->
      <div class="alert alertError" style="margin-bottom:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:6px;">
          🎯 Facteur limitant principal : ${ul.limiterEmoji} ${htmlEscape(ul.limiterLabel)}
          <span class="muted" style="font-weight:400;font-size:11px;">(confiance ${Math.round(ul.confidence * 100)}%)</span>
        </div>
        <div style="font-size:12px;margin-bottom:8px;">${htmlEscape(ul.limiterExplanation || "")}</div>
        <div style="font-size:11px;font-weight:600;margin-top:8px;">Hiérarchie des 3 indicateurs (par impact pondéré sur la performance) :</div>
        <ol style="margin:4px 0 0 20px;font-size:11px;">
          ${indicatorRanking.map((ind, i) => {
            const icon = i === 0 ? '🔴' : i === 1 ? '🟡' : '🟢';
            const tag = i === 0 ? '<b>PRIORITÉ #1</b> — à traiter en premier' : i === 1 ? 'Priorité #2' : 'Priorité #3';
            return `<li>${icon} <b>${ind.label}</b> — ${tag} <span class="muted">(impact ${(ind.impact * 100).toFixed(0)}%, écart ${(ind.gap * 100).toFixed(0)}%)</span></li>`;
          }).join('')}
        </ol>
        <div style="font-size:10px;font-style:italic;color:var(--muted);margin-top:8px;">
          ℹ️ Un indicateur "dans la cible" peut quand même apparaître en priorité #2 ou #3 ; seule la priorité #1 doit guider le choix du bloc d'entraînement.
        </div>
      </div>
      
      ${(() => {
        // ✅ FIX cohérence VLamax : le badge doit refléter la position réelle
        // de la valeur dans la cible objective affichée (vlamaxMin/Max/Ideal),
        // pas une heuristique âge × profil qui peut contredire la cible.
        const v = vlamax.value;
        const tMin = targets.vlamaxMin;
        const tMax = targets.vlamaxMax;
        const tIdeal = targets.vlamaxIdeal;
        let badgeStatus: 'optimal' | 'acceptable' | 'work_needed' = 'work_needed';
        let badgeLabel = '⚠ À travailler';
        let badgeClass = 'badgeError';
        let riskLevel: 'low' | 'moderate' | 'high' | 'very_high' = 'moderate';
        let coherentMessage = vlamaxAgeStatus.message;
        let coherentActions = vlamaxAgeStatus.actions;

        if (v !== null) {
          const tolerance = Math.max(0.03, (tMax - tMin) * 0.15); // 15% de la fenêtre, min 0.03
          const inWindow = v >= tMin && v <= tMax;
          const nearIdeal = Math.abs(v - tIdeal) <= tolerance;

          if (inWindow && nearIdeal) {
            badgeStatus = 'optimal';
            badgeLabel = '✓ Optimal';
            badgeClass = 'badgeSuccess';
            riskLevel = 'low';
            coherentMessage = `VLamax ${fmt(v, 2)} dans la cible (${fmt(tMin, 2)}–${fmt(tMax, 2)}, idéal ${fmt(tIdeal, 2)}) — profil ${vlamaxProfilAgeAdjusted.label}. Maintenir.`;
            coherentActions = ['Maintenir le volume Z2 actuel', 'Conserver l\'équilibre métabolique', 'Surveiller la dérive sur les prochains tests'];
          } else if (inWindow) {
            badgeStatus = 'acceptable';
            badgeLabel = '○ Acceptable';
            badgeClass = 'badgeWarning';
            riskLevel = v > tIdeal ? 'moderate' : 'low';
            const direction = v > tIdeal ? 'légèrement haute' : 'légèrement basse';
            coherentMessage = `VLamax ${fmt(v, 2)} dans la cible mais ${direction} vs idéal (${fmt(tIdeal, 2)}) — profil ${vlamaxProfilAgeAdjusted.label}.`;
            coherentActions = v > tIdeal
              ? ['Densifier le volume Z2 pour rapprocher de l\'idéal', 'Limiter les séances glycolytiques courtes']
              : ['Maintenir l\'équilibre actuel', 'Surveiller que la VLamax ne descende pas davantage'];
          } else {
            // Hors cible — on garde la logique de travail prioritaire
            badgeStatus = 'work_needed';
            badgeLabel = '⚠ À travailler';
            badgeClass = 'badgeError';
            riskLevel = v > tMax ? (v > tMax + 0.15 ? 'very_high' : 'high') : 'moderate';
            coherentMessage = v > tMax
              ? `VLamax ${fmt(v, 2)} au-dessus de la cible (max ${fmt(tMax, 2)}) — réduction prioritaire.`
              : `VLamax ${fmt(v, 2)} en dessous de la cible (min ${fmt(tMin, 2)}) — manque de capacité glycolytique.`;
            coherentActions = v > tMax
              ? ['Bloc 6+ semaines Z2 dominant', 'Réduire intensité haute', 'Train-low ciblé']
              : ['Réintroduire des intervalles courts maîtrisés', 'Travail force/vitesse'];
          }
        }

        return `
      <div class="card pagebreakAvoid" style="border-left: 4px solid ${vlamaxProfilColor};">
        <h3>1️⃣ VLamax (effectif) — Profil Métabolique ${priorityBadge('vlamax')}</h3>
        
        <!-- Profil visuel -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;padding:12px;border-radius:10px;background:${vlamaxProfilBgColor};">
          <div style="text-align:center;">
            <div style="font-size:32px;font-weight:800;color:${vlamaxProfilColor};">${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</div>
            <div style="font-size:11px;color:${vlamaxProfilColor};">mmol/L/s</div>
          </div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;color:${vlamaxProfilColor};">${vlamaxProfilAgeAdjusted.label}</div>
            <div style="font-size:11px;color:var(--muted);">Confiance: ${fmtPct(vlamax.confidence)} | Source: ${htmlEscape(vlamax.label)}</div>
            ${vlamaxProfilAgeAdjusted.ageContext ? '<div style="font-size:10px;font-style:italic;color:var(--muted);margin-top:4px;">🎂 ' + htmlEscape(vlamaxProfilAgeAdjusted.ageContext) + '</div>' : ''}
          </div>
          <div style="text-align:center;">
            <span class="badge ${badgeClass}" style="font-size:11px;padding:6px 12px;">
              ${badgeLabel}
            </span>
          </div>
        </div>
        
        <div class="grid2">
          <div>
            <div class="kv">
              <div class="k">Cible (${getObjectifLabel(athlete.goal)})</div><div class="v">${fmt(tMin, 2)} – ${fmt(tMax, 2)} (idéal: ${fmt(tIdeal, 2)})</div>
              ${ageAdjustment.age !== null && ageAdjustment.age >= 40 ? '<div class="k">Âge athlète</div><div class="v">' + ageAdjustment.age + ' ans (' + ageAdjustment.aai.label + ')</div>' : ''}
              <div class="k">Niveau risque</div><div class="v">${riskLevel === 'low' ? '🟢 Faible' : riskLevel === 'moderate' ? '🟡 Modéré' : riskLevel === 'high' ? '🟠 Élevé' : '🔴 Très élevé'}</div>
            </div>
            ${vlamaxAgeStatus.ageImpact ? '<p style="font-size:10px;font-style:italic;color:var(--muted);margin-top:8px;">ℹ️ ' + htmlEscape(vlamaxAgeStatus.ageImpact) + '</p>' : ''}
          </div>
          <div>
            <h4>Interprétation</h4>
            <p class="muted">${htmlEscape(coherentMessage)}</p>
            <h4>Actions recommandées</h4>
            <ul class="muted">
              ${coherentActions.map(a => '<li>' + htmlEscape(a) + '</li>').join('')}
            </ul>
          </div>
        </div>
      </div>`;
      })()}

      <div class="card pagebreakAvoid">
        <h3>2️⃣ TTE (Time to Exhaustion) ${priorityBadge('tte')}</h3>
        <div class="grid2">
          <div>
            <div class="kv">
              <div class="k">Valeur</div><div class="v">${tte.tte_min} min</div>
              <div class="k">Mode</div><div class="v">${tte.source === "observed" ? "OBSERVED (mesuré)" : "LOAD (estimé TSS)"}</div>
              <div class="k">Confiance</div><div class="v">${fmtPct(tte.confidence)}</div>
              <div class="k">Cible (${getObjectifLabel(athlete.goal)})</div><div class="v">≥ ${targets.tteTarget} min</div>
              <div class="k">Statut</div><div class="v"><span class="badge ${tte.tte_min >= targets.tteTarget ? 'badgeSuccess' : tte.tte_min >= targets.tteTarget * 0.85 ? 'badgeWarning' : 'badgeError'}">${tte.status?.toUpperCase() || '—'}</span></div>
            </div>
          </div>
          <div>
            <h4>Ce que ça signifie</h4>
            <p class="muted">${tte.tte_min < targets.tteTarget ? `TTE insuffisant pour ${getObjectifLabel(athlete.goal)} — risque de défaillance en fin d'épreuve.` : "TTE suffisant pour tenir l'objectif."}</p>
            <h4>Action coach</h4>
            <ul class="muted">
              ${tte.tte_min < targets.tteTarget ? "<li>Séances au seuil prolongées (2x20-30min)</li><li>Intervalles longs 95-105% FTP</li><li>Augmenter le volume Z3-Z4</li>" : "<li>Maintenir le niveau</li><li>Intégrer des séances spécifiques course</li>"}
            </ul>
          </div>
        </div>
      </div>

      <div class="card pagebreakAvoid">
        <h3>3️⃣ FTP et FTP/kg ${priorityBadge('ftpkg')}</h3>
        <div class="grid2">
          <div>
            <div class="kv">
              <div class="k">FTP</div><div class="v">${effectiveRefs.ftp ?? "—"} W</div>
              <div class="k">Poids</div><div class="v">${effectiveRefs.weightKg ? fmt(effectiveRefs.weightKg, 1) : "—"} kg</div>
              <div class="k">FTP/kg</div><div class="v">${ftpKg ? fmt(ftpKg, 2) : "—"} W/kg</div>
              <div class="k">Cible (${getObjectifLabel(athlete.goal)})</div><div class="v">≥ ${fmt(targets.ftpKgTarget, 1)} W/kg</div>
              <div class="k">Statut</div><div class="v"><span class="badge ${ftpKg && ftpKg >= targets.ftpKgTarget ? 'badgeSuccess' : ftpKg && ftpKg >= targets.ftpKgTarget * 0.9 ? 'badgeWarning' : 'badgeError'}">${ftpKg && ftpKg >= targets.ftpKgTarget ? 'OK' : 'WARNING'}</span></div>
            </div>
          </div>
          <div>
            <h4>Ce que ça signifie</h4>
            <p class="muted">${ftpKg && ftpKg < targets.ftpKgTarget ? "Puissance relative insuffisante — impact sur la performance vélo et la capacité à maintenir l'intensité." : "Puissance relative adaptée à l'objectif."}</p>
            <h4>Action coach</h4>
            <ul class="muted">
              ${ftpKg && ftpKg < targets.ftpKgTarget ? "<li>Blocs sweet spot progressifs</li><li>Intervalles VO2max (3-5min)</li><li>Optimiser le poids de forme</li>" : "<li>Maintenir et affiner</li><li>Séances spécifiques objectif</li>"}
            </ul>
          </div>
        </div>
      </div>

      <div class="card pagebreakAvoid">
        <h3>4️⃣ Charge d'entraînement (TSS 7d)</h3>
        <div class="grid2">
          <div>
            <div class="kv">
              <div class="k">TSS 7 jours</div><div class="v">${effectiveSnapshot?.tss_7d ?? "—"}</div>
              <div class="k">Lecture</div><div class="v">${effectiveSnapshot?.tss_7d ? (effectiveSnapshot.tss_7d < 300 ? "Faible" : effectiveSnapshot.tss_7d < 500 ? "Correcte" : effectiveSnapshot.tss_7d < 700 ? "Élevée" : "Très élevée") : "—"}</div>
            </div>
          </div>
          <div>
            <h4>Ce que ça signifie</h4>
            <p class="muted">${effectiveSnapshot?.tss_7d ? (effectiveSnapshot.tss_7d < 300 ? "Charge légère — phase récup ou perte de forme si prolongée." : effectiveSnapshot.tss_7d < 500 ? "Charge modérée — maintien de forme." : effectiveSnapshot.tss_7d < 700 ? "Charge élevée — phase de surcharge, surveiller la récupération." : "Charge très élevée — risque de surentraînement.") : "Donnée manquante."}</p>
          </div>
        </div>
      </div>
    </section>
  `;

  // =============================================
  // D. POTENTIEL PHYSIOLOGIQUE (STAFF)
  // =============================================
  const potentielPhysiologiqueHTML = `
    <section id="race" class="section pagebreak">
      <h2>C. Potentiel Physiologique (Staff)</h2>
      
      <div class="card ${potentielPhysiologique.score >= 80 ? 'cardSuccess' : potentielPhysiologique.score >= 60 ? 'cardWarning' : 'cardError'}">
        <div class="grid2">
          <div>
            <div style="display:flex;align-items:center;gap:16px;">
              <div class="scoreCircle" style="border-color:${potentielPhysiologique.score >= 80 ? 'var(--success)' : potentielPhysiologique.score >= 60 ? 'var(--warning)' : 'var(--error)'}; color:${potentielPhysiologique.score >= 80 ? 'var(--success)' : potentielPhysiologique.score >= 60 ? 'var(--warning)' : 'var(--error)'}">
                ${potentielPhysiologique.score}
              </div>
              <div>
                <div style="font-size:20px;font-weight:700;">${potentielPhysiologique.label}</div>
                <div class="muted">Potentiel Physiologique pour ${getObjectifLabel(athlete.goal)}</div>
              </div>
            </div>
            <div class="mt">
              <div class="progressBar">
                <div class="progressFill" style="width:${potentielPhysiologique.score}%; background:${potentielPhysiologique.score >= 80 ? 'var(--success)' : potentielPhysiologique.score >= 60 ? 'var(--warning)' : 'var(--error)'}"></div>
              </div>
            </div>
          </div>
          <div>
            <h4>Pondération ${getObjectifLabel(athlete.goal)}</h4>
            <div class="kv">
              <div class="k">VLamax</div><div class="v">${weights.vlamax}%</div>
              <div class="k">TTE (endurance)</div><div class="v">${weights.tte}%</div>
              <div class="k">FTP/kg (puissance)</div><div class="v">${weights.ftpKg}%</div>
              <div class="k">Fraîcheur</div><div class="v">${weights.freshness}%</div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid4 mt">
        <div class="card">
          <div class="muted">VLamax</div>
          <div class="medium">${potentielPhysiologique.details.vlamax}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(potentielPhysiologique.details.vlamax / 25) * 100}%; background:${potentielPhysiologique.details.vlamax >= 20 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
        <div class="card">
          <div class="muted">Endurance</div>
          <div class="medium">${potentielPhysiologique.details.endurance}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(potentielPhysiologique.details.endurance / 25) * 100}%; background:${potentielPhysiologique.details.endurance >= 20 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
        <div class="card">
          <div class="muted">Puissance</div>
          <div class="medium">${potentielPhysiologique.details.puissance}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(potentielPhysiologique.details.puissance / 25) * 100}%; background:${potentielPhysiologique.details.puissance >= 20 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
        <div class="card">
          <div class="muted">Disponibilité TFCL™</div>
          <div class="medium">${potentielPhysiologique.details.fraicheur}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(potentielPhysiologique.details.fraicheur / 25) * 100}%; background:${potentielPhysiologique.details.fraicheur >= 18 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
      </div>

      <div class="card mt">
        <h3>💡 Explication du score</h3>
        <p>${htmlEscape(potentielPhysiologique.messageStaff)}</p>
        ${potentielPhysiologique.wasCappedByNutrition ? `<div class="alert alertWarning">⚠️ Score plafonné par risque nutritionnel: ${potentielPhysiologique.nutritionalCapReason || "Risque élevé"}</div>` : ''}
        ${potentielPhysiologique.wasCappedByEconomy ? `<div class="alert alertWarning">🏃 Score plafonné par économie de course: ${potentielPhysiologique.economyCapReason || "Économie insuffisante"}</div>` : ''}
      </div>

      ${potentielPhysiologique.reasonsMissing.length > 0 ? `
        <div class="card mt">
          <h3>🎯 Ce qui manque pour gagner des points</h3>
          <ul>
            ${potentielPhysiologique.reasonsMissing.map(r => `<li>${htmlEscape(r)}</li>`).join("")}
          </ul>
          <div class="alert alertInfo mt">
            <b>Actions recommandées:</b> Ajoutez les données manquantes dans le snapshot (TSS 7d, TTE mesuré) ou via les tests VLamax pour améliorer la précision du score.
          </div>
        </div>
      ` : ''}
    </section>
  `;

  // =============================================
  // D. DISPONIBILITÉ TFCL™ — Snapshot-centric
  // =============================================
  // Mapper fatigue_state du snapshot vers les valeurs de disponibilité
  const fatigueStateMapDispo: Record<string, { fatigue: number; soreness: number; sleep: number; stress: number; motivation: number }> = {
    fresh:    { fatigue: 1, soreness: 1, sleep: 4, stress: 2, motivation: 5 },
    ok:       { fatigue: 3, soreness: 2, sleep: 3, stress: 3, motivation: 3 },
    fatigued: { fatigue: 6, soreness: 4, sleep: 2, stress: 5, motivation: 2 },
    high:     { fatigue: 8, soreness: 6, sleep: 1, stress: 7, motivation: 1 },
    injured:  { fatigue: 8, soreness: 8, sleep: 2, stress: 6, motivation: 1 },
  };
  const snapshotFatigueState = effectiveSnapshot?.fatigue_state || "ok";
  const stateValuesDispo = fatigueStateMapDispo[snapshotFatigueState] ?? fatigueStateMapDispo.ok;
  
  let disponibiliteResult: DisponibiliteTFCL | null = null;
  {
    const dispoInput: TFCLReadinessInput = {
      sleep: stateValuesDispo.sleep,
      fatigue: stateValuesDispo.fatigue,
      soreness: stateValuesDispo.soreness,
      stress: stateValuesDispo.stress,
      motivation: stateValuesDispo.motivation,
      alerts: snapshotFatigueState === "injured" ? { asymmetric_pain: true } : undefined,
      objective: {
        tss7d: effectiveSnapshot?.tss_7d ?? null,
        tssTarget: 350,
      },
    };
    disponibiliteResult = computeDisponibiliteTFCL(dispoInput);
  }
  
  const disponibiliteTFCLHTML = disponibiliteResult ? `
    <section id="disponibilite-tfcl" class="section pagebreakAvoid">
      <h2>📊 Disponibilité TFCL™</h2>
      
      <div class="alert alertInfo mb">
        <b>⚠️ ${PDF_DISPONIBILITE_SECTION.disclaimer}</b>
      </div>
      
      <div class="card cardHighlight mb">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;">Score de Disponibilité</div>
            <div class="big" style="margin:8px 0;color:${disponibiliteResult.level === 'high' ? 'var(--success)' : disponibiliteResult.level === 'moderate' ? 'var(--warning)' : 'var(--error)'}">
              ${disponibiliteResult.levelEmoji} ${disponibiliteResult.score}/100
            </div>
            <div style="font-size:14px;font-weight:600;">${htmlEscape(disponibiliteResult.levelLabel)}</div>
            <div class="muted" style="font-size:10px;margin-top:4px;">Basé sur l'état de fatigue du snapshot : <b>${snapshotFatigueState}</b></div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Recommandation</div>
            <div style="margin:8px 0;padding:8px 16px;border-radius:8px;background:${disponibiliteResult.interpretation.recommendation === 'maintain' ? 'var(--success)' : disponibiliteResult.interpretation.recommendation === 'adapt' ? 'var(--warning)' : 'var(--error)'};color:white;font-weight:600;">
              ${disponibiliteResult.interpretation.recommendationLabel}
            </div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Confiance</div>
            <div class="medium" style="margin:8px 0;">${disponibiliteResult.confidenceLabel}</div>
          </div>
        </div>
      </div>
      
      <div class="grid2">
        <div class="card">
          <h3>📋 Scores dérivés du snapshot</h3>
          <div style="display:grid;gap:8px;">
            ${Object.entries(disponibiliteResult.breakdown.subjective.details).map(([key, value]) => `
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="muted">${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <span style="font-weight:600;">${value ?? '—'}/10</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="card">
          <h3>💡 Raisons principales</h3>
          <ul style="margin:0;padding-left:16px;">
            ${disponibiliteResult.interpretation.mainReasons.map(r => `<li>${htmlEscape(r)}</li>`).join('')}
          </ul>
        </div>
      </div>
      
      ${disponibiliteResult.hasAlerts ? `
        <div class="alert alertError mt">
          <b>🚨 Alertes actives</b>
          <ul style="margin:8px 0 0 0;">
            ${disponibiliteResult.alertMessages.map(a => `<li>${htmlEscape(a)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="card mt" style="background:var(--soft);">
        <h4>📖 ${PDF_DISPONIBILITE_SECTION.title}</h4>
        ${PDF_DISPONIBILITE_SECTION.content.map(c => `
          <p><b>${c.heading}:</b> ${htmlEscape(c.text)}</p>
        `).join('')}
      </div>
    </section>
  ` : '';

  // =============================================
  // D-bis. CIBLES PAR NIVEAU D'AMBITION
  // =============================================
  const ambitionData = payload.ambition;
  const ambitionTargetsHTML = `
    <section id="ambition-targets" class="section pagebreak">
      <h2>D. Cibles Physiologiques par Niveau d'Ambition</h2>
      
      <div class="card cardHighlight mb">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <span style="font-size:28px;">${ambitionData.icon}</span>
          <div>
            <div style="font-size:18px;font-weight:700;">Ambition actuelle : ${ambitionData.label}</div>
            <div class="muted">Les cibles ci-dessous sont adaptées à votre niveau d'ambition pour ${getObjectifLabel(athlete.goal)}</div>
          </div>
        </div>
        <div class="grid3">
          <div class="card" style="text-align:center;">
            <div class="muted">VLamax cible</div>
            <div class="medium">${ambitionData.targets.vlamax.optimal.toFixed(2)}</div>
            <div class="muted" style="font-size:10px;">(${ambitionData.targets.vlamax.min.toFixed(2)} - ${ambitionData.targets.vlamax.max.toFixed(2)})</div>
          </div>
          <div class="card" style="text-align:center;">
            <div class="muted">TTE minimum</div>
            <div class="medium">${ambitionData.targets.tte_min} min</div>
          </div>
          <div class="card" style="text-align:center;">
            <div class="muted">FTP/kg minimum</div>
            <div class="medium">${ambitionData.targets.ftp_kg_min.toFixed(1)} W/kg</div>
          </div>
        </div>
      </div>
      
      <h3>Comparatif des cibles par niveau d'ambition</h3>
      <table style="width:100%;margin-top:12px;">
        <thead>
          <tr>
            <th>Niveau</th>
            <th>VLamax optimal</th>
            <th>TTE min</th>
            <th>FTP/kg min</th>
            <th>Progression</th>
            <th>Délai estimé</th>
          </tr>
        </thead>
        <tbody>
          ${ambitionData.allTargets.map(t => `
            <tr style="${t.ambition === ambitionData.current ? 'background:rgba(37,99,235,0.1);font-weight:600;' : ''}">
              <td>${t.icon} ${t.label}</td>
              <td>${t.targets.vlamax.optimal.toFixed(2)}</td>
              <td>${t.targets.tte_min} min</td>
              <td>${t.targets.ftp_kg_min.toFixed(1)} W/kg</td>
              <td>
                <div class="progressBar" style="width:80px;display:inline-block;vertical-align:middle;">
                  <div class="progressFill" style="width:${t.progress.global ?? 0}%;background:${t.progress.global && t.progress.global >= 95 ? 'var(--success)' : t.progress.global && t.progress.global >= 70 ? 'var(--warning)' : 'var(--error)'}"></div>
                </div>
                <span style="font-size:11px;margin-left:4px;">${t.progress.global !== null ? Math.round(t.progress.global) + '%' : '—'}</span>
              </td>
              <td>${t.isReached ? '<span class="badge badgeSuccess">✓ Atteint</span>' : t.weeksToReach !== null ? '~' + t.weeksToReach + ' sem.' : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `;

  // =============================================
  // D-ter. PRÉDICTIONS D'AMBITION
  // =============================================
  const currentAmbitionTarget = ambitionData.allTargets.find(t => t.ambition === ambitionData.current);
  const ambitionPredictionsHTML = `
    <section id="ambition-predictions" class="section">
      <h2>E. Prédictions de Progression vers les Cibles</h2>
      
      <div class="card cardHighlight mb">
        <h3>📊 Résumé pour ${ambitionData.icon} ${ambitionData.label}</h3>
        <div class="grid3 mt">
          <div>
            <div class="muted">Progression VLamax</div>
            <div class="medium ${currentAmbitionTarget?.progress.vlamax && currentAmbitionTarget.progress.vlamax >= 90 ? 'success' : 'warning'}">${currentAmbitionTarget?.progress.vlamax !== null ? Math.round(currentAmbitionTarget.progress.vlamax) + '%' : '—'}</div>
          </div>
          <div>
            <div class="muted">Progression TTE</div>
            <div class="medium ${currentAmbitionTarget?.progress.tte && currentAmbitionTarget.progress.tte >= 90 ? 'success' : 'warning'}">${currentAmbitionTarget?.progress.tte !== null ? Math.round(currentAmbitionTarget.progress.tte) + '%' : '—'}</div>
          </div>
          <div>
            <div class="muted">Progression FTP/kg</div>
            <div class="medium ${currentAmbitionTarget?.progress.ftpKg && currentAmbitionTarget.progress.ftpKg >= 90 ? 'success' : 'warning'}">${currentAmbitionTarget?.progress.ftpKg !== null ? Math.round(currentAmbitionTarget.progress.ftpKg) + '%' : '—'}</div>
          </div>
        </div>
        ${currentAmbitionTarget?.isReached ? '<div class="alert alertSuccess mt"><b>🏆 Félicitations !</b> Vous avez atteint les cibles pour le niveau ' + ambitionData.label + '.</div>' : currentAmbitionTarget?.weeksToReach !== null ? '<div class="alert alertInfo mt"><b>⏱️ Délai estimé :</b> ~' + currentAmbitionTarget.weeksToReach + ' semaines pour atteindre les cibles ' + ambitionData.label + ' (basé sur une progression moyenne de 1.5%/sem)</div>' : ''}
      </div>
      
      <div class="grid4 mt">
        ${ambitionData.allTargets.map(t => `
          <div class="card ${t.ambition === ambitionData.current ? 'cardHighlight' : ''} ${t.isReached ? 'cardSuccess' : ''}" style="text-align:center;">
            <div style="font-size:24px;margin-bottom:4px;">${t.icon}</div>
            <div style="font-weight:600;">${t.label}</div>
            <div class="big ${t.isReached ? 'success' : t.progress.global && t.progress.global >= 70 ? 'warning' : 'error'}">${t.progress.global !== null ? Math.round(t.progress.global) + '%' : '—'}</div>
            <div class="muted" style="font-size:11px;">${t.isReached ? '✓ Atteint' : t.weeksToReach !== null ? '~' + t.weeksToReach + ' sem.' : 'Données insuffisantes'}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="alert alertWarning mt">
        <b>⚠️ Note :</b> Ces prédictions sont des estimations basées sur une progression linéaire moyenne. Les résultats réels dépendent de nombreux facteurs (régularité, qualité de l'entraînement, récupération, etc.).
      </div>
    </section>
  `;

  // =============================================
  // E-bis. GRAPHIQUES D'ÉVOLUTION (SVG) - VERSION AMÉLIORÉE
  // =============================================
  
  // Préparer les données pour les graphiques
  const chartSnapshotsSorted = [...snapshotHistory]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12);
  
  // Données additionnelles
  const vo2maxData = chartSnapshotsSorted.filter(s => s.vo2max !== null);
  const runEconomyData = chartSnapshotsSorted.filter(s => s.run_economy_score !== null);
  const metabolicScoreData = chartSnapshotsSorted.filter(s => s.metabolic_score !== null);
  
  // Helper functions pour générer le HTML des graphiques
  const buildVlamaxTteChart = (): string => {
    const vlamaxDataChart = chartSnapshotsSorted.filter(s => s.vlamax !== null);
    const tteDataChart = chartSnapshotsSorted.filter(s => s.tte_observed_min !== null);
    const vlamaxTrend = vlamaxDataChart.length >= 2 ? (vlamaxDataChart[vlamaxDataChart.length - 1].vlamax! - vlamaxDataChart[0].vlamax!) : null;
    const tteTrend = tteDataChart.length >= 2 ? (tteDataChart[tteDataChart.length - 1].tte_observed_min! - tteDataChart[0].tte_observed_min!) : null;
    
    // Generate SVG path for VLamax
    const vlamaxPoints = chartSnapshotsSorted
      .map((s, i) => s.vlamax !== null ? { x: 70 + (i / Math.max(1, chartSnapshotsSorted.length - 1)) * 420, y: 20 + ((0.60 - s.vlamax) / 0.40) * 160 } : null)
      .filter(p => p !== null) as { x: number; y: number }[];
    const vlamaxPathD = vlamaxPoints.length >= 2 ? vlamaxPoints.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ') : '';
    const vlamaxAreaD = vlamaxPathD ? vlamaxPathD + ' L ' + vlamaxPoints[vlamaxPoints.length - 1].x + ' 180 L ' + vlamaxPoints[0].x + ' 180 Z' : '';
    
    // Generate SVG path for TTE
    const ttePoints = chartSnapshotsSorted
      .map((s, i) => s.tte_observed_min !== null ? { x: 70 + (i / Math.max(1, chartSnapshotsSorted.length - 1)) * 420, y: 20 + ((80 - s.tte_observed_min) / 60) * 160 } : null)
      .filter(p => p !== null) as { x: number; y: number }[];
    const ttePathD = ttePoints.length >= 2 ? ttePoints.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ') : '';
    const tteAreaD = ttePathD ? ttePathD + ' L ' + ttePoints[ttePoints.length - 1].x + ' 180 L ' + ttePoints[0].x + ' 180 Z' : '';
    
    // Generate data points circles for VLamax
    const vlamaxCircles = chartSnapshotsSorted.map((s, i) => {
      const x = 70 + (i / Math.max(1, chartSnapshotsSorted.length - 1)) * 420;
      const y = s.vlamax !== null ? 20 + ((0.60 - s.vlamax) / 0.40) * 160 : null;
      return y !== null ? '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#0891b2" stroke="#fff" stroke-width="2" filter="url(#dropShadow)"/>' : '';
    }).join('');
    
    // Generate data points circles for TTE
    const tteCircles = chartSnapshotsSorted.map((s, i) => {
      const x = 70 + (i / Math.max(1, chartSnapshotsSorted.length - 1)) * 420;
      const y = s.tte_observed_min !== null ? 20 + ((80 - s.tte_observed_min) / 60) * 160 : null;
      return y !== null ? '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#ea580c" stroke="#fff" stroke-width="2" filter="url(#dropShadow)"/>' : '';
    }).join('');
    
    // Grid lines
    const gridLines = [0, 40, 80, 120, 160].map(y => '<line x1="70" y1="' + (20 + y) + '" x2="490" y2="' + (20 + y) + '" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="' + (y === 80 ? '0' : '4,4') + '"/>').join('');
    
    const vlamaxTrendBg = vlamaxTrend !== null ? (vlamaxTrend < 0 ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' : vlamaxTrend > 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f1f5f9') : '';
    const vlamaxTrendBorder = vlamaxTrend !== null ? (vlamaxTrend < 0 ? '#86efac' : vlamaxTrend > 0 ? '#fcd34d' : '#e2e8f0') : '';
    const vlamaxTrendColor = vlamaxTrend !== null ? (vlamaxTrend < 0 ? '#16a34a' : vlamaxTrend > 0 ? '#d97706' : '#475569') : '';
    const vlamaxTrendIcon = vlamaxTrend !== null ? (vlamaxTrend < 0 ? '📉' : vlamaxTrend > 0 ? '📈' : '➡️') : '';
    
    const tteTrendBg = tteTrend !== null ? (tteTrend > 0 ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' : tteTrend < 0 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f1f5f9') : '';
    const tteTrendBorder = tteTrend !== null ? (tteTrend > 0 ? '#86efac' : tteTrend < 0 ? '#fcd34d' : '#e2e8f0') : '';
    const tteTrendColor = tteTrend !== null ? (tteTrend > 0 ? '#16a34a' : tteTrend < 0 ? '#d97706' : '#475569') : '';
    const tteTrendIcon = tteTrend !== null ? (tteTrend > 0 ? '📈' : tteTrend < 0 ? '📉' : '➡️') : '';
    
    const vlamaxTargetY = 20 + ((0.60 - (targets.vlamaxMax || 0.40)) / 0.40) * 160;
    const vlamaxTargetHeight = ((targets.vlamaxMax || 0.40) - (targets.vlamaxMin || 0.25)) / 0.40 * 160;
    
    return '<div class="card mb" style="background: linear-gradient(135deg, #fafbfc 0%, #f0f4f8 100%); border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">' +
      '<h3 style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">' +
        '<span style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color:white; padding:6px 10px; border-radius:8px; font-size:14px;">⚡</span>' +
        'Évolution VLamax & TTE' +
      '</h3>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">' +
        (vlamaxTrend !== null ? '<div style="display:flex;align-items:center;gap:8px;background:' + vlamaxTrendBg + ';padding:8px 14px;border-radius:10px;border:1px solid ' + vlamaxTrendBorder + ';">' +
          '<span style="font-size:18px;">' + vlamaxTrendIcon + '</span>' +
          '<div><div style="font-size:10px;color:#64748b;text-transform:uppercase;">VLamax</div>' +
          '<div style="font-weight:700;color:' + vlamaxTrendColor + ';">' + (vlamaxTrend > 0 ? '+' : '') + vlamaxTrend.toFixed(3) + '</div></div>' +
        '</div>' : '') +
        (tteTrend !== null ? '<div style="display:flex;align-items:center;gap:8px;background:' + tteTrendBg + ';padding:8px 14px;border-radius:10px;border:1px solid ' + tteTrendBorder + ';">' +
          '<span style="font-size:18px;">' + tteTrendIcon + '</span>' +
          '<div><div style="font-size:10px;color:#64748b;text-transform:uppercase;">TTE</div>' +
          '<div style="font-weight:700;color:' + tteTrendColor + ';">' + (tteTrend > 0 ? '+' : '') + tteTrend + ' min</div></div>' +
        '</div>' : '') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">' +
        '<div style="text-align:center;background:linear-gradient(180deg, rgba(6,182,212,0.1) 0%, rgba(6,182,212,0.02) 100%);padding:16px;border-radius:12px;border:1px solid rgba(6,182,212,0.2);">' +
          '<div style="font-size:11px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">VLamax Actuelle</div>' +
          '<div style="font-size:28px;font-weight:800;color:#0891b2;">' + (vlamaxDataChart.length > 0 ? (vlamaxDataChart[vlamaxDataChart.length - 1].vlamax?.toFixed(2) || '—') : '—') + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;">mmol/L/s</div>' +
        '</div>' +
        '<div style="text-align:center;background:linear-gradient(180deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.02) 100%);padding:16px;border-radius:12px;border:1px solid rgba(249,115,22,0.2);">' +
          '<div style="font-size:11px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">TTE Actuel</div>' +
          '<div style="font-size:28px;font-weight:800;color:#ea580c;">' + (tteDataChart.length > 0 ? tteDataChart[tteDataChart.length - 1].tte_observed_min || '—' : '—') + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;">minutes</div>' +
        '</div>' +
        '<div style="text-align:center;background:linear-gradient(180deg, rgba(100,116,139,0.1) 0%, rgba(100,116,139,0.02) 100%);padding:16px;border-radius:12px;border:1px solid rgba(100,116,139,0.2);">' +
          '<div style="font-size:11px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Période</div>' +
          '<div style="font-size:14px;font-weight:600;color:#475569;">' + dtStr(chartSnapshotsSorted[0].date) + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;">→ ' + dtStr(chartSnapshotsSorted[chartSnapshotsSorted.length - 1].date) + '</div>' +
        '</div>' +
      '</div>' +
      '<svg width="100%" viewBox="0 0 560 220" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;">' +
        '<defs>' +
          '<linearGradient id="chartBg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f8fafc"/><stop offset="100%" stop-color="#f1f5f9"/></linearGradient>' +
          '<linearGradient id="vlamaxGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#06b6d4" stop-opacity="0.3"/><stop offset="100%" stop-color="#06b6d4" stop-opacity="0.02"/></linearGradient>' +
          '<linearGradient id="tteGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f97316" stop-opacity="0.3"/><stop offset="100%" stop-color="#f97316" stop-opacity="0.02"/></linearGradient>' +
          '<filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.1"/></filter>' +
        '</defs>' +
        '<rect x="70" y="20" width="420" height="160" rx="8" fill="url(#chartBg)" stroke="#e2e8f0" stroke-width="1"/>' +
        gridLines +
        '<text x="60" y="28" font-size="9" fill="#0891b2" text-anchor="end" font-weight="600">0.60</text>' +
        '<text x="60" y="108" font-size="9" fill="#0891b2" text-anchor="end" font-weight="600">0.40</text>' +
        '<text x="60" y="178" font-size="9" fill="#0891b2" text-anchor="end" font-weight="600">0.20</text>' +
        '<text x="500" y="28" font-size="9" fill="#ea580c" text-anchor="start" font-weight="600">80</text>' +
        '<text x="500" y="108" font-size="9" fill="#ea580c" text-anchor="start" font-weight="600">50</text>' +
        '<text x="500" y="178" font-size="9" fill="#ea580c" text-anchor="start" font-weight="600">20</text>' +
        '<rect x="70" y="' + vlamaxTargetY + '" width="420" height="' + vlamaxTargetHeight + '" fill="rgba(34,197,94,0.08)" rx="4"/>' +
        (vlamaxAreaD ? '<path d="' + vlamaxAreaD + '" fill="url(#vlamaxGradient)"/>' : '') +
        (vlamaxPathD ? '<path d="' + vlamaxPathD + '" fill="none" stroke="#0891b2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#dropShadow)"/>' : '') +
        (tteAreaD ? '<path d="' + tteAreaD + '" fill="url(#tteGradient)"/>' : '') +
        (ttePathD ? '<path d="' + ttePathD + '" fill="none" stroke="#ea580c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#dropShadow)"/>' : '') +
        vlamaxCircles + tteCircles +
        '<rect x="180" y="195" width="12" height="12" rx="3" fill="#0891b2"/>' +
        '<text x="197" y="205" font-size="10" fill="#475569">VLamax (mmol/L/s)</text>' +
        '<rect x="320" y="195" width="12" height="12" rx="3" fill="#ea580c"/>' +
        '<text x="337" y="205" font-size="10" fill="#475569">TTE (min)</text>' +
      '</svg>' +
    '</div>';
  };
  
  const buildFtpKgChart = (): string => {
    const ftpKgDataChart = chartSnapshotsSorted.filter(s => s.ftp && s.weight_kg).map(s => ({ ...s, ftpKg: s.ftp! / s.weight_kg! }));
    const ftpKgTrend = ftpKgDataChart.length >= 2 ? (ftpKgDataChart[ftpKgDataChart.length - 1].ftpKg - ftpKgDataChart[0].ftpKg) : null;
    
    const ftpKgPoints = chartSnapshotsSorted
      .map((s, i) => s.ftp && s.weight_kg ? { x: 70 + (i / Math.max(1, chartSnapshotsSorted.length - 1)) * 420, y: 20 + ((5.5 - (s.ftp / s.weight_kg)) / 3.0) * 140 } : null)
      .filter(p => p !== null) as { x: number; y: number }[];
    const ftpKgPathD = ftpKgPoints.length >= 2 ? ftpKgPoints.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ') : '';
    const ftpKgAreaD = ftpKgPathD ? ftpKgPathD + ' L ' + ftpKgPoints[ftpKgPoints.length - 1].x + ' 160 L ' + ftpKgPoints[0].x + ' 160 Z' : '';
    
    const ftpKgCircles = chartSnapshotsSorted.map((s, i) => {
      const x = 70 + (i / Math.max(1, chartSnapshotsSorted.length - 1)) * 420;
      const ftpKgVal = s.ftp && s.weight_kg ? s.ftp / s.weight_kg : null;
      const y = ftpKgVal !== null ? 20 + ((5.5 - ftpKgVal) / 3.0) * 140 : null;
      return y !== null ? '<circle cx="' + x + '" cy="' + y + '" r="7" fill="#16a34a" stroke="#fff" stroke-width="2" filter="url(#dropShadow)"/>' : '';
    }).join('');
    
    const gridLines = [0, 35, 70, 105, 140].map(y => '<line x1="70" y1="' + (20 + y) + '" x2="490" y2="' + (20 + y) + '" stroke="#bbf7d0" stroke-dasharray="4,4"/>').join('');
    
    const dateLabels = chartSnapshotsSorted.length <= 6 
      ? chartSnapshotsSorted.map((s, i) => {
          const x = 70 + (i / Math.max(1, chartSnapshotsSorted.length - 1)) * 420;
          return '<text x="' + x + '" y="185" font-size="8" fill="#64748b" text-anchor="middle">' + new Date(s.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }) + '</text>';
        }).join('')
      : '<text x="70" y="185" font-size="8" fill="#64748b" text-anchor="start">' + new Date(chartSnapshotsSorted[0].date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) + '</text>' +
        '<text x="490" y="185" font-size="8" fill="#64748b" text-anchor="end">' + new Date(chartSnapshotsSorted[chartSnapshotsSorted.length - 1].date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) + '</text>';
    
    const trendColor = ftpKgTrend !== null ? (ftpKgTrend > 0 ? '#16a34a' : ftpKgTrend < 0 ? '#dc2626' : '#64748b') : '#64748b';
    const trendIcon = ftpKgTrend !== null ? (ftpKgTrend > 0 ? '🚀' : ftpKgTrend < 0 ? '📉' : '➡️') : '';
    
    return '<div class="card mb" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; box-shadow: 0 4px 12px rgba(34,197,94,0.1);">' +
      '<h3 style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">' +
        '<span style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color:white; padding:6px 10px; border-radius:8px; font-size:14px;">💪</span>' +
        'Évolution FTP/kg' +
      '</h3>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:20px;">' +
        '<div style="flex:1;min-width:200px;background:white;padding:20px;border-radius:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.05);">' +
          '<div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">FTP/kg Actuel</div>' +
          '<div style="font-size:36px;font-weight:800;color:#16a34a;">' + (ftpKgDataChart.length > 0 ? ftpKgDataChart[ftpKgDataChart.length - 1].ftpKg.toFixed(2) : '—') + '</div>' +
          '<div style="font-size:12px;color:#94a3b8;">W/kg</div>' +
        '</div>' +
        (ftpKgTrend !== null ? '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' +
          '<div style="font-size:32px;">' + trendIcon + '</div>' +
          '<div style="font-size:20px;font-weight:700;color:' + trendColor + ';">' + (ftpKgTrend > 0 ? '+' : '') + ftpKgTrend.toFixed(2) + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;">W/kg depuis le début</div>' +
        '</div>' : '') +
      '</div>' +
      '<svg width="100%" viewBox="0 0 560 200" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;">' +
        '<defs>' +
          '<linearGradient id="ftpBg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f0fdf4"/><stop offset="100%" stop-color="#dcfce7"/></linearGradient>' +
          '<linearGradient id="ftpFill" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#22c55e" stop-opacity="0.4"/><stop offset="100%" stop-color="#22c55e" stop-opacity="0.05"/></linearGradient>' +
        '</defs>' +
        '<rect x="70" y="20" width="420" height="140" rx="8" fill="url(#ftpBg)" stroke="#bbf7d0"/>' +
        gridLines +
        '<text x="60" y="28" font-size="9" fill="#16a34a" text-anchor="end" font-weight="600">5.5</text>' +
        '<text x="60" y="93" font-size="9" fill="#16a34a" text-anchor="end" font-weight="600">4.0</text>' +
        '<text x="60" y="158" font-size="9" fill="#16a34a" text-anchor="end" font-weight="600">2.5</text>' +
        '<rect x="70" y="' + (20 + ((5.5 - 4.5) / 3.0) * 140) + '" width="420" height="' + (1.0 / 3.0 * 140) + '" fill="rgba(34,197,94,0.15)" rx="4"/>' +
        '<text x="85" y="' + (28 + ((5.5 - 4.5) / 3.0) * 140) + '" font-size="8" fill="#16a34a" font-weight="600">ZONE CIBLE</text>' +
        (ftpKgAreaD ? '<path d="' + ftpKgAreaD + '" fill="url(#ftpFill)"/>' : '') +
        (ftpKgPathD ? '<path d="' + ftpKgPathD + '" fill="none" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#dropShadow)"/>' : '') +
        ftpKgCircles +
        '<line x1="70" y1="170" x2="490" y2="170" stroke="#bbf7d0" stroke-width="1"/>' +
        dateLabels +
      '</svg>' +
    '</div>';
  };
  
  const buildVo2maxChart = (): string => {
    if (vo2maxData.length < 2) return '';
    
    const vo2maxTrend = vo2maxData[vo2maxData.length - 1].vo2max! - vo2maxData[0].vo2max!;
    const currentVo2max = vo2maxData[vo2maxData.length - 1].vo2max!;
    const levelLabel = currentVo2max >= 60 ? '🏆 Elite' : currentVo2max >= 50 ? '⚡ Excellent' : currentVo2max >= 40 ? '✓ Bon' : '📈 À développer';
    const trendColor = vo2maxTrend > 0 ? '#16a34a' : vo2maxTrend < 0 ? '#dc2626' : '#64748b';
    
    const vo2maxPoints = vo2maxData.map((s, i) => ({
      x: 70 + (chartSnapshotsSorted.indexOf(s) / Math.max(1, chartSnapshotsSorted.length - 1)) * 420,
      y: 20 + ((80 - s.vo2max!) / 50) * 110
    }));
    const pathD = vo2maxPoints.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ');
    const areaD = pathD + ' L ' + vo2maxPoints[vo2maxPoints.length - 1].x + ' 130 L ' + vo2maxPoints[0].x + ' 130 Z';
    const circles = vo2maxPoints.map(p => '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" fill="#9333ea" stroke="#fff" stroke-width="2"/>').join('');
    
    return '<div class="card mb" style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 1px solid #d8b4fe; box-shadow: 0 4px 12px rgba(147,51,234,0.1);">' +
      '<h3 style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">' +
        '<span style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color:white; padding:6px 10px; border-radius:8px; font-size:14px;">🫁</span>' +
        'Évolution VO₂max' +
      '</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">' +
        '<div style="text-align:center;background:white;padding:14px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
          '<div style="font-size:10px;color:#64748b;text-transform:uppercase;">VO₂max Actuel</div>' +
          '<div style="font-size:28px;font-weight:800;color:#9333ea;">' + currentVo2max.toFixed(1) + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;">ml/kg/min</div>' +
        '</div>' +
        '<div style="text-align:center;background:white;padding:14px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
          '<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Évolution</div>' +
          '<div style="font-size:24px;font-weight:700;color:' + trendColor + ';">' + (vo2maxTrend > 0 ? '+' : '') + vo2maxTrend.toFixed(1) + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;">ml/kg/min</div>' +
        '</div>' +
        '<div style="text-align:center;background:white;padding:14px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
          '<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Niveau</div>' +
          '<div style="font-size:16px;font-weight:600;color:#7c3aed;">' + levelLabel + '</div>' +
        '</div>' +
      '</div>' +
      '<svg width="100%" viewBox="0 0 560 160" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;">' +
        '<defs><linearGradient id="vo2Gradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#9333ea" stop-opacity="0.3"/><stop offset="100%" stop-color="#9333ea" stop-opacity="0.02"/></linearGradient></defs>' +
        '<rect x="70" y="20" width="420" height="110" rx="6" fill="#faf5ff" stroke="#e9d5ff"/>' +
        '<path d="' + areaD + '" fill="url(#vo2Gradient)"/>' +
        '<path d="' + pathD + '" fill="none" stroke="#9333ea" stroke-width="3" stroke-linecap="round"/>' +
        circles +
        '<text x="60" y="30" font-size="9" fill="#7c3aed" text-anchor="end">80</text>' +
        '<text x="60" y="75" font-size="9" fill="#7c3aed" text-anchor="end">55</text>' +
        '<text x="60" y="128" font-size="9" fill="#7c3aed" text-anchor="end">30</text>' +
        '<text x="280" y="150" font-size="10" fill="#64748b" text-anchor="middle">VO₂max (ml/kg/min)</text>' +
      '</svg>' +
    '</div>';
  };
  
  const buildRunEconomyChart = (): string => {
    if (runEconomyData.length < 2) return '';
    
    const currentScore = runEconomyData[runEconomyData.length - 1].run_economy_score!;
    const currentLabel = runEconomyData[runEconomyData.length - 1].run_economy_label || 'N/A';
    
    const points = runEconomyData.map((s, i) => ({
      x: 70 + (chartSnapshotsSorted.indexOf(s) / Math.max(1, chartSnapshotsSorted.length - 1)) * 420,
      y: 20 + ((100 - s.run_economy_score!) / 100) * 90
    }));
    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ');
    const areaD = pathD + ' L ' + points[points.length - 1].x + ' 110 L ' + points[0].x + ' 110 Z';
    const circles = points.map(p => '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" fill="#ea580c" stroke="#fff" stroke-width="2"/>').join('');
    
    return '<div class="card mb" style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 1px solid #fed7aa; box-shadow: 0 4px 12px rgba(234,88,12,0.1);">' +
      '<h3 style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">' +
        '<span style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color:white; padding:6px 10px; border-radius:8px; font-size:14px;">🏃</span>' +
        'Évolution Économie de Course' +
      '</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">' +
        '<div style="text-align:center;background:white;padding:16px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
          '<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Score Actuel</div>' +
          '<div style="font-size:32px;font-weight:800;color:#ea580c;">' + currentScore + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;">/100</div>' +
        '</div>' +
        '<div style="text-align:center;background:white;padding:16px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
          '<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Label</div>' +
          '<div style="font-size:16px;font-weight:700;color:#c2410c;">' + currentLabel + '</div>' +
        '</div>' +
      '</div>' +
      '<svg width="100%" viewBox="0 0 560 140" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;">' +
        '<defs><linearGradient id="runEcoGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ea580c" stop-opacity="0.3"/><stop offset="100%" stop-color="#ea580c" stop-opacity="0.02"/></linearGradient></defs>' +
        '<rect x="70" y="20" width="420" height="90" rx="6" fill="#fff7ed" stroke="#fed7aa"/>' +
        '<path d="' + areaD + '" fill="url(#runEcoGradient)"/>' +
        '<path d="' + pathD + '" fill="none" stroke="#ea580c" stroke-width="3" stroke-linecap="round"/>' +
        circles +
        '<text x="60" y="28" font-size="9" fill="#c2410c" text-anchor="end">100</text>' +
        '<text x="60" y="68" font-size="9" fill="#c2410c" text-anchor="end">50</text>' +
        '<text x="60" y="108" font-size="9" fill="#c2410c" text-anchor="end">0</text>' +
        '<text x="280" y="130" font-size="10" fill="#64748b" text-anchor="middle">Score Économie de Course</text>' +
      '</svg>' +
    '</div>';
  };
  
  const buildMetabolicScoreChart = (): string => {
    if (metabolicScoreData.length < 2) return '';
    
    const currentScore = metabolicScoreData[metabolicScoreData.length - 1].metabolic_score!;
    const scoreTrend = currentScore - metabolicScoreData[0].metabolic_score!;
    const currentProfile = metabolicScoreData[metabolicScoreData.length - 1].metabolic_profile || 'N/A';
    const trendColor = scoreTrend > 0 ? '#16a34a' : scoreTrend < 0 ? '#dc2626' : '#64748b';
    
    const points = metabolicScoreData.map((s, i) => ({
      x: 70 + (chartSnapshotsSorted.indexOf(s) / Math.max(1, chartSnapshotsSorted.length - 1)) * 420,
      y: 20 + ((100 - s.metabolic_score!) / 100) * 90
    }));
    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y).join(' ');
    const areaD = pathD + ' L ' + points[points.length - 1].x + ' 110 L ' + points[0].x + ' 110 Z';
    const circles = points.map(p => '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" fill="#2563eb" stroke="#fff" stroke-width="2"/>').join('');
    
    return '<div class="card" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #93c5fd; box-shadow: 0 4px 12px rgba(37,99,235,0.1);">' +
      '<h3 style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">' +
        '<span style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:white; padding:6px 10px; border-radius:8px; font-size:14px;">🧬</span>' +
        'Évolution Score Métabolique' +
      '</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">' +
        '<div style="text-align:center;background:white;padding:14px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
          '<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Score Actuel</div>' +
          '<div style="font-size:28px;font-weight:800;color:#2563eb;">' + currentScore + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;">/100</div>' +
        '</div>' +
        '<div style="text-align:center;background:white;padding:14px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
          '<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Évolution</div>' +
          '<div style="font-size:24px;font-weight:700;color:' + trendColor + ';">' + (scoreTrend > 0 ? '+' : '') + scoreTrend + '</div>' +
          '<div style="font-size:10px;color:#94a3b8;">points</div>' +
        '</div>' +
        '<div style="text-align:center;background:white;padding:14px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">' +
          '<div style="font-size:10px;color:#64748b;text-transform:uppercase;">Profil</div>' +
          '<div style="font-size:14px;font-weight:600;color:#1d4ed8;">' + currentProfile + '</div>' +
        '</div>' +
      '</div>' +
      '<svg width="100%" viewBox="0 0 560 140" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;">' +
        '<defs><linearGradient id="metaScoreGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#2563eb" stop-opacity="0.3"/><stop offset="100%" stop-color="#2563eb" stop-opacity="0.02"/></linearGradient></defs>' +
        '<rect x="70" y="20" width="420" height="90" rx="6" fill="#eff6ff" stroke="#93c5fd"/>' +
        '<path d="' + areaD + '" fill="url(#metaScoreGradient)"/>' +
        '<path d="' + pathD + '" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>' +
        circles +
        '<text x="60" y="28" font-size="9" fill="#1d4ed8" text-anchor="end">100</text>' +
        '<text x="60" y="68" font-size="9" fill="#1d4ed8" text-anchor="end">50</text>' +
        '<text x="60" y="108" font-size="9" fill="#1d4ed8" text-anchor="end">0</text>' +
        '<text x="280" y="130" font-size="10" fill="#64748b" text-anchor="middle">Score Métabolique Global</text>' +
      '</svg>' +
    '</div>';
  };
  
  const buildAmbitionProgressChart = (): string => {
    const progressVlamax = currentAmbitionTarget?.progress.vlamax !== null ? Math.round(currentAmbitionTarget.progress.vlamax) : null;
    const progressTte = currentAmbitionTarget?.progress.tte !== null ? Math.round(currentAmbitionTarget.progress.tte) : null;
    const progressFtpKg = currentAmbitionTarget?.progress.ftpKg !== null ? Math.round(currentAmbitionTarget.progress.ftpKg) : null;
    const progressGlobal = currentAmbitionTarget?.progress.global !== null ? Math.round(currentAmbitionTarget.progress.global) : 0;
    const progressArc = (progressGlobal / 100) * 440;
    
    const statusMessage = currentAmbitionTarget?.isReached 
      ? '<div class="alert alertSuccess" style="text-align:center;"><b>🏆 Félicitations !</b> Vous avez atteint les cibles pour le niveau ' + ambitionData.label + '.</div>'
      : currentAmbitionTarget?.weeksToReach !== null 
        ? '<div class="alert alertInfo" style="text-align:center;"><b>⏱️ Délai estimé :</b> ~' + currentAmbitionTarget.weeksToReach + ' semaines (basé sur une progression de 1.5%/sem)</div>'
        : '';
    
    // Build timeline visualization for all ambition levels
    const buildTimelineSVG = (): string => {
      const allTargets = ambitionData.allTargets;
      const maxWeeks = 52;
      const timelineWidth = 480;
      const timelineStartX = 80;
      
      // Ambition colors matching the design system
      const ambitionColors: Record<string, { bg: string; text: string; icon: string }> = {
        finisher: { bg: '#94a3b8', text: '#475569', icon: '🏁' },
        age_group: { bg: '#3b82f6', text: '#1d4ed8', icon: '⭐' },
        competitor: { bg: '#f59e0b', text: '#d97706', icon: '🏆' },
        elite: { bg: '#a855f7', text: '#7c3aed', icon: '👑' }
      };
      
      // Calculate positions for each ambition level
      const timelineItems = allTargets.map((target, index) => {
        const colors = ambitionColors[target.ambition] || ambitionColors.age_group;
        const weeks = target.isReached ? 0 : (target.weeksToReach || maxWeeks);
        const xPos = timelineStartX + (weeks / maxWeeks) * timelineWidth;
        const isCurrentAmbition = target.ambition === ambitionData.current;
        
        return {
          ...target,
          weeks,
          xPos: Math.min(xPos, timelineStartX + timelineWidth),
          colors,
          isCurrentAmbition
        };
      });
      
      // Sort by weeks to ensure proper layering
      const sortedItems = [...timelineItems].sort((a, b) => a.weeks - b.weeks);
      
      // Build milestone markers
      const milestoneMarkers = sortedItems.map((item, index) => {
        const yOffset = index % 2 === 0 ? -35 : 35; // Alternate above/below
        const labelY = yOffset < 0 ? yOffset - 12 : yOffset + 22;
        const weeksY = yOffset < 0 ? yOffset - 2 : yOffset + 34;
        const connectorY1 = yOffset < 0 ? yOffset + 10 : 0;
        const connectorY2 = yOffset < 0 ? 0 : yOffset - 8;
        
        return `
          <!-- Connector line -->
          <line x1="${item.xPos}" y1="${connectorY1}" x2="${item.xPos}" y2="${connectorY2}" 
            stroke="${item.colors.bg}" stroke-width="2" stroke-dasharray="${item.isReached ? '0' : '4 2'}"/>
          
          <!-- Milestone circle -->
          <circle cx="${item.xPos}" cy="0" r="${item.isCurrentAmbition ? 12 : 8}" 
            fill="${item.isReached ? item.colors.bg : '#fff'}" 
            stroke="${item.colors.bg}" stroke-width="${item.isCurrentAmbition ? 3 : 2}"
            ${item.isReached ? 'filter="url(#glowReached)"' : ''}/>
          ${item.isReached ? `<text x="${item.xPos}" y="4" font-size="8" fill="#fff" text-anchor="middle">✓</text>` : ''}
          
          <!-- Label box -->
          <rect x="${item.xPos - 45}" y="${labelY - 12}" width="90" height="24" rx="6" 
            fill="${item.isCurrentAmbition ? item.colors.bg : '#fff'}" 
            stroke="${item.colors.bg}" stroke-width="1.5"
            ${item.isCurrentAmbition ? 'filter="url(#dropShadow)"' : ''}/>
          <text x="${item.xPos}" y="${labelY + 2}" font-size="10" font-weight="${item.isCurrentAmbition ? '700' : '600'}" 
            fill="${item.isCurrentAmbition ? '#fff' : item.colors.text}" text-anchor="middle">
            ${item.icon} ${item.label}
          </text>
          
          <!-- Weeks indicator -->
          <text x="${item.xPos}" y="${weeksY}" font-size="9" fill="${item.colors.text}" text-anchor="middle" font-weight="600">
            ${item.isReached ? '✅ Atteint' : item.weeks >= 52 ? '> 52 sem.' : `~${item.weeks} sem.`}
          </text>
        `;
      }).join('');
      
      // Timeline ticks (0, 12, 26, 39, 52 weeks)
      const ticks = [0, 13, 26, 39, 52].map(week => {
        const x = timelineStartX + (week / maxWeeks) * timelineWidth;
        return `
          <line x1="${x}" y1="12" x2="${x}" y2="18" stroke="#94a3b8" stroke-width="1"/>
          <text x="${x}" y="28" font-size="8" fill="#64748b" text-anchor="middle">${week}s</text>
        `;
      }).join('');
      
      // Month labels
      const monthLabels = [
        { week: 0, label: 'Aujourd\'hui' },
        { week: 13, label: '3 mois' },
        { week: 26, label: '6 mois' },
        { week: 52, label: '1 an' }
      ].map(({ week, label }) => {
        const x = timelineStartX + (week / maxWeeks) * timelineWidth;
        return `<text x="${x}" y="40" font-size="7" fill="#94a3b8" text-anchor="middle">${label}</text>`;
      }).join('');
      
      return `
        <div style="margin-top:24px;">
          <h4 style="margin:0 0 12px 0;font-size:13px;color:#64748b;display:flex;align-items:center;gap:6px;">
            <span style="font-size:16px;">📅</span> Timeline prédictive des objectifs
          </h4>
          <svg width="100%" viewBox="0 0 600 140" preserveAspectRatio="xMidYMid meet" style="max-width:100%;height:auto;">
            <defs>
              <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.15"/>
              </filter>
              <filter id="glowReached">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#16a34a"/>
                <stop offset="33%" stop-color="#3b82f6"/>
                <stop offset="66%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#a855f7"/>
              </linearGradient>
            </defs>
            
            <!-- Main timeline -->
            <g transform="translate(0, 70)">
              <!-- Background track -->
              <rect x="${timelineStartX}" y="-4" width="${timelineWidth}" height="8" rx="4" fill="#e2e8f0"/>
              
              <!-- Progress bar (filled portion) -->
              <rect x="${timelineStartX}" y="-4" width="${Math.max(8, (progressGlobal / 100) * timelineWidth * 0.3)}" height="8" rx="4" fill="url(#timelineGradient)"/>
              
              <!-- Current position indicator -->
              <polygon points="${timelineStartX},-8 ${timelineStartX - 6},-16 ${timelineStartX + 6},-16" fill="#111"/>
              <text x="${timelineStartX}" y="-20" font-size="8" fill="#111" text-anchor="middle" font-weight="600">MAINTENANT</text>
              
              <!-- Timeline ticks -->
              ${ticks}
              
              <!-- Month labels -->
              ${monthLabels}
              
              <!-- Milestone markers -->
              ${milestoneMarkers}
            </g>
            
            <!-- Legend -->
            <g transform="translate(80, 130)">
              <circle cx="0" cy="0" r="4" fill="#16a34a"/>
              <text x="8" y="3" font-size="7" fill="#64748b">Atteint</text>
              <circle cx="60" cy="0" r="4" fill="#fff" stroke="#3b82f6" stroke-width="2"/>
              <text x="68" y="3" font-size="7" fill="#64748b">En cours</text>
              <rect x="130" y="-4" width="16" height="8" rx="2" fill="#e2e8f0" stroke="#d97706" stroke-width="1"/>
              <text x="150" y="3" font-size="7" fill="#64748b">Niveau actuel</text>
            </g>
          </svg>
        </div>
      `;
    };
    
    return '<div class="card mt" style="background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border: 1px solid #fde047; box-shadow: 0 4px 12px rgba(234,179,8,0.15);">' +
      '<h3 style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">' +
        '<span style="background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); color:white; padding:6px 10px; border-radius:8px; font-size:14px;">🎯</span>' +
        'Progression vers l\'Ambition ' + ambitionData.icon + ' ' + ambitionData.label +
      '</h3>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:24px;margin:24px 0;">' +
        '<svg width="180" height="180" viewBox="0 0 180 180">' +
          '<defs>' +
            '<linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
              '<stop offset="0%" stop-color="#eab308"/>' +
              '<stop offset="50%" stop-color="#f59e0b"/>' +
              '<stop offset="100%" stop-color="#16a34a"/>' +
            '</linearGradient>' +
            '<filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
          '</defs>' +
          '<circle cx="90" cy="90" r="70" fill="none" stroke="#fef3c7" stroke-width="16"/>' +
          '<circle cx="90" cy="90" r="70" fill="none" stroke="url(#progressGrad)" stroke-width="16" stroke-dasharray="' + progressArc + ' 440" stroke-linecap="round" transform="rotate(-90 90 90)" filter="url(#glow)"/>' +
          '<text x="90" y="80" font-size="36" font-weight="800" fill="#ca8a04" text-anchor="middle">' + progressGlobal + '</text>' +
          '<text x="90" y="100" font-size="14" fill="#64748b" text-anchor="middle">%</text>' +
          '<text x="90" y="120" font-size="10" fill="#94a3b8" text-anchor="middle">vers ' + ambitionData.label + '</text>' +
        '</svg>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<div style="display:flex;align-items:center;gap:12px;background:white;padding:10px 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">' +
            '<div style="width:12px;height:12px;background:#0891b2;border-radius:50%;"></div>' +
            '<div style="flex:1;"><div style="font-size:10px;color:#64748b;">VLamax</div><div style="font-weight:700;color:#0891b2;">' + (progressVlamax !== null ? progressVlamax + '%' : '—') + '</div></div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:12px;background:white;padding:10px 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">' +
            '<div style="width:12px;height:12px;background:#ea580c;border-radius:50%;"></div>' +
            '<div style="flex:1;"><div style="font-size:10px;color:#64748b;">TTE</div><div style="font-weight:700;color:#ea580c;">' + (progressTte !== null ? progressTte + '%' : '—') + '</div></div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:12px;background:white;padding:10px 16px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">' +
            '<div style="width:12px;height:12px;background:#16a34a;border-radius:50%;"></div>' +
            '<div style="flex:1;"><div style="font-size:10px;color:#64748b;">FTP/kg</div><div style="font-weight:700;color:#16a34a;">' + (progressFtpKg !== null ? progressFtpKg + '%' : '—') + '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      buildTimelineSVG() +
      statusMessage +
    '</div>';
  };
  
  // Build evolution charts HTML
  const evolutionChartsHTML = chartSnapshotsSorted.length >= 2 
    ? '<section id="evolution-charts" class="section pagebreak">' +
        '<h2>E-bis. Graphiques d\'Évolution Physiologique</h2>' +
        '<div class="alert alertInfo mb">' +
          '<b>📊 Visualisation des tendances :</b> Ces graphiques montrent l\'évolution des métriques clés sur les ' + chartSnapshotsSorted.length + ' derniers snapshots (' + dtStr(chartSnapshotsSorted[0].date) + ' → ' + dtStr(chartSnapshotsSorted[chartSnapshotsSorted.length - 1].date) + ').' +
        '</div>' +
        buildVlamaxTteChart() +
        buildFtpKgChart() +
        buildVo2maxChart() +
        buildRunEconomyChart() +
        buildMetabolicScoreChart() +
        buildAmbitionProgressChart() +
      '</section>'
    : '<section id="evolution-charts" class="section">' +
        '<h2>E-bis. Graphiques d\'Évolution Physiologique</h2>' +
        '<div class="card" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0;">' +
          '<div class="alert alertInfo" style="margin:0;"><b>ℹ️ Données insuffisantes :</b> Au moins 2 snapshots sont nécessaires pour générer les graphiques d\'évolution.</div>' +
          '<p class="muted mt" style="text-align:center;">Créez des snapshots réguliers pour visualiser l\'évolution de vos métriques physiologiques.</p>' +
        '</div>' +
      '</section>';

  // =============================================
  // 6. AJUSTEMENT PAR L'ÂGE (AAI)
  // =============================================
  const aaiTermLong = isAthlete ? "Ajustement lié à l'âge" : "Ajustement par l'Âge (AAI)";
  const aaiShort = isAthlete ? "Ajustement lié à l'âge" : "AAI";
  const aaiHTML = ageAdjustment.age !== null ? `
    <section id="aai" class="section pagebreakAvoid">
      <h2>6. ${aaiTermLong}</h2>
      
      <div class="card cardHighlight">
        <div class="grid2">
          <div>
            <h3>🎂 Profil de l'athlète</h3>
            <div style="font-size:28px;font-weight:700;margin:8px 0;">${ageAdjustment.age} ans</div>
            <div class="muted">Catégorie : <b>${ageAdjustment.aai.label}</b></div>
            <div class="mt" style="display:flex;gap:16px;flex-wrap:wrap;">
              <div>
                <div class="muted" style="font-size:11px;">${aaiShort}</div>
                <div style="font-size:18px;font-weight:600">${Math.round(ageAdjustment.aai.aai * 100)}%</div>
              </div>
              <div>
                <div class="muted" style="font-size:11px;">Multiplicateur risque</div>
                <div style="font-size:18px;font-weight:600">×${ageAdjustment.aai.riskMultiplier.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div>
            <h4>📊 Échelle ${aaiShort}</h4>
            <svg width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="aaiGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#16a34a"/>
                  <stop offset="33%" style="stop-color:#3b82f6"/>
                  <stop offset="66%" style="stop-color:#d97706"/>
                  <stop offset="100%" style="stop-color:#dc2626"/>
                </linearGradient>
              </defs>
              <rect x="10" y="15" width="380" height="20" rx="4" fill="url(#aaiGrad)"/>
              <line x1="10" y1="40" x2="10" y2="45" stroke="#666" stroke-width="1"/>
              <text x="10" y="55" font-size="9" fill="#666" text-anchor="middle">&lt;30</text>
              <line x1="136" y1="40" x2="136" y2="45" stroke="#666" stroke-width="1"/>
              <text x="136" y="55" font-size="9" fill="#666" text-anchor="middle">30-39</text>
              <line x1="263" y1="40" x2="263" y2="45" stroke="#666" stroke-width="1"/>
              <text x="263" y="55" font-size="9" fill="#666" text-anchor="middle">40-49</text>
              <line x1="390" y1="40" x2="390" y2="45" stroke="#666" stroke-width="1"/>
              <text x="390" y="55" font-size="9" fill="#666" text-anchor="middle">50+</text>
              <text x="73" y="10" font-size="8" fill="#16a34a" text-anchor="middle" font-weight="600">YOUNG</text>
              <text x="200" y="10" font-size="8" fill="#3b82f6" text-anchor="middle" font-weight="600">PRIME</text>
              <text x="327" y="10" font-size="8" fill="#d97706" text-anchor="middle" font-weight="600">MASTER</text>
              <!-- Indicateur -->
              ${(() => {
                const pos = ageAdjustment.aai.category === "young" ? 73 
                  : ageAdjustment.aai.category === "prime" ? 136 
                  : ageAdjustment.aai.category === "master1" ? 263 : 355;
                return `<polygon points="${pos},12 ${pos - 5},2 ${pos + 5},2" fill="#111"/>`;
              })()}
            </svg>
          </div>
        </div>
      </div>

      <div class="grid2 mt">
        <div class="card">
          <h3>🎯 Interprétation VLamax ajustée</h3>
          <div class="kv mt">
            <div class="k">Niveau de risque</div>
            <div class="v">
              <span class="badge ${ageAdjustment.vlamaxInterpretation.riskLevel === 'exploitable' ? 'badgeSuccess' 
                : ageAdjustment.vlamaxInterpretation.riskLevel === 'surveiller' ? 'badgeWarning' 
                : ageAdjustment.vlamaxInterpretation.riskLevel === 'risque' ? 'badgeWarning'
                : 'badgeError'}">
                ${ageAdjustment.vlamaxInterpretation.label}
              </span>
            </div>
            <div class="k">Action prioritaire</div>
            <div class="v">${htmlEscape(ageAdjustment.vlamaxInterpretation.actionPrioritaire)}</div>
          </div>
          <div class="alert alertInfo mt">
            <b>💬 Note staff :</b> ${htmlEscape(ageAdjustment.vlamaxInterpretation.messageStaff)}
          </div>
        </div>

        <div class="card">
          <h3>🥗 Ajustements nutritionnels</h3>
          <div class="kv mt">
            <div class="k">Facteur réduction glucides</div>
            <div class="v"><b>${Math.round(ageAdjustment.nutritionAdjustment.carbReductionFactor * 100)}%</b> de la cible standard</div>
            <div class="k">Réduction tolérance</div>
            <div class="v"><b>-${ageAdjustment.nutritionAdjustment.toleranceReductionPct}%</b></div>
          </div>
          <div class="alert alertWarning mt">
            <b>💬 Note staff :</b> ${htmlEscape(ageAdjustment.nutritionAdjustment.messageStaff)}
          </div>
        </div>
      </div>

      <div class="card mt">
        <h3>📋 Impact sur les cibles d'entraînement</h3>
        <table>
          <thead>
            <tr>
              <th>Métrique</th>
              <th>Ajustement</th>
              <th>Explication</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>TTE (Time To Exhaustion)</b></td>
              <td>Cibles abaissées de ${Math.round((1 - ageAdjustment.aai.aai) * 100)}%</td>
              <td class="muted">Un TTE de 50 min chez un Master2 équivaut à 60 min chez un jeune en termes de performance relative</td>
            </tr>
            <tr>
              <td><b>VLamax</b></td>
              <td>Interprétation adaptée</td>
              <td class="muted">Les seuils de risque sont ajustés : un VLamax de 0.40 est plus préoccupant chez un Master</td>
            </tr>
            <tr>
              <td><b>Nutrition course</b></td>
              <td>${ageAdjustment.nutritionAdjustment.carbReductionFactor < 1 ? "Réduction glucides recommandée" : "Pas d'ajustement"}</td>
              <td class="muted">La tolérance digestive diminue avec l'âge, des apports plus conservateurs sont préférables</td>
            </tr>
            <tr>
              <td><b>Risque blessure</b></td>
              <td>×${ageAdjustment.aai.riskMultiplier.toFixed(2)}</td>
              <td class="muted">Le multiplicateur de risque est appliqué aux indicateurs CAP Injury et Run Injury</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${ageAdjustment.aai.category === "master1" || ageAdjustment.aai.category === "master2" ? `
        <div class="alert alertWarning mt">
          <b>⚠️ Profil Master — Points d'attention :</b>
          <ul class="mt">
            <li>Récupération allongée nécessaire entre séances intenses</li>
            <li>Vigilance accrue sur les signaux de fatigue</li>
            <li>Nutrition plus conservative en course (intestin plus sensible)</li>
            <li>TTE relatif abaissé — ne pas comparer aux cibles standard</li>
          </ul>
        </div>
      ` : `
        <div class="alert alertSuccess mt">
          <b>✅ Profil ${ageAdjustment.aai.category === "young" ? "Jeune" : "Prime"}</b> — 
          Pas d'ajustement majeur requis. Les cibles standard s'appliquent.
        </div>
      `}
    </section>
  ` : '';

  // =============================================
  // LÉGENDE DES CIBLES PAR AMBITION
  // =============================================
  const ambitionLegendHTML = `
    <section id="ambition-legend" class="section pagebreakAvoid">
      <h2>Légende des cibles par niveau d'ambition</h2>
      
      <div class="alert alertInfo mb">
        <b>ℹ️ Comment lire les cibles</b><br>
        <span style="font-size:12px;">
          Les cibles physiologiques (VLamax, TTE, FTP/kg) varient selon le <b>niveau d'ambition</b> sélectionné pour l'athlète.
          Plus l'ambition est élevée, plus les exigences physiologiques sont strictes.
          Le niveau actuel de cet athlète est : <b>${ambition.icon} ${ambition.label}</b>
        </span>
      </div>

      <div class="card">
        <h3>📊 Cibles par niveau d'ambition pour ${getObjectifLabel(athlete.goal)}</h3>
        <table>
          <thead>
            <tr>
              <th style="width:25%">Ambition</th>
              <th style="text-align:center">VLamax optimal</th>
              <th style="text-align:center">TTE cible</th>
              <th style="text-align:center">FTP/kg cible</th>
            </tr>
          </thead>
          <tbody>
            ${ambition.allTargets.map(t => `
              <tr style="${t.ambition === ambition.current ? 'background: linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%); font-weight: 600;' : ''}">
                <td>
                  <span style="font-size:16px;">${t.icon}</span> ${t.label}
                  ${t.ambition === ambition.current ? '<span class="badge badgeSuccess" style="margin-left:8px;font-size:10px;">ACTUEL</span>' : ''}
                </td>
                <td style="text-align:center">≤ ${fmt(t.targets.vlamax.optimal, 2)}</td>
                <td style="text-align:center">≥ ${t.targets.tte_min} min</td>
                <td style="text-align:center">≥ ${fmt(t.targets.ftp_kg_min, 1)} W/kg</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="grid2 mt">
        <div class="card">
          <h4>🎯 Niveau actuel : ${ambition.icon} ${ambition.label}</h4>
          <div class="kv">
            <div class="k">VLamax cible</div>
            <div class="v">${fmt(ambition.targets.vlamax.min, 2)} – ${fmt(ambition.targets.vlamax.max, 2)} (optimal: ${fmt(ambition.targets.vlamax.optimal, 2)})</div>
            <div class="k">TTE cible</div>
            <div class="v">≥ ${ambition.targets.tte_min} min</div>
            <div class="k">FTP/kg cible</div>
            <div class="v">≥ ${fmt(ambition.targets.ftp_kg_min, 1)} W/kg</div>
          </div>
        </div>
        <div class="card">
          <h4>📈 Progression vers les niveaux supérieurs</h4>
          ${ambition.allTargets.filter(t => !t.isReached && t.progress.global !== null).slice(0, 3).map(t => `
            <div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span>${t.icon} ${t.label}</span>
                <span style="font-size:12px;color:var(--muted);">${Math.round(t.progress.global || 0)}%</span>
              </div>
              <div class="progressBar">
                <div class="progressFill" style="width:${Math.min(100, t.progress.global || 0)}%;background:${(t.progress.global || 0) >= 80 ? '#22c55e' : (t.progress.global || 0) >= 50 ? '#eab308' : '#f97316'};"></div>
              </div>
              ${t.weeksToReach ? '<div style="font-size:10px;color:var(--muted);margin-top:2px;">~' + t.weeksToReach + ' semaines estimées</div>' : ''}
            </div>
          `).join('') || '<div class="muted">Tous les niveaux sont atteints ou données insuffisantes</div>'}
        </div>
      </div>

      <div class="alert alertWarning mt">
        <b>💡 Note importante :</b> Les cibles sont contextualisées par l'objectif et l'ambition. Pour les athlètes Masters, les cibles de VO₂max, FTP/kg (ou VMA) et TTE sont ajustées selon la catégorie d'âge ; VLamax reste pilotée par l'objectif + ambition.
      </div>
    </section>
  `;

  // (Sections twoForCoaching, wahoo, planSuggestion, templateRecommendation supprimées — remplacées par facteursLimitants + leviersAction)

  // =============================================
  // SECTION RISQUE DE BLESSURE CAP (DÉTAILLÉ)
  // =============================================
  const injuryRiskHTML = capInjuryRisk ? (isAthlete ? (() => {
    // Vue athlète : niveau en mots + couleur + phrase d'action
    const lvl = capInjuryRisk.level;
    const wordLevel = lvl >= 4 ? 'Critique' : lvl >= 3 ? 'Élevé' : lvl >= 2 ? 'Modéré' : 'Faible';
    const wordColor = lvl >= 4 ? '#dc2626' : lvl >= 3 ? '#ea580c' : lvl >= 2 ? '#d97706' : '#16a34a';
    const cardClass = lvl >= 3 ? 'cardError' : lvl >= 2 ? 'cardWarning' : 'cardSuccess';
    const alertClass = lvl >= 3 ? 'alertError' : lvl >= 2 ? 'alertWarning' : 'alertSuccess';
    const actionPhrase = lvl >= 4
      ? 'Priorité absolue à la récupération. Discute avec ton coach avant la prochaine séance intense.'
      : lvl >= 3
        ? 'Réduis la charge et surveille tes signaux de fatigue cette semaine.'
        : lvl >= 2
          ? 'Reste vigilant sur les douleurs et respecte tes jours de récupération.'
          : 'Profil sain. Continue ta progression graduelle.';
    return `
      <section id="injury-risk" class="section pagebreakAvoid">
        <h2>🦵 Risque de Blessure</h2>
        <div class="card ${cardClass}">
          <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
            <div style="font-size:48px;">${capInjuryRisk.icon}</div>
            <div style="flex:1;min-width:200px;">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Niveau de risque</div>
              <div style="font-size:28px;font-weight:700;color:${wordColor};">${wordLevel}</div>
            </div>
          </div>
        </div>
        <div class="alert ${alertClass} mt">
          <b>${lvl >= 3 ? '🚨 Action recommandée :' : lvl >= 2 ? '⚠️ Vigilance :' : '✅ Tout va bien :'}</b>
          ${actionPhrase}
        </div>
      </section>
    `;
  })() : `
    <section id="injury-risk" class="section pagebreakAvoid">
      <h2>🦵 Risque de Blessure CAP</h2>
      
      <div class="card ${capInjuryRisk.level >= 3 ? 'cardError' : capInjuryRisk.level >= 2 ? 'cardWarning' : 'cardSuccess'}">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div style="font-size:32px;margin-bottom:8px;">${capInjuryRisk.icon}</div>
            <div style="font-size:22px;font-weight:700;">${htmlEscape(capInjuryRisk.label)}</div>
            <div class="muted">Indice global: ${Math.round(capInjuryRisk.globalIndex * 100)}%</div>
          </div>
          <div style="text-align:center;">
            <div class="big ${capInjuryRisk.level >= 3 ? 'error' : capInjuryRisk.level >= 2 ? 'warning' : 'success'}">${capInjuryRisk.level}/4</div>
            <div class="muted">Niveau de risque</div>
          </div>
        </div>
      </div>
      
      <div class="card mt">
        <h3>📊 Décomposition des facteurs de risque</h3>
        <div class="grid3 mt">
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Contribution VLamax</div>
            <div class="progressBar mt" style="height:20px;">
              <div class="progressFill" style="width:${Math.min(100, Math.round(capInjuryRisk.factors.vlamaxContribution))}%;background:${capInjuryRisk.factors.vlamaxContribution > 50 ? 'var(--warning)' : 'var(--success)'}"></div>
            </div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${Math.round(capInjuryRisk.factors.vlamaxContribution)}%</div>
            <div class="muted" style="font-size:10px;">VLamax élevée = fatigue neuromusculaire</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Contribution TTE</div>
            <div class="progressBar mt" style="height:20px;">
              <div class="progressFill" style="width:${Math.min(100, Math.round(capInjuryRisk.factors.tteContribution))}%;background:${capInjuryRisk.factors.tteContribution > 50 ? 'var(--warning)' : 'var(--success)'}"></div>
            </div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${Math.round(capInjuryRisk.factors.tteContribution)}%</div>
            <div class="muted" style="font-size:10px;">TTE insuffisant = risque d'effondrement</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Contribution Charge</div>
            <div class="progressBar mt" style="height:20px;">
              <div class="progressFill" style="width:${Math.min(100, Math.round(capInjuryRisk.factors.chargeContribution))}%;background:${capInjuryRisk.factors.chargeContribution > 50 ? 'var(--error)' : 'var(--success)'}"></div>
            </div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${Math.round(capInjuryRisk.factors.chargeContribution)}%</div>
            <div class="muted" style="font-size:10px;">Charge excessive = surmenage</div>
          </div>
        </div>
      </div>
      
      <div class="card mt">
        <h3>💬 Analyse Staff</h3>
        <p style="line-height:1.6;">${htmlEscape(capInjuryRisk.staffAnalysis)}</p>
      </div>
      
      <div class="alert ${capInjuryRisk.level >= 3 ? 'alertError' : capInjuryRisk.level >= 2 ? 'alertWarning' : 'alertSuccess'} mt">
        <b>${capInjuryRisk.level >= 3 ? '🚨 Attention requise :' : capInjuryRisk.level >= 2 ? '⚠️ Vigilance recommandée :' : '✅ Risque maîtrisé :'}</b><br>
        ${capInjuryRisk.level >= 3 
          ? 'Risque de blessure élevé. Réduire la charge d\'entraînement et surveiller les signaux de fatigue.'
          : capInjuryRisk.level >= 2 
            ? 'Risque modéré. Surveiller les douleurs, respecter les jours de récupération.'
            : 'Le profil de risque est acceptable. Maintenir une progression graduelle.'
        }
      </div>
    </section>
  `) : '';


  // =============================================
  // F. ZONES D'ENTRAÎNEMENT Z1→Z7 (GRILLE OFFICIELLE)
  // =============================================
  // Préparer les refs pour le calcul des zones absolues
  const zoneRefs: AthleteZoneRefs = {
    fcMax: effectiveRefs.fcMax,
    vma: effectiveRefs.vma,
    ftp: effectiveRefs.ftp
  };
  
  // Générer la grille complète Z1→Z7 avec impacts métaboliques
  const zonesTableRows = TRAINING_ZONES.map(zone => {
    const absValues = computeZoneAbsoluteValues(zone, zoneRefs);
    
    // Format FC
    const fcDisplay = zone.fcMax 
      ? `${zone.fcMax.min}-${zone.fcMax.max}%` + (absValues.fcBpm ? ` → ${absValues.fcBpm.min}-${absValues.fcBpm.max} bpm` : '')
      : 'N/A';
    
    // Format VMA  
    const vmaDisplay = `${zone.vma.min}-${zone.vma.max}%` + (absValues.vmaKmh ? ` → ${absValues.vmaKmh.min.toFixed(1)}-${absValues.vmaKmh.max.toFixed(1)} km/h` : '');
    
    // Format FTP
    const ftpDisplay = `${zone.ftp.min}-${zone.ftp.max}%` + (absValues.ftpWatts ? ` → ${absValues.ftpWatts.min}-${absValues.ftpWatts.max} W` : '');
    
    // Impacts métaboliques formatés
    const vlamaxImpact = zone.impactMetabolique.vlamax;
    const tteImpact = zone.impactMetabolique.tte;
    const vo2Impact = zone.impactMetabolique.vo2max;
    
    // Couleur selon impact VLamax
    const vlamaxColor = vlamaxImpact.includes('↓') ? 'color:var(--success)' : vlamaxImpact.includes('↑') ? 'color:var(--warning)' : '';
    const tteColor = tteImpact.includes('↑') ? 'color:var(--success)' : tteImpact.includes('↓') ? 'color:var(--warning)' : '';
    const vo2Color = vo2Impact.includes('↑') ? 'color:var(--success)' : '';
    
    return `
      <tr>
        <td><span class="badge badgePrimary">${zone.id}</span></td>
        <td><b>${htmlEscape(zone.label)}</b><br><span class="muted" style="font-size:10px">${htmlEscape(zone.description)}</span></td>
        <td class="mono" style="font-size:10px">${fcDisplay}</td>
        <td class="mono" style="font-size:10px">${vmaDisplay}</td>
        <td class="mono" style="font-size:10px">${ftpDisplay}</td>
        <td style="text-align:center"><span style="${vlamaxColor};font-weight:600">${vlamaxImpact}</span></td>
        <td style="text-align:center"><span style="${tteColor};font-weight:600">${tteImpact}</span></td>
        <td style="text-align:center"><span style="${vo2Color};font-weight:600">${vo2Impact}</span></td>
        <td class="muted" style="font-size:10px">${htmlEscape(zone.positionSeuils)}</td>
      </tr>
    `;
  }).join('');
  
  const zonesHTML = `
    <section id="zones" class="section pagebreak">
      <h2>E. Grille d'entraînement Z1→Z7</h2>
      
      <div class="alert alertInfo mb">
        <b>🎯 Méthodologie Two For Coaching Lab</b><br>
        ${htmlEscape(ZONES_METHODOLOGY_NOTE)}
      </div>
      
      <div class="card">
        <h3>📊 Zones d'entraînement officielles</h3>
        <table>
          <thead>
            <tr>
              <th>Zone</th>
              <th style="min-width:150px">Label & Objectif</th>
              <th>%FCmax</th>
              <th>%VMA (CAP)</th>
              <th>%FTP (Vélo)</th>
              <th style="text-align:center">VLamax</th>
              <th style="text-align:center">TTE</th>
              <th style="text-align:center">VO2</th>
              <th>Position Seuils</th>
            </tr>
          </thead>
          <tbody>
            ${zonesTableRows}
          </tbody>
        </table>
      </div>
      
      <div class="grid2 mt">
        <div class="card">
          <h3>📖 Légende impacts métaboliques</h3>
          <table style="font-size:11px">
            <tbody>
              <tr><td><b style="color:var(--success)">↓↓</b></td><td>Diminution forte</td></tr>
              <tr><td><b style="color:var(--success)">↓</b></td><td>Diminution modérée</td></tr>
              <tr><td><b>neutre</b></td><td>Pas d'impact significatif</td></tr>
              <tr><td><b style="color:var(--warning)">↑</b></td><td>Augmentation modérée</td></tr>
              <tr><td><b style="color:var(--error)">↑↑</b></td><td>Augmentation forte</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <h3>⚠️ Avertissements staff</h3>
          <ul class="muted" style="font-size:11px">
            <li><b>Z4b/Z5 prolongée</b> = charge glycolytique élevée. Limiter si objectif ↓ VLamax.</li>
            <li><b>Z6</b> = stimulus VLamax secondaire. Usage modéré pour profils endurance.</li>
            <li><b>Z7</b> = ↑↑ VLamax. Réserver aux phases de puissance/vitesse pure.</li>
          </ul>
        </div>
      </div>
      
      <div class="card cardHighlight mt">
        <h3>🧭 Recommandation selon votre profil</h3>
        <p class="muted" style="line-height:1.6">
          ${vlamax.value !== null && vlamax.value > 0.40 
            ? `<b style="color:var(--warning)">Profil glycolytique (VLamax: ${fmt(vlamax.value, 2)})</b> → Privilégier les zones Z2 et Z4a pour ↓ VLamax. Limiter Z6/Z7.`
            : vlamax.value !== null && vlamax.value < 0.30
              ? `<b style="color:var(--success)">Profil endurant (VLamax: ${fmt(vlamax.value, 2)})</b> → Zones Z4a/Z5 pour ↑ TTE. Possibilité d'inclure du Z6 si besoin de relance VO2max.`
              : `<b>Profil équilibré</b> → Répartition standard avec focus sur les zones correspondant à votre objectif (${getObjectifLabel(athlete.goal)}).`
          }
          <br><br>
          ${tte.tte_min < (tte.target ?? 50) 
            ? `<b style="color:var(--warning)">TTE insuffisant (${tte.tte_min} min vs cible ${tte.target ?? 50} min)</b> → Prioriser Z4a et Z5 pour développer l'endurance au seuil.`
            : `<b style="color:var(--success)">TTE satisfaisant (${tte.tte_min} min)</b> → Maintenir avec du travail Z2/Z3 de fond.`
          }
        </p>
      </div>
    </section>
  `;

  // =============================================
  // G. HISTORIQUE SNAPSHOTS
  // =============================================
  const sortedSnapshots = [...snapshotHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const last2 = sortedSnapshots.slice(0, 2);
  
  let evolutionHTML = "";
  if (last2.length >= 2) {
    const [current, previous] = last2;
    const deltaFtp = current.ftp && previous.ftp ? current.ftp - previous.ftp : null;
    const deltaPoids = current.weight_kg && previous.weight_kg ? current.weight_kg - previous.weight_kg : null;
    const currentFtpKg = current.ftp && current.weight_kg ? current.ftp / current.weight_kg : null;
    const previousFtpKg = previous.ftp && previous.weight_kg ? previous.ftp / previous.weight_kg : null;
    const deltaFtpKg = currentFtpKg && previousFtpKg ? currentFtpKg - previousFtpKg : null;
    
    evolutionHTML = `
      <div class="card mt">
        <h3>📈 Évolution (2 derniers snapshots)</h3>
        <div class="grid4">
          <div>
            <div class="muted">Δ FTP</div>
            <div class="${deltaFtp && deltaFtp > 0 ? 'success' : deltaFtp && deltaFtp < 0 ? 'error' : ''}">${deltaFtp ? (deltaFtp > 0 ? '+' : '') + deltaFtp + ' W' : '—'}</div>
          </div>
          <div>
            <div class="muted">Δ Poids</div>
            <div class="${deltaPoids && deltaPoids < 0 ? 'success' : deltaPoids && deltaPoids > 0 ? 'warning' : ''}">${deltaPoids ? (deltaPoids > 0 ? '+' : '') + fmt(deltaPoids, 1) + ' kg' : '—'}</div>
          </div>
          <div>
            <div class="muted">Δ FTP/kg</div>
            <div class="${deltaFtpKg && deltaFtpKg > 0 ? 'success' : deltaFtpKg && deltaFtpKg < 0 ? 'error' : ''}">${deltaFtpKg ? (deltaFtpKg > 0 ? '+' : '') + fmt(deltaFtpKg, 2) + ' W/kg' : '—'}</div>
          </div>
          <div>
            <div class="muted">Période</div>
            <div class="muted">${dtStr(previous.date)} → ${dtStr(current.date)}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    evolutionHTML = '<div class="alert alertInfo mt">Évolution non calculable — moins de 2 snapshots disponibles.</div>';
  }

  const snapshotsHTML = `
    <section id="historique-snapshots" class="section">
      <h2>F. Historique snapshots</h2>
      <div class="card">
        <table>
          <thead>
            <tr><th>Date</th><th>Cycle</th><th>FTP</th><th>Poids</th><th>FTP/kg</th><th>TSS 7d</th><th>VO2max</th><th>VMA</th><th>VLamax</th><th>Source</th></tr>
          </thead>
          <tbody>
            ${sortedSnapshots.length > 0
              ? sortedSnapshots.slice(0, 15).map(s => {
                  const snapFtpKg = s.ftp && s.weight_kg ? (s.ftp / s.weight_kg).toFixed(2) : "—";
                  return `<tr>
                    <td>${htmlEscape(dtStr(s.date))}</td>
                    <td>${htmlEscape(s.cycle_tag || "—")}</td>
                    <td>${s.ftp ?? "—"}</td>
                    <td>${s.weight_kg ? fmt(s.weight_kg, 1) : "—"}</td>
                    <td>${snapFtpKg}</td>
                    <td>${s.tss_7d ?? "—"}</td>
                    <td>${s.vo2max ? fmt(s.vo2max, 1) : "—"}</td>
                    <td>${s.vma ? fmt(s.vma, 1) : "—"}</td>
                    <td>${s.vlamax ? fmt(s.vlamax, 2) : "—"}</td>
                    <td class="muted">${htmlEscape(s.source || "")}</td>
                  </tr>`;
                }).join("")
              : '<tr><td colspan="10" class="muted">Aucun snapshot enregistré</td></tr>'}
          </tbody>
        </table>
      </div>
      ${evolutionHTML}
    </section>
  `;

  // =============================================
  // H. HISTORIQUE TESTS
  // =============================================
  const sortedTests = [...tests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const testsHTML = `
    <section id="historique-tests" class="section pagebreak">
      <h2>G. Historique tests</h2>
      <div class="card">
        <table>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Nom</th><th>VLamax</th><th>Fiabilité</th><th>Note coach</th></tr>
          </thead>
          <tbody>
            ${sortedTests.length > 0
              ? sortedTests.slice(0, 15).map(t => `
                  <tr>
                    <td>${htmlEscape(dtStr(t.date))}</td>
                    <td>${htmlEscape(t.type || "—")}</td>
                    <td>${htmlEscape(t.name || "—")}</td>
                    <td>${t.vlamax ? fmt(t.vlamax, 2) : "—"}</td>
                    <td>${t.reliability ? fmtPct(t.reliability) : "—"}</td>
                    <td class="muted">${htmlEscape(t.note || "—")}</td>
                  </tr>
                `).join("")
              : '<tr><td colspan="6" class="muted">Aucun test enregistré</td></tr>'}
          </tbody>
        </table>
      </div>
      ${sortedTests.length === 0 ? '<div class="alert alertInfo">💡 Recommandation: faire 2 tests VLamax fiables à 7-10 jours d\'intervalle pour améliorer la précision.</div>' : ''}
    </section>
  `;

  // =============================================
  // SECTION TESTS & CALIBRATION TFCL (NEW)
  // =============================================
  const testsCalibrationSection = generateTestCalibrationSection(tests, athlete.id, null);
  
  const testsCalibrationHTML = `
    <section id="tests-calibration" class="section pagebreak">
      <h2>🧪 Tests Réalisés & Calibration TFCL</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Philosophie TFCL</b> : Les tests terrain augmentent la robustesse des décisions en réduisant l'incertitude du modèle.
        Ils ne transforment pas une estimation en mesure médicale, mais améliorent la cohérence physiologique.
      </div>
      
      ${testsCalibrationSection.testsRealises.length > 0 ? `
        <div class="card">
          <h3>📊 Tests réalisés</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type de test</th>
                <th>Résultat brut</th>
                <th>Validité</th>
                <th>Qualité protocole</th>
                <th>Confiance</th>
              </tr>
            </thead>
            <tbody>
              ${testsCalibrationSection.testsRealises.map(test => `
                <tr>
                  <td>${test.date}</td>
                  <td><b>${htmlEscape(test.type)}</b></td>
                  <td class="mono">${htmlEscape(test.resultBrut)}</td>
                  <td>
                    <span class="badge ${test.validite === 'OK' ? 'badgeSuccess' : test.validite === 'WARNING' ? 'badgeWarning' : 'badgeError'}">
                      ${test.validite === 'OK' ? '✓ OK' : test.validite === 'WARNING' ? '⚠ À vérifier' : '✗ Invalide'}
                    </span>
                  </td>
                  <td>
                    <div style="display:flex;gap:2px;">
                      ${Array.from({ length: 5 }, (_, i) => 
                        `<div style="width:8px;height:16px;border-radius:2px;background:${i < test.qualiteProtocole ? 'var(--primary)' : 'var(--soft)'}"></div>`
                      ).join('')}
                    </div>
                  </td>
                  <td><span class="badge ${test.confidence >= 0.7 ? 'badgeSuccess' : test.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${Math.round(test.confidence * 100)}%</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="card" style="text-align:center;padding:32px;">
          <div style="font-size:40px;margin-bottom:12px;">🧪</div>
          <h3>Aucun test TFCL réalisé</h3>
          <p class="muted">Les tests terrain permettent de calibrer les modèles physiologiques et d'améliorer la confiance des estimations.</p>
          <div class="alert alertInfo mt">
            💡 <b>Recommandation</b> : Planifier une semaine de tests TFCL (Sprint 15s, TTE, MAP) pour calibrer le profil.
          </div>
        </div>
      `}
      
      ${testsCalibrationSection.impactCalibration.length > 0 ? `
        <div class="card mt">
          <h3>⚖️ Impact de la calibration AVANT / APRÈS</h3>
          <p class="muted mb">Comparaison des valeurs modélisées (avant tests) et calibrées (après tests).</p>
          
          <table>
            <thead>
              <tr>
                <th>Métrique</th>
                <th>AVANT (modèle)</th>
                <th>APRÈS (calibré)</th>
                <th>Delta</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              ${testsCalibrationSection.impactCalibration.map(item => {
                const beforeVal = item.before.value !== null ? (item.metric === 'VLamax' ? item.before.value.toFixed(2) + ' mmol/L/s' : item.metric === 'TTE' ? item.before.value.toFixed(0) + ' min' : item.before.value.toFixed(0) + ' W') : '—';
                const afterVal = item.after.value !== null ? (item.metric === 'VLamax' ? item.after.value.toFixed(2) + ' mmol/L/s' : item.metric === 'TTE' ? item.after.value.toFixed(0) + ' min' : item.after.value.toFixed(0) + ' W') : '—';
                const deltaSign = item.delta !== null && item.delta >= 0 ? '+' : '';
                const deltaVal = item.delta !== null ? deltaSign + (item.metric === 'VLamax' ? item.delta.toFixed(2) : item.delta.toFixed(0)) : '—';
                const impactColor = item.impact.quality === 'high' ? 'var(--success)' : item.impact.quality === 'medium' ? 'var(--warning)' : 'var(--muted)';
                
                return `
                  <tr>
                    <td><b>${item.metric}</b></td>
                    <td class="mono">
                      ${beforeVal}
                      <br><span class="muted" style="font-size:10px;">Conf: ${Math.round(item.before.confidence * 100)}%</span>
                    </td>
                    <td class="mono">
                      <b>${afterVal}</b>
                      <br><span class="muted" style="font-size:10px;">Conf: ${Math.round(item.after.confidence * 100)}%</span>
                    </td>
                    <td style="color:${item.delta !== null && item.delta !== 0 ? (item.metric === 'VLamax' && item.delta < 0 ? 'var(--success)' : item.metric === 'VLamax' && item.delta > 0 ? 'var(--warning)' : 'var(--foreground)') : 'var(--muted)'}">
                      <b>${deltaVal}</b>
                    </td>
                    <td>
                      <span style="color:${impactColor};font-weight:600;">
                        ${item.impact.message}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Visual Before/After comparison -->
        <div class="grid2 mt">
          <div class="card" style="background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);border:1px solid #e2e8f0;">
            <h4 style="display:flex;align-items:center;gap:8px;">
              <span style="background:#64748b;color:white;padding:4px 8px;border-radius:6px;font-size:11px;">AVANT</span>
              Modèle seul
            </h4>
            <div class="muted" style="font-size:12px;margin-top:8px;">
              Estimations basées sur les données de base du snapshot (FTP, poids, charge) sans validation terrain.
            </div>
            <div style="margin-top:12px;">
              ${testsCalibrationSection.impactCalibration.map(item => `
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--soft);">
                  <span class="muted">${item.metric}</span>
                  <span class="mono">${item.before.value !== null ? (item.metric === 'VLamax' ? item.before.value.toFixed(2) : item.before.value.toFixed(0)) : '—'}</span>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="card" style="background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);border:1px solid #86efac;">
            <h4 style="display:flex;align-items:center;gap:8px;">
              <span style="background:#16a34a;color:white;padding:4px 8px;border-radius:6px;font-size:11px;">APRÈS</span>
              Calibré par tests
            </h4>
            <div class="muted" style="font-size:12px;margin-top:8px;">
              Valeurs fusionnées avec les résultats des tests TFCL. Confiance renforcée.
            </div>
            <div style="margin-top:12px;">
              ${testsCalibrationSection.impactCalibration.map(item => `
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(22,163,74,0.2);">
                  <span class="muted">${item.metric}</span>
                  <span class="mono" style="font-weight:600;">${item.after.value !== null ? (item.metric === 'VLamax' ? item.after.value.toFixed(2) : item.after.value.toFixed(0)) : '—'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}
      
      <!-- Confidence globale -->
      <div class="card mt" style="text-align:center;padding:24px;">
        <div class="muted" style="font-size:11px;text-transform:uppercase;">Confiance globale du modèle calibré</div>
        <div style="font-size:48px;font-weight:800;color:${testsCalibrationSection.globalConfidence >= 0.8 ? 'var(--success)' : testsCalibrationSection.globalConfidence >= 0.6 ? 'var(--primary)' : 'var(--warning)'};">
          ${Math.round(testsCalibrationSection.globalConfidence * 100)}%
        </div>
        <div style="font-size:14px;color:${testsCalibrationSection.globalConfidence >= 0.8 ? 'var(--success)' : testsCalibrationSection.globalConfidence >= 0.6 ? 'var(--primary)' : 'var(--warning)'};">
          ${testsCalibrationSection.globalConfidence >= 0.8 ? 'Cohérence élevée' : testsCalibrationSection.globalConfidence >= 0.6 ? 'Cohérence modérée' : 'Lecture prudente'}
        </div>
      </div>
      
      <!-- Notes de calibration -->
      ${testsCalibrationSection.notes.length > 0 ? `
        <div class="card mt">
          <h4>📝 Notes de calibration</h4>
          <ul class="muted">
            ${testsCalibrationSection.notes.map(note => `<li>${htmlEscape(note)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <!-- Avertissement -->
      <div class="alert alertWarning mt">
        <b>⚠️ Avertissement</b><br>
        ${htmlEscape(testsCalibrationSection.avertissement)}
        <br><br>
        <b>Important :</b> Les valeurs calibrées restent dépendantes du protocole et du contexte (fatigue, nutrition, environnement).
        Un test labo est recommandé si une décision critique dépend d'une précision maximale.
      </div>
    </section>
  `;

  // =============================================
  // H.5bis CALIBRATION EVIDENCE SUMMARY SECTION
  // =============================================
  const buildCalibrationEvidenceHTML = (): string => {
    // ✅ Use real Cloud calibration evidence data
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - CALIBRATION_WINDOW_DAYS);
    
    // Filter evidences within the calibration window
    const windowEvidences = calibrationEvidences.filter(e => {
      const evidenceDate = new Date(e.date);
      return evidenceDate >= windowStart && evidenceDate <= now;
    });
    
    const evidenceCount = windowEvidences.length;
    const highQualityCount = windowEvidences.filter(e => e.protocol_quality >= 4).length;
    const validCount = windowEvidences.filter(e => e.validity === "OK").length;
    const checkCount = windowEvidences.filter(e => e.validity === "CHECK").length;
    const invalidCount = windowEvidences.filter(e => e.validity === "INVALID").length;
    
    // Compute average confidence weighted by evidence weight
    const avgConfidence = evidenceCount > 0 
      ? windowEvidences.reduce((sum, e) => sum + computeEvidenceWeight(e), 0) / evidenceCount 
      : 0;
    
    // Evidence type labels for display
    const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
      SPRINT_15S: "Sprint 15s",
      P30: "Puissance 30s",
      P60: "Puissance 60s",
      MAP: "MAP/PMA",
      TTE_OBS: "TTE Observé",
      PACED_RACE: "Course Paced",
      DRIFT: "Dérive Cardiaque",
      ECONOMY: "Économie de course",
    };
    
    // Evidence type icons for display
    const EVIDENCE_TYPE_ICONS: Record<EvidenceType, string> = {
      SPRINT_15S: "⚡",
      P30: "📊",
      P60: "📊",
      MAP: "🎯",
      TTE_OBS: "⏱️",
      PACED_RACE: "🏁",
      DRIFT: "📉",
      ECONOMY: "💨",
    };
    
    // Source type labels
    const SOURCE_TYPE_LABELS: Record<string, string> = {
      TEST_PROTOCOL: "Test Protocole",
      FIT_IMPORT: "Import FIT",
      POST_RACE: "Post-Course",
    };
    
    return `
      <section id="calibration-evidence" class="section pagebreak">
        <h2>🔬 Calibration Evidence Summary</h2>
        
        <div class="alert alertInfo mb">
          <b>📋 Philosophie TFCL™</b> : La calibration continue utilise les preuves terrain 
          pour affiner le modèle métabolique. Chaque preuve est pondérée selon sa qualité de protocole, 
          sa validité et sa récence (fenêtre glissante de ${CALIBRATION_WINDOW_DAYS} jours).
        </div>
        
        <!-- KPIs Evidence -->
        <div class="grid4 mb">
          <div class="card" style="text-align:center;padding:16px;">
            <div class="muted" style="font-size:11px;text-transform:uppercase;">Preuves terrain</div>
            <div style="font-size:36px;font-weight:800;color:var(--primary);">${evidenceCount}</div>
            <div class="muted" style="font-size:11px;">dans fenêtre ${CALIBRATION_WINDOW_DAYS}j</div>
          </div>
          <div class="card" style="text-align:center;padding:16px;">
            <div class="muted" style="font-size:11px;text-transform:uppercase;">Haute qualité</div>
            <div style="font-size:36px;font-weight:800;color:${highQualityCount > 0 ? 'var(--success)' : 'var(--muted)'};">${highQualityCount}</div>
            <div class="muted" style="font-size:11px;">protocole 4-5★</div>
          </div>
          <div class="card" style="text-align:center;padding:16px;">
            <div class="muted" style="font-size:11px;text-transform:uppercase;">Validité</div>
            <div style="font-size:24px;font-weight:800;">
              <span style="color:var(--success);">${validCount}✓</span>
              ${checkCount > 0 ? `<span style="color:var(--warning);margin-left:4px;">${checkCount}⚠</span>` : ''}
              ${invalidCount > 0 ? `<span style="color:var(--error);margin-left:4px;">${invalidCount}✗</span>` : ''}
            </div>
            <div class="muted" style="font-size:11px;">OK / Check / Invalid</div>
          </div>
          <div class="card" style="text-align:center;padding:16px;">
            <div class="muted" style="font-size:11px;text-transform:uppercase;">Poids moyen</div>
            <div style="font-size:36px;font-weight:800;color:${avgConfidence >= 0.6 ? 'var(--success)' : avgConfidence >= 0.4 ? 'var(--warning)' : 'var(--error)'};">${Math.round(avgConfidence * 100)}%</div>
            <div class="muted" style="font-size:11px;">pondération calibration</div>
          </div>
        </div>
        
        ${evidenceCount > 0 ? `
          <!-- Timeline des preuves Cloud -->
          <div class="card">
            <h3>📈 Timeline des preuves terrain (Cloud)</h3>
            <p class="muted mb">Preuves enregistrées et utilisées pour la calibration continue VLamax.</p>
            
            <div style="position:relative;padding-left:24px;border-left:2px solid var(--soft);">
              ${windowEvidences.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((evidence, idx) => {
                const validityIcon = evidence.validity === "OK" ? "✅" : evidence.validity === "CHECK" ? "⚠️" : "❌";
                const qualityStars = "★".repeat(evidence.protocol_quality) + "☆".repeat(5 - evidence.protocol_quality);
                const weight = computeEvidenceWeight(evidence);
                const vlamax = evidence.raw_values?.vlamax_estimated as number | undefined;
                const evidenceDate = new Date(evidence.date);
                const daysAgo = Math.floor((now.getTime() - evidenceDate.getTime()) / (1000 * 60 * 60 * 24));
                
                return `
                  <div style="position:relative;padding:12px 0;${idx < windowEvidences.length - 1 ? 'border-bottom:1px dashed var(--soft);' : ''}">
                    <div style="position:absolute;left:-32px;top:12px;width:16px;height:16px;border-radius:50%;background:${evidence.validity === "OK" ? 'var(--success)' : evidence.validity === "CHECK" ? 'var(--warning)' : 'var(--error)'};display:flex;align-items:center;justify-content:center;">
                      <span style="font-size:10px;color:white;">•</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                      <div>
                        <div style="font-weight:600;font-size:13px;">
                          ${EVIDENCE_TYPE_ICONS[evidence.evidence_type] || "📋"} ${EVIDENCE_TYPE_LABELS[evidence.evidence_type] || evidence.evidence_type}
                        </div>
                        <div class="muted" style="font-size:11px;">
                          ${evidenceDate.toLocaleDateString("fr-FR")} 
                          <span style="color:var(--primary);font-weight:500;">(il y a ${daysAgo}j)</span>
                          • ${SOURCE_TYPE_LABELS[evidence.source_type] || evidence.source_type}
                        </div>
                        ${vlamax !== undefined ? `
                          <div style="font-size:11px;margin-top:4px;font-family:monospace;">
                            VLamax estimé: <b>${vlamax.toFixed(2)} mmol/L/s</b>
                          </div>
                        ` : ''}
                        ${evidence.notes ? `<div class="muted" style="font-size:10px;font-style:italic;margin-top:4px;">"${htmlEscape(evidence.notes)}"</div>` : ''}
                      </div>
                      <div style="text-align:right;">
                        <div style="font-size:12px;">${validityIcon} ${qualityStars}</div>
                        <div style="font-size:11px;margin-top:4px;">
                          Poids: <b style="color:${weight >= 0.6 ? 'var(--success)' : weight >= 0.4 ? 'var(--warning)' : 'var(--muted)'};">${Math.round(weight * 100)}%</b>
                        </div>
                        ${evidence.fatigue_index !== null && evidence.fatigue_index !== undefined ? `
                          <div class="muted" style="font-size:10px;">Fatigue: ${evidence.fatigue_index}%</div>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
          <!-- Légende des types de preuves -->
          <div class="card mt">
            <h3>🏷️ Types de preuves acceptées</h3>
            <div class="grid3 mt">
              <div style="padding:12px;background:var(--soft);border-radius:8px;">
                <div style="font-weight:600;color:var(--primary);">⚡ Sprint 15s</div>
                <div class="muted" style="font-size:11px;">Test de puissance maximale courte durée. Poids base: 85%</div>
              </div>
              <div style="padding:12px;background:var(--soft);border-radius:8px;">
                <div style="font-weight:600;color:var(--primary);">📊 P30 / P60</div>
                <div class="muted" style="font-size:11px;">Puissance soutenue 30-60 secondes. Poids base: 75-80%</div>
              </div>
              <div style="padding:12px;background:var(--soft);border-radius:8px;">
                <div style="font-weight:600;color:var(--primary);">🎯 MAP</div>
                <div class="muted" style="font-size:11px;">Puissance Maximale Aérobie. Poids base: 70%</div>
              </div>
              <div style="padding:12px;background:var(--soft);border-radius:8px;">
                <div style="font-weight:600;color:var(--primary);">⏱️ TTE Observé</div>
                <div class="muted" style="font-size:11px;">Time to Exhaustion mesuré. Poids base: 65%</div>
              </div>
              <div style="padding:12px;background:var(--soft);border-radius:8px;">
                <div style="font-weight:600;color:var(--primary);">🏁 Course Paced</div>
                <div class="muted" style="font-size:11px;">Performance en compétition. Poids base: 50%</div>
              </div>
              <div style="padding:12px;background:var(--soft);border-radius:8px;">
                <div style="font-weight:600;color:var(--primary);">📉 Drift / 💨 Économie</div>
                <div class="muted" style="font-size:11px;">Analyse de dérive et efficacité. Poids base: 35-40%</div>
              </div>
            </div>
          </div>
        ` : `
          <div class="card" style="text-align:center;padding:32px;">
            <div style="font-size:48px;margin-bottom:16px;">🔍</div>
            <h3>Aucune preuve terrain enregistrée</h3>
            <p class="muted">Ajoutez des tests, imports FIT ou analyses post-course pour calibrer le modèle.</p>
            <p class="muted" style="font-size:11px;margin-top:8px;">
              Les preuves terrain permettent d'affiner la VLamax modélisée avec des données réelles.
            </p>
          </div>
        `}
        
        <!-- Formule de pondération -->
        <div class="card mt">
          <h3>📐 Formule de pondération TFCL™</h3>
          <div style="background:var(--soft);padding:16px;border-radius:8px;font-family:monospace;font-size:12px;">
            <div style="margin-bottom:8px;"><b>Poids final = Base × Qualité × Décroissance temporelle</b></div>
            <div class="muted">
              • <b>Base</b>: poids intrinsèque du type de test (35-85%)<br>
              • <b>Qualité</b>: multiplicateur selon protocole (★1-5 → 0.5-1.0)<br>
              • <b>Décroissance</b>: exp(-âge_jours / ${CALIBRATION_WINDOW_DAYS}) sur fenêtre glissante<br>
              • <b>Validité</b>: OK=100%, CHECK=50%, INVALID=0%
            </div>
          </div>
        </div>
        
        <div class="alert alertWarning mt">
          <b>⚠️ Rappel méthodologique</b> : Les preuves terrain augmentent la robustesse des décisions 
          en réduisant l'incertitude du modèle. Elles ne transforment pas une estimation en mesure médicale, 
          mais améliorent la cohérence physiologique du profil calibré.
        </div>
      </section>
    `;
  };
  
  const calibrationEvidenceHTML = buildCalibrationEvidenceHTML();

  // =============================================
  // H.5 FIT IMPORTS SECTION (Tests terrain)
  // =============================================
  const fitImportTests = tests.filter(t =>
    t.type === 'FIT_IMPORT' || 
    (t.raw && typeof t.raw === 'object' && (t.raw as Record<string, unknown>).source === 'FIT_IMPORT')
  );
  
  // Helper to build FIT test rows
  const buildFitTestRows = (): string => {
    return fitImportTests.map(t => {
      const raw = t.raw as Record<string, unknown> | null;
      const rawMetrics = raw?.metrics as Record<string, unknown> | undefined;
      const bestEfforts = (raw?.bestEfforts || rawMetrics?.bestEfforts || {}) as Record<string, number>;
      const protocolQuality = (raw?.protocolQuality || rawMetrics?.protocolQuality || 3) as number;
      const confidence = t.reliability ?? 0.7;
      
      // Build metrics summary
      const metricsLines: string[] = [];
      if (bestEfforts.p5s) metricsLines.push('P5s: ' + bestEfforts.p5s + 'W');
      if (bestEfforts.p15s) metricsLines.push('P15s: ' + bestEfforts.p15s + 'W');
      if (bestEfforts.p30s) metricsLines.push('P30s: ' + bestEfforts.p30s + 'W');
      if (bestEfforts.p60s) metricsLines.push('P60s: ' + bestEfforts.p60s + 'W');
      if (bestEfforts.p5min) metricsLines.push('P5min: ' + bestEfforts.p5min + 'W');
      if (bestEfforts.p20min) metricsLines.push('P20min: ' + bestEfforts.p20min + 'W');
      const ftpEstimated = rawMetrics?.ftpEstimated || raw?.ftpEstimated;
      if (ftpEstimated) metricsLines.push('FTP: ' + ftpEstimated + 'W');
      const tteObserved = rawMetrics?.tteObservedMin || raw?.tteObservedMin;
      if (tteObserved) metricsLines.push('TTE: ' + tteObserved + 'min');
      const driftPct = rawMetrics?.driftPct || raw?.driftPct;
      if (driftPct !== undefined && typeof driftPct === 'number') metricsLines.push('Drift: ' + driftPct.toFixed(1) + '%');
      
      const metricsDisplay = metricsLines.length > 0 ? metricsLines.join('<br>') : '—';
      
      const qualityBars = Array.from({ length: 5 }, (_, i) => 
        '<div style="width:8px;height:16px;border-radius:2px;background:' + (i < protocolQuality ? 'var(--primary)' : 'var(--soft)') + '"></div>'
      ).join('');
      
      const badgeClass = confidence >= 0.7 ? 'badgeSuccess' : confidence >= 0.4 ? 'badgeWarning' : 'badgeError';
      
      return '<tr>' +
        '<td>' + htmlEscape(dtStr(t.date)) + '</td>' +
        '<td><b>' + htmlEscape(t.name || t.type) + '</b><br><span class="muted" style="font-size:11px;">Source: FIT import</span></td>' +
        '<td class="mono" style="font-size:12px;">' + metricsDisplay + '</td>' +
        '<td><div style="display:flex;gap:2px;">' + qualityBars + '</div><span class="muted" style="font-size:11px;">' + protocolQuality + '/5</span></td>' +
        '<td><span class="badge ' + badgeClass + '">' + Math.round(confidence * 100) + '%</span></td>' +
        '</tr>';
    }).join('');
  };
  
  // Helper to build aggregated best efforts
  const buildAggregatedBestEfforts = (): string => {
    const allEfforts: Record<string, number> = {};
    fitImportTests.forEach(t => {
      const raw = t.raw as Record<string, unknown> | null;
      const rawMetrics = raw?.metrics as Record<string, unknown> | undefined;
      const bestEfforts = (raw?.bestEfforts || rawMetrics?.bestEfforts || {}) as Record<string, number>;
      Object.entries(bestEfforts).forEach(([key, val]) => {
        if (typeof val === 'number' && (!allEfforts[key] || val > allEfforts[key])) {
          allEfforts[key] = val;
        }
      });
    });
    
    const effortLabels: Record<string, string> = {
      p5s: '5 sec', p15s: '15 sec', p30s: '30 sec', p60s: '60 sec',
      p5min: '5 min', p12min: '12 min', p20min: '20 min', p40min: '40 min', p60min: '60 min',
    };
    
    const effortsToShow = ['p5s', 'p15s', 'p30s', 'p60s', 'p5min', 'p20min'];
    return effortsToShow.map(key => 
      '<div style="text-align:center;padding:12px;background:var(--soft);border-radius:8px;">' +
      '<div class="muted" style="font-size:11px;text-transform:uppercase;">' + (effortLabels[key] || key) + '</div>' +
      '<div style="font-size:24px;font-weight:700;color:var(--primary);">' + (allEfforts[key] ? allEfforts[key] + 'W' : '—') + '</div>' +
      '</div>'
    ).join('');
  };
  
  const fitImportsHTML = fitImportTests.length > 0 ? `
    <section id="fit-imports" class="section pagebreak">
      <h2>📁 Tests Observés (Import FIT)</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Philosophie terrain</b> : Les valeurs issues de fichiers FIT sont des observations terrain. 
        Leur interprétation dépend du protocole, des conditions de l'exercice et de la calibration des capteurs.
      </div>
      
      <div class="card">
        <h3>🏃 Séances importées (${fitImportTests.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type de test</th>
              <th>Métriques clés</th>
              <th>Qualité protocole</th>
              <th>Confiance</th>
            </tr>
          </thead>
          <tbody>
            ${buildFitTestRows()}
          </tbody>
        </table>
      </div>
      
      <div class="card mt">
        <h3>⚡ Synthèse Best Efforts (tous imports)</h3>
        <p class="muted mb">Meilleurs segments de puissance observés sur l'ensemble des fichiers FIT importés.</p>
        <div class="grid4">
          ${buildAggregatedBestEfforts()}
        </div>
      </div>
      
      <div class="card mt">
        <h3>📈 Impact sur le profil de référence</h3>
        <div class="muted mb">Ces tests observés peuvent alimenter les champs suivants du profil physiologique :</div>
        <div class="grid2">
          <div style="padding:12px;background:var(--soft);border-radius:8px;">
            <b>Puissance courte durée</b>
            <ul class="muted" style="font-size:12px;margin-top:6px;">
              <li>P30s (p30s_w) → VLamax calibration</li>
              <li>P60s (p60s_w) → capacité glycolytique</li>
            </ul>
          </div>
          <div style="padding:12px;background:var(--soft);border-radius:8px;">
            <b>Capacité aérobie</b>
            <ul class="muted" style="font-size:12px;margin-top:6px;">
              <li>P5min (MAP proxy)</li>
              <li>P20min → FTP estimation</li>
              <li>TTE observé → durabilité</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="alert alertWarning mt">
        <b>⚠️ Limites des observations terrain</b><br>
        Les valeurs issues du FIT dépendent de la qualité du protocole (échauffement, pacing, conditions).
        Elles ne remplacent pas un test en laboratoire mais permettent de valider et affiner les estimations du modèle.
      </div>
    </section>
  ` : `
    <section id="fit-imports" class="section pagebreakAvoid">
      <h2>📁 Tests Observés (Import FIT)</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Philosophie terrain</b> : Les valeurs issues de fichiers FIT sont des observations terrain.
      </div>
      
      <div class="card" style="text-align:center;padding:32px;">
        <div style="font-size:40px;margin-bottom:12px;">📁</div>
        <h3>Aucun fichier FIT importé</h3>
        <p class="muted">L'import de fichiers FIT permet d'observer les métriques terrain (best efforts, FTP, TTE, drift) et d'améliorer la calibration du profil.</p>
        <div class="alert alertInfo mt">
          💡 <b>Conseil</b> : Importez des séances tests (FTP 20min, sprints, Z2 long) pour valider les estimations du modèle.
        </div>
      </div>
    </section>
  `;

  // =============================================
  // I. ÉTAT DE FATIGUE (Snapshot-centric)
  // =============================================
  const fatigueStateLabelMap: Record<string, { label: string; emoji: string; color: string }> = {
    fresh:    { label: "Frais — bien récupéré", emoji: "🟢", color: "var(--success)" },
    ok:       { label: "Normal — état standard", emoji: "🟡", color: "var(--warning)" },
    fatigued: { label: "Fatigué — récupération partielle", emoji: "🟠", color: "#d97706" },
    high:     { label: "Très fatigué — surcharge", emoji: "🔴", color: "var(--error)" },
    injured:  { label: "Blessé / indisponible", emoji: "🚑", color: "var(--error)" },
  };
  const currentFatigueState = effectiveSnapshot?.fatigue_state || "ok";
  const fatigueDisplay = fatigueStateLabelMap[currentFatigueState] ?? fatigueStateLabelMap.ok;
  
  const checkinsHTML = effectiveSnapshot ? `
    <section id="checkins" class="section pagebreakAvoid">
      <h2>H. État de Fatigue — Snapshot</h2>
      <div class="card">
        <h3>Snapshot actif : ${dtStr(effectiveSnapshot.date)}</h3>
        <div style="display:flex;align-items:center;gap:12px;margin-top:12px;">
          <span style="font-size:28px;">${fatigueDisplay.emoji}</span>
          <div>
            <div style="font-size:16px;font-weight:700;color:${fatigueDisplay.color}">${htmlEscape(fatigueDisplay.label)}</div>
            <div class="muted" style="font-size:11px;margin-top:4px;">État déclaré : <code>${currentFatigueState}</code></div>
          </div>
        </div>
        ${effectiveSnapshot.coach_notes ? `<div class="mt muted">Notes coach : ${htmlEscape(effectiveSnapshot.coach_notes)}</div>` : ''}
      </div>
    </section>
  ` : '';

  // =============================================
  // I. COMPRENDRE MES SCORES (PÉDAGOGIE)
  // =============================================
  const comprendreHTML = `
    <section id="comprendre" class="section">
      <h2>I. Comprendre mes scores</h2>
      <p class="muted mb">Guide complet pour interpréter vos métriques physiologiques et optimiser votre préparation.</p>
      
      <!-- VLamax -->
      <div class="card pagebreakAvoid">
        <h3>⚡ VLamax – Vitesse maximale de production de lactate</h3>
        <p class="muted">Le VLamax mesure la puissance de votre système anaérobie glycolytique, c'est-à-dire votre capacité à produire de l'énergie rapidement à partir des glucides.</p>
        
        <!-- Graphique échelle VLamax -->
        <div class="mt" style="margin-bottom:16px">
          <svg width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="xMidYMid meet">
            <!-- Barre de fond -->
            <defs>
              <linearGradient id="vlamaxGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#16a34a"/>
                <stop offset="37.5%" style="stop-color:#3b82f6"/>
                <stop offset="62.5%" style="stop-color:#d97706"/>
                <stop offset="100%" style="stop-color:#dc2626"/>
              </linearGradient>
            </defs>
            <rect x="10" y="15" width="380" height="20" rx="4" fill="url(#vlamaxGrad)"/>
            <!-- Marqueurs -->
            <line x1="10" y1="40" x2="10" y2="45" stroke="#666" stroke-width="1"/>
            <text x="10" y="55" font-size="9" fill="#666" text-anchor="middle">0.20</text>
            <line x1="135" y1="40" x2="135" y2="45" stroke="#666" stroke-width="1"/>
            <text x="135" y="55" font-size="9" fill="#666" text-anchor="middle">0.30</text>
            <line x1="260" y1="40" x2="260" y2="45" stroke="#666" stroke-width="1"/>
            <text x="260" y="55" font-size="9" fill="#666" text-anchor="middle">0.40</text>
            <line x1="390" y1="40" x2="390" y2="45" stroke="#666" stroke-width="1"/>
            <text x="390" y="55" font-size="9" fill="#666" text-anchor="middle">0.50+</text>
            <!-- Labels zones -->
            <text x="72" y="10" font-size="8" fill="#16a34a" text-anchor="middle" font-weight="600">ENDURANT</text>
            <text x="197" y="10" font-size="8" fill="#3b82f6" text-anchor="middle" font-weight="600">ÉQUILIBRÉ</text>
            <text x="325" y="10" font-size="8" fill="#d97706" text-anchor="middle" font-weight="600">GLYCOLYTIQUE</text>
            <!-- Indicateur valeur actuelle -->
            ${vlamax.value !== null ? `
              <polygon points="${Math.min(390, Math.max(10, 10 + ((vlamax.value - 0.20) / 0.35) * 380))},12 ${Math.min(390, Math.max(10, 10 + ((vlamax.value - 0.20) / 0.35) * 380)) - 5},2 ${Math.min(390, Math.max(10, 10 + ((vlamax.value - 0.20) / 0.35) * 380)) + 5},2" fill="#111"/>
            ` : ''}
          </svg>
          ${vlamax.value !== null ? `<div style="text-align:center;font-size:11px;color:var(--muted)">▲ Votre VLamax: <b>${fmt(vlamax.value, 2)}</b> mmol/L/s</div>` : ''}
        </div>
        
        <div class="grid2 mt">
          <div>
            <h4>📊 Zones d'interprétation</h4>
            <table style="width:100%">
              <tbody>
                <tr><td><span class="badge badgeSuccess">&lt; 0.30</span></td><td>Profil très endurant – idéal pour Ironman/Ultra</td></tr>
                <tr><td><span class="badge" style="background:#3b82f6;color:white">0.30 – 0.40</span></td><td>Équilibré – polyvalent pour 70.3 / Marathon</td></tr>
                <tr><td><span class="badge badgeWarning">0.40 – 0.50</span></td><td>Glycolytique – favorise les efforts courts</td></tr>
                <tr><td><span class="badge badgeError">&gt; 0.50</span></td><td>Très glycolytique – adapté sprints/explosivité</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4>💡 Impact sur la performance</h4>
            <ul class="muted">
              <li><b>VLamax élevé</b> → consommation glucidique importante = risque de défaillance énergétique sur longue distance</li>
              <li><b>VLamax bas</b> → meilleure utilisation des graisses = économie de glycogène</li>
              <li>La cible dépend de votre objectif : ce qui est bon pour un sprinteur est mauvais pour un Ironman</li>
            </ul>
          </div>
        </div>
        
        <div class="alert alertInfo mt">
          <b>🔬 Sources de données (hiérarchie)</b><br>
          1. Test lactate (gold standard) → 2. Test terrain validé → 3. Estimation snapshot → 4. Valeur par défaut
        </div>
      </div>
      
      <!-- TTE -->
      <div class="card pagebreakAvoid mt">
        <h3>⏱️ TTE – Time To Exhaustion</h3>
        <p class="muted">Le TTE représente la durée maximale pendant laquelle vous pouvez maintenir une intensité donnée (généralement au seuil). C'est un indicateur clé de l'endurance.</p>
        
        <!-- Graphique échelle TTE -->
        <div class="mt" style="margin-bottom:16px">
          <svg width="100%" height="60" viewBox="0 0 400 60" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="tteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#dc2626"/>
                <stop offset="33%" style="stop-color:#d97706"/>
                <stop offset="66%" style="stop-color:#3b82f6"/>
                <stop offset="100%" style="stop-color:#16a34a"/>
              </linearGradient>
            </defs>
            <rect x="10" y="15" width="380" height="20" rx="4" fill="url(#tteGrad)"/>
            <!-- Marqueurs -->
            <line x1="10" y1="40" x2="10" y2="45" stroke="#666" stroke-width="1"/>
            <text x="10" y="55" font-size="9" fill="#666" text-anchor="middle">20</text>
            <line x1="136" y1="40" x2="136" y2="45" stroke="#666" stroke-width="1"/>
            <text x="136" y="55" font-size="9" fill="#666" text-anchor="middle">30</text>
            <line x1="263" y1="40" x2="263" y2="45" stroke="#666" stroke-width="1"/>
            <text x="263" y="55" font-size="9" fill="#666" text-anchor="middle">45</text>
            <line x1="390" y1="40" x2="390" y2="45" stroke="#666" stroke-width="1"/>
            <text x="390" y="55" font-size="9" fill="#666" text-anchor="middle">60+</text>
            <!-- Labels -->
            <text x="73" y="10" font-size="8" fill="#dc2626" text-anchor="middle" font-weight="600">INSUFFISANT</text>
            <text x="200" y="10" font-size="8" fill="#d97706" text-anchor="middle" font-weight="600">CORRECT</text>
            <text x="327" y="10" font-size="8" fill="#16a34a" text-anchor="middle" font-weight="600">OPTIMAL</text>
            <!-- Indicateur -->
            ${tte.tte_min ? `
              <polygon points="${Math.min(390, Math.max(10, 10 + ((tte.tte_min - 20) / 40) * 380))},12 ${Math.min(390, Math.max(10, 10 + ((tte.tte_min - 20) / 40) * 380)) - 5},2 ${Math.min(390, Math.max(10, 10 + ((tte.tte_min - 20) / 40) * 380)) + 5},2" fill="#111"/>
            ` : ''}
          </svg>
          ${tte.tte_min ? `<div style="text-align:center;font-size:11px;color:var(--muted)">▲ Votre TTE: <b>${tte.tte_min}</b> min</div>` : ''}
        </div>
        
        <div class="grid2 mt">
          <div>
            <h4>📊 Zones d'interprétation</h4>
            <table style="width:100%">
              <tbody>
                <tr><td><span class="badge badgeError">&lt; 30 min</span></td><td>Insuffisant pour longue distance</td></tr>
                <tr><td><span class="badge badgeWarning">30 – 45 min</span></td><td>Correct pour formats courts</td></tr>
                <tr><td><span class="badge" style="background:#3b82f6;color:white">45 – 60 min</span></td><td>Bon pour 70.3 / Marathon</td></tr>
                <tr><td><span class="badge badgeSuccess">&gt; 60 min</span></td><td>Excellent – prêt pour Ironman</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4>⚙️ Comment est-il calculé ?</h4>
            <ul class="muted">
              <li><b>Mode OBSERVED</b> → test réel effectué (valeur directe)</li>
              <li><b>Mode LOAD</b> → estimation basée sur la charge d'entraînement (TSS)</li>
              <li>Le TTE estimé tient compte du volume et de l'intensité des 7 derniers jours</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- Risque Glycolytique -->
      <div class="card pagebreakAvoid mt">
        <h3>⚠️ Risque Glycolytique</h3>
        <p class="muted">Le risque glycolytique est un indicateur de la dépendance de l'athlète aux glucides à l'intensité cible de son objectif.</p>
        
        <!-- Graphique échelle Risque Glycolytique -->
        <div class="mt" style="margin-bottom:16px">
          <svg width="100%" height="70" viewBox="0 0 400 70" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#16a34a"/>
                <stop offset="25%" style="stop-color:#16a34a"/>
                <stop offset="50%" style="stop-color:#3b82f6"/>
                <stop offset="75%" style="stop-color:#d97706"/>
                <stop offset="100%" style="stop-color:#dc2626"/>
              </linearGradient>
            </defs>
            <!-- Barre segmentée -->
            <rect x="10" y="20" width="95" height="20" rx="0" fill="#16a34a"/>
            <rect x="105" y="20" width="95" height="20" rx="0" fill="#3b82f6"/>
            <rect x="200" y="20" width="95" height="20" rx="0" fill="#d97706"/>
            <rect x="295" y="20" width="95" height="20" rx="0" fill="#dc2626"/>
            <!-- Labels zones dans barres -->
            <text x="57" y="34" font-size="9" fill="white" text-anchor="middle" font-weight="600">FAIBLE</text>
            <text x="152" y="34" font-size="9" fill="white" text-anchor="middle" font-weight="600">MODÉRÉ</text>
            <text x="247" y="34" font-size="9" fill="white" text-anchor="middle" font-weight="600">ÉLEVÉ</text>
            <text x="342" y="34" font-size="9" fill="white" text-anchor="middle" font-weight="600">CRITIQUE</text>
            <!-- Marqueurs -->
            <text x="10" y="55" font-size="9" fill="#666" text-anchor="start">0</text>
            <text x="105" y="55" font-size="9" fill="#666" text-anchor="middle">25</text>
            <text x="200" y="55" font-size="9" fill="#666" text-anchor="middle">50</text>
            <text x="295" y="55" font-size="9" fill="#666" text-anchor="middle">75</text>
            <text x="390" y="55" font-size="9" fill="#666" text-anchor="end">100</text>
            <!-- Indicateur si disponible -->
            ${potentielPhysiologique.nutritionalRiskIndex ? (() => {
              const levelToPosition: Record<string, number> = { low: 12.5, moderate: 37.5, high: 62.5, critical: 87.5 };
              const nri = potentielPhysiologique?.nutritionalRiskIndex as any;
              const lvl = typeof nri === 'object' ? nri?.level ?? "" : "";
              const lbl = typeof nri === 'object' ? nri?.label ?? "" : "";
              const pos = 10 + ((levelToPosition[lvl] || 50) / 100) * 380;
              return `
                <polygon points="${pos},17 ${pos - 5},7 ${pos + 5},7" fill="#111"/>
                <text x="${pos}" y="65" font-size="10" fill="#111" text-anchor="middle" font-weight="700">▲ ${lbl}</text>
              `;
            })() : ''}
          </svg>
        </div>
        
        <div class="alert alertWarning mt">
          <b>Important</b> : Cet indicateur n'est pas un jugement de performance, mais un outil d'aide à la décision pour orienter l'entraînement et la stratégie nutritionnelle.
        </div>
        
        <div class="grid2 mt">
          <div>
            <h4>🧩 Composantes du risque</h4>
            <ul class="muted">
              <li><b>VLamax</b> – vitesse de production du lactate</li>
              <li><b>TTE</b> – capacité à maintenir une intensité élevée</li>
              <li><b>Durée et intensité</b> de l'épreuve visée</li>
            </ul>
            <p class="muted mt">Un risque élevé signifie que l'athlète utilise rapidement ses réserves de glucides et peut rencontrer une baisse de performance si la nutrition et l'endurance ne sont pas adaptées.</p>
          </div>
          <div>
            <h4>📊 Interprétation des zones</h4>
            <table style="width:100%">
              <tbody>
                <tr><td><span class="badge badgeSuccess">0 – 25</span></td><td><b>Faible</b> → profil endurant</td></tr>
                <tr><td><span class="badge" style="background:#3b82f6;color:white">26 – 50</span></td><td><b>Modéré</b> → nutrition stratégique</td></tr>
                <tr><td><span class="badge badgeWarning">51 – 75</span></td><td><b>Élevé</b> → dépendance glucidique</td></tr>
                <tr><td><span class="badge badgeError">76 – 100</span></td><td><b>Critique</b> → risque défaillance</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Potentiel Physiologique -->
      <div class="card pagebreakAvoid mt">
        <h3>🎯 Potentiel Physiologique</h3>
        <p class="muted">Le Potentiel Physiologique évalue l'adéquation entre le profil métabolique de l'athlète et les exigences de son objectif. Il guide la prise de décision stratégique du coach.</p>
        
        <!-- Graphique Potentiel Physiologique avec jauge circulaire -->
        <div class="mt" style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <!-- Arc de fond -->
            <circle cx="60" cy="60" r="50" fill="none" stroke="#eee" stroke-width="12"/>
            <!-- Arc coloré selon score -->
            <circle cx="60" cy="60" r="50" fill="none" 
              stroke="${potentielPhysiologique.score >= 80 ? '#16a34a' : potentielPhysiologique.score >= 60 ? '#d97706' : '#dc2626'}" 
              stroke-width="12"
              stroke-dasharray="${(potentielPhysiologique.score / 100) * 314} 314"
              stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
            <!-- Valeur centrale -->
            <text x="60" y="55" font-size="28" font-weight="700" fill="${potentielPhysiologique.score >= 80 ? '#16a34a' : potentielPhysiologique.score >= 60 ? '#d97706' : '#dc2626'}" text-anchor="middle">${potentielPhysiologique.score}</text>
            <text x="60" y="72" font-size="10" fill="#666" text-anchor="middle">%</text>
          </svg>
          <div style="flex:1">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
              <!-- Mini barres pour chaque pilier -->
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">VLamax</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${potentielPhysiologique.details.vlamax * 4}%;background:${potentielPhysiologique.details.vlamax >= 20 ? '#16a34a' : potentielPhysiologique.details.vlamax >= 15 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${potentielPhysiologique.details.vlamax}/25</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">TTE</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${potentielPhysiologique.details.endurance * 4}%;background:${potentielPhysiologique.details.endurance >= 20 ? '#16a34a' : potentielPhysiologique.details.endurance >= 15 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${potentielPhysiologique.details.endurance}/25</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">FTP/kg</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${potentielPhysiologique.details.puissance * 4}%;background:${potentielPhysiologique.details.puissance >= 20 ? '#16a34a' : potentielPhysiologique.details.puissance >= 15 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${potentielPhysiologique.details.puissance}/25</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">Fraîcheur</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${potentielPhysiologique.details.fraicheur * 4}%;background:${potentielPhysiologique.details.fraicheur >= 18 ? '#16a34a' : potentielPhysiologique.details.fraicheur >= 12 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${potentielPhysiologique.details.fraicheur}/25</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="alert ${potentielPhysiologique.score >= 80 ? 'alertSuccess' : potentielPhysiologique.score >= 60 ? 'alertWarning' : 'alertError'}">
          <b>${potentielPhysiologique.label}</b> pour ${getObjectifLabel(athlete.goal)}
        </div>
        
        <div class="alert alertInfo mt">
          <b>⚠️ Attention</b> : Ce score ne constitue ni une prédiction de performance ni une garantie de résultat. Il doit être interprété avec le contexte d'entraînement.
        </div>
        
        <h4 class="mt">🏛️ Les 4 piliers du score</h4>
        <div class="grid4 mt">
          <div class="card" style="background:var(--soft)">
            <div class="muted" style="font-size:11px">⚡ VLamax effectif</div>
            <p style="font-size:11px;margin-top:4px">Dominance glucidique vs lipidique. Interprété selon la distance.</p>
          </div>
          <div class="card" style="background:var(--soft)">
            <div class="muted" style="font-size:11px">🔥 Puissance durable</div>
            <p style="font-size:11px;margin-top:4px">FTP ou allure seuil – toujours liée au TTE.</p>
          </div>
          <div class="card" style="background:var(--soft)">
            <div class="muted" style="font-size:11px">⏱️ TTE effectif</div>
            <p style="font-size:11px;margin-top:4px">Tolérance à l'effort prolongé. Central pour longue distance.</p>
          </div>
          <div class="card" style="background:var(--soft)">
            <div class="muted" style="font-size:11px">🎯 Objectif sportif</div>
            <p style="font-size:11px;margin-top:4px">IM ≠ Sprint ≠ Marathon. Pondération spécifique.</p>
          </div>
        </div>
        
        <h4 class="mt">📈 Indice de confiance</h4>
        <ul class="muted">
          <li><b>&gt; 80%</b> – Données fiables, score exploitable</li>
          <li><b>60-80%</b> – Données partielles, interpréter avec prudence</li>
          <li><b>&lt; 60%</b> – Données insuffisantes, compléter le profil</li>
        </ul>
        <p class="muted" style="font-style:italic;font-size:11px">La confiance diminue de 1% par semaine depuis le dernier test.</p>
      </div>
      
      <!-- Économie de Course -->
      <div class="card pagebreakAvoid mt">
        <h3>🏃 Économie de Course</h3>
        <p class="muted">En course à pied, la performance dépend autant de l'économie de mouvement que des capacités métaboliques. Une mauvaise économie augmente la consommation énergétique et les besoins nutritionnels.</p>
        
        <div class="grid2 mt">
          <div>
            <h4>📖 Définition opérationnelle</h4>
            <p class="muted">L'économie de course représente le coût énergétique pour maintenir une allure donnée. À VLamax et VO₂max égaux, l'athlète le plus économique :</p>
            <ul class="muted">
              <li>Performe mieux</li>
              <li>Consomme moins de glucides</li>
              <li>Fatigue moins vite</li>
            </ul>
          </div>
          <div>
            <h4>📊 Données utilisées</h4>
            <ul class="muted">
              <li>Allure à une intensité donnée (ex : allure marathon)</li>
              <li>Fréquence cardiaque associée</li>
              <li>Stabilité de la FC dans le temps (dérive)</li>
              <li>Historique de charge (TTE effectif)</li>
            </ul>
            <p class="muted" style="font-style:italic;font-size:11px">Aucune mesure de laboratoire obligatoire.</p>
          </div>
        </div>
      </div>
      
      <!-- Nutrition Prédictive -->
      <div class="card pagebreakAvoid mt">
        <h3>❤️ Nutrition Prédictive</h3>
        <p class="muted">Les besoins glucidiques sont estimés à partir des caractéristiques physiologiques de l'athlète (VLamax, endurance, économie de mouvement).</p>
        
        <div class="alert alertInfo mt">
          Ces valeurs sont des plages recommandées, destinées à guider la stratégie nutritionnelle et non à remplacer les tests terrain.
        </div>
        
        <h4 class="mt">🧬 Principes clés</h4>
        <ul class="muted">
          <li><b>VLamax élevé</b> → forte combustion glucidique</li>
          <li><b>TTE élevé</b> → meilleure capacité à soutenir une intensité</li>
          <li><b>Économie faible</b> → surcoût énergétique</li>
          <li><b>CAP &gt; Vélo</b> → contrainte mécanique + digestive plus élevée</li>
        </ul>
      </div>
      
      <!-- Fondements Scientifiques -->
      <div class="card pagebreakAvoid mt">
        <h3>🧠 Fondements scientifiques</h3>
        <p class="muted">La Two For Coaching Lab Method™ s'appuie sur des modèles énergétiques reconnus et des données terrain validées :</p>
        <ul class="muted">
          <li>Modèles énergétiques (Mader, Heck, Jones, Burnley)</li>
          <li>Relations VLamax ↔ oxydation glucidique</li>
          <li>Travaux de physiologie de l'exercice (Seiler, école allemande)</li>
          <li>Implémentation indépendante, originale et propriétaire</li>
        </ul>
        <div class="alert alertSuccess mt">
          <b>✅ Objectif transparence</b> : chaque score est explicable et chaque recommandation est justifiée.
        </div>
      </div>
    </section>
  `;

  // =============================================
  // J. QUALITÉ DES DONNÉES
  // =============================================
  const qualiteHTML = `
    <section id="qualite" class="section pagebreakAvoid">
      <h2>J. Qualité des données</h2>
      
      <div class="card ${completude.score >= 80 ? 'cardSuccess' : completude.score >= 50 ? 'cardWarning' : 'cardError'}">
        <div class="grid2">
          <div>
            <h3>Score de complétude</h3>
            <div class="big">${completude.score}%</div>
            <div class="progressBar mt">
              <div class="progressFill" style="width:${completude.score}%; background:${completude.score >= 80 ? 'var(--success)' : completude.score >= 50 ? 'var(--warning)' : 'var(--error)'}"></div>
            </div>
          </div>
          <div>
            ${completude.manquants.length > 0 ? `
              <h4>⚠️ Manque pour améliorer</h4>
              <ul class="muted">
                ${completude.manquants.map(m => `<li>${htmlEscape(m)}</li>`).join("")}
              </ul>
            ` : '<div class="alert alertSuccess">✅ Données complètes</div>'}
          </div>
        </div>
      </div>

      <div class="card mt">
        <h3>🔍 Traçabilité des sources</h3>
        <table>
          <thead>
            <tr><th>Métrique</th><th>Valeur</th><th>Source</th><th>Confiance</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><b>VLamax</b></td>
              <td>${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</td>
              <td>${htmlEscape(vlamax.label)}</td>
              <td><span class="badge ${vlamax.confidence >= 0.7 ? 'badgeSuccess' : vlamax.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${fmtPct(vlamax.confidence)}</span></td>
            </tr>
            <tr>
              <td><b>TTE</b></td>
              <td>${tte.tte_min} min</td>
              <td>${tte.source === "observed" ? "Mesuré (OBSERVED)" : tte.source === "estimated" ? "Estimé (LOAD)" : "Inconnu"}</td>
              <td><span class="badge ${tte.confidence >= 0.7 ? 'badgeSuccess' : tte.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${fmtPct(tte.confidence)}</span></td>
            </tr>
            <tr>
              <td><b>Potentiel Physiologique</b></td>
              <td>${potentielPhysiologique.score}%</td>
              <td>Calculé (VLamax + TTE + FTP/kg)</td>
              <td><span class="badge ${potentielPhysiologique.confidence >= 0.7 ? 'badgeSuccess' : potentielPhysiologique.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${fmtPct(potentielPhysiologique.confidence)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  // =============================================
  // INSCYD-STYLE: LACTATE CURVE HTML (SVG) — Mader-Heck Model
  // =============================================
  function buildLactateCurveHTML(p: ExportPayload): string {
    const v2max = p.effectiveRefs.vo2max ?? effectiveSnapshot?.vo2max ?? null;
    const vla = p.vlamax.value;
    const ftpVal = p.effectiveRefs.ftp ?? effectiveSnapshot?.ftp ?? null;
    const weightKg = p.effectiveRefs.weightKg ?? effectiveSnapshot?.weight_kg ?? 70;
    if (!v2max || !vla || !ftpVal) return '';
    
    // Use Mader model for scientific accuracy (parity with dashboard)
    // Mader model imported at top level (ESM)
    const maderProfile = { vo2max: v2max, vlamax: vla, weight: weightKg };
    const thresholds = findLactateThresholds(maderProfile);
    const fatMaxResult = findFatMax(maderProfile);
    const predictions = predictMaderPerformance(maderProfile);
    const pMax = predictions.pMax;
    
    // Generate SVG curve points using Mader steady-state solver
    const svgW = 520, svgH = 220, padL = 50, padR = 20, padT = 20, padB = 30;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;
    
    // Generate discrete step points (lab-style paliers)
    const stepPoints: { x: number; y: number; lactate: number; intensity: number; watts: number }[] = [];
    for (let i = 30; i <= 100; i += 5) {
      const lac = findSteadyStateLactate(i, v2max, vla);
      const watts = Math.round((i / 100) * pMax);
      const x = padL + ((i - 30) / 70) * plotW;
      const y = padT + plotH - Math.min(lac / 16, 1) * plotH;
      stepPoints.push({ x, y, lactate: lac, intensity: i, watts });
    }
    
    // Smooth curve (2% steps)
    const curvePoints: { x: number; y: number }[] = [];
    for (let i = 30; i <= 100; i += 2) {
      const lac = findSteadyStateLactate(i, v2max, vla);
      const x = padL + ((i - 30) / 70) * plotW;
      const y = padT + plotH - Math.min(lac / 16, 1) * plotH;
      curvePoints.push({ x, y });
    }
    
    const pathD = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaD = pathD + ` L ${curvePoints[curvePoints.length - 1].x.toFixed(1)} ${padT + plotH} L ${curvePoints[0].x.toFixed(1)} ${padT + plotH} Z`;
    
    // Threshold positions
    const lt1Y = padT + plotH - (2 / 16) * plotH;
    const lt2Y = padT + plotH - (4 / 16) * plotH;
    const mlssY = padT + plotH - (findSteadyStateLactate(thresholds.lt2Intensity, v2max, vla) / 16) * plotH;
    
    // VO2 overlay curve
    const vo2Points: { x: number; y: number }[] = [];
    for (let i = 30; i <= 100; i += 5) {
      const vo2 = (v2max * weightKg * (i / 100)) / 1000; // L/min
      const maxVO2 = (v2max * weightKg) / 1000;
      const x = padL + ((i - 30) / 70) * plotW;
      const y = padT + plotH - (vo2 / (maxVO2 * 1.1)) * plotH;
      vo2Points.push({ x, y });
    }
    const vo2PathD = vo2Points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    
    // Step markers SVG
    const stepMarkersSVG = stepPoints.map(sp => 
      `<circle cx="${sp.x.toFixed(1)}" cy="${sp.y.toFixed(1)}" r="3.5" fill="#ea580c" stroke="#fff" stroke-width="1.5"/>`
    ).join('');
    
    // Step table rows
    const stepTableRows = stepPoints.filter((_, i) => i % 2 === 0).map(sp => {
      const zone = sp.lactate < 2 ? 'Z1-Z2' : sp.lactate < 4 ? 'Z3' : sp.lactate < 6 ? 'Z4' : sp.lactate < 10 ? 'Z5' : 'Z6';
      const zColor = sp.lactate < 2 ? '#16a34a' : sp.lactate < 4 ? '#d97706' : sp.lactate < 6 ? '#ea580c' : '#dc2626';
      return `<tr>
        <td style="text-align:center;">${sp.intensity}%</td>
        <td style="text-align:center;">${sp.watts}W</td>
        <td style="text-align:center;font-weight:700;color:${zColor};">${sp.lactate.toFixed(1)}</td>
        <td style="text-align:center;"><span style="color:${zColor};font-size:10px;">${zone}</span></td>
      </tr>`;
    }).join('');
    
    return `
      <section id="lactate-curve">
        <h2>🧪 Courbe de Lactate — Modèle Mader-Heck</h2>
        <div class="grid3 mb">
          <div class="card" style="text-align:center;border-color:#22c55e;">
            <div style="font-size:10px;color:#16a34a;font-weight:600;">FatMax</div>
            <div class="big" style="color:#16a34a;">${fatMaxResult.fatMaxIntensity}%</div>
            <div class="muted">${fatMaxResult.fatMaxPower}W · ${fatMaxResult.fatMaxGrams} g/min lip</div>
          </div>
          <div class="card" style="text-align:center;border-color:#22c55e;">
            <div style="font-size:10px;color:#16a34a;font-weight:600;">LT1 (2 mmol/L)</div>
            <div class="big" style="color:#16a34a;">${thresholds.lt1Intensity}%</div>
            <div class="muted">${thresholds.lt1Power}W</div>
          </div>
          <div class="card" style="text-align:center;border-color:#ea580c;">
            <div style="font-size:10px;color:#ea580c;font-weight:600;">LT2 / MLSS</div>
            <div class="big" style="color:#ea580c;">${thresholds.lt2Intensity}%</div>
            <div class="muted">${thresholds.lt2Power}W · ${predictions.mlssPower}W MLSS</div>
          </div>
        </div>
        <div class="card">
          <svg width="100%" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet">
            <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="#ffffff" stroke="#e5e7eb" rx="4"/>
            <!-- Zone background fills -->
            <rect x="${padL}" y="${lt2Y}" width="${plotW}" height="${padT + plotH - lt2Y}" fill="#fff7ed" opacity="0.4"/>
            <rect x="${padL}" y="${lt1Y}" width="${plotW}" height="${lt2Y - lt1Y}" fill="#fefce8" opacity="0.4"/>
            <rect x="${padL}" y="${padT}" width="${plotW}" height="${lt1Y - padT}" fill="#f0fdf4" opacity="0.4"/>
            <!-- Grid lines -->
            ${[0, 2, 4, 6, 8, 10, 12, 14, 16].map(v => {
              const gy = padT + plotH - (v / 16) * plotH;
              return `<line x1="${padL}" y1="${gy}" x2="${padL + plotW}" y2="${gy}" stroke="#e5e7eb" stroke-dasharray="3 3"/>
                      <text x="${padL - 5}" y="${gy + 4}" text-anchor="end" font-size="9" fill="#64748b">${v}</text>`;
            }).join('')}
            <!-- X axis labels -->
            ${[30, 40, 50, 60, 70, 80, 90, 100].map(v => {
              const gx = padL + ((v - 30) / 70) * plotW;
              return `<text x="${gx}" y="${padT + plotH + 15}" text-anchor="middle" font-size="9" fill="#64748b">${v}%</text>`;
            }).join('')}
            <!-- VO2 overlay (right axis) -->
            <path d="${vo2PathD}" fill="none" stroke="#3b82f6" stroke-width="1.2" stroke-dasharray="5 3" opacity="0.6"/>
            <text x="${padL + plotW + 2}" y="${vo2Points[vo2Points.length - 1].y + 4}" font-size="8" fill="#3b82f6">VO₂</text>
            <!-- LT1 line -->
            <line x1="${padL}" y1="${lt1Y}" x2="${padL + plotW}" y2="${lt1Y}" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="6 3"/>
            <text x="${padL + plotW + 2}" y="${lt1Y + 4}" font-size="9" fill="#16a34a" font-weight="600">LT1</text>
            <!-- LT2 line -->
            <line x1="${padL}" y1="${lt2Y}" x2="${padL + plotW}" y2="${lt2Y}" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="6 3"/>
            <text x="${padL + plotW + 2}" y="${lt2Y + 4}" font-size="9" fill="#ea580c" font-weight="600">LT2</text>
            <!-- Curve area gradient -->
            <defs><linearGradient id="pdfLacGradMader" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stop-color="#ea580c" stop-opacity="0.25"/><stop offset="95%" stop-color="#ea580c" stop-opacity="0.02"/></linearGradient></defs>
            <path d="${areaD}" fill="url(#pdfLacGradMader)"/>
            <path d="${pathD}" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Step markers (lab paliers) -->
            ${stepMarkersSVG}
            <!-- Labels -->
            <text x="${svgW / 2}" y="${svgH - 2}" text-anchor="middle" font-size="10" fill="#64748b">% VO₂max</text>
            <text x="12" y="${svgH / 2}" text-anchor="middle" font-size="10" fill="#64748b" transform="rotate(-90, 12, ${svgH / 2})">[La] mmol/L</text>
            <!-- Legend -->
            <line x1="${padL + 10}" y1="${padT + 8}" x2="${padL + 30}" y2="${padT + 8}" stroke="#ea580c" stroke-width="2"/>
            <text x="${padL + 35}" y="${padT + 12}" font-size="8" fill="#ea580c">Lactate (Mader)</text>
            <line x1="${padL + 140}" y1="${padT + 8}" x2="${padL + 160}" y2="${padT + 8}" stroke="#3b82f6" stroke-width="1.2" stroke-dasharray="5 3"/>
            <text x="${padL + 165}" y="${padT + 12}" font-size="8" fill="#3b82f6">VO₂ (L/min)</text>
          </svg>
        </div>
        <!-- Step table (paliers) -->
        <div class="card" style="margin-top:8px;">
          <div style="font-size:11px;font-weight:600;margin-bottom:6px;">📊 Paliers discrets (type labo)</div>
          <table style="font-size:10px;">
            <thead><tr>
              <th style="text-align:center;">Intensité</th>
              <th style="text-align:center;">Puissance</th>
              <th style="text-align:center;">[La] mmol/L</th>
              <th style="text-align:center;">Zone</th>
            </tr></thead>
            <tbody>${stepTableRows}</tbody>
          </table>
        </div>
        <div class="card" style="background:#f0fdf4;border-color:#22c55e;margin-top:8px;">
          <div style="font-size:12px;font-weight:600;color:#16a34a;">💡 Interprétation métabolique</div>
          <div class="muted" style="margin-top:4px;">
            ${vla < 0.35
              ? `Profil Endurance — VLamax basse (${vla.toFixed(2)}) → seuils élevés (LT1 ${thresholds.lt1Intensity}%, LT2 ${thresholds.lt2Intensity}%). Excellente efficacité lipidique. FatMax à ${fatMaxResult.fatMaxIntensity}% (${fatMaxResult.fatMaxGrams} g/min).`
              : vla > 0.55
                ? `Profil Glycolytique — VLamax élevée (${vla.toFixed(2)}) → seuils bas (écart ${thresholds.lt2Intensity - thresholds.lt1Intensity}%). Priorité : volume Z2 pour abaisser VLamax et remonter les seuils.`
                : `Profil Équilibré — Écart LT1-LT2 de ${thresholds.lt2Intensity - thresholds.lt1Intensity}% indique une marge de progression au tempo et sweet-spot. MLSS à ${predictions.mlssPower}W (${predictions.mlssWkg} W/kg).`
            }
          </div>
          <div class="muted" style="margin-top:4px;font-size:9px;">
            Modèle Mader-Heck (2003) — Cinétique lactate Michaelis-Menten + clearance MCT. Parité Dashboard/Export.
          </div>
        </div>
      </section>
    `;
  }

  // =============================================
  // INSCYD-STYLE: SUBSTRATE OXIDATION HTML (SVG) — Mader Model
  // =============================================
  function buildSubstrateCurveHTML(p: ExportPayload): string {
    const v2max = p.effectiveRefs.vo2max ?? effectiveSnapshot?.vo2max ?? null;
    const vla = p.vlamax.value;
    const ftpVal = p.effectiveRefs.ftp ?? effectiveSnapshot?.ftp ?? null;
    const weightKg = p.effectiveRefs.weightKg ?? effectiveSnapshot?.weight_kg ?? 70;
    if (!v2max || !vla || !ftpVal) return '';
    
    // Mader model imported at top level (ESM)
    const maderProfile = { vo2max: v2max, vlamax: vla, weight: weightKg };
    const fatMaxResult = findFatMax(maderProfile);
    const predictions = predictMaderPerformance(maderProfile);
    const pMax = predictions.pMax;
    
    // Generate substrate data using Mader model
    const data: { intensity: number; watts: number; fatGmin: number; carbGmin: number; fatKcalH: number; carbKcalH: number; fatPct: number }[] = [];
    for (let intensity = 25; intensity <= 100; intensity += 2) {
      const fatGmin = calculateFatOxidation(intensity, v2max, vla, weightKg);
      const carbGmin = calculateCarbOxidation(intensity, v2max, vla, weightKg);
      const watts = Math.round((intensity / 100) * pMax);
      const fatKcalH = fatGmin * 9 * 60;
      const carbKcalH = carbGmin * 4 * 60;
      const totalKcal = fatKcalH + carbKcalH;
      const fatPct = totalKcal > 0 ? (fatKcalH / totalKcal) * 100 : 0;
      data.push({ intensity, watts, fatGmin, carbGmin, fatKcalH, carbKcalH, fatPct });
    }
    
    const crossover = data.find(d => d.fatPct < 50);
    const crossoverPct = crossover?.intensity ?? fatMaxResult.fatMaxIntensity + 10;
    const crossoverW = crossover ? crossover.watts : Math.round((crossoverPct / 100) * pMax);
    
    // FTP intensity data point
    const ftpIntensity = Math.round((ftpVal / pMax) * 100);
    const atFtp = data.find(d => d.intensity >= Math.min(ftpIntensity, 95)) ?? data[data.length - 1];
    
    // SVG dimensions
    const svgW = 520, svgH = 200, padL = 50, padR = 50, padT = 15, padB = 25;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;
    const maxGmin = Math.max(...data.map(d => Math.max(d.fatGmin, d.carbGmin))) * 1.15;
    const maxKcalH = Math.max(...data.map(d => Math.max(d.fatKcalH, d.carbKcalH))) * 1.15;
    
    const fatPath = data.map((d, i) => {
      const x = padL + ((d.intensity - 25) / 75) * plotW;
      const y = padT + plotH - (d.fatGmin / maxGmin) * plotH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    
    const carbPath = data.map((d, i) => {
      const x = padL + ((d.intensity - 25) / 75) * plotW;
      const y = padT + plotH - (d.carbGmin / maxGmin) * plotH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    
    const fatAreaD = fatPath + ` L ${padL + plotW} ${padT + plotH} L ${padL} ${padT + plotH} Z`;
    
    // Right axis labels (kcal/h)
    const rightAxisLabels = [0, 1, 2, 3].map(i => {
      const val = Math.round((maxKcalH / 3) * i);
      const gy = padT + plotH - (i / 3) * plotH;
      return `<text x="${padL + plotW + 5}" y="${gy + 4}" text-anchor="start" font-size="8" fill="#9ca3af">${val}</text>`;
    }).join('');
    
    return `
      <section id="substrate-curve">
        <h2>🔥 Oxydation Lipides / Glucides — Modèle Mader</h2>
        <div class="grid3 mb">
          <div class="card" style="text-align:center;border-color:#22c55e;">
            <div style="font-size:10px;color:#16a34a;font-weight:600;">FatMax</div>
            <div class="medium" style="color:#16a34a;">${fatMaxResult.fatMaxGrams} g/min</div>
            <div class="muted">${fatMaxResult.fatMaxIntensity}% VO₂max · ${fatMaxResult.fatMaxPower}W</div>
          </div>
          <div class="card" style="text-align:center;border-color:#3b82f6;">
            <div style="font-size:10px;color:#3b82f6;font-weight:600;">Crossover</div>
            <div class="medium" style="color:#3b82f6;">${crossoverPct}% VO₂max</div>
            <div class="muted">${crossoverW}W · 50/50 lip/glu</div>
          </div>
          <div class="card" style="text-align:center;border-color:#ea580c;">
            <div style="font-size:10px;color:#ea580c;font-weight:600;">CHO @ FTP</div>
            <div class="medium" style="color:#ea580c;">${(atFtp.carbGmin * 60).toFixed(0)} g/h</div>
            <div class="muted">${atFtp.carbGmin.toFixed(2)} g/min · ${atFtp.watts}W</div>
          </div>
        </div>
        <div class="card">
          <svg width="100%" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet">
            <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="#ffffff" stroke="#e5e7eb" rx="4"/>
            <!-- Crossover transition zone -->
            ${(() => {
              const x1 = padL + ((fatMaxResult.fatMaxIntensity - 25) / 75) * plotW;
              const x2 = padL + ((crossoverPct - 25) / 75) * plotW;
              return `<rect x="${Math.max(padL, x1)}" y="${padT}" width="${Math.max(0, x2 - x1)}" height="${plotH}" fill="#dbeafe" opacity="0.25"/>
                      <text x="${(x1 + x2) / 2}" y="${padT + plotH - 5}" text-anchor="middle" font-size="7" fill="#3b82f6" opacity="0.7">Transition</text>`;
            })()}
            <!-- Left axis labels (g/min) -->
            ${[0, 1, 2, 3, 4].map(i => {
              const val = (maxGmin / 4 * i).toFixed(1);
              const gy = padT + plotH - (i / 4) * plotH;
              return `<line x1="${padL}" y1="${gy}" x2="${padL + plotW}" y2="${gy}" stroke="#e5e7eb" stroke-dasharray="3 3"/>
                      <text x="${padL - 5}" y="${gy + 4}" text-anchor="end" font-size="8" fill="#64748b">${val}</text>`;
            }).join('')}
            <!-- Right axis labels (kcal/h) -->
            ${rightAxisLabels}
            <!-- Fat area gradient -->
            <defs><linearGradient id="pdfFatGradMader" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stop-color="#16a34a" stop-opacity="0.3"/><stop offset="95%" stop-color="#16a34a" stop-opacity="0.02"/></linearGradient></defs>
            <path d="${fatAreaD}" fill="url(#pdfFatGradMader)"/>
            <path d="${fatPath}" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Carb line -->
            <path d="${carbPath}" fill="none" stroke="#ea580c" stroke-width="2" stroke-dasharray="5 2" stroke-linecap="round"/>
            <!-- FatMax vertical -->
            ${(() => {
              const x = padL + ((fatMaxResult.fatMaxIntensity - 25) / 75) * plotW;
              return `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + plotH}" stroke="#16a34a" stroke-width="1" stroke-dasharray="4 3"/>
                      <text x="${x}" y="${padT - 3}" text-anchor="middle" font-size="8" fill="#16a34a" font-weight="600">FatMax</text>`;
            })()}
            <!-- Crossover vertical -->
            ${(() => {
              const x = padL + ((crossoverPct - 25) / 75) * plotW;
              return `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + plotH}" stroke="#3b82f6" stroke-width="1" stroke-dasharray="4 3"/>
                      <text x="${x}" y="${padT - 3}" text-anchor="middle" font-size="8" fill="#3b82f6" font-weight="600">Crossover</text>`;
            })()}
            <!-- Legend -->
            <line x1="${padL + 10}" y1="${padT + 8}" x2="${padL + 30}" y2="${padT + 8}" stroke="#16a34a" stroke-width="2.5"/>
            <text x="${padL + 35}" y="${padT + 12}" font-size="8" fill="#16a34a">Lipides (g/min)</text>
            <line x1="${padL + 140}" y1="${padT + 8}" x2="${padL + 160}" y2="${padT + 8}" stroke="#ea580c" stroke-width="2" stroke-dasharray="5 2"/>
            <text x="${padL + 165}" y="${padT + 12}" font-size="8" fill="#ea580c">Glucides (g/min)</text>
            <!-- Axes labels -->
            <text x="${svgW / 2}" y="${svgH - 2}" text-anchor="middle" font-size="10" fill="#64748b">% VO₂max</text>
            <text x="12" y="${svgH / 2}" text-anchor="middle" font-size="9" fill="#64748b" transform="rotate(-90, 12, ${svgH / 2})">g/min</text>
            <text x="${svgW - 8}" y="${svgH / 2}" text-anchor="middle" font-size="8" fill="#9ca3af" transform="rotate(90, ${svgW - 8}, ${svgH / 2})">kcal/h</text>
          </svg>
          <div class="muted" style="text-align:center;margin-top:8px;font-size:9px;">
            Modèle Mader — Oxydation lipidique (Randle cycle) + partitionnement énergétique. Parité Dashboard/Export.
          </div>
        </div>
      </section>
    `;
  }

  // =============================================
  // INSCYD-STYLE: PERFORMANCE PREDICTION HTML
  // =============================================
  function buildPerformancePredictionHTML(p: ExportPayload): string {
    const v2max = p.effectiveRefs.vo2max ?? effectiveSnapshot?.vo2max ?? null;
    const vla = p.vlamax.value;
    const ftpVal = p.effectiveRefs.ftp ?? effectiveSnapshot?.ftp ?? null;
    const weightKg = p.effectiveRefs.weightKg ?? effectiveSnapshot?.weight_kg ?? 70;
    const vmaVal = effectiveSnapshot?.vma ?? null;
    const cssVal = effectiveSnapshot?.css ?? null;
    if (!v2max || !vla) return '';
    
    // Mader model & performance prediction imported at top level (ESM)
    
    // Mader-derived metabolic context
    const maderProfile = { vo2max: v2max, vlamax: vla, weight: weightKg };
    const maderPred = predictMaderPerformance(maderProfile);
    const fatMaxResult = findFatMax(maderProfile);
    
    const output = computePerformancePredictions({
      vo2max: v2max,
      vlamax: vla,
      weight: weightKg,
      ftp: ftpVal,
      vma: vmaVal,
      css: cssVal,
      confidence: p.vlamax.confidence / 100,
      raceRecords: p.raceRecords ?? null,
    });
    
    const scenarioColors: Record<string, { bg: string; text: string; label: string }> = {
      conservative: { bg: '#f0fdf4', text: '#16a34a', label: 'Conservateur (95%)' },
      optimal: { bg: '#eff6ff', text: '#2563eb', label: 'Optimal (80%)' },
      aggressive: { bg: '#fff7ed', text: '#ea580c', label: 'Agressif (60%)' },
    };
    
    const races = output.scenarios[0]?.predictions ?? [];
    
    const tableRows = races.map((race: any, i: number) => {
      const cells = output.scenarios.map((s: any) => {
        const pred = s.predictions[i];
        const sc = scenarioColors[s.scenario];
        return `<td style="text-align:center;background:${sc.bg};">
          <div style="font-weight:700;font-size:13px;color:${sc.text};">${pred.timeFormatted}</div>
          ${pred.powerWatts ? `<div class="muted" style="font-size:10px;">${pred.powerWatts}W</div>` : ''}
          ${pred.paceFormatted ? `<div class="muted" style="font-size:10px;">${pred.paceFormatted}</div>` : ''}
        </td>`;
      }).join('');
      
      const riskColor = race.glycogenRisk === 'low' ? '#16a34a' : race.glycogenRisk === 'moderate' ? '#d97706' : '#dc2626';
      const riskLabelAthlete = race.glycogenRisk === 'low'
        ? 'Faible'
        : race.glycogenRisk === 'moderate'
          ? 'Risque de coup de mou'
          : 'Risque de mur';
      const riskLabelStaff = race.glycogenRisk === 'low' ? 'Faible' : race.glycogenRisk === 'moderate' ? 'Modéré' : 'Élevé';
      
      return `<tr>
        <td>
          <div style="font-weight:600;">${race.raceName}</div>
          <div class="muted" style="font-size:10px;">${race.distance}</div>
        </td>
        ${cells}
        <td style="text-align:center;">
          <span class="badge" style="background:${riskColor}20;color:${riskColor};">${isAthlete ? riskLabelAthlete : riskLabelStaff}</span>
        </td>
      </tr>`;
    }).join('');
    
    const headerCells = output.scenarios.map((s: any) => {
      const sc = scenarioColors[s.scenario];
      return `<th style="text-align:center;background:${sc.bg};color:${sc.text};font-size:11px;">${sc.label}</th>`;
    }).join('');
    
    return `
      <section id="performance-prediction">
        <h2>⏱️ Prédiction de Performance${isAthlete ? '' : ' — Modèle Mader'}</h2>
        <div class="card mb">
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;text-align:center;">
            <div>
              <div style="font-size:10px;color:#64748b;">VO₂max</div>
              <div class="medium" style="color:#2563eb;">${v2max}</div>
              <div class="muted">ml/kg/min</div>
            </div>
            <div>
              <div style="font-size:10px;color:#64748b;">VLamax</div>
              <div class="medium" style="color:#ea580c;">${vla.toFixed(2)}</div>
              <div class="muted">mmol/L/s</div>
            </div>
            <div>
              <div style="font-size:10px;color:#64748b;">Poids</div>
              <div class="medium">${weightKg}</div>
              <div class="muted">kg</div>
            </div>
            <div>
              <div style="font-size:10px;color:#64748b;">MLSS (Mader)</div>
              <div class="medium" style="color:#7c3aed;">${maderPred.mlssPower}W</div>
              <div class="muted">${maderPred.mlssWkg} W/kg</div>
            </div>
            <div>
              <div style="font-size:10px;color:#64748b;">FatMax</div>
              <div class="medium" style="color:#16a34a;">${fatMaxResult.fatMaxPower}W</div>
              <div class="muted">${fatMaxResult.fatMaxGrams} g/min</div>
            </div>
            <div>
              <div style="font-size:10px;color:#64748b;">TTE @ MLSS</div>
              <div class="medium" style="color:#d97706;">${maderPred.tteAtMLSS} min</div>
              <div class="muted">CHO: ${fatMaxResult.carbAtFatMax} g/h</div>
            </div>
          </div>
        </div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                ${headerCells}
                <th style="text-align:center;font-size:10px;">${isAthlete ? 'Risque nutrition' : 'Risque<br>Glycogène'}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        ${isAthlete ? '' : `<div class="card" style="background:#f8fafc;">
          <div class="muted" style="font-size:10px;">
            <b>Méthodologie :</b> ${output.modelNote}
            Métriques métaboliques (MLSS, FatMax, TTE) calculées par modèle Mader-Heck (2003). Parité Dashboard/Export.
            Confiance du modèle : ${Math.round(output.confidence * 100)}%.
          </div>
        </div>`}
      </section>
    `;
  }

  const footerHTML = `
    <div class="footer">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
        <div style="display:flex; align-items:center; gap:12px;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height:70px; width:auto;" />` : ''}
          <div>
            <b>${htmlEscape(brandMain)}</b> — ${htmlEscape(brandSub)}<br>
            <span class="muted">Rapport généré le ${coverDate} à ${createdAt.toLocaleTimeString("fr-FR")}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="muted">VLamax: ${htmlEscape(vlamax.label)} • TTE: ${tte.source === "observed" ? "mesuré" : "estimé"}</div>
          <div class="muted" style="margin-top:6px;">⚠️ Ce rapport guide la décision mais ne remplace pas un avis médical.</div>
        </div>
      </div>
    </div>
  `;

  // =============================================
  // ASSEMBLE HTML — RESPECT DE L'ORDRE PERSONNALISÉ
  // =============================================
  
  // Map des sections vers leur contenu HTML
  const sectionHTMLMap: Record<keyof ReportSections, string> = {
    synthese: executifHTML,
    compass: compassHTML,
    profilMetabolique: profilMetaboliqueHTML,
    vlamaxZoneConfidence: buildVLamaxZoneConfidenceHTML(payload),
    runMLSSCoherence: buildRunMLSSCoherenceHTML(payload),
    indicateurs: indicateursHTML,
    pacingEnvelope: (() => {
      const goal = payload.athlete.goal || "";
      const isRun = goal.includes("km") || goal.includes("Marathon") || goal.includes("Semi") || goal.includes("Trail") || goal.includes("Ultra");
      const hours = RACE_DURATION_HOURS_E[goal] ?? 0;
      const isLong = hours >= LONG_DISTANCE_THRESHOLD_HOURS;
      const main = isRun ? buildPacingEnvelopeRunningHTML(payload) : buildPacingEnvelopeHTML(payload);
      const ld = isLong ? buildLongDistancePacingHTML(payload) : "";
      const refs = `
        <section id="pacing-envelope-references" class="section pagebreakAvoid">
          <div class="card" style="background:#f8fafc;font-size:10px;">
            <h3 style="font-size:12px;margin-bottom:6px;">📚 Références scientifiques — Modèle Pacing Envelope™ (Chantiers A→D)</h3>
            <ul style="font-size:10px;line-height:1.5;padding-left:18px;margin:0;color:#475569;">
              <li><b>Smyth & Muniz-Pumares (2022)</b> — %CS soutenable décroît log-linéairement avec la durée (25M marathons Strava).</li>
              <li><b>Jones & Vanhatalo (2017)</b> — Critical Power / W' framework, vCS/vVMA ≈ 0.90.</li>
              <li><b>Skiba et al. (2012, 2024)</b> — W'-balance dynamics, asymétrie ceiling/floor, reconstitution exponentielle.</li>
              <li><b>Vanhatalo et al. (2020)</b> — Anaerobic reserve race-day, modulation plafond.</li>
              <li><b>Maunder et al. (2021)</b> — Domain-based intensity prescription.</li>
              <li><b>Rapoport (2010)</b> — Modèle de réserves glycogéniques (~6.5 g/kg) et burn rate.</li>
              <li><b>Jeukendrup (2014) / King (2022)</b> — Intake CHO 30-120 g/h, ratio glucose:fructose, gut training.</li>
              <li><b>Périard et al. (2021) / Stull (2011)</b> — Stress thermique WBGT, pénalité d'intensité, besoins hydriques.</li>
              <li><b>Mader & Heck (1991)</b> — Modèle MLSS, courbe lactate/intensité.</li>
            </ul>
          </div>
        </section>`;
      return main + ld + refs;
    })(),
    potentielPhysiologiqueRunning: buildPotentielPhysiologiqueRunningHTML(payload),
    injuryRisk: injuryRiskHTML,
    nutritionV2: buildNutritionV2HTML(payload),
    fatmaxTFCL: buildFatMaxTFCLHTML(payload),
    ambitionTargets: ambitionTargetsHTML,
    ambitionPredictions: ambitionPredictionsHTML,
    evolutionCharts: evolutionChartsHTML,
    ageAdjustment: aaiHTML,
    ambitionLegend: ambitionLegendHTML,
    zones: zonesHTML,
    historique: snapshotsHTML,
    tests: testsHTML,
    testsCalibration: testsCalibrationHTML,
    calibrationEvidence: calibrationEvidenceHTML,
    fitImports: fitImportsHTML,
    checkins: checkinsHTML,
    comprendre: comprendreHTML,
    qualite: qualiteHTML,
    roadmap: buildRoadmapHTML(payload),
    lactateCurve: buildLactateCurveHTML(payload),
    substrateCurve: buildSubstrateCurveHTML(payload),
    performancePrediction: buildPerformancePredictionHTML(payload),
    facteursLimitants: buildFacteursLimitantsHTML(payload),
    leviersAction: buildLeviersActionHTML(payload),
    cpWprimeWbal: buildCpWprimeWbalHTML(payload),
    lactateCorrespondence: buildLactateCorrespondenceHTML(payload),
    cycleIntelligence: buildCycleIntelligenceHTML(payload),
  };
  
  // Récupérer l'ordre personnalisé des sections
  const sectionOrder = getSectionOrder();
  
  // Assembler les sections dans l'ordre personnalisé
  const orderedSectionsHTML = sectionOrder
    .filter((key) => options.sections[key]) // Seulement les sections visibles
    .map((key) => sectionHTMLMap[key])
    .join('\n');

  return `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>${htmlEscape(title)}</title>
        ${css}
      </head>
      <body>
        ${coverHTML}
        ${buildExecutiveSummaryHTML(payload)}
        
        <div class="noPrint" style="padding:16px;background:#f0f9ff;border-radius:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <button onclick="window.print()" style="padding:12px 24px;font-size:15px;cursor:pointer;background:#2563eb;color:white;border:none;border-radius:8px;font-weight:600;box-shadow:0 2px 8px rgba(37,99,235,0.3);">
            🖨️ Imprimer / Enregistrer en PDF
          </button>
          <span class="muted" style="font-size:13px;">💡 <b>Conseil :</b> Dans le dialogue d'impression, sélectionnez <b>"Enregistrer en PDF"</b> comme destination pour créer un fichier PDF.</span>
        </div>

        ${tocHTML}
        
        ${positionnementHTML}
        ${orderedSectionsHTML}
        
        ${footerHTML}
      </body>
    </html>
  `;
}

// =============================================
// ATHLETE REPORT HTML (Simplified, encouraging)
// =============================================

// =============================================
// READINESS — Source de vérité unifiée pour rapports Athlète & Découverte
// Branché sur le vrai payload (unifiedLimiter, potentiel, fatigue, completude)
// =============================================
interface PhysioMetricRow {
  label: string;
  value: string;
  context: string;       // explication courte ou cible
  status: "ok" | "warn" | "low" | "info";
}

interface CompassAxisRow {
  label: string;
  score: number;          // 0-100
  emoji: string;
  comment: string;
}

interface AmbitionProgressRow {
  label: string;
  icon: string;
  progressPct: number;    // 0-100
  isReached: boolean;
  weeksToReach: number | null;
}

interface NextActionRow {
  label: string;
  why: string;
}

interface AthleteReadinessReport {
  score: number;                  // 0-100
  scoreColor: "green" | "orange" | "red";
  scoreText: string;              // ex: "Bonne forme générale"
  mainMessage: string;            // verdict global 1 phrase
  wellPrepared: string[];         // points forts (issus piliers/compass)
  toWatch: string[];              // points d'attention (issus limiteurs + fatigue)
  keyAdvice: string;              // 1 conseil prioritaire (issu du limiteur primaire)
  nutritionMessage: string;       // depuis nutritionV2 ou nutritionEstimate
  confidenceMessage: string;      // basé sur completude + confiance
  // ───── Enrichissements ─────
  physioMetrics: PhysioMetricRow[];        // FTP, FTP/kg, VLamax, VO2max, TTE, FatMax, VMA, poids…
  compassAxes: CompassAxisRow[];           // 4 piliers V2 sur /100
  trainingLoad: {                          // TSS 7j + interprétation
    tss7d: number | null;
    label: string;
    detail: string;
    status: "ok" | "warn" | "low" | "info";
  };
  ambitionProgress: AmbitionProgressRow[]; // progression vs niveaux d'ambition
  ambitionLabel: string;                   // ambition courante (ex: "Élite")
  nextActions: NextActionRow[];            // 2-3 leviers prioritaires (Lorang)
  prohibitions: string[];                  // interdits (ex: sprints)
  goalLabel: string;                       // objectif lisible
  recentTests: { name: string; date: string }[]; // 3 derniers tests
}

function buildAthleteReadinessFromPayload(payload: ExportPayload): AthleteReadinessReport {
  const {
    potentielPhysiologique, unifiedLimiter, completude,
    nutritionV2, nutritionEstimate, effectiveSnapshot, capInjuryRisk,
    compassScores, vlamax, tte
  } = payload;

  // 1) SCORE : provient du Potentiel Physiologique (déjà dans payload)
  const score = Math.max(0, Math.min(100, Math.round(potentielPhysiologique?.score ?? 0)));
  const scoreColor: "green" | "orange" | "red" = score >= 75 ? "green" : score >= 55 ? "orange" : "red";
  const scoreText = score >= 80 ? "Excellente forme"
    : score >= 65 ? "Bonne forme générale"
    : score >= 50 ? "Forme correcte, points à travailler"
    : "Forme à reconstruire";

  // 2) MAIN MESSAGE : verdict global cohérent avec le limiteur primaire
  const limiterLabel = unifiedLimiter?.limiterLabel || null;
  const mainMessage = score >= 75
    ? "Tu es dans une fenêtre favorable — ton corps répond bien aux sollicitations."
    : score >= 55
    ? `Globalement tu tiens la route${limiterLabel ? `, mais ${String(limiterLabel).toLowerCase()} freine ta progression` : ""}.`
    : `Ton corps envoie des signaux clairs${limiterLabel ? ` autour de ${String(limiterLabel).toLowerCase()}` : ""}. Il faut prioriser cet axe avant de pousser.`;

  // 3) WELL PREPARED : piliers V2 sur /100 (compassScores) — source de vérité unifiée
  //    FIX: ne plus comparer details.* (échelle /25) avec >=70 (échelle /100)
  const wellPrepared: string[] = [];
  const aerobic   = compassScores?.capaciteAerobie?.score ?? null;
  const endurance = compassScores?.toleranceEffort?.score ?? null;
  const metabolic = compassScores?.profilMetabolique?.score ?? null;
  const robust    = compassScores?.robustesse?.score ?? null;
  const STRENGTH_THRESHOLD = 70; // /100

  if (endurance !== null && endurance >= STRENGTH_THRESHOLD) wellPrepared.push("Endurance solide — tu tiens bien la durée.");
  if (metabolic !== null && metabolic >= STRENGTH_THRESHOLD) wellPrepared.push("Profil énergétique adapté à ton objectif.");
  if (aerobic   !== null && aerobic   >= STRENGTH_THRESHOLD) wellPrepared.push("Capacité aérobie bien développée.");
  if (robust    !== null && robust    >= STRENGTH_THRESHOLD) wellPrepared.push("Niveau de fraîcheur favorable — corps disponible.");

  if (wellPrepared.length === 0) {
    wellPrepared.push("Ta régularité d'entraînement reste ton meilleur atout — continue à construire la base.");
  }

  // 4) TO WATCH : limiteur primaire + 2e du categoryRanking + risque blessure + fatigue
  const toWatch: string[] = [];
  if (unifiedLimiter?.limiterLabel) {
    toWatch.push(`Limiteur principal : ${unifiedLimiter.limiterLabel}.`);
  }
  const secondCategory = unifiedLimiter?.categoryRanking?.[1];
  if (secondCategory && (secondCategory as any).label) {
    toWatch.push(`À surveiller aussi : ${(secondCategory as any).label}.`);
  }
  if (capInjuryRisk && capInjuryRisk.level >= 3) {
    toWatch.push(`Risque blessure ${capInjuryRisk.label.toLowerCase()} — sois vigilant sur la récupération.`);
  }
  const fatigueState = effectiveSnapshot?.fatigue_state;
  if (fatigueState === "fatigued" || fatigueState === "high") {
    toWatch.push("Niveau de fatigue élevé — privilégie le sommeil et l'hydratation.");
  } else if (fatigueState === "injured") {
    toWatch.push("Statut blessure actif — ne reprends pas l'intensité tant que ce n'est pas résolu.");
  }
  // FIX: robustesse V2 sur /100 (était details.fraicheur sur /25 comparé à <50)
  if (robust !== null && robust < 50) {
    toWatch.push("Fraîcheur basse — il manque de la récupération récente.");
  }

  // 5) KEY ADVICE : conseil priorisé sur le limiteur primaire
  const keyAdvice = (() => {
    const primary = unifiedLimiter?.primaryLimiter;
    if (!primary) return "Maintiens ta régularité et écoute les signaux de ton corps.";
    const map: Record<string, string> = {
      aerobic_engine: "Concentre-toi sur des séances longues à intensité modérée pour développer ton moteur aérobie.",
      glycolytic_excess: "Réduis l'intensité haute la semaine et privilégie l'endurance fondamentale.",
      glycolytic_deficit: "Intègre des intervalles courts et intenses pour stimuler ta capacité anaérobie.",
      fatigue: "Priorité absolue à la récupération : sommeil, alimentation, et baisse temporaire du volume.",
      durability: "Augmente progressivement la durée de tes sorties longues pour gagner en endurance spécifique.",
      power: "Travaille la force et les sprints courts pour développer ta puissance maximale.",
      economy: "Travaille la technique de course (cadence, posture) pour améliorer ton économie.",
      nutrition: "Ajuste ta stratégie alimentaire — la disponibilité énergétique conditionne tout le reste.",
    };
    return map[String(primary)] || "Travaille spécifiquement ton limiteur principal avant tout autre axe.";
  })();

  // 6) NUTRITION
  const choPerH = nutritionV2?.carbsCentral
    ?? (nutritionEstimate ? Math.round((nutritionEstimate.carbsMin + nutritionEstimate.carbsMax) / 2) : null);
  const nutritionMessage = choPerH
    ? `Vise environ ${Math.round(choPerH)} g de glucides par heure d'effort soutenu, avec une bonne hydratation.`
    : "Couvre tes besoins en glucides à l'entraînement long et soigne l'hydratation au quotidien.";

  // 7) CONFIDENCE : basé sur la complétude et la confiance du Potentiel
  const completudeScore = completude?.score ?? 0;
  const ppConfidence = potentielPhysiologique?.confidence ?? 0;
  const overallConf = (completudeScore / 100 + ppConfidence) / 2;
  const confidenceMessage = overallConf >= 0.7
    ? "Tes données sont fiables — tu peux te baser sur ces conclusions en confiance."
    : overallConf >= 0.4
    ? "Quelques données manquent encore — ajoute des tests pour affiner le diagnostic."
    : "Diagnostic exploratoire — réalise tes tests prioritaires pour gagner en précision.";

  // ═══ Enrichissements ═══
  const { effectiveRefs, fatmaxTFCL, ambition, lorangResult, athlete, tests } = payload as any;
  const snap: any = effectiveSnapshot ?? {};

  const physioMetrics: PhysioMetricRow[] = [];
  const ftp = effectiveRefs?.ftp ?? null;
  const poids = snap?.poids ?? null;
  const ftpKg = ftp && poids ? ftp / poids : null;
  const vo2 = snap?.vo2max ?? null;
  const vmaVal = effectiveRefs?.vma ?? null;
  const vlamaxVal = vlamax?.value ?? null;
  const tteMin = (tte as any)?.tte_min ?? null;
  const fatmaxVal = fatmaxTFCL?.fatmaxPower ?? snap?.fatmax ?? null;

  if (ftp !== null) physioMetrics.push({ label: "FTP", value: `${Math.round(ftp)} W`, context: "Puissance soutenue ~1h", status: "info" });
  if (ftpKg !== null) {
    const tgt = ambition?.targets?.ftp_kg_min ?? null;
    physioMetrics.push({
      label: "FTP / kg",
      value: `${ftpKg.toFixed(2)} W/kg`,
      context: tgt ? `Cible ≥ ${tgt.toFixed(1)}` : "Indicateur clé endurance",
      status: tgt ? (ftpKg >= tgt ? "ok" : ftpKg >= tgt * 0.9 ? "warn" : "low") : "info",
    });
  }
  if (vo2 !== null) physioMetrics.push({ label: "VO₂max", value: `${vo2.toFixed(1)} ml/kg/min`, context: "Plafond aérobie", status: "info" });
  if (vlamaxVal !== null) {
    const t = ambition?.targets?.vlamax;
    const inZone = t ? vlamaxVal >= t.min && vlamaxVal <= t.max : true;
    physioMetrics.push({
      label: "VLamax",
      value: `${vlamaxVal.toFixed(2)} mmol/L/s`,
      context: t ? `Cible ${t.min.toFixed(2)}–${t.max.toFixed(2)}` : "Capacité glycolytique",
      status: inZone ? "ok" : "warn",
    });
  }
  if (tteMin !== null) {
    const tgt = ambition?.targets?.tte_min ?? null;
    physioMetrics.push({
      label: "TTE @ FTP",
      value: `${Math.round(tteMin)} min`,
      context: tgt ? `Cible ≥ ${Math.round(tgt)} min` : "Endurance au seuil",
      status: tgt ? (tteMin >= tgt ? "ok" : tteMin >= tgt * 0.85 ? "warn" : "low") : "info",
    });
  }
  if (fatmaxVal !== null) physioMetrics.push({ label: "FatMax", value: `${Math.round(Number(fatmaxVal))} W`, context: "Pic d'oxydation lipidique", status: "info" });
  if (vmaVal !== null) physioMetrics.push({ label: "VMA", value: `${vmaVal.toFixed(1)} km/h`, context: "Vitesse aérobie max", status: "info" });
  if (poids !== null) physioMetrics.push({ label: "Poids", value: `${poids.toFixed(1)} kg`, context: "Référence corporelle", status: "info" });

  const axisRow = (label: string, score: number | null | undefined, emoji: string): CompassAxisRow | null => {
    if (score === null || score === undefined) return null;
    const s = Math.round(score);
    const comment = s >= 75 ? "Excellent" : s >= 60 ? "Bon niveau" : s >= 45 ? "À développer" : "Priorité de travail";
    return { label, score: s, emoji, comment };
  };
  const compassAxes: CompassAxisRow[] = [
    axisRow("Capacité aérobie", aerobic, "🫁"),
    axisRow("Profil métabolique", metabolic, "⚗️"),
    axisRow("Tolérance à l'effort", endurance, "⏱️"),
    axisRow("Robustesse / Fraîcheur", robust, "🛡️"),
  ].filter(Boolean) as CompassAxisRow[];

  const tss7d = snap?.tss_7j ?? snap?.tss_7d ?? null;
  const trainingLoad = (() => {
    if (tss7d === null || tss7d === undefined) {
      return { tss7d: null, label: "Non renseigné", detail: "Ajoute ta charge récente pour un diagnostic plus fin.", status: "info" as const };
    }
    const t = Number(tss7d);
    if (t < 200) return { tss7d: t, label: "Charge basse", detail: "Volume hebdo réduit — bon moment pour relancer la régularité.", status: "low" as const };
    if (t < 400) return { tss7d: t, label: "Charge modérée", detail: "Volume équilibré, soutenable sur la durée.", status: "ok" as const };
    if (t < 600) return { tss7d: t, label: "Charge élevée", detail: "Volume soutenu — surveille la récupération.", status: "warn" as const };
    return { tss7d: t, label: "Charge très élevée", detail: "Volume haut — risque d'accumulation, prévois une décharge.", status: "warn" as const };
  })();

  const ambitionProgress: AmbitionProgressRow[] = (ambition?.allTargets ?? [])
    .slice(0, 4)
    .map((a: any) => ({
      label: a.label,
      icon: a.icon,
      progressPct: Math.round(((a.progress?.global ?? 0) as number) * 100),
      isReached: !!a.isReached,
      weeksToReach: a.weeksToReach ?? null,
    }));

  const nextActions: NextActionRow[] = (lorangResult?.activatedLevers ?? [])
    .slice(0, 3)
    .map((lev: any) => ({
      label: lev.label || String(lev.lever),
      why: lev.reason || (Array.isArray(lev.prescription) ? lev.prescription[0] : "") || "",
    }));

  const prohibitions: string[] = (lorangResult?.prohibitions ?? [])
    .map((p: any) => p?.label || "")
    .filter((s: string) => !!s);

  const recentTests = ((tests as any[]) || [])
    .filter((t: any) => t?.athlete_id === athlete.id)
    .sort((a: any, b: any) => String(b?.created_at || "").localeCompare(String(a?.created_at || "")))
    .slice(0, 3)
    .map((t: any) => ({
      name: String(t?.name || t?.type || "Test"),
      date: dtStr(t?.created_at),
    }));

  return {
    score, scoreColor, scoreText, mainMessage,
    wellPrepared, toWatch, keyAdvice,
    nutritionMessage, confidenceMessage,
    physioMetrics, compassAxes, trainingLoad,
    ambitionProgress,
    ambitionLabel: ambition?.label ?? "—",
    nextActions, prohibitions,
    goalLabel: getObjectifLabel(athlete?.goal ?? null),
    recentTests,
  };
}

// =============================================
// SECTIONS ENRICHIES — partagées Athlete & Beginner
// =============================================
const STATUS_DOT: Record<string, string> = {
  ok: "#16a34a", warn: "#ea580c", low: "#dc2626", info: "#3b82f6",
};

function buildAthleteEnrichedSectionsHTML(r: AthleteReadinessReport): string {
  const physioRows = r.physioMetrics.length === 0 ? "" : r.physioMetrics.map(m => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;gap:12px;">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;">
        <span style="width:8px;height:8px;border-radius:50%;background:${STATUS_DOT[m.status] || '#94a3b8'};display:inline-block;flex:none;"></span>
        <div style="min-width:0;">
          <div style="font-weight:600;color:#0f172a;font-size:14px;">${htmlEscape(m.label)}</div>
          <div style="font-size:12px;color:#64748b;">${htmlEscape(m.context)}</div>
        </div>
      </div>
      <div style="font-weight:700;color:#0f172a;font-size:15px;white-space:nowrap;">${htmlEscape(m.value)}</div>
    </div>
  `).join('');

  const compassRows = r.compassAxes.length === 0 ? "" : r.compassAxes.map(a => `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:14px;color:#0f172a;font-weight:600;">${a.emoji} ${htmlEscape(a.label)}</span>
        <span style="font-size:13px;color:#475569;">${a.score}/100 — ${htmlEscape(a.comment)}</span>
      </div>
      <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
        <div style="width:${a.score}%;height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);"></div>
      </div>
    </div>
  `).join('');

  const ambitionRows = r.ambitionProgress.length === 0 ? "" : r.ambitionProgress.map(a => `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">
        <span style="color:#0f172a;font-weight:600;">${a.icon} ${htmlEscape(a.label)}</span>
        <span style="color:#475569;">${a.isReached ? '✅ Atteint' : `${a.progressPct}%${a.weeksToReach ? ` · ~${a.weeksToReach} sem.` : ''}`}</span>
      </div>
      <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
        <div style="width:${Math.min(100, a.progressPct)}%;height:100%;background:${a.isReached ? '#16a34a' : '#f59e0b'};"></div>
      </div>
    </div>
  `).join('');

  const actionsHTML = r.nextActions.length === 0 ? "" : r.nextActions.map((n, i) => `
    <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
      <div style="flex:none;width:28px;height:28px;border-radius:50%;background:#3b82f6;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:13px;">${i + 1}</div>
      <div style="min-width:0;">
        <div style="font-weight:600;color:#0f172a;font-size:14px;">${htmlEscape(n.label)}</div>
        ${n.why ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${htmlEscape(n.why)}</div>` : ''}
      </div>
    </div>
  `).join('');

  const prohibitionsHTML = r.prohibitions.length === 0 ? "" : `
    <div style="margin-top:12px;padding:12px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;">
      <div style="font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">🚫 À éviter cette période</div>
      <div style="font-size:13px;color:#7f1d1d;">${r.prohibitions.map(htmlEscape).join(' · ')}</div>
    </div>
  `;

  const tlColor = STATUS_DOT[r.trainingLoad.status] || '#94a3b8';
  const trainingLoadHTML = `
    <div style="display:flex;align-items:center;gap:14px;padding:14px;background:#f8fafc;border-radius:12px;">
      <div style="flex:none;width:48px;height:48px;border-radius:50%;background:${tlColor}20;border:2px solid ${tlColor};display:flex;align-items:center;justify-content:center;font-weight:700;color:${tlColor};">
        ${r.trainingLoad.tss7d !== null ? Math.round(r.trainingLoad.tss7d) : '—'}
      </div>
      <div style="min-width:0;">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">TSS 7 jours</div>
        <div style="font-weight:700;color:#0f172a;font-size:15px;">${htmlEscape(r.trainingLoad.label)}</div>
        <div style="font-size:12px;color:#475569;margin-top:2px;">${htmlEscape(r.trainingLoad.detail)}</div>
      </div>
    </div>
  `;

  const testsHTML = r.recentTests.length === 0 ? "" : `
    <div style="margin-top:12px;padding:12px;background:#f1f5f9;border-radius:8px;">
      <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Tests récents</div>
      ${r.recentTests.map(t => `<div style="font-size:13px;color:#0f172a;">• ${htmlEscape(t.name)} <span style="color:#64748b;">— ${htmlEscape(t.date)}</span></div>`).join('')}
    </div>
  `;

  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <h2 style="font-size:18px;font-weight:700;color:#0f172a;">🎯 Mon objectif & ambition</h2>
        <span style="font-size:13px;color:#475569;">${htmlEscape(r.ambitionLabel)}</span>
      </div>
      <div style="font-size:14px;color:#475569;margin-bottom:14px;">Objectif visé : <b style="color:#0f172a;">${htmlEscape(r.goalLabel)}</b></div>
      ${ambitionRows || '<div style="color:#94a3b8;font-size:13px;">Pas de progression d\'ambition disponible.</div>'}
    </div>

    ${physioRows ? `
    <div class="card">
      <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:12px;">📊 Mes chiffres physiologiques</h2>
      ${physioRows}
      <div style="font-size:11px;color:#94a3b8;margin-top:10px;font-style:italic;">Le point coloré indique le statut vs ta cible (vert = OK, orange = à surveiller, rouge = sous-cible).</div>
    </div>` : ''}

    ${compassRows ? `
    <div class="card">
      <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:14px;">🧭 Mes 4 piliers</h2>
      ${compassRows}
    </div>` : ''}

    <div class="card">
      <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:12px;">🏋️ Charge d'entraînement</h2>
      ${trainingLoadHTML}
      ${testsHTML}
    </div>

    ${actionsHTML ? `
    <div class="card">
      <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">🚀 Mes prochaines actions</h2>
      <div style="font-size:13px;color:#64748b;margin-bottom:8px;">Priorités issues de ton limiteur principal.</div>
      ${actionsHTML}
      ${prohibitionsHTML}
    </div>` : ''}
  `;
}

function buildBeginnerEnrichedSectionsHTML(r: AthleteReadinessReport): string {
  // Mini-glossaire ultra-pédagogique : explication courte + exemple concret
  const BEGINNER_EXPLAINER: Record<string, { what: string; example: string; analogy?: string }> = {
    "FTP": {
      what: "C'est la puissance maximale que tu peux tenir environ 1 heure à vélo.",
      example: "Ex : un FTP de 250 W = tu peux pédaler à 250 W pendant ~1h sans craquer.",
      analogy: "🚗 C'est ton 'régime de croisière confortable mais soutenu'.",
    },
    "FTP/kg": {
      what: "Ta puissance par kilo de corps. Plus c'est haut, mieux ça monte.",
      example: "Ex : 280 W / 70 kg = 4.0 W/kg, niveau bon amateur. 5+ W/kg = niveau pro.",
      analogy: "⛰️ C'est le rapport poids/puissance d'une voiture en montagne.",
    },
    "VLamax": {
      what: "Ta vitesse à produire de l'énergie 'rapide' (sucre + lactate).",
      example: "Ex : sprinteur ~0.7 mmol/L/s, marathonien ~0.25. Pour l'endurance longue, plus bas = mieux.",
      analogy: "💥 C'est ton turbo : utile court, pénalisant long.",
    },
    "TTE": {
      what: "Combien de temps tu tiens à ton seuil avant de craquer.",
      example: "Ex : TTE 45 min = tu maintiens ton FTP 45 min. Au-delà de 40 min, c'est très bon.",
      analogy: "⏱️ C'est ton 'autonomie' à régime soutenu.",
    },
    "VO2max": {
      what: "Le volume max d'oxygène que ton corps peut utiliser. Ton plafond aérobie.",
      example: "Ex : 55 ml/kg/min = bon amateur, 70+ = niveau élite.",
      analogy: "🫁 C'est la cylindrée de ton moteur.",
    },
    "VMA": {
      what: "Ta vitesse de course quand tu atteins ta VO2max.",
      example: "Ex : VMA 18 km/h → tu peux la tenir ~6 min en course à pied.",
      analogy: "🏃 C'est ta vitesse de pointe 'aérobie'.",
    },
    "FatMax": {
      what: "L'intensité où tu brûles le plus de graisses (et économises ton sucre).",
      example: "Ex : FatMax 180 W = idéal pour les sorties longues d'endurance.",
      analogy: "🔥 C'est ton 'mode économie de carburant'.",
    },
  };

  const findExplainer = (label: string) => {
    const key = Object.keys(BEGINNER_EXPLAINER).find(k => label.toLowerCase().includes(k.toLowerCase()));
    return key ? BEGINNER_EXPLAINER[key] : null;
  };

  const physioRows = r.physioMetrics.length === 0 ? "" : r.physioMetrics.map(m => {
    const exp = findExplainer(m.label);
    const explainerHTML = exp ? `
      <div style="margin-top:10px;padding:10px 12px;background:#f0f9ff;border-left:3px solid #3b82f6;border-radius:8px;">
        <div style="font-size:12px;color:#1e40af;font-weight:700;margin-bottom:4px;">💡 C'est quoi ?</div>
        <div style="font-size:13px;color:#0f172a;line-height:1.5;">${htmlEscape(exp.what)}</div>
        <div style="font-size:12px;color:#475569;margin-top:6px;font-style:italic;">${htmlEscape(exp.example)}</div>
        ${exp.analogy ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">${htmlEscape(exp.analogy)}</div>` : ''}
      </div>
    ` : '';
    return `
      <li style="padding:14px 0;border-bottom:1px dashed #e5e7eb;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <span style="width:10px;height:10px;border-radius:50%;background:${STATUS_DOT[m.status] || '#94a3b8'};display:inline-block;flex:none;"></span>
            <div style="min-width:0;">
              <div style="font-weight:700;color:#0f172a;font-size:15px;">${htmlEscape(m.label)}</div>
              <div style="font-size:13px;color:#64748b;">${htmlEscape(m.context)}</div>
            </div>
          </div>
          <div style="font-weight:800;color:#0f172a;font-size:16px;white-space:nowrap;">${htmlEscape(m.value)}</div>
        </div>
        ${explainerHTML}
      </li>
    `;
  }).join('');

  // Explications pour les 4 piliers (Compass)
  const COMPASS_EXPLAINER: Record<string, string> = {
    "aérobie": "🫁 Capacité de ton corps à utiliser l'oxygène. Ex : tenir une longue sortie sans s'essouffler.",
    "métabolique": "⚡ Équilibre entre énergie 'rapide' (sucre) et 'lente' (graisse). Ex : ne pas exploser à mi-course.",
    "endurance": "⏱️ Aptitude à tenir l'effort dans la durée. Ex : finir aussi fort que tu as commencé.",
    "robustesse": "💪 Résistance à la fatigue et à la blessure. Ex : enchaîner les semaines sans casser.",
  };
  const findCompassExplainer = (label: string) => {
    const key = Object.keys(COMPASS_EXPLAINER).find(k => label.toLowerCase().includes(k));
    return key ? COMPASS_EXPLAINER[key] : null;
  };

  const compassRows = r.compassAxes.length === 0 ? "" : r.compassAxes.map(a => {
    const exp = findCompassExplainer(a.label);
    return `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:15px;color:#0f172a;font-weight:700;">${a.emoji} ${htmlEscape(a.label)}</span>
        <span style="font-size:13px;color:#475569;font-weight:600;">${a.score}/100</span>
      </div>
      <div style="height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;">
        <div style="width:${a.score}%;height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);"></div>
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">${htmlEscape(a.comment)}</div>
      ${exp ? `<div style="font-size:12px;color:#1e40af;margin-top:6px;padding:8px 10px;background:#eff6ff;border-radius:6px;line-height:1.5;">${htmlEscape(exp)}</div>` : ''}
    </div>
  `;
  }).join('');

  const ambitionRows = r.ambitionProgress.length === 0 ? "" : r.ambitionProgress.map(a => `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
        <span style="color:#0f172a;font-weight:700;">${a.icon} ${htmlEscape(a.label)}</span>
        <span style="color:#475569;font-weight:600;">${a.isReached ? '✅ Atteint' : `${a.progressPct}%${a.weeksToReach ? ` · ~${a.weeksToReach} sem.` : ''}`}</span>
      </div>
      <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
        <div style="width:${Math.min(100, a.progressPct)}%;height:100%;background:${a.isReached ? '#16a34a' : '#f59e0b'};"></div>
      </div>
    </div>
  `).join('');

  const actionsHTML = r.nextActions.length === 0 ? "" : r.nextActions.map((n, i) => `
    <div style="display:flex;gap:14px;padding:12px 0;border-bottom:1px dashed #e5e7eb;">
      <div style="flex:none;width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:14px;">${i + 1}</div>
      <div style="min-width:0;">
        <div style="font-weight:700;color:#0f172a;font-size:15px;">${htmlEscape(n.label)}</div>
        ${n.why ? `<div style="font-size:13px;color:#64748b;margin-top:3px;">${htmlEscape(n.why)}</div>` : ''}
      </div>
    </div>
  `).join('');

  const prohibitionsHTML = r.prohibitions.length === 0 ? "" : `
    <div style="margin-top:14px;padding:14px;background:#fef2f2;border-left:5px solid #dc2626;border-radius:12px;">
      <div style="font-size:13px;font-weight:800;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">🚫 À éviter cette période</div>
      <div style="font-size:14px;color:#7f1d1d;">${r.prohibitions.map(htmlEscape).join(' · ')}</div>
    </div>
  `;

  const tlColor = STATUS_DOT[r.trainingLoad.status] || '#94a3b8';
  const trainingLoadHTML = `
    <div style="display:flex;align-items:center;gap:16px;padding:16px;background:#f8fafc;border-radius:14px;">
      <div style="flex:none;width:60px;height:60px;border-radius:50%;background:${tlColor}20;border:3px solid ${tlColor};display:flex;align-items:center;justify-content:center;font-weight:800;color:${tlColor};font-size:18px;">
        ${r.trainingLoad.tss7d !== null ? Math.round(r.trainingLoad.tss7d) : '—'}
      </div>
      <div style="min-width:0;">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Charge cette semaine (TSS 7j)</div>
        <div style="font-weight:800;color:#0f172a;font-size:17px;">${htmlEscape(r.trainingLoad.label)}</div>
        <div style="font-size:13px;color:#475569;margin-top:3px;">${htmlEscape(r.trainingLoad.detail)}</div>
      </div>
    </div>
    <div style="margin-top:10px;padding:10px 12px;background:#f0f9ff;border-left:3px solid #3b82f6;border-radius:8px;">
      <div style="font-size:12px;color:#1e40af;font-weight:700;margin-bottom:4px;">💡 C'est quoi le TSS ?</div>
      <div style="font-size:13px;color:#0f172a;line-height:1.5;">Le TSS (Training Stress Score) mesure la "fatigue" accumulée sur 7 jours.</div>
      <div style="font-size:12px;color:#475569;margin-top:4px;font-style:italic;">Ex : 1h à fond = 100 TSS · &lt; 300/sem = light · 400-700 = solide · &gt; 800 = lourd, attention récup.</div>
    </div>
  `;

  return `
    <div class="section">
      <div class="section-header"><span class="emoji">🎯</span><h2>Mon objectif</h2></div>
      <div style="font-size:15px;color:#475569;margin-bottom:12px;">Tu prépares : <b style="color:#0f172a;">${htmlEscape(r.goalLabel)}</b> — ambition <b style="color:#0f172a;">${htmlEscape(r.ambitionLabel)}</b>.</div>
      ${ambitionRows || '<div style="color:#94a3b8;font-size:13px;">Pas encore de cibles d\'ambition disponibles.</div>'}
      <div class="explain-box" style="margin-top:14px;">
        <span class="label">📚 C'est quoi ?</span>
        <p>Chaque barre montre où tu en es par rapport à un niveau cible. Plus la barre est remplie, plus tu te rapproches.</p>
      </div>
    </div>

    ${physioRows ? `
    <div class="section">
      <div class="section-header"><span class="emoji">📊</span><h2>Mes chiffres clés</h2></div>
      <ul style="list-style:none;">${physioRows}</ul>
      <div class="explain-box" style="margin-top:12px;">
        <span class="label">📚 Comment lire ?</span>
        <p>🟢 Vert = dans la cible. 🟠 Orange = à surveiller. 🔴 Rouge = priorité. 🔵 Bleu = info.</p>
      </div>
    </div>` : ''}

    ${compassRows ? `
    <div class="section">
      <div class="section-header"><span class="emoji">🧭</span><h2>Mes 4 piliers</h2></div>
      ${compassRows}
      <div class="explain-box">
        <span class="label">📚 À quoi ça sert ?</span>
        <p>Ces 4 jauges résument ton corps sur les axes essentiels. L'idée : faire monter celles qui sont les plus basses.</p>
      </div>
    </div>` : ''}

    <div class="section">
      <div class="section-header"><span class="emoji">🏋️</span><h2>Ma charge récente</h2></div>
      ${trainingLoadHTML}
    </div>

    ${actionsHTML ? `
    <div class="section">
      <div class="section-header"><span class="emoji">🚀</span><h2>Mes prochaines actions</h2></div>
      <div style="font-size:13px;color:#64748b;margin-bottom:8px;">Voici les leviers prioritaires pour avancer :</div>
      ${actionsHTML}
      ${prohibitionsHTML}
      <div class="explain-box" style="margin-top:14px;">
        <span class="label">📚 Comment l'appliquer ?</span>
        <p>Chaque action correspond à un type de séance concret. Ex : "Travailler le seuil" = 2×20 min à 90-95% FTP, 1×/sem. "Endurance fondamentale" = 1h30-2h en Z2 (tu peux parler en pédalant).</p>
      </div>
    </div>` : ''}
  `;
}

function buildAthleteReportHTML(payload: ExportPayload, logoBase64: string): string {
  const { athlete } = payload;
  const athleteReport = buildAthleteReadinessFromPayload(payload);

  const scoreColors: Record<string, { bg: string; border: string; text: string }> = {
    green: { bg: "#dcfce7", border: "#16a34a", text: "#166534" },
    orange: { bg: "#fed7aa", border: "#ea580c", text: "#9a3412" },
    red: { bg: "#fecaca", border: "#dc2626", text: "#991b1b" },
  };
  
  const colors = scoreColors[athleteReport.scoreColor] || scoreColors.orange;
  
  const wellPreparedHTML = athleteReport.wellPrepared.map(item => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
      <span style="color:#16a34a;font-size:18px;">✓</span>
      <span>${htmlEscape(item)}</span>
    </div>
  `).join('');
  
  const toWatchHTML = athleteReport.toWatch.length > 0 ? athleteReport.toWatch.map(item => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
      <span style="color:#ea580c;font-size:18px;">⚠</span>
      <span>${htmlEscape(item)}</span>
    </div>
  `).join('') : '<div style="color:#666;padding:8px 0;">Aucun point d\'attention majeur</div>';
  
  const reportDate = new Date().toLocaleDateString("fr-FR", { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mon État de Forme — ${htmlEscape(athlete.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          min-height: 100vh;
          padding: 40px 20px;
          line-height: 1.6;
          color: #1e293b;
        }
        
        .container {
          max-width: 700px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .header img {
          height: 50px;
          margin-bottom: 10px;
        }
        
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }
        
        .header .subtitle {
          font-size: 14px;
          color: #64748b;
        }
        
        .header .athlete-name {
          display: inline-block;
          background: #f1f5f9;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          margin-top: 12px;
        }
        
        .card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .main-message {
          background: ${colors.bg};
          border: 2px solid ${colors.border};
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 24px;
        }
        
        .main-message p {
          font-size: 20px;
          font-weight: 600;
          color: ${colors.text};
        }
        
        .score-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding: 20px 0;
          margin-bottom: 24px;
        }
        
        .score-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: ${colors.border};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px -5px ${colors.border}40;
        }
        
        .score-circle span {
          font-size: 32px;
          font-weight: 700;
          color: white;
        }
        
        .score-text {
          text-align: center;
        }
        
        .score-text p {
          font-size: 18px;
          font-weight: 600;
          color: ${colors.text};
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #0f172a;
        }
        
        .section-title .icon {
          font-size: 22px;
        }
        
        .divider {
          height: 1px;
          background: #e2e8f0;
          margin: 24px 0;
        }
        
        .advice-card {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-radius: 12px;
          padding: 20px;
          margin-top: 16px;
        }
        
        .advice-card .label {
          font-size: 12px;
          font-weight: 600;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .advice-card p {
          font-size: 16px;
          font-weight: 500;
          color: #1e40af;
        }
        
        .nutrition-card {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 12px;
          padding: 20px;
        }
        
        .nutrition-card .icon {
          font-size: 24px;
          margin-bottom: 8px;
        }
        
        .nutrition-card .label {
          font-size: 12px;
          font-weight: 600;
          color: #b45309;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .nutrition-card p {
          font-size: 15px;
          color: #92400e;
        }
        
        .confidence-section {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin-top: 20px;
        }
        
        .confidence-section .icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        
        .confidence-section p {
          font-size: 16px;
          color: #166534;
          font-weight: 500;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          padding: 20px;
          color: #64748b;
          font-size: 12px;
        }
        
        @media print {
          body { background: white; padding: 20px; }
          .card { box-shadow: none; border: 1px solid #e2e8f0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Two For Coaching Lab" />` : ''}
          <h1>Mon État de Forme</h1>
          <p class="subtitle">TWO FOR COACHING LAB™</p>
          <span class="athlete-name">${htmlEscape(athlete.name)}</span>
        </div>
        
        <div class="main-message">
          <p>${htmlEscape(athleteReport.mainMessage)}</p>
        </div>
        
        <div class="card">
          <div class="score-section">
            <div class="score-circle">
              <span>${athleteReport.score}%</span>
            </div>
            <div class="score-text">
              <p>${htmlEscape(athleteReport.scoreText)}</p>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="section-title">
            <span class="icon">✓</span>
            <span>Ce qui est bien préparé</span>
          </div>
          ${wellPreparedHTML}
          
          <div class="divider"></div>
          
          <div class="section-title">
            <span class="icon">⚠</span>
            <span>Ce qui doit être surveillé</span>
          </div>
          ${toWatchHTML}
          
          <div class="advice-card">
            <div class="label">💡 Conseil clé</div>
            <p>${htmlEscape(athleteReport.keyAdvice)}</p>
          </div>
        </div>
        
        ${buildAthleteEnrichedSectionsHTML(athleteReport)}
        
        <div class="card nutrition-card">
          <div class="icon">🍎</div>
          <div class="label">Nutrition</div>
          <p>${htmlEscape(athleteReport.nutritionMessage)}</p>
        </div>
        
        <div class="confidence-section">
          <div class="icon">💪</div>
          <p>${htmlEscape(athleteReport.confidenceMessage)}</p>
        </div>
        
        <div class="footer">
          <p>Rapport généré le ${reportDate}</p>
          <p style="margin-top:4px;">Two For Coaching Lab™ — Performance & Metabolic Analysis</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// =============================================
// RAPPORT DÉBUTANT — Ultra-pédagogique
// =============================================
function buildBeginnerReportHTML(payload: ExportPayload, logoBase64: string): string {
  const { athlete } = payload;
  const athleteReport = buildAthleteReadinessFromPayload(payload);

  const scoreColors: Record<string, { bg: string; border: string; text: string; emoji: string; verdict: string }> = {
    green: { bg: "#dcfce7", border: "#16a34a", text: "#166534", emoji: "🟢", verdict: "Tout est au vert !" },
    orange: { bg: "#fed7aa", border: "#ea580c", text: "#9a3412", emoji: "🟠", verdict: "Encore un petit effort" },
    red: { bg: "#fecaca", border: "#dc2626", text: "#991b1b", emoji: "🔴", verdict: "Il faut lever le pied" },
  };

  const colors = scoreColors[athleteReport.scoreColor] || scoreColors.orange;

  // Analogie pour le score
  const scoreAnalogy = (() => {
    const s = athleteReport.score;
    if (s >= 80) return "Imagine ton corps comme une voiture neuve, le plein d'essence fait, prête pour un long voyage.";
    if (s >= 60) return "Ton corps fonctionne bien, comme une voiture en bon état avec un peu de poussière à dépoussiérer.";
    if (s >= 40) return "Ton corps est en mode \"économie d'énergie\". Comme une voiture qui a besoin d'une révision avant un grand trajet.";
    return "Ton corps tire la langue. Comme une voiture sur le voyant rouge — il faut s'arrêter recharger.";
  })();

  const wellPreparedHTML = athleteReport.wellPrepared.length > 0 ? athleteReport.wellPrepared.map(item => `
    <li style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px dashed #e5e7eb;">
      <span style="font-size:22px;line-height:1;">👍</span>
      <span style="flex:1;font-size:15px;">${htmlEscape(item)}</span>
    </li>
  `).join('') : '<li style="color:#9ca3af;padding:10px 0;font-style:italic;">Pas encore de point fort identifié — continue à t\'entraîner régulièrement.</li>';

  const toWatchHTML = athleteReport.toWatch.length > 0 ? athleteReport.toWatch.map(item => `
    <li style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px dashed #e5e7eb;">
      <span style="font-size:22px;line-height:1;">👀</span>
      <span style="flex:1;font-size:15px;">${htmlEscape(item)}</span>
    </li>
  `).join('') : '<li style="color:#16a34a;padding:10px 0;">🎉 Aucun point d\'attention pour le moment — profite de cette belle forme !</li>';

  const reportDate = new Date().toLocaleDateString("fr-FR", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mon Rapport Tout Simple — ${htmlEscape(athlete.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #dbeafe 100%);
          min-height: 100vh;
          padding: 32px 16px;
          line-height: 1.7;
          color: #1e293b;
        }
        .container { max-width: 720px; margin: 0 auto; }

        .hero {
          background: white;
          border-radius: 24px;
          padding: 32px 24px;
          text-align: center;
          margin-bottom: 24px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15);
        }
        .hero img { height: 48px; margin-bottom: 12px; }
        .hero h1 {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .hero .welcome {
          font-size: 16px;
          color: #475569;
          margin-bottom: 16px;
        }
        .hero .athlete-chip {
          display: inline-block;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
          padding: 8px 20px;
          border-radius: 24px;
          font-size: 15px;
          font-weight: 600;
          box-shadow: 0 4px 12px -2px rgba(245,158,11,0.4);
        }

        .verdict-card {
          background: ${colors.bg};
          border: 3px solid ${colors.border};
          border-radius: 20px;
          padding: 28px 24px;
          text-align: center;
          margin-bottom: 24px;
        }
        .verdict-card .big-emoji { font-size: 56px; line-height: 1; margin-bottom: 12px; }
        .verdict-card .verdict-title {
          font-size: 24px;
          font-weight: 800;
          color: ${colors.text};
          margin-bottom: 8px;
        }
        .verdict-card .verdict-msg {
          font-size: 17px;
          color: ${colors.text};
          font-weight: 500;
        }

        .explain-box {
          background: white;
          border-left: 5px solid #6366f1;
          border-radius: 12px;
          padding: 18px 20px;
          margin: 20px 0;
          font-size: 15px;
          color: #1e293b;
        }
        .explain-box .label {
          display: inline-block;
          background: #6366f1;
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }

        .score-block {
          background: white;
          border-radius: 20px;
          padding: 28px 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 16px -4px rgba(0,0,0,0.08);
          text-align: center;
        }
        .score-circle {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${colors.border}, ${colors.text});
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          box-shadow: 0 12px 30px -8px ${colors.border}80;
        }
        .score-circle span { font-size: 42px; font-weight: 800; color: white; }
        .score-label {
          font-size: 14px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .score-text { font-size: 18px; color: #0f172a; font-weight: 600; }

        .section {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px -4px rgba(0,0,0,0.08);
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #f1f5f9;
        }
        .section-header .emoji { font-size: 28px; }
        .section-header h2 {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }
        .section ul { list-style: none; }

        .advice-big {
          background: linear-gradient(135deg, #ddd6fe 0%, #fbcfe8 100%);
          border-radius: 20px;
          padding: 28px 24px;
          margin-bottom: 24px;
          text-align: center;
        }
        .advice-big .lightbulb { font-size: 48px; margin-bottom: 12px; }
        .advice-big .label {
          font-size: 12px;
          font-weight: 700;
          color: #7c3aed;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .advice-big p {
          font-size: 18px;
          font-weight: 600;
          color: #4c1d95;
          line-height: 1.5;
        }

        .glossary {
          background: #f8fafc;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
        }
        .glossary h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .gloss-item {
          padding: 10px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .gloss-item:last-child { border-bottom: none; }
        .gloss-term {
          font-weight: 700;
          color: #0f172a;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .gloss-def {
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
        }

        .nutri-card {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 20px;
          text-align: center;
        }
        .nutri-card .icon { font-size: 40px; margin-bottom: 8px; }
        .nutri-card .label {
          font-size: 12px;
          font-weight: 700;
          color: #b45309;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .nutri-card p { font-size: 16px; color: #78350f; font-weight: 500; }

        .encouragement {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
          margin-bottom: 24px;
        }
        .encouragement .icon { font-size: 56px; margin-bottom: 12px; }
        .encouragement p {
          font-size: 18px;
          color: #065f46;
          font-weight: 600;
          line-height: 1.5;
        }

        .footer {
          text-align: center;
          padding: 20px;
          color: #64748b;
          font-size: 12px;
        }
        .footer .pill {
          display: inline-block;
          background: white;
          padding: 6px 14px;
          border-radius: 12px;
          margin-top: 8px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        @media print {
          body { background: white; padding: 16px; }
          .hero, .section, .score-block, .glossary, .nutri-card { box-shadow: none; border: 1px solid #e2e8f0; }
          .verdict-card, .advice-big, .encouragement { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="hero">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Two For Coaching Lab" />` : ''}
          <h1>Mon Rapport Tout Simple 🌟</h1>
          <p class="welcome">Voici comment ton corps va aujourd'hui — expliqué simplement.</p>
          <span class="athlete-chip">👋 Salut ${htmlEscape(athlete.name)} !</span>
        </div>

        <div class="verdict-card">
          <div class="big-emoji">${colors.emoji}</div>
          <div class="verdict-title">${colors.verdict}</div>
          <div class="verdict-msg">${htmlEscape(athleteReport.mainMessage)}</div>
        </div>

        <div class="score-block">
          <div class="score-label">Ta forme du jour</div>
          <div class="score-circle"><span>${athleteReport.score}%</span></div>
          <div class="score-text">${htmlEscape(athleteReport.scoreText)}</div>
          <div class="explain-box" style="text-align:left;margin-top:20px;">
            <span class="label">📚 C'est quoi ce score ?</span>
            <p>Ce chiffre, c'est une note sur 100 qui résume ton état général. Plus c'est haut, mieux ton corps est prêt à s'entraîner. ${scoreAnalogy}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <span class="emoji">💪</span>
            <h2>Tes points forts</h2>
          </div>
          <ul>${wellPreparedHTML}</ul>
          <div class="explain-box">
            <span class="label">📚 Pourquoi c'est important ?</span>
            <p>Ce sont les zones où ton corps répond bien. Continue ce que tu fais sur ces aspects — c'est exactement ce qu'il faut !</p>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <span class="emoji">🔍</span>
            <h2>À garder à l'œil</h2>
          </div>
          <ul>${toWatchHTML}</ul>
          <div class="explain-box">
            <span class="label">📚 Pourquoi c'est important ?</span>
            <p>Ce ne sont pas des problèmes, juste des signaux que ton corps t'envoie. En y prêtant attention, tu éviteras la fatigue ou les blessures.</p>
          </div>
        </div>

        <div class="advice-big">
          <div class="lightbulb">💡</div>
          <div class="label">Le conseil du jour</div>
          <p>${htmlEscape(athleteReport.keyAdvice)}</p>
        </div>

        ${buildBeginnerEnrichedSectionsHTML(athleteReport)}

        <div class="nutri-card">
          <div class="icon">🍎</div>
          <div class="label">Et niveau alimentation ?</div>
          <p>${htmlEscape(athleteReport.nutritionMessage)}</p>
        </div>

        <div class="glossary">
          <h3>📖 Petit lexique pour comprendre</h3>
          <div class="gloss-item">
            <div class="gloss-term">Forme du jour</div>
            <div class="gloss-def">Une note sur 100 qui dit si ton corps est prêt pour un effort. Plus c'est haut, mieux c'est.</div>
          </div>
          <div class="gloss-item">
            <div class="gloss-term">Récupération</div>
            <div class="gloss-def">Le temps que ton corps prend pour se réparer après un entraînement. Sans elle, pas de progrès.</div>
          </div>
          <div class="gloss-item">
            <div class="gloss-term">Endurance</div>
            <div class="gloss-def">La capacité à tenir un effort longtemps sans s'épuiser. C'est ton "moteur" longue distance.</div>
          </div>
          <div class="gloss-item">
            <div class="gloss-term">Charge d'entraînement</div>
            <div class="gloss-def">La quantité totale d'effort fourni récemment. Trop = fatigue. Pas assez = pas de progrès.</div>
          </div>
        </div>

        <div class="encouragement">
          <div class="icon">🚀</div>
          <p>${htmlEscape(athleteReport.confidenceMessage)}</p>
        </div>

        <div class="footer">
          <div>Rapport généré le ${reportDate}</div>
          <div class="pill">Two For Coaching Lab™ — Ton coach au quotidien</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// =============================================
// COMPONENT
// =============================================

export function ExportTools({ athlete, snapshots, tests, checkins = [], staffMode = false, ambition = DEFAULT_AMBITION, calibrationEvidences = [], open: controlledOpen, onOpenChange }: ExportToolsProps) {
  // Charger les sections depuis le localStorage via la fonction utilitaire
  const [sections, setSections] = useState<ReportSections>(getSectionVisibility);
  
  // Persister les sections
  useEffect(() => {
    localStorage.setItem("vlab-export-sections", JSON.stringify(sections));
  }, [sections]);
  
  // Records de course réels (fenêtre 12 mois par défaut) — activent le recalage
  // Riegel dans computePerformancePredictions. Sans records ⇒ prédiction physio pure.
  const activeSnapshotForRecords = getEffectiveSnapshot(athlete, snapshots);
  const vmaForRecords = activeSnapshotForRecords?.vma ?? null;
  const windowMonthsRefs = (athlete.refs as any)?.raceRecordsWindowMonths;
  const raceRecordsWindow = windowMonthsRefs === null ? null : (windowMonthsRefs ?? 12);
  const raceRecords = useAthleteRaceRecords(athlete.id, vmaForRecords, raceRecordsWindow);

  const payload = buildExportPayload(athlete, snapshots, tests, checkins, ambition);
  payload.raceRecords = raceRecords;
  const exportCheck = canExport(payload);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!exportCheck.ok) {
      toast.error("Export impossible", { description: exportCheck.reason });
      return;
    }
    
    if (isExporting) return;
    setIsExporting(true);
    
    const toastId = toast.loading("Ouverture de la version imprimable...", {
      description: "Un nouvel onglet va s’ouvrir."
    });
    
    try {
      // Convert logo to base64 for embedding in the PDF
      const logoBase64 = await imageToBase64(logoUrl);
      
      // Détecter le preset actif pour dériver l'audience
      const currentPresetKey: ReportPreset | null = (() => {
        const keys = Object.keys(sections) as (keyof ReportSections)[];
        for (const p of Object.keys(REPORT_PRESETS) as ReportPreset[]) {
          const ref = REPORT_PRESETS[p].sections;
          if (keys.every(k => !!sections[k] === !!ref[k])) return p;
        }
        return null;
      })();
      
      const exportOptions: ExportOptions = {
        sections,
        audience: currentPresetKey === "athlete" ? "athlete" : "staff",
      };
      
      const html = buildStaffGradeReportHTML(payload, logoBase64, exportOptions, calibrationEvidences);
      const fileName = `rapport-staff-${athlete.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;

      openPrintableHTML(html, {
        filenameHint: fileName,
        includeInstructions: true,
        autoPrint: false,
      });

      toast.success("Version imprimable ouverte", {
        id: toastId,
        description: "Utilisez Imprimer → Enregistrer en PDF (ou Ctrl/Cmd+P).",
        duration: 6000,
      });
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      toast.error("Erreur d'export", { 
        id: toastId,
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la génération du rapport." 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBeginnerPDF = async () => {
    if (!exportCheck.ok) {
      toast.error("Export impossible", { description: exportCheck.reason });
      return;
    }
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading("Préparation de ton rapport...", {
      description: "Un nouvel onglet va s'ouvrir."
    });
    try {
      const logoBase64 = await imageToBase64(logoUrl);
      const html = buildBeginnerReportHTML(payload, logoBase64);
      const fileName = `mon-rapport-simple-${athlete.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
      openPrintableHTML(html, {
        filenameHint: fileName,
        includeInstructions: true,
        autoPrint: false,
      });
      toast.success("Rapport ouvert", {
        id: toastId,
        description: "Utilise Imprimer → Enregistrer en PDF (ou Ctrl/Cmd+P).",
        duration: 6000,
      });
    } catch (error) {
      console.error("Erreur export Débutant:", error);
      toast.error("Erreur d'export", {
        id: toastId,
        description: error instanceof Error ? error.message : "Une erreur est survenue."
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAthletePDF = async () => {
    if (!exportCheck.ok) {
      toast.error("Export impossible", { description: exportCheck.reason });
      return;
    }
    
    if (isExporting) return;
    setIsExporting(true);
    
    const toastId = toast.loading("Ouverture du rapport imprimable...", {
      description: "Un nouvel onglet va s’ouvrir."
    });
    
    try {
      const logoBase64 = await imageToBase64(logoUrl);
      const html = buildAthleteReportHTML(payload, logoBase64);
      const fileName = `mon-etat-de-forme-${athlete.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;

      openPrintableHTML(html, {
        filenameHint: fileName,
        includeInstructions: true,
        autoPrint: false,
      });

      toast.success("Rapport ouvert", {
        id: toastId,
        description: "Utilisez Imprimer → Enregistrer en PDF (ou Ctrl/Cmd+P).",
        duration: 6000,
      });
    } catch (error) {
      console.error("Erreur lors de l'export Athlète:", error);
      toast.error("Erreur d'export", { 
        id: toastId,
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la génération du rapport." 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSection = (key: keyof ReportSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applyPreset = (preset: ReportPreset) => {
    setSections({ ...REPORT_PRESETS[preset].sections });
    toast.success(`Preset appliqué : ${REPORT_PRESETS[preset].label}`, {
      description: "Tu peux ajuster manuellement les sections ci-dessous.",
    });
  };

  // Détection du preset actif (match exact)
  const activePreset: ReportPreset | null = (() => {
    const keys = Object.keys(sections) as (keyof ReportSections)[];
    for (const p of Object.keys(REPORT_PRESETS) as ReportPreset[]) {
      const ref = REPORT_PRESETS[p].sections;
      if (keys.every(k => !!sections[k] === !!ref[k])) return p;
    }
    return null;
  })();


  const selectAll = () => {
    setSections(DEFAULT_REPORT_SECTIONS);
  };

  const deselectAll = () => {
    const allFalse: ReportSections = {
      synthese: false,
      compass: false,
      profilMetabolique: false,
      vlamaxZoneConfidence: false,
      runMLSSCoherence: false,
      indicateurs: false,
      pacingEnvelope: false,
      potentielPhysiologiqueRunning: false,
      injuryRisk: false,
      nutritionV2: false,
      fatmaxTFCL: false,
      ambitionTargets: false,
      ambitionPredictions: false,
      evolutionCharts: false,
      ageAdjustment: false,
      ambitionLegend: false,
      zones: false,
      historique: false,
      tests: false,
      testsCalibration: false,
      calibrationEvidence: false,
      fitImports: false,
      checkins: false,
      comprendre: false,
      qualite: false,
      roadmap: false,
      lactateCurve: false,
      substrateCurve: false,
      performancePrediction: false,
      facteursLimitants: false,
      leviersAction: false,
      cpWprimeWbal: false,
      lactateCorrespondence: false,
      cycleIntelligence: false,
    };
    setSections(allFalse);
  };

  const selectedCount = Object.values(sections).filter(Boolean).length;
  const totalCount = Object.keys(sections).length;

  if (!exportCheck.ok) {
    return (
      <Dialog open={controlledOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Export impossible</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
            <AlertCircle className="h-4 w-4" />
            <span>{exportCheck.reason}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={controlledOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Exporter le rapport</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="preview" className="w-full">
          <div className="border-b px-3 pt-3 pb-2">
            <p className="text-sm font-medium mb-2">Exporter le rapport</p>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="preview" className="text-xs gap-1.5">
                <Eye className="h-3 w-3" />
                Aperçu
              </TabsTrigger>
              <TabsTrigger value="sections" className="text-xs gap-1.5">
                <Settings2 className="h-3 w-3" />
                Sections ({selectedCount})
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Onglet Aperçu */}
          <TabsContent value="preview" className="mt-0 p-3 space-y-3">
            {/* Preview Panel */}
            <PDFPreviewPanel 
              sections={sections} 
              athleteName={athlete?.name}
            />
            
            {/* Boutons d'export */}
            <div className="space-y-2 pt-2 border-t">
              <Button
                variant="default"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="w-full justify-start gap-3 h-auto py-2.5"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                <div className="text-left flex-1">
                  <div className="font-medium text-sm">Rapport Staff</div>
                  <div className="text-[10px] opacity-80">Complet, technique, pour le coach</div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAthletePDF}
                disabled={isExporting}
                className="w-full justify-start gap-3 h-auto py-2.5"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
                <div className="text-left flex-1">
                  <div className="font-medium text-sm">Rapport Athlète</div>
                  <div className="text-[10px] text-muted-foreground">Simple, encourageant</div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportBeginnerPDF}
                disabled={isExporting}
                className="w-full justify-start gap-3 h-auto py-2.5"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-amber-500" />
                )}
                <div className="text-left flex-1">
                  <div className="font-medium text-sm">Rapport Découverte</div>
                  <div className="text-[10px] text-muted-foreground">Ultra-pédagogique, pour débutant</div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </Button>
            </div>
          </TabsContent>
          
          {/* Onglet Sections */}
          <TabsContent value="sections" className="mt-0 p-3 space-y-3">
            {/* ── Sélecteur de preset ── */}
            <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Preset
                </p>
                {activePreset && (
                  <span className="text-[10px] text-primary font-medium">
                    ● {REPORT_PRESETS[activePreset].label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(REPORT_PRESETS) as ReportPreset[]).map((p) => {
                  const preset = REPORT_PRESETS[p];
                  const isActive = activePreset === p;
                  return (
                    <button
                      key={p}
                      onClick={() => applyPreset(p)}
                      className={`text-left rounded-md border p-2 transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {p === "staff" ? <Shield className="h-3 w-3 text-primary" /> : <User className="h-3 w-3 text-primary" />}
                        <span className="text-xs font-semibold">{preset.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        {preset.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {Object.values(preset.sections).filter(Boolean).length} sections
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/80 leading-snug pt-0.5">
                Un preset est un point de départ — tu peux ajuster manuellement ci-dessous.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Sections ({selectedCount}/{totalCount})
              </p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-6 px-2">
                  Tout
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-6 px-2">
                  Rien
                </Button>
              </div>
            </div>
            
            
            <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1 border rounded-md p-2 bg-muted/20">
              {getSectionOrder().map((key) => (
                <div key={key} className="flex items-center justify-between py-1 px-1 hover:bg-muted/50 rounded transition-colors">
                  <Label 
                    htmlFor={`section-${key}`} 
                    className="text-xs cursor-pointer flex-1 truncate"
                  >
                    {SECTION_LABELS[key]}
                  </Label>
                  <Switch
                    id={`section-${key}`}
                    checked={sections[key]}
                    onCheckedChange={() => toggleSection(key)}
                    className="scale-75"
                  />
                </div>
              ))}
            </div>
            
            {/* Bouton export depuis l'onglet sections */}
            <Button
              variant="default"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isExporting ? "Génération en cours..." : "Générer le rapport Staff"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
