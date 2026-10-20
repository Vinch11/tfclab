import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportTextFile } from "../exportFile";

/**
 * JSON export iOS Safari / PWA audit (coach, oct. 2026) : le pattern
 * Blob + `<a download>` seul échoue silencieusement sur iOS Safari et dans
 * certains contextes PWA (iframe sans allow-downloads, perte du geste
 * utilisateur). Ces tests figent les 3 paliers de secours attendus, chacun
 * isolément.
 */

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

function stubShare(opts: { canShare: boolean; share?: (data: ShareData) => Promise<void> }) {
  const nav = navigator as NavigatorWithShare;
  if (opts.canShare) {
    nav.canShare = vi.fn().mockReturnValue(true);
    nav.share = opts.share ?? vi.fn().mockResolvedValue(undefined);
  } else {
    delete nav.canShare;
    delete nav.share;
  }
}

function clearShare() {
  const nav = navigator as NavigatorWithShare;
  delete nav.canShare;
  delete nav.share;
}

describe("exportTextFile", () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    openSpy = vi.spyOn(window, "open");
  });

  afterEach(() => {
    clickSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    openSpy.mockRestore();
    clearShare();
    vi.useRealTimers();
  });

  it("palier 1 : utilise Web Share API quand disponible et canShare() accepte le fichier", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubShare({ canShare: true, share });

    const result = await exportTextFile('{"a":1}', "plan.json", "application/json");

    expect(result.method).toBe("share");
    expect(share).toHaveBeenCalledTimes(1);
    const callArg = share.mock.calls[0][0] as { files: File[]; title: string };
    expect(callArg.title).toBe("plan.json");
    expect(callArg.files[0].name).toBe("plan.json");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("l'annulation volontaire du partage (AbortError) n'enchaîne PAS sur le téléchargement", async () => {
    const abortError = Object.assign(new Error("cancelled"), { name: "AbortError" });
    stubShare({ canShare: true, share: vi.fn().mockRejectedValue(abortError) });

    const result = await exportTextFile('{"a":1}', "plan.json", "application/json");

    expect(result.method).toBe("cancelled");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("palier 2 : sans Web Share API, retombe sur le téléchargement blob classique", async () => {
    clearShare();
    vi.useFakeTimers();

    const result = await exportTextFile('{"a":1}', "plan.json", "application/json");

    expect(result.method).toBe("download");
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(4000);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });

  it("un échec de partage non-Abort (ex: canShare lève) retombe aussi sur le téléchargement blob", async () => {
    const nav = navigator as NavigatorWithShare;
    nav.canShare = vi.fn().mockImplementation(() => { throw new Error("canShare unsupported"); });
    nav.share = vi.fn();

    const result = await exportTextFile('{"a":1}', "plan.json", "application/json");

    expect(result.method).toBe("download");
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("palier 3 : si le téléchargement blob échoue (iOS Safari / iframe sans allow-downloads), ouvre un nouvel onglet avec le contenu", async () => {
    clearShare();
    clickSpy.mockImplementation(() => { throw new Error("download blocked"); });
    const fakeWin = { document: { write: vi.fn(), close: vi.fn() } } as unknown as Window;
    openSpy.mockReturnValue(fakeWin);

    const result = await exportTextFile('{"a":1}', "plan.json", "application/json");

    expect(result.method).toBe("window");
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect((fakeWin.document.write as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    const html = (fakeWin.document.write as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(html).toContain("plan.json");
    expect(html).toContain("&quot;a&quot;".replace(/&quot;/g, "")); // sanity: content text present
  });

  it("échappe le contenu HTML dans le fallback nouvel onglet (pas d'injection via le contenu exporté)", async () => {
    clearShare();
    clickSpy.mockImplementation(() => { throw new Error("download blocked"); });
    const fakeWin = { document: { write: vi.fn(), close: vi.fn() } } as unknown as Window;
    openSpy.mockReturnValue(fakeWin);

    await exportTextFile('<script>alert(1)</script>', "plan.json", "application/json");

    const html = (fakeWin.document.write as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("si tout échoue (partage absent, téléchargement bloqué, window.open bloqué), retourne 'none' sans lever", async () => {
    clearShare();
    clickSpy.mockImplementation(() => { throw new Error("download blocked"); });
    openSpy.mockReturnValue(null);

    const result = await exportTextFile('{"a":1}', "plan.json", "application/json");

    expect(result.method).toBe("none");
  });
});
