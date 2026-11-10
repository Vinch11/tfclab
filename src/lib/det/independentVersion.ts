/** The standalone build stamps its own content digest. Source-only runs are explicitly identified. */
declare const __TFCL_DET_VERSION__: string;
export const detReleaseVersion = typeof __TFCL_DET_VERSION__ === 'string' ? __TFCL_DET_VERSION__ : 'det-source';
