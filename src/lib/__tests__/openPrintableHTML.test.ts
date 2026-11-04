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
/**
 * Correctif P0 (2026-11-01, "Document introuvable") : le document est écrit
 * dans le sessionStorage de la fenêtre ENFANT (`about:blank` même origine,
 * ouverte synchronement dans le geste utilisateur), puis l'enfant navigue
 * vers `/print-preview?d=<clé>`. Repli même onglet si la pop-up est
 * bloquée/inaccessible. Les mocks ci-dessous modélisent une fenêtre enfant
 * avec son PROPRE sessionStorage, isolé de celui de l'onglet parent.
 */
function makeStorage(opts: { quota?: boolean } = {}) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: vi.fn((k: string) => (data.has(k) ? data.get(k)! : null)),
    setItem: vi.fn((k: string, v: string) => {
      if (opts.quota) throw new DOMException("quota", "QuotaExceededError");
      data.set(k, v);
    }),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  };
}

function makeChild(opts: { quota?: boolean; inaccessible?: boolean } = {}) {
  const storage = makeStorage({ quota: opts.quota });
  const replace = vi.fn();
  const close = vi.fn();
  const child: Record<string, unknown> = { close, location: { replace } };
  Object.defineProperty(child, "sessionStorage", {
    get() {
      if (opts.inaccessible) throw new DOMException("Blocked a frame", "SecurityError");
      return storage;
    },
  });
  return { child: child as unknown as Window, storage, replace, close };
}

function keyFromUrl(url: string): string {
  const m = url.match(/[?&]d=([^&]+)/);
  expect(m, "l'URL doit contenir ?d=<clé>").not.toBeNull();
  return decodeURIComponent(m![1]);
}

describe("openPrintableHTML — relais vers /print-preview via le sessionStorage de la fenêtre ENFANT (plus aucune blob: URL)", () => {
  const originalOpen = window.open;
  const originalPlatform = navigator.platform;
  const originalAlert = window.alert;
  const originalLocation = window.location;
  let parentSetItemSpy: ReturnType<typeof vi.spyOn>;
  let assignSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    parentSetItemSpy = vi.spyOn(sessionStorage, "setItem");
    window.alert = vi.fn();
    assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, origin: originalLocation.origin, href: originalLocation.href, assign: assignSpy },
    });
    Object.defineProperty(navigator, "platform", { value: "Win32", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });
  });

  afterEach(() => {
    window.open = originalOpen;
    window.alert = originalAlert;
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    Object.defineProperty(navigator, "platform", { value: originalPlatform, configurable: true });
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("n'appelle plus jamais Blob/URL.createObjectURL — aucune blob: URL n'est créée pour l'impression", () => {
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");
    const { child } = makeChild();
    window.open = vi.fn().mockReturnValue(child) as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it("ouvre about:blank, écrit le document dans le sessionStorage de l'ENFANT, puis navigue l'enfant vers /print-preview — rien dans le parent", () => {
    const { child, storage, replace } = makeChild();
    const openSpy = vi.fn().mockReturnValue(child);
    window.open = openSpy as typeof window.open;

    openPrintableHTML("<html><body>Rapport Semaine 34</body></html>", { filenameHint: "Plan Test" });

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0]).toEqual(["about:blank", "_blank"]);
    expect(replace).toHaveBeenCalledTimes(1);
    const url = String(replace.mock.calls[0][0]);
    expect(url).toMatch(/\/print-preview\?d=/);
    expect(new URL(url, window.location.origin).origin).toBe(window.location.origin);
    const key = keyFromUrl(url);
    expect(key.startsWith("tfc:printPreview:")).toBe(true);
    expect(storage.data.get(key)).toContain("Rapport Semaine 34");
    // Aucune copie du plan dans l'onglet parent, ni navigation du parent.
    expect(parentSetItemSpy).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
    expect(assignSpy).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it("utilise une clé différente à chaque export (clé opaque aléatoire)", () => {
    const a = makeChild();
    const b = makeChild();
    window.open = vi.fn().mockReturnValueOnce(a.child).mockReturnValueOnce(b.child) as typeof window.open;
    openPrintableHTML("<html><body>1</body></html>", {});
    openPrintableHTML("<html><body>2</body></html>", {});
    expect(keyFromUrl(String(a.replace.mock.calls[0][0]))).not.toBe(keyFromUrl(String(b.replace.mock.calls[0][0])));
  });

  it("transmet filenameHint et autoPrint dans l'URL de /print-preview", () => {
    const { child, replace } = makeChild();
    window.open = vi.fn().mockReturnValue(child) as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Mon Plan", autoPrint: true });

    const url = String(replace.mock.calls[0][0]);
    expect(url).toContain("autoPrint=1");
    expect(url).toContain(`title=${encodeURIComponent("Mon Plan")}`);
  });

  it("pop-up bloquée (window.open → null) : avertit puis repli MÊME ONGLET (sessionStorage courant + location.assign), jamais d'échec silencieux", () => {
    window.open = vi.fn().mockReturnValue(null) as typeof window.open;

    openPrintableHTML("<html><body>Rapport Repli</body></html>", { filenameHint: "Mon Plan", autoPrint: true });

    expect(window.alert).toHaveBeenCalledTimes(1);
    expect(String((window.alert as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatch(/pop-up|bloqu/i);
    expect(assignSpy).toHaveBeenCalledTimes(1);
    const url = String(assignSpy.mock.calls[0][0]);
    expect(url).toMatch(/^\/print-preview\?d=/);
    expect(url).toContain("sameTab=1");
    expect(url).toContain("autoPrint=1");
    expect(url).toContain(`title=${encodeURIComponent("Mon Plan")}`);
    expect(sessionStorage.getItem(keyFromUrl(url))).toContain("Rapport Repli");
  });

  it("enfant inaccessible (stockage refusé hors quota) : ferme l'enfant puis repli même onglet", () => {
    const { child, close, replace } = makeChild({ inaccessible: true });
    window.open = vi.fn().mockReturnValue(child) as typeof window.open;

    openPrintableHTML("<html><body>Rapport Isolé</body></html>", { filenameHint: "Test" });

    expect(close).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(assignSpy).toHaveBeenCalledTimes(1);
    const url = String(assignSpy.mock.calls[0][0]);
    expect(url).toContain("sameTab=1");
    expect(sessionStorage.getItem(keyFromUrl(url))).toContain("Rapport Isolé");
  });

  it("quota dépassé dans l'enfant : alerte explicite, enfant fermé, aucune navigation (pas de perte silencieuse)", () => {
    const { child, close, replace } = makeChild({ quota: true });
    window.open = vi.fn().mockReturnValue(child) as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(window.alert).toHaveBeenCalledTimes(1);
    expect(String((window.alert as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatch(/volumineux/i);
    expect(close).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("quota dépassé en repli même onglet : alerte explicite, aucune navigation", () => {
    window.open = vi.fn().mockReturnValue(null) as typeof window.open;
    parentSetItemSpy.mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(window.alert).toHaveBeenCalledTimes(1);
    expect(String((window.alert as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatch(/volumineux/i);
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("sur iPhone, suit exactement le même chemin que sur desktop (plus de branchement par plateforme, plus de surcouche iframe)", () => {
    Object.defineProperty(navigator, "platform", { value: "iPhone", configurable: true });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      configurable: true,
    });
    const { child, replace } = makeChild();
    const openSpy = vi.fn().mockReturnValue(child);
    window.open = openSpy as typeof window.open;

    openPrintableHTML("<html><body>Rapport</body></html>", { filenameHint: "Test" });

    expect(openSpy.mock.calls[0]).toEqual(["about:blank", "_blank"]);
    expect(String(replace.mock.calls[0][0])).toMatch(/\/print-preview\?d=/);
    expect(document.getElementById("tfc-print-overlay")).toBeNull();
  });
});

/**
 * La bannière d'aide injectée dans le document (sauf `includeInstructions:
 * false`) porte un vrai bouton "Imprimer / PDF" qui appelle directement
 * `window.print()` : le document est TOUJOURS la fenêtre top-level.
 */
describe("openPrintableHTML — bannière d'aide avec bouton Imprimer fonctionnel", () => {
  const originalOpen = window.open;

  afterEach(() => {
    window.open = originalOpen;
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  function captureChildHtml(options: Parameters<typeof openPrintableHTML>[1]): string {
    const { child, storage, replace } = makeChild();
    window.open = vi.fn().mockReturnValue(child) as typeof window.open;
    openPrintableHTML("<html><head></head><body>Rapport</body></html>", options);
    return storage.data.get(keyFromUrl(String(replace.mock.calls[0][0])))!;
  }

  it('inclut un bouton "Imprimer / PDF" dont le onclick appelle window.print() directement (pas de détour iframe)', () => {
    const html = captureChildHtml({ filenameHint: "Test" });
    expect(html).toContain('onclick="window.print()"');
    expect(html).not.toContain("Préparation du PDF");
  });

  it("n'inclut PAS la bannière quand includeInstructions: false est passé", () => {
    const html = captureChildHtml({ filenameHint: "Test", includeInstructions: false });
    expect(html).toContain("Rapport");
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