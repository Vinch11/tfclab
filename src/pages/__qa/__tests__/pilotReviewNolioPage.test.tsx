/**
 * Vraie page /__qa/pilot-review rendue avec un client Supabase SIMULÉ (aucun réseau, aucune
 * session réelle, aucun appel Nolio). Couvre premier clic (who=null), lien start sans 2e clic,
 * expiration pendant la garde, vrai changement A→B, séquence load_refs+relecture 45 s.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const A = { uid: "573e045a-bbea-4e37-a30f-33183b9fbe13", athleteId: "c155204f-43e2-4367-9b66-6d068ef89212" };
const B = { uid: "6b4c1722-2105-4889-ab14-41bab798cdf7", athleteId: "9758ace0-da71-4200-87bf-04e74bbb4ed9" };

type Deferred<T> = { p: Promise<T>; resolve: (v: T) => void };
const deferred = <T,>(): Deferred<T> => { let resolve!: (v: T) => void; const p = new Promise<T>((r) => { resolve = r; }); return { p, resolve }; };

const m = vi.hoisted(() => ({
  user: { id: "" } as { id: string },
  authCbs: [] as ((ev: string, s: unknown) => void)[],
  sessionDelay: 0, userDelay: 0, athleteDelay: 0,
  receipt: null as unknown,
  invoke: null as unknown as import("vitest").Mock<(...a: unknown[]) => unknown>,
}));
const later = <T,>(ms: number, v: () => T) => (ms ? new Promise<T>((r) => setTimeout(() => r(v()), ms)) : Promise.resolve(v()));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => later(m.sessionDelay, () => ({ data: { session: { user: { id: m.user.id } } }, error: null })),
      getUser: () => later(m.userDelay, () => ({ data: { user: { id: m.user.id } }, error: null })),
      onAuthStateChange: (cb: (ev: string, s: unknown) => void) => { m.authCbs.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
    },
    from: (t: string) => ({ select: () => ({ eq: (_c: string, id: string) => {
      const q = { eq: () => q, maybeSingle: () => t === "qa_nolio_v2_dry_run_receipts" ? Promise.resolve({ data: m.receipt, error: null }) : later(m.athleteDelay, () => ({ data: { id, coach_id: m.user.id }, error: null })) };
      return q; } }) }),
    functions: { invoke: (...a: unknown[]) => m.invoke(...a) },
  },
}));

import PilotReviewPage from "@/pages/__qa/PilotReviewPage";

const STAGES = { configured: true, authorized: true, testAthleteSelected: true, refsLoaded: false, refsConfirmed: false, readyForTrial: false, realDryRunOrSendProof: "ABSENT" };
const statusResp = () => ({ data: { status: "OK", stages: STAGES, grant: { status: "pending_refs", appType: "team", scopes: ["planned:read"], allowedAthletes: [], tokenExpiresAt: "2026-11-04T00:00:00Z", tokenExpired: false, generation: 1, selectedAthleteRef: null, remoteRefs: null } }, error: null });
const SYNTH_URL = "https://www.nolio.io/api/authorize/?client_id=SYNTH&state=SYNTHSTATE&code_challenge=c&code_challenge_method=S256";

const mount = async () => { render(<MemoryRouter><PilotReviewPage /></MemoryRouter>); await act(async () => { await vi.advanceTimersByTimeAsync(0); }); };
const statusBtn = () => screen.getByRole("button", { name: "Vérifier l'état de connexion Nolio V2" });
const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("VITE_SUPABASE_URL", "https://lkjesdacgpolrwfxulbo.supabase.co");
  m.user = { id: A.uid }; m.sessionDelay = 0; m.userDelay = 0; m.athleteDelay = 0; m.authCbs = [];
  m.invoke = vi.fn();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("PilotReviewPage — Nolio V2 (page réelle, client simulé)", () => {
  it("who=null au montage : premier clic status ⇒ 1 invoke et étapes affichées", async () => {
    m.invoke.mockImplementation(() => Promise.resolve(statusResp()));
    await mount();
    fireEvent.click(statusBtn());
    await flush();
    expect(m.invoke).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("stage-testAthleteSelected").textContent).toContain("oui");
  });

  it("premier clic start ⇒ lien copiable sans second clic (clé = identité du résultat)", async () => {
    m.invoke.mockImplementation(() => Promise.resolve({ data: { status: "REDIRECT", authorizeUrl: SYNTH_URL }, error: null }));
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "1. Préparer la connexion Nolio V2 (QA)" }));
    await flush();
    expect(m.invoke).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Copier le lien de connexion" })).toBeTruthy();
    expect(screen.queryByText(/url_autorisation_invalide/)).toBeNull();
  });

  it("expiration pendant la garde : réponse tardive n'invoque PAS le backend et ne change pas l'identité", async () => {
    await mount();
    m.sessionDelay = 7000; m.userDelay = 7000; m.athleteDelay = 7000; // 21 s > 20 s
    fireEvent.click(statusBtn());
    await flush(20_001);
    expect(screen.getByTestId("nolio-v2-msg").textContent).toContain("délai dépassé (20 s)");
    await flush(2000);
    expect(m.invoke).not.toHaveBeenCalled();
    expect(statusBtn().hasAttribute("disabled")).toBe(false);
  });

  it("vrai changement A→B : invalidation, la réponse tardive de A ne mute pas la page", async () => {
    m.invoke.mockImplementationOnce(() => Promise.resolve(statusResp()));
    await mount();
    fireEvent.click(statusBtn()); await flush();
    expect(screen.getByTestId("nolio-v2-progress")).toBeTruthy();
    const late = deferred<unknown>(); m.invoke.mockImplementationOnce(() => late.p);
    fireEvent.click(statusBtn()); await flush();
    m.user = { id: B.uid };
    await act(async () => { for (const cb of m.authCbs) { cb("SIGNED_IN", { user: { id: A.uid } }); cb("SIGNED_IN", { user: { id: B.uid } }); } });
    expect(screen.queryByTestId("nolio-v2-progress")).toBeNull();
    await act(async () => { late.resolve(statusResp()); await vi.advanceTimersByTimeAsync(0); });
    expect(screen.queryByTestId("nolio-v2-progress")).toBeNull();
    expect(screen.queryByTestId("nolio-v2-msg")).toBeNull();
  });

  it("A→B puis PREMIER status sous B : état B persiste, pas de 2e clic ni ré-invalidation", async () => {
    m.invoke.mockImplementation(() => Promise.resolve(statusResp()));
    await mount();
    fireEvent.click(statusBtn()); await flush();
    expect(screen.getByTestId("nolio-v2-progress")).toBeTruthy();
    m.user = { id: B.uid };
    await act(async () => { for (const cb of m.authCbs) { cb("SIGNED_IN", { user: { id: A.uid } }); cb("SIGNED_IN", { user: { id: B.uid } }); } await vi.advanceTimersByTimeAsync(0); });
    expect(screen.queryByTestId("nolio-v2-progress")).toBeNull();
    expect(screen.queryByText(/Session : Coach A/)).toBeNull();
    expect(screen.getByText(/Session : Coach B/)).toBeTruthy();
    m.invoke.mockClear();
    fireEvent.click(statusBtn()); await flush();
    expect(m.invoke).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("nolio-v2-progress")).toBeTruthy();
    await flush(1000);
    expect(screen.getByTestId("stage-testAthleteSelected").textContent).toContain("oui");
    expect(m.invoke).toHaveBeenCalledTimes(1);
  });

  it("déconnexion : invalidation, plus de « Session : Coach A », contrôles bloqués sans appel", async () => {
    m.invoke.mockImplementation(() => Promise.resolve(statusResp()));
    await mount();
    fireEvent.click(statusBtn()); await flush();
    await act(async () => { for (const cb of m.authCbs) cb("SIGNED_OUT", null); await vi.advanceTimersByTimeAsync(0); });
    expect(screen.queryByText(/Session : Coach A/)).toBeNull();
    expect(screen.queryByTestId("nolio-v2-progress")).toBeNull();
    m.invoke.mockClear();
    expect(statusBtn().hasAttribute("disabled")).toBe(true);
    fireEvent.click(statusBtn()); await flush();
    expect(m.invoke).not.toHaveBeenCalled();
  });

  it("load_refs + relecture sous le même verrou/budget 45 s ; double clic = 1 action ; relecture KO ⇒ résultat conservé", async () => {
    m.invoke.mockImplementationOnce(() => Promise.resolve(statusResp()));
    await mount();
    fireEvent.click(statusBtn()); await flush();
    const loadResp = deferred<unknown>();
    m.invoke.mockImplementationOnce(() => loadResp.p);       // load_refs
    m.invoke.mockImplementationOnce(() => new Promise(() => {})); // relecture qui ne répond jamais
    const load = screen.getByRole("button", { name: "Charger les sports Nolio" });
    fireEvent.click(load); fireEvent.click(load);
    await flush(30_000);
    expect(screen.getByTestId("nolio-v2-busy").textContent).toContain("45 s");
    await act(async () => { loadResp.resolve({ data: { status: "REFS_LOADED", sports: 3, usableSports: 2, exercises: "timeout" }, error: null }); await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId("nolio-v2-msg").textContent).toContain("3 sports lus (2 associables)");
    expect(statusBtn().hasAttribute("disabled")).toBe(true); // verrou tenu pendant la relecture
    fireEvent.click(statusBtn());
    await flush(15_001); // 45 s au total depuis le clic
    const calls = m.invoke.mock.calls.map((c) => (c[1] as { body: { action: string } }).body.action);
    expect(calls).toEqual(["status", "load_refs", "status"]);
    expect(screen.getByTestId("nolio-v2-msg").textContent).toContain("3 sports lus");
    expect(screen.getByTestId("nolio-v2-readback").textContent).toContain("délai dépassé (45 s)");
    expect(statusBtn().hasAttribute("disabled")).toBe(false);
  });

  it("dry_run : rien au montage ; bloc visible si connexion active ; double clic = 1 appel ; reçu concordant ⇒ validé", async () => {
    const active = () => { const r = statusResp(); Object.assign(r.data as Record<string, unknown>, { activeConnections: 1, remaining: ["preuve dry_run/envoi réel : ABSENTE (aucun envoi automatique)"] }); return r; };
    m.invoke.mockImplementation((fn: unknown) => fn === "nolio-v2-dry-run"
      ? Promise.resolve({ data: { status: "DRY_RUN_VALID", code: "dry_run_valid", httpStatus: 200, receiptId: "rid", payloadSha256: "h", realSend: "ABSENT", network: "dry_run_post" }, error: null })
      : Promise.resolve(active()));
    m.receipt = { id: "rid", coach_id: A.uid, athlete_id: A.athleteId, fixture_code: "QA_TECH_RUN_10MIN_NO_TARGET", payload_sha256: "h", http_status: 200, outcome: "DRY_RUN_VALID", code: "dry_run_valid", real_send: "ABSENT" };
    await mount();
    expect(m.invoke).not.toHaveBeenCalled();
    expect(screen.queryByTestId("nolio-dry-run")).toBeNull();
    fireEvent.click(statusBtn()); await flush();
    const btn = screen.getByRole("button", { name: "Tester la séance sans l'envoyer" });
    expect(screen.getByTestId("stage-simulation").textContent).toContain("état inconnu");
    fireEvent.click(btn); fireEvent.click(btn); await flush();
    const dryCalls = m.invoke.mock.calls.filter((c) => c[0] === "nolio-v2-dry-run");
    expect(dryCalls).toHaveLength(1);
    expect((dryCalls[0][1] as { body: unknown }).body).toEqual({ athleteId: A.athleteId, fixtureCode: "QA_TECH_RUN_10MIN_NO_TARGET" });
    expect(screen.getByTestId("nolio-dry-run-result").textContent).toContain("Simulation validée");
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/dry_run[^.]{0,40}ABSENTE/i);
    expect(text).not.toMatch(/aucun dry_run/i);
    expect(screen.getByTestId("stage-calendar").textContent).toContain("Envoi calendrier Nolio : ABSENT");
    expect(screen.getByTestId("stage-simulation").textContent).toContain("confirmée par reçu relu");
  });

  it("dry_run : reçu relu divergent ⇒ non confirmé", async () => {
    const active = () => { const r = statusResp(); (r.data as Record<string, unknown>).activeConnections = 1; return r; };
    m.invoke.mockImplementation((fn: unknown) => fn === "nolio-v2-dry-run"
      ? Promise.resolve({ data: { status: "DRY_RUN_VALID", code: "dry_run_valid", httpStatus: 200, receiptId: "rid", payloadSha256: "h", realSend: "ABSENT" }, error: null })
      : Promise.resolve(active()));
    m.receipt = null;
    await mount();
    fireEvent.click(statusBtn()); await flush();
    fireEvent.click(screen.getByRole("button", { name: "Tester la séance sans l'envoyer" })); await flush();
    expect(screen.getByTestId("nolio-dry-run-result").textContent).toContain("non confirmé");
    expect(screen.getByTestId("stage-simulation").textContent).not.toContain("confirmée par reçu");
    expect(screen.getByTestId("stage-calendar").textContent).toContain("ABSENT");
  });
});
