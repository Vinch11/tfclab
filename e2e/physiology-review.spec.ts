import { test, expect } from "@playwright/test";

test("synthetic import, edit, local save, reload and actual staff report codec", async ({ page }) => {
  test.setTimeout(60_000);
  // No athlete account, authentication, remote database, OCR or paid extraction.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) return route.abort();
    if (url.pathname === "/__physiology-review") return route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body><script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      </script></body></html>` });
    return route.continue();
  });
  await page.goto("/__physiology-review");
  await page.evaluate(async () => {
    const { createEmptyLabExtract } = await import("/src/lib/labImport/types.ts");
    const { mapExtractToSnapshot, applyFieldEdits } = await import("/src/lib/labImport/snapshotMapper.ts");
    const { preservePhysiologyNotes } = await import("/src/lib/physiologyEvidence.ts");
    const extract = createEmptyLabExtract();
    extract.performance.sport = "run"; extract.performance.vma_kmh = 18;
    extract.vlamax.value = 0.42; extract.meta.reportDate = "2026-10-20";
    const snapshot = mapExtractToSnapshot(applyFieldEdits(extract, { running_economy: 200 }), "Marathon");
    document.body.innerHTML = '<label>VMA<input id="vma" value="18"></label><button id="save">Save synthetic snapshot</button><p id="saved"></p>';
    document.querySelector("#save")!.addEventListener("click", () => {
      const vma = Number((document.querySelector("#vma") as HTMLInputElement).value);
      const notes = preservePhysiologyNotes(snapshot.coach_notes, "Synthetic edited notes", { vma });
      localStorage.setItem("tfcl-v21-synthetic", JSON.stringify({ ...snapshot, vma, coach_notes: notes }));
      document.querySelector("#saved")!.textContent = "Saved";
    });
  });
  await page.locator("#vma").fill("19");
  await page.getByRole("button", { name: "Save synthetic snapshot" }).click();
  await expect(page.locator("#saved")).toHaveText("Saved");
  await page.reload();
  const reopened = await page.evaluate(async () => {
    const { snapshotPhysiologyEvidence, runningEconomyCostFromSnapshot } = await import("/src/lib/physiologyEvidence.ts");
    const { computeRunMLSSFromInput } = await import("/src/engines/diagnostic/computeDiagnostic.ts");
    const { buildRunMLSSCoherenceHTML } = await import("/src/components/ExportTools.tsx");
    const snapshot = JSON.parse(localStorage.getItem("tfcl-v21-synthetic")!);
    const cost = runningEconomyCostFromSnapshot(snapshot);
    const evidence = snapshotPhysiologyEvidence(snapshot);
    const runMLSS = computeRunMLSSFromInput({ sportFocus: "run", vlamaxRun: snapshot.vlamax_run, vma: snapshot.vma, paceThresholdSecPerKm: 240, runningEconomyCostMlKgKm: cost });
    document.body.innerHTML = buildRunMLSSCoherenceHTML({ athlete: { goal: "Marathon" }, effectiveSnapshot: snapshot, runMLSS });
    localStorage.removeItem("tfcl-v21-synthetic");
    return { vma: snapshot.vma, date: evidence.vma.date, cost, costDate: evidence.runningEconomyCostMlKgKm.date, predicted: runMLSS?.prediction !== null };
  });
  expect(reopened).toEqual({ vma: 19, date: null, cost: 200, costDate: "2026-10-20", predicted: true });
  await expect(page.locator("body")).toContainText("Proxy vitesse seuil / VMA");
  await expect(page.locator("body")).not.toContainText("TFCL_PHYSIOLOGY_V1:");
});
