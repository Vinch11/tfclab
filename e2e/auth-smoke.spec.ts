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

test("les onglets conservent la saisie et remasquent le mot de passe", async ({ page }) => {
  await page.goto("/auth");
  const email = page.getByLabel("Adresse e-mail");
  const password = page.getByLabel("Mot de passe", { exact: true });
  await email.fill("coach@example.com");
  await password.fill("court");
  await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
  await expect(password).toHaveAttribute("type", "text");

  await page.getByRole("tab", { name: "Inscription" }).click();
  await expect(email).toHaveValue("coach@example.com");
  await expect(password).toHaveValue("court");
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveAttribute("autocomplete", "new-password");
  const submit = page.getByRole("button", { name: "Créer un compte" });
  await expect(submit).toBeDisabled();
  await password.fill("Exemple42!");
  await expect(submit).toBeEnabled();

  await page.getByRole("tab", { name: "Connexion" }).click();
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  await page.getByRole("link", { name: /Mini Rapport Physiologique/ }).click();
  await expect(page).toHaveURL(/\/mini-rapport$/);
});
