/**
 * Scientific Charts – Two For Coaching Lab
 * Export centralisé des graphiques staff-grade et composants unifiés
 */

export { EnergyProfileChart } from "./EnergyProfileChart";
export { RaceReadinessGauge } from "./RaceReadinessGauge";
export { TTETargetChart } from "./TTETargetChart";
export { PerformanceRiskMatrixChart } from "./PerformanceRiskMatrixChart";
export { NutritionPredictiveChart } from "./NutritionPredictiveChart";
export { EnergyContributionChart } from "./EnergyContributionChart";
export { StaffModeToggle } from "./StaffModeToggle";
export { ScientificChartsDashboard } from "./ScientificChartsDashboard";
export { MetabolicPerformanceCompass, CompassMini, COMPASS_METHODOLOGY } from "./MetabolicPerformanceCompass";
export { AmbitionProgressChart, calculateAmbitionPredictions, type AmbitionPrediction } from "./AmbitionProgressChart";

// Composants unifiés d'affichage des métriques
export { ScoreEnvelopeCard, ScoreEnvelopeCardGroup, ScoreEnvelopeInlineCard } from "../ScoreEnvelopeCard";
export { ScoreEnvelopeDisplay, ScoreEnvelopeGrid, ScoreEnvelopeInline } from "../ScoreEnvelopeDisplay";
export { MetricHelpButton } from "../MetricHelpButton";

// Système de transparence scientifique
export { 
  ScientificBadge, 
  LowConfidenceWarning,
  createScientificMetadata,
  PEDAGOGICAL_TEXTS,
  type ScientificMetadata,
  type DataOrigin
} from "../ScientificBadge";
export { 
  DataQualityBlock, 
  DataQualityInline,
  calculateDataQualityStats,
  getQualityMessage,
  type DataQualityStats 
} from "../DataQualityBlock";

// Système de plages de performance réalistes
export {
  PerformanceRangeDisplay,
  PerformanceRangeInline,
  PerformanceRangeGroup,
} from "../PerformanceRangeDisplay";
export {
  computeFtpKgRange,
  computeTTERange,
  computeVLamaxRange,
  computeVO2maxRange,
  computePerformanceRange,
  getCurrentZone,
  generateRangeInterpretation,
  PERFORMANCE_RANGE_DISCLAIMER,
  WHY_NO_SINGLE_TARGET,
  ACADEMY_RANGES_CHAPTER,
  type PerformanceRange,
  type PerformanceRangeContext,
  type PerformanceMetric,
  type PerformanceZone,
} from "@/lib/performanceRanges";
