import { describe, expect, it, vi } from "vitest";
import { bootApp, bootErrorMessage, safeSession } from "../boot";

const mkHost = () => { let failed = false; return { done: vi.fn(), fail: vi.fn((_m: string) => { failed = true; }), isFailed: () => failed }; };
const manualTimer = () => { let fn: (() => void) | null = null; return { setTimer: (f: () => void) => { fn = f; }, fire: () => fn?.() }; };

describe("bootApp", () => {
  it("import résolu ⇒ rendu + done, aucun échec", async () => {
    const host = mkHost(); const render = vi.fn(); const t = manualTimer();
    expect(await bootApp({ load: async () => 1, render, host, timeoutMs: 1000, setTimer: t.setTimer })).toBe("rendered");
    expect(render).toHaveBeenCalledWith(1); expect(host.done).toHaveBeenCalled(); expect(host.fail).not.toHaveBeenCalled();
  });
  it("import rejeté ⇒ erreur visible, pas de rendu", async () => {
    const host = mkHost(); const render = vi.fn(); const t = manualTimer();
    expect(await bootApp({ load: () => Promise.reject(new Error("Failed to fetch dynamically imported module /src/App.tsx?t=1&token=x")), render, host, timeoutMs: 1000, setTimer: t.setTimer })).toBe("failed");
    expect(render).not.toHaveBeenCalled();
    const msg = host.fail.mock.calls[0][0] as string;
    expect(msg).toContain("Échec du chargement"); expect(msg).not.toContain("token");
  });
  it("load qui jette synchronement ⇒ échec lisible", async () => {
    const host = mkHost(); const t = manualTimer();
    expect(await bootApp({ load: () => { throw new Error("boom"); }, render: vi.fn(), host, timeoutMs: 1000, setTimer: t.setTimer })).toBe("failed");
  });
  it("import jamais résolu ⇒ erreur bornée au délai", async () => {
    const host = mkHost(); const t = manualTimer();
    const p = bootApp({ load: () => new Promise(() => {}), render: vi.fn(), host, timeoutMs: 25000, setTimer: t.setTimer });
    t.fire();
    expect(await p).toBe("timeout"); expect(host.fail.mock.calls[0][0]).toContain("25 s");
  });
  it("import tardif après expiration ⇒ jamais rendu, état d'erreur conservé", async () => {
    const host = mkHost(); const render = vi.fn(); const t = manualTimer();
    let resolve!: (v: number) => void;
    const p = bootApp({ load: () => new Promise<number>((r) => { resolve = r; }), render, host, timeoutMs: 1000, setTimer: t.setTimer });
    t.fire(); resolve(1); await p; await Promise.resolve();
    expect(render).not.toHaveBeenCalled(); expect(host.done).not.toHaveBeenCalled(); expect(host.fail).toHaveBeenCalledTimes(1);
  });
  it("watchdog index.html déjà en échec ⇒ import tardif ignoré", async () => {
    const host = mkHost(); host.fail("watchdog"); const render = vi.fn(); const t = manualTimer();
    expect(await bootApp({ load: async () => 1, render, host, timeoutMs: 1000, setTimer: t.setTimer })).toBe("expired");
    expect(render).not.toHaveBeenCalled();
  });
  it("rendu qui jette ⇒ erreur lisible", async () => {
    const host = mkHost(); const t = manualTimer();
    expect(await bootApp({ load: async () => 1, render: () => { throw new Error("x"); }, host, timeoutMs: 1000, setTimer: t.setTimer })).toBe("failed");
  });
});

describe("safeSession", () => {
  it("stockage bloqué ⇒ ne jette pas (set=false, get=null)", () => {
    const spy = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    expect(safeSession.get("k")).toBeNull(); expect(safeSession.set("k", "v")).toBe(false); expect(() => safeSession.remove("k")).not.toThrow();
    spy.mockRestore();
  });
  it("bootErrorMessage expurge la query string", () => { expect(bootErrorMessage(new Error("a /x?token=abc b"))).toBe("a /x?… b"); });
});
