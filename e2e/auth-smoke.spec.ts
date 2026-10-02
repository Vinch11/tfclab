import { test, expect } from "@playwright/test";

/**
 * Smoke test — seule page publique (pas de ProtectedRoute) qui ne dépend
 * d'aucune session Supabase. Garde-fou minimal : la page de login charge et
 * affiche son formulaire sans exception JS, sur desktop ET mobile.
 */
test("la page /auth charge et affiche le formulaire de connexion", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/auth");
  await expect(page.getByText("Bienvenue Coach")).toBeVisible();
  await expect(page.getByPlaceholder("coach@example.com").first()).toBeVisible();

  expect(errors).toEqual([]);
});
