/** Allowlisted technical diagnostics. Never spread a request/config/audit into logs. */
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" ? v as Record<string, unknown> : {};
const count = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
export function technicalFloors(value: unknown) {
  const v = record(value);
  return Object.fromEntries(["slLongRideMin", "slLongRunMin", "minSwimPerWeek", "longRideWeekly", "longRunWeekly", "minStrengthPerWeek"].flatMap(k =>
    typeof v[k] === "boolean" || (typeof v[k] === "number" && Number.isFinite(v[k])) ? [[k, v[k]]] : []));
}
export function technicalFloorAudit(value: unknown) {
  const v = record(value);
  return { version: 2 as const, localWeek: count(v.localWeek), globalWeek: count(v.globalWeek),
    rampConfigured: v.rampConfigured === true,
    nominal: technicalFloors(v.nominal), individualized: technicalFloors(v.individualized) };
}
export function technicalGenerationConfig(value: unknown) {
  const v = record(value);
  return { weeksAvailable: count(v.weeksAvailable), globalTotalWeeks: count(v.globalTotalWeeks),
    declaredGoalCount: Array.isArray(v.raceGoals) ? v.raceGoals.length : count(v.declaredGoalCount) ?? 0 };
}
export function technicalRuntimeContext(value: unknown) {
  const v = record(value);
  const token = (x: unknown) => typeof x === "string" && /^[a-zA-Z0-9_.:-]{1,160}$/.test(x) ? x : null;
  return { functionName: token(v.functionName), deploymentId: token(v.deploymentId), executionId: token(v.executionId) };
}
export function technicalGenerationEvent(value: unknown) {
  const v = record(value);
  return { ...technicalRuntimeContext(v), ...technicalGenerationConfig(v),
    diagnosticRevision: "p0-forensics-private.2", outputFormat: v.outputFormat === "json" ? "json" : "markdown" };
}
