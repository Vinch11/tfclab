import { test, expect } from "@playwright/test";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Bug réel (retour coach, 2026-10-22, APRÈS la PR #391) : "sur PC, lorsque
 * j'ouvre la vue d'impression puis utilise Ctrl+P pour enregistrer le
 * document en PDF, le fichier obtenu est entièrement vide." Diagnostic :
 * le chemin desktop ouvrait une URL `blob:` via `window.open()` — aucune
 * garantie de spécification ne couvre la fiabilité d'une telle URL face à
 * l'impression RÉELLE et interactive d'un navigateur (Ctrl+P → aperçu →
 * "Enregistrer en PDF"). Correctif : plus aucune `blob:` URL ; le document
 * est relayé via `sessionStorage` vers une vraie page du site
 * (`/print-preview`), chargée par une navigation NORMALE — voir
 * `src/lib/openPrintableHTML.ts` et `src/pages/PrintPreviewPage.tsx`.
 *
 * Ce test ouvre RÉELLEMENT la vue d'impression (clic → nouvel onglet →
 * `/print-preview`), génère un PDF avec le moteur d'impression du
 * navigateur (`page.pdf()`, CDP `Page.printToPDF` — le seul mécanisme
 * qu'un outil de test automatisé peut déclencher ; il n'existe aucun moyen
 * d'automatiser un clic humain dans la boîte de dialogue d'impression du
 * système d'exploitation), puis vérifie le contenu réellement extrait du
 * PDF produit : première semaine présente, dernière semaine présente,
 * dernière séance présente, PDF non vide. Couvre aussi un cas de
 * pagination longue (34 semaines × 7 séances, avec fiche complète par
 * séance).
 */

GlobalWorkerOptions.workerSrc = fileURLToPath(
  new URL("../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url),
);

async function extractPdfText(pdfPath: string): Promise<{ numPages: number; text: string }> {
  const data = new Uint8Array(readFileSync(pdfPath));
  const doc = await getDocument({ data, isEvalSupported: false }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  return { numPages: doc.numPages, text };
}

test("export PDF d'un plan de 34 semaines : la vue d'impression s'ouvre réellement et le PDF produit contient la première semaine, la dernière semaine et la dernière séance", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/__e2e/print-export");

  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    page.getByTestId("open-print-preview").click(),
  ]);

  // La nouvelle page d'impression dédiée (/print-preview) — navigation
  // RÉELLE, même origine, aucune blob: URL.
  await expect(popup).toHaveURL(/\/print-preview\?d=/);
  await popup.waitForLoadState("load");
  await popup.waitForFunction(() => document.body && document.body.textContent && document.body.textContent.length > 100);

  // Le document affiché est bien le plan transmis, pas une page vide ni
  // un message d'erreur "Document introuvable".
  await expect(popup.locator("body")).not.toContainText("Document introuvable");
  await expect(popup.locator("body")).toContainText("TFC_SEANCE_S1J1");

  const pdfPath = testInfo.outputPath("plan-34-semaines.pdf");
  await popup.pdf({ path: pdfPath, format: "A4", landscape: true, printBackground: true });

  const { numPages, text } = await extractPdfText(pdfPath);

  expect(numPages, "le PDF ne doit jamais être vide (0 page)").toBeGreaterThan(0);
  expect(text.length, "le PDF doit contenir du texte réel, pas seulement des pages blanches").toBeGreaterThan(500);
  expect(text, "la première semaine doit être présente").toContain("TFC_SEANCE_S1J1");
  expect(text, "la dernière semaine (34) doit être présente — pas de troncature de pagination longue").toContain("TFC_SEANCE_S34J1");
  expect(text, "la dernière séance de la dernière semaine doit apparaître").toContain("TFC_DERNIERE_SEANCE");
});

test("export PDF d'un plan court : même mécanisme, pour vérifier qu'il ne dépend pas de la taille du document", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/__e2e/print-export");

  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    page.getByTestId("open-print-preview-short").click(),
  ]);

  await expect(popup).toHaveURL(/\/print-preview\?d=/);
  await popup.waitForLoadState("load");
  await popup.waitForFunction(() => document.body && document.body.textContent && document.body.textContent.length > 50);

  const pdfPath = testInfo.outputPath("plan-court.pdf");
  await popup.pdf({ path: pdfPath, format: "A4", landscape: true, printBackground: true });

  const { numPages, text } = await extractPdfText(pdfPath);

  expect(numPages).toBeGreaterThan(0);
  expect(text).toContain("TFC_SEANCE_S1J1");
  expect(text).toContain("TFC_DERNIERE_SEANCE");
});

test("ouvrir /print-preview sans document valide affiche un message clair plutôt qu'une page vide sans explication", async ({ page }) => {
  await page.goto("/print-preview?d=inexistant");

  await expect(page.getByText(/document introuvable/i)).toBeVisible();
});
