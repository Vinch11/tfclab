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

// VLamax V2
export { 
  computeVLamaxV2,
  formatVLamaxRangeLabel,
  getVLamaxConfidenceLabel,
  getVLamaxSourcesLabel,
  getVLamaxCategoryColor,
  type VLamaxRangeV2,
  type VLamaxSourceV2,
  type VLamaxCategoryV2,
  type VLamaxV2Input
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
  type FatigueFonctionnelleV2,
  type FatigueLevelV2,
  type FatigueOriginV2,
  type FatigueComponentV2,
  type FatigueV2Input
} from './fatigueV2';

// Nutrition V2
export {
  computeNutritionV2,
  getNutritionRiskColor,
  getNutritionBadgeClass,
  formatCarbsRange,
  type NutritionPredictiveV2,
  type NutritionRiskV2,
  type NutritionV2Input
} from './nutritionV2';

// Injury Risk V2
export {
  computeInjuryRiskV2,
  getInjuryRiskColor,
  getInjuryRiskBadgeClass,
  type InjuryRiskV2,
  type InjuryRiskLevelV2,
  type InjuryRiskFactorV2,
  type InjuryRiskV2Input
} from './injuryRiskV2';

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
