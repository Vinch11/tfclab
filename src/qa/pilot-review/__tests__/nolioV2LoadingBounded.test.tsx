import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { fetchRemoteRefs, SPORTS_BUDGET_MS, EXERCISES_BUDGET_MS, REFS_TOTAL_BUDGET_MS } from "../../../../supabase/functions/_shared/nolioV2/refs";
import type { FetchLike } from "../../../../supabase/functions/_shared/nolioV2/httpFetch";
import { createV2Runner, describeOutcome, NOLIO_LOAD_REFS_CLIENT_MS } from "../boundedV2Action";
import { NolioV2ProgressPanel, type V2StatusView } from "../NolioV2ProgressPanel";

const SCOPES = ["planned:read", "planned:write", "library:read"];
const S1 = { id: "spu_1", sport: "spt_RUN", name: "Course", is_active: true, is_structured_workout_enabled: true };
const sportPage = (d: unknown[], more = false) => JSON.stringify({ data: d, has_more: more });
const never = <T,>() => new Promise<T>(() => {});
const ok = (body: string) => ({ status: 200, text: () => Promise.resolve(body) });

afterEach(() => { vi.useRealTimers(); });

describe("refs : budget global serveur", () => {
  it("budgets serveur < budget client", () => { expect(REFS_TOTAL_BUDGET_MS).toBeLessThan(NOLIO_LOAD_REFS_CLIENT_MS); });

  it("fetch qui ne répond jamais ⇒ sports_read_timeout, fin bornée", async () => {
    vi.useFakeTimers();
    const f: FetchLike = () => never();
    const p = fetchRemoteRefs({ fetch: f, accessToken: "AT", athleteRef: "usr_T1", scopes: SCOPES });
    await vi.advanceTimersByTimeAsync(SPORTS_BUDGET_MS + 1);
    expect(await p).toEqual({ ok: false, reason: "sports_read_timeout" });
  });

  it("corps qui ne se résout jamais (abort ignoré) ⇒ timeout", async () => {
    vi.useFakeTimers();
    const f: FetchLike = async () => ({ status: 200, text: () => never<string>() });
    const p = fetchRemoteRefs({ fetch: f, accessToken: "AT", athleteRef: "usr_T1", scopes: SCOPES });
    await vi.advanceTimersByTimeAsync(SPORTS_BUDGET_MS + 1);
    expect(await p).toEqual({ ok: false, reason: "sports_read_timeout" });
  });

  it("plusieurs pages lentes : budget TOTAL, pas par page", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const f: FetchLike = () => { calls++; return new Promise((r) => setTimeout(() => r(ok(sportPage([{ ...S1, id: `spu_${calls}` }], true))), 5000)); };
    const p = fetchRemoteRefs({ fetch: f, accessToken: "AT", athleteRef: "usr_T1", scopes: SCOPES });
    await vi.advanceTimersByTimeAsync(SPORTS_BUDGET_MS + 1);
    expect(await p).toEqual({ ok: false, reason: "sports_read_timeout" });
    expect(calls).toBe(3); // 3 pages × 5 s > 12 s : pas 10 pages × 15 s
  });

  it("sports valides + bibliothèque lente ⇒ sports renvoyés, exercices timeout (force bloquée)", async () => {
    vi.useFakeTimers();
    const f: FetchLike = async (u) => (u.includes("/settings/sports/") ? ok(sportPage([S1])) : never());
    const p = fetchRemoteRefs({ fetch: f, accessToken: "AT", athleteRef: "usr_T1", scopes: SCOPES });
    await vi.advanceTimersByTimeAsync(EXERCISES_BUDGET_MS + 1);
    const r = await p;
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.refs.sports.map((s) => s.sport)).toEqual(["spt_RUN"]); expect(r.refs.exercises).toEqual({ status: "timeout", items: [] }); }
  });
});

describe("runner client borné", () => {
  it("invoke qui rejette ⇒ erreur lisible, verrou libéré", async () => {
    const r = createV2Runner();
    const o = await r.run(1000, async () => { throw new Error("réseau coupé"); });
    expect(o).toEqual({ kind: "error", message: "réseau coupé" });
    expect(r.isLocked()).toBe(false);
  });

  it("invoke qui ne répond jamais ⇒ timeout, signal abort, verrou libéré", async () => {
    vi.useFakeTimers();
    const r = createV2Runner(); let sig: AbortSignal | null = null;
    const p = r.run<Record<string, unknown> | null>(NOLIO_LOAD_REFS_CLIENT_MS, (s) => { sig = s; return never(); });
    await vi.advanceTimersByTimeAsync(NOLIO_LOAD_REFS_CLIENT_MS + 1);
    const o = await p;
    expect(o.kind).toBe("timeout"); expect(sig!.aborted).toBe(true); expect(r.isLocked()).toBe(false);
    expect(describeOutcome("load_refs", o)).toContain("délai dépassé (45 s)");
  });

  it("double clic ⇒ une seule requête", async () => {
    const r = createV2Runner(); const fn = vi.fn(() => Promise.resolve(1));
    const [a, b] = await Promise.all([r.run(1000, fn), r.run(1000, fn)]);
    expect(fn).toHaveBeenCalledTimes(1); expect(a.kind).toBe("ok"); expect(b.kind).toBe("busy");
  });

  it("réponse tardive après changement d'identité ⇒ stale (ignorée)", async () => {
    const r = createV2Runner(); let resolve!: (v: number) => void;
    const p = r.run(10_000, () => new Promise<number>((res) => { resolve = res; }));
    await Promise.resolve(); await Promise.resolve(); r.invalidate(); resolve(42);
    expect((await p).kind).toBe("stale");
    expect(describeOutcome("status", { kind: "stale" })).toBeNull();
  });
});

const view: V2StatusView = {
  stages: { configured: true, authorized: true, testAthleteSelected: true, refsLoaded: false, refsConfirmed: false, readyForTrial: false },
  grant: { status: "pending_refs", generation: 1, remoteRefs: null },
} as unknown as V2StatusView;

describe("panneau : clic Charger les sports", () => {
  it("un seul appel par double clic, message et relecture en échec visibles (page simulée)", async () => {
    const r = createV2Runner(); const invoke = vi.fn(() => Promise.resolve({ status: "REFS_LOADED", sports: 3, usableSports: 2, exercises: "timeout" }));
    const msgs: string[] = [];
    const actFn = async (body: Record<string, unknown>) => {
      const o = await r.run(1000, () => invoke());
      const m = describeOutcome(String(body.action), o); if (m) msgs.push(m);
      if (o.kind !== "ok") return;
      const rb = await r.run(1000, async () => { throw new Error("relecture KO"); });
      const rm = describeOutcome("status", rb); if (rm) msgs.push(`Relecture de l'état non obtenue : ${rm}`);
    };
    render(<NolioV2ProgressPanel status={view} busy={false} ready identityKey="A|x" planSports={["run"]} exerciseLabels={[]} act={actFn} />);
    const btn = screen.getByRole("button", { name: "Charger les sports Nolio" });
    await act(async () => { fireEvent.click(btn); fireEvent.click(btn); });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(msgs[0]).toContain("3 sports lus (2 associables)");
    expect(msgs[0]).toContain("NON chargés (timeout) — force bloquée");
    expect(msgs[1]).toContain("relecture KO");
  });
});
