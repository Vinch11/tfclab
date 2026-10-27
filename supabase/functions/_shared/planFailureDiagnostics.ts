/** Privacy boundary for errors: never copy model text, config, prompts or exceptions. */
const object = (x: unknown): Record<string, unknown> => x && typeof x === "object" ? x as Record<string, unknown> : {};
const number = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : undefined;
const fields = new Set("weeks sessions title details day sport catalogId custom durationMin isKeySession zones phase weekNumber theme diagnostic phases strategicRecap variantKey".split(" "));
const codes = new Set("PLAN_PREVALIDATION_BLOCKED SCHEMA_FAIL SCHEMA_CLIENT_FAIL GAP DUP EMPTY OUT_OF_RANGE MERGE_FAIL NO_CHUNKS RATE_LIMIT CREDITS GATEWAY_ERROR TRUNCATED PARSE_FAIL EXCEPTION INTERNAL_ERROR REQUEST_FAILED PLAN_RELEASE_UNATTESTED PLAN_RELEASE_UNAVAILABLE PLAN_RELEASE_MISMATCH UNKNOWN HTTP_429 HTTP_402 NETWORK_ERROR".split(" "));
export function safeFailureCode(x: unknown): string { return typeof x === "string" && codes.has(x) ? x : "UNKNOWN"; }
function path(x: unknown): string {
 const parts = Array.isArray(x) ? x : typeof x === "string" ? x.split("[").join(".").split("]").join(".").split(".").filter(Boolean) : [];
 return parts.map(p => typeof p === "number" || /^\d+$/.test(String(p)) ? String(p) : fields.has(String(p)) ? String(p) : "field").join(".").slice(0, 240);
}
function issue(x: unknown) {
 const v = object(x);
 const code = typeof v.code === "string" && ["invalid_type","invalid_enum_value","custom","too_small","too_big","unrecognized_keys","invalid_literal","invalid_union"].includes(v.code) ? v.code : "validation";
 const message = String(v.message ?? "");
 const technical = /^(?:catalogue_prescription_incompatible:)?(?:catalogue_(?:sport|duration|intensity_diluted|intensity_exceeded|structure|physiological_intent)|phase:(?:base|build|peak|taper)|week_(?:phase_contract_mismatch|not_in_catalogue_contract)|race_catalog_conflict)$/;
 return { path: path(v.path), code, message: technical.test(message) ? message : code };
}
function attempt(x: unknown) {
 const v = object(x);
 return { attempt: number(v.attempt), rawLength: number(v.rawLength),
  finishReason: ["stop","length","content_filter"].includes(String(v.finishReason)) ? String(v.finishReason) : undefined,
  unwrapped: typeof v.unwrapped === "boolean" ? v.unwrapped : undefined,
  repairCount: number(v.repairCount) ?? (Array.isArray(v.repairs) ? v.repairs.length : undefined),
  issueCount: Math.max(number(v.issueCount) ?? 0, Array.isArray(v.zodIssues) ? v.zodIssues.length : 0),
  issuesTruncated: v.issuesTruncated === true || (Array.isArray(v.zodIssues) && v.zodIssues.length > 100),
  zodIssues: Array.isArray(v.zodIssues) ? v.zodIssues.slice(0, 100).map(issue) : [],
  gateway: { constrained: typeof object(v.gateway).constrained === "boolean" ? object(v.gateway).constrained as boolean : undefined } };
}
export function sanitizeSchemaFailure(value: unknown) {
 const v = object(value);
 return { diagnosticVersion: 1, chunkIndex: number(v.chunkIndex), ...attempt(v),
  attempts: Array.isArray(v.attempts) ? v.attempts.slice(0, 4).map(attempt) : [] };
}
const traceCodes = new Set("catalogue_pool_insufficient catalogue_prescription_unverified catalogue_prescription_incompatible sl_upgrade_unresolved sl_upgraded reconcile_conflict phase_unresolved duration_unresolved constraint_day_unresolved daily_floor_unresolved offsport_unresolved substituted_offsport catalog_id_no_safe_neighbor json_repair value_unresolved value_relativized".split(" "));
export function sanitizeTechnicalTraces(value: unknown): string[] {
 if (!Array.isArray(value)) return [];
 return value.flatMap(line => {
  if (typeof line !== "string") return [];
  if (/\bvalue_check_summary\b/.test(line)) {
   const values = ["tokens","conforme","relativized","unresolved","residualAbs"].map(key => line.match(new RegExp(`\\b${key}=(\\d+)`))?.[1]);
   return values.every(v => v !== undefined) ? [`[info] value_check_summary: tokens=${values[0]} conforme=${values[1]} relativized=${values[2]} unresolved=${values[3]} residualAbs=${values[4]}`] : ["[warning] value_check_summary_invalid"];
  }
  const code = line.match(/\b(?:catalogue_\w+|sl_upgrade_unresolved|sl_upgraded|reconcile_conflict|phase_unresolved|duration_unresolved|constraint_day_unresolved|daily_floor_unresolved|offsport_unresolved|substituted_offsport|catalog_id_no_safe_neighbor|json_repair|value_unresolved|value_relativized)\b/)?.[0];
  if (!code || !traceCodes.has(code)) return [];
  const week = line.match(/\b[WS](\d+)\b/)?.[1];
  const level = line.match(/^\[(critical|error|warning|info)\]/)?.[1] ?? "info";
  return [`[${level}] ${code}${week ? ` W${week}` : ""}`];
 });
}

/** Numeric repair evidence only; catalogue/athlete free text is never a diagnostic field. */
export function sanitizeWarningEvidence(value: unknown) {
 const v = object(value), repair = object(v.repair), before = object(repair.before), diagnostics = object(repair.diagnostics);
 const known = typeof v.code === "string" && traceCodes.has(v.code) ? v.code : "OTHER_WARNING";
 const bucketCounts = (input: unknown) => {
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(object(input))) {
   const bucket = key.split(":")[0];
   if (["phase","intent","sport","objective","duration","intensity","recovery_zone","recovery_intent","week_zone_cap","special_context","prerequisite","original_metadata_incomplete","candidate_metadata_incomplete"].includes(bucket) && number(count) !== undefined) out[bucket] = (out[bucket] ?? 0) + Number(count);
  }
  return out;
 };
 return { code: known, weekNumber: number(v.weekNumber) ?? number(repair.weekNumber), chunkIndex: number(v.chunkIndex) ?? number(repair.chunkIndex),
  sport: ["swim","bike","run","brick","strength","recovery"].includes(String(repair.sport ?? v.sport)) ? String(repair.sport ?? v.sport) : undefined,
  severity: ["critical","error","warning","info"].includes(String(v.severity)) ? String(v.severity) : "info",
  floorMin: number(repair.floorMin) ?? number(v.floorMin), beforeDurationMin: number(before.durationMin) ?? number(v.beforeDurationMin),
  sameSportCandidates: number(repair.sameSportCandidatesInChunk) ?? number(v.sameSportCandidates), totalCandidates: number(repair.totalCandidatesInChunk) ?? number(v.totalCandidates), eligibleCount: number(v.eligibleCount),
  localRejections: bucketCounts(diagnostics.localRejections ?? v.localRejections), globalRejections: bucketCounts(diagnostics.globalRejections ?? v.globalRejections) };
}
