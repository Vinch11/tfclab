/** Delivery policy only: keep diagnostic findings and repairs intact. */
const advisoryRules = new Set([
  'coach_load_violation', 'coach_volume_under_min', 'coach_initial_load_unverified',
  'complete_plan_week_coverage', 'quota_floor_violation', 'quota_range_drift', 'layout_drift',
  'calendar_incoherence', 'race_day', 'race_day_unexpected', 'race_day_only_fiche_misplaced',
  'progression', 'load_pattern', 'load_history', 'polarization', 'recovery_week_intensity',
  'rest_day_coherence', 'session_density', 'key_sessions', 'key_sessions_per_sport',
  'lorang_categories', 'strength_sessions_requested', 'trail_back_to_back', 'trail_dplus_presence',
  'duplicate_catalog_id_unresolved', 'week_duplicate_unresolved', 'fasted_session_cap_unresolved',
  'week_fasted_cap_unresolved', 'sl_upgrade_unresolved', 'daily_floor_unresolved',
]);
export function isPlanAdvisoryRule(rule: string): boolean {
  return advisoryRules.has(rule) || rule.startsWith('race_calendar_') || rule.startsWith('specific_pace_quota_');
}
export function asPlanAdvisories<T extends {rule:string;severity:'error'|'warning'}>(issues: readonly T[]): T[] {
  return issues.map(issue => isPlanAdvisoryRule(issue.rule) ? {...issue,severity:'warning'} : issue);
}