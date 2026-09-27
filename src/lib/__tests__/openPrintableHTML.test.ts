import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openPrintableHTML } from "../openPrintableHTML";

/**
 * Bug réel (retour coach : "dès que je veux imprimer un document en PDF j'ai
 * un fichier de seulement 0 octets") — `window.open(url, "_blank",
 * "noopener,noreferrer")` : la spec impose que le navigateur renvoie
 * TOUJOURS `null` quand `noopener` est passé, MÊME quand la popup s'ouvre
 * avec succès (c'est le but de `noopener` : ne pas donner de référence à
 * l'appelant). Le code croyait donc systématiquement la popup bloquée, et
 * appelait `URL.revokeObjectURL(url)` immédiatement — alors que l'onglet
 * réellement ouvert était encore en train de charger ce même blob: URL.
 * Course perdue → onglet vide → PDF de 0 octet à l'impression.
 *
 * Ces tests figent le contrat attendu : `window.open` est appelé SANS
 * `noopener`/`noreferrer` (pour recevoir une vraie référence), et le blob
 * n'est PAS révoqué tant qu'une fenêtre a réellement été ouverte.
 */
describe("openPrintableHTML — ouverture popup pour impression/PDF", () => {
  const originalOpen = window.open;
  const originalIsMac = navigator.platform;
  let revokeSpy: ReturnType<typeof vi.spyOn>;
  let createSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    Object.defineProperty(navigator, "platform", { value: "Win32", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });
  });

  afterEach(() => {
    window.open = originalOpen;
    Object.defineProperty(navigator, "platform", { value: originalIsMac, configurable: true });
    vi.restoreAllMocks();
    document.getElementById("tfc-print-overlay")?.remove();
  });

  it("ouvre la popup SANS 'noopener'/'noreferrer' (sinon window.open renvoie toujours null, même en cas de succès)", () => {
    const fakeWin = { focus: vi.fn(), print: vi.fn() } as unknown as Window;
    const openSpy = vi.fn().mockReturnValue(fakeWin);
    window.open = openSpy as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>");

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [, , features] = openSpy.mock.calls[0];
    expect(
      String(features ?? ""),
      "window.open ne doit plus être appelé avec noopener/noreferrer — cela force un retour null même quand la popup réussit",
    ).not.toMatch(/noopener/i);
  });

  it("quand window.open réussit (retourne une fenêtre), NE révoque PAS le blob immédiatement — sinon l'onglet ouvert se retrouve vide (bug du fichier 0 octet)", () => {
    const fakeWin = { focus: vi.fn(), print: vi.fn(), opener: {} } as unknown as Window;
    window.open = vi.fn().mockReturnValue(fakeWin) as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>");

    expect(
      revokeSpy,
      "le blob de l'onglet réellement ouvert ne doit pas être révoqué de façon synchrone",
    ).not.toHaveBeenCalled();
  });

  it("coupe bien `opener` sur la fenêtre ouverte une fois la référence obtenue (garde la protection anti reverse-tabnabbing sans perdre la détection de blocage)", () => {
    const fakeWin = { focus: vi.fn(), print: vi.fn(), opener: {} } as unknown as Window;
    window.open = vi.fn().mockReturnValue(fakeWin) as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>");

    expect(fakeWin.opener).toBeNull();
  });

  it("quand window.open est réellement bloqué (retourne null), révoque le blob et bascule sur la surcouche interne", () => {
    window.open = vi.fn().mockReturnValue(null) as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(revokeSpy).toHaveBeenCalledWith("blob:mock-url");
    expect(document.getElementById("tfc-print-overlay")).not.toBeNull();
  });
});
