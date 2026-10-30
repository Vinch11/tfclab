import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** The coach workbench is a standalone local HTML file, not an authenticated
 * TFCLab route. It must never depend on a network, Supabase or Nolio.
 */
const URL = pathToFileURL(join(process.cwd(), "scripts/library-v3/coach-workbench.html")).href;

test.describe("V3 offline coach workbench — 400 usable manual drafts", () => {
  test("search, editing a bounded variant, and draft export work without a network", async ({ page }) => {
    await page.route("http://**/*", route => route.abort());
    await page.route("https://**/*", route => route.abort());
    await page.goto(URL);
    await expect(page.locator("#count")).toContainText("400 résultat(s)");
    await page.locator("#search").fill("V3P_BIKE_008");
    await expect(page.locator(".sessionBtn")).toHaveCount(1);
    await page.locator(".sessionBtn").click();
    await expect(page.locator("#detail")).toContainText("78,0 min");
    const count = page.getByRole("spinbutton", { name: /Seuil structuré : nombre de séries/i });
    await count.fill("4");
    await count.press("Tab");
    await expect(page.locator("#detail")).toContainText("96,0 min");
    const coachTarget = page.locator("#targetControls input[type=text]").last();
    await coachTarget.fill("210-230 W (vérifié par le coach)");
    await coachTarget.press("Tab");
    await expect(page.locator("#detail")).toContainText("210-230 W");
    await page.getByRole("button", { name: "Ajouter au brouillon coach" }).click();
    await expect(page.locator("#draftList")).toContainText("96,0 min");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exporter le brouillon JSON" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("TFCLab_V3_brouillon_coach.json");
  });

  test("refuses to fabricate swimming duration until personal pace values are entered", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#search").fill("V3P_SWIM_007");
    await page.locator(".sessionBtn").click();
    await expect(page.locator("#detail")).toContainText("durée non déterminée");
    await expect(page.locator("#detail")).toContainText("1700 m");
    const paces = page.locator("#swimControls input[type=number]");
    await expect(paces).toHaveCount(2);
    await paces.nth(0).fill("120");
    await paces.nth(0).press("Tab");
    await paces.nth(1).fill("100");
    await paces.nth(1).press("Tab");
    await expect(page.locator("#detail")).toContainText("33,7 min");
  });

  test("strength remains estimated and candidate, never auto-prescribable", async ({ page }) => {
    await page.goto(URL);
    await page.locator("#search").fill("V3P_STRENGTH_001");
    await page.locator(".sessionBtn").click();
    await expect(page.locator("#detail")).toContainText("Durée indicative");
    await expect(page.locator("#noticeText")).toContainText("non validée individuellement");
    await expect(page.locator("body")).toContainText("aucun export automatique Nolio");
  });
});
