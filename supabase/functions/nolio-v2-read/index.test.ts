import assert from "node:assert/strict";
import { NolioClient } from "../_shared/nolio-v2/client.ts";
import type { Transport } from "../_shared/nolio-v2/client.ts";
import { createPatProvider, readConfig } from "../_shared/nolio-v2/config.ts";
import { createHandler } from "../_shared/nolio-v2/http.ts";
import { createMockTransport } from "../_shared/nolio-v2/mock.ts";
import { paginate } from "../_shared/nolio-v2/pagination.ts";
import {
  athlete,
  civilDate,
  dateWindow,
  planned,
  sport,
  zones,
} from "../_shared/nolio-v2/adapters.ts";
import { NolioError } from "../_shared/nolio-v2/errors.ts";
import type { Dependencies } from "../_shared/nolio-v2/service.ts";
import type { EventKind, LinkDTO } from "../_shared/nolio-v2/contracts.ts";
// Net/env permissions are removed even when the repository CI invokes `deno test -A`.
const test = (name: string, fn: () => void | Promise<void>) =>
  Deno.test({ name, permissions: { net: false, env: false }, fn });
const owner = "11111111-1111-4111-8111-111111111111";
const local = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";
const secret = "nolio_sk_SYNTHETIC_TEST_SENTINEL";
const config = {
  enabled: true,
  ownerId: owner,
  expectedNolioUser: "usr_Owner",
  expectedApplicationName: "TFCLab development mock",
  connectionKey: "test-mock",
  environment: "development",
  mode: "mock",
  origins: ["http://localhost:5173"],
};
const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) => new Response(JSON.stringify(value), { status, headers });
function setup() {
  const links = new Map<string, LinkDTO>();
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const mock = createMockTransport(config.expectedNolioUser);
  const deps: Dependencies = {
    config: { ...config },
    token: createPatProvider((k) => k === "NOLIO_V2_PAT" ? secret : undefined),
    verifyUser: async (jwt) =>
      jwt === "owner-session"
        ? { id: owner }
        : jwt === "other-session"
        ? { id: other }
        : null,
    transport: async (url, init) => {
      calls.push({ url, init });
      return mock(url, init);
    },
    store: {
      ownsAthlete: async (coach, id) => coach === owner && id === local,
      get: async (_c, _k, id) => links.get(id) ?? null,
      associate: async (_c, _k, id, remote) => {
        const existing = links.get(id);
        if (
          (existing && existing.nolioUserId !== remote) ||
          [...links.values()].some((x) =>
            x.athleteId !== id && x.nolioUserId === remote
          )
        ) throw new NolioError("identity_collision", 409);
        const link = {
          id: "mock-link",
          athleteId: id,
          nolioUserId: remote,
          accessStatus: "verified",
          lastVerifiedAt: "2026-01-01T00:00:00Z",
        };
        links.set(id, link);
        return link;
      },
      unlink: async (_c, _k, id) => {
        links.delete(id);
      },
    },
  };
  return {
    deps,
    links,
    calls,
    async request(
      body: unknown,
      endpoint: "read" | "links" = "read",
      token = "owner-session",
      origin = "http://localhost:5173",
    ) {
      return createHandler(deps, endpoint)(
        new Request("http://localhost/functions/v1/nolio-v2-" + endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, Origin: origin },
          body: JSON.stringify(body),
        }),
      );
    },
  };
}
function client(transport: Transport) {
  return new NolioClient({
    transport,
    token: () => secret,
    sleep: async () => {},
  });
}

test("feature flag is off by default and secret provider is lazy", () => {
  const read: string[] = [];
  const env = (key: string) => {
    read.push(key);
    return undefined;
  };
  assert.equal(readConfig(env).enabled, false);
  assert(!read.includes("NOLIO_V2_PAT"));
  const provider = createPatProvider(env);
  assert(!read.includes("NOLIO_V2_PAT"));
  assert.throws(provider, /configuration_error/);
});
for (const token of ["", "anon-jwt", "other-session"]) {
  test(`invalid/non-owner subject (${token || "empty"}) cannot reach Nolio`, async () => {
    const s = setup();
    const response = await s.request({ action: "athletes" }, "read", token);
    assert([401, 403].includes(response.status));
    assert.equal(s.calls.length, 0);
  });
}
test("owner gate verifies JWT errors rather than trusting a Bearer header", async () => {
  const s = setup();
  s.deps.verifyUser = async () => {
    throw new Error(secret);
  };
  const response = await s.request({ action: "status" });
  assert.equal(response.status, 401);
  assert(!(await response.text()).includes(secret));
  assert.equal(s.calls.length, 0);
});
for (const mode of ["disabled", "live", "production"]) {
  test(`${mode} configuration fails closed`, async () => {
    const s = setup();
    if (mode === "disabled") s.deps.config.enabled = false;
    else if (mode === "live") s.deps.config.mode = "live";
    else s.deps.config.environment = "production";
    const r = await s.request({ action: "status" });
    assert.equal(r.status, mode === "disabled" ? 503 : 403);
    assert.equal(s.calls.length, 0);
  });
}
test("another local athlete is refused BEFORE remote app/owner checks", async () => {
  const s = setup();
  const r = await s.request({
    action: "calendar",
    athleteId: other,
    from: "2026-01-01",
    to: "2026-01-02",
  });
  assert.equal(r.status, 403);
  assert.equal(s.calls.length, 0);
});
test("status validates app type, minimal scope, owner and both quota windows", async () => {
  const s = setup();
  const response = await s.request({ action: "status" });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.applicationType, "personal");
  assert.deepEqual(body.data.scopes, ["planned:read"]);
  assert.equal(body.data.quota.dailyRemaining, 4900);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert(!JSON.stringify(body).includes(secret));
});
for (const variant of ["wrong_application", "missing_scope", "wrong_owner"]) {
  test(`remote ${variant} is rejected`, async () => {
    const s = setup();
    const base = createMockTransport("usr_Owner");
    s.deps.transport = async (url, init) => {
      if (url.endsWith("/app/")) {
        return json({
          name: config.expectedApplicationName,
          type: variant === "wrong_application" ? "team" : "personal",
          scopes: variant === "missing_scope" ? [] : ["planned:read"],
          quota: {
            hourly_limit: 20,
            hourly_remaining: 10,
            daily_limit: 100,
            daily_remaining: 90,
          },
        });
      }
      return variant === "wrong_owner" && url.endsWith("/me/")
        ? json({ id: "usr_Other" })
        : base(url, init);
    };
    const r = await s.request({ action: "status" });
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error.code, variant);
  });
}
test("explicit association rejects missing confirmation, refused or unknown candidate", async () => {
  const s = setup();
  assert.equal(
    (await s.request({
      action: "associate",
      athleteId: local,
      nolioUserId: "usr_DemoA",
    }, "links")).status,
    400,
  );
  for (const nolioUserId of ["usr_DemoB", "usr_Unknown"]) {
    assert.equal(
      (await s.request({
        action: "associate",
        athleteId: local,
        nolioUserId,
        confirmed: true,
      }, "links")).status,
      403,
    );
  }
  assert.equal(s.links.size, 0);
});
test("association preserves opaque IDs, detects collision, and local unlink makes no Nolio request", async () => {
  const s = setup();
  const body = {
    action: "associate",
    athleteId: local,
    nolioUserId: "usr_DemoA",
    confirmed: true,
  };
  assert.equal((await s.request(body, "links")).status, 200);
  assert.equal(s.links.get(local)?.nolioUserId, "usr_DemoA");
  s.deps.store.associate = async () => {
    throw new NolioError("identity_collision", 409);
  };
  assert.equal((await s.request(body, "links")).status, 409);
  const count = s.calls.length;
  assert.equal(
    (await s.request({ action: "unlink", athleteId: local }, "links")).status,
    200,
  );
  assert.equal(s.calls.length, count);
  assert.equal(s.links.size, 0);
});
test("stored link is not enough: revoked athlete access blocks each subsequent data read", async () => {
  const s = setup();
  s.links.set(local, {
    id: "link",
    athleteId: local,
    nolioUserId: "usr_DemoB",
    accessStatus: "verified",
    lastVerifiedAt: "old",
  });
  const response = await s.request({ action: "zones", athleteId: local });
  assert.equal(response.status, 403);
  assert(!s.calls.some((x) => x.url.includes("/zones/")));
});
test("all six planned event types have their own GET collection and civil dates", async () => {
  const s = setup();
  await s.request({
    action: "associate",
    athleteId: local,
    nolioUserId: "usr_DemoA",
    confirmed: true,
  }, "links");
  const r = await s.request({
    action: "calendar",
    athleteId: local,
    from: "2026-12-31",
    to: "2027-01-02",
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.deepEqual(Object.keys(body.data.collections), [
    "training",
    "competition",
    "cycle",
    "note",
    "message",
    "quiz",
  ]);
  for (
    const [kind, result] of Object.entries(body.data.collections) as Array<
      [
        EventKind,
        { availability: string; data: Array<{ date: string; kind: string }> },
      ]
    >
  ) {
    assert.equal(result.availability, "complete");
    assert.equal(result.data[0].date, "2026-12-31");
    assert.equal(result.data[0].kind, kind);
  }
  assert(
    s.calls.every((x) =>
      x.init.method === "GET" &&
      new URL(x.url).origin === "https://www.nolio.io"
    ),
  );
  assert(
    !s.calls.some((x) =>
      /\/api\/get\/|\/batch\/|\/real\/|\/token\/|webhook/.test(x.url)
    ),
  );
});
test("sport/profile identifiers and open final-zone content are kept separate from models", async () => {
  assert.deepEqual(
    sport(
      { id: "spu_Test", sport: "spt_Test", name: "Run", is_active: true },
      true,
    ),
    { id: "spt_Test", name: "Run", active: true },
  );
  assert.throws(
    () => sport({ id: "spu_Test", name: "Run" }),
    /invalid_response/,
  );
  const data = { pace: { bounds: ["4:30", "5:00"], unit: "min:sec" } };
  assert.deepEqual(zones(data), [{ stream: "pace", content: data.pace }]);
});
test("leap days, impossible dates, ordering and 90-day window limits", () => {
  assert.equal(civilDate("2028-02-29"), "2028-02-29");
  assert.equal(civilDate("2026-03-29"), "2026-03-29");
  for (const x of ["2026-02-29", "2026-13-01", "2026-01-01T00:00:00Z"]) {
    assert.throws(() => civilDate(x), /invalid_request/);
  }
  assert.throws(() => dateWindow("2026-02-01", "2026-01-01"));
  assert.throws(() => dateWindow("2026-01-01", "2026-12-31"));
});
test("restriction/null never becomes a zero duration", () => {
  const x = planned({
    id: "ptrn_Test",
    date_start: "2026-01-01",
    duration: null,
    distance: null,
    restriction: { fields: ["duration"] },
  }, "training");
  assert.equal(x.durationSeconds, null);
  assert.equal(x.restricted, true);
});
test("pagination visits all cursor pages and doesn't use offset", async () => {
  const urls: string[] = [];
  const c = client(async (url) => {
    urls.push(url);
    return json({
      data: [{
        id: new URL(url).searchParams.has("starting_after") ? "usr_B" : "usr_A",
        name: "same",
        has_api_access: true,
      }],
      has_more: !new URL(url).searchParams.has("starting_after"),
    });
  });
  const result = await paginate(c, "/api/v2/me/athletes/", {}, athlete);
  assert.equal(result.availability, "complete");
  assert.deepEqual(result.data.map((x) => x.id), ["usr_A", "usr_B"]);
  assert(urls[1].includes("starting_after=usr_A"));
  assert(!urls.join().includes("offset"));
});
test("page cap and stalled cursor produce partial data, not false completeness", async () => {
  const c = client(async () =>
    json({
      data: [{ id: "usr_A", name: "A", has_api_access: true }],
      has_more: true,
    })
  );
  const cap = await paginate(c, "/api/v2/me/athletes/", {}, athlete, 1);
  assert.equal(cap.issue?.code, "page_limit");
  assert.equal(cap.nextCursor, "usr_A");
  const stalled = await paginate(c, "/api/v2/me/athletes/", {}, athlete);
  assert.equal(stalled.availability, "partial");
  assert.equal(stalled.issue?.code, "pagination_stalled");
  assert.equal(stalled.data.length, 1);
});
for (const status of [401, 403, 404, 409, 429]) {
  test(`HTTP ${status} is sanitized, never retried`, async () => {
    let calls = 0;
    const c = client(async () => {
      calls++;
      return json(
        {
          error: {
            code: status === 403 ? "athlete_api_access_denied" : "unknown",
            message: secret,
          },
        },
        status,
        { "Retry-After": "60" },
      );
    });
    const result = await paginate(c, "/api/v2/me/athletes/", {}, athlete);
    assert.equal(calls, 1);
    assert.equal(result.issue?.status, status);
    assert.equal(result.issue?.retryAfter, 60);
    assert(!JSON.stringify(result).includes(secret));
    assert.equal(
      result.availability,
      status === 403 ? "denied" : "unavailable",
    );
  });
}
test("429 after a successful page preserves data/cursor and Retry-After", async () => {
  let calls = 0;
  const c = client(async () =>
    ++calls === 1
      ? json({
        data: [{ id: "usr_A", name: "A", has_api_access: true }],
        has_more: true,
      })
      : json({ error: { code: "throttled" } }, 429, { "Retry-After": "17" })
  );
  const result = await paginate(c, "/api/v2/me/athletes/", {}, athlete);
  assert.equal(result.availability, "partial");
  assert.equal(result.data.length, 1);
  assert.equal(result.nextCursor, "usr_A");
  assert.equal(result.issue?.retryAfter, 17);
});
test("exhausted hourly OR daily budget prevents the next transport call", async () => {
  for (const empty of ["hour", "day"]) {
    let calls = 0;
    const c = client(async () => {
      calls++;
      return json({}, 200, {
        "X-RateLimit-Limit-Hour": "10",
        "X-RateLimit-Remaining-Hour": empty === "hour" ? "0" : "9",
        "X-RateLimit-Limit-Day": "100",
        "X-RateLimit-Remaining-Day": empty === "day" ? "0" : "99",
      });
    });
    await c.get("/api/v2/app/");
    await assert.rejects(() => c.get("/api/v2/me/"), /throttled/);
    assert.equal(calls, 1);
  }
});
test("503 retries only two times, succeeds transiently or stays unavailable", async () => {
  for (const recover of [true, false]) {
    let count = 0;
    const c = client(async () =>
      ++count < 3 || !recover
        ? json({}, 503)
        : json({ data: [], has_more: false })
    );
    const r = await paginate(c, "/api/v2/me/athletes/", {}, athlete);
    assert.equal(count, 3);
    assert.equal(r.availability, recover ? "complete" : "unavailable");
  }
});
test("malformed response is not silently converted into an empty complete page", async () => {
  const r = await paginate(
    client(async () => json({ results: [] })),
    "/api/v2/me/athletes/",
    {},
    athlete,
  );
  assert.equal(r.availability, "unavailable");
  assert.equal(r.issue?.code, "invalid_response");
});
test("unsafe routes/queries are rejected before reading a PAT or transport", async () => {
  let accesses = 0;
  const c = new NolioClient({
    token: () => {
      accesses++;
      return secret;
    },
    transport: async () => {
      accesses++;
      return json({});
    },
  });
  for (
    const path of [
      "/api/v2/batch/",
      "/api/v2/app/pats/",
      "https://evil.test/",
      "/api/v2/real/trainings/",
      "/api/v2/planned/trainings/../trainings/",
    ]
  ) {
    await assert.rejects(() => c.get(path), /route_denied/);
  }
  await assert.rejects(
    () => c.get("/api/v2/app/", { token: secret }),
    /route_denied/,
  );
  assert.equal(accesses, 0);
});
test("foreign origins and local HTTP methods fail before remote access", async () => {
  const s = setup();
  assert.equal(
    (await s.request(
      { action: "status" },
      "read",
      "owner-session",
      "https://evil.test",
    )).status,
    403,
  );
  const r = await createHandler(s.deps, "read")(
    new Request("http://localhost", { method: "DELETE" }),
  );
  assert.equal(r.status, 405);
  assert.equal(s.calls.length, 0);
});
test("runtime exceptions cannot expose a credential in API error envelopes", async () => {
  const s = setup();
  s.deps.store.ownsAthlete = async () => {
    throw new Error(secret);
  };
  const r = await s.request({ action: "zones", athleteId: local });
  assert.equal(r.status, 503);
  assert(!(await r.text()).includes(secret));
});

test("association probes athlete-level planned permission before persisting", async () => {
  const s = setup();
  const base = createMockTransport("usr_Owner");
  s.deps.transport = async (url, init) =>
    url.includes("/planned/trainings/")
      ? json({ error: { code: "team_scope_forbidden" } }, 403)
      : base(url, init);
  const r = await s.request({
    action: "associate",
    athleteId: local,
    nolioUserId: "usr_DemoA",
    confirmed: true,
  }, "links");
  assert.equal(r.status, 403);
  assert.equal(s.links.size, 0);
});
test("a transient failure that consumes the last quota unit is not retried", async () => {
  let calls = 0;
  const c = client(async () => {
    calls++;
    return json({}, 503, {
      "X-RateLimit-Limit-Hour": "1",
      "X-RateLimit-Remaining-Hour": "0",
      "X-RateLimit-Limit-Day": "10",
      "X-RateLimit-Remaining-Day": "9",
    });
  });
  await assert.rejects(() => c.get("/api/v2/app/"), /throttled/);
  assert.equal(calls, 1);
});
test("Nolio user IDs remain opaque strings including mixed-case and punctuation", () => {
  assert.equal(
    athlete({
      id: "usr_Mixed-Case_123",
      name: "synthetic",
      has_api_access: true,
    }).id,
    "usr_Mixed-Case_123",
  );
});
test("cross-origin preflight and responses expose only configured local origins", async () => {
  const s = setup();
  const handler = createHandler(s.deps, "read");
  const r = await handler(
    new Request("http://localhost", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    }),
  );
  assert.equal(r.status, 204);
  assert.equal(
    r.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:5173",
  );
  assert.equal(s.calls.length, 0);
});

test("planned messages without a name use their documented description and hour_start", () => {
  const message = planned({
    id: "pmsg_Opaque",
    description: "Consigne simulée",
    date_start: "2026-01-01",
    hour_start: "09:00",
  }, "message");
  assert.equal(message.name, "Consigne simulée");
  assert.equal(message.time, "09:00");
});
test("revoked access mid-calendar stops further reads and discards previously read data", async () => {
  const s = setup();
  const base = createMockTransport("usr_Owner");
  const paths: string[] = [];
  s.links.set(local, {
    id: "link",
    athleteId: local,
    nolioUserId: "usr_DemoA",
    accessStatus: "verified",
    lastVerifiedAt: "old",
  });
  s.deps.transport = async (url, init) => {
    if (url.includes("/planned/")) paths.push(new URL(url).pathname);
    return url.includes("/planned/competitions/")
      ? json({ error: { code: "athlete_api_access_denied" } }, 403)
      : base(url, init);
  };
  const response = await s.request({
    action: "calendar",
    athleteId: local,
    from: "2026-01-01",
    to: "2026-01-02",
  });
  const body = await response.json();
  assert.deepEqual(paths, [
    "/api/v2/planned/trainings/",
    "/api/v2/planned/competitions/",
  ]);
  for (
    const item of Object.values(body.data.collections) as Array<
      { availability: string; data: unknown[] }
    >
  ) {
    assert.equal(item.availability, "denied");
    assert.equal(item.data.length, 0);
  }
});
Deno.test({
  name:
    "unexpected application name is refused despite matching owner and read scope",
  permissions: { net: false, env: false },
  async fn() {
    const s = setup();
    s.deps.transport = createMockTransport("usr_Owner", "Unexpected mock app");
    const r = await s.request({ action: "status" });
    assert.equal(r.status, 403);
    assert.equal((await r.json()).error.code, "wrong_application");
  },
});
