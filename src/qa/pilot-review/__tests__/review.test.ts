import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  REVIEW_CRITERIA, buildReviewRow, domainSecondsOf, emptyDraft, nolioOfflinePreview, planSha256, submitReview,
  weekSummaries, missingSessionFields, planEngineBinding, readbackMismatches, DECISION_LABELS, type ReviewDb, type ReviewSubject,
} from "../review";
import { sessionsFromPlanJson } from "../../../../supabase/functions/_shared/nolioV2/planSessions";
import { PLAN_PROVENANCE_SCHEMA } from "@/lib/plan/planProvenance";

const HASH = "e".repeat(64); const REL = "f".repeat(64);
const prov = { schema: PLAN_PROVENANCE_SCHEMA, engine: "det", engineVersion: HASH, releaseId: REL, mode: "synthetic-lab", scenarioId: "s1", scenarioInput: {},
  syntheticFixture: true, fixtureApprovalsAppliedToAthlete: false, prescriptionAllowed: false, sportingAttestation: false, generatedAt: "2026-11-03T00:00:00Z", result: { status: "candidate", constraintsSatisfied: true, nodes: 2 } };
const plan = { title: "QA", _qaFixture: true, _qaNonPrescriptive: true, _planStartDate: "2026-10-26", _provenance: prov,
  weeks: [{ weekNumber: 1, phase: "base", theme: "taper", sessions: [
    { dayIndex: 1, sport: "run", title: "X", durationMin: 20, catalogId: "V3P_RUN_1", isRest: false,
      detStructuredWorkout: { schema: "det-structured-workout-v1", sourceId: "V3P_RUN_1", sport: "run", chosenDurationMin: 20, exactSeconds: 1200, nodes: [
        { kind: "step", role: "warmup", label: "w", domain: "recovery", dose: { seconds: 300 }, target: null },
        { kind: "repeat", label: "r", count: 3, betweenSec: 60, restAfterLast: false, steps: [{ kind: "step", role: "main", label: "m", domain: "mlss", dose: { seconds: 240 }, target: null }] },
      ] }, coachStart: { localDate: "2026-10-27", localTime: "07:30", timeZone: "Europe/Paris" } },
    { dayIndex: 2, isRest: true },
  ] }] };
const subj = async (p: unknown = plan): Promise<ReviewSubject> => ({ sourceKind: "scenario", scenarioId: "s1", planVersionId: null, planSha256: await planSha256(p), engineComponentHash: HASH, releaseId: REL });
const echoDb = (alter: (r: Record<string, unknown>) => Record<string, unknown> = (r) => r, spy = vi.fn()): ReviewDb => ({ from: () => ({ insert: (row: Record<string, unknown>) => { spy(row); return { select: () => ({ maybeSingle: async () => ({ data: { id: "id1", ...alter(JSON.parse(JSON.stringify(row))) }, error: null }) }) }; } }) });
const okDb = (spy = vi.fn()): ReviewDb => echoDb((r) => r, spy);
const who = async () => ({ coachId: "c", athleteId: "a" });

describe("pilot review", () => {
  it("defaults every criterion unanswered and refuses an empty submission", async () => {
    const d = emptyDraft();
    expect(REVIEW_CRITERIA.every((c) => d[c.code].decision === null)).toBe(true);
    const r = buildReviewRow({ coachId: "c", athleteId: "a", subject: await subj(), draft: d, now: "t" });
    expect(r).toEqual({ ok: false, reason: "aucune_reponse_explicite" });
  });
  it("never grants attestation/prescription/qualification/release/Nolio", async () => {
    const d = emptyDraft(); d.overall.decision = "acceptable_for_QA";
    const r = buildReviewRow({ coachId: "c", athleteId: "a", subject: await subj(), draft: d, now: "t" });
    expect(r.ok && r.row.report).toMatchObject({ sportingAttestation: false, prescriptionAllowed: false, sourceQualification: false, release: false, nolioSend: false });
  });
  it("hash ignores generatedAt only; a dose change changes it", async () => {
    const a = await planSha256(plan);
    expect(await planSha256({ ...plan, _provenance: { ...plan._provenance, generatedAt: "other" } })).toBe(a);
    const changed = JSON.parse(JSON.stringify(plan)); changed.weeks[0].sessions[0].durationMin = 21;
    expect(await planSha256(changed)).not.toBe(a);
  });
  it("plan changed after draft => STALE, no insert", async () => {
    const spy = vi.fn(); const d = emptyDraft(); d.overall.decision = "undecided";
    const changed = JSON.parse(JSON.stringify(plan)); changed.weeks[0].sessions[0].title = "Y";
    const r = await submitReview({ db: okDb(spy), recheck: who, currentPlan: changed, subject: await subj(), draft: d });
    expect(r.status).toBe("STALE"); expect(spy).not.toHaveBeenCalled();
  });
  it("identity recheck failure => REFUSED, no insert", async () => {
    const spy = vi.fn(); const d = emptyDraft(); d.overall.decision = "changes_required";
    const r = await submitReview({ db: okDb(spy), recheck: async () => null, currentPlan: plan, subject: await subj(), draft: d });
    expect(r.status).toBe("REFUSED"); expect(spy).not.toHaveBeenCalled();
  });
  it("confirmed only when read-back matches; mismatched read-back => UNKNOWN", async () => {
    const d = emptyDraft(); d.recoveries.decision = "changes_required";
    expect((await submitReview({ db: okDb(), recheck: who, currentPlan: plan, subject: await subj(), draft: d })).status).toBe("CONFIRMED");
    for (const alter of [(r: Record<string, unknown>) => ({ ...r, athlete_id: "other" }), (r: Record<string, unknown>) => ({ ...r, release_id: null }),
      (r: Record<string, unknown>) => ({ ...r, decisions: { ...(r.decisions as object), overall: { decision: "acceptable_for_QA", comment: "" } } }),
      (r: Record<string, unknown>) => ({ ...r, report: { ...(r.report as object), prescriptionAllowed: true } })]) {
      const res = await submitReview({ db: echoDb(alter), recheck: who, currentPlan: plan, subject: await subj(), draft: d });
      expect(res.status).toBe("UNKNOWN");
    }
    expect(readbackMismatches({ a: 1 } as never, { a: 2 } as never)).toEqual(["a"]);
  });
  it("domain minutes come only from structure (repeats × count, inter-rest separated)", () => {
    const acc = domainSecondsOf(plan.weeks[0].sessions[0].detStructuredWorkout!.nodes as never);
    expect(acc).toEqual({ recovery: 300, mlss: 720, "récup. inter-répétitions (domaine non renseigné)": 120 });
    const w = weekSummaries(plan)[0];
    expect(w).toMatchObject({ sessions: 1, plannedMin: 20, recoveryLabel: "taper", unstructured: 0 });
    expect(missingSessionFields(plan.weeks[0].sessions[0] as never)).toEqual([]);
    expect(missingSessionFields({ ...plan.weeks[0].sessions[0], coachStart: undefined } as never)).toEqual(["horaire (non fixé par le plan)"]);
  });
  it("Nolio preview is BLOCKED with zero requests and does not call fetch", () => {
    const f = vi.spyOn(globalThis, "fetch");
    const n = nolioOfflinePreview(plan);
    expect(n.status).toBe("BLOCKED_CONNECTION_NOT_CONFIGURED"); expect(n.requestsSent).toBe(0);
    expect(f).not.toHaveBeenCalled(); f.mockRestore();
  });
  it("Nolio preview input = real sender extraction (keys S{w}-J{d}-{i}, saved start, coachStart kept)", () => {
    const ex = sessionsFromPlanJson(plan);
    expect(ex.problems).toEqual([]);
    expect(ex.sessions[0]).toMatchObject({ sessionKey: "S1-J1-0", date: "2026-10-27", coachStart: { localTime: "07:30" } });
    const n = nolioOfflinePreview(plan);
    expect(n.extractionProblems).toEqual([]);
    const keys = [...n.map!.operations.map((o) => o.sessionKey), ...n.map!.refusals.map((r) => r.sessionKey)];
    expect(keys.every((k) => ex.sessions.some((s) => s.sessionKey === k))).toBe(true);
  });
  it("Nolio preview refuses mapping on missing start or invalid week/day (no default filling)", () => {
    const noStart = { ...plan, _planStartDate: undefined };
    expect(nolioOfflinePreview(noStart)).toMatchObject({ map: null, extractionProblems: ["plan_start_date_absent_or_invalid"] });
    const badDay = JSON.parse(JSON.stringify(plan)); delete badDay.weeks[0].sessions[0].dayIndex;
    const r = nolioOfflinePreview(badDay);
    expect(r.map).toBeNull(); expect(r.extractionProblems[0]).toMatch(/week_or_day_invalid/);
    const badWeek = JSON.parse(JSON.stringify(plan)); delete badWeek.weeks[0].weekNumber;
    expect(nolioOfflinePreview(badWeek).map).toBeNull();
  });
  it("binds to the plan's own generating engine; unknown/malformed refused; scenario must match loaded engine", () => {
    expect(planEngineBinding(plan)).toEqual({ ok: true, engineVersion: HASH, releaseId: REL });
    expect(planEngineBinding({ ...plan, _provenance: undefined }).ok).toBe(false);
    expect(planEngineBinding({ ...plan, _provenance: { ...prov, engineVersion: "zz" } }).ok).toBe(false);
    expect(planEngineBinding({ ...plan, _provenance: { ...prov, releaseId: "bad" } }).ok).toBe(false);
    expect(planEngineBinding(plan, "a".repeat(64))).toEqual({ ok: false, reason: "moteur_du_plan_different_du_moteur_charge" });
  });
  it("old owned version reviewed with CURRENT engine label => STALE, no insert; own provenance => CONFIRMED", async () => {
    const d = emptyDraft(); d.overall.decision = "undecided";
    const owned = { ...(await subj()), sourceKind: "owned_version" as const, scenarioId: null, planVersionId: "v1" };
    const spy = vi.fn();
    const relabeled = await submitReview({ db: okDb(spy), recheck: who, currentPlan: plan, subject: { ...owned, engineComponentHash: "a".repeat(64) }, draft: d });
    expect(relabeled.status).toBe("STALE"); expect(spy).not.toHaveBeenCalled();
    const noProv = { ...plan, _provenance: undefined };
    expect((await submitReview({ db: okDb(spy), recheck: who, currentPlan: noProv, subject: { ...owned, planSha256: await planSha256(noProv) }, draft: d })).status).toBe("REFUSED");
    expect(spy).not.toHaveBeenCalled();
    expect((await submitReview({ db: okDb(), recheck: who, currentPlan: plan, subject: owned, draft: d })).status).toBe("CONFIRMED");
  });
  it("French labels map to unchanged stored enums", () => {
    expect(DECISION_LABELS).toEqual({ acceptable_for_QA: "Acceptable en QA", changes_required: "À corriger", undecided: "Je ne sais pas" });
  });
  it("SQL table is append-only owner-only and forbids granting flags", () => {
    const sql = readFileSync("drizzle/migrations/0007_qa_pilot_review_reports.sql", "utf8");
    expect(sql).toMatch(/GRANT SELECT, INSERT ON public\.qa_pilot_review_reports TO authenticated;/);
    expect(sql).not.toMatch(/GRANT[^;]*(UPDATE|DELETE)[^;]*TO authenticated/);
    expect(sql).not.toMatch(/FOR (UPDATE|DELETE|ALL)/);
    expect(sql).toMatch(/report->>'prescriptionAllowed','false'\) = 'false'/);
    expect(sql).toMatch(/coach_id = auth\.uid\(\)/);
  });
  it("version binding policy is qualified to the outer row (no v.athlete_id = v.athlete_id tautology)", () => {
    const sql = readFileSync("drizzle/migrations/0008_qa_pilot_review_fix_version_binding.sql", "utf8");
    expect(sql).toMatch(/v\.athlete_id = qa_pilot_review_reports\.athlete_id/);
    expect(sql).toMatch(/v\.coach_id = qa_pilot_review_reports\.coach_id/);
    expect(sql).toMatch(/a\.id = qa_pilot_review_reports\.athlete_id/);
    expect(sql).not.toMatch(/v\.athlete_id = athlete_id\b/);
    expect(sql).not.toMatch(/GRANT|FOR (UPDATE|DELETE|ALL)/);
  });
  it("grants narrowed to SELECT/INSERT authenticated, nothing to anon (no TRUNCATE/UPDATE/DELETE)", () => {
    const sql = readFileSync("drizzle/migrations/0009_qa_reports_narrow_grants.sql", "utf8");
    expect(sql).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.qa_pilot_review_reports, public\.qa_coach_recipe_reports FROM anon, authenticated;/);
    expect(sql).toMatch(/GRANT SELECT, INSERT ON TABLE public\.qa_pilot_review_reports, public\.qa_coach_recipe_reports TO authenticated;/);
    expect(sql).not.toMatch(/GRANT[^;]*(UPDATE|DELETE|TRUNCATE|ALL)[^;]*;/);
    expect(sql).not.toMatch(/TO anon/);
  });
});
