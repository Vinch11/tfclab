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
  // La qualité dépend de la date du jour (efforts de plus de 42 jours) : on vérifie qu'elle est dite, pas laquelle.
  await expect(factors.getByText(/Mesure (fiable|à revoir)/).first()).toBeVisible();
  await expect(factors.getByRole('link', { name: 'Programmer un test avant/après' }).first()).toHaveAttribute('href', /module=durability-(run|bike)/);
  const limiters = page.getByRole('region', { name: 'Limiteurs hiérarchisés' });
  await expect(limiters).toBeVisible();
  await expect(limiters.getByRole('listitem').first()).toContainText('Limiteur 1');
  await expect(limiters).toContainText('Bloc d’entraînement ciblé par le moteur');
  await expect(limiters).toContainText('Mesurés, sans cible sourcée donc non classés');
  await expect(limiters.getByRole('heading', { name: 'Priorité du moteur de plans' })).toHaveCount(0);
  // Checklist des tests : repliée par défaut ; une valeur ancienne reste affichée avec l'avertissement « à retester ».
  const checklist = page.locator('details[aria-label="Tests à faire pour cet athlète"]');
  await expect(checklist).toBeVisible();
  await expect(checklist).not.toHaveAttribute('open', '');
  await expect(checklist.locator('summary').first()).toContainText('à retester');
  await checklist.locator('summary').first().click();
  await expect(checklist.getByText('Valeur conservée').first()).toBeVisible();
  await expect(checklist.getByText(/validité 90 jours dépassée/).first()).toBeVisible();
  await expect(checklist.getByRole('region', { name: 'Tout tester en quelques jours' })).toContainText('Plan complet');
  await checklist.getByRole('button', { name: 'Voir et envoyer le plan complet' }).click();
  await expect(page.getByTestId('exporter')).toHaveText('Exporteur Nolio : plan-all');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
