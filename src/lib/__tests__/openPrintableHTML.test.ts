import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openPrintableHTML, printCurrentDocument, EMBEDDED_PRINT_ONCLICK } from "../openPrintableHTML";

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
 * Sur iOS, `openPrintableHTML` ouvre un vrai onglet via une URL blob: —
 * EXACTEMENT le même mécanisme que sur desktop — avant de retomber sur la
 * surcouche interne si le popup est bloqué.
 *
 * Historique (deux fausses pistes successives à ne pas reproduire) :
 * 1. Une génération par capture d'écran (html2canvas,
 *    src/lib/print/iosPdfExport.ts) a été essayée en priorité un temps —
 *    retour coach : "mise en page catastrophique, pas de marges, pas de
 *    saut de page". Une capture d'écran ne respecte jamais les règles CSS
 *    d'impression ; seule l'impression native les applique.
 * 2. En revenant à l'impression native, une branche iOS séparée utilisait
 *    `window.open("", "_blank")` + `document.write(...)` plutôt qu'une
 *    URL blob:, sur la foi d'un commentaire jamais revérifié ("iOS ne sait
 *    pas naviguer vers une URL blob:"). Retour coach : le bug ORIGINEL
 *    ("PDF de 400 pages avec juste une entête") est réapparu. Cause très
 *    probable : `document.write` dans une fenêtre déjà ouverte n'est pas
 *    une vraie navigation — le `<meta name="viewport">` injecté ne
 *    s'applique pas de la même façon qu'au chargement réel d'une page,
 *    d'où un reflow à la largeur étroite de l'écran plutôt qu'à la largeur
 *    du document. `iosPdfExport.ts` navigue déjà avec succès vers une URL
 *    blob: sur iOS pour son propre bouton "Ouvrir le PDF" : ce mécanisme
 *    EST fiable sur iOS, document.write ne l'est pas.
 */
describe("openPrintableHTML (iOS) — ouvre un vrai onglet (URL blob:, comme desktop) en priorité, surcouche seulement si bloqué", () => {
  const originalUserAgent = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalOpen = window.open;
  let createSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    Object.defineProperty(navigator, "platform", { value: "iPhone", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(navigator, "platform", { value: originalPlatform, configurable: true });
    Object.defineProperty(navigator, "userAgent", { value: originalUserAgent, configurable: true });
    window.open = originalOpen;
    document.getElementById("tfc-print-overlay")?.remove();
    vi.restoreAllMocks();
  });

  it("quand le popup s'ouvre, navigue vers une URL blob: (pas document.write) et n'affiche PAS la surcouche interne", async () => {
    const fakeWin = { focus: vi.fn(), print: vi.fn(), opener: {} } as unknown as Window;
    const openSpy = vi.fn().mockReturnValue(fakeWin);
    window.open = openSpy as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(openSpy).toHaveBeenCalledWith("blob:mock-url", "_blank");
    const blobArg = createSpy.mock.calls[0][0] as Blob;
    expect(await blobArg.text()).toContain("Rapport");
    expect(document.getElementById("tfc-print-overlay")).toBeNull();
  });

  /**
   * Bug réel (retour coach, toujours "des centaines de pages" même après
   * avoir retiré les marges @page non supportées par Safari) : aucun
   * document généré ne fixe de largeur de rendu. Mobile Safari n'imprime
   * pas en reflowant selon `@page` : il découpe une capture du rendu écran
   * en tranches de la hauteur d'une page. Le document naviguable doit fixer
   * sa propre largeur plutôt que d'hériter de la largeur étroite de
   * l'écran — le contenu (mis en page pour ~820px) reflow alors sur une
   * hauteur démesurée, tranchée en centaines de pages.
   */
  it("fixe une largeur de rendu (viewport) sur le document de l'onglet — indépendante de la largeur d'écran réelle", async () => {
    const fakeWin = { focus: vi.fn(), print: vi.fn(), opener: {} } as unknown as Window;
    window.open = vi.fn().mockReturnValue(fakeWin) as typeof window.open;

    openPrintableHTML("<html><head></head><body>Rapport</body></html>", { filenameHint: "Test" });

    const blobArg = createSpy.mock.calls[0][0] as Blob;
    const written = await blobArg.text();
    expect(written).toMatch(/<meta name="viewport" content="width=\d+">/);
    expect(written).not.toContain("device-width");
  });

  it("quand le popup est bloqué (retourne null), bascule sur la surcouche interne", () => {
    window.open = vi.fn().mockReturnValue(null) as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(document.getElementById("tfc-print-overlay")).not.toBeNull();
  });
});

/**
 * Bug réel (retour coach, capture d'écran) : dans la surcouche iOS (repli
 * quand le popup ci-dessus est bloqué), le bouton "Imprimer / PDF" ouvrait
 * bien le dialogue d'impression, mais avec une pagination délirante ("Pages
 * 1-457" pour un rapport d'une poignée de pages). Cause : il appelait
 * `frame.contentWindow.print()`, qui imprime le document DE L'IFRAME —
 * lequel porte un `transform: scale(...)` posé pour l'aperçu écran (mise à
 * l'échelle dans la largeur mobile). Safari iOS pagine sur cette boîte
 * transformée au lieu du rendu visuel réel. `doPrint` retire d'abord ce
 * scale avant d'imprimer l'iframe, et si ça échoue quand même, retombe sur
 * l'impression de la fenêtre top-level avec une feuille de style qui masque
 * tout sauf la surcouche et neutralise le scale/position/overflow d'aperçu.
 */
describe("openPrintableHTML (iOS, surcouche interne — popup bloqué) — le bouton Imprimer n'imprime plus l'iframe transformée telle quelle", () => {
  const originalUserAgent = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalPrint = window.print;
  const originalOpen = window.open;

  beforeEach(() => {
    Object.defineProperty(navigator, "platform", { value: "iPhone", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    window.print = vi.fn();
    // iOS essaie d'abord un vrai onglet (URL blob:, comme desktop) avant de
    // retomber sur la surcouche interne — on simule un popup bloqué pour
    // exercer ce repli, celui que ces tests couvrent.
    window.open = vi.fn().mockReturnValue(null) as typeof window.open;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "platform", { value: originalPlatform, configurable: true });
    Object.defineProperty(navigator, "userAgent", { value: originalUserAgent, configurable: true });
    window.print = originalPrint;
    window.open = originalOpen;
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

  it('clique sur "Imprimer / PDF" → imprime la fenêtre top-level (window.print), pas l\'iframe transformée', async () => {
    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });
    await vi.waitFor(() => expect(document.getElementById("tfc-print-overlay")).not.toBeNull());

    getOverlayButton("Imprimer / PDF").click();

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('injecte une feuille de style imprimée qui masque tout sauf la surcouche et neutralise le scale posé pour l\'aperçu écran', async () => {
    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });
    await vi.waitFor(() => expect(document.getElementById("tfc-print-overlay")).not.toBeNull());

    getOverlayButton("Imprimer / PDF").click();

    const style = document.getElementById("tfc-print-overlay-style");
    expect(style).not.toBeNull();
    expect(style?.textContent).toMatch(/body > \*:not\(#tfc-print-overlay\)/);
    expect(style?.textContent).toMatch(/transform:\s*none\s*!important/);
  });

  it('"Fermer" retire la feuille de style imprimée (pas de fuite sur le reste de la session)', async () => {
    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });
    await vi.waitFor(() => expect(document.getElementById("tfc-print-overlay")).not.toBeNull());

    getOverlayButton("Imprimer / PDF").click();
    expect(document.getElementById("tfc-print-overlay-style")).not.toBeNull();

    getOverlayButton("Fermer").click();
    expect(document.getElementById("tfc-print-overlay-style")).toBeNull();
    expect(document.getElementById("tfc-print-overlay")).toBeNull();
  });

  /**
   * Bug réel (retour coach, PERSISTANT après le fix ci-dessus et un
   * re-déploiement confirmé) : plusieurs rapports générés
   * (buildDiagnosticProtocolHTML.ts, buildTestingWeekProtocolHTML.ts,
   * ExportTools.tsx, ObjectiveStrategyCard.tsx) embarquent LEUR PROPRE
   * bouton "🖨️ Imprimer / PDF" dans le HTML généré — plus visible à
   * l'écran (badge flottant sur le document) que le bouton générique de la
   * barre d'outils, donc celui que le coach presse en pratique. Ce bouton
   * appelait encore `window.print()` en dur, qui dans l'iframe de la
   * surcouche désigne la fenêtre de l'iframe (transformée) — reproduisant
   * EXACTEMENT le bug des 457 pages, alors que seul le bouton de la barre
   * d'outils avait été corrigé. `window.__tfcPrint` est le point d'ancrage
   * que ces boutons embarqués utilisent (via `window.top.__tfcPrint`,
   * cf. EMBEDDED_PRINT_ONCLICK) pour déclencher le MÊME print top-level
   * correctement préparé.
   */
  it("expose window.__tfcPrint pendant que la surcouche est ouverte (point d'ancrage pour les boutons Imprimer embarqués dans le HTML généré)", async () => {
    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });
    await vi.waitFor(() => expect(document.getElementById("tfc-print-overlay")).not.toBeNull());

    expect(typeof (window as unknown as Record<string, unknown>).__tfcPrint).toBe("function");

    (window as unknown as { __tfcPrint: () => void }).__tfcPrint();
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.getElementById("tfc-print-overlay-style")).not.toBeNull();
  });

  it("retire window.__tfcPrint à la fermeture (pas de fuite globale une fois la surcouche fermée)", async () => {
    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });
    await vi.waitFor(() => expect(document.getElementById("tfc-print-overlay")).not.toBeNull());
    getOverlayButton("Fermer").click();

    expect((window as unknown as Record<string, unknown>).__tfcPrint).toBeUndefined();
  });

  it("EMBEDDED_PRINT_ONCLICK délègue à window.top.__tfcPrint quand il existe, sinon retombe sur window.print() normal", () => {
    expect(EMBEDDED_PRINT_ONCLICK).toContain("window.top.__tfcPrint");
    expect(EMBEDDED_PRINT_ONCLICK).toContain("window.print()");
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
