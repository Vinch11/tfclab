import type { Quota } from "./contracts.ts";
import { NolioError, object } from "./errors.ts";
const base = "https://www.nolio.io";
const routes: Record<string, readonly string[]> = {
  "/api/v2/app/": [],
  "/api/v2/me/": [],
  "/api/v2/me/athletes/": ["limit", "starting_after"],
  "/api/v2/sports/": ["limit", "starting_after"],
  "/api/v2/settings/sports/": [
    "athlete",
    "limit",
    "starting_after",
    "is_active",
  ],
  "/api/v2/settings/zones/final/": ["athlete", "sport"],
  ...Object.fromEntries(
    ["trainings", "competitions", "cycles", "notes", "messages", "quizzes"].map(
      (x) => [`/api/v2/planned/${x}/`, [
        "athlete",
        "date_from",
        "date_to",
        "limit",
        "starting_after",
      ]],
    ),
  ),
};
export type Transport = (input: string, init: RequestInit) => Promise<Response>;
export interface ClientOptions {
  transport: Transport;
  token: () => string;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  timeoutMs?: number;
}
export class NolioClient {
  quota: Quota | null = null;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  constructor(private options: ClientOptions) {
    this.sleep = options.sleep ??
      ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = options.now ?? Date.now;
  }
  private readQuota(headers: Headers) {
    const names = [
      "Limit-Hour",
      "Remaining-Hour",
      "Limit-Day",
      "Remaining-Day",
    ];
    const values = names.map((n) => headers.get("X-RateLimit-" + n));
    if (
      values.every((v) =>
        v !== null && /^\d+$/.test(v) && Number.isSafeInteger(Number(v))
      )
    ) {
      const [hourlyLimit, hourlyRemaining, dailyLimit, dailyRemaining] = values
        .map(Number);
      this.quota = { hourlyLimit, hourlyRemaining, dailyLimit, dailyRemaining };
    }
  }
  async get(
    path: string,
    params: Record<string, string> = {},
  ): Promise<unknown> {
    if (
      !Object.hasOwn(routes, path) ||
      Object.keys(params).some((k) => !routes[path].includes(k))
    ) {
      throw new NolioError("route_denied", 400);
    }
    if (
      this.quota &&
      (this.quota.hourlyRemaining <= 0 || this.quota.dailyRemaining <= 0)
    ) {
      throw new NolioError("throttled", 429);
    }
    const url = new URL(path, base);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const started = this.now();
    for (let attempt = 0; attempt < 3; attempt++) {
      if (
        this.quota &&
        (this.quota.hourlyRemaining <= 0 || this.quota.dailyRemaining <= 0)
      ) {
        throw new NolioError("throttled", 429);
      }
      const controller = new AbortController();
      const remaining = (this.options.timeoutMs ?? 10_000) -
        (this.now() - started);
      if (remaining <= 0) throw new NolioError("unavailable", 503);
      const timer = setTimeout(() => controller.abort(), remaining);
      try {
        const response = await this.options.transport(url.href, {
          method: "GET",
          redirect: "error",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${this.options.token()}`,
            Accept: "application/json",
          },
        });
        this.readQuota(response.headers);
        if (response.status === 503) throw new NolioError("unavailable", 503);
        if (!response.ok) {
          let code = ({
            401: "not_authenticated",
            403: "api_access_denied",
            404: "not_found",
            409: "conflict",
            429: "throttled",
          } as Record<number, string>)[response.status] ?? "invalid_request";
          const body = await response.json().catch(() => null);
          if (body && typeof body.error?.code === "string") {
            code = body.error.code;
          }
          const retry = response.headers.get("Retry-After");
          const delay = retry === null
            ? null
            : /^\d+$/.test(retry)
            ? Number(retry)
            : Math.max(0, Math.ceil((Date.parse(retry) - this.now()) / 1000));
          throw new NolioError(
            code,
            response.status,
            delay !== null && Number.isFinite(delay) ? delay : null,
          );
        }
        return await response.json().catch(() => {
          throw new NolioError("invalid_response", 502);
        });
      } catch (e) {
        const error = e instanceof NolioError
          ? e
          : new NolioError("unavailable", 503);
        if (error.status !== 503 || attempt === 2) throw error;
        await this.sleep(100 * (2 ** attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new NolioError("unavailable", 503);
  }
  async verify(expectedUser: string, expectedApplicationName: string) {
    const app = object(await this.get("/api/v2/app/"));
    if (app.type !== "personal" || app.name !== expectedApplicationName) {
      throw new NolioError("wrong_application", 403);
    }
    if (!Array.isArray(app.scopes) || !app.scopes.includes("planned:read")) {
      throw new NolioError("missing_scope", 403);
    }
    const q = object(app.quota);
    const values = [
      q.hourly_limit,
      q.hourly_remaining,
      q.daily_limit,
      q.daily_remaining,
    ];
    if (
      !values.every((v) =>
        typeof v === "number" && Number.isInteger(v) && v >= 0
      )
    ) throw new NolioError("invalid_response", 502);
    this.quota = {
      hourlyLimit: q.hourly_limit as number,
      hourlyRemaining: q.hourly_remaining as number,
      dailyLimit: q.daily_limit as number,
      dailyRemaining: q.daily_remaining as number,
    };
    const me = object(await this.get("/api/v2/me/"));
    if (me.id !== expectedUser) throw new NolioError("wrong_owner", 403);
    return {
      mode: "mock" as const,
      applicationType: "personal" as const,
      scopes: app.scopes.filter((s): s is string =>
        typeof s === "string" &&
        /^(real|planned|metrics|messaging|library|settings|team|marketplace|billing):(read|write|delete)$|^app:manage$/
          .test(s)
      ),
      quota: this.quota,
    };
  }
}
