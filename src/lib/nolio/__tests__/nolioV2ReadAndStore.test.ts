/**
 * Nolio V2 — lectures réelles (adaptateur httpFetch, fetch MOCK conforme au
 * read-contract officiel), réconciliation via le vrai expéditeur, et magasin
 * de connexions V2. AUCUN réseau : fetch global interdit ; réponses synthétiques.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { mapPlanToNolioV2, type DetWorkout, type NolioV2Refs, type PlanSessionInput } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";
import { sendPlannedV2, bodyToSend, operationKey, exactRemoteMatch, type NolioV2Ledger, type LedgerEntry } from "../../../../supabase/functions/_shared/nolioV2/plannedClient";
import { fetchNolioV2Http, type FetchLike } from "../../../../supabase/functions/_shared/nolioV2/httpFetch";
import { validateV2ConnectionRow, loadAuthorizedV2Connection, type ConnectionStoreClient } from "../../../../supabase/functions/_shared/nolioV2/connectionStore";

beforeAll(() => { vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); }); });

const contractRaw = readFileSync("docs/qa/nolio-v2/read-contract-2026-11-02.json");
const contract = JSON.parse(contractRaw.toString("utf8"));
const PV = "30909fcd-c421-4e35-b6ed-cbf1436fe77e";
const COACH = "6b4c1722-2105-4889-ab14-41bab798cdf7";
const ATH = "9758ace0-da71-4200-87bf-04e74bbb4ed9";
const REFS: NolioV2Refs = { synthetic: true, athleteId: "usr_SYNTH1", sportIds: { run: "spt_SYNTHRUN" }, exerciseIds: {}, competition: null, calendarTimeZone: "Europe/Brussels" };
const conn = { apiVersion: "v2" as const, mode: "test-mock" as const, grantedScopes: ["planned:read", "planned:write"] };
const T = "/api/v2/planned/trainings/";

const W = (): DetWorkout => ({
  schema: "det-structured-workout-v1", sourceId: "V3P_RUN_T", sport: "run", chosenDurationMin: 46, exactSeconds: 2760,
  nodes: [
    { kind: "step", role: "warmup", label: "Échauffement", domain: "LT1", dose: { seconds: 600 }, target: null, rpe: { min: 2, max: 3 } },
    { kind: "repeat", label: "4×6'", count: 4, betweenSec: 120, restAfterLast: false, steps: [
      { kind: "step", role: "main", label: "Seuil", domain: "MLSS", dose: { seconds: 360 }, target: { metric: "sec_per_km", min: 233, max: 247 } },
    ] },
    { kind: "step", role: "cooldown", label: "Retour au calme", domain: "LT1", dose: { seconds: 360 }, target: null },
  ],
});
const session = (): PlanSessionInput => ({ sessionKey: "S1-J2-0", date: "2026-11-04", title: "Seuil 4×6'", sport: "run", catalogId: "V3P_RUN_T", durationMin: 46, details: "4×6' seuil", detStructuredWorkout: W() });
const op = () => mapPlanToNolioV2([session()], REFS).operations[0];

type Resp = { status: number; body: string };
const ok = (x: unknown): Resp => ({ status: 200, body: JSON.stringify(x) });
function mockFetch(routes: (url: URL) => Resp | Error) {
  const calls: Array<{ url: URL; init: Parameters<FetchLike>[1] }> = [];
  const f: FetchLike = async (u, init) => {
    const url = new URL(u); calls.push({ url, init });
    const r = routes(url); if (r instanceof Error) throw r;
    return { status: r.status, text: async () => r.body };
  };
  return { f, calls };
}
const http = (f: FetchLike) => fetchNolioV2Http({ fetch: f, accessToken: "tok_SYNTH", timeoutMs: 30 });

/** Lecture côté serveur d'un corps créé : champs readOnly, ids de nœuds, `resolved`, unités de lecture. */
function asRead(sent: Record<string, unknown>, id: string): Record<string, unknown> {
  const addIds = (nodes: unknown[]): unknown[] => nodes.map((n, i) => {
    const o: Record<string, unknown> = { ...(n as Record<string, unknown>), id: `wn_${id}_${i}` };
    if (Array.isArray(o.steps)) o.steps = addIds(o.steps);
    if (Array.isArray(o.targets)) o.targets = (o.targets as object[]).map((t) => ({ ...t, resolved: { low: 1, high: 2 } }));
    if (o.duration && (o.duration as { unit: string }).unit === "min") o.duration = { value: (o.duration as { value: number }).value * 60, unit: "s" };
    return o;
  });
  return { ...sent, id, workout: addIds(sent.workout as unknown[]), group: null, moment: null, recurrence: null, color: null, tags: [], show_rpe: false,
    description_html: null, revision: "rev_SYNTH", summary: "texte", load: { coggan: 50 }, time_in_zones: null, has_structured_workout: true,
    duration: { value: 2760, unit: "s" }, distance: null, elevation_gain: null, elevation_loss: null, tonnage: null, coggan_load: null };
}

describe("contrat de lecture importé", () => {
  it("empreinte du fichier extrait = celle fournie ; 4 GET présents", () => {
    expect(createHash("sha256").update(contractRaw).digest("hex")).toBe("5627666ed0149a31d2982164d3efbf302384112f51233159265a4a769606d915");
    for (const p of [T, `${T}{id}/`, "/api/v2/planned/competitions/", "/api/v2/planned/competitions/{id}/"]) expect(contract.paths[p].get).toBeTruthy();
    const listParams = contract.paths[T].get.parameters.map((x: { name: string }) => x.name);
    for (const n of ["athlete", "date_from", "date_to", "limit", "starting_after"]) expect(listParams).toContain(n);
  });
});

describe("adaptateur GET réel (fetch mock)", () => {
  it("liste : hôte, slash final, athlete/date_from/date_to inclusifs, limit=100, curseur, aucune recurrence_action, pas de redirection", async () => {
    const m = mockFetch(() => ok({ data: [{ id: "ptrn_A1" }], has_more: false }));
    const r = await http(m.f).listPage(T, "usr_SYNTH1", "2026-11-04", "ptrn_PREV");
    expect(r).toEqual({ ok: true, items: [{ id: "ptrn_A1" }], hasMore: false });
    const { url, init } = m.calls[0];
    expect(url.origin + url.pathname).toBe("https://www.nolio.io/api/v2/planned/trainings/");
    expect(Object.fromEntries(url.searchParams)).toEqual({ athlete: "usr_SYNTH1", date_from: "2026-11-04", date_to: "2026-11-04", limit: "100", starting_after: "ptrn_PREV" });
    expect(init).toMatchObject({ method: "GET", redirect: "error", headers: { Authorization: "Bearer tok_SYNTH" } });
  });
  it("détail : collection + encodeURIComponent(id) + '/', query athlete seule", async () => {
    const ex = contract.paths[`${T}{id}/`].get.responses["200"].content["application/json"].examples.PlannedTraining.value;
    const m = mockFetch(() => ok(ex));
    const r = await http(m.f).getDetail(T, ex.id, "usr_SYNTH1");
    expect(r).toEqual({ ok: true, item: ex });
    expect(m.calls[0].url.pathname).toBe(`/api/v2/planned/trainings/${encodeURIComponent(ex.id)}/`);
    expect(Object.fromEntries(m.calls[0].url.searchParams)).toEqual({ athlete: "usr_SYNTH1" });
  });
  it("POST : aucun paramètre athlete en query", async () => {
    const m = mockFetch(() => ({ status: 201, body: '{"id":"ptrn_X"}' }));
    await http(m.f).post(T, { a: 1 });
    expect(m.calls[0].url.search).toBe("");
  });
  it.each([
    ["401", { status: 401, body: '{"error":{}}' }, "http_401"], ["403", { status: 403, body: "{}" }, "http_403"],
    ["429", { status: 429, body: "{}" }, "http_429"], ["503", { status: 503, body: "" }, "http_503"],
    ["302", { status: 302, body: "" }, "http_302"], ["JSON invalide", { status: 200, body: "<html>" }, "json_invalid"],
    ["forme hors contrat", ok({ results: [] }), "list_shape_invalid"], ["id d'une autre collection", ok({ data: [{ id: "pcmp_X" }], has_more: false }), "list_item_invalid"],
  ])("liste %s ⇒ lecture inconnue, jamais tableau vide", async (_n, resp, detail) => {
    const r = await http(mockFetch(() => resp as Resp).f).listPage(T, "usr_SYNTH1", "2026-11-04", null);
    expect(r).toEqual({ ok: false, detail });
  });
  it("timeout / réseau / redirection refusée par fetch ⇒ lecture inconnue", async () => {
    const hang: FetchLike = (_u, i) => new Promise((_r, rej) => i.signal?.addEventListener("abort", () => rej(Object.assign(new Error("a"), { name: "AbortError" }))));
    expect(await http(hang).listPage(T, "usr_SYNTH1", "2026-11-04", null)).toEqual({ ok: false, detail: "timeout" });
    expect(await http(mockFetch(() => new TypeError("redirect")).f).getDetail(T, "ptrn_A", "usr_SYNTH1")).toEqual({ ok: false, detail: "network_error" });
  });
  it("entrées invalides refusées sans appel", async () => {
    const m = mockFetch(() => ok({}));
    expect((await http(m.f).getDetail(T, "pcmp_X", "usr_SYNTH1")).ok).toBe(false);
    expect((await http(m.f).listPage(T, "123", "2026-11-04", null)).ok).toBe(false);
    expect((await http(m.f).listPage("/api/v2/real/trainings/", "usr_SYNTH1", "2026-11-04", null)).ok).toBe(false);
    expect(m.calls).toHaveLength(0);
  });
});

/** Journal minimal : opération déjà réservée et non confirmée (réponse perdue). */
async function ledgerWith(state: LedgerEntry["state"]) {
  const o = op(); const { opKey, payloadSha256 } = await operationKey(PV, o);
  const e: LedgerEntry = { opKey, planVersionId: PV, sessionKey: o.sessionKey, path: o.path, athleteRef: REFS.athleteId, payloadSha256, apiVersion: "v2", state, remoteId: null, detail: null };
  const transitions: Array<[string, string, string | null | undefined]> = [];
  const l: NolioV2Ledger = { claim: async () => ({ claimed: false, existing: { ...e } }), transition: async (_k, f, t, p) => { transitions.push([f, t, p.remoteId]); return true; } };
  return { l, transitions };
}

describe("réconciliation via le VRAI adaptateur GET (pagination complète + détail)", () => {
  it("cible en 2e page, détail conforme (ids de nœud, resolved, unités de lecture) ⇒ confirmé, aucun POST", async () => {
    const sent = await bodyToSend(PV, op());
    const m = mockFetch((u) => {
      if (u.pathname === T && !u.searchParams.get("starting_after")) return ok({ data: [{ id: "ptrn_OTHER1", name: "Autre", date_start: "2026-11-04", sport: "spt_SYNTHRUN" }], has_more: true });
      if (u.pathname === T) return ok({ data: [{ id: "ptrn_MINE", name: sent.name, date_start: sent.date_start, sport: sent.sport, description: sent.description }], has_more: false });
      if (u.pathname === `${T}ptrn_MINE/`) return ok(asRead(sent, "ptrn_MINE"));
      return { status: 404, body: "{}" };
    });
    const { l, transitions } = await ledgerWith("sent_unconfirmed");
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: [op()], ledger: l, http: http(m.f) });
    expect(r.status).toBe("DONE"); expect(transitions).toEqual([["sent_unconfirmed", "confirmed", "ptrn_MINE"]]);
    expect(m.calls.filter((c) => c.init.method === "POST")).toHaveLength(0);
    expect(m.calls[1].url.searchParams.get("starting_after")).toBe("ptrn_OTHER1");
  });
  it("détail avec id discordant ⇒ ambigu, aucun POST", async () => {
    const sent = await bodyToSend(PV, op());
    const m = mockFetch((u) => u.pathname === T ? ok({ data: [{ id: "ptrn_MINE", description: sent.description }], has_more: false }) : ok(asRead(sent, "ptrn_SWAP")));
    const { l } = await ledgerWith("sent_unconfirmed");
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: [op()], ledger: l, http: http(m.f) });
    expect(r.status).toBe("STOPPED_AMBIGUOUS"); expect(m.calls.some((c) => c.init.method === "POST")).toBe(false);
  });
  it("contre-exemple wrong_event_confirmed : même nom/date/sport mais durée 9999 s et workout [] ⇒ jamais confirmé", async () => {
    const sent = await bodyToSend(PV, op());
    const other = { ...asRead(sent, "ptrn_SYNTHOTHER"), workout: [], duration: { value: 9999, unit: "s" } };
    const m = mockFetch((u) => u.pathname === T ? ok({ data: [{ id: "ptrn_SYNTHOTHER", name: sent.name, date_start: sent.date_start, sport: sent.sport }], has_more: false }) : ok(other));
    const { l, transitions } = await ledgerWith("sent_unconfirmed");
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: [op()], ledger: l, http: http(m.f) });
    expect(r.status).toBe("STOPPED_AMBIGUOUS"); expect(transitions.some((t) => t[1] === "confirmed")).toBe(false);
  });
  it("changement de prescription au détail (dose, cible, ordre) ⇒ jamais exact malgré normalisation", () => {
    const sent = bodyToSendSync();
    const base = asRead(sent, "ptrn_MINE");
    expect(exactRemoteMatch(base, sent)).toBe(true);
    const wk = (x: Record<string, unknown>) => x.workout as Array<Record<string, unknown>>;
    const dose = structuredClone(base); (wk(dose)[0].duration as { value: number }).value += 1; expect(exactRemoteMatch(dose, sent)).toBe(false);
    const order = structuredClone(base); wk(order).reverse(); expect(exactRemoteMatch(order, sent)).toBe(false);
    const tag = structuredClone(base); tag.tags = ["tag_X"]; expect(exactRemoteMatch(tag, sent)).toBe(false);
    const time = structuredClone(base); time.time = "07:00"; expect(exactRemoteMatch(time, sent)).toBe(false);
  });
  it.each([["401", 401], ["429", 429], ["503", 503]])("lecture indisponible (%s) ⇒ STOPPED_UNCONFIRMED, aucun POST", async (_n, st) => {
    const m = mockFetch(() => ({ status: st, body: "{}" }));
    const { l } = await ledgerWith("sending");
    const r = await sendPlannedV2({ connection: conn, refs: REFS, planVersionId: PV, operations: [op()], ledger: l, http: http(m.f) });
    expect(r.status).toBe("STOPPED_UNCONFIRMED"); expect(r.reason).toMatch(/reconcile_read_failed/);
    expect(m.calls.some((c) => c.init.method === "POST")).toBe(false);
  });
});
let cachedSent: Record<string, unknown> | null = null;
function bodyToSendSync() { if (!cachedSent) throw new Error("init"); return cachedSent; }
beforeAll(async () => { cachedSent = await bodyToSend(PV, op()); });

describe("magasin de connexions V2 (vide en QA)", () => {
  const FUT = new Date(Date.now() + 3600_000).toISOString();
  const row = (p: Record<string, unknown> = {}) => ({ coach_id: COACH, athlete_id: ATH, status: "active", api_version: "v2", app_type: "partner", nolio_athlete_ref: "usr_R7hVe2Kd1Ns8Pq",
    granted_scopes: ["planned:read", "planned:write"], access_token: "tok_SYNTH_NOT_REAL", token_expires_at: FUT, consent_confirmed_at: "2026-11-02T00:00:00Z",
    refs: { sportIds: { run: "spt_o9Qqbid1vRktj" }, exerciseIds: {}, competition: null, calendarTimeZone: "Europe/Brussels" }, ...p });
  const ctx = { coachId: COACH, athleteId: ATH, now: Date.now() };
  const store = (data: unknown[] | null, error: { message: string } | null = null) => {
    const seen: string[] = [];
    const q = { eq(c: string, v: string) { seen.push(`${c}=${v}`); return q; }, limit: async () => ({ data, error }) };
    return { seen, client: { from: () => ({ select: () => q }) } as unknown as ConnectionStoreClient };
  };
  it("magasin vide ⇒ no_authorized_v2_connection ; requête liée au coach ET à l'athlète actifs", async () => {
    const s = store([]);
    expect(await loadAuthorizedV2Connection(s.client, ctx)).toEqual({ ok: false, reason: "no_authorized_v2_connection" });
    expect(s.seen).toEqual([`coach_id=${COACH}`, `athlete_id=${ATH}`, "status=active"]);
  });
  it("erreur / doublon ⇒ BLOCKED explicite", async () => {
    expect((await loadAuthorizedV2Connection(store(null, { message: "x" }).client, ctx)).ok).toBe(false);
    expect(await loadAuthorizedV2Connection(store([row(), row()]).client, ctx)).toEqual({ ok: false, reason: "connection_store_ambiguous" });
  });
  it("ligne valide (synthétique de test) ⇒ connexion réelle, refs non synthétiques, athlète du magasin", () => {
    const r = validateV2ConnectionRow(row(), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.value.connection.mode).toBe("real"); expect(r.value.refs).toMatchObject({ synthetic: false, athleteId: "usr_R7hVe2Kd1Ns8Pq" }); }
  });
  it.each([
    ["autre coach", { coach_id: "00000000-0000-4000-8000-000000000000" }, "connection_binding_mismatch"],
    ["autre athlète", { athlete_id: "00000000-0000-4000-8000-000000000000" }, "connection_binding_mismatch"],
    ["V1", { api_version: "v1" }, "connection_not_v2"], ["app personnelle", { app_type: "personal" }, "app_type_must_be_partner_or_team"],
    ["scope manquant", { granted_scopes: ["planned:write"] }, "scopes_missing:planned:read"],
    ["expiré", { token_expires_at: new Date(Date.now() - 1000).toISOString() }, "token_expired_or_expiring"],
    ["expiration inconnue", { token_expires_at: null }, "token_expiry_unknown"],
    ["consentement non confirmé", { consent_confirmed_at: null }, "consent_unconfirmed"],
    ["id athlète V1 numérique", { nolio_athlete_ref: "12345" }, "athlete_ref_invalid"],
    ["sports non confirmés", { refs: { sportIds: {}, exerciseIds: {} } }, "sport_ids_unconfirmed"],
    ["refs synthetic injecté", { refs: { sportIds: { run: "spt_A" }, synthetic: true } }, "refs_unknown_keys:synthetic"],
    ["fuseau invalide", { refs: { sportIds: { run: "spt_A" }, calendarTimeZone: "Mars/Olympus" } }, "calendar_timezone_invalid"],
  ])("%s ⇒ refus", (_n, p, reason) => expect(validateV2ConnectionRow(row(p), ctx)).toEqual({ ok: false, reason }));
});
