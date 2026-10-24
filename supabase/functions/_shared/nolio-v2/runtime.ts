import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { assertDevelopment, readConfig } from "./config.ts";
import { createMockTransport, MOCK_BEARER } from "./mock.ts";
import { createLinkStore } from "./supabaseStore.ts";
import { createHandler } from "./http.ts";
import type { Dependencies } from "./service.ts";
import type { EnvReader } from "./config.ts";
import { NolioError } from "./errors.ts";
/** Local Supabase only: even a deployed function cannot contact production DB/auth or Nolio. */
export function localSupabaseUrl(value: string): string {
  const url = new URL(value);
  if (
    !["localhost", "127.0.0.1", "kong", "host.docker.internal", "[::1]"]
      .includes(url.hostname)
  ) {
    throw new NolioError("mock_only", 403);
  }
  if (
    url.username || url.password || !["http:", "https:"].includes(url.protocol)
  ) throw new NolioError("configuration_error", 503);
  return url.origin;
}
export function runtimeHandler(
  endpoint: "read" | "links",
  env: EnvReader = (name) => Deno.env.get(name),
) {
  return async (req: Request): Promise<Response> => {
    const config = readConfig(env);
    try {
      assertDevelopment(config);
      const url = localSupabaseUrl(env("SUPABASE_URL") ?? "");
      // Read service role only after deployment/locality gates. No credentials in response or logs.
      const db = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const deps: Dependencies = {
        config,
        store: createLinkStore(db),
        token: () => MOCK_BEARER,
        transport: createMockTransport(
          config.expectedNolioUser,
          config.expectedApplicationName,
        ),
        async verifyUser(jwt) {
          const { data, error } = await db.auth.getUser(jwt);
          return error || !data.user?.id ? null : { id: data.user.id };
        },
      };
      return createHandler(deps, endpoint)(req);
    } catch {
      // Disabled/environment failures expose no URL, key or configuration values.
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Vary: "Origin",
      };
      const origin = req.headers.get("origin");
      if (origin && config.origins.includes(origin)) {
        Object.assign(headers, {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers":
            "authorization, apikey, content-type, x-client-info",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        });
      }
      if (
        req.method === "OPTIONS" && origin && config.origins.includes(origin)
      ) return new Response(null, { status: 204, headers });
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: config.enabled ? "mock_only" : "disabled",
            status: 503,
            retryAfter: null,
          },
        }),
        { status: 503, headers },
      );
    }
  };
}
