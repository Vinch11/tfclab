/** Closed technical vocabulary only. Never retain provider messages, prompts or values. */
const parameters = new Set(
  "response_format json_schema schema name strict type properties items anyOf oneOf allOf const enum required additionalProperties minimum maximum minItems maxItems minLength maxLength format nullable generation_config response_schema response_mime_type max_tokens max_output_tokens maxOutputTokens model messages temperature top_p title diagnostic strategicRecap limiters rank status block weeks keySessions synergies phases objective weekNumber phase theme phaseObjective weeklyNotes sessions day sport details isKeySession custom catalogId durationMin zones variantKey"
    .split(" "),
);
const codes = new Set([
  "INVALID_ARGUMENT",
  "INVALID_REQUEST_ERROR",
  "UNSUPPORTED_PARAMETER",
  "UNSUPPORTED_VALUE",
  "BAD_REQUEST",
]);
const keywords = [
  "response_format",
  "json_schema",
  "response_schema",
  "additionalProperties",
  "anyOf",
  "oneOf",
  "allOf",
  "const",
  "enum",
  "max_tokens",
  "max_output_tokens",
  "maxOutputTokens",
  "model",
  "variantKey",
];
export interface SafeGatewayRejection {
  status: 400;
  code?: string;
  parameter?: string;
  keywords: string[];
}
const record = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" ? x as Record<string, unknown> : {};
function parameter(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 240) return undefined;
  const parts = value.replace(/\[(\d+)\]/g, ".$1").split(".");
  return parts.length > 0 &&
      parts.every((p) => parameters.has(p) || /^\d+$/.test(p))
    ? parts.join(".")
    : undefined;
}
export function sanitizeGatewayRejection(
  value: unknown,
): SafeGatewayRejection | undefined {
  const x = record(value);
  if (x.status !== 400) return undefined;
  return {
    status: 400,
    ...(codes.has(String(x.code)) ? { code: String(x.code) } : {}),
    ...(parameter(x.parameter) ? { parameter: parameter(x.parameter) } : {}),
    keywords: Array.isArray(x.keywords)
      ? keywords.filter((k) =>
        x.keywords instanceof Array && x.keywords.includes(k)
      )
      : [],
  };
}
export function gateway400Evidence(body: string): SafeGatewayRejection {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = record(JSON.parse(body));
  } catch { /* unstructured text is never exported */ }
  const error = record(parsed.error),
    message = typeof error.message === "string" ? error.message : "";
  const code = [error.status, error.type, error.code].find((v) =>
    typeof v === "string" && codes.has(v.toUpperCase())
  );
  return {
    status: 400,
    ...(code ? { code: String(code).toUpperCase() } : {}),
    ...(parameter(error.param ?? error.parameter)
      ? { parameter: parameter(error.param ?? error.parameter) }
      : {}),
    keywords: keywords.filter((k) =>
      new RegExp("(?:^|[^A-Za-z0-9_])" + k + "(?:$|[^A-Za-z0-9_])").test(
        message,
      )
    ),
  };
}
