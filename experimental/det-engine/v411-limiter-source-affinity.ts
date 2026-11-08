import type { DetLimiterKey } from './v403-limiter-semantics';
/** Search ordering only, using V403/V408's existing domain and key meanings.
 * This is NOT exact-dose evidence, source admission or sporting validation. */
export function limiterSourceAffinity(source:{primaryDomain:string|null;limiterKeys:readonly string[]},key:DetLimiterKey|null):boolean {
  const domain=source.primaryDomain, keys=source.limiterKeys;
  const threshold=domain==='mlss'&&keys.includes('threshold_tolerance');
  if(key==='tte')return threshold;
  if(key==='durability_race_relative')return threshold&&keys.includes('running_impact_tolerance');
  if(key==='css_threshold')return threshold&&keys.includes('swim_technical_durability');
  if(key==='vma_velocity'&&!keys.includes('running_impact_tolerance'))return false;
  if(key==='vo2max'||key==='vma_velocity')return domain==='vo2max'&&keys.includes('aerobic_ceiling')&&keys.includes('severe_domain_tolerance');
  if(key==='vlamax_reduction')return threshold||(domain==='moderate_lt1'&&keys.includes('aerobic_capacity'));
  if(key==='ftp'||key==='ftp_relative')return keys.includes('cycling_power_durability')&&['mlss','sub_threshold','vo2max'].includes(domain??'');
  return false;
}
