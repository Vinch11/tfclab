import { test, expect } from "@playwright/test";

// Mount the real nested dialogs without loading any athlete or writing data.
for (const viewport of [{ width: 1118, height: 676 }, { width: 390, height: 844 }]) {
  test(`Nolio import remains interactive at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(async () => {
      const load = (path: string) => import(/* @vite-ignore */ path);
      const { default: React } = await load("/node_modules/.vite/deps/react.js");
      const { default: ReactDOM } = await load("/node_modules/.vite/deps/react-dom_client.js");
      const ui = await load("/src/components/ui/dialog.tsx");
      const { NolioImporter } = await load("/src/components/NolioImporter.tsx");
      document.documentElement.classList.add("bevel");
      const mount = document.createElement("div");
      document.body.append(mount);
      ReactDOM.createRoot(mount).render(
        React.createElement(ui.Dialog, { defaultOpen: true },
          React.createElement(ui.DialogContent, null,
            React.createElement(ui.DialogTitle, null, "Snapshot test"),
            React.createElement(NolioImporter, { onImport: () => {} }),
          ),
        ),
      );
    });
    await page.getByRole("button", { name: "Import Nolio", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Import Multi-Format Nolio" });
    await expect(dialog).toBeVisible();
    await dialog.hover();
    await page.waitForTimeout(300);
    const bounds = await dialog.boundingBox();
    if (!bounds) throw new Error("Missing import dialog");
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    const file = dialog.locator('input[type="file"]');
    await expect(file).toBeInViewport();
    await file.focus();
    await expect(file).toBeFocused();
    await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("dialog", { name: "Snapshot test" })).toBeVisible();
  });
}