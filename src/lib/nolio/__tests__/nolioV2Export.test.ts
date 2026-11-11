import { NOLIO_V2_REQUIRED_SCOPES } from "../../../../supabase/functions/_shared/nolioV2/plannedClient";
import { describe, expect, it, vi } from "vitest";
import { mapAiSessionsToNolioV2, tfclSportKey } from "../../../../supabase/functions/_shared/nolioV2/aiTextMapper";
import { confirmedRowsForPlan, recreateMissingOperation, prepareExport, planEngine, verifyConfirmedBatch } from "../../../../supabase/functions/_shared/nolioV2/exportPlan";
import { autoSportIds, validateSportIds } from "../../../../supabase/functions/_shared/nolioV2/prodConnection";
import { appOriginFrom, returnLocation } from "../../../../supabase/functions/_shared/nolioV2/oauth";
import { mapTarget } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";
import type { NolioV2Refs } from "../../../../supabase/functions/_shared/nolioV2/plannedMapper";

const refs: NolioV2Refs = {
  synthetic: false, athleteId: "usr_abc123",
  sportIds: { run: "spt_run1", bike: "spt_bike1", swim: "spt_swim1", strength: "spt_str1" },
  exerciseIds: {}, competition: null, calendarTimeZone: null,
};
const VERSION = "11111111-2222-4333-8444-555555555555";

const aiPlan = {
  title: "Plan IA", _planStartDate: "2026-11-09", phases: [{ name: "Base", weeks: "1" }],
  _provenance: { engine: "ai" },
  weeks: [{
    weekNumber: 1, theme: "Base", phase: "Base",
    sessions: [
      { weekNumber: 1, dayIndex: 0, dayName: "lundi", sport: "Repos", title: "Repos", details: "", isRest: true },
      { weekNumber: 1, dayIndex: 1, dayName: "mardi", sport: "Course à pied", title: "Seuil 3×10 min", details: "Échauffement 15 min…", durationMin: 60, isRest: false },
      { weekNumber: 1, dayIndex: 2, dayName: "mercredi", sport: "Vélo", title: "Endurance", details: "Z2", durationMin: 90, isRest: false },
      { weekNumber: 1, dayIndex: 3, dayName: "jeudi", sport: "Course à pied", title: "Footing", details: "", isRest: false },
      { weekNumber: 1, dayIndex: 4, dayName: "vendredi", sport: "Aviron", title: "Ergo", details: "", durationMin: 40, isRest: false },
    ],
  }],
};

describe("Nolio V2 — export des plans IA", () => {
  it("reconnaît les sports des plans sans en inventer", () => {
    expect(tfclSportKey("Course à pied")).toBe("run");
    expect(tfclSportKey("Vélo")).toBe("bike");
    expect(tfclSportKey("Natation")).toBe("swim");
    expect(tfclSportKey("Renforcement")).toBe("strength");
    expect(tfclSportKey("Repos")).toBeNull();
    expect(tfclSportKey("Aviron")).toBeNull();
  });

  it("envoie chaque séance avec sa prescription complète et refuse explicitement le reste", async () => {
    expect(planEngine(aiPlan)).toBe("ai");
    const p = await prepareExport(aiPlan, refs, VERSION);
    expect(p.rows.map(r => r.status)).toEqual(["excluded_rest", "operation", "operation", "refused", "refused"]);
    expect(p.rows[3].reason).toBe("duration_unknown");
    expect(p.rows[4].reason).toBe("sport_unrecognized:Aviron");
    const run = p.ops[0];
    expect(run.body).toMatchObject({ name: "Seuil 3×10 min", date_start: "2026-11-10", sport: "spt_run1", athletes: ["usr_abc123"], duration: { value: 60, unit: "min" } });
    expect(String(run.body.description)).toContain("Échauffement 15 min");
    expect(String(run.body.description)).toMatch(/\[TFCLab [0-9a-f]{24}\]$/);
    expect(run.opKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produit des clés d'opération stables (aucune recréation au renvoi)", async () => {
    const a = await prepareExport(aiPlan, refs, VERSION);
    const b = await prepareExport(structuredClone(aiPlan), refs, VERSION);
    expect(b.ops.map(o => o.opKey)).toEqual(a.ops.map(o => o.opKey));
  });

  it("refuse un athlète Nolio non opaque", () => {
    const r = mapAiSessionsToNolioV2([], { ...refs, athleteId: "42" });
    expect(r.refusals[0].reason).toBe("athlete_reference_not_opaque");
  });
});

describe("Nolio V2 — cibles d'allure", () => {
  it("transmet des allures m:ss entières, bornes ordonnées", () => {
    const notes: string[] = [];
    const t = mapTarget({ metric: "sec_per_km", min: 233, max: 247.4 }, notes, { paceTargets: true, sport: "run" });
    expect(t).toEqual({ type: "raw", value: "3:53", value_max: "4:07", unit: "/km" });
  });
});

describe("Nolio V2 — association des sports de l'athlète", () => {
  const sports = [
    { id: "spu_1", sport: "spt_run1", name: "Course à pied", isActive: true, structuredEnabled: true },
    { id: "spu_2", sport: "spt_trail", name: "Trail", isActive: true, structuredEnabled: true },
    { id: "spu_3", sport: "spt_bike1", name: "Vélo route", isActive: true, structuredEnabled: true },
    { id: "spu_4", sport: "spt_swim1", name: "Natation", isActive: false, structuredEnabled: true },
    { id: "spu_5", sport: "spt_tri", name: "Triathlon", isActive: true, structuredEnabled: false },
  ];
  it("associe par nom parmi les sports actifs structurés, jamais un sport inactif", () => {
    expect(autoSportIds(sports)).toEqual({ run: "spt_run1", bike: "spt_bike1", brick: "spt_tri" });
  });
  it("valide un choix du coach contre les sports réellement lus", () => {
    expect(validateSportIds(sports, { run: "spt_trail" })).toEqual({ ok: true, sportIds: { run: "spt_trail" } });
    expect(validateSportIds(sports, { swim: "spt_swim1" })).toMatchObject({ ok: false });
    expect(validateSportIds(sports, { kayak: "spt_run1" })).toMatchObject({ ok: false });
  });
});

describe("Nolio V2 — retour OAuth", () => {
  it("redirige uniquement vers une origine https de l'app", () => {
    expect(appOriginFrom(undefined)).toBe("https://tfclab.lovable.app");
    expect(appOriginFrom("http://evil.example")).toBe("https://tfclab.lovable.app");
    expect(appOriginFrom("https://app.example.com/path")).toBe("https://tfclab.lovable.app");
    expect(returnLocation("https://app.example.com", "connected")).toBe("https://app.example.com/planning/ai-plan?nolio_v2=connected");
  });
});

describe("Nolio V2 — bilan relu dans le calendrier (jamais déduit du seul journal)", () => {
  it("distingue présente, supprimée (404) et non vérifiable, et ignore les opérations d'un autre contenu", async () => {
    const p = await prepareExport(aiPlan, refs, VERSION);
    const [a, b] = p.ops;
    const rows = [
      { op_key: a.opKey, session_key: a.sessionKey, path: a.source.path, state: "confirmed", remote_id: "ptrn_A1" },
      { op_key: b.opKey, session_key: b.sessionKey, path: b.source.path, state: "confirmed", remote_id: "ptrn_B1" },
      { op_key: "f".repeat(64), session_key: "S9-J0-0", path: a.source.path, state: "confirmed", remote_id: "ptrn_OLD" },
      { op_key: "e".repeat(64), session_key: a.sessionKey, path: a.source.path, state: "sent_unconfirmed", remote_id: null },
    ];
    const confirmed = confirmedRowsForPlan(p, rows);
    expect(confirmed.map(r => r.remote_id)).toEqual(["ptrn_A1", "ptrn_B1"]);
    const http = {
      post: async () => ({ kind: "lost" as const, detail: "unused" }),
      listPage: async () => ({ ok: false as const, detail: "unused" }),
      getDetail: async (_path: string, id: string) => id === "ptrn_A1" ? { ok: true as const, item: { ...a.body, id } } : { ok: false as const, detail: "http_404" },
    };
    const matches:import('../../../../supabase/functions/_shared/nolioV2/exportPlan').MatchedReadback[]=[];
    const v = await verifyConfirmedBatch({ prepared: p, confirmed, http, athleteRef: refs.athleteId, fromIndex: 0, deadline: Date.now() + 60_000, onMatched:row=>matches.push(row) });
    expect(matches).toEqual([{opKey:a.opKey,sessionKey:a.sessionKey,path:a.source.path,date:p.rows.find(r=>r.sessionKey===a.sessionKey)?.date??null,sentId:"ptrn_A1",readId:"ptrn_A1"}]);
    const otherId={...http,getDetail:async()=>({ok:true as const,item:{...a.body,id:"ptrn_OTHER"}})};
    const mismatch=await verifyConfirmedBatch({prepared:p,confirmed:[rows[0]],http:otherId,athleteRef:refs.athleteId,fromIndex:0,deadline:Date.now()+60_000,onMatched:row=>matches.push(row)});
    expect(mismatch.present).toBe(0);
    expect(matches).toHaveLength(1);
    expect(v.present).toBe(1);
    expect(v.missing.map(m => m.title)).toEqual(["Endurance"]);
    expect(v.nextIndex).toBeNull();
    const edited = { ...http, getDetail: async () => ({ok: true as const, item: { ...a.body, id: "ptrn_A1", date_start: "2026-11-11" }}) };
    const changed = await verifyConfirmedBatch({ prepared: p, confirmed: [rows[0]], http: edited, athleteRef: refs.athleteId, fromIndex: 0, deadline: Date.now()+60000 });
    expect(changed.present).toBe(0);
    expect(changed.unknown[0].detail).toBe("prescription_changed");
    const failing = { ...http, getDetail: async () => ({ ok: false as const, detail: "http_500" }) };
    const u = await verifyConfirmedBatch({ prepared: p, confirmed, http: failing, athleteRef: refs.athleteId, fromIndex: 0, deadline: Date.now() + 60_000 });
    expect(u.present).toBe(0);
    expect(u.missing).toEqual([]);
    expect(u.unknown.length).toBe(2);
  });

  it("compte les séances attendues hors repos, refusées comprises", async () => {
    const p = await prepareExport(aiPlan, refs, VERSION);
    const expected = p.rows.filter(r => r.status !== "excluded_rest").length;
    expect(expected).toBe(4);
    expect(p.ops.length).toBe(2);
  });
});

describe("recréation ciblée pendant un export partiel", () => {
  it("restaure seulement la cible, après un 404 et une simulation valide", async () => {
    const prepared = await prepareExport(aiPlan, refs, VERSION);
    const [missing, unsent] = prepared.ops;
    const target = { opKey: missing.opKey, remoteId: "ptrn_old" };
    const row = { op_key: missing.opKey, remote_id: target.remoteId, path: missing.source.path,
      session_key: missing.sessionKey, state: "confirmed" };
    const release = vi.fn(async () => true);
    const post = vi.fn(async () => ({kind: "response" as const, status: 201, json: {id:"ptrn_new"}}));
    const dryFetch = vi.fn(async () => new Response(JSON.stringify({dry_run:true,is_valid:true,summary:"valid"}),{status:201}));
    const args = {
      prepared, refs, planVersionId:VERSION, batchSize:6, deadline:Date.now()+60000, confirmedKeys:new Set<string>(),
      connection:{mode:"test-mock" as const,apiVersion:"v2" as const,grantedScopes:[...NOLIO_V2_REQUIRED_SCOPES]},
      accessToken:"synthetic", dryFetch, http:{ getDetail:async () => ({ok:false as const,detail:"http_404"}),
        listPage:async () => ({ok:false as const,detail:"unused"}),post },
      ledger:{claim:async () => ({claimed:true as const}),transition:async () => true},
    };
    for (const invalid of [{...target,opKey:unsent.opKey},{...target,remoteId:"ptrn_stale"}]) {
      expect((await recreateMissingOperation(args,invalid,[row],release)).status).toBe("REFUSED");
    }
    dryFetch.mockResolvedValueOnce(new Response("{}",{status:400}));
    expect((await recreateMissingOperation(args,target,[row],release)).status).toBe("STOPPED");
    expect(release).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect((await recreateMissingOperation(args,target,[row],release)).status).toBe("DONE");
    expect(release).toHaveBeenCalledExactlyOnceWith(row);
    expect(post).toHaveBeenCalledExactlyOnceWith(missing.source.path,missing.body);
  });
});
