import { describe, expect, it, vi } from "vitest";
import { buildDryRunBody, classifyDryRunResponse, DRY_RUN_FIXTURE_CODE, DRY_RUN_URL, forceDryRun, postDryRun, type DryFetch } from "../../../../supabase/functions/_shared/nolioV2/dryRun";
import { runDryRunAction } from "../../../../supabase/functions/_shared/nolioV2/dryRunAction";
import { verifyReceipt } from "@/qa/pilot-review/dryRunReceipt";

const ok = { fixtureCode: DRY_RUN_FIXTURE_CODE, runSportId: "spt_SYNTH1", athleteRef: "usr_SYNTH1", date: "2026-11-04" };
const resp = (status: number, text: string) => ({ status, text: () => Promise.resolve(text) });
const VALID = JSON.stringify({ dry_run: true, is_valid: true, summary: "10 min" });

describe("corps dry_run", () => {
  it("dry_run:true toujours, même si une valeur false est fournie", () => {
    const b = buildDryRunBody(ok); expect(b.ok && b.body.dry_run).toBe(true);
    expect(forceDryRun({ dry_run: false }).dry_run).toBe(true);
    expect(b.ok && (b.body.workout as { targets: unknown[] }[])[0].targets).toEqual([{ type: "no_target" }]);
  });
  it("fixture/sport/athlète forgés refusés", () => {
    expect(buildDryRunBody({ ...ok, fixtureCode: "OTHER" }).ok).toBe(false);
    expect(buildDryRunBody({ ...ok, runSportId: "123" }).ok).toBe(false);
    expect(buildDryRunBody({ ...ok, athleteRef: "42" }).ok).toBe(false);
  });
});

describe("transport", () => {
  it("corps sans dry_run:true ⇒ zéro fetch", async () => {
    const f = vi.fn();
    const r = await postDryRun({ fetch: f as unknown as DryFetch, accessToken: "t", body: { dry_run: false } });
    expect(r.code).toBe("local_guard_refused"); expect(f).not.toHaveBeenCalled();
  });
  it("URL fixe, redirect error, dry_run envoyé", async () => {
    const f = vi.fn(async () => resp(200, VALID));
    const b = buildDryRunBody(ok); if (!b.ok) throw 0;
    const r = await postDryRun({ fetch: f as unknown as DryFetch, accessToken: "t", body: b.body });
    expect(r.outcome).toBe("DRY_RUN_VALID");
    const [u, init] = f.mock.calls[0] as unknown as [string, { redirect: string; body: string }];
    expect(u).toBe(DRY_RUN_URL); expect(init.redirect).toBe("error"); expect(JSON.parse(init.body).dry_run).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("fetch ou corps qui ne répondent jamais ⇒ UNKNOWN borné", async () => {
    const b = buildDryRunBody(ok); if (!b.ok) throw 0;
    const hang = () => new Promise<never>(() => {});
    expect((await postDryRun({ fetch: hang as unknown as DryFetch, accessToken: "t", body: b.body, budgetMs: 20 })).code).toBe("timeout_or_lost");
    const f2 = async () => ({ status: 200, text: hang });
    expect((await postDryRun({ fetch: f2 as unknown as DryFetch, accessToken: "t", body: b.body, budgetMs: 20 })).code).toBe("timeout_or_lost");
  });
});

describe("classement strict", () => {
  it.each([
    [200, VALID, "DRY_RUN_VALID"], [200, "{}", "UNKNOWN"], [200, JSON.stringify({ dry_run: true, is_valid: true, summary: "x", extra: 1 }), "UNKNOWN"],
    [201, JSON.stringify({ id: "ptrn_X", name: "n" }), "UNKNOWN"], [200, "<html>", "UNKNOWN"], [200, JSON.stringify({ dry_run: false, is_valid: true, summary: "" }), "UNKNOWN"],
    [400, "{}", "REFUSED"], [401, "", "REFUSED"], [429, "", "REFUSED"], [500, "", "UNKNOWN"], [0, "", "UNKNOWN"],
  ])("%i ⇒ %s", (s, t, out) => { expect(classifyDryRunResponse(s, t).outcome).toBe(out); });
  it("ressource créée signalée", () => { expect(classifyDryRunResponse(201, JSON.stringify({ id: "ptrn_X" })).code).toBe("unexpected_created_resource"); });
});

describe("action", () => {
  const conn = { ok: true as const, value: { accessToken: "t", connection: { apiVersion: "v2", mode: "real", grantedScopes: [] }, refs: { synthetic: false, athleteId: "usr_SYNTH1", sportIds: { run: "spt_SYNTH1" }, exerciseIds: {}, competition: null } } };
  it("fixture forgée ⇒ ni connexion ni réseau", async () => {
    const load = vi.fn(), f = vi.fn(), ins = vi.fn();
    const r = await runDryRunAction({ coachId: "c", athleteId: "a", fixtureCode: "X", now: Date.now, loadConnection: load, fetch: f, insertReceipt: ins });
    expect(r.status).toBe("REFUSED"); expect(load).not.toHaveBeenCalled(); expect(f).not.toHaveBeenCalled();
  });
  it("connexion non active ⇒ BLOCKED sans réseau", async () => {
    const f = vi.fn();
    const r = await runDryRunAction({ coachId: "c", athleteId: "a", fixtureCode: DRY_RUN_FIXTURE_CODE, now: Date.now, loadConnection: async () => ({ ok: false, reason: "connection_not_active" }), fetch: f, insertReceipt: vi.fn() });
    expect(r.status).toBe("BLOCKED"); expect(f).not.toHaveBeenCalled();
  });
  it("sport run absent ⇒ BLOCKED sans réseau", async () => {
    const f = vi.fn();
    const c = { ...conn, value: { ...conn.value, refs: { ...conn.value.refs, sportIds: { bike: "spt_B" } } } };
    const r = await runDryRunAction({ coachId: "c", athleteId: "a", fixtureCode: DRY_RUN_FIXTURE_CODE, now: Date.now, loadConnection: async () => c as never, fetch: f, insertReceipt: vi.fn() });
    expect(r.code).toBe("run_sport_unconfirmed"); expect(f).not.toHaveBeenCalled();
  });
  it("succès ⇒ un seul POST, reçu sans réponse brute", async () => {
    const f = vi.fn(async () => resp(200, VALID)); const ins = vi.fn(async () => "rid");
    const r = await runDryRunAction({ coachId: "c", athleteId: "a", fixtureCode: DRY_RUN_FIXTURE_CODE, now: Date.now, loadConnection: async () => conn as never, fetch: f as unknown as DryFetch, insertReceipt: ins });
    expect(r.status).toBe("DRY_RUN_VALID"); expect(f).toHaveBeenCalledTimes(1);
    expect(Object.keys((ins.mock.calls as unknown as [Record<string, unknown>][])[0][0]).sort()).toEqual(["athlete_id", "coach_id", "code", "fixture_code", "http_status", "outcome", "payload_sha256"]);
    expect(JSON.stringify(r)).not.toContain("10 min");
  });
});

describe("relecture du reçu", () => {
  const who = { coachId: "c", athleteId: "a" };
  const r = { status: "DRY_RUN_VALID", code: "dry_run_valid", httpStatus: 200, receiptId: "rid", payloadSha256: "h", realSend: "ABSENT" };
  const row = { id: "rid", coach_id: "c", athlete_id: "a", fixture_code: DRY_RUN_FIXTURE_CODE, payload_sha256: "h", http_status: 200, outcome: "DRY_RUN_VALID", code: "dry_run_valid", real_send: "ABSENT" };
  it("concordance ⇒ confirmé", () => { expect(verifyReceipt(r, row, who).kind).toBe("CONFIRMED_VALID"); });
  it("reçu d'un autre coach / divergent / absent ⇒ non confirmé", () => {
    expect(verifyReceipt(r, { ...row, coach_id: "b" }, who).kind).toBe("UNCONFIRMED");
    expect(verifyReceipt(r, { ...row, outcome: "UNKNOWN" }, who).kind).toBe("UNCONFIRMED");
    expect(verifyReceipt(r, null, who).kind).toBe("UNCONFIRMED");
  });
});
