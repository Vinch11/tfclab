// =============================================
// OUTILS EXPORT PDF – RAPPORT STAFF-GRADE COMPLET
// Two For Coaching Lab – Performance & Metabolic Report
// =============================================

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileText, AlertCircle, Settings2, Eye, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PDFPreviewPanel } from "./PDFPreviewPanel";
import type { DbAthlete, DbSnapshot, DbTest, DbCheckin } from "@/hooks/useCloudData";
// ✅ NEW: Import Calibration Layer
import { 
  blendOutputs,
  computeModelOutputs,
  computeTestOutputs,
  type CalibrationResult,
  type TestData
} from "@/lib/calibration";
import { generateTestCalibrationSection, type TestCalibrationSection } from "@/lib/calibration/testCalibrationSection";
import { getEffectiveSnapshot, getEffectiveRefs, type EffectiveRefs } from "@/lib/effectiveRefs";
import { computeVLamaxEffectif, type VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif, type TTEEffectif } from "@/lib/tteEffectif";
import { computeRaceReadinessEffectif, type RaceReadinessEffectif, getTargets, getRaceWeights } from "@/lib/raceReadinessEffectif";
import { ZonesConfig, computeAbsoluteRange, AthleteRefsForZones } from "@/lib/zonesConfig";
import { TRAINING_ZONES, computeZoneAbsoluteValues, ZONES_METHODOLOGY_NOTE, type AthleteZoneRefs } from "@/lib/trainingZonesDefinition";
import { reglesTwoForCoaching, getPrioriteLabel, getSeancesRecommandees, PrioriteType } from "@/types/reglesTwoForCoaching";
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
// ✅ NEW: Import Wahoo Suggestion Engine
import { 
  suggestWahooWorkouts, 
  formatSuggestionsForPDF,
  type SuggestionEngineContext,
  type SuggestionEngineOutput,
  type WahooSuggestion 
} from "@/lib/wahoo/wahooSuggestionEngine";
import { computeCAPInjuryRisk as computeCAPInjuryRiskEngine } from "@/lib/capInjuryRisk";
import { getTemplateById, PROGRAM_TEMPLATES } from "@/data/programTemplates";
import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";
// ✅ NEW: Import FatMax TFCL et Nutrition V2
import { computeFatMaxTFCL, type FatMaxTFCLResult, FATMAX_DEFINITIONS, FATMAX_ACADEMY_CONTENT } from "@/lib/v2/fatmaxTFCL";
import { computeNutritionV2, type NutritionPredictiveV2, NUTRITION_PHILOSOPHY } from "@/lib/v2/nutritionV2";
import { generateAthleteReadiness, type AthleteReadinessReport } from "@/lib/athleteReadiness";
import { User, Shield } from "lucide-react";
import { SECTION_LABELS, getSectionOrder, getSectionVisibility, DEFAULT_SECTION_ORDER, DEFAULT_REPORT_SECTIONS } from "./ReportSectionOrderEditor";
// ✅ NEW: Import Disponibilité TFCL™
import { 
  computeDisponibiliteTFCL, 
  type TFCLReadinessInput, 
  type DisponibiliteTFCL,
  PDF_DISPONIBILITE_SECTION,
  DISPONIBILITE_PHILOSOPHY,
  DISPONIBILITE_SCALE
} from "@/lib/v2/disponibiliteTFCL";

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
}

// Sections disponibles dans le rapport
export interface ReportSections {
  synthese: boolean;        // Synthèse Exécutive
  compass: boolean;         // Metabolic Performance Compass
  profilMetabolique: boolean; // Profil Métabolique Complet (Radar Chart)
  indicateurs: boolean;     // Indicateurs Clés
  raceReadiness: boolean;   // Race Readiness
  disponibiliteTFCL: boolean; // ✅ Disponibilité TFCL™
  raceSimulation: boolean;  // ✅ NEW: Simulation de Course TFCL™
  injuryRisk: boolean;      // Risque de Blessure CAP
  nutritionV2: boolean;     // Nutrition Prédictive V2
  fatmaxTFCL: boolean;      // FatMax TFCL
  ambitionTargets: boolean; // Cibles par Niveau d'Ambition
  ambitionPredictions: boolean; // Prédictions d'Ambition
  evolutionCharts: boolean; // Graphiques d'évolution
  ageAdjustment: boolean;   // Ajustement par l'Âge (AAI)
  ambitionLegend: boolean;  // Légende des cibles par ambition
  methodology: boolean;     // Méthodologies d'entraînement
  twoForCoaching: boolean;  // Analyse Two For Coaching Lab™
  wahoo: boolean;           // Suggestions Wahoo SYSTM
  planSuggestion: boolean;  // Suggestion de Plan
  templateRecommendation: boolean; // Template recommandé
  zones: boolean;           // Zones d'entraînement
  historique: boolean;      // Historique Profils
  tests: boolean;           // Historique Tests
  testsCalibration: boolean; // ✅ Tests & Calibration TFCL
  fitImports: boolean;      // ✅ Tests Observés (import FIT)
  checkins: boolean;        // Check-ins
  comprendre: boolean;      // Comprendre mes scores
  qualite: boolean;         // Qualité des données
}

interface ExportOptions {
  includeWahooSuggestions: boolean;
  sections: ReportSections;
}

// ReportSections interface - defines available sections in PDF export
// DEFAULT_REPORT_SECTIONS is imported from ReportSectionOrderEditor

interface ExportOptions {
  includeWahooSuggestions: boolean;
  sections: ReportSections;
}

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
  raceReadiness: RaceReadinessEffectif;
  lorang: {
    priorite: PrioriteType;
    prioriteLabel: string;
    alertes: string[];
    recommandations: string[];
    seancesCodes: string[];
    seancesDetails: Array<{ code: string; nom: string; objectif: string }>;
  };
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
  // ✅ NEW: CRR et Compass Scores
  crr: ChargeRecenteReference;
  chargeScore: ChargeScore;
  compassScores: CompassScores;
  // ✅ NEW: Wahoo SYSTM Suggestions
  wahooSuggestions: {
    suggestions: WahooSuggestion[];
    diagnosticSummary: string;
    hasRecommendations: boolean;
  };
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

function getRecommandationsPriorite(priorite: PrioriteType): string[] {
  switch (priorite) {
    case "VLAMAX_DOWN":
      return ["Privilégier les sorties longues Z2 (4-6h)", "Éviter les sprints et intervalles courts", "Séances tempo longues (sweet spot 2x30-40min)"];
    case "VLAMAX_UP":
      return ["Ajouter des sprints courts (5-10s max)", "Intervalles courts haute intensité", "Séances de force explosive"];
    case "TTE_UP":
      return ["Séances au seuil prolongées (2x20-30min)", "Intervalles longs à 95-105% FTP", "Sorties tempo soutenues"];
    case "FTP_UTIL":
      return ["Blocs de travail au seuil (sweet spot)", "Intervalles VO2max (3-5min à 105-115% FTP)", "Progression du volume au seuil"];
    case "ENDURANCE_UP":
      return ["Augmenter le volume Z2", "Sorties longues progressives", "Travail au tempo"];
    case "VITESSE_UP":
      return ["Intervalles courts à haute intensité", "Travail de VMA/VO2max", "Séances de côtes"];
    default:
      return ["Maintenir l'équilibre actuel", "Affûtage pré-compétition", "Récupération et fraîcheur"];
  }
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
  
  if (!nutritionV2) {
    return `
      <section id="nutrition-v2" class="section pagebreakAvoid">
        <h2>🍎 Nutrition Prédictive V2</h2>
        <div class="alert alertWarning">
          <b>⚠️ Données insuffisantes</b><br>
          Le poids est requis pour calculer les besoins glucidiques. Renseignez le poids dans le snapshot.
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

  return `
    <section id="nutrition-v2" class="section pagebreak">
      <h2>🍎 Nutrition Prédictive V2 — TFCL™</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Philosophie TFCL™ :</b> ${philosophyText}
      </div>
      
      <div class="card ${riskCardClass}">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;">Besoins glucidiques estimés</div>
            <div class="big" style="margin:8px 0;">${nutritionV2.carbsMin}–${nutritionV2.carbsMax} g/h</div>
            <div style="font-size:14px;font-weight:600;">Valeur centrale : ${nutritionV2.carbsCentral} g/h</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Risque glycogène</div>
            <div style="margin:8px 0;">
              <span class="badge ${riskBadgeClass}" style="font-size:14px;padding:8px 16px;">${htmlEscape(nutritionV2.glycogenRiskLabel)}</span>
            </div>
            <div class="muted" style="font-size:11px;">Score: ${nutritionV2.glycogenRiskScore}/4</div>
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

function buildFatMaxTFCLHTML(payload: ExportPayload): string {
  const { fatmaxTFCL, effectiveRefs } = payload;
  
  if (!fatmaxTFCL) {
    return `
      <section id="fatmax-tfcl" class="section pagebreakAvoid">
        <h2>🔥 FatMax TFCL™</h2>
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
    const valText = adj.id === 'base' ? adj.value + '% FTP' : (adj.value > 0 ? '+' : '') + adj.value + '%';
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
      <h2>🔥 FatMax TFCL™ — Zone d'Oxydation Lipidique Maximale</h2>
      
      <div class="alert alertInfo mb">
        <b>📋 Définition TFCL™ :</b> ${htmlEscape(FATMAX_DEFINITIONS.official)}
      </div>
      
      <div class="card cardHighlight">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
          <div>
            <div class="muted" style="font-size:11px;">Zone FatMax estimée</div>
            <div class="big" style="margin:8px 0;">${fatmaxTFCL.minPctFTP}–${fatmaxTFCL.maxPctFTP}% FTP</div>
            <div style="font-size:14px;">Centre : <b>${fatmaxTFCL.centerPctFTP}% FTP</b></div>
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
            <span class="muted" style="font-size:11px;">Zone FatMax (${fatmaxTFCL.minPctFTP}–${fatmaxTFCL.maxPctFTP}% FTP)</span>
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
            <div style="font-weight:600;margin-bottom:4px;">Baisser la VLamax</div>
            <div class="muted" style="font-size:11px;">Séances Z2 longues, tempo prolongé</div>
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

function buildRaceSimulationHTML(
  payload: ExportPayload,
  mode: SimulationMode = 'pro'
): string {
  const { effectiveSnapshot, effectiveRefs, vlamax, tte, raceReadiness } = payload;
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

  if (actualMode === 'basic') {
    return buildBasicSimulationHTML(payload, goal, eligibility);
  } else {
    return buildProSimulationHTML(payload, goal, eligibility);
  }
}

function buildBasicSimulationHTML(
  payload: ExportPayload,
  goal: RaceType,
  eligibility: ReturnType<typeof checkProModeEligibility>
): string {
  const { raceReadiness } = payload;
  
  // Compute basic simulation
  const basicResult = computeBasicSimulation({
    raceType: goal,
    ambition: 'perf' as SimAmbitionLevel,
    heat: 'moderate',
    terrain: 'flat',
    disponibiliteScore: 75,
    disponibiliteLevel: 'good',
    raceReadinessScore: raceReadiness.score,
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

  // Références essentielles
  const checks = [
    { label: "FCmax", value: effectiveRefs.fcMax, weight: 10 },
    { label: "VMA", value: effectiveRefs.vma, weight: 10 },
    { label: "FTP", value: effectiveRefs.ftp, weight: 15 },
    { label: "Poids", value: effectiveRefs.weightKg, weight: 10 },
    { label: "VO2max", value: effectiveRefs.vo2max, weight: 5 },
    { label: "TSS 7d", value: effectiveSnapshot?.tss_7d, weight: 10 },
    { label: "VLamax (test ou mesure)", value: vlamax.source !== "estimated" && vlamax.source !== "unknown" ? vlamax.value : null, weight: 15 },
    { label: "TTE observé", value: tte.source === "observed" ? tte.tte_min : null, weight: 10 },
    { label: "Tests VLamax", value: tests.filter(t => t.vlamax != null).length >= 2 ? 1 : null, weight: 15 },
  ];

  for (const check of checks) {
    total += check.weight;
    if (check.value != null) {
      filled += check.weight;
    } else {
      manquants.push(check.label);
    }
  }

  return {
    score: Math.round((filled / total) * 100),
    manquants
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
  
  // Calculer VLamax effectif
  const vlamax = computeVLamaxEffectif({
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
    snapshots: athleteSnapshots.map(s => ({
      id: s.id,
      athlete_id: s.athlete_id,
      date: s.date,
      vlamax: s.vlamax,
      ftp: s.ftp,
      pmax_5s: s.pmax_5s,
      weight_kg: s.weight_kg
    }))
  });
  
  // Calculer TTE effectif
  const tte = computeTTEEffectif({
    ftp: effectiveRefs.ftp,
    tss_7d: effectiveSnapshot?.tss_7d,
    tte_mode: effectiveSnapshot?.tte_mode,
    tte_observed_min: effectiveSnapshot?.tte_observed_min,
    objectif: athlete.goal || "IM"
  });
  
  // Calculer Race Readiness
  // Calculer l'âge
  const athleteAge = athlete.birth_date ? (() => {
    const birthDate = new Date(athlete.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  })() : null;
  
  const raceReadiness = computeRaceReadinessEffectif({
    objectif: athlete.goal || "IM",
    vlamaxEffectif: vlamax,
    tteEffectif: tte,
    ftp: effectiveRefs.ftp,
    poids: effectiveRefs.weightKg,
    fatigue_ok: true,
    seance_specifique_validee: false,
    fcMax: effectiveRefs.fcMax,
    // ✅ FIX: Ajout âge ET ambition pour synchronisation parfaite avec l'UI
    athleteAge,
    ambition,
  });

  // Calculer Dan Lorang
  const ftpKg = effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0
    ? effectiveRefs.ftp / effectiveRefs.weightKg
    : 4.0;
  
  const analysisResult = reglesTwoForCoaching(
    { objectif: athlete.goal || "IM", masse_grasse: 15 } as any,
    vlamax.value ?? 0.45,
    tte.tte_min ?? 45,
    ftpKg,
    false,
    true
  );

  const seancesCodes = getSeancesRecommandees(analysisResult.priorite);
  const seancesDetails = seancesCodes.map(code => {
    const seance = SEANCES[code];
    return {
      code,
      nom: seance?.nom || code,
      objectif: seance?.objectif || "—"
    };
  });

  // Calculer complétude
  const completude = calculateCompletude(effectiveRefs, effectiveSnapshot, athleteTests, vlamax, tte);
  
  // Calculer Nutrition Prédictive
  const nutritionEstimate = computeNutritionEstimate({
    vlamax: vlamax.value,
    objectif: athlete.goal || "IM",
    tteMin: tte.tte_min,
    tteTarget: tte.target ?? 50,
    raceReadiness: raceReadiness.score
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
  
  // ✅ Calculer sportFocus dynamiquement comme dans le dashboard
  const objectif = athlete.goal || "IM";
  let sportFocus: "run" | "bike" | "tri" = "bike";
  if (["Marathon", "Semi", "Trail", "TrailLong", "TrailCourt", "Ultra", "Course"].includes(objectif)) {
    sportFocus = "run";
  } else if (["IM", "Ironman", "703", "70.3", "Half", "Olympic", "Sprint"].includes(objectif)) {
    sportFocus = "tri";
  }

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

  // ✅ Calculer fatigueScore depuis les checkins (comme dans le dashboard)
  const recentAthleteCheckins = checkins
    .filter((c) => c.athlete_id === athlete.id)
    .sort((a, b) => b.date_iso.localeCompare(a.date_iso));
  const recentCheckin = recentAthleteCheckins[0];
  const fatigueScore = recentCheckin?.fatigue ?? undefined;

  // ✅ NEW: Calculer les suggestions Wahoo SYSTM
  // Context identique à DashboardRecommendationsCard pour cohérence
  const wahooContext: SuggestionEngineContext = {
    objectif,
    sportFocus,
    vlamaxEffectif: {
      value: vlamax.value,
      confidence: vlamax.confidence,
      source: vlamax.source,
    },
    tteEffectif: {
      value: tte.tte_min,
      confidence: tte.confidence,
      source: tte.source,
    },
    ftpKg, // ✅ Ajouté - manquait dans l'export
    raceReadiness: {
      score: raceReadiness.score,
      details: raceReadiness.details, // ✅ Simplifié comme dans le dashboard
    },
    CRR: { 
      value: effectiveSnapshot?.tss_7d ?? null, // ✅ Cohérent avec le dashboard
      confidence: effectiveSnapshot?.tss_7d ? 0.8 : 0.3,
    },
    injuryRiskRun,
    fatigueScore, // ✅ Ajouté - manquait dans l'export
    forceDevelopmentMode: effectiveSnapshot?.force_development_mode ?? false,
    lowCRRJustification: effectiveSnapshot?.low_crr_justification as any,
  };
  
  const wahooOutput = suggestWahooWorkouts(wahooContext);
  
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
    raceReadiness,
    lorang: {
      priorite: analysisResult.priorite,
      prioriteLabel: getPrioriteLabel(analysisResult.priorite),
      alertes: analysisResult.alertes,
      recommandations: getRecommandationsPriorite(analysisResult.priorite),
      seancesCodes,
      seancesDetails
    },
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
    wahooSuggestions: {
      suggestions: wahooOutput.suggestions,
      diagnosticSummary: wahooOutput.diagnosticSummary,
      hasRecommendations: wahooOutput.suggestions.length > 0,
    },
    // ✅ NEW: Age Adjustment
    ageAdjustment: (() => {
      const age = calculateAge(athlete.birth_date);
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
      fatigueIndex: null, // TODO: add from checkins if available
      objectif: (athlete.goal || "IM") as "IM" | "70.3" | "Marathon" | "Semi" | "10km" | "Ironman",
      ftp: effectiveRefs.ftp,
    }),
    // ✅ NEW: Nutrition V2
    nutritionV2: computeNutritionV2({
      vlamaxValue: vlamax.value,
      vlamaxConfidence: vlamax.confidence,
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
// BUILD STAFF-GRADE REPORT HTML
// Rapport scientifiquement rigoureux, pédagogiquement clair,
// et explicitement non dogmatique
// =============================================

function buildStaffGradeReportHTML(payload: ExportPayload, logoBase64: string, options: ExportOptions = { includeWahooSuggestions: true, sections: DEFAULT_REPORT_SECTIONS }): string {
  const { 
    athlete, effectiveSnapshot, effectiveRefs, 
    vlamax, tte, raceReadiness, lorang,
    tests, snapshotHistory, checkins, completude, reportDate,
    nutritionEstimate, capInjuryRisk, ageAdjustment, ambition
  } = payload;
  
  const refs = getAthleteRefsForZones(effectiveRefs);
  // ✅ FIX: Passer âge et ambition pour utiliser les cibles dynamiques (cohérence avec l'app)
  const targets = getTargets(athlete.goal || "IM", ageAdjustment.age, ambition.current);
  const weights = getRaceWeights(athlete.goal || "IM");

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
      :root { --fg:#111; --muted:#555; --border:#ddd; --bg:#fff; --soft:#f7f7f7; --success:#16a34a; --warning:#d97706; --error:#dc2626; --primary:#2563eb; }
      * { box-sizing: border-box; }
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
      .card { border:1px solid var(--border); border-radius: 14px; padding: 16px; background: var(--bg); margin-bottom: 12px; break-inside: avoid; }
      .cardHighlight { border-color: var(--primary); background: linear-gradient(135deg, rgba(37,99,235,0.03), rgba(37,99,235,0.08)); }
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
        body { margin: 10mm; padding: 0; font-size: 11px; }
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
                <span class="muted">Race Readiness</span><br>
                <span class="medium ${raceReadiness.score >= 80 ? 'success' : raceReadiness.score >= 60 ? 'warning' : 'error'}">${raceReadiness.score}%</span>
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
  const tocHTML = `
    <div class="toc mb">
      <div class="tocTitle">📑 SOMMAIRE — Rapport de Modélisation Physiologique</div>
      <div class="tocRow"><a href="#positionnement">1. Positionnement & Comment lire ce rapport</a></div>
      <div class="tocRow"><a href="#executif">2. Synthèse Exécutive</a></div>
      <div class="tocRow"><a href="#compass">3. Metabolic Performance Compass™</a></div>
      <div class="tocRow"><a href="#indicateurs">4. Indicateurs Clés</a></div>
      <div class="tocRow"><a href="#readiness">5. Race Readiness</a></div>
      <div class="tocRow"><a href="#injury-risk">6. Risque de Blessure CAP</a></div>
      <div class="tocRow"><a href="#nutrition-v2">7. Nutrition Prédictive V2</a></div>
      <div class="tocRow"><a href="#fatmax-tfcl">8. FatMax TFCL™</a></div>
      <div class="tocRow"><a href="#ambition-targets">9. Cibles par Niveau d'Ambition</a></div>
      <div class="tocRow"><a href="#evolution-charts">10. Graphiques d'Évolution</a></div>
      <div class="tocRow"><a href="#aai">11. Ajustement par l'Âge (AAI)</a></div>
      <div class="tocRow"><a href="#methodology">12. Méthodologies d'Entraînement</a></div>
      <div class="tocRow"><a href="#twoforcoaching">13. Analyse Two For Coaching Lab™</a></div>
      <div class="tocRow"><a href="#wahoo">14. Suggestions Wahoo SYSTM</a></div>
      <div class="tocRow"><a href="#template-recommendation">15. Template Recommandé</a></div>
      <div class="tocRow"><a href="#zones">16. Zones d'entraînement</a></div>
      <div class="tocRow"><a href="#comprendre">17. Comprendre mes scores</a></div>
      <div class="tocRow"><a href="#qualite">18. Qualité des données</a></div>
    </div>
  `;

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

  if (raceReadiness.details.vlamax >= 20) pointsForts.push("VLamax dans la cible");
  else pointsLimitants.push("VLamax hors cible");

  if (raceReadiness.details.endurance >= 20) pointsForts.push("Endurance (TTE) solide");
  else pointsLimitants.push("Endurance à développer");

  if (raceReadiness.details.puissance >= 20) pointsForts.push("Puissance relative correcte");
  else pointsLimitants.push("FTP/kg insuffisant");

  if (raceReadiness.details.fraicheur >= 18) pointsForts.push("Fraîcheur optimale");
  else pointsLimitants.push("Fatigue accumulée");

  // Déterminer le profil métabolique AVEC NUANCES
  const profilMessage = (() => {
    if (vlamax.value === null) return "Données insuffisantes pour évaluer le profil métabolique. L'interprétation ci-dessous repose sur des hypothèses prudentes.";
    
    const confidenceNote = vlamax.confidence < 0.5 ? " (confiance faible — à confirmer)" : vlamax.confidence < 0.7 ? " (confiance modérée)" : "";
    
    if (raceReadiness.score >= 80 && pointsLimitants.length === 0) {
      return `Le profil métabolique actuel SEMBLE cohérent avec l'objectif visé${confidenceNote}. Aucune limitation majeure identifiée sur la base des données disponibles.`;
    }
    if (raceReadiness.score >= 60) {
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
              <td><b>Race Readiness</b></td>
              <td>${raceReadiness.score}%</td>
              <td><span class="badge badgeWarning">🔁 Calculé</span></td>
              <td><span class="badge ${raceReadiness.confidence >= 0.7 ? 'badgeSuccess' : raceReadiness.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${raceReadiness.confidence >= 0.7 ? 'Élevée' : raceReadiness.confidence >= 0.4 ? 'Modérée' : 'Faible'}</span></td>
              <td class="muted">${raceReadiness.score >= 80 ? "Bonne cohérence actuelle entre capacités et charge." : raceReadiness.score >= 60 ? "Cohérence acceptable avec des axes d'amélioration identifiés." : "Désalignement significatif — analyse détaillée recommandée."}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card cardHighlight mt">
        <h3>📋 Résumé automatique (Lecture < 2 min)</h3>
        <p style="font-size:14px;line-height:1.6;margin:12px 0;">${profilMessage}</p>
        <p style="font-size:12px;color:var(--muted);">
          <b>Priorité physiologique suggérée:</b> ${lorang.prioriteLabel || "Maintien de l'équilibre actuel"}.<br>
          <b>Risques identifiés:</b> ${risquesIdentifies}.
        </p>
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
  
  
  const compassHTML = `
    <section id="compass" class="section pagebreak">
      <h2>3. Metabolic Performance Compass™</h2>
      
      <!-- CARTE CRR -->
      <div class="card mb" style="border-left: 4px solid ${crrCardColor};">
        <h3>📊 Charge Récente de Référence (CRR)</h3>
        <div class="grid3">
          <div>
            <span class="muted">Valeur</span><br>
            <span class="big">${crrValue}</span>
            <span class="muted"> TSS/7j</span>
          </div>
          <div>
            <span class="muted">Source</span><br>
            <span class="tag ${crrSourceClass}">${crr.source}</span>
          </div>
          <div>
            <span class="muted">Statut</span><br>
            <span class="badge ${chargeStatusClass}">${chargeStatusLabel}</span>
          </div>
        </div>
        <div class="muted mt" style="font-size:11px;">
          Cibles ${crrTargets.objectif}: Min ${crrTargets.chargeMinimale} | Optimal ${crrTargets.chargeOptimale} | Max ${crrTargets.chargeMaximale} TSS
          ${crr.warningMessage ? '<br>⚠️ ' + crr.warningMessage : ''}
        </div>
      </div>
      
      <!-- COMPASS RADAR -->
      <div class="card cardHighlight">
        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;">Metabolic Performance Compass™</div>
          <div class="muted">4 Axes Officiels – Two For Coaching Lab</div>
        </div>
        
        <div style="display:flex;justify-content:center;margin:20px 0;">
          <svg width="340" height="340" viewBox="0 0 340 340" style="overflow:visible;">
            <!-- Grilles de fond (diamants concentriques) -->
            <polygon points="170,70 270,170 170,270 70,170" fill="none" stroke="#ddd" stroke-width="1"/>
            <polygon points="170,95 245,170 170,245 95,170" fill="none" stroke="#ddd" stroke-width="1"/>
            <polygon points="170,120 220,170 170,220 120,170" fill="none" stroke="#ddd" stroke-width="1"/>
            <polygon points="170,145 195,170 170,195 145,170" fill="none" stroke="#ddd" stroke-width="1"/>
            <!-- Axes -->
            <line x1="170" y1="70" x2="170" y2="270" stroke="#eee" stroke-width="1"/>
            <line x1="70" y1="170" x2="270" y2="170" stroke="#eee" stroke-width="1"/>
            <!-- Polygone des scores (centre=170,170, rayon max=100) - scores normalisés -->
            <polygon points="170,${170 - (cScores.capaciteAerobie.score / 100) * 100} ${170 + (cScores.toleranceEffort.score / 100) * 100},170 170,${170 + (cScores.profilMetabolique.score / 100) * 100} ${170 - (cScores.robustesse.score / 100) * 100},170" fill="rgba(37,99,235,0.25)" stroke="#2563eb" stroke-width="2.5"/>
            <!-- Points sur chaque axe -->
            <circle cx="170" cy="${170 - (cScores.capaciteAerobie.score / 100) * 100}" r="7" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <circle cx="${170 + (cScores.toleranceEffort.score / 100) * 100}" cy="170" r="7" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <circle cx="170" cy="${170 + (cScores.profilMetabolique.score / 100) * 100}" r="7" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <circle cx="${170 - (cScores.robustesse.score / 100) * 100}" cy="170" r="7" fill="#2563eb" stroke="#fff" stroke-width="2"/>
            <!-- Labels avec scores -->
            <text x="170" y="45" text-anchor="middle" font-size="12" font-weight="700" fill="#1e40af">⚡ Capacité Aérobie</text>
            <text x="170" y="60" text-anchor="middle" font-size="14" font-weight="800" fill="#2563eb">${cScores.capaciteAerobie.score}/100</text>
            <text x="295" y="165" text-anchor="start" font-size="12" font-weight="700" fill="#1e40af">💪 Tolérance</text>
            <text x="295" y="180" text-anchor="start" font-size="14" font-weight="800" fill="#2563eb">${cScores.toleranceEffort.score}/100</text>
            <text x="170" y="300" text-anchor="middle" font-size="12" font-weight="700" fill="#1e40af">🧬 Profil Métab.</text>
            <text x="170" y="315" text-anchor="middle" font-size="14" font-weight="800" fill="#2563eb">${cScores.profilMetabolique.score}/100</text>
            <text x="45" y="165" text-anchor="end" font-size="12" font-weight="700" fill="#1e40af">🛡️ Robustesse</text>
            <text x="45" y="180" text-anchor="end" font-size="14" font-weight="800" fill="#2563eb">${cScores.robustesse.score}/100</text>
          </svg>
        </div>
        
        <div style="text-align:center;margin-top:16px;">
          <span class="badge ${globalBadgeClass}" style="font-size:16px;padding:10px 20px;">
            Score Global: ${cScores.globalScore}/100 – ${cScores.globalLabel}
          </span>
          <div class="muted mt" style="font-size:11px;">Complétude données: ${cScores.dataCompleteness}%</div>
        </div>
      </div>
      
      <!-- 4 AXES DÉTAILLÉS -->
      <div class="card mt">
        <h3>📐 Détail des 4 Axes (Formules Officielles)</h3>
        <div class="grid2 mt">
          <div class="card" style="background:#f8fafc;">
            <h4>⚡ AXE 1 – Capacité Aérobie</h4>
            <div class="kv">
              <div class="k">Score</div><div class="v"><b>${cScores.capaciteAerobie.score}/100</b></div>
              <div class="k">Formule</div><div class="v" style="font-size:10px;">${htmlEscape(cScores.capaciteAerobie.formula)}</div>
              <div class="k">Confiance</div><div class="v">${Math.round(cScores.capaciteAerobie.confidence * 100)}%</div>
            </div>
            <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(cScores.capaciteAerobie.explanation)}</p>
          </div>
          <div class="card" style="background:#f8fafc;">
            <h4>💪 AXE 2 – Tolérance à l'Effort</h4>
            <div class="kv">
              <div class="k">Score</div><div class="v"><b>${cScores.toleranceEffort.score}/100</b></div>
              <div class="k">Formule</div><div class="v" style="font-size:10px;">${htmlEscape(cScores.toleranceEffort.formula)}</div>
              <div class="k">Confiance</div><div class="v">${Math.round(cScores.toleranceEffort.confidence * 100)}%</div>
            </div>
            <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(cScores.toleranceEffort.explanation)}</p>
          </div>
          <div class="card" style="background:#f8fafc;">
            <h4>🧬 AXE 3 – Profil Métabolique</h4>
            <div class="kv">
              <div class="k">Score</div><div class="v"><b>${cScores.profilMetabolique.score}/100</b></div>
              <div class="k">Formule</div><div class="v" style="font-size:10px;">${htmlEscape(cScores.profilMetabolique.formula)}</div>
              <div class="k">Confiance</div><div class="v">${Math.round(cScores.profilMetabolique.confidence * 100)}%</div>
            </div>
            <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(cScores.profilMetabolique.explanation)}</p>
          </div>
          <div class="card" style="background:#f8fafc;">
            <h4>🛡️ AXE 4 – Robustesse</h4>
            <div class="kv">
              <div class="k">Score</div><div class="v"><b>${cScores.robustesse.score}/100</b></div>
              <div class="k">Formule</div><div class="v" style="font-size:10px;">${htmlEscape(cScores.robustesse.formula)}</div>
              <div class="k">Confiance</div><div class="v">${Math.round(cScores.robustesse.confidence * 100)}%</div>
            </div>
            <p class="muted" style="font-size:11px;margin-top:8px;">${htmlEscape(cScores.robustesse.explanation)}</p>
          </div>
        </div>
      </div>
      
      <!-- INTERPRÉTATION COACH -->
      <div class="card mt" style="border-left: 4px solid #2563eb;">
        <h3>🎓 Interprétation Coach Automatique</h3>
        <div class="grid1 mt">
          <div class="alert ${limitationAlertClass}">
            <b>📍 Limitation principale:</b><br>
            ${htmlEscape(coachInterpretation.limitation)}
          </div>
          <div class="alert ${riskAlertClass}">
            <b>⚠️ Risque identifié:</b><br>
            ${htmlEscape(coachInterpretation.risk)}
          </div>
          <div class="alert alertSuccess">
            <b>💡 Recommandation prioritaire:</b><br>
            ${htmlEscape(coachInterpretation.recommendation)}
          </div>
        </div>
        ${cScores.mainStrength ? '<p class="muted mt">✓ Point fort: ' + htmlEscape(cScores.mainStrength) + '</p>' : ''}
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
            <svg width="100%" viewBox="0 0 300 280" preserveAspectRatio="xMidYMid meet" style="max-width:320px;margin:0 auto;display:block;">
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
  const indicateursHTML = `
    <section id="indicateurs" class="section">
      <h2>B. Indicateurs clés + Interprétation</h2>
      
      <div class="card pagebreakAvoid" style="border-left: 4px solid ${vlamaxProfilColor};">
        <h3>1️⃣ VLamax (effectif) — Profil Métabolique</h3>
        
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
            <span class="badge ${vlamaxAgeStatus.status === 'optimal' ? 'badgeSuccess' : vlamaxAgeStatus.status === 'acceptable' ? 'badgeWarning' : 'badgeError'}" style="font-size:11px;padding:6px 12px;">
              ${vlamaxAgeStatus.status === 'optimal' ? '✓ Optimal' : vlamaxAgeStatus.status === 'acceptable' ? '○ Acceptable' : '⚠ À travailler'}
            </span>
          </div>
        </div>
        
        <div class="grid2">
          <div>
            <div class="kv">
              <div class="k">Cible (${getObjectifLabel(athlete.goal)})</div><div class="v">${fmt(targets.vlamaxMin, 2)} – ${fmt(targets.vlamaxMax, 2)} (idéal: ${fmt(targets.vlamaxIdeal, 2)})</div>
              ${ageAdjustment.age !== null && ageAdjustment.age >= 40 ? '<div class="k">Âge athlète</div><div class="v">' + ageAdjustment.age + ' ans (' + ageAdjustment.aai.label + ')</div>' : ''}
              <div class="k">Niveau risque</div><div class="v">${vlamaxAgeStatus.level === 'low' ? '🟢 Faible' : vlamaxAgeStatus.level === 'moderate' ? '🟡 Modéré' : vlamaxAgeStatus.level === 'high' ? '🟠 Élevé' : '🔴 Très élevé'}</div>
            </div>
            ${vlamaxAgeStatus.ageImpact ? '<p style="font-size:10px;font-style:italic;color:var(--muted);margin-top:8px;">ℹ️ ' + htmlEscape(vlamaxAgeStatus.ageImpact) + '</p>' : ''}
          </div>
          <div>
            <h4>Interprétation</h4>
            <p class="muted">${htmlEscape(vlamaxAgeStatus.message)}</p>
            <h4>Actions recommandées</h4>
            <ul class="muted">
              ${vlamaxAgeStatus.actions.map(a => '<li>' + htmlEscape(a) + '</li>').join('')}
            </ul>
          </div>
        </div>
      </div>

      <div class="card pagebreakAvoid">
        <h3>2️⃣ TTE (Time to Exhaustion)</h3>
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
        <h3>3️⃣ FTP et FTP/kg</h3>
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
  // D. RACE READINESS (STAFF)
  // =============================================
  const raceReadinessHTML = `
    <section id="race" class="section pagebreak">
      <h2>C. Race Readiness (Staff)</h2>
      
      <div class="card ${raceReadiness.score >= 80 ? 'cardSuccess' : raceReadiness.score >= 60 ? 'cardWarning' : 'cardError'}">
        <div class="grid2">
          <div>
            <div style="display:flex;align-items:center;gap:16px;">
              <div class="scoreCircle" style="border-color:${raceReadiness.score >= 80 ? 'var(--success)' : raceReadiness.score >= 60 ? 'var(--warning)' : 'var(--error)'}; color:${raceReadiness.score >= 80 ? 'var(--success)' : raceReadiness.score >= 60 ? 'var(--warning)' : 'var(--error)'}">
                ${raceReadiness.score}
              </div>
              <div>
                <div style="font-size:20px;font-weight:700;">${raceReadiness.label}</div>
                <div class="muted">Race Readiness pour ${getObjectifLabel(athlete.goal)}</div>
              </div>
            </div>
            <div class="mt">
              <div class="progressBar">
                <div class="progressFill" style="width:${raceReadiness.score}%; background:${raceReadiness.score >= 80 ? 'var(--success)' : raceReadiness.score >= 60 ? 'var(--warning)' : 'var(--error)'}"></div>
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
          <div class="medium">${raceReadiness.details.vlamax}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(raceReadiness.details.vlamax / 25) * 100}%; background:${raceReadiness.details.vlamax >= 20 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
        <div class="card">
          <div class="muted">Endurance</div>
          <div class="medium">${raceReadiness.details.endurance}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(raceReadiness.details.endurance / 25) * 100}%; background:${raceReadiness.details.endurance >= 20 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
        <div class="card">
          <div class="muted">Puissance</div>
          <div class="medium">${raceReadiness.details.puissance}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(raceReadiness.details.puissance / 25) * 100}%; background:${raceReadiness.details.puissance >= 20 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
        <div class="card">
          <div class="muted">Disponibilité TFCL™</div>
          <div class="medium">${raceReadiness.details.fraicheur}/25</div>
          <div class="progressBar mt"><div class="progressFill" style="width:${(raceReadiness.details.fraicheur / 25) * 100}%; background:${raceReadiness.details.fraicheur >= 18 ? 'var(--success)' : 'var(--warning)'}"></div></div>
        </div>
      </div>

      <div class="card mt">
        <h3>💡 Explication du score</h3>
        <p>${htmlEscape(raceReadiness.messageStaff)}</p>
        ${raceReadiness.wasCappedByNutrition ? `<div class="alert alertWarning">⚠️ Score plafonné par risque nutritionnel: ${raceReadiness.nutritionalCapReason || "Risque élevé"}</div>` : ''}
        ${raceReadiness.wasCappedByEconomy ? `<div class="alert alertWarning">🏃 Score plafonné par économie de course: ${raceReadiness.economyCapReason || "Économie insuffisante"}</div>` : ''}
      </div>

      ${raceReadiness.reasonsMissing.length > 0 ? `
        <div class="card mt">
          <h3>🎯 Ce qui manque pour gagner des points</h3>
          <ul>
            ${raceReadiness.reasonsMissing.map(r => `<li>${htmlEscape(r)}</li>`).join("")}
          </ul>
          <div class="alert alertInfo mt">
            <b>Actions recommandées:</b> Ajoutez les données manquantes dans le snapshot (TSS 7d, TTE mesuré) ou via les tests VLamax pour améliorer la précision du score.
          </div>
        </div>
      ` : ''}
    </section>
  `;

  // =============================================
  // D. DISPONIBILITÉ TFCL™ (NEW)
  // =============================================
  // Calculer la disponibilité depuis les check-ins
  const sortedCheckinsForDispo = [...checkins].sort((a, b) => new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime());
  const latestCheckinForDispo = sortedCheckinsForDispo[0];
  
  let disponibiliteResult: DisponibiliteTFCL | null = null;
  if (latestCheckinForDispo) {
    const dispoInput: TFCLReadinessInput = {
      sleep: latestCheckinForDispo.sleep ?? null,
      fatigue: latestCheckinForDispo.fatigue ?? null,
      soreness: latestCheckinForDispo.soreness ?? null,
      stress: latestCheckinForDispo.stress ?? null,
      motivation: latestCheckinForDispo.motivation ?? null,
      alerts: latestCheckinForDispo.pain_flag ? { asymmetric_pain: true } : undefined,
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
          <h3>📋 Scores subjectifs</h3>
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
  ` : `
    <section id="disponibilite-tfcl" class="section pagebreakAvoid">
      <h2>📊 Disponibilité TFCL™</h2>
      <div class="alert alertWarning">
        <b>⚠️ Données insuffisantes</b><br>
        Aucun check-in récent n'a été enregistré. Complétez le questionnaire TFCL Daily Readiness Check pour obtenir votre score de disponibilité.
      </div>
    </section>
  `;

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
  const aaiHTML = ageAdjustment.age !== null ? `
    <section id="aai" class="section pagebreakAvoid">
      <h2>6. Ajustement par l'Âge (AAI)</h2>
      
      <div class="card cardHighlight">
        <div class="grid2">
          <div>
            <h3>🎂 Profil de l'athlète</h3>
            <div style="font-size:28px;font-weight:700;margin:8px 0;">${ageAdjustment.age} ans</div>
            <div class="muted">Catégorie : <b>${ageAdjustment.aai.label}</b></div>
            <div class="mt" style="display:flex;gap:16px;flex-wrap:wrap;">
              <div>
                <div class="muted" style="font-size:11px;">AAI</div>
                <div style="font-size:18px;font-weight:600">${Math.round(ageAdjustment.aai.aai * 100)}%</div>
              </div>
              <div>
                <div class="muted" style="font-size:11px;">Multiplicateur risque</div>
                <div style="font-size:18px;font-weight:600">×${ageAdjustment.aai.riskMultiplier.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div>
            <h4>📊 Échelle AAI</h4>
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
        <b>💡 Note importante :</b> Les cibles VLamax sont définies par l'objectif et l'ambition uniquement. 
        Seul le TTE peut être légèrement ajusté pour les athlètes Master (40+) pour refléter les réalités physiologiques de récupération.
      </div>
    </section>
  `;

  // =============================================
  // E. ANALYSE TWO FOR COACHING LAB™
  // =============================================
  const lorangHTML = `
    <section id="twoforcoaching" class="section pagebreakAvoid">
      <h2>D. Analyse Two For Coaching Lab™</h2>
      
      <div class="alert alertInfo mb">
        <b>ℹ️ Two For Coaching Lab Method™</b><br>
        <span style="font-size:12px;">
          <b>Méthodologie d'analyse physiologique</b> appliquée à l'entraînement d'endurance, conçue pour aider les coachs à interpréter des données complexes, estimer des profils énergétiques, et guider la prise de décision stratégique.<br><br>
          Elle ne remplace ni l'expertise humaine du coach, ni un test physiologique de laboratoire.<br>
          Les valeurs présentées (VLamax, TTE, Race Readiness) sont des <b>estimations modélisées</b> destinées à guider la décision du coach.<br><br>
          <i>S'inspire des travaux de Mader, Heck, Jones, Burnley, Seiler — implémentation indépendante et propriétaire.</i>
        </span>
      </div>
      
      <div class="card ${lorang.priorite ? 'cardHighlight' : ''}">
        <div class="grid2">
          <div>
            <h3>🎯 Priorité calculée</h3>
            <div style="font-size:20px;font-weight:700;margin:8px 0;">${lorang.prioriteLabel || "Aucune priorité majeure"}</div>
            <div class="muted">Basé sur VLamax ${fmt(vlamax.value, 2)}, TTE ${tte.tte_min}min, FTP/kg ${ftpKg ? fmt(ftpKg, 2) : "—"}</div>
            <div class="muted mt" style="font-size:11px;">
              <b>Sources :</b> VLamax ${vlamax.source === "estimated" ? "(estimée)" : "(mesurée)"} • TTE ${tte.source === "observed" ? "(mesuré)" : "(estimé)"}
            </div>
          </div>
          <div>
            ${lorang.alertes.length > 0 ? `
              <h4>⚠️ Alertes</h4>
              <ul class="muted">
                ${lorang.alertes.map(a => `<li>${htmlEscape(a)}</li>`).join("")}
              </ul>
            ` : '<div class="alert alertSuccess">✅ Aucune alerte majeure</div>'}
          </div>
        </div>
      </div>

      <div class="card mt">
        <h3>📋 Recommandations (bloc 14 jours)</h3>
        <ul>
          ${lorang.recommandations.map(r => `<li>${htmlEscape(r)}</li>`).join("")}
        </ul>
      </div>

      <div class="card mt">
        <h3>🏋️ Séances recommandées</h3>
        <table>
          <thead>
            <tr><th>Code</th><th>Nom</th><th>Objectif</th></tr>
          </thead>
          <tbody>
            ${lorang.seancesDetails.length > 0 
              ? lorang.seancesDetails.map(s => `<tr><td><b>${htmlEscape(s.code)}</b></td><td>${htmlEscape(s.nom)}</td><td class="muted">${htmlEscape(s.objectif)}</td></tr>`).join("")
              : '<tr><td colspan="3" class="muted">Séances de maintien recommandées</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div class="alert alertWarning mt" style="font-size:11px;">
        <b>⚠️ Outil d'aide à la décision</b> — Two For Coaching Lab™ ne remplace pas le jugement du coach ni un test physiologique complet. Ces recommandations sont indicatives.
      </div>
    </section>
  `;

  // =============================================
  // E.bis SUGGESTIONS WAHOO SYSTM
  // =============================================
  const { wahooSuggestions } = payload;
  
  const wahooHTML = (options.includeWahooSuggestions && wahooSuggestions.hasRecommendations) ? `
    <section id="wahoo" class="section pagebreakAvoid">
      <h2>D.bis Suggestions Wahoo SYSTM</h2>
      
      <div class="card cardHighlight">
        <h3>⚡ Analyse du profil physiologique</h3>
        <p class="muted">${htmlEscape(wahooSuggestions.diagnosticSummary)}</p>
      </div>
      
      <div class="card mt">
        <h3>🎯 Séances recommandées (${wahooSuggestions.suggestions.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Séance Wahoo SYSTM</th>
              <th>Axe ciblé</th>
              <th>Risque</th>
              <th>Pourquoi cette séance</th>
              <th>Effets attendus</th>
            </tr>
          </thead>
          <tbody>
            ${wahooSuggestions.suggestions.map(s => {
              const axisLabel = s.targetAxis === "VLAMAX" ? "↓ VLamax" 
                : s.targetAxis === "TTE" ? "↑ TTE" 
                : s.targetAxis === "ENDURANCE" ? "↑ Endurance" 
                : s.targetAxis === "FRESHNESS" ? "Récupération"
                : s.targetAxis === "VO2" ? "↑ VO2max" : s.targetAxis;
              const riskBadge = s.riskLevel === 0 ? 'badgeSuccess' 
                : s.riskLevel === 1 ? 'badge' 
                : s.riskLevel === 2 ? 'badgeWarning' : 'badgeError';
              const riskLabel = s.riskLevel === 0 ? 'Minimal' 
                : s.riskLevel === 1 ? 'Faible' 
                : s.riskLevel === 2 ? 'Modéré' : 'Élevé';
              return `
                <tr>
                  <td><b>${htmlEscape(s.wahoo_name)}</b><br><span class="muted" style="font-size:10px">Confiance: ${Math.round(s.confidence * 100)}%</span></td>
                  <td><span class="badge tagPrimary">${axisLabel}</span></td>
                  <td><span class="badge ${riskBadge}">${riskLabel}</span></td>
                  <td class="muted" style="font-size:11px">${htmlEscape(s.why)}</td>
                  <td class="muted" style="font-size:11px">${s.expected_effects.slice(0, 2).map(e => htmlEscape(e)).join('<br>')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      ${wahooSuggestions.suggestions.some(s => s.cautions.length > 0) ? `
        <div class="card mt">
          <h3>⚠️ Précautions et contre-indications</h3>
          <ul class="muted">
            ${wahooSuggestions.suggestions
              .filter(s => s.cautions.length > 0)
              .flatMap(s => s.cautions.map(c => `<li><b>${htmlEscape(s.wahoo_name)}:</b> ${htmlEscape(c)}</li>`))
              .join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="alert alertInfo mt">
        💡 Ces suggestions sont basées sur le profil physiologique de l'athlète et les objectifs déclarés.
        Elles sont indicatives et doivent être adaptées par le coach selon le contexte individuel.
      </div>
    </section>
  ` : '';

  // =============================================
  // D.ter SUGGESTION DE PLAN (Template chargé)
  // =============================================
  // Récupérer le template chargé depuis localStorage
  const loadedTemplateId = localStorage.getItem("vlab-selected-template");
  const loadedTemplate = loadedTemplateId ? getTemplateById(loadedTemplateId) : null;
  
  const planSuggestionHTML = loadedTemplate && loadedTemplate.weeks.length > 0 ? `
    <section id="plan-suggestion" class="section pagebreak">
      <h2>D.ter Suggestion de Plan</h2>
      
      <div class="card cardHighlight">
        <h3>📋 ${htmlEscape(loadedTemplate.name)}</h3>
        <p class="muted">Programme ${loadedTemplate.weeks.length} semaines • Objectif: ${loadedTemplate.target}</p>
      </div>
      
      ${loadedTemplate.weeks.map(week => `
        <div class="card mt" style="page-break-inside: avoid;">
          <h3 style="margin-bottom: 8px;">
            <span class="badge badgePrimary">S${week.weekNumber}</span>
            ${week.theme ? `<span style="margin-left: 8px;">${htmlEscape(week.theme)}</span>` : ''}
            ${week.phase ? `<span class="badge" style="margin-left: 8px; background: var(--muted); color: var(--muted-foreground);">${htmlEscape(week.phase)}</span>` : ''}
          </h3>
          ${week.coachAdvice ? `<div class="alert alertInfo mb" style="font-size: 11px;"><b>💡 Conseil:</b> ${htmlEscape(week.coachAdvice)}</div>` : ''}
          <table style="font-size: 11px;">
            <thead>
              <tr>
                <th style="width: 60px;">Jour</th>
                <th style="width: 80px;">Sport</th>
                <th>Séance</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              ${week.sessions.map(session => `
                <tr>
                  <td><b>${htmlEscape(session.day || '')}</b></td>
                  <td><span class="badge" style="font-size: 10px;">${htmlEscape(session.sport || session.discipline || session.type || '—')}</span></td>
                  <td><b>${htmlEscape(session.title || '')}</b></td>
                  <td class="muted">${htmlEscape(session.details || session.description || session.notes || '')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
      
      <div class="alert alertInfo mt">
        💡 Ce plan est une suggestion basée sur l'objectif de l'athlète. Il doit être adapté par le coach selon le contexte individuel et les données physiologiques.
      </div>
    </section>
  ` : '';

  // =============================================
  // SECTION RISQUE DE BLESSURE CAP (DÉTAILLÉ)
  // =============================================
  const injuryRiskHTML = capInjuryRisk ? `
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
              <div class="progressFill" style="width:${Math.round(capInjuryRisk.factors.vlamaxContribution * 100)}%;background:${capInjuryRisk.factors.vlamaxContribution > 0.5 ? 'var(--warning)' : 'var(--success)'}"></div>
            </div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${Math.round(capInjuryRisk.factors.vlamaxContribution * 100)}%</div>
            <div class="muted" style="font-size:10px;">VLamax élevée = fatigue neuromusculaire</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Contribution TTE</div>
            <div class="progressBar mt" style="height:20px;">
              <div class="progressFill" style="width:${Math.round(capInjuryRisk.factors.tteContribution * 100)}%;background:${capInjuryRisk.factors.tteContribution > 0.5 ? 'var(--warning)' : 'var(--success)'}"></div>
            </div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${Math.round(capInjuryRisk.factors.tteContribution * 100)}%</div>
            <div class="muted" style="font-size:10px;">TTE insuffisant = risque d'effondrement</div>
          </div>
          <div style="text-align:center;">
            <div class="muted" style="font-size:11px;">Contribution Charge</div>
            <div class="progressBar mt" style="height:20px;">
              <div class="progressFill" style="width:${Math.round(capInjuryRisk.factors.chargeContribution * 100)}%;background:${capInjuryRisk.factors.chargeContribution > 0.5 ? 'var(--error)' : 'var(--success)'}"></div>
            </div>
            <div style="font-size:14px;font-weight:600;margin-top:4px;">${Math.round(capInjuryRisk.factors.chargeContribution * 100)}%</div>
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
  ` : '';

  // =============================================
  // SECTION MÉTHODOLOGIES D'ENTRAÎNEMENT
  // =============================================
  const methodologyHTML = `
    <section id="methodology" class="section pagebreak">
      <h2>📚 Méthodologies d'Entraînement</h2>
      
      <div class="alert alertInfo mb">
        <b>ℹ️ Guide des approches d'entraînement</b><br>
        Chaque méthodologie a ses forces et convient à des profils et objectifs différents. TFCL intègre les meilleurs éléments selon le profil métabolique.
      </div>
      
      <!-- TFCL -->
      <div class="card cardHighlight" style="border-left:4px solid #10b981;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <span class="badge" style="background:linear-gradient(135deg, #10b981, #14b8a6);color:white;padding:8px 16px;font-size:14px;">TFCL</span>
          <div>
            <div style="font-weight:700;">Two For Coaching Lab™</div>
            <div class="muted">Approche métabolique VLamax-centrée</div>
          </div>
        </div>
        <div class="grid2 mt">
          <div>
            <h4>🎯 Principes clés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Modulation VLamax selon l'objectif (↓ pour endurance, ↑ pour explosivité)</li>
              <li>Séances TTE pour développer l'endurance au seuil</li>
              <li>Zones basées sur le modèle physiologique (VO2, VLamax, seuils)</li>
              <li>Périodisation non-linéaire avec blocs métaboliques ciblés</li>
            </ul>
          </div>
          <div>
            <h4>📌 Profils adaptés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Triathlètes longue distance (70.3, Ironman)</li>
              <li>Marathoniens et ultra-traileurs</li>
              <li>Athlètes avec VLamax à optimiser</li>
            </ul>
            <div class="muted mt" style="font-size:10px;font-style:italic;">Réf: Mader 2003, San-Millán 2018</div>
          </div>
        </div>
      </div>
      
      <!-- CLASSIQUE (Friel) -->
      <div class="card mt" style="border-left:4px solid #64748b;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <span class="badge" style="background:#64748b;color:white;padding:8px 16px;">CLASSIQUE</span>
          <div>
            <div style="font-weight:700;">Périodisation Linéaire (Friel)</div>
            <div class="muted">Base → Build → Peak → Race</div>
          </div>
        </div>
        <div class="grid2 mt">
          <div>
            <h4>🎯 Principes clés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Progression linéaire du volume vers l'intensité</li>
              <li>Phases distinctes avec objectifs clairs</li>
              <li>Montée en charge progressive sur 3-4 semaines</li>
              <li>Semaine de récupération systématique</li>
            </ul>
          </div>
          <div>
            <h4>📌 Profils adaptés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Débutants à intermédiaires</li>
              <li>Athlètes avec un seul objectif annuel majeur</li>
              <li>Récupération bien tolérée</li>
            </ul>
            <div class="muted mt" style="font-size:10px;font-style:italic;">Réf: Joe Friel, The Triathlete's Training Bible</div>
          </div>
        </div>
      </div>
      
      <!-- INVERSÉE -->
      <div class="card mt" style="border-left:4px solid #f59e0b;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <span class="badge" style="background:#f59e0b;color:white;padding:8px 16px;">INVERSÉE</span>
          <div>
            <div style="font-weight:700;">Périodisation Inversée</div>
            <div class="muted">Intensité d'abord, endurance ensuite</div>
          </div>
        </div>
        <div class="grid2 mt">
          <div>
            <h4>🎯 Principes clés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Développement de la puissance maximale en premier</li>
              <li>Extension progressive de la durabilité</li>
              <li>Séances courtes et intenses en début de cycle</li>
              <li>Allongement progressif des efforts</li>
            </ul>
          </div>
          <div>
            <h4>📌 Profils adaptés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Athlètes avec base aérobie solide</li>
              <li>Profils manquant de "punch"</li>
              <li>Préparation hivernale courte</li>
            </ul>
            <div class="muted mt" style="font-size:10px;font-style:italic;">Réf: Renato Canova, école kényane</div>
          </div>
        </div>
      </div>
      
      <!-- POLARISÉE -->
      <div class="card mt" style="border-left:4px solid #ef4444;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <span class="badge" style="background:#ef4444;color:white;padding:8px 16px;">POLARISÉE</span>
          <div>
            <div style="font-weight:700;">Entraînement Polarisé</div>
            <div class="muted">80% facile / 20% très dur</div>
          </div>
        </div>
        <div class="grid2 mt">
          <div>
            <h4>🎯 Principes clés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Distribution 80/20 ou 75/5/20</li>
              <li>Beaucoup de Z1-Z2, très peu de Z3-Z4</li>
              <li>Séances HIIT vraiment intenses (≥VO2max)</li>
              <li>Récupération active entre les séances dures</li>
            </ul>
          </div>
          <div>
            <h4>📌 Profils adaptés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Athlètes élites avec gros volume</li>
              <li>Sports d'endurance pure (cyclisme, ski de fond)</li>
              <li>Athlètes supportant les pics d'intensité</li>
            </ul>
            <div class="muted mt" style="font-size:10px;font-style:italic;">Réf: Stephen Seiler, études norvégiennes</div>
          </div>
        </div>
      </div>
      
      <!-- LORANG -->
      <div class="card mt" style="border-left:4px solid #8b5cf6;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <span class="badge" style="background:#8b5cf6;color:white;padding:8px 16px;">LORANG</span>
          <div>
            <div style="font-weight:700;">Blocs d'Accumulation (Lorang)</div>
            <div class="muted">Blocs mono-focus intensifs</div>
          </div>
        </div>
        <div class="grid2 mt">
          <div>
            <h4>🎯 Principes clés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Blocs courts (7-10 jours) très ciblés</li>
              <li>Accumulation de stimulus spécifique</li>
              <li>Récupération entre blocs</li>
              <li>Alternance qualités (endurance, seuil, VO2max)</li>
            </ul>
          </div>
          <div>
            <h4>📌 Profils adaptés</h4>
            <ul class="muted" style="font-size:11px;">
              <li>Athlètes expérimentés</li>
              <li>Profils avec temps d'entraînement limité</li>
              <li>Phases de développement ciblé</li>
            </ul>
            <div class="muted mt" style="font-size:10px;font-style:italic;">Réf: Dan Lorang, Jan Frodeno coaching</div>
          </div>
        </div>
      </div>
      
      <!-- Recommandation personnalisée -->
      <div class="card cardHighlight mt">
        <h3>🧭 Recommandation pour votre profil</h3>
        <p class="muted" style="line-height:1.6;">
          ${vlamax.value !== null && vlamax.value > 0.40
            ? `<b>Profil glycolytique (VLamax: ${fmt(vlamax.value, 2)})</b> → La méthode <b>TFCL</b> ou <b>Polarisée</b> est recommandée pour réduire votre VLamax. Éviter les séances de type Z4b/Z5 prolongées qui maintiendraient un VLamax élevé.`
            : vlamax.value !== null && vlamax.value < 0.30
              ? `<b>Profil endurant (VLamax: ${fmt(vlamax.value, 2)})</b> → Méthode <b>Inversée</b> ou <b>Classique</b> avec du travail de puissance peut aider à développer votre punch. Intégrer du Z6/Z7 occasionnel.`
              : `<b>Profil équilibré</b> → Toutes les méthodologies peuvent convenir. <b>TFCL</b> reste recommandé pour optimiser finement votre profil selon l'objectif (${getObjectifLabel(athlete.goal)}).`
          }
          ${tte.tte_min < 40 
            ? `<br><br><b>TTE insuffisant (${tte.tte_min} min)</b> → Prioriser les séances de seuil prolongées (Tempo, Sweet Spot) quelle que soit la méthodologie choisie.`
            : ''
          }
        </p>
      </div>
    </section>
  `;

  // =============================================
  // SECTION TEMPLATE RECOMMANDÉ
  // =============================================
  const recommendedTemplateId = athlete.goal === "IM" || athlete.goal === "Ironman" ? "IRONMAN_KONA"
    : athlete.goal === "70.3" || athlete.goal === "IM703" ? "IRONMAN_703"
    : athlete.goal === "Marathon" ? "MARATHON"
    : athlete.goal === "Semi" || athlete.goal === "Semi-marathon" ? "SEMI_MARATHON"
    : null;
  
  const recommendedTemplate = recommendedTemplateId ? getTemplateById(recommendedTemplateId) : null;
  
  const templateRecommendationHTML = recommendedTemplate ? `
    <section id="template-recommendation" class="section pagebreakAvoid">
      <h2>📋 Template Recommandé</h2>
      
      <div class="card cardHighlight">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
          <div style="font-size:32px;">📄</div>
          <div>
            <div style="font-size:18px;font-weight:700;">${htmlEscape(recommendedTemplate.name)}</div>
            <div class="muted">Objectif: ${htmlEscape(recommendedTemplate.target)} • ${recommendedTemplate.weeks.length} semaines</div>
          </div>
        </div>
        
        <p class="muted">Ce template est recommandé en fonction de votre objectif <b>${getObjectifLabel(athlete.goal)}</b>. Il propose une structure de périodisation adaptée avec les phases clés de préparation.</p>
        
        <div class="grid3 mt">
          <div style="text-align:center;">
            <div class="muted">Durée</div>
            <div class="medium">${recommendedTemplate.weeks.length} sem.</div>
          </div>
          <div style="text-align:center;">
            <div class="muted">Phases</div>
            <div class="medium">${[...new Set(recommendedTemplate.weeks.map(w => w.phase).filter(Boolean))].length}</div>
          </div>
          <div style="text-align:center;">
            <div class="muted">Séances/sem</div>
            <div class="medium">~${Math.round(recommendedTemplate.weeks.reduce((acc, w) => acc + w.sessions.length, 0) / recommendedTemplate.weeks.length)}</div>
          </div>
        </div>
      </div>
      
      <div class="card mt">
        <h3>📅 Aperçu des phases</h3>
        <table style="font-size:11px;">
          <thead>
            <tr>
              <th>Semaine</th>
              <th>Phase</th>
              <th>Thème</th>
              <th>Nb séances</th>
            </tr>
          </thead>
          <tbody>
            ${recommendedTemplate.weeks.slice(0, 8).map(week => `
              <tr>
                <td><span class="badge badgePrimary">S${week.weekNumber}</span></td>
                <td>${htmlEscape(week.phase || '—')}</td>
                <td>${htmlEscape(week.theme || '—')}</td>
                <td>${week.sessions.length}</td>
              </tr>
            `).join('')}
            ${recommendedTemplate.weeks.length > 8 ? `<tr><td colspan="4" class="muted" style="text-align:center;">... et ${recommendedTemplate.weeks.length - 8} semaines supplémentaires</td></tr>` : ''}
          </tbody>
        </table>
      </div>
      
      <div class="alert alertInfo mt">
        💡 Ce template est disponible dans l'application. Chargez-le depuis la section "Templates" pour voir le détail complet des séances.
      </div>
    </section>
  ` : '';

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
  // I. CHECK-INS (si dispo)
  // =============================================
  const sortedCheckins = [...checkins].sort((a, b) => new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime());
  const lastCheckin = sortedCheckins[0];
  
  const checkinsHTML = checkins.length > 0 ? `
    <section id="checkins" class="section pagebreakAvoid">
      <h2>H. Check-ins & Monitoring</h2>
      ${lastCheckin ? `
        <div class="card">
          <h3>Dernier check-in: ${dtStr(lastCheckin.date_iso)}</h3>
          <div class="grid4 mt">
            <div>
              <div class="muted">Fatigue</div>
              <div class="medium">${lastCheckin.fatigue ?? "—"}/10</div>
            </div>
            <div>
              <div class="muted">Sommeil</div>
              <div class="medium">${lastCheckin.sleep ?? "—"}/10</div>
            </div>
            <div>
              <div class="muted">Stress</div>
              <div class="medium">${lastCheckin.stress ?? "—"}/10</div>
            </div>
            <div>
              <div class="muted">Readiness</div>
              <div class="medium">${lastCheckin.readiness ?? "—"}/10</div>
            </div>
          </div>
          ${lastCheckin.notes ? `<div class="mt muted">Notes: ${htmlEscape(lastCheckin.notes)}</div>` : ''}
        </div>
      ` : ''}
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
            ${raceReadiness.nutritionalRiskIndex ? (() => {
              const levelToPosition: Record<string, number> = { low: 12.5, moderate: 37.5, high: 62.5, critical: 87.5 };
              const pos = 10 + ((levelToPosition[raceReadiness.nutritionalRiskIndex.level] || 50) / 100) * 380;
              return `
                <polygon points="${pos},17 ${pos - 5},7 ${pos + 5},7" fill="#111"/>
                <text x="${pos}" y="65" font-size="10" fill="#111" text-anchor="middle" font-weight="700">▲ ${raceReadiness.nutritionalRiskIndex.label}</text>
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
      
      <!-- Race Readiness -->
      <div class="card pagebreakAvoid mt">
        <h3>🎯 Race Readiness</h3>
        <p class="muted">Race Readiness est un outil d'aide à la décision destiné aux coachs et staffs. Il évalue la cohérence entre le profil physiologique actuel de l'athlète et les exigences de son objectif.</p>
        
        <!-- Graphique Race Readiness avec jauge circulaire -->
        <div class="mt" style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <!-- Arc de fond -->
            <circle cx="60" cy="60" r="50" fill="none" stroke="#eee" stroke-width="12"/>
            <!-- Arc coloré selon score -->
            <circle cx="60" cy="60" r="50" fill="none" 
              stroke="${raceReadiness.score >= 80 ? '#16a34a' : raceReadiness.score >= 60 ? '#d97706' : '#dc2626'}" 
              stroke-width="12"
              stroke-dasharray="${(raceReadiness.score / 100) * 314} 314"
              stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
            <!-- Valeur centrale -->
            <text x="60" y="55" font-size="28" font-weight="700" fill="${raceReadiness.score >= 80 ? '#16a34a' : raceReadiness.score >= 60 ? '#d97706' : '#dc2626'}" text-anchor="middle">${raceReadiness.score}</text>
            <text x="60" y="72" font-size="10" fill="#666" text-anchor="middle">%</text>
          </svg>
          <div style="flex:1">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
              <!-- Mini barres pour chaque pilier -->
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">VLamax</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${raceReadiness.details.vlamax * 4}%;background:${raceReadiness.details.vlamax >= 20 ? '#16a34a' : raceReadiness.details.vlamax >= 15 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${raceReadiness.details.vlamax}/25</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">TTE</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${raceReadiness.details.endurance * 4}%;background:${raceReadiness.details.endurance >= 20 ? '#16a34a' : raceReadiness.details.endurance >= 15 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${raceReadiness.details.endurance}/25</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">FTP/kg</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${raceReadiness.details.puissance * 4}%;background:${raceReadiness.details.puissance >= 20 ? '#16a34a' : raceReadiness.details.puissance >= 15 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${raceReadiness.details.puissance}/25</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:10px;color:#666;margin-bottom:4px">Fraîcheur</div>
                <div style="height:40px;width:20px;background:#eee;border-radius:4px;margin:0 auto;position:relative;overflow:hidden">
                  <div style="position:absolute;bottom:0;width:100%;height:${raceReadiness.details.fraicheur * 4}%;background:${raceReadiness.details.fraicheur >= 18 ? '#16a34a' : raceReadiness.details.fraicheur >= 12 ? '#d97706' : '#dc2626'};border-radius:0 0 4px 4px"></div>
                </div>
                <div style="font-size:9px;font-weight:600;margin-top:2px">${raceReadiness.details.fraicheur}/25</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="alert ${raceReadiness.score >= 80 ? 'alertSuccess' : raceReadiness.score >= 60 ? 'alertWarning' : 'alertError'}">
          <b>${raceReadiness.label}</b> pour ${getObjectifLabel(athlete.goal)}
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
              <td><b>Race Readiness</b></td>
              <td>${raceReadiness.score}%</td>
              <td>Calculé (VLamax + TTE + FTP/kg + Fraîcheur)</td>
              <td><span class="badge ${raceReadiness.confidence >= 0.7 ? 'badgeSuccess' : raceReadiness.confidence >= 0.4 ? 'badgeWarning' : 'badgeError'}">${fmtPct(raceReadiness.confidence)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  // =============================================
  // FOOTER
  // =============================================
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
    indicateurs: indicateursHTML,
    raceReadiness: raceReadinessHTML,
    disponibiliteTFCL: disponibiliteTFCLHTML,
    raceSimulation: buildRaceSimulationHTML(payload, 'pro'),
    injuryRisk: injuryRiskHTML,
    nutritionV2: buildNutritionV2HTML(payload),
    fatmaxTFCL: buildFatMaxTFCLHTML(payload),
    ambitionTargets: ambitionTargetsHTML,
    ambitionPredictions: ambitionPredictionsHTML,
    evolutionCharts: evolutionChartsHTML,
    ageAdjustment: aaiHTML,
    ambitionLegend: ambitionLegendHTML,
    methodology: methodologyHTML,
    twoForCoaching: lorangHTML,
    wahoo: wahooHTML,
    planSuggestion: planSuggestionHTML,
    templateRecommendation: templateRecommendationHTML,
    zones: zonesHTML,
    historique: snapshotsHTML,
    tests: testsHTML,
    testsCalibration: testsCalibrationHTML,
    fitImports: fitImportsHTML,
    checkins: checkinsHTML,
    comprendre: comprendreHTML,
    qualite: qualiteHTML,
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

function buildAthleteReportHTML(payload: ExportPayload, logoBase64: string): string {
  const { athlete, raceReadiness } = payload;
  const athleteReport = generateAthleteReadiness(
    raceReadiness,
    athlete.goal || "IM",
    null
  );
  
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
// COMPONENT
// =============================================

export function ExportTools({ athlete, snapshots, tests, checkins = [], staffMode = false, ambition = DEFAULT_AMBITION }: ExportToolsProps) {
  // Charger les sections depuis le localStorage via la fonction utilitaire
  const [sections, setSections] = useState<ReportSections>(getSectionVisibility);
  
  // Persister les sections
  useEffect(() => {
    localStorage.setItem("vlab-export-sections", JSON.stringify(sections));
  }, [sections]);
  
  const payload = buildExportPayload(athlete, snapshots, tests, checkins, ambition);
  const exportCheck = canExport(payload);

  const handleExportPDF = async () => {
    if (!exportCheck.ok) {
      toast.error("Export impossible", { description: exportCheck.reason });
      return;
    }
    
    try {
      // Convert logo to base64 for embedding in the PDF
      const logoBase64 = await imageToBase64(logoUrl);
      
      const exportOptions: ExportOptions = {
        includeWahooSuggestions: sections.wahoo,
        sections
      };
      
      const html = buildStaffGradeReportHTML(payload, logoBase64, exportOptions);
      
      // Méthode alternative sans popup: créer un blob et télécharger
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      
      // Créer un lien de téléchargement
      const link = document.createElement("a");
      link.href = url;
      const fileName = `rapport-staff-${athlete.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.html`;
      link.download = fileName;
      
      // Pour iOS Safari: utiliser Web Share API pour partage natif
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS && navigator.share && navigator.canShare) {
        // Créer un fichier pour le partage natif iOS
        const file = new File([blob], fileName, { type: "text/html" });
        const shareData = { files: [file], title: `Rapport Staff - ${athlete.name}` };
        
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            toast.success("Rapport partagé", {
              description: "Le rapport a été partagé avec succès."
            });
          } catch (shareError) {
            // L'utilisateur a annulé le partage ou erreur
            if ((shareError as Error).name !== 'AbortError') {
              console.error("Erreur de partage:", shareError);
              // Fallback: ouvrir dans un nouvel onglet
              window.open(url, '_blank');
              toast.info("Rapport ouvert", {
                description: "Appuyez sur le bouton Partage en bas de l'écran pour sauvegarder."
              });
            }
          }
        } else {
          // Fallback si canShare retourne false
          window.open(url, '_blank');
          toast.info("Rapport ouvert", {
            description: "Appuyez sur le bouton Partage en bas de l'écran pour sauvegarder."
          });
        }
      } else if (isIOS) {
        // Fallback iOS sans Web Share API
        window.open(url, '_blank');
        toast.info("Rapport ouvert", {
          description: "Appuyez sur le bouton Partage en bas de l'écran pour sauvegarder."
        });
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Rapport téléchargé", {
          description: "Ouvrez le fichier HTML et utilisez Imprimer > Enregistrer en PDF."
        });
      }
      
      // Nettoyer l'URL blob après un délai
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      toast.error("Erreur d'export", { 
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la génération du rapport." 
      });
    }
  };

  const handleExportAthletePDF = async () => {
    if (!exportCheck.ok) {
      toast.error("Export impossible", { description: exportCheck.reason });
      return;
    }
    
    try {
      const logoBase64 = await imageToBase64(logoUrl);
      const html = buildAthleteReportHTML(payload, logoBase64);
      
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      
      const fileName = `mon-etat-de-forme-${athlete.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.html`;
      
      // Pour iOS Safari: utiliser Web Share API pour partage natif
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS && navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: "text/html" });
        const shareData = { files: [file], title: `Mon État de Forme - ${athlete.name}` };
        
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            toast.success("Rapport partagé", {
              description: "Le rapport a été partagé avec succès."
            });
          } catch (shareError) {
            if ((shareError as Error).name !== 'AbortError') {
              window.open(url, '_blank');
              toast.info("Rapport ouvert", {
                description: "Appuyez sur le bouton Partage en bas de l'écran pour sauvegarder."
              });
            }
          }
        } else {
          window.open(url, '_blank');
          toast.info("Rapport ouvert", {
            description: "Appuyez sur le bouton Partage en bas de l'écran pour sauvegarder."
          });
        }
      } else if (isIOS) {
        window.open(url, '_blank');
        toast.info("Rapport ouvert", {
          description: "Appuyez sur le bouton Partage en bas de l'écran pour sauvegarder."
        });
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Rapport Athlète téléchargé", {
          description: "Un rapport simplifié et encourageant pour l'athlète."
        });
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error) {
      console.error("Erreur lors de l'export Athlète:", error);
      toast.error("Erreur d'export", { 
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la génération du rapport." 
      });
    }
  };

  const toggleSection = (key: keyof ReportSections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setSections(DEFAULT_REPORT_SECTIONS);
  };

  const deselectAll = () => {
    const allFalse: ReportSections = {
      synthese: false,
      compass: false,
      profilMetabolique: false,
      indicateurs: false,
      raceReadiness: false,
      disponibiliteTFCL: false,
      raceSimulation: false, // ✅ NEW
      injuryRisk: false,
      nutritionV2: false,
      fatmaxTFCL: false,
      ambitionTargets: false,
      ambitionPredictions: false,
      evolutionCharts: false,
      ageAdjustment: false,
      ambitionLegend: false,
      methodology: false,
      twoForCoaching: false,
      wahoo: false,
      planSuggestion: false,
      templateRecommendation: false,
      zones: false,
      historique: false,
      tests: false,
      testsCalibration: false,
      fitImports: false,
      checkins: false,
      comprendre: false,
      qualite: false,
    };
    setSections(allFalse);
  };

  const selectedCount = Object.values(sections).filter(Boolean).length;
  const totalCount = Object.keys(sections).length;

  if (!exportCheck.ok) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>{exportCheck.reason}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            📄 Export PDF
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="end">
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
                  className="w-full justify-start gap-3 h-auto py-2.5"
                >
                  <Shield className="h-4 w-4" />
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
                  className="w-full justify-start gap-3 h-auto py-2.5"
                >
                  <User className="h-4 w-4 text-primary" />
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">Rapport Athlète</div>
                    <div className="text-[10px] text-muted-foreground">Simple, encourageant</div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Button>
              </div>
            </TabsContent>
            
            {/* Onglet Sections */}
            <TabsContent value="sections" className="mt-0 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Sections Staff ({selectedCount}/{totalCount})
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
                className="w-full gap-2"
              >
                <FileText className="h-4 w-4" />
                Générer le rapport Staff
              </Button>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}
