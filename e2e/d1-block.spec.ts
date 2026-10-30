import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
test('D1 real browser cohort, decisions, network trace and coach notes', async ({ page, context }) => {
  test.setTimeout(120000);
  const externalRequests: string[] = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    externalRequests.push(`${route.request().method()} ${url.origin}${url.pathname}`);
    return route.abort();
  });
  await page.goto('/__e2e/d1');
  await expect(page.getByRole('heading', { name: 'Recette D1 · profils synthétiques' })).toBeVisible();
  const rows = [];
  for (const profile of ['aerobic_dominant', 'glycolytic_dominant', 'balanced_typical']) {
    await page.getByLabel('Profil', { exact: true }).selectOption(profile);
    await page.getByRole('button', { name: 'Générer le bloc sans IA' }).click();
    await expect(page.getByRole('status')).toBeVisible();
    await page.getByLabel('Notes de revue coach').fill(`Revue navigateur ${profile}`);
    const days = await page.getByTestId('d1-day').count();
    rows.push({ profile, days, status: await page.getByRole('status').innerText(), text: await page.locator('main').innerText() });
    mkdirSync('docs/d1/evidence/browser', { recursive: true });
    await page.screenshot({ path: `docs/d1/evidence/browser/${profile}.png`, fullPage: true });
  }
  writeFileSync('docs/d1/evidence/browser/run.json', JSON.stringify({ rows, externalRequests }, null, 2));
  expect(externalRequests.filter(url => /gemini|generativelanguage|ai-training-plan|gateway|openai|anthropic/i.test(url))).toEqual([]);
  // Record actual refusals instead of representing component tests as successful calendar integration.
});
