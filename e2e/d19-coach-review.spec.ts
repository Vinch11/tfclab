import { test, expect } from "@playwright/test";

/**
 * D1.9 synthetic dev-only coach screen: real D1.8 engine path, real browser.
 * No auth bypass in production, no network test data, no Nolio/Supabase writes.
 */
test.describe("D1.9 offline reviewer", () => {
  test("shows 28-day plan and refuses unverified physiology; QA-only test does not approve", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/__e2e/d19-coach-review");
    await expect(page.getByTestId("d19-review")).toBeVisible({timeout:30_000});
    await expect(page.getByTestId("d19-no-go")).toContainText("NO-GO");
    await expect(page.getByTestId("d19-weeks")).toHaveText("4/4");
    await expect(page.getByTestId("d19-original-critical")).toHaveText("4");
    await expect(page.getByTestId("d110-time-feasibility")).toBeVisible();
    await expect(page.getByTestId("d110-bounds-swim")).toContainText("%");
    await expect(page.getByTestId("d110-bounds-bike")).toContainText("%");
    await expect(page.getByTestId("d110-bounds-run")).toContainText("%");
    await expect(page.getByTestId("d110-time-feasibility")).toContainText("NO-GO");
    await expect(page.getByTestId("d110-source-ratio")).toContainText("45 min vélo + 15 min course");
    await expect(page.getByTestId("d110-source-percentages")).toContainText("vélo");
    await expect(page.getByTestId("d110-source-percentages")).toContainText("course");

    await expect(page.getByText("2026-10-26")).toBeVisible();
    await page.getByTestId("d19-week-4").click();
    await expect(page.getByText("2026-11-22")).toBeVisible();

    await page.getByTestId("d19-unverified").click();
    await expect(page.getByTestId("d19-result")).toContainText("Refus conservé",{timeout:30_000});
    await expect(page.getByTestId("d19-result")).toContainText("anchor_provenance_unverified");

    await page.getByTestId("d19-synthetic").click();
    await expect(page.getByTestId("d19-result")).toContainText("Candidat V2 testé",{timeout:45_000});
    await expect(page.getByTestId("d19-before")).toBeVisible();
    await expect(page.getByTestId("d19-after")).toBeVisible();
    await expect(page.getByTestId("d19-result")).toContainText("Aucun GO");
    await expect(page.getByTestId("d19-result")).toContainText("Lecture seule");
    await expect(page.getByTestId("d19-no-go")).toContainText("NO-GO");
    await expect(page.getByTestId("d19-original-critical")).toHaveText("4");
  });
});
