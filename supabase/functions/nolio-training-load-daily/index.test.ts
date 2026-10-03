import { assertEquals } from "jsr:@std/assert@1";
import {
  extractDate,
  fetchTrainingsSince,
  nolioSportIdToBucket,
  pickTss,
  refreshIfNeeded,
  refreshToken,
} from "./index.ts";

// ─── nolioSportIdToBucket / pickTss / extractDate ──────────────────────────

Deno.test("nolioSportIdToBucket — swim=19, bike=14/18, run=2/52, sinon other", () => {
  assertEquals(nolioSportIdToBucket(19), "swim");
  assertEquals(nolioSportIdToBucket(14), "bike");
  assertEquals(nolioSportIdToBucket(18), "bike");
  assertEquals(nolioSportIdToBucket(2), "run");
  assertEquals(nolioSportIdToBucket(52), "run");
  assertEquals(nolioSportIdToBucket(20), "other");
  assertEquals(nolioSportIdToBucket(null), "other");
  assertEquals(nolioSportIdToBucket(undefined), "other");
});

Deno.test("pickTss — priorité load_coggan puis load_foster, sinon null", () => {
  assertEquals(pickTss({ load_coggan: 85, load_foster: 90 }), 85);
  assertEquals(pickTss({ load_coggan: 0, load_foster: 70 }), 70);
  assertEquals(pickTss({ load_coggan: -5, load_foster: 70 }), 70);
  assertEquals(pickTss({}), null);
  assertEquals(pickTss({ load_coggan: NaN, load_foster: NaN }), null);
});

Deno.test("extractDate — date_start prioritaire sur date, slice YYYY-MM-DD, fallback parse Date", () => {
  assertEquals(extractDate({ date_start: "2026-10-02T08:00:00Z", date: "2026-01-01" }), "2026-10-02");
  assertEquals(extractDate({ date: "2026-05-01" }), "2026-05-01");
  assertEquals(extractDate({}), null);
  assertEquals(extractDate({ date_start: "not-a-date" }), null);
});

// ─── refreshToken / refreshIfNeeded (fetch + admin mockés) ─────────────────

function fakeAdmin(captured: { updates: unknown[] }) {
  return {
    from(_table: string) {
      return {
        update(payload: unknown) {
          captured.updates.push(payload);
          return { eq: (_col: string, _val: string) => Promise.resolve({ error: null }) };
        },
      };
    },
  } as unknown as Parameters<typeof refreshToken>[0];
}

Deno.test("refreshToken — sans NOLIO_CLIENT_SECRET → null, aucun appel réseau", async () => {
  const prev = Deno.env.get("NOLIO_CLIENT_SECRET");
  Deno.env.delete("NOLIO_CLIENT_SECRET");
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (() => { called = true; return Promise.reject(new Error("should not fetch")); }) as typeof fetch;
  try {
    const result = await refreshToken(fakeAdmin({ updates: [] }), "user-1", "refresh-abc");
    assertEquals(result, null);
    assertEquals(called, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (prev !== undefined) Deno.env.set("NOLIO_CLIENT_SECRET", prev);
  }
});

Deno.test("refreshToken — succès : persiste le nouveau token et le retourne", async () => {
  Deno.env.set("NOLIO_CLIENT_SECRET", "test-secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_url: string, _init?: RequestInit) =>
    Promise.resolve(
      new Response(JSON.stringify({ access_token: "new-token", refresh_token: "new-refresh", expires_in: 3600 }), {
        status: 200,
      }),
    )) as typeof fetch;
  const captured = { updates: [] as unknown[] };
  try {
    const result = await refreshToken(fakeAdmin(captured), "user-1", "old-refresh");
    assertEquals(result, "new-token");
    assertEquals(captured.updates.length, 1);
    assertEquals((captured.updates[0] as Record<string, unknown>).access_token, "new-token");
    assertEquals((captured.updates[0] as Record<string, unknown>).refresh_token, "new-refresh");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("refreshToken — Nolio répond non-ok → null, pas d'update DB", async () => {
  Deno.env.set("NOLIO_CLIENT_SECRET", "test-secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response("nope", { status: 401 }))) as typeof fetch;
  const captured = { updates: [] as unknown[] };
  try {
    const result = await refreshToken(fakeAdmin(captured), "user-1", "old-refresh");
    assertEquals(result, null);
    assertEquals(captured.updates.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("refreshToken — réponse sans refresh_token → conserve l'ancien refresh_token", async () => {
  Deno.env.set("NOLIO_CLIENT_SECRET", "test-secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ access_token: "new-token" }), { status: 200 }))) as typeof fetch;
  const captured = { updates: [] as unknown[] };
  try {
    await refreshToken(fakeAdmin(captured), "user-1", "old-refresh");
    assertEquals((captured.updates[0] as Record<string, unknown>).refresh_token, "old-refresh");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("refreshIfNeeded — token encore valide (skew 60s respecté) → pas de refresh, pas de fetch", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (() => { called = true; return Promise.reject(new Error("should not fetch")); }) as typeof fetch;
  try {
    const farFuture = new Date(Date.now() + 3600_000).toISOString();
    const result = await refreshIfNeeded(fakeAdmin({ updates: [] }), "user-1", {
      access_token: "current-token",
      refresh_token: "refresh",
      expires_at: farFuture,
    });
    assertEquals(result, "current-token");
    assertEquals(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("refreshIfNeeded — token expiré avec refresh_token → appelle refreshToken et renvoie le nouveau token", async () => {
  Deno.env.set("NOLIO_CLIENT_SECRET", "test-secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ access_token: "refreshed-token" }), { status: 200 }))) as typeof fetch;
  try {
    const past = new Date(Date.now() - 1000).toISOString();
    const result = await refreshIfNeeded(fakeAdmin({ updates: [] }), "user-1", {
      access_token: "stale-token",
      refresh_token: "refresh",
      expires_at: past,
    });
    assertEquals(result, "refreshed-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("refreshIfNeeded — expiré mais sans refresh_token → renvoie le token courant tel quel", async () => {
  const result = await refreshIfNeeded(fakeAdmin({ updates: [] }), "user-1", {
    access_token: "current-token",
    refresh_token: null,
    expires_at: new Date(Date.now() - 1000).toISOString(),
  });
  assertEquals(result, "current-token");
});

Deno.test("refreshIfNeeded — refresh échoue (fetch KO) → fallback sur le token courant, jamais null/undefined", async () => {
  Deno.env.set("NOLIO_CLIENT_SECRET", "test-secret");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response("KO", { status: 500 }))) as typeof fetch;
  try {
    const result = await refreshIfNeeded(fakeAdmin({ updates: [] }), "user-1", {
      access_token: "current-token",
      refresh_token: "refresh",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    assertEquals(result, "current-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── fetchTrainingsSince ────────────────────────────────────────────────────

Deno.test("fetchTrainingsSince — HTTP non-ok dès la première page → warning, items vides", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response("boom", { status: 502 }))) as typeof fetch;
  try {
    const { items, warning } = await fetchTrainingsSince({ current: "tok" }, 42, "2026-01-01");
    assertEquals(items, []);
    assertEquals(warning?.startsWith("HTTP 502"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchTrainingsSince — filtre les séances antérieures à fromDate (plancher atteint → stop)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify([
          { date_start: "2026-03-10T08:00:00Z", id: "in-range" },
          { date_start: "2025-12-01T08:00:00Z", id: "too-old" },
        ]),
        { status: 200 },
      ),
    )) as typeof fetch;
  try {
    const { items } = await fetchTrainingsSince({ current: "tok" }, 42, "2026-01-01");
    assertEquals(items.length, 1);
    assertEquals(items[0].id, "in-range");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchTrainingsSince — page vide → arrête la pagination sans erreur", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))) as typeof fetch;
  try {
    const { items, warning } = await fetchTrainingsSince({ current: "tok" }, 42, "2026-01-01");
    assertEquals(items, []);
    assertEquals(warning, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchTrainingsSince — accepte la forme { results: [...] } en plus du tableau nu", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify({ results: [{ date_start: "2026-03-10", id: "x" }] }), { status: 200 }),
    )) as typeof fetch;
  try {
    const { items } = await fetchTrainingsSince({ current: "tok" }, 42, "2026-01-01");
    assertEquals(items.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
