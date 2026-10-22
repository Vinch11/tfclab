import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrintPreviewPage from "../PrintPreviewPage";

/**
 * `PrintPreviewPage` est la page qui remplace, depuis le 2026-10-22, le
 * mécanisme `blob:` + `window.open()` responsable d'un retour coach de PDF
 * ENTIÈREMENT VIDE à l'impression sur PC (voir le commentaire de
 * `openPrintPreviewDocument` dans `src/lib/openPrintableHTML.ts`). Cette
 * page lit le document déjà généré depuis `sessionStorage` (relayé par
 * l'onglet d'origine) et remplace entièrement le document courant par
 * celui-ci — exactement comme une navigation normale vers une page qui
 * contiendrait ce HTML, ce qui élimine toute dépendance à une `blob:` URL.
 */
describe("PrintPreviewPage", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let openDocSpy: ReturnType<typeof vi.spyOn>;
  let closeDocSpy: ReturnType<typeof vi.spyOn>;
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    // `document.write` remplacerait le DOM du test runner lui-même —
    // espionné sans exécution réelle (comportement réel couvert par le
    // test Playwright e2e/print-plan-export.spec.ts).
    writeSpy = vi.spyOn(document, "write").mockImplementation(() => {});
    openDocSpy = vi.spyOn(document, "open").mockImplementation(() => document as unknown as Window);
    closeDocSpy = vi.spyOn(document, "close").mockImplementation(() => {});
    printSpy = vi.fn();
    window.print = printSpy as typeof window.print;
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <PrintPreviewPage />
      </MemoryRouter>,
    );
  }

  it("lit le document depuis sessionStorage (clé du paramètre ?d=) et remplace le document courant", async () => {
    sessionStorage.setItem("tfc:printPreview:abc", "<html><body>Rapport Semaine 34</body></html>");

    renderAt("/print-preview?d=tfc%3AprintPreview%3Aabc");

    await vi.waitFor(() => expect(openDocSpy).toHaveBeenCalledTimes(1));
    expect(writeSpy).toHaveBeenCalledWith("<html><body>Rapport Semaine 34</body></html>");
    expect(closeDocSpy).toHaveBeenCalledTimes(1);
  });

  it("n'imprime pas automatiquement sans ?autoPrint=1", async () => {
    sessionStorage.setItem("tfc:printPreview:abc", "<html><body>Rapport</body></html>");

    renderAt("/print-preview?d=tfc%3AprintPreview%3Aabc");

    await vi.waitFor(() => expect(writeSpy).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 350));
    expect(printSpy).not.toHaveBeenCalled();
  });

  it("déclenche window.print() après coup avec ?autoPrint=1", async () => {
    sessionStorage.setItem("tfc:printPreview:abc", "<html><body>Rapport</body></html>");

    renderAt("/print-preview?d=tfc%3AprintPreview%3Aabc&autoPrint=1");

    await vi.waitFor(() => expect(writeSpy).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
  });

  it("si la clé est absente de sessionStorage (onglet rechargé/expiré), affiche un message clair au lieu d'une page vide sans explication", async () => {
    const { findByText } = renderAt("/print-preview?d=tfc%3AprintPreview%3Ainconnu");

    await findByText(/document introuvable/i);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("sans paramètre ?d= du tout, affiche le même message clair", async () => {
    const { findByText } = renderAt("/print-preview");

    await findByText(/document introuvable/i);
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
