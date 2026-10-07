import { test, expect, type Page } from "@playwright/test";

/**
 * Régression — bug coach (iPhone/Safari) : taper "Exporter un rapport" dans
 * le menu "Plus" de la barre de navigation mobile ne déclenchait visiblement
 * aucune action. Cause réelle : le bouton "Plus" avait des handlers tactile
 * ET souris qui appelaient chacun `handleSettingsTap()` (un toggle) ;
 * `onTouchEnd` sans `preventDefault()` laissait Safari émettre sa séquence
 * de souris de compatibilité ~300ms après le tap, ré-appelant le toggle une
 * seconde fois — le menu "Plus" s'ouvrait puis se refermait aussitôt tout
 * seul (src/components/MobileBottomNav.tsx, corrigé par PR #296).
 *
 * Testé via src/pages/__e2e/MobileNavHarness.tsx (dev-only) plutôt que `/` —
 * voir le commentaire de ce fichier pour pourquoi (Index.tsx dépend d'une
 * vraie session Supabase, indisponible en CI sans compte de test).
 *
 * Tourne sur le project "Mobile Safari" (playwright.config.ts), qui utilise
 * réellement le moteur WebKit — le même que sur un vrai iPhone. Les
 * événements sont dispatchés directement (pas de dépendance à `hasTouch`
 * du contexte) pour tester indépendamment le chemin tactile (`onTouchEnd`)
 * et le chemin souris (`onMouseUp`) : si l'un des deux ré-appelle
 * `handleSettingsTap()` une seconde fois (le bug original), le menu se
 * referme dans la fenêtre de 600ms et le test échoue.
 */

const HARNESS_URL = "/__e2e/mobile-nav";

function plusButton(page: Page) {
  return page.getByRole("button", { name: "Plus" });
}

test.describe("MobileBottomNav — bouton Plus (menu more-menu)", () => {
  test("un seul touchend ouvre le menu et il reste ouvert (pas d'auto-fermeture)", async ({ page }) => {
    await page.goto(HARNESS_URL);
    const button = plusButton(page);
    await button.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 1, clientY: 1 }] });
    await button.dispatchEvent("touchend", { changedTouches: [{ identifier: 0, clientX: 1, clientY: 1 }] });

    await expect(page.getByText("Exporter un rapport")).toBeVisible();
    // Fenêtre plus large que le délai de séquence souris de compatibilité
    // Safari (~300ms) — si le bug réapparaît (double déclenchement), le menu
    // se referme dans cette fenêtre.
    await page.waitForTimeout(600);
    await expect(page.getByText("Exporter un rapport")).toBeVisible();
  });

  test("un seul clic souris ouvre le menu et il reste ouvert", async ({ page }) => {
    await page.goto(HARNESS_URL);
    await plusButton(page).click();

    await expect(page.getByText("Exporter un rapport")).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.getByText("Exporter un rapport")).toBeVisible();
  });

  test("taper Plus puis Exporter un rapport déclenche onExportClick exactement une fois", async ({ page }) => {
    await page.goto(HARNESS_URL);
    await expect(page.getByTestId("export-click-count")).toHaveText("0");

    const button = plusButton(page);
    await button.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 1, clientY: 1 }] });
    await button.dispatchEvent("touchend", { changedTouches: [{ identifier: 0, clientX: 1, clientY: 1 }] });

    await page.getByText("Exporter un rapport").click();
    await expect(page.getByTestId("export-click-count")).toHaveText("1");
  });

  /**
   * Régression — bug coach (iPhone/Safari), de retour : "le bouton Exporter
   * un rapport ne réagit pas quand je clique dessus". "Exporter un rapport"
   * (comme Configuration, Mini rapport, Mode Expert) ne reposait que sur
   * `onClick`, qui sur iOS n'arrive qu'après la séquence de souris de
   * compatibilité de Safari (~300ms après le touchend) — une fenêtre
   * pendant laquelle le bouton peut déjà avoir disparu (menu refermé/démonté
   * par le backdrop ou une autre interaction), empêchant le clic différé de
   * jamais atteindre le bouton. Ce test exerce le chemin TACTILE seul (pas
   * de `.click()` de secours) : avant le fix, "Exporter un rapport" n'avait
   * aucun handler tactile, donc un touchend seul ne déclenchait rien.
   */
  test("taper Plus (tactile) puis Exporter un rapport (tactile seul, sans clic de secours) déclenche onExportClick", async ({ page }) => {
    await page.goto(HARNESS_URL);
    await expect(page.getByTestId("export-click-count")).toHaveText("0");

    const plus = plusButton(page);
    await plus.dispatchEvent("touchstart", { touches: [{ identifier: 0, clientX: 1, clientY: 1 }] });
    await plus.dispatchEvent("touchend", { changedTouches: [{ identifier: 0, clientX: 1, clientY: 1 }] });

    const exportBtn = page.getByText("Exporter un rapport");
    await exportBtn.dispatchEvent("touchstart", { touches: [{ identifier: 1, clientX: 1, clientY: 1 }] });
    await exportBtn.dispatchEvent("touchend", { changedTouches: [{ identifier: 1, clientX: 1, clientY: 1 }] });

    await expect(page.getByTestId("export-click-count")).toHaveText("1");
  });
});
