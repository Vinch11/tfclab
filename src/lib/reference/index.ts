/**
 * TFCL Reference System - Exports V2
 * Two For Coaching Lab Method™
 */

// Stats
export * from "./referenceStats";

// Calibration
export * from "./referenceCalibration";

// Loader
export * from "./referenceLoader";

// Auto Cluster Selection V2
export {
  selectReferenceSport,
  inferLevelByVo2,
  selectCluster,
  computeClusterMatchConfidence,
  buildClusterSelectionEnvelope,
  getInferredLevelLabel,
  getInferredLevelColor,
  getSportRefLabel,
  ACADEMY_CLUSTER_SELECTION,
  type SportReference,
  type InferredLevel,
  type ClusterSelectionEnvelope,
  type ClusterSelectorInput,
} from "./clusterSelector";

// TFCL V2 Core
export * from "./tfclV2Core";

// Rapport Staff-Grade V2
export * from "./rapportStaffV2";

// Charte Lecture TFCL
export * from "./charteLectureTFCL";

// Assistant Context
export * from "./assistantContext";
