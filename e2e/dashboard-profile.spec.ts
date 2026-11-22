import { test, expect } from '@playwright/test';

test('the dashboard shows the profile, every factor against its ideal and the ranked limiters without a click', async ({ page }) => {
  await page.goto('/__e2e/dashboard-profile');
  const factors = page.getByRole('region', { name: 'État des facteurs face à l’idéal' });
  await expect(factors).toBeVisible();
  await expect(factors).toContainText('Objectif Ironman · ambition Compétiteur');
  await expect(factors.getByRole('heading', { name: 'Vélo' })).toBeVisible();
  await expect(factors.getByRole('heading', { name: 'Course à pied' })).toBeVisible();
  // Fiche fictive : femme de 51 ans, donc idéaux ajustés (Dérivé) ; VLamax et TTE restent des repères de coaching.
  await expect(factors.getByText('Repère de coaching', { exact: true }).first()).toBeVisible();
  await expect(factors.getByText('Dérivé', { exact: true }).first()).toBeVisible();
  await expect(factors.getByText('Puissance critique (CP)')).toBeVisible();
  await expect(factors.getByText('Vitesse critique (CS)')).toBeVisible();
  // Triathlon : mesurée en vélo, « À mesurer » en course, donc deux tuiles.
  await expect(factors.getByRole('heading', { name: 'Durabilité (sorties longues)' })).toHaveCount(2);
  await expect(factors.getByText('Observé', { exact: true }).first()).toBeVisible();
  const limiters = page.getByRole('region', { name: 'Limiteurs hiérarchisés' });
  await expect(limiters).toBeVisible();
  await expect(limiters.getByRole('listitem').first()).toContainText('Limiteur 1');
  await expect(limiters).toContainText('Bloc d’entraînement ciblé par le moteur');
  await expect(limiters).toContainText('Mesurés, sans cible sourcée donc non classés');
  await expect(limiters.getByRole('heading', { name: 'Priorité du moteur de plans' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
