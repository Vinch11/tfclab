import { test, expect } from '@playwright/test';
test('explicit goal, cohort, save and athlete isolation', async ({ page }) => {
  await page.goto('/__e2e/compass-performance');
  const detail = page.getByText('Objectif chrono et comparaison détaillée', {exact:true});
  await detail.click();
  const total = page.getByLabel('Chrono total visé en minutes');
  await total.fill('187');
  await expect(page.getByText('Profil observé sur Marathon')).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer l’objectif' }).click();
  await expect(page.getByRole('status')).toContainText('Objectif enregistré');
  await page.getByRole('button', { name: 'Changer d’athlète fictif' }).click();
  await detail.click();
  await expect(total).toHaveValue('');
  await total.fill('600');
  await expect(page.getByText('Renseigner le split course')).toBeVisible();
  await page.getByLabel('Split course visé en minutes').fill('240');
  await expect(page.getByText('Allure demandée : 5:41/km')).toBeVisible();
  await expect(page.getByText('Aucune cohorte chiffrée applicable')).toBeVisible();
  await page.getByRole('button', { name: 'Changer d’athlète fictif' }).click();
  await detail.click();
  await expect(total).toHaveValue('187');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('the coach sees why estimates are provisional and which observation supports a priority', async ({ page }) => {
  await page.goto('/__e2e/compass-performance');
  const panel = page.getByLabel('Priorité du bilan');
  await expect(panel.getByRole('figure', { name: 'Production maximale de lactate' })).toContainText('Plage de coaching');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(panel).toContainText('hypothèse à vérifier');
  await expect(panel.getByRole('list', { name: 'Écarts classés pour le coach' })).toContainText('Hypothèse issue du modèle');
  await panel.getByText('Données à confirmer').click();
  for (const metric of ['VLamax', 'FatMax', 'TTE']) {
    await expect(panel.getByRole('listitem').filter({ hasText: metric }).first()).toBeVisible();
  }
  await page.getByRole('button', { name: 'Changer d’athlète fictif' }).click();
  await expect(panel).toContainText('Facteur à examiner en priorité');
  await expect(panel).toContainText('Écart aux repères de l’objectif sur TTE');
});
