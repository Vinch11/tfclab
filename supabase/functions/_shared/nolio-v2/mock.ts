import type { Transport } from "./client.ts";
import { calendarCollections } from "./contracts.ts";
// Synthetic examples, not exports of athlete data or credentials. No fallback to global fetch.
export const MOCK_BEARER = "synthetic-development-only";
export const MOCK_USERS = [
  { id: "usr_DemoA", name: "Athlète simulé A", has_api_access: true },
  { id: "usr_DemoB", name: "Athlète simulé B", has_api_access: false },
];
export function createMockTransport(
  owner: string,
  applicationName = "TFCLab development mock",
): Transport {
  return async (input, init) => {
    const url = new URL(input);
    if (url.origin !== "https://www.nolio.io" || init.method !== "GET") {
      throw new Error("Mock route denied");
    }
    const headers = {
      "Content-Type": "application/json",
      "X-RateLimit-Limit-Hour": "1000",
      "X-RateLimit-Remaining-Hour": "900",
      "X-RateLimit-Limit-Day": "5000",
      "X-RateLimit-Remaining-Day": "4900",
    };
    const reply = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    const path = url.pathname;
    if (path === "/api/v2/app/") {
      return reply({
        name: applicationName,
        type: "personal",
        scopes: ["planned:read"],
        quota: {
          hourly_limit: 1000,
          hourly_remaining: 900,
          daily_limit: 5000,
          daily_remaining: 4900,
        },
      });
    }
    if (path === "/api/v2/me/") return reply({ id: owner });
    if (path === "/api/v2/me/athletes/") {
      return reply({
        data: url.searchParams.has("starting_after") ? [] : MOCK_USERS,
        has_more: false,
      });
    }
    const target = url.searchParams.get("athlete");
    if (target && target !== "usr_DemoA") {
      return reply({ error: { code: "athlete_api_access_denied" } }, 403);
    }
    if (path === "/api/v2/sports/") {
      return reply({
        data: [{ id: "spt_Run", name: "Course simulée" }],
        has_more: false,
      });
    }
    if (path === "/api/v2/settings/sports/") {
      return reply({
        data: [{
          id: "spu_Run",
          sport: "spt_Run",
          name: "Course simulée",
          is_active: true,
        }],
        has_more: false,
      });
    }
    if (path === "/api/v2/settings/zones/final/") {
      return reply({
        heartrate: {
          sports: ["spt_Run"],
          zones: [{
            name: "Exemple synthétique",
            min: 110,
            max: 140,
            unit: "bpm",
          }],
        },
      });
    }
    for (const [kind, collection] of Object.entries(calendarCollections)) {
      if (path === `/api/v2/planned/${collection}/`) {
        const prefixes: Record<string, string> = {
          training: "ptrn",
          competition: "pcmp",
          cycle: "pcyc",
          note: "pnot",
          message: "pmsg",
          quiz: "pqz",
        };
        return reply({
          data: [{
            id: `${prefixes[kind]}_Demo`,
            name: `${kind} simulé`,
            date_start: url.searchParams.get("date_from"),
            ...(kind === "training" || kind === "competition"
              ? {
                sport: "spt_Run",
                duration: { value: 1800, unit: "s" },
                distance: null,
                has_structured_workout: true,
              }
              : {}),
          }],
          has_more: false,
        });
      }
    }
    throw new Error("Unconfigured mock route");
  };
}
