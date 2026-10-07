import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openPrintableHTML, printCurrentDocument } from "../openPrintableHTML";

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

/**
 * Bug réel (retour coach, capture d'écran) : dans la surcouche iOS, le
 * bouton "Imprimer / PDF" ouvrait bien le dialogue d'impression, mais avec
 * une pagination délirante ("Pages 1-457" pour un rapport d'une poignée de
 * pages). Cause : il appelait `frame.contentWindow.print()`, qui imprime le
 * document DE L'IFRAME — lequel porte un `transform: scale(...)` posé pour
 * l'aperçu écran (mise à l'échelle dans la largeur mobile). Safari iOS
 * pagine sur cette boîte transformée au lieu du rendu visuel réel. Le fix
 * imprime la fenêtre top-level à la place, avec une feuille de style qui
 * masque tout sauf la surcouche et neutralise le scale/position/overflow
 * d'aperçu.
 */
describe("openPrintableHTML (iOS, surcouche interne) — le bouton Imprimer n'imprime plus l'iframe transformée", () => {
  const originalUserAgent = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalPrint = window.print;

  beforeEach(() => {
    Object.defineProperty(navigator, "platform", { value: "iPhone", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    window.print = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "platform", { value: originalPlatform, configurable: true });
    Object.defineProperty(navigator, "userAgent", { value: originalUserAgent, configurable: true });
    window.print = originalPrint;
    document.getElementById("tfc-print-overlay")?.remove();
    document.getElementById("tfc-print-overlay-style")?.remove();
    vi.restoreAllMocks();
  });

  function getOverlayButton(label: string): HTMLButtonElement {
    const overlay = document.getElementById("tfc-print-overlay");
    const btn = Array.from(overlay?.querySelectorAll("button") ?? []).find(
      (b) => b.textContent === label
    );
    if (!btn) throw new Error(`Bouton "${label}" introuvable dans la surcouche`);
    return btn as HTMLButtonElement;
  }

  it('clique sur "Imprimer / PDF" → imprime la fenêtre top-level (window.print), pas l\'iframe transformée', () => {
    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    getOverlayButton("Imprimer / PDF").click();

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('injecte une feuille de style imprimée qui masque tout sauf la surcouche et neutralise le scale posé pour l\'aperçu écran', () => {
    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    getOverlayButton("Imprimer / PDF").click();

    const style = document.getElementById("tfc-print-overlay-style");
    expect(style).not.toBeNull();
    expect(style?.textContent).toMatch(/body > \*:not\(#tfc-print-overlay\)/);
    expect(style?.textContent).toMatch(/transform:\s*none\s*!important/);
  });

  it('"Fermer" retire la feuille de style imprimée (pas de fuite sur le reste de la session)', () => {
    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    getOverlayButton("Imprimer / PDF").click();
    expect(document.getElementById("tfc-print-overlay-style")).not.toBeNull();

    getOverlayButton("Fermer").click();
    expect(document.getElementById("tfc-print-overlay-style")).toBeNull();
    expect(document.getElementById("tfc-print-overlay")).toBeNull();
  });
});

/**
 * Bug réel (retour coach, récurrent : "je ne sais de nouveau pas imprimer en
 * PDF via iPhone") — plusieurs boutons "Imprimer" (Briefing Jour J, Checklist
 * Coach) appellent `window.print()` directement sur la page affichée. Sur
 * iOS, quand l'app est installée sur l'écran d'accueil (mode standalone),
 * `window.print()` ne produit AUCUNE UI — ni dialogue, ni erreur — alors que
 * la même limitation avait déjà été identifiée et contournée pour les
 * rapports HTML générés (surcouche interne + repli Partager). `printCurrentDocument`
 * doit appliquer le même contournement à l'impression de la page en cours.
 */
describe("printCurrentDocument — impression de la page affichée (pas d'un rapport généré à part)", () => {
  const originalPlatform = navigator.platform;
  const originalUserAgent = navigator.userAgent;
  const originalPrint = window.print;

  beforeEach(() => {
    window.print = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "platform", { value: originalPlatform, configurable: true });
    Object.defineProperty(navigator, "userAgent", { value: originalUserAgent, configurable: true });
    window.print = originalPrint;
    document.getElementById("tfc-print-overlay")?.remove();
    vi.restoreAllMocks();
  });

  it("sur desktop, appelle window.print() directement (comportement natif inchangé)", () => {
    Object.defineProperty(navigator, "platform", { value: "Win32", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });

    printCurrentDocument("Test");

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.getElementById("tfc-print-overlay")).toBeNull();
  });

  it("sur iPhone en mode standalone (app installée), N'appelle PAS window.print() (no-op silencieux côté iOS) — bascule sur la surcouche interne à la place", () => {
    Object.defineProperty(navigator, "platform", { value: "iPhone", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    Object.defineProperty(navigator, "standalone", { value: true, configurable: true });

    printCurrentDocument("Test");

    expect(window.print).not.toHaveBeenCalled();
    expect(document.getElementById("tfc-print-overlay")).not.toBeNull();
  });

  it("sur iPhone en Safari normal (pas standalone), appelle window.print() directement (le dialogue natif fonctionne hors app installée)", () => {
    Object.defineProperty(navigator, "platform", { value: "iPhone", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    Object.defineProperty(navigator, "standalone", { value: false, configurable: true });

    printCurrentDocument("Test");

    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.getElementById("tfc-print-overlay")).toBeNull();
  });
});
