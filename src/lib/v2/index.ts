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

// TTE V2
export {
  computeTTEV2,
  formatTTERangeLabel,
  getTTEStatusColor,
  getTTEStatusBadgeClass,
  type TTERangeV2,
  type TTESourceV2,
  type TTEStatusV2,
  type TTEFactorV2,
  type TTEV2Input
} from './tteV2';

// Running Economy V2
export {
  computeRunningEconomyV2,
  getEconomyLevelColor,
  getEconomyBadgeClass,
  type RunningEconomyV2,
  type EconomyLevelV2,
  type RunningEconomyV2Input
} from './runningEconomyV2';

// Fatigue V2
export {
  computeFatigueV2,
  getFatigueLevelColor,
  getFatigueBadgeClass,
  getFatigueProgressColor,
  getFatigueIcon,
  FATIGUE_PHILOSOPHY,
  FATIGUE_SCALE,
  ACADEMY_FATIGUE_MODULE,
  PDF_FATIGUE_SECTION,
  FATIGUE_CHATBOT_QA,
  type FatigueFonctionnelleV2,
  type FatigueLevelV2,
  type FatigueOriginV2,
  type FatiguePillarV2,
  type FatiguePillarResult,
  type FatigueComponentV2,
  type FatigueV2Input
} from './fatigueV2';

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

// Injury Risk V2 (legacy)
export {
  computeInjuryRiskV2,
  getInjuryRiskColor,
  getInjuryRiskBadgeClass,
  type InjuryRiskV2,
  type InjuryRiskLevelV2,
  type InjuryRiskFactorV2,
  type InjuryRiskV2Input
} from './injuryRiskV2';

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
  computePerformanceRiskPosition,
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
  type PerformanceRiskPosition,
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
  RACE_READINESS_DEFINITION,
  APP_CAPABILITIES,
  RESPONSIBILITY_ETHICS,
  VERSIONING_STATEMENT,
  OFFICIAL_REFERENCE_DOCUMENT,
  getReferenceSection,
  getOfficialIntroduction,
  getCentralPrinciple,
  getConfidenceRule,
  getRaceReadinessStatement,
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
  RACE_READINESS_USAGE,
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
