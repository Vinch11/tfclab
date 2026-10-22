import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openPrintableHTML, printCurrentDocument, EMBEDDED_PRINT_ONCLICK } from "../openPrintableHTML";

/**
 * Bug réel (retour coach, 2026-10-22, APRÈS la PR #391 qui avait supprimé la
 * génération de PDF par l'app sur iOS) : "sur PC, lorsque j'ouvre la vue
 * d'impression puis utilise Ctrl+P pour enregistrer le document en PDF, le
 * fichier obtenu est entièrement vide." Diagnostic : le chemin desktop
 * ouvrait toujours une URL `blob:` via `window.open()`. Une `blob:` URL n'est
 * valable que dans le contexte du document qui l'a créée ; sa fiabilité
 * face à l'impression RÉELLE et interactive d'un navigateur (Ctrl+P →
 * aperçu → "Enregistrer en PDF") n'est garantie par aucune spécification —
 * seule l'API CDP `Page.printToPDF` (utilisée par les tests automatisés)
 * est documentée comme fiable sur ce type d'URL. Un test Playwright
 * recourant à `page.pdf()` sur un tel onglet NE reproduit PAS le bug
 * (confirmé empiriquement pendant l'investigation : contenu identique,
 * avec ou sans blob) — ce qui exclut cette piste de test comme preuve de
 * fiabilité réelle. Correctif à la source : plus aucune `blob:` URL nulle
 * part dans ce fichier. Le document est relayé via `sessionStorage` vers
 * une VRAIE page du site (`/print-preview`, voir
 * `src/pages/PrintPreviewPage.tsx`), chargée par une navigation normale —
 * exactement comme n'importe quelle autre page de l'app. Voir aussi le
 * test Playwright `e2e/print-plan-export.spec.ts`, qui valide bout-en-bout
 * (vrai moteur d'impression du navigateur) que cette nouvelle page produit
 * un PDF complet pour un plan de 34 semaines.
 */
describe("openPrintableHTML — relais vers la page d'impression dédiée /print-preview (plus aucune blob: URL)", () => {
  const originalOpen = window.open;
  const originalPlatform = navigator.platform;
  const originalAlert = window.alert;
  let setItemSpy: ReturnType<typeof vi.spyOn>;
  let removeItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    setItemSpy = vi.spyOn(sessionStorage, "setItem");
    removeItemSpy = vi.spyOn(sessionStorage, "removeItem");
    window.alert = vi.fn();
    Object.defineProperty(navigator, "platform", { value: "Win32", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });
  });

  afterEach(() => {
    window.open = originalOpen;
    window.alert = originalAlert;
    Object.defineProperty(navigator, "platform", { value: originalPlatform, configurable: true });
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("n'appelle plus jamais Blob/URL.createObjectURL — aucune blob: URL n'est créée pour l'impression", () => {
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");
    window.open = vi.fn().mockReturnValue({ focus: vi.fn(), print: vi.fn() }) as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it("stocke le document final dans sessionStorage, puis ouvre /print-preview avec la clé correspondante", () => {
    const openSpy = vi.fn().mockReturnValue({ focus: vi.fn(), print: vi.fn() });
    window.open = openSpy as typeof window.open;

    openPrintableHTML("<html><body>Rapport Semaine 34</body></html>", { filenameHint: "Plan Test" });

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, target] = openSpy.mock.calls[0];
    expect(target).toBe("_blank");
    expect(String(url)).toMatch(/^\/print-preview\?d=/);

    const keyMatch = String(url).match(/[?&]d=([^&]+)/);
    expect(keyMatch).not.toBeNull();
    const key = decodeURIComponent(keyMatch![1]);
    const stored = sessionStorage.getItem(key);
    expect(stored).not.toBeNull();
    expect(stored).toContain("Rapport Semaine 34");
  });

  it("transmet filenameHint et autoPrint dans l'URL de /print-preview", () => {
    const openSpy = vi.fn().mockReturnValue({ focus: vi.fn(), print: vi.fn() });
    window.open = openSpy as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Mon Plan", autoPrint: true });

    const [url] = openSpy.mock.calls[0];
    expect(String(url)).toContain("autoPrint=1");
    expect(String(url)).toContain(`title=${encodeURIComponent("Mon Plan")}`);
  });

  it("si window.open est bloqué (retourne null), avertit l'utilisateur et nettoie la clé sessionStorage orpheline", () => {
    window.open = vi.fn().mockReturnValue(null) as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(window.alert).toHaveBeenCalledTimes(1);
    expect(String((window.alert as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatch(/pop-up|bloqué/i);
    // La clé qui venait d'être écrite est retirée : pas de fuite accumulée
    // dans sessionStorage si l'utilisateur relance l'export plusieurs fois.
    expect(removeItemSpy).toHaveBeenCalled();
  });

  it("si sessionStorage refuse l'écriture (quota dépassé), avertit l'utilisateur et n'ouvre aucun onglet", () => {
    setItemSpy.mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const openSpy = vi.fn();
    window.open = openSpy as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(window.alert).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("sur iPhone, suit exactement le même chemin que sur desktop (plus de branchement par plateforme, plus de surcouche iframe)", () => {
    Object.defineProperty(navigator, "platform", { value: "iPhone", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    const openSpy = vi.fn().mockReturnValue({ focus: vi.fn(), print: vi.fn() });
    window.open = openSpy as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(String(openSpy.mock.calls[0][0])).toMatch(/^\/print-preview\?d=/);
    expect(document.getElementById("tfc-print-overlay")).toBeNull();
  });
});

/**
 * La bannière d'aide injectée dans le document (sauf `includeInstructions:
 * false`) porte désormais un vrai bouton "Imprimer / PDF" cliquable — pas
 * seulement une instruction textuelle "Ctrl+P" (inutilisable au doigt sur
 * iPhone, qui n'a pas de clavier). Ce bouton appelle directement
 * `window.print()` : depuis la bascule vers `/print-preview`, le document
 * est TOUJOURS la fenêtre top-level, jamais une iframe — aucun détour
 * `window.top.__tfcPrint` n'est plus nécessaire.
 */
describe("openPrintableHTML — bannière d'aide avec bouton Imprimer fonctionnel", () => {
  const originalOpen = window.open;

  afterEach(() => {
    window.open = originalOpen;
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  function captureStoredHtml(): string {
    const openSpy = vi.fn().mockReturnValue({ focus: vi.fn(), print: vi.fn() });
    window.open = openSpy as typeof window.open;
    openPrintableHTML("<html><head></head><body>Rapport</body></html>", { filenameHint: "Test" });
    const [url] = openSpy.mock.calls[0];
    const key = decodeURIComponent(String(url).match(/[?&]d=([^&]+)/)![1]);
    return sessionStorage.getItem(key)!;
  }

  it('inclut un bouton "Imprimer / PDF" dont le onclick appelle window.print() directement (pas de détour iframe)', () => {
    const html = captureStoredHtml();
    expect(html).toContain('onclick="window.print()"');
    expect(html).not.toContain("Préparation du PDF");
  });

  it("n'inclut PAS la bannière quand includeInstructions: false est passé", () => {
    const openSpy = vi.fn().mockReturnValue({ focus: vi.fn(), print: vi.fn() });
    window.open = openSpy as typeof window.open;
    openPrintableHTML("<html><head></head><body>Rapport</body></html>", {
      filenameHint: "Test",
      includeInstructions: false,
    });
    const [url] = openSpy.mock.calls[0];
    const key = decodeURIComponent(String(url).match(/[?&]d=([^&]+)/)![1]);
    const html = sessionStorage.getItem(key)!;
    expect(html).not.toContain("tfc-print-helper");
  });
});

/**
 * `EMBEDDED_PRINT_ONCLICK` est utilisé par plusieurs builders de rapport
 * (buildDiagnosticProtocolHTML.ts, buildTestingWeekProtocolHTML.ts,
 * ExportTools.tsx, ObjectiveStrategyCard.tsx) pour leur propre bouton
 * "Imprimer / PDF" embarqué dans le HTML généré. Depuis la bascule vers
 * `/print-preview`, ce document est TOUJOURS la fenêtre top-level : plus
 * besoin du détour `window.top.__tfcPrint` (qui n'existe plus, l'iframe de
 * surcouche ayant été supprimée) — `window.print()` seul est désormais
 * toujours correct.
 */
describe("EMBEDDED_PRINT_ONCLICK", () => {
  it("vaut simplement window.print() — plus de détour __tfcPrint (l'iframe de surcouche a été supprimée)", () => {
    expect(EMBEDDED_PRINT_ONCLICK).toBe("window.print()");
  });
});

/**
 * Bug réel (retour coach, récurrent : "je ne sais de nouveau pas imprimer en
 * PDF via iPhone") — plusieurs boutons "Imprimer" (Briefing Jour J, Checklist
 * Coach) appellent `window.print()` directement sur la page affichée. Sur
 * iOS, quand l'app est installée sur l'écran d'accueil (mode standalone),
 * `window.print()` ne produit AUCUNE UI — ni dialogue, ni erreur.
 * `printCurrentDocument` doit appliquer un contournement à l'impression de
 * la page en cours : remplacer le document COURANT (pas de nouvel onglet —
 * le mode standalone ne garantit pas qu'une vraie fenêtre séparée s'ouvre)
 * par un instantané statique de la page affichée, avec le même bouton
 * Imprimer/Partager que les rapports générés.
 */
describe("printCurrentDocument — impression de la page affichée (pas d'un rapport généré à part)", () => {
  const originalPlatform = navigator.platform;
  const originalUserAgent = navigator.userAgent;
  const originalPrint = window.print;
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let openDocSpy: ReturnType<typeof vi.spyOn>;
  let closeDocSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.print = vi.fn();
    // `document.write` remplacerait réellement le DOM du test runner —
    // on l'espionne sans l'exécuter, exactement ce qui est vérifié ici :
    // QUE le code l'appelle, pas l'effet réel sur le document (couvert
    // en conditions réelles par le test Playwright).
    writeSpy = vi.spyOn(document, "write").mockImplementation(() => {});
    openDocSpy = vi.spyOn(document, "open").mockImplementation(() => document as unknown as Window);
    closeDocSpy = vi.spyOn(document, "close").mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(navigator, "platform", { value: originalPlatform, configurable: true });
    Object.defineProperty(navigator, "userAgent", { value: originalUserAgent, configurable: true });
    window.print = originalPrint;
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
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("sur iPhone en mode standalone (app installée), N'appelle PAS window.print() — remplace le document courant par un instantané imprimable", () => {
    Object.defineProperty(navigator, "platform", { value: "iPhone", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    Object.defineProperty(navigator, "standalone", { value: true, configurable: true });

    printCurrentDocument("Test");

    expect(window.print).not.toHaveBeenCalled();
    expect(openDocSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(closeDocSpy).toHaveBeenCalledTimes(1);
    expect(String(writeSpy.mock.calls[0][0])).toContain('onclick="window.print()"');
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
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
