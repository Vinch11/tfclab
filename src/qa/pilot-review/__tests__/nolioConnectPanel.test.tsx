import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { NolioConnectPanel, CLIPBOARD_TIMEOUT_MS } from "../NolioConnectPanel";
import { usePreparedNolioLink, type AuthSubscribe } from "../usePreparedNolioLink";
import { NOLIO_AUTHORIZE_TTL_MS, isPreparedLinkUsable, shouldInvalidateOnAuthEvent, type PreparedNolioLink } from "../nolioAuthorizeUrl";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }));

// URL synthétique : jamais une vraie demande Nolio.
const URL_ = "https://www.nolio.io/api/authorize/?client_id=SYNTH&state=SYNTHSTATE&code_challenge=c&code_challenge_method=S256";
const T0 = 1_000_000;
const link = (at = T0): PreparedNolioLink => ({ url: URL_, coachId: "coach-A", athleteId: "ath-A", sourceKey: "none", at });

let logSpies: ReturnType<typeof vi.spyOn>[] = [];
const startHref = window.location.href;
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); logSpies = (["log", "info", "warn", "error", "debug"] as const).map((k) => vi.spyOn(console, k)); });
afterEach(() => {
  // Aucune fuite : ni storage, ni console, ni navigation de la frame.
  const dump = JSON.stringify({ ...sessionStorage }) + JSON.stringify({ ...localStorage });
  expect(dump).not.toContain("SYNTHSTATE");
  for (const s of logSpies) expect(JSON.stringify(s.mock.calls)).not.toContain("SYNTHSTATE");
  expect(window.location.href).toBe(startHref);
  vi.restoreAllMocks(); vi.useRealTimers();
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
});
const setClipboard = (writeText: unknown) => Object.defineProperty(navigator, "clipboard", { value: writeText ? { writeText } : undefined, configurable: true });

describe("NolioConnectPanel — copie", () => {
  it("succès : copie l'URL EXACTE au clic seulement, statut copié", async () => {
    const w = vi.fn().mockResolvedValue(undefined); setClipboard(w);
    render(<NolioConnectPanel link={link()} onExpired={() => {}} now={() => T0 + 1000} />);
    expect(w).not.toHaveBeenCalled(); // pas de copie automatique
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copier le lien de connexion" })); });
    expect(w).toHaveBeenCalledTimes(1);
    expect(w.mock.calls[0][0]).toBe(URL_);
    expect(screen.getByTestId("nolio-v2-copy-status").textContent).toContain("Lien copié");
  });
  it("refus : aucun faux « copié », champ manuel lecture seule avec l'URL exacte", async () => {
    setClipboard(vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")));
    render(<NolioConnectPanel link={link()} onExpired={() => {}} now={() => T0} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copier le lien de connexion" })); });
    const st = screen.getByTestId("nolio-v2-copy-status").textContent!;
    expect(st).not.toContain("Lien copié"); expect(st).toContain("refusée");
    const ta = screen.getByLabelText(/Lien de connexion Nolio/) as HTMLTextAreaElement;
    expect(ta.readOnly).toBe(true); expect(ta.value).toBe(URL_);
  });
  it("indisponible : repli manuel immédiat", async () => {
    setClipboard(undefined);
    render(<NolioConnectPanel link={link()} onExpired={() => {}} now={() => T0} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copier le lien de connexion" })); });
    expect(screen.getByTestId("nolio-v2-copy-status").textContent).toContain("indisponible");
    expect((screen.getByLabelText(/Lien de connexion Nolio/) as HTMLTextAreaElement).value).toBe(URL_);
  });
  it("promesse bloquée : délai puis échec, ne reste pas en « Copie… »", async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn(() => new Promise(() => {})));
    render(<NolioConnectPanel link={link()} onExpired={() => {}} now={() => T0} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copier le lien de connexion" })); });
    expect(screen.getByRole("button", { name: "Copie…" })).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(CLIPBOARD_TIMEOUT_MS + 1); });
    expect(screen.getByTestId("nolio-v2-copy-status").textContent).toContain("refusée");
    expect(screen.getByRole("button", { name: "Copier le lien de connexion" })).toBeTruthy();
  });
  it("lien expiré au clic : rien n'est copié, onExpired appelé", async () => {
    const w = vi.fn().mockResolvedValue(undefined); setClipboard(w);
    const onExpired = vi.fn();
    render(<NolioConnectPanel link={link()} onExpired={onExpired} now={() => T0 + NOLIO_AUTHORIZE_TTL_MS} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copier le lien de connexion" })); });
    expect(w).not.toHaveBeenCalled(); expect(onExpired).toHaveBeenCalledTimes(1);
  });
  it("lien target=_blank optionnel, href exact, noopener noreferrer", () => {
    render(<NolioConnectPanel link={link()} onExpired={() => {}} />);
    const a = screen.getByRole("link", { name: "Ouvrir Nolio dans un nouvel onglet" });
    expect(a.getAttribute("href")).toBe(URL_); expect(a.getAttribute("target")).toBe("_blank"); expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  });
  it("aucun lien : rien rendu", () => { const { container } = render(<NolioConnectPanel link={null} onExpired={() => {}} />); expect(container.innerHTML).toBe(""); });
});

describe("usePreparedNolioLink — invalidation", () => {
  const ctx = { coachId: "coach-A", athleteId: "ath-A", sourceKey: "none", ready: true };
  it("TTL appliqué : effacé à 10 min", () => {
    vi.useFakeTimers(); vi.setSystemTime(T0);
    const { result } = renderHook(() => usePreparedNolioLink({ ...ctx, subscribe: () => () => {} }));
    act(() => result.current.setLink(link(T0)));
    expect(result.current.link?.url).toBe(URL_);
    act(() => { vi.advanceTimersByTime(NOLIO_AUTHORIZE_TTL_MS - 1); }); expect(result.current.link).not.toBeNull();
    act(() => { vi.advanceTimersByTime(2); }); expect(result.current.link).toBeNull();
  });
  it("changement Auth réel : effacement immédiat ; refresh même compte : conservé", () => {
    let cb: Parameters<AuthSubscribe>[0] = () => {};
    const subscribe: AuthSubscribe = (c) => { cb = c; return () => {}; };
    const { result } = renderHook(() => usePreparedNolioLink({ ...ctx, subscribe, now: () => Date.now() }));
    act(() => result.current.setLink(link(Date.now())));
    act(() => cb("TOKEN_REFRESHED", "coach-A")); expect(result.current.link).not.toBeNull();
    act(() => cb("SIGNED_IN", "coach-B")); expect(result.current.link).toBeNull();
    act(() => result.current.setLink(link(Date.now())));
    act(() => cb("SIGNED_OUT", null)); expect(result.current.link).toBeNull();
  });
  it("changement coach / athlète / source / ready : effacé", () => {
    for (const patch of [{ coachId: "coach-B" }, { athleteId: "ath-B" }, { sourceKey: "scenario:x" }, { ready: false }]) {
      const { result, rerender } = renderHook((p: typeof ctx) => usePreparedNolioLink({ ...p, subscribe: () => () => {}, now: () => Date.now() }), { initialProps: ctx });
      act(() => result.current.setLink(link(Date.now())));
      expect(result.current.link).not.toBeNull();
      rerender({ ...ctx, ...patch });
      expect(result.current.link).toBeNull();
    }
  });
  it("règles pures", () => {
    expect(isPreparedLinkUsable(link(T0), T0 + NOLIO_AUTHORIZE_TTL_MS - 1)).toBe(true);
    expect(isPreparedLinkUsable(link(T0), T0 + NOLIO_AUTHORIZE_TTL_MS)).toBe(false);
    expect(isPreparedLinkUsable(null, T0)).toBe(false);
    expect(shouldInvalidateOnAuthEvent("INITIAL_SESSION", "coach-B", "coach-A")).toBe(true);
    expect(shouldInvalidateOnAuthEvent("USER_UPDATED", "coach-A", "coach-A")).toBe(true);
  });
});
