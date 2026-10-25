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
    release: technicalRelease(v.release), diagnosticRevision: "p3-private-failure.1", outputFormat: v.outputFormat === "json" ? "json" : "markdown" };
}

export function technicalRelease(value: unknown) {
  const v = record(value);
  const hash = (x: unknown, size: number) => typeof x === "string" && new RegExp(`^[a-f0-9]{${size}}$`).test(x) ? x : null;
  const components = record(v.components);
  return { manifestVersion: v.manifestVersion === 2 ? 2 as const : null, attested: v.attested === true,
    deploymentAttested: v.deploymentAttested === false ? false as const : null,
    provenance: v.provenance === "declared-source" || v.provenance === "archived-source" ? v.provenance : null,
    releaseId: hash(v.releaseId, 64), components: { frontend: hash(components.frontend, 64), "ai-training-plan": hash(components["ai-training-plan"], 64), "ai-training-plan-test": hash(components["ai-training-plan-test"], 64) },
    sourceCommit: hash(v.sourceCommit, 40), contractHash: hash(v.contractHash, 64), catalogueHash: hash(v.catalogueHash, 64),
    lockHash: hash(v.lockHash, 64), sourceEpoch: count(v.sourceEpoch) };
}
