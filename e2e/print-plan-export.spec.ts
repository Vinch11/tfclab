import { test, expect, type Page } from "@playwright/test";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
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

async function waitForPlanDocument(page: Page) {
  // SPA load/text length can be satisfied by scripts or the loading screen.
  await expect(page.locator('body')).toContainText('TFC_SEANCE_S1J1', { timeout: 30_000 });
  await expect(page.locator('body')).toContainText('TFC_DERNIERE_SEANCE');
  await expect(page.locator('body')).not.toContainText('Document introuvable');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

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
  await waitForPlanDocument(popup);

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
  await waitForPlanDocument(popup);

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

/**
 * Correctif P0 (2026-11-01) : le document est écrit dans le sessionStorage
 * de la fenêtre ENFANT (about:blank même origine), puis lu et supprimé par
 * /print-preview. Repli même onglet si la pop-up est bloquée.
 */
test("relais enfant : le document est lisible dans l'onglet d'impression puis supprimé du sessionStorage", async ({ page, context }) => {
  await page.goto("/__e2e/print-export");
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    page.getByTestId("open-print-preview-short").click(),
  ]);
  await expect(popup).toHaveURL(/\/print-preview\?d=/);
  await waitForPlanDocument(popup);
  const left = await popup.evaluate(() =>
    Object.keys(sessionStorage).filter((k) => k.startsWith("tfc:printPreview:")).length,
  );
  expect(left, "aucun document de plan ne doit rester dans le sessionStorage").toBe(0);
  const parentLeft = await page.evaluate(() =>
    Object.keys(sessionStorage).filter((k) => k.startsWith("tfc:printPreview:")).length,
  );
  expect(parentLeft, "l'onglet parent ne conserve aucune copie").toBe(0);
});

test("depuis un cadre intégré sous une AUTRE origine (comme la preview de l'éditeur) : PDF non vide", async ({ page, context, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const appOrigin = new URL(baseURL ?? "http://localhost:8080").origin;
  // Vrai serveur local sur une AUTRE origine (port différent, 127.0.0.1),
  // qui intègre l'app dans un cadre — comme la preview de l'éditeur.
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<html><body><iframe id="f" src="${appOrigin}/__e2e/print-export" style="width:1200px;height:900px"></iframe></body></html>`);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const port = (server.address() as AddressInfo).port;
  try {
  await page.goto(`http://127.0.0.1:${port}/`);
  const frame = page.frameLocator("#f");
  await expect(frame.getByTestId("open-print-preview-short")).toBeVisible({ timeout: 30_000 });
  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    frame.getByTestId("open-print-preview-short").click(),
  ]);
  await expect(popup).toHaveURL(/\/print-preview\?d=/);
  await waitForPlanDocument(popup);
  const pdfPath = testInfo.outputPath("plan-iframe.pdf");
  await popup.pdf({ path: pdfPath, format: "A4", landscape: true, printBackground: true });
  const { numPages, text } = await extractPdfText(pdfPath);
  expect(numPages).toBeGreaterThan(0);
  expect(text).toContain("TFC_DERNIERE_SEANCE");
  } finally {
    server.close();
  }
});

test("pop-up bloquée : repli explicite dans le même onglet, document affiché, retour possible", async ({ page }) => {
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await page.goto("/__e2e/print-export");
  const dialogs: string[] = [];
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    void d.accept();
  });
  await page.getByTestId("open-print-preview-short").click();
  await expect(page).toHaveURL(/\/print-preview\?d=.*sameTab=1/);
  await waitForPlanDocument(page);
  expect(dialogs.some((m) => m.includes("cet onglet"))).toBe(true);
  await expect(page.getByRole("button", { name: /Retour au plan/ })).toBeVisible();
  const left = await page.evaluate(() =>
    Object.keys(sessionStorage).filter((k) => k.startsWith("tfc:printPreview:")).length,
  );
  expect(left).toBe(0);
  await page.getByRole("button", { name: /Retour au plan/ }).click();
  await expect(page).toHaveURL(/\/__e2e\/print-export/);
});
