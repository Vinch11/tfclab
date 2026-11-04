import { describe, it, expect } from "vitest";
import {
  runTrialAction, buildTrialBody, trialMarker, classifyCreate, TRIAL_RECIPE_CODE, TRIAL_PATH,
  type TrialRow, type TrialStore, type TrialReceiptInsert,
} from "../../../../supabase/functions/_shared/nolioV2/trialSession";
import { fetchNolioV2Http, type FetchLike } from "../../../../supabase/functions/_shared/nolioV2/httpFetch";
import type { NolioV2Http, HttpResult } from "../../../../supabase/functions/_shared/nolioV2/plannedClient";
import { verifyTrialReceipts, type TrialResponse } from "../trialReceipt";

const COACH = "11111111-1111-4111-8111-111111111111";
const ATH = "22222222-2222-4222-8222-222222222222";
const COACH_B = "33333333-3333-4333-8333-333333333333";
const REC = async () => ({ ok: true as const, name: "Athlète Synthétique" });
const NOW = Date.UTC(2026, 10, 3, 18, 0, 0);
const conn = (over: Record<string, unknown> = {}) => async () => ({ ok: true as const, value: {
  connection: { apiVersion: "v2" as const, mode: "real" as const, grantedScopes: ["planned:read", "planned:write"] },
  refs: { synthetic: false, athleteId: "usr_test1", sportIds: { run: "spt_run1" }, exerciseIds: {}, competition: null, calendarTimeZone: null, ...over },
  accessToken: "tok-test",
} });

/** Store en mémoire reproduisant la sémantique SQL (unique, CAS, trigger d'immuabilité). */
function memStore() {
  const rows = new Map<string, TrialRow & { coach: string; athlete: string }>();
  const receipts: TrialReceiptInsert[] = [];
  const key = (c: string, a: string) => `${c}|${a}`;
  const mk = (coach: string, athlete: string): TrialStore => ({
    async get() { const r = rows.get(key(coach, athlete)); return r ? { ...r } : null; },
    async freeze(date, sha) {
      const k = key(coach, athlete);
      if (!rows.has(k)) rows.set(k, { id: crypto.randomUUID(), trial_date: date, payload_sha256: sha, state: "frozen", remote_id: null, coach, athlete });
      return { ...rows.get(k)! };
    },
    async claimSend(id, sha) {
      for (const r of rows.values()) if (r.id === id && r.coach === coach && r.payload_sha256 === sha && r.state === "frozen") { r.state = "sending"; return true; }
      return false;
    },
    async finishSend(id, to, remoteId) {
      for (const r of rows.values()) if (r.id === id && r.coach === coach && r.state === "sending") { r.state = to; r.remote_id = remoteId; return true; }
      return false;
    },
    async insertReceipt(r) { receipts.push(r); return crypto.randomUUID(); },
  });
  return { mk, rows, receipts };
}

type Item = Record<string, unknown>;
function fakeHttp(opts: { post?: () => Promise<HttpResult>; items?: () => Item[]; detail?: (id: string, it: Item) => Item | null; hasMoreLoop?: boolean }) {
  const calls = { post: 0, list: 0, detail: 0, bodies: [] as unknown[] };
  const http: NolioV2Http = {
    async post(_p, body) { calls.post++; calls.bodies.push(body); return opts.post ? opts.post() : { kind: "response", status: 201, json: { id: "ptrn_new1", date_start: (body as Item).date_start } }; },
    async listPage() { calls.list++; return { ok: true, items: (opts.items?.() ?? []) as Item[], hasMore: !!opts.hasMoreLoop }; },
    async getDetail(_p, id) { calls.detail++; const it = (opts.items?.() ?? []).find((x) => x.id === id)!; const d = opts.detail ? opts.detail(id, it) : it; return d ? { ok: true, item: d } : { ok: false, detail: "http_500" }; },
  };
  return { http, calls };
}
async function sentBody() {
  const b = buildTrialBody({ runSportId: "spt_run1", athleteRef: "usr_test1", date: "2026-11-04", marker: await trialMarker(COACH, ATH) });
  if (!b.ok) throw new Error("body");
  return b.body;
}
const run = (store: TrialStore, http: NolioV2Http, action: string, extra: Record<string, unknown> = {}) =>
  runTrialAction({ coachId: COACH, athleteId: ATH, recipeCode: TRIAL_RECIPE_CODE, action, now: () => NOW, loadConnection: conn(), loadRecipient: REC, http: () => http, store, ...extra });

describe("Nolio V2 essai réel unique", () => {
  it("corps fixe : course 10 min no_target, date seule, aucun dry_run, marqueur TFCLab", async () => {
    const b = await sentBody();
    expect(b).not.toHaveProperty("dry_run");
    expect(b.date_start).toBe("2026-11-04");
    expect(b.workout).toEqual([{ kind: "step", duration: { value: 600, unit: "s" }, targets: [{ type: "no_target" }] }]);
    expect(String(b.description)).toMatch(/\[TFCLab-QA-TRIAL [0-9a-f]{24}\]$/);
  });

  it("préparer ne fait aucun appel Nolio et fige date + corps une seule fois", async () => {
    const s = memStore(); const { http, calls } = fakeHttp({});
    const a = await run(s.mk(COACH, ATH), http, "prepare");
    expect(a.status).toBe("PREPARED"); expect(a.trialDate).toBe("2026-11-04");
    expect(calls.post + calls.list + calls.detail).toBe(0);
    // Le lendemain / nouvelle instance : même essai, même date, même empreinte.
    const b = await runTrialAction({ coachId: COACH, athleteId: ATH, recipeCode: TRIAL_RECIPE_CODE, action: "prepare", now: () => NOW + 3 * 86_400_000, loadConnection: conn(), loadRecipient: REC, http: () => http, store: s.mk(COACH, ATH) });
    expect(b.trialId).toBe(a.trialId); expect(b.trialDate).toBe("2026-11-04"); expect(b.payloadSha256).toBe(a.payloadSha256);
  });

  it("envoi sans préparation refusé, aucun POST", async () => {
    const s = memStore(); const { http, calls } = fakeHttp({});
    expect((await run(s.mk(COACH, ATH), http, "send")).code).toBe("trial_not_prepared");
    expect(calls.post).toBe(0);
  });

  it("succès vérifié seulement avec lecture complète + détail exact unique", async () => {
    const s = memStore(); const body = await sentBody();
    const { http, calls } = fakeHttp({ items: () => [{ ...body, id: "ptrn_new1", revision: 1 }] });
    await run(s.mk(COACH, ATH), http, "prepare");
    const r = await run(s.mk(COACH, ATH), http, "send");
    expect(calls.post).toBe(1); expect(calls.bodies[0]).not.toHaveProperty("dry_run");
    expect(r.status).toBe("POST_ACCEPTED"); expect(r.verify?.verdict).toBe("VERIFIED_UNIQUE");
  });

  it("double clic / concurrence : un seul POST", async () => {
    const s = memStore(); const body = await sentBody();
    const { http, calls } = fakeHttp({ items: () => [{ ...body, id: "ptrn_new1" }] });
    await run(s.mk(COACH, ATH), http, "prepare");
    const [a, b] = await Promise.all([run(s.mk(COACH, ATH), http, "send"), run(s.mk(COACH, ATH), http, "send")]);
    expect(calls.post).toBe(1);
    expect([a.status, b.status].filter((x) => x === "IN_FLIGHT" || x === "ALREADY_SENT").length).toBe(1);
  });

  it("rechargement après envoi : jamais un deuxième POST", async () => {
    const s = memStore(); const { http, calls } = fakeHttp({});
    await run(s.mk(COACH, ATH), http, "prepare"); await run(s.mk(COACH, ATH), http, "send");
    const again = await run(s.mk(COACH, ATH), http, "send");
    expect(again.status).toBe("ALREADY_SENT"); expect(calls.post).toBe(1);
  });

  it.each([
    ["perte de réponse", async (): Promise<HttpResult> => ({ kind: "lost", detail: "timeout" }), "post_unconfirmed"],
    ["5xx", async (): Promise<HttpResult> => ({ kind: "response", status: 503, json: null }), "post_unconfirmed"],
    ["429", async (): Promise<HttpResult> => ({ kind: "response", status: 429, json: null }), "post_refused"],
    ["403", async (): Promise<HttpResult> => ({ kind: "response", status: 403, json: { error: { code: "team_scope_forbidden" } } }), "post_refused"],
    ["2xx JSON arbitraire", async (): Promise<HttpResult> => ({ kind: "response", status: 200, json: { ok: true } }), "post_unconfirmed"],
    ["id seul sans date", async (): Promise<HttpResult> => ({ kind: "response", status: 201, json: { id: "ptrn_x" } }), "post_unconfirmed"],
  ])("%s : pas de faux succès ni renvoi", async (_n, post, state) => {
    const s = memStore(); const { http, calls } = fakeHttp({ post });
    await run(s.mk(COACH, ATH), http, "prepare");
    const r = await run(s.mk(COACH, ATH), http, "send");
    expect(r.state).toBe(state); expect(r.status).not.toBe("VERIFIED_UNIQUE");
    await run(s.mk(COACH, ATH), http, "send"); await run(s.mk(COACH, ATH), http, "verify");
    expect(calls.post).toBe(1);
  });

  it("POST pendu : délai borné, état incertain, aucun renvoi", async () => {
    const s = memStore(); const { http, calls } = fakeHttp({ post: () => new Promise(() => {}) });
    await run(s.mk(COACH, ATH), http, "prepare");
    const r = await run(s.mk(COACH, ATH), http, "send", { postBudgetMs: 20, verifyBudgetMs: 20 });
    expect(r.state).toBe("post_unconfirmed"); expect(r.code).toBe("timeout"); expect(calls.post).toBe(1);
  });

  it("perte après commit Nolio : la vérification retrouve l'unique occurrence sans POST", async () => {
    const s = memStore(); const body = await sentBody();
    const { http, calls } = fakeHttp({ post: async () => ({ kind: "lost", detail: "network_error" }), items: () => [{ ...body, id: "ptrn_ghost" }] });
    await run(s.mk(COACH, ATH), http, "prepare");
    const r = await run(s.mk(COACH, ATH), http, "send");
    expect(r.status).toBe("POST_UNCONFIRMED"); expect(r.verify?.verdict).toBe("VERIFIED_UNIQUE");
    expect(calls.post).toBe(1);
  });

  it("relecture absente / duplicata / détail divergent / curseur répété / détail illisible", async () => {
    const body = await sentBody();
    const cases: Array<[Parameters<typeof fakeHttp>[0], string]> = [
      [{ items: () => [] }, "ABSENT"],
      [{ items: () => [{ ...body, id: "ptrn_a" }, { ...body, id: "ptrn_b" }] }, "DUPLICATE"],
      [{ items: () => [{ ...body, id: "ptrn_new1", name: "édité" }] }, "DIVERGENT"],
      [{ items: () => [{ ...body, id: "ptrn_new1" }], hasMoreLoop: true }, "UNKNOWN"],
      [{ items: () => [{ ...body, id: "ptrn_new1" }], detail: () => null }, "UNKNOWN"],
      [{ items: () => [{ ...body, id: "ptrn_new1" }], detail: (_id, it) => ({ ...it, id: "ptrn_other" }) }, "UNKNOWN"],
    ];
    for (const [o, verdict] of cases) {
      const s = memStore(); const { http } = fakeHttp(o);
      await run(s.mk(COACH, ATH), http, "prepare");
      const r = await run(s.mk(COACH, ATH), http, "send");
      expect(r.verify?.verdict).toBe(verdict);
    }
  });

  it("id retourné différent de l'occurrence trouvée ⇒ DIVERGENT", async () => {
    const s = memStore(); const body = await sentBody();
    const { http } = fakeHttp({ items: () => [{ ...body, id: "ptrn_other" }] });
    await run(s.mk(COACH, ATH), http, "prepare");
    expect((await run(s.mk(COACH, ATH), http, "send")).verify?.verdict).toBe("DIVERGENT");
  });

  it("refs changées après gel ⇒ refus, jamais une nouvelle séance", async () => {
    const s = memStore(); const { http, calls } = fakeHttp({});
    await run(s.mk(COACH, ATH), http, "prepare");
    const r = await run(s.mk(COACH, ATH), http, "send", { loadConnection: conn({ sportIds: { run: "spt_other" } }) });
    expect(r.code).toBe("trial_payload_divergent"); expect(calls.post).toBe(0);
  });

  it("opération / recette arbitraire refusée avant tout accès", async () => {
    const s = memStore(); const { http, calls } = fakeHttp({});
    expect((await run(s.mk(COACH, ATH), http, "full_plan")).code).toBe("action_unknown");
    expect((await runTrialAction({ coachId: COACH, athleteId: ATH, recipeCode: "X", action: "send", now: () => NOW, loadConnection: conn(), loadRecipient: REC, http: () => http, store: s.mk(COACH, ATH) })).code).toBe("recipe_unknown");
    expect(calls.post).toBe(0);
  });

  it("compte B ne voit pas l'essai de A", async () => {
    const s = memStore(); const { http } = fakeHttp({});
    await run(s.mk(COACH, ATH), http, "prepare");
    const b = await runTrialAction({ coachId: COACH_B, athleteId: ATH, recipeCode: TRIAL_RECIPE_CODE, action: "send", now: () => NOW, loadConnection: conn(), loadRecipient: REC, http: () => http, store: s.mk(COACH_B, ATH) });
    expect(b.code).toBe("trial_not_prepared");
  });

  it("transport réel : corps sans dry_run, URL fixe, redirect refusé ; dry_run refusé sans réseau", async () => {
    const seen: string[] = [];
    const f: FetchLike = async (url, init) => { seen.push(`${init.method} ${url} ${init.redirect}`); return { status: 201, text: async () => JSON.stringify({ id: "ptrn_z", date_start: "2026-11-04" }) }; };
    const h = fetchNolioV2Http({ fetch: f, accessToken: "t" });
    const body = await sentBody();
    expect(classifyCreate(await h.post(TRIAL_PATH, body), body).to).toBe("post_accepted");
    expect(seen).toEqual(["POST https://www.nolio.io/api/v2/planned/trainings/ error"]);
    const refused = await h.post(TRIAL_PATH, { ...body, dry_run: true });
    expect(refused).toMatchObject({ kind: "response", status: 0 }); expect(seen.length).toBe(1);
  });
});

describe("relecture client des reçus", () => {
  const who = { coachId: COACH, athleteId: ATH };
  const resp: TrialResponse = { status: "POST_ACCEPTED", code: "created_201", trialId: "t1", trialDate: "2026-11-04", payloadSha256: "a".repeat(64), state: "post_accepted", httpStatus: 201, receiptIds: ["r1", "r2"],
    verify: { verdict: "VERIFIED_UNIQUE", code: "exact_unique", receiptId: "r2", itemsRead: 1, markerMatches: 1, exactMatches: 1 }, network: "post+read", recipient: null };
  const row = (id: string, o: Record<string, unknown>) => ({ id, trial_id: "t1", coach_id: COACH, athlete_id: ATH, recipe_code: TRIAL_RECIPE_CODE, trial_date: "2026-11-04", payload_sha256: "a".repeat(64), http_status: null, items_read: null, marker_matches: null, exact_matches: null, ...o });
  const rows = [row("r1", { action: "send", verdict: "POST_ACCEPTED", code: "created_201", http_status: 201 }), row("r2", { action: "verify", verdict: "VERIFIED_UNIQUE", code: "exact_unique", items_read: 1, marker_matches: 1, exact_matches: 1 })];
  it("concordant ⇒ une seule occurrence vérifiée, plus de bouton d'envoi", () => {
    const v = verifyTrialReceipts(resp, rows, who);
    expect(v.kind).toBe("VERIFIED_UNIQUE"); expect(v.canSend).toBe(false);
  });
  it("reçu d'un autre coach ou divergent ⇒ inconnu", () => {
    expect(verifyTrialReceipts(resp, rows, { coachId: COACH_B, athleteId: ATH }).kind).toBe("UNKNOWN");
    expect(verifyTrialReceipts(resp, [rows[0], { ...rows[1], marker_matches: 2 }], who).kind).toBe("UNKNOWN");
    expect(verifyTrialReceipts(resp, null, who).kind).toBe("UNKNOWN");
  });
  it("VERIFIED_UNIQUE refusé si compteurs nuls (même null des deux côtés), items_read<1 ou code ≠ exact_unique", () => {
    const nul = { ...resp, verify: { ...resp.verify!, itemsRead: null, markerMatches: null, exactMatches: null } };
    expect(verifyTrialReceipts(nul, [rows[0], { ...rows[1], items_read: null, marker_matches: null, exact_matches: null }], who).kind).toBe("UNKNOWN");
    const nulItems = { ...resp, verify: { ...resp.verify!, itemsRead: null } };
    expect(verifyTrialReceipts(nulItems, [rows[0], { ...rows[1], items_read: null }], who).kind).toBe("UNKNOWN");
    const zero = { ...resp, verify: { ...resp.verify!, itemsRead: 0 } };
    expect(verifyTrialReceipts(zero, [rows[0], { ...rows[1], items_read: 0 }], who).kind).toBe("UNKNOWN");
    const frac = { ...resp, verify: { ...resp.verify!, itemsRead: 1.5 } };
    expect(verifyTrialReceipts(frac, [rows[0], { ...rows[1], items_read: 1.5 }], who).kind).toBe("UNKNOWN");
    const code = { ...resp, verify: { ...resp.verify!, code: "other" } };
    expect(verifyTrialReceipts(code, [rows[0], { ...rows[1], code: "other" }], who).kind).toBe("UNKNOWN");
  });
  it("préparation sans destinataire Nolio confirmé ⇒ envoi bloqué", () => {
    const prep: TrialResponse = { ...resp, status: "PREPARED", code: "frozen", state: "frozen", httpStatus: null, receiptIds: ["p1"], verify: null, network: "none", recipient: null };
    const pr = [row("p1", { action: "prepare", verdict: "PREPARED", code: "frozen" })];
    const v = verifyTrialReceipts(prep, pr, who);
    expect(v.kind).toBe("BLOCKED"); expect(v.canSend).toBe(false);
    expect(verifyTrialReceipts({ ...prep, recipient: { nolioName: "Synth", payloadSha256: prep.payloadSha256! } }, pr, who).canSend).toBe(true);
  });
});

describe("destinataire Nolio lié au hash", () => {
  it("renvoie le nom fourni par le grant pour CE hash ; nettoie contrôle/bidi", async () => {
    const s = memStore(); const { http, calls } = fakeHttp({});
    const r = await run(s.mk(COACH, ATH), http, "prepare", { loadRecipient: async (ref: string) => ({ ok: true, name: ref === "usr_test1" ? "Synth\u202eA\u0007 " : "WRONG" }) });
    expect(r.recipient).toEqual({ nolioName: "SynthA", payloadSha256: r.payloadSha256 });
    expect(calls.post + calls.list + calls.detail).toBe(0);
    expect(JSON.stringify(s.receipts)).not.toContain("Synth");
  });
  it("destinataire non confirmé ⇒ prepare et send bloqués, rien de figé ni envoyé", async () => {
    const s = memStore(); const { http, calls } = fakeHttp({});
    const no = { loadRecipient: async () => ({ ok: false, reason: "recipient_association_changed" }) };
    expect((await run(s.mk(COACH, ATH), http, "prepare", no)).code).toBe("recipient_association_changed");
    expect(s.rows.size).toBe(0);
    await run(s.mk(COACH, ATH), http, "prepare");
    const r = await run(s.mk(COACH, ATH), http, "send", no);
    expect(r.status).toBe("BLOCKED"); expect(calls.post).toBe(0);
    expect([...s.rows.values()][0].state).toBe("frozen");
  });
  it("association changée (autre ref) ⇒ hash divergent, aucun ancien nom réutilisé", async () => {
    const s = memStore(); const { http, calls } = fakeHttp({});
    await run(s.mk(COACH, ATH), http, "prepare");
    const r = await run(s.mk(COACH, ATH), http, "send", { loadConnection: conn({ athleteId: "usr_other2" }) });
    expect(r.code).toBe("trial_payload_divergent"); expect(r.recipient).toBeNull(); expect(calls.post).toBe(0);
  });
});

describe("budget de relecture", () => {
  it("un détail tardif après l'échéance ne démarre aucun GET suivant et ne produit pas de succès", async () => {
    const body = await sentBody();
    const items = [{ id: "ptrn_a1", date_start: "2026-11-04" }, { id: "ptrn_b2", date_start: "2026-11-04" }, { id: "ptrn_c3", date_start: "2026-11-04" }];
    const s = memStore(); let detailCalls = 0;
    const http: NolioV2Http = {
      async post() { return { kind: "response", status: 201, json: { id: "ptrn_a1", date_start: "2026-11-04" } }; },
      async listPage() { return { ok: true, items, hasMore: false }; },
      async getDetail(_p, id) { detailCalls++; await new Promise((r) => setTimeout(r, 60)); return { ok: true, item: { ...body, id } }; },
    };
    await run(s.mk(COACH, ATH), http, "prepare");
    const r = await run(s.mk(COACH, ATH), http, "send", { verifyBudgetMs: 20 });
    expect(r.verify?.verdict).toBe("UNKNOWN"); expect(r.verify?.code).toBe("read_timeout");
    await new Promise((res) => setTimeout(res, 250));
    expect(detailCalls).toBe(1);
    expect(s.receipts.filter((x) => x.action === "verify").map((x) => x.verdict)).toEqual(["UNKNOWN"]);
  });
});
