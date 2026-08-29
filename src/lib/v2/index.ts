// Unified Limiter Detection — Single Source of Truth for Limiting Factors
export * from "./unifiedLimiterDetection";

// FatMax TFCL™
export * from "./fatmaxTFCL";

// TFCL Decision Matrix™ — Matrice Décisionnelle Officielle
export * from "./tfclDecisionMatrix";

// VLamax Bike V2 Enhanced (new formula with power indices)
export * from './vlamaxBikeV2Enhanced';

// Disponibilité TFCL™ (remplace Fraîcheur)
export * from './disponibiliteTFCL';

// Potentiel Physiologique V2 (Potentiel × Disponibilité → Décision)

// Système de symptômes terrain et matrice décisionnelle
export * from "./tfclSymptoms";

// Lorang Strategy Engine — Leviers opérationnels TFCL
export * from "./lorangStrategyEngine";

// Usable Pacing Ceiling (Potentiel Physiologique + Simulation Engine V2)
export * from "./usablePacingCeiling";

// Scenario Engine (3-scenarios unified system)
export * from './scenarioEngine';

/**
 * TWO FOR COACHING LAB V2 — Index
 * 
 * Point d'entrée unique pour tous les modules V2 scientifiques.
 * 
 * Usage:
 * import { computeVLamaxV2, isV2Enabled } from '@/lib/v2';
 */

// Configuration
export { 
  V2_CONFIG, 
  isV2Enabled, 
  getV2Badge,
  SCIENTIFIC_REFERENCES,
  PHYSIOLOGICAL_BOUNDS,
  CONFIDENCE_LEVELS,
  V2_TEXTS
} from './scientificConfig';

// VLamax V2 — Formule Officielle TFCL™
export { 
  computeVLamaxV2,
  computeVLamaxBikeV2,
  formatVLamaxRangeLabel,
  getVLamaxConfidenceLabel,
  getVLamaxSourcesLabel,
  getVLamaxCategoryColor,
  getVLamaxCategory,
  getCategoryLabel,
  getCategoryDescription,
  VLAMAX_CONCEPT,
  VLAMAX_SCALE,
  VLAMAX_ESTIMATION_EXPLAINER,
  VLAMAX_CHATBOT_QA,
  type VLamaxRangeV2,
  type VLamaxSourceV2,
  type VLamaxCategoryV2,
  type VLamaxV2Input,
  type VLamaxBikeV2Result
} from './vlamaxV2';

// TTE V2 — F32: supprimé (dead code). Source unique = src/lib/tteEffectif.ts (computeTTEEffectif)
// délégant à src/lib/ttePro.ts pour formules + targets.

// Running Economy V2
export {
  computeRunningEconomyV2,
  getEconomyLevelColor,
  getEconomyBadgeClass,
  type RunningEconomyV2,
  type EconomyLevelV2,
  type RunningEconomyV2Input,
  type EstimatedO2Cost
} from './runningEconomyV2';

// Compass CAP (Running-Specific 6-Axis Compass)
export {
  computeCompassCAPScores,
  getCompassCAPChartData,
  getVO2maxTarget,
  getVVO2maxTarget,
  getPaceThresholdTarget,
  type CompassCAPScores,
  type CompassCAPAxisScore,
  type CompassCAPInput,
} from '../compassScoringCAP';

// Fatigue V2 — F35: supprimé (dead code). Source unique = src/lib/fatigueEffectif.ts (computeFatigueEffectif)

// Nutrition V2
export {
  computeNutritionV2,
  getNutritionRiskColor,
  getNutritionBadgeClass,
  getNutritionRiskIcon,
  formatCarbsRange,
  NUTRITION_PHILOSOPHY,
  NUTRITION_RISK_SCALE,
  ACADEMY_NUTRITION_MODULE,
  PDF_NUTRITION_SECTION,
  NUTRITION_CHATBOT_QA,
  type NutritionPredictiveV2,
  type NutritionRiskV2,
  type NutritionV2Input,
  type NutritionContributor
} from './nutritionV2';

// Injury Risk V2 — F32/F35: supprimé (dead code). Source unique = injuryRiskUnified ci-dessous.

// Injury Risk Unified TFCL™ (CAP & Vélo)
export {
  // Philosophy & Constants
  INJURY_RISK_PHILOSOPHY,
  INJURY_RISK_DATA_SOURCES,
  INJURY_RISK_SCALE,
  INJURY_RISK_LEGAL_DISCLAIMER,
  
  // Compute functions
  computeInjuryRiskTFCL,
  computeCAPInjuryRisk,
  computeBikeInjuryRisk,
  getInjuryRiskAnnotations,
  
  // UI Helpers
  getInjuryRiskIcon,
  getInjuryRiskColorClass,
  getInjuryRiskBadgeClass as getInjuryRiskBadgeClassUnified,
  
  // Academy & PDF
  ACADEMY_INJURY_RISK_MODULE,
  PDF_INJURY_RISK_SECTION,
  INJURY_RISK_CHATBOT_QA,
  
  // Types
  type InjuryRiskLevelUnified,
  type InjuryRiskDriver,
  type InjuryRiskEnvelope,
  type CAPRiskInput,
  type BikeRiskInput,
  type InjuryRiskSport,
  type InjuryRiskTFCLInput
} from './injuryRiskUnified';

// Academy V2
export {
  ACADEMY_V2_MODULE
} from './academyV2';

// Validation Framework
export {
  // Textes officiels
  VALIDATION_TEXTS,
  
  // Classification des données
  CONFIDENCE_BADGES,
  PARAMETER_CLASSIFICATION,
  type DataConfidenceLevel,
  type DataConfidenceInfo,
  
  // Moteur recommandation test labo
  computeLabTestRecommendation,
  LAB_TRIGGER_MESSAGES,
  type LabTestTrigger,
  type LabTestRecommendation,
  type LabTestEngineInput,
  
  // Échelle d'utilisation
  USAGE_LEVELS,
  getAthleteLevel,
  getUsageLevelInfo,
  type AthleteLevel,
  type UsageLevelInfo,
  
  // Statut de validation
  computeValidationStatus,
  type ValidationStatus,
  type PhysiologicalValidationStatus,
  
  // Academy module
  ACADEMY_LAB_TEST_MODULE,
} from './validationFramework';

// Scientific Governance
export {
  METHOD_VERSION,
  METHOD_VERSION_DISPLAY,
  METHOD_VERSION_FULL,
  CURRENT_VERSION,
  EXPERIMENTAL_VERSION,
  STABILITY_RULE,
  METHOD_V1_SPECIFICATION,
  SCIENTIFIC_CHANGELOG,
  EVOLUTION_RULES,
  FORBIDDEN_CHANGES,
  V2_EXPERIMENTAL_CONFIG,
  PDF_FOOTER_TEXT,
  PDF_METHODOLOGY_PAGE,
  ASSISTANT_VERSION_RULES,
  ACADEMY_VERSIONING_MODULE,
  OFFICIAL_POSITIONING,
  getCurrentMethodVersion,
  getExperimentalVersion,
  formatVersionText,
  getChangelogByType,
  getChangelogForVersion,
  areVersionsCompatible,
  generatePdfFooter,
  formatAssistantResponse,
  getV1Modules,
  getModuleSpec,
  type MethodVersion,
  type VersionType,
  type ChangeType,
  type ScientificChangeLog,
  type EvolutionRule,
  type ExperimentalConfig,
  type MethodSpecification,
  type ModuleSpec
} from './scientificGovernance';

// Official Reference Document
export {
  OFFICIAL_INTRODUCTION,
  FOUNDING_PHILOSOPHY,
  MEASURED_DATA,
  MODELED_DATA,
  CONFIDENCE_INDICES,
  APPLICATION_OUTPUTS,
  POTENTIEL_DEFINITION,
  APP_CAPABILITIES,
  RESPONSIBILITY_ETHICS,
  VERSIONING_STATEMENT,
  OFFICIAL_REFERENCE_DOCUMENT,
  getReferenceSection,
  getOfficialIntroduction,
  getCentralPrinciple,
  getConfidenceRule,
  getPotentielStatement,
  getEthicsStatement,
  generatePdfSummary
} from './officialReference';

// Coach Charter
export {
  COACH_ROLE,
  DATA_READING_RULES,
  SCORES_USAGE,
  VLAMAX_USAGE,
  TTE_USAGE,
  FATIGUE_RISK_USAGE,
  POTENTIEL_USAGE,
  ATHLETE_COMMUNICATION,
  LAB_TESTS_LIMITS,
  PROFESSIONAL_RESPONSIBILITY,
  COACH_CHARTER,
  ACADEMY_COACH_CHARTER_MODULE,
  PDF_COACH_CHARTER_SECTION,
  getCharterSection,
  getCoachRoleText,
  getDataReadingRules,
  getRecommendedPhrase,
  getPhraseToAvoid,
  getProfessionalResponsibilityText,
  hasCompletedCharterModule,
  generateCharterPdfSummary,
  type CoachCharterSection
} from './coachCharter';

// Method Definition
export {
  METHOD_PHILOSOPHY,
  METHOD_LEVELS,
  SCIENTIFIC_PILLARS,
  VLAMAX_POSITIONING,
  TTE_POSITIONING,
  REALISTIC_RANGES,
  SAFEGUARDS,
  COACH_CENTRAL_ROLE,
  METHOD_LIMITS,
  TRACEABILITY_EVOLUTION,
  METHOD_DEFINITION,
  ACADEMY_METHOD_MODULE,
  PDF_METHOD_SECTION,
  getMethodLevel,
  getMethodLevelByNumber,
  getMethodSection,
  getPhilosophyText,
  getFundamentalPrinciples,
  getScientificKeyStatement,
  getLevelBadge,
  getLevelColor,
  generateMethodPdfSummary,
  classifyData,
  type MethodLevel,
  type MethodSection
} from './methodDefinition';

// Sport Specifics
export {
  SPORT_CONTEXTS,
  MULTISPORT_PRINCIPLE,
  CYCLING_SPECIFICS,
  RUNNING_SPECIFICS,
  TRIATHLON_SPECIFICS,
  METHODOLOGICAL_CONSEQUENCES,
  MULTISPORT_SAFEGUARDS,
  CONTEXTUAL_MESSAGES,
  METRIC_WEIGHTS,
  SPORT_SPECIFICS_DOCUMENT,
  ACADEMY_SPORT_SPECIFICS_MODULE,
  getSportContext,
  getSportSpecifics,
  getContextualMessage,
  getMessagesForMetric,
  getMetricWeight,
  applySpweightToValue,
  getSportRiskStatement,
  getSportKeyInsight,
  generateCrossportMessage,
  type SportType,
  type SportContext,
  type SportContextualMessage,
  type MetricWeight
} from './sportSpecifics';

// Training Levers
export {
  LEVERS_FOUNDING_PRINCIPLE,
  CYCLING_LEVERS,
  RUNNING_LEVERS,
  TRIATHLON_LEVERS,
  ALL_SPORT_LEVERS,
  LEVERS_SAFEGUARDS,
  TRAINING_LEVERS_DOCUMENT,
  ACADEMY_LEVERS_MODULE,
  ANNOTATION_EXAMPLES,
  CHATBOT_LEVER_RESPONSES,
  generateLeverAnnotation,
  generateChatbotResponse,
  getLeversForSport,
  getLeverById,
  getPriorityLevers,
  getDiscouragedLevers,
  isLeverAllowed,
  getSportLeverStatement,
  classifySessionByLevers,
  type LeverStatus,
  type LeverCategory,
  type TrainingLever,
  type SportLevers,
  type LeverAnnotation,
  type ChatbotLeverResponse
} from './trainingLevers';

// Cadence & Force
export {
  CADENCE_KEY_PRINCIPLE,
  VLAMAX_FORCE_CADENCE_RELATION,
  EX_SPRINTER_PROFILE,
  IDEAL_CADENCE_SAFEGUARDS,
  CADENCE_RANGES,
  CADENCE_RECOMMENDATIONS,
  CADENCE_CHATBOT_QA,
  CADENCE_SYNTHESIS,
  CADENCE_FORCE_DOCUMENT,
  ACADEMY_CADENCE_MODULE,
  getCadenceInterpretation,
  generateCadenceRecommendation,
  findCadenceChatbotAnswer,
  generateCadenceAnnotation,
  analyzeCadenceForceProfile,
  getCadenceSynthesisMessage,
  shouldRecommendLowCadenceWork,
  type CadenceRange,
  type ForceProfile,
  type CadenceInterpretation,
  type CadenceRecommendation,
  type CadenceChatbotQA,
  type CadenceAnnotation
} from './cadenceForce';

// Cadence Work Ranges
export {
  METHODOLOGICAL_PRINCIPLE,
  DATA_SOURCES,
  BIKE_WORK_RANGES,
  CAP_OBSERVATION,
  THRESHOLDS,
  CADENCE_WORK_RANGES_DOCUMENT,
  ACADEMY_CADENCE_RANGES_MODULE,
  CADENCE_RANGE_CHATBOT_QA,
  computeCadenceWorkRanges,
  getRangeColorClass,
  getRangeIconClass,
  formatRpmRange,
  formatZones,
  generateCadenceRangeAnnotation,
  findCadenceRangeChatbotAnswer,
  type SportType as CadenceRangeSportType,
  type RangeCategory,
  type CadenceWorkRange,
  type CadenceRangeResult,
  type CadenceWorkRangesInput,
  type CadenceRangeAnnotation,
  type CadenceRangeChatbotQA
} from './cadenceWorkRanges';

// Profile Terminology (ex-Snapshot)
export {
  PROFILE_TERMINOLOGY,
  PROFILE_DEFINITION,
  PROFILE_DATA_CATEGORIES,
  PROFILE_FIELDS,
  PROFILE_SAFEGUARD,
  PDF_PROFILE_SECTION,
  ACADEMY_PROFILE_MODULE,
  PROFILE_CHATBOT_QA,
  PROFILE_TERMINOLOGY_DOCUMENT,
  getProfileName,
  getFieldCategory,
  getCategoryInfo,
  getFieldBadge,
  getFieldBadgeColor,
  findProfileChatbotAnswer,
  type DataCategory,
  type ProfileDataField,
  type ProfileChatbotQA
} from './profileTerminology';

// IFSC - Indice de Force Spécifique Cycliste
export {
  IFSC_PRINCIPLE,
  IFSC_DATA_SOURCES,
  IFSC_SCALE,
  CADENCE_FORCE_MATRIX,
  IFSC_SAFEGUARD,
  IFSC_DOCUMENT,
  ACADEMY_IFSC_MODULE,
  IFSC_CHATBOT_QA,
  computeIFSC,
  getCadenceForceInterpretation,
  getIFSCScaleInfo,
  getIFSCColor,
  getIFSCBgColor,
  getRiskColor,
  formatIFSCScore,
  generateIFSCAnnotation,
  findIFSCChatbotAnswer,
  type IFSCLevel,
  type IFSCResult,
  type IFSCInput,
  type CadenceForceMatrix,
  type IFSCAnnotation,
  type IFSCChatbotQA
} from './ifsc';

// Metabolic Balance Map™ - Graphique signature TFCL
export {
  MAP_ZONES,
  MAP_PEDAGOGY,
  ACADEMY_METABOLIC_MAP_MODULE,
  PDF_MAP_SECTION,
  CHATBOT_MAP_QA,
  generateMetabolicBalanceMapData,
  computeAthleteMapPosition,
  computeProjectedPosition,
  generateMapExplanation,
  type MapZoneId,
  type MapZone,
  type AthleteMapPosition,
  type MapDataPoint,
  type MetabolicBalanceMapData,
  type MapInput,
  type MapExplanation
} from './metabolicBalanceMap';

// Method Framework (Cadre Officiel Consolidé TFCL™)
export {
  METHOD_OFFICIAL_POSITIONING,
  PILLAR_MEASURED,
  PILLAR_MODELED,
  PILLAR_ADVISED,
  METHOD_PILLARS,
  PERFORMANCE_RANGES,
  RANGE_RULE,
  SCORE_DISPLAY_RULES,
  SCORE_DISPLAY_FORMAT,
  DASHBOARD_UI_RULE,
  PDF_INTRO_PAGE,
  ACADEMY_METHOD_FRAMEWORK,
  CHATBOT_METHOD_RULES,
  SIGNATURE_CHARTS,
  ACADEMY_MODULES_COMPLETE,
  CHATBOT_COMPLETE_RULES,
  METHOD_FRAMEWORK_DOCUMENT,
  getPillarForData,
  getDataSourceBadge,
  formatScoreWithRange,
  getRangeCategory,
  generateRangeJustification,
  type DataPillar,
  type PillarDefinition,
  type RangeCategory as MethodRangeCategory,
  type PerformanceRange,
  type ScoreDisplayRule
} from './methodFramework';

// Signature Charts TFCL™
export {
  SIGNATURE_CHARTS_DOC,
  COMPASS_CHART,
  RISK_MATRIX_CHART,
  EVOLUTION_CHART,
  CADENCE_PROFILE_CHART,
  CHART_DISCLAIMERS,
  ACADEMY_CHARTS_MODULES,
  PDF_CHARTS_SECTION,
  CHARTS_CHATBOT_QA,
  computeCompassZones,
  computeRiskMatrixPosition,
  computeEvolutionTrend,
  computeCadenceProfilePosition,
  type CompassZoneInput,
  type CompassZoneResult,
  type RiskMatrixInput,
  type RiskMatrixResult,
  type EvolutionDataPoint,
  type EvolutionChartResult,
  type CadenceProfileInput,
  type CadenceProfileResult
} from './signatureCharts';

// Physiological Versioning System
export {
  PHYSIO_ENGINES,
  PHYSIO_ENGINE_CHANGELOG,
  VALIDATION_LEVELS,
  SCIENTIFIC_REFERENCES_GLOBAL,
  LEGAL_DISCLAIMER,
  NON_RETROACTIVITY_RULE,
  ACADEMY_SCIENTIFIC_VALIDATION,
  PDF_METHODOLOGY_SECTION,
  VERSIONING_CHATBOT_QA,
  getEngineVersion,
  getEngineVersionCode,
  getValidationBadge,
  getEngineChangelog,
  formatEngineVersion,
  createSnapshotMetadata,
  type EngineId,
  type ValidationLevel,
  type ImpactLevel,
  type PhysioEngineVersion,
  type ScientificReference,
  type ChangelogEntry,
  type SnapshotEngineMetadata
} from './physiologicalVersioning';

// Adaptive Precision Engine™
export {
  // Configuration
  CONFIDENCE_THRESHOLDS,
  UNCERTAINTY_MULTIPLIERS,
  TIME_UNCERTAINTY_MULTIPLIERS,
  
  // Functions
  getConfidenceLevel,
  getEffectiveUncertainty,
  computeAdaptiveRange,
  computeAdaptiveTimeRange,
  computeAdaptiveVLamaxRange,
  computeAdaptiveScore,
  
  // Documentation
  PRECISION_METHODOLOGY,
  ACADEMY_ADAPTIVE_PRECISION,
  
  // Types
  type ConfidenceLevel,
  type PrecisionConfig,
  type AdaptiveRange,
  type TimeRange,
} from './adaptivePrecision';

// Pacing Envelope™ TFCL — Système de discipline de pacing
export {
  // Engine
  computePacingEnvelope,
  getZoneColor,
  getZoneBgColor,
  getZoneChartColor,
  getIntensityZone,
  formatEnvelopeRange,
  formatEnvelopeWithCenter,
  PACING_ENVELOPE_DEFINITIONS,
  type PacingEnvelopeInput,
  type PacingEnvelopeResult,
  type EnvelopeBoundary,
  type EnvelopeZone,
  type EnvelopeZoneDefinition,
  type RaceObjective as PacingRaceObjective,
  type PacingProfile,
  type PacingProfile_Metadata,
} from './pacingEnvelopeEngine';

// Discipline Rules
export {
  generateDisciplineRules,
  getCategoryColor,
  getCategoryBgColor,
  getCategoryLabel as getRuleCategoryLabel,
  getPriorityIcon,
  type DisciplineRule,
  type DisciplineRulesResult,
  type DisciplineRulesInput,
  type RuleCategory,
  type RulePriority,
  type SemiLiveSegments,
} from './pacingDisciplineRules';

// Scenario Simulator
export {
  simulatePacingScenarios,
  getSeverityColor,
  getSeverityBgColor,
  getSeverityLabel,
  getPhaseLabel,
  formatConsequenceImpact,
  SCENARIO_DEFINITIONS,
  type PacingScenario,
  type ScenarioSimulationInput,
  type ScenarioSimulationResult,
  type ScenarioType,
  type ConsequenceSeverity,
  type RacePhase,
} from './pacingScenarioSimulator';

// Race Day Briefing (Athlete mode)
export {
  generateRaceDayBriefing,
  getToneColor,
  getToneBgColor,
  getZoneColorClass,
  getZoneBorderClass,
  type AthleteBriefingInput,
  type RaceDayBriefingResult,
  type KeyMessage,
  type GoldenRule,
  type CriticalError,
  type SimplifiedZone,
} from './raceDayBriefing';

// Staff Pacing Report V2
export {
  generateStaffPacingReport,
  getMetricStatusColor,
  getMetricStatusBg,
  getSeverityColor as getStaffSeverityColor,
  getSeverityBadgeColor,
  type StaffPacingReportInput,
  type StaffPacingReportResult,
  type ToleranceProfile,
  type EnvelopeTechnical,
  type ErrorScenario,
  type CoachCommunication,
  type SimulationLink,
} from './staffPacingReport';


// Intensity Reference Engine (TFCL V2)
export {
  resolveIntensity,
  formatIntensityWithRef,
  isValidIntensityDisplay,
  getIntensityWarning,
  getReferencesForSport,
  generateIntensityReferenceSummary,
  INTENSITY_REFERENCES,
  ENERGY_SYSTEM_CONFIG,
  type Sport as IntensitySport,
  type IntensityReferenceType,
  type EnergySystem,
  type IntensityReference,
  type ResolvedIntensity,
  type IntensityInput,
  type IntensityReferenceSummary,
} from './intensityReferenceEngine';

// Pacing Envelope Long Distance Extension (TFCL)
export {
  computeLongDistanceEnvelope,
  LONG_DISTANCE_THRESHOLD_HOURS,
  CRITICAL_DURATION_HOURS,
  FATMAX_MAX_OFFSET_LONG,
  LONG_DISTANCE_PHILOSOPHY,
  LONG_DISTANCE_ACADEMY_CONTENT,
  type LongDistanceInput,
  type LongDistanceEnvelopeResult,
  type LongDistanceRiskIndex,
  type DisciplineBuffer,
  type GlycogenCollapseThreshold,
  type PacingScenarioType,
  type HistoricalFade,
} from './pacingEnvelopeLongDistance';

// Running Double Loop — Boucle Lente + Boucle Rapide CAP
export {
  // Types Boucle Lente
  type RunningPhysioProfile,
  type RunningObjectiveDistance,
  type RunningPriorityLever,
  type LockedMetric,
  type MetricSource,
  
  // Types Boucle Rapide
  type RunningWeeklyDecision,
  type WeeklyInputs,
  type WeeklyConstraints,
  type ReadinessLevel,
  type RiskLevel,
  type StrategyStatus,
  type WeeklyFocus,
  type IntensityAllowed,
  
  // Types Recalibration
  type RecalibrationAlert,
  type RecalibrationTrigger,
  
  // Constantes
  LEVER_BY_OBJECTIVE,
  LEVER_INFO,
  
  // Fonctions
  createRunningPhysioProfile,
  computeWeeklyDecision,
  checkRecalibrationAlerts,
} from './runningDoubleLoop';

// Readiness Types — Legacy stubs for backward compat
export {
  type ReadinessState,
  type PotentielRun,
  type AvailabilityRun,
  type SimulationModifiers,
  type PotentielV2Result,
} from './potentielTypes';

// Running Limiter Detection — Limiteurs 100% CAP
export {
  type RunningLimiterResult,
  type RunningLimiterInput,
  type RunningGapAnalysis,
  detectRunningLimiter,
} from './runningLimiterDetection';

// Pacing Envelope Running — Course à pied
export {
  // Types
  type RunningDistance,
  type PacingZoneRun,
  type AthleteExperience,
  type PacingInputsRun,
  type PacingZoneDefinitionRun,
  type PacingRulesRun,
  type PacingScenarioRun,
  type PacingBriefingRun,
  type PacingEnvelopeRunResult,
  
  // Constantes
  PACING_ZONE_COLORS,
  PACING_ZONE_LABELS,
  
  // Fonctions
  computePacingEnvelopeRun,
  formatPace,
  pctThresholdToSecPerKm,
} from './pacingEnvelopeRunning';
