import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Client simulé : sessions A/B factices pour tests de PRÉSENTATION uniquement (aucune preuve RLS).
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(), getUser: vi.fn() }, from: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import baselineFixture from "./fixtures/qaBaselineVersions.json";
import ReadOnlyRlsAuditPage, { QA_COACHES, runAudit, readSessionStatus, withTimeout } from "../__qa/ReadOnlyRlsAuditPage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocked = supabase as any;
const auth = mocked.auth as { getSession: ReturnType<typeof vi.fn>; getUser: ReturnType<typeof vi.fn> };
const from = mocked.from as ReturnType<typeof vi.fn>;

const QA_URL = "https://lkjesdacgpolrwfxulbo.supabase.co";
const sessionFor = (uid: string) => ({ data: { session: { user: { id: uid }, token_type: "bearer" } }, error: null });
const userFor = (uid: string) => ({ data: { user: { id: uid, role: "authenticated" } }, error: null });

function mockSelects(rowsByCall: unknown[][]) {
  let i = 0;
  const builder = () => {
    const rows = rowsByCall[i++] ?? [];
    const res = Promise.resolve({ data: rows, error: null, status: 200 });
    return { select: () => ({ in: () => res, eq: () => res }) };
  };
  from.mockImplementation(builder);
}

const renderPage = () => render(<MemoryRouter><ReadOnlyRlsAuditPage /></MemoryRouter>);

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", QA_URL);
  auth.getSession.mockReset(); auth.getUser.mockReset(); from.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("ReadOnlyRlsAuditPage — accès et présentation", () => {
  it("déconnecté : rendu immédiat, message clair, bouton Se connecter, NON ATTESTÉ, zéro requête de données", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    renderPage();
    expect(screen.getByText(/Recette RLS/)).toBeTruthy(); // pas de spinner plein écran avant la page
    expect(await screen.findByText(/Non connecté/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Se connecter" }).getAttribute("href")).toBe("/auth");
    expect(screen.getByText(/NON ATTESTÉ/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Vérifier mes accès/ }));
    expect(await screen.findByText("Verdict : BLOCKED")).toBeTruthy();
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("origine non QA : BLOCKED sans même lire la session", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://otherref.supabase.co");
    renderPage();
    expect(await screen.findByText(/origine backend non QA/)).toBeTruthy();
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it("Coach A simulé : PASS affiché avec 4 versions et 1 plan", async () => {
    const A = QA_COACHES.A, B = QA_COACHES.B;
    auth.getSession.mockResolvedValue(sessionFor(A.uid));
    auth.getUser.mockResolvedValue(userFor(A.uid));
    const base = baselineFixture.rows;
    const v = [...base.map((r) => ({ id: r.id, athlete_id: r.athlete_id, coach_id: r.coach_id })), { id: "added-1", athlete_id: A.athleteId, coach_id: A.uid }];
    mockSelects([[{ id: A.athleteId, coach_id: A.uid }], [], v, [], [{ athlete_id: A.athleteId, coach_id: A.uid }], [], base]);
    renderPage();
    expect(await screen.findByText(/Session détectée : Coach A/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Vérifier mes accès/ }));
    expect(await screen.findByText("Verdict : PASS")).toBeTruthy();
    expect(screen.getByText(/Versions propres 5 \(dont ajoutées pendant la recette : 1\)/)).toBeTruthy();
    expect(screen.getByText(/Versions initiales intactes 4\/4, modifiées 0/)).toBeTruthy();
    expect(B.uid).not.toBe(A.uid);
  });

  it("Coach A simulé : version initiale modifiée → FAIL (jamais une nouvelle version)", async () => {
    const A = QA_COACHES.A;
    auth.getSession.mockResolvedValue(sessionFor(A.uid));
    auth.getUser.mockResolvedValue(userFor(A.uid));
    const base = baselineFixture.rows.map((r, i) => (i === 0 ? { ...r, plan_json: { ...r.plan_json, title: "modifié" } } : r));
    const v = base.map((r) => ({ id: r.id, athlete_id: r.athlete_id, coach_id: r.coach_id }));
    mockSelects([[{ id: A.athleteId, coach_id: A.uid }], [], v, [], [], [], base]);
    const r = await runAudit();
    expect(r.verdict).toBe("FAIL");
    expect(r.messages.join(" ")).toMatch(/Versions initiales intactes 3\/4/);
  });

  it("Coach B simulé : versions initiales de A visibles → FAIL", async () => {
    const B = QA_COACHES.B;
    auth.getSession.mockResolvedValue(sessionFor(B.uid));
    auth.getUser.mockResolvedValue(userFor(B.uid));
    mockSelects([[{ id: B.athleteId, coach_id: B.uid }], [], [], [], [], [], baselineFixture.rows.slice(0, 1)]);
    const r = await runAudit();
    expect(r.verdict).toBe("FAIL");
  });

  it("Coach B simulé : PASS avec 0 version et 0 plan", async () => {
    const B = QA_COACHES.B;
    auth.getSession.mockResolvedValue(sessionFor(B.uid));
    auth.getUser.mockResolvedValue(userFor(B.uid));
    mockSelects([[{ id: B.athleteId, coach_id: B.uid }], [], [], [], [], [], []]);
    const r = await runAudit();
    expect(r.verdict).toBe("PASS");
    expect(r.coach).toBe("B");
  });

  it("compte hors A/B : BLOCKED, aucune requête de données", async () => {
    const other = "00000000-0000-4000-8000-000000000000";
    auth.getSession.mockResolvedValue(sessionFor(other));
    auth.getUser.mockResolvedValue(userFor(other));
    const r = await runAudit();
    expect(r.verdict).toBe("BLOCKED");
    expect(from).not.toHaveBeenCalled();
  });
});

describe("ReadOnlyRlsAuditPage — délais (jamais de spinner éternel)", () => {
  const never = () => new Promise(() => {});

  it("getSession qui ne répond pas → BLOCKED explicite au chargement", async () => {
    auth.getSession.mockImplementation(never);
    const s = await readSessionStatus(20);
    expect(s).toEqual({ kind: "blocked", message: expect.stringContaining("getSession") });
  });

  it("getUser qui ne répond pas → BLOCKED, aucun SELECT", async () => {
    auth.getSession.mockResolvedValue(sessionFor(QA_COACHES.A.uid));
    auth.getUser.mockImplementation(never);
    const r = await runAudit(20);
    expect(r.verdict).toBe("BLOCKED");
    expect(r.messages[0]).toContain("getUser");
    expect(from).not.toHaveBeenCalled();
  });

  it("SELECT qui ne répond pas → BLOCKED avec l'étape nommée", async () => {
    auth.getSession.mockResolvedValue(sessionFor(QA_COACHES.A.uid));
    auth.getUser.mockResolvedValue(userFor(QA_COACHES.A.uid));
    from.mockImplementation(() => ({ select: () => ({ in: never, eq: never }) }));
    const r = await runAudit(20);
    expect(r.verdict).toBe("BLOCKED");
    expect(r.messages[0]).toContain("SELECT");
  });

  it("erreur getSession non masquée", async () => {
    auth.getSession.mockRejectedValue(new Error("network down"));
    const r = await runAudit(50);
    expect(r.verdict).toBe("BLOCKED");
    expect(r.messages[0]).toContain("network down");
  });

  it("withTimeout laisse passer une réponse à temps", async () => {
    await expect(withTimeout(Promise.resolve(7), "x", 50)).resolves.toBe(7);
  });

  it("affichage BLOCKED dans la page quand getSession pend", async () => {
    auth.getSession.mockImplementation(never);
    renderPage();
    await waitFor(() => expect(screen.getByText(/BLOCKED — Délai dépassé/)).toBeTruthy(), { timeout: 10000 });
  }, 12000);
});
