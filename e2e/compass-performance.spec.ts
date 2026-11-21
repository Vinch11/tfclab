import { test, expect, type Page } from '@playwright/test';
async function openDetailedProfile(page: Page) {
  await expect(page.getByRole('tab', { name: 'Décision' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Profil' }).click();
  await page.getByText('Bilan détaillé et objectif personnel').click();
}

test('explicit goal, cohort, save and athlete isolation', async ({ page }) => {
  await page.goto('/__e2e/compass-performance');
  const detail = page.getByText('Comparer avec un objectif personnel (facultatif)', {exact:true});
  await openDetailedProfile(page);
  await detail.click();
  const total = page.getByLabel('Chrono total visé en minutes');
  await total.fill('187');
  await expect(page.getByText('Profil observé sur Marathon')).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer l’objectif' }).click();
  await expect(page.getByRole('status')).toContainText('Objectif enregistré');
  await page.getByRole('button', { name: 'Changer d’athlète fictif' }).click();
  await openDetailedProfile(page);
  await detail.click();
  await expect(total).toHaveValue('');
  await total.fill('600');
  await expect(page.getByText('Renseigner le split course')).toBeVisible();
  await page.getByLabel('Split course visé en minutes').fill('240');
  await expect(page.getByText('Allure demandée : 5:41/km')).toBeVisible();
  await expect(page.getByText('Aucune cohorte chiffrée applicable')).toBeVisible();
  await page.getByRole('button', { name: 'Changer d’athlète fictif' }).click();
  await openDetailedProfile(page);
  await detail.click();
  await expect(total).toHaveValue('187');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('the coach sees why estimates are provisional and which observation supports a priority', async ({ page }) => {
  await page.goto('/__e2e/compass-performance');
  await expect(page.getByRole('region', { name: 'Limiteur', exact: true })).toContainText('VLamax');
  await page.getByRole('tab', { name: 'Radar' }).click();
  await expect(page.getByRole('img', { name: /Compass/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Décision' }).click();
  await openDetailedProfile(page);
  const panel = page.getByLabel('Priorité du bilan');
  const visibleFactors = panel.getByRole('list', {name:'Facteurs pour l’objectif'});
  await expect(visibleFactors.getByRole('listitem').first()).toContainText('Profil glycolytique (VLamax)');
  await expect(visibleFactors.getByRole('listitem').first()).toContainText('Hypothèse à vérifier');
  await expect(page.getByLabel('Projection de course')).toBeHidden();
  await panel.getByText('Voir les écarts chiffrés').click();
  await expect(panel.locator('details[open]').getByRole('figure', { name: 'Production maximale de lactate' })).toContainText('Plage de coaching');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(panel.getByRole('list', { name: 'Mesures qui expliquent les écarts' })).toContainText('Hypothèse issue du modèle');
  await panel.getByText('Données à confirmer').click();
  for (const metric of ['VLamax', 'FatMax', 'TTE']) {
    await expect(panel.getByRole('listitem').filter({ hasText: metric }).first()).toBeVisible();
  }
  await page.getByRole('button', { name: 'Changer d’athlète fictif' }).click();
  await openDetailedProfile(page);
  await expect(visibleFactors).toContainText('TTE');
  await expect(visibleFactors).toContainText('Profil glycolytique (VLamax)');
});
