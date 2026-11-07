/**
 * Envoi réel du plan complet (QA) — HTTP INJECTÉ, références SYNTHÉTIQUES, aucun réseau.
 * Portes : consentement, empreintes figées, simulation intégrale concordante du corps MARQUÉ,
 * prescription, attestation humaine. Envoi : journal durable, lot borné, reprise, ACK perdu,
 * double clic, ressources mixtes (séances + compétition), lecture exacte unique.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { runDetLabScenario } from "@/qa/det-lab/detLab";
import { preparePlan, type Prepared } from "../../../../supabase/functions/_shared/nolioV2/planDryRun";
import { realSendGate, type DryReceipt, type GateInput } from "../../../../supabase/functions/_shared/nolioV2/planSend";
import { sendPlannedV2, reconcileExact, originMarker, type NolioV2Ledger, type LedgerEntry, type NolioV2Http, type NolioV2Connection } from "../../../../supabase/functions/_shared/nolioV2/plannedClient";
import type { NolioV2Refs } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";

const SPORTS = { run: "spt_SYNTHRUN", bike: "spt_SYNTHBIKE", swim: "spt_SYNTHSWIM", strength: "spt_SYNTHSTR" };
const SFX = " ; créneau avec micro-pauses et répétitions plafonnées, stop dès perte de qualité";
const EXERCISES = { [`Squat technique contrôlée${SFX}`]: "exf_SYNTHSQUAT", [`Charnière hanche soulevé roumain${SFX}`]: "exf_SYNTHRDL", [`Fente arrière assistée${SFX}`]: "exf_SYNTHLUNGE" };
const refs = (over: Partial<NolioV2Refs> = {}): NolioV2Refs => ({ synthetic: true, athleteId: "usr_SYNTH1", sportIds: SPORTS, exerciseIds: EXERCISES,
  competition: { date: "2027-02-14", name: "Marathon", sport: "run" }, calendarTimeZone: null, ...over });
const PV = "33333333-3333-4333-8333-333333333333";
const JOB = "44444444-4444-4444-8444-444444444444";
const conn: NolioV2Connection = { apiVersion: "v2", mode: "test-mock", grantedScopes: ["planned:write", "planned:read"] };

let plan: Record<string, unknown>; let P: Prepared;
beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
  const o = runDetLabScenario("marathon-16w-age_group-tte-source-preferred", { engineVersion: "a".repeat(64) });
  if (o.kind !== "accepted") throw new Error(o.kind);
  plan = o.plan as unknown as Record<string, unknown>;
  P = await preparePlan(plan, refs(), PV);
}, 600000);

const validReceipts = (p: Prepared): DryReceipt[] => p.ops.map((o) => ({ op_index: o.opIndex, session_key: o.sessionKey, session_date: o.date, body_sha256: o.bodySha256, outcome: "DRY_RUN_VALID", code: "dry_run_valid", http_status: 201 }));
const gateIn = (over: Partial<GateInput> = {}): GateInput => ({
  planVersionId: PV, prepared: P, consent: true,
  expected: { planSha256: P.planSha256, refsSha256: P.refsSha256, opsSha256: P.opsSha256, jobId: JOB },
  job: { id: JOB, plan_version_id: PV, plan_sha256: P.planSha256, refs_sha256: P.refsSha256, ops_sha256: P.opsSha256, total_ops: P.ops.length },
  receipts: validReceipts(P), provenance: { prescriptionAllowed: true, syntheticFixture: false },
  attestation: { planVersionId: PV, planSha256: P.planSha256, reviewer: "synthetic-reviewer" }, ...over,
});

describe("porte d'envoi réel", () => {
  it("128 séances = 74 séances + 1 compétition + 53 repos, 0 refus ; toutes les portes injectées ⇒ aucune raison", async () => {
    expect(P.precheck.totalSessions).toBe(128);
    expect(P.precheck.opsByKind).toEqual({ training: 74, competition: 1 });
    expect(P.precheck.excludedRest).toBe(53); expect(P.precheck.refused).toBe(0);
    expect(await realSendGate(gateIn())).toEqual([]);
  });
  it("plan QA réel (synthétique, sans attestation) : BLOQUÉ avec raisons exactes, même avec simulation 75/75", async () => {
    const r = await realSendGate(gateIn({ provenance: (plan as { _provenance?: unknown })._provenance ?? null, attestation: null }));
    expect(r).toContain("plan_not_prescription_allowed");
    expect(r).toContain("human_plan_attestation_absent");
  });
  it("consentement absent ou non booléen ⇒ bloqué", async () => {
    expect(await realSendGate(gateIn({ consent: undefined }))).toContain("coach_consent_for_this_plan_absent");
    expect(await realSendGate(gateIn({ consent: "true" }))).toContain("coach_consent_for_this_plan_absent");
  });
  it("refs corrigées après simulation ⇒ empreintes obsolètes, resimulation exigée (aucun nouveau job silencieux)", async () => {
    const changed = await preparePlan(plan, refs({ exerciseIds: { ...EXERCISES, [`Fente arrière assistée${SFX}`]: "exf_SYNTHOTHER" } }), PV);
    const r = await realSendGate(gateIn({ prepared: changed }));
    expect(r).toContain("refs_changed_resimulation_required");
    expect(r).toContain("operations_changed_resimulation_required");
    expect(r).toContain("dry_run_job_not_matching");
  });
  it("ancienne simulation du corps NU (sans marqueur) ne valide pas le corps marqué", async () => {
    const bare = validReceipts(P).map((x) => ({ ...x, body_sha256: "0".repeat(64) }));
    expect((await realSendGate(gateIn({ receipts: bare }))).some((x) => x.startsWith("dry_run_not_validated_for_all_ops:75"))).toBe(true);
  });
  it("reçus : un manquant, mauvaise date, HTTP NULL, index permuté, refus présent ⇒ bloqué", async () => {
    const v = validReceipts(P);
    const cases: DryReceipt[][] = [
      v.slice(1),
      v.map((x, i) => i === 3 ? { ...x, session_date: "2000-01-01" } : x),
      v.map((x, i) => i === 3 ? { ...x, http_status: null } : x),
      v.map((x, i) => i === 0 ? { ...x, op_index: 1 } : i === 1 ? { ...x, op_index: 0 } : x),
      [...v, { ...v[0], outcome: "REFUSED", code: "forbidden_403", http_status: 403 }],
    ];
    for (const receipts of cases) expect((await realSendGate(gateIn({ receipts }))).length).toBeGreaterThan(0);
  });
  it("job d'un autre plan ou autre id ⇒ bloqué ; attestation d'un autre plan ⇒ bloqué", async () => {
    expect(await realSendGate(gateIn({ job: { ...gateIn().job!, plan_version_id: "55555555-5555-4555-8555-555555555555" } }))).toContain("dry_run_job_not_matching");
    expect(await realSendGate(gateIn({ expected: { ...gateIn().expected, jobId: "66666666-6666-4666-8666-666666666666" } }))).toContain("dry_run_job_not_matching");
    expect(await realSendGate(gateIn({ attestation: { planVersionId: PV, planSha256: "f".repeat(64), reviewer: "x" } }))).toContain("human_plan_attestation_absent");
  });
});

// ---- Journal + calendrier simulés ----
function memLedger() {
  const m = new Map<string, LedgerEntry>();
  const l: NolioV2Ledger = {
    async claim(e) { // même unicité que la base : op_key ET (plan_version_id, session_key, path)
      const ex = m.get(e.opKey) ?? [...m.values()].find((x) => x.planVersionId === e.planVersionId && x.sessionKey === e.sessionKey && x.path === e.path); if (ex) return { claimed: false, existing: { ...ex } }; m.set(e.opKey, { ...e }); return { claimed: true }; },
    async transition(k, from, to, patch) { const e = m.get(k); if (!e || e.state !== from) return false; m.set(k, { ...e, state: to, remoteId: patch.remoteId ?? e.remoteId, detail: patch.detail ?? e.detail }); return true; },
  };
  return { l, m };
}
function calendar() {
  const items: Array<Record<string, unknown>> = []; let n = 0;
  const posts: string[] = [];
  let mode: "ok" | "lose_next" | "429" | "403" = "ok";
  const http: NolioV2Http = {
    async post(path, body) {
      posts.push(path);
      if (mode === "429") return { kind: "response", status: 429, json: null };
      if (mode === "403") return { kind: "response", status: 403, json: null };
      const id = `${path.includes("competitions") ? "pcmp" : "ptrn"}_S${++n}`;
      items.push({ ...(body as Record<string, unknown>), id, _path: path });
      if (mode === "lose_next") { mode = "ok"; return { kind: "lost", detail: "timeout" }; }
      return { kind: "response", status: 201, json: { id } };
    },
    async listPage(path, _a, date) { return { ok: true, items: items.filter((i) => i._path === path && i.date_start === date).map(({ _path, ...x }) => x), hasMore: false }; },
    async getDetail(_p, id) { const it = items.find((i) => i.id === id); if (!it) return { ok: false, detail: "404" }; const { _path, ...x } = it; return { ok: true, item: x }; },
  };
  return { http, items, posts, set(m: typeof mode) { mode = m; } };
}
const send = (l: NolioV2Ledger, http: NolioV2Http) => sendPlannedV2({ connection: conn, refs: refs(), planVersionId: PV, operations: P.ops.map((o) => o.source), ledger: l, http, maxNewPosts: 8, stopOnRejected: true });

describe("envoi réel borné (HTTP injecté)", () => {
  it("lots de 8 jusqu'à 75/75, séances + compétition, aucune opération refaite, puis lecture exacte unique de chacune", async () => {
    const { l } = memLedger(); const c = calendar();
    let last; let calls = 0;
    do { last = await send(l, c.http); calls++; } while (last.status === "STOPPED_BATCH_LIMIT" && calls < 20);
    expect(last.status).toBe("DONE"); expect(calls).toBe(10);
    expect(c.posts.length).toBe(75);
    expect(c.posts.filter((p) => p.includes("competitions")).length).toBe(1);
    for (const o of P.ops) {
      const rc = await reconcileExact(c.http, o.source, "usr_SYNTH1", o.body, await originMarker(PV, o.source));
      expect(rc.kind).toBe("exact");
    }
    const again = await send(l, c.http); expect(again.status).toBe("DONE"); expect(c.posts.length).toBe(75);
  });
  it("double clic concurrent : une seule création par opération", async () => {
    const { l } = memLedger(); const c = calendar();
    await Promise.all([send(l, c.http), send(l, c.http)]);
    const keys = c.items.map((i) => `${i.date_start}|${i.name}|${i.description}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("ACK perdu : arrêt, aucun 2e POST ; reprise = réconciliation exacte par marqueur puis suite", async () => {
    const { l, m } = memLedger(); const c = calendar();
    c.set("lose_next");
    const r1 = await send(l, c.http); expect(r1.status).toBe("STOPPED_UNCONFIRMED"); expect(c.posts.length).toBe(1);
    const r2 = await send(l, c.http);
    expect(r2.results[0].state).toBe("confirmed"); // réconcilié, pas renvoyé
    expect(c.items.filter((i) => i.description === P.ops[0].body.description).length).toBe(1);
    expect([...m.values()].filter((e) => e.state === "confirmed").length).toBe(1 + 8);
  });
  it("ACK perdu et séance absente à la lecture : jamais de renvoi", async () => {
    const { l } = memLedger(); const c = calendar();
    c.set("lose_next"); await send(l, c.http); c.items.length = 0;
    const r = await send(l, c.http); expect(r.status).toBe("STOPPED_UNCONFIRMED"); expect(c.posts.length).toBe(1);
  });
  it("403 et 429 arrêtent le lot immédiatement", async () => {
    const a = calendar(); a.set("403"); expect((await send(memLedger().l, a.http)).status).toBe("STOPPED_AUTH"); expect(a.posts.length).toBe(1);
    const b = calendar(); b.set("429"); expect((await send(memLedger().l, b.http)).status).toBe("STOPPED_RATE_LIMITED"); expect(b.posts.length).toBe(1);
  });
  it("corps modifié après réservation (refs changées) ⇒ divergence du journal, aucun POST", async () => {
    const { l } = memLedger(); const c = calendar(); await send(l, c.http);
    const changed = await preparePlan(plan, refs({ sportIds: { ...SPORTS, run: "spt_SYNTHOTHER" } }), PV);
    const r = await sendPlannedV2({ connection: conn, refs: refs(), planVersionId: PV, operations: changed.ops.map((o) => o.source), ledger: l, http: c.http, maxNewPosts: 8, stopOnRejected: true });
    expect(r.status).toBe("BLOCKED"); expect(r.reason).toMatch(/^ledger_divergence:/); expect(c.posts.length).toBe(8);
  });
});

it('accepts only exact server-derived prescription authority and keeps all other gates',async()=>{
 const server={planVersionId:PV,planSha256:P.planSha256,releaseId:'a'.repeat(64)};
 const candidate={prescriptionAllowed:false,syntheticFixture:false};
 expect(await realSendGate(gateIn({provenance:candidate,serverPrescriptionAuthorization:server}))).toEqual([]);
 for(const change of [{planVersionId:'other'},{planSha256:'b'.repeat(64)},{releaseId:'invalid'}])expect(await realSendGate(gateIn({provenance:candidate,serverPrescriptionAuthorization:{...server,...change}}))).toContain('plan_not_prescription_allowed');
 expect(await realSendGate(gateIn({provenance:null,serverPrescriptionAuthorization:server}))).toContain('plan_not_prescription_allowed');
 expect(await realSendGate(gateIn({provenance:{...candidate,syntheticFixture:true},serverPrescriptionAuthorization:server}))).toContain('plan_is_synthetic_non_prescriptive');
 expect(await realSendGate(gateIn({provenance:candidate,serverPrescriptionAuthorization:server,attestation:null}))).toContain('human_plan_attestation_absent');
 expect(await realSendGate(gateIn({provenance:candidate,serverPrescriptionAuthorization:server,consent:false}))).toContain('coach_consent_for_this_plan_absent');
});

it('normal coach export uses the deliberate export consent without a fabricated QA review or sporting signature',async()=>{
 const provenance={engine:'det',mode:'app-profile',prescriptionAllowed:false,sportingAttestation:false,syntheticFixture:false};
 const coachExportBinding={planVersionId:PV,planSha256:P.planSha256};
 const normal=gateIn({provenance,attestation:null,coachExportBinding});expect(await realSendGate(normal)).toEqual([]);
 expect(await realSendGate({...normal,consent:false})).toContain('coach_consent_for_this_plan_absent');
 expect(await realSendGate({...normal,receipts:[]})).toContain('dry_run_not_validated_for_all_ops:'+P.ops.length);
 expect(await realSendGate({...normal,provenance:{...provenance,syntheticFixture:true}})).toContain('plan_is_synthetic_non_prescriptive');
 expect(await realSendGate({...normal,coachExportBinding:{...coachExportBinding,planSha256:'d'.repeat(64)}})).toContain('plan_not_prescription_allowed');
 expect(await realSendGate({...normal,provenance:{...provenance,mode:'synthetic-lab'}})).toContain('human_plan_attestation_absent');
 expect(provenance.prescriptionAllowed).toBe(false);expect(provenance.sportingAttestation).toBe(false);
});
