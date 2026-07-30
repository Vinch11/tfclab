/**
 * Scientific Charts – Two For Coaching Lab
 * Export centralisé des graphiques staff-grade et composants unifiés
 */

export { EnergyProfileChart } from "./EnergyProfileChart";
export { TTETargetChart } from "./TTETargetChart";
export { PerformanceRiskMatrixChart } from "./PerformanceRiskMatrixChart";
export { NutritionPredictiveChart } from "./NutritionPredictiveChart";
export { EnergyContributionChart } from "./EnergyContributionChart";
export { StaffModeToggle } from "./StaffModeToggle";
export { ScientificChartsDashboard } from "./ScientificChartsDashboard";
export { MetabolicPerformanceCompassV2 as MetabolicPerformanceCompass, MetabolicPerformanceCompassV2 } from "./MetabolicPerformanceCompassV2";
export { CompassMini, COMPASS_METHODOLOGY } from "./MetabolicPerformanceCompass";
export { MetabolicCompassCAP } from "./MetabolicCompassCAP";
export { AmbitionProgressChart, calculateAmbitionPredictions, type AmbitionPrediction } from "./AmbitionProgressChart";
export { AmbitionProgressMini } from "./AmbitionProgressMini";
export { CadenceProfileChart } from "./CadenceProfileChart";
export { MiniGauge } from "./MiniGauge";
export { CompactMetricsGrid } from "./CompactMetricsGrid";
export { CarbBurnRateChart } from "./CarbBurnRateChart";
export { MetabolicPowerCurve } from "./MetabolicPowerCurve";
export { PacingDisciplineChart } from "./PacingDisciplineChart";
export { PacingEnvelopeBar, PacingEnvelopeBarInline } from "./PacingEnvelopeBar";
export { LongDistanceEnvelopeChart, LongDistanceEnvelopeInline } from "./LongDistanceEnvelopeChart";
export { PotentialAvailabilityDecisionChart } from "./PotentialAvailabilityDecisionChart";
export { PacingEnvelopeRunChart } from "./PacingEnvelopeRunChart";
export { VLamaxEstimationWidget } from "./VLamaxEstimationWidget";
export { SimulatedLactateCurveChart } from "./SimulatedLactateCurveChart";
export { FatCarbOxidationChart } from "./FatCarbOxidationChart";
export { PerformancePredictionChart } from "./PerformancePredictionChart";
export { PowerDurationUnifiedChart } from "./PowerDurationUnifiedChart";
export { MetabolicZonesINSCYDChart } from "./MetabolicZonesINSCYDChart";

// Thème graphique Bevel (couleurs de séries, props axes/grilles/lignes)
export {
  BEVEL_CHART_COLORS,
  BEVEL_SERIES_PALETTE,
  bevelSeriesColor,
  bevelAxisProps,
  bevelGridProps,
  bevelLineProps,
} from "./bevelChartTheme";

// Utilitaires pour graphiques responsives (mobile/touch)

export {
  ResponsiveChartTooltip,
  mobileTooltipProps,
  responsiveAxisProps,
  responsiveDotProps,
  responsiveGridProps,
  useIsTouchDevice,
  getResponsiveMargins,
} from "./ResponsiveChartTooltip";


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

// WorkoutAdvisoryEngine™ - Recommandations de séances intelligentes
export {
  WorkoutAdvisoryCard,
  WorkoutAdvisoryBadge,
  WorkoutAdvisoryList,
  EXAMPLE_ADVISORY_DISPLAY,
} from "../WorkoutAdvisoryCard";
export {
  generateWorkoutAdvisories,
  getWorkoutAdvisory,
  WORKOUT_PHYSIO_TAGS,
  FATIGUE_THRESHOLDS,
  ADVISORY_MESSAGES,
  WORKOUT_ADVISORY_DISCLAIMER,
  ACADEMY_WORKOUT_CHAPTER,
  ASSISTANT_WORKOUT_RESPONSE,
  type WorkoutAdvisory,
  type WorkoutPhysioTags,
  type AdvisoryStatus,
  type AdvisoryContext,
  type AdvisoryEngineOutput,
  type Platform,
  type IntensityType,
  type LoadLevel,
  type DurationClass,
} from "@/engines/decision";
