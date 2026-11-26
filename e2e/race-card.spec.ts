import { expect, test } from '@playwright/test';

/** Carte de course (Simulation) : lisible sur téléphone et ordinateur, mêmes chiffres partout, prévu / réel. */
test('Ironman : cibles par segment, curseur et règles', async ({ page }, info) => {
  await page.goto('/__e2e/race-card?race=IM');
  await expect(page.getByTestId('race-total')).toBeVisible();
  await expect(page.getByText('130–135 W', { exact: true })).toBeVisible();
  await expect(page.getByText('Natation 3,8 km')).toBeVisible();
  await expect(page.getByText('Et si… ?')).toBeVisible();
  await expect(page.getByText('Les règles du jour')).toBeVisible();
  // Rien ne déborde horizontalement sur téléphone.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await info.attach('ironman', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('Marathon : chrono de la fiche prérempli puis comparaison prévu / réel', async ({ page }, info) => {
  await page.goto('/__e2e/race-card?race=Marathon');
  await expect(page.getByText('Course 42,2 km')).toBeVisible();
  await expect(page.getByPlaceholder('3:58:12')).toHaveValue('3:58:12');
  await page.getByRole('button', { name: 'Enregistrer le résultat' }).click();
  await expect(page.getByRole('cell', { name: 'Total' })).toBeVisible();
  await info.attach('marathon', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('Long Course Weekend : trois jours', async ({ page }) => {
  await page.goto('/__e2e/race-card?race=IM&lcw=1');
  await expect(page.getByText('Jour 1 · Natation 3,8 km')).toBeVisible();
  await expect(page.getByText('Jour 3 · Course 42,2 km')).toBeVisible();
});
