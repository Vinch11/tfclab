import type { Dependencies } from "./service.ts";
import { execute } from "./service.ts";
import { NolioError, safeError } from "./errors.ts";
export function createHandler(deps: Dependencies, endpoint: "read" | "links") {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin");
    const allowed = origin !== null && deps.config.origins.includes(origin);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    if (allowed) {
      Object.assign(headers, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers":
          "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });
    }
    const reply = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    try {
      if (origin && !allowed) throw new NolioError("origin_denied", 403);
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
      }
      // This POST is a local RPC, never an upstream Nolio write.
      if (req.method !== "POST") {
        throw new NolioError("method_not_allowed", 405);
      }
      if (Number(req.headers.get("content-length")) > 4096) {
        throw new NolioError("invalid_request", 400);
      }
      const raw = await req.text();
      if (raw.length > 4096) throw new NolioError("invalid_request", 400);
      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new NolioError("invalid_request", 400);
      }
      const data = await execute(req, payload, deps, endpoint);
      return reply({ ok: true, mode: "mock", data });
    } catch (e) {
      const error = safeError(e);
      if (error.retryAfter !== null) {
        headers["Retry-After"] = String(error.retryAfter);
      }
      return reply({ ok: false, error: error.issue() }, error.status);
    }
  };
}
