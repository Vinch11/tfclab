import type { Issue } from "./contracts.ts";
const allowedCodes = new Set([
  "not_authenticated",
  "owner_required",
  "disabled",
  "mock_only",
  "configuration_error",
  "missing_scope",
  "wrong_application",
  "wrong_owner",
  "athlete_not_owned",
  "link_required",
  "athlete_api_access_denied",
  "team_scope_forbidden",
  "team_membership_required",
  "api_access_denied",
  "wrong_api_version",
  "pat_required",
  "not_found",
  "conflict",
  "throttled",
  "unavailable",
  "invalid_response",
  "invalid_request",
  "pagination_stalled",
  "page_limit",
  "confirmation_required",
  "identity_collision",
  "storage_error",
  "origin_denied",
  "method_not_allowed",
  "route_denied",
]);
export class NolioError extends Error {
  constructor(
    public code: string,
    public status = 400,
    public retryAfter: number | null = null,
  ) {
    super(allowedCodes.has(code) ? code : "unavailable");
    this.code = this.message;
  }
  issue(): Issue {
    return {
      code: this.code,
      status: this.status,
      retryAfter: this.retryAfter,
    };
  }
}
export function safeError(error: unknown): NolioError {
  return error instanceof NolioError
    ? error
    : new NolioError("unavailable", 503);
}
export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function object(v: unknown): Record<string, unknown> {
  if (!isObject(v)) throw new NolioError("invalid_response", 502);
  return v;
}
