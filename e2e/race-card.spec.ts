import { expect, test } from '@playwright/test';

/** Carte de course (Simulation) : lisible sur téléphone et ordinateur, mêmes chiffres partout, prévu / réel. */
test('Ironman : cibles par segment, curseur et règles', async ({ page }, info) => {
  await page.goto('/__e2e/race-card?race=IM');
  await expect(page.getByTestId('race-total')).toBeVisible();
  await expect(page.getByText('130–135 W', { exact: true })).toBeVisible();
  await expect(page.getByText('Natation 3,8 km')).toBeVisible();
  await expect(page.getByText('Et si… ?')).toBeVisible();
  await expect(page.getByText('Les règles du jour')).toBeVisible();
  // Glucides individualisés : apport conseillé et raison (dépense + marge) sur le vélo et la course.
  await expect(page.getByText('Glucides à prendre')).toHaveCount(2);
  await expect(page.getByText(/dépense ≈ \d+ g\/h/).first()).toBeVisible();
  // Détail vélo : terrain, NP, plan de ravitaillement ; liste à préparer.
  await page.getByRole('button', { name: /Détail vélo/ }).click();
  await expect(page.getByText('Puissance selon le terrain')).toBeVisible();
  await expect(page.getByText('Côte longue (plus de 5 min)')).toBeVisible();
  await expect(page.getByText(/barre \(20 g\)/).first()).toBeVisible();
  await page.getByRole('button', { name: /Détail course/ }).click();
  await expect(page.getByText('Allure par portion')).toBeVisible();
  await expect(page.getByText('Ravitaillement à préparer')).toBeVisible();
  // Rien ne déborde horizontalement sur téléphone.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  // Capture gardée dans l'artefact CI (playwright-report/) pour relecture visuelle.
  await page.screenshot({ path: `playwright-report/race-card-ironman-${info.project.name.replace(/\s+/g, '-')}.png`, fullPage: true });
});

test('Marathon : chrono de la fiche prérempli puis comparaison prévu / réel', async ({ page }, info) => {
  await page.goto('/__e2e/race-card?race=Marathon');
  await expect(page.getByText('Course 42,2 km')).toBeVisible();
  await expect(page.getByPlaceholder('3:58:12')).toHaveValue('3:58:12');
  await page.getByRole('button', { name: 'Enregistrer le résultat' }).click();
  await expect(page.getByRole('cell', { name: 'Total' })).toBeVisible();
  await page.screenshot({ path: `playwright-report/race-card-marathon-${info.project.name.replace(/\s+/g, '-')}.png`, fullPage: true });
});

test('Long Course Weekend : trois jours', async ({ page }) => {
  await page.goto('/__e2e/race-card?race=IM&lcw=1');
  await expect(page.getByText('Jour 1 · Natation 3,8 km')).toBeVisible();
  await expect(page.getByText('Jour 3 · Course 42,2 km')).toBeVisible();
});
