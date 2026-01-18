/**
 * TFCL Reference System - Exports
 * Two For Coaching Lab Method™
 */

// Stats
export * from "./referenceStats";

// Calibration
export * from "./referenceCalibration";

// Loader
export * from "./referenceLoader";

// Auto Cluster Selection V2 (excluding duplicate exports)
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
